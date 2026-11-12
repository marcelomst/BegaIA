// Path: lib/auth/guestConversationCapability.ts

import crypto from "crypto";
import { errors as joseErrors, jwtVerify, SignJWT } from "jose";
import {
  getConversationById,
  revokeGuestWebGrantIfActive,
} from "@/lib/db/conversations";
import {
  acquireConversationOwnership,
  createConversationWriterGuard,
  releaseConversationOwnership,
} from "@/lib/db/convState";
import { runWithConversationOwnership } from "@/lib/ownership/conversationOwnershipContext";
import type {
  Conversation,
  GuestWebConversationGrant,
  GuestWebConversationScope,
} from "@/types/channel";

const GUEST_CAPABILITY_ALGORITHM = "HS256";
const GUEST_CAPABILITY_ISSUER = "begasist:guest-web-conversation:v1";
const GUEST_CAPABILITY_AUDIENCE = "guest-web-conversation";
const GUEST_CAPABILITY_VERSION = 1;
const GUEST_CAPABILITY_TTL_SECONDS = 7 * 24 * 60 * 60;
const MIN_SECRET_BYTES = 32;
const GUEST_AUTH_WRITER_INSTANCE_ID = `guest-auth-${process.pid}-${crypto.randomUUID()}`;
const GUEST_AUTH_WRITER_BUILD_ID = [
  process.env.BEGASIST_BUILD_ID,
  process.env.VERCEL_GIT_COMMIT_SHA,
  process.env.GIT_COMMIT_SHA,
  process.env.npm_package_version,
].find((value) => typeof value === "string" && value.length > 0 && value.trim() === value) || "unversioned-build";
const ALL_SCOPES = new Set<GuestWebConversationScope>([
  "conversation:read",
  "conversation:write",
]);

type GuestCapabilityClaims = {
  ver: 1;
  hotelId: string;
  conversationId: string;
  channel: "web";
  scopes: GuestWebConversationScope[];
  jti: string;
  iat: number;
  exp: number;
};

export class GuestCapabilityError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number, message: string) {
    super(message);
    this.name = "GuestCapabilityError";
    this.code = code;
    this.status = status;
  }
}

function capabilitySecret(): Uint8Array {
  const raw = String(process.env.GUEST_WEB_CONVERSATION_SECRET ?? "");
  const key = new TextEncoder().encode(raw);
  if (!raw.trim() || key.byteLength < MIN_SECRET_BYTES) {
    throw new GuestCapabilityError(
      "guest_capability_not_configured",
      503,
      "Guest conversation authorization is not configured",
    );
  }
  return key;
}

export function assertGuestCapabilityConfigured(): void {
  void capabilitySecret();
}

export function hashGuestCapabilityJti(jti: string): string {
  return crypto.createHash("sha256").update(jti, "utf8").digest("hex");
}

function validScopes(value: unknown): value is GuestWebConversationScope[] {
  return Array.isArray(value) && value.length > 0 && value.every(
    (scope) => typeof scope === "string" && ALL_SCOPES.has(scope as GuestWebConversationScope),
  );
}

function safeHashMatch(left: string, right: string): boolean {
  if (!/^[a-f0-9]{64}$/.test(left) || !/^[a-f0-9]{64}$/.test(right)) return false;
  return crypto.timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

export function createGuestWebGrant(input: {
  webSubject: string;
  jti: string;
  now?: Date;
}): GuestWebConversationGrant {
  const now = input.now ?? new Date();
  const issuedAt = new Date(Math.floor(now.getTime() / 1000) * 1000);
  const expiresAt = new Date(issuedAt.getTime() + GUEST_CAPABILITY_TTL_SECONDS * 1000);
  return {
    version: GUEST_CAPABILITY_VERSION,
    webSubject: input.webSubject,
    jtiHash: hashGuestCapabilityJti(input.jti),
    scopes: ["conversation:read", "conversation:write"],
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    revokedAt: null,
  };
}

export async function issueGuestConversationCapability(input: {
  hotelId: string;
  conversationId: string;
  jti: string;
  grant: GuestWebConversationGrant;
}): Promise<string> {
  const issuedAt = Math.floor(Date.parse(input.grant.issuedAt) / 1000);
  const expiresAt = Math.floor(Date.parse(input.grant.expiresAt) / 1000);
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt) || expiresAt <= issuedAt) {
    throw new GuestCapabilityError("invalid_guest_grant", 500, "Guest conversation grant is invalid");
  }

  return new SignJWT({
    ver: GUEST_CAPABILITY_VERSION,
    hotelId: input.hotelId,
    conversationId: input.conversationId,
    channel: "web",
    scopes: input.grant.scopes,
  })
    .setProtectedHeader({ alg: GUEST_CAPABILITY_ALGORITHM, typ: "JWT" })
    .setIssuer(GUEST_CAPABILITY_ISSUER)
    .setAudience(GUEST_CAPABILITY_AUDIENCE)
    .setJti(input.jti)
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiresAt)
    .sign(capabilitySecret());
}

function readBearerToken(req: Request): string {
  const authorization = req.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer ([^\s]+)$/);
  if (!match) {
    throw new GuestCapabilityError("guest_capability_required", 401, "Guest capability is required");
  }
  return match[1];
}

async function verifyCapabilityToken(req: Request): Promise<GuestCapabilityClaims> {
  try {
    const { payload, protectedHeader } = await jwtVerify(readBearerToken(req), capabilitySecret(), {
      algorithms: [GUEST_CAPABILITY_ALGORITHM],
      issuer: GUEST_CAPABILITY_ISSUER,
      audience: GUEST_CAPABILITY_AUDIENCE,
    });
    if (protectedHeader.alg !== GUEST_CAPABILITY_ALGORITHM) {
      throw new GuestCapabilityError("invalid_guest_capability", 401, "Guest capability is invalid");
    }
    if (
      payload.ver !== GUEST_CAPABILITY_VERSION ||
      typeof payload.hotelId !== "string" || !payload.hotelId ||
      typeof payload.conversationId !== "string" || !payload.conversationId ||
      payload.channel !== "web" ||
      !validScopes(payload.scopes) ||
      typeof payload.jti !== "string" || !payload.jti ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number"
    ) {
      throw new GuestCapabilityError("invalid_guest_capability", 401, "Guest capability is invalid");
    }
    return payload as unknown as GuestCapabilityClaims;
  } catch (error) {
    if (error instanceof GuestCapabilityError) throw error;
    if (error instanceof joseErrors.JWTExpired) {
      throw new GuestCapabilityError("guest_capability_expired", 401, "Guest capability has expired");
    }
    throw new GuestCapabilityError("invalid_guest_capability", 401, "Guest capability is invalid");
  }
}

function requirePersistedGrant(conversation: Conversation): GuestWebConversationGrant {
  const grant = conversation.metadata?.guestWebGrant;
  if (
    !grant || grant.version !== GUEST_CAPABILITY_VERSION ||
    typeof grant.webSubject !== "string" || !grant.webSubject ||
    typeof grant.jtiHash !== "string" ||
    !validScopes(grant.scopes) ||
    typeof grant.issuedAt !== "string" ||
    typeof grant.expiresAt !== "string" ||
    (grant.revokedAt !== null && typeof grant.revokedAt !== "string")
  ) {
    throw new GuestCapabilityError("guest_grant_not_found", 401, "Guest grant is unavailable");
  }
  return grant;
}

export type AuthorizedGuestConversation = {
  claims: GuestCapabilityClaims;
  conversation: Conversation;
  grant: GuestWebConversationGrant;
  hotelId: string;
  conversationId: string;
  guestId: string;
  webSubject: string;
};

export type GuestConversationOwnershipExecution<T> = Readonly<{
  result: T;
  operationId: string;
  ownershipRelease:
    | Readonly<{ status: "released" }>
    | Readonly<{ status: "not_owner" | "uncertain" | "error"; reason?: string }>;
  reconciliationRequired: boolean;
}>;

export async function authorizeGuestConversation(
  req: Request,
  requiredScope: GuestWebConversationScope,
): Promise<AuthorizedGuestConversation> {
  const claims = await verifyCapabilityToken(req);
  if (!claims.scopes.includes(requiredScope)) {
    throw new GuestCapabilityError("guest_scope_denied", 403, "Guest capability scope is insufficient");
  }

  const conversation = await getConversationById(claims.hotelId, claims.conversationId).catch(() => null);
  if (
    !conversation ||
    conversation.hotelId !== claims.hotelId ||
    conversation.conversationId !== claims.conversationId ||
    conversation.channel !== "web"
  ) {
    throw new GuestCapabilityError("guest_conversation_not_found", 401, "Guest conversation is unavailable");
  }
  const grant = requirePersistedGrant(conversation);
  if (grant.revokedAt) {
    throw new GuestCapabilityError("guest_grant_revoked", 401, "Guest grant has been revoked");
  }
  if (Date.parse(grant.expiresAt) <= Date.now()) {
    throw new GuestCapabilityError("guest_capability_expired", 401, "Guest capability has expired");
  }
  if (!grant.scopes.includes(requiredScope)) {
    throw new GuestCapabilityError("guest_scope_denied", 403, "Guest grant scope is insufficient");
  }
  if (!safeHashMatch(grant.jtiHash, hashGuestCapabilityJti(claims.jti))) {
    throw new GuestCapabilityError("guest_grant_mismatch", 401, "Guest grant does not match capability");
  }
  if (
    Math.floor(Date.parse(grant.issuedAt) / 1000) !== claims.iat ||
    Math.floor(Date.parse(grant.expiresAt) / 1000) !== claims.exp
  ) {
    throw new GuestCapabilityError("guest_grant_mismatch", 401, "Guest grant does not match capability");
  }
  const guestId = String(conversation.guestId ?? "").trim();
  if (!guestId) {
    throw new GuestCapabilityError("guest_binding_invalid", 401, "Guest conversation binding is invalid");
  }

  return {
    claims,
    conversation,
    grant,
    hotelId: claims.hotelId,
    conversationId: claims.conversationId,
    guestId,
    webSubject: grant.webSubject,
  };
}

async function runWithGuestConversationOwnership<T>(input: {
  hotelId: string;
  conversationId: string;
  writerKind: "guest_web_turn" | "guest_web_grant_revocation";
  operationId?: string;
  operation: () => Promise<T>;
}): Promise<GuestConversationOwnershipExecution<T>> {
  const operationId = input.operationId ?? `${input.writerKind}-${crypto.randomUUID()}`;
  const guard = createConversationWriterGuard({
    operationId,
    writerKind: input.writerKind,
    instanceId: GUEST_AUTH_WRITER_INSTANCE_ID,
    buildId: GUEST_AUTH_WRITER_BUILD_ID,
  });
  const acquisition = await acquireConversationOwnership(input.hotelId, input.conversationId, guard);
  if (acquisition.status !== "acquired") {
    if (acquisition.status === "occupied") {
      throw new GuestCapabilityError(
        "guest_conversation_busy",
        409,
        "Guest conversation is processing another operation",
      );
    }
    throw new GuestCapabilityError(
      "guest_conversation_coordination_unavailable",
      503,
      "Guest conversation coordination is unavailable",
    );
  }

  let result: T | undefined;
  let operationError: unknown;
  try {
    result = await runWithConversationOwnership(
      { hotelId: input.hotelId, conversationId: input.conversationId, guard: acquisition.guard },
      input.operation,
    );
  } catch (error) {
    operationError = error;
  }

  const release = await releaseConversationOwnership(input.hotelId, input.conversationId, acquisition.guard)
    .catch(() => ({ status: "uncertain" as const, reason: "release_exception" }));
  if (operationError) throw operationError;
  return {
    result: result as T,
    operationId,
    ownershipRelease: release,
    reconciliationRequired: release.status !== "released",
  };
}

export async function runAuthorizedGuestConversationTurn<T>(
  req: Request,
  operationId: string,
  operation: (authorization: AuthorizedGuestConversation) => Promise<T>,
): Promise<GuestConversationOwnershipExecution<T>> {
  const initial = await authorizeGuestConversation(req, "conversation:write");
  return runWithGuestConversationOwnership({
    hotelId: initial.hotelId,
    conversationId: initial.conversationId,
    writerKind: "guest_web_turn",
    operationId: `guest_web_turn-${operationId}`,
    operation: async () => {
      const current = await authorizeGuestConversation(req, "conversation:write");
      if (
        current.hotelId !== initial.hotelId ||
        current.conversationId !== initial.conversationId ||
        current.guestId !== initial.guestId ||
        current.grant.jtiHash !== initial.grant.jtiHash
      ) {
        throw new GuestCapabilityError("guest_grant_mismatch", 401, "Guest grant does not match capability");
      }
      return operation(current);
    },
  });
}

export type GuestGrantRevocationResult = Readonly<{
  status: "revoked";
  revokedAt: string;
  idempotent: boolean;
  reconciliationRequired?: boolean;
  ownershipRelease?: Readonly<{
    status: "not_owner" | "uncertain" | "error";
    reason?: string;
  }>;
}>;

export async function revokeGuestConversationGrant(input: {
  hotelId: string;
  conversationId: string;
  expectedJtiHash: string;
  now?: Date;
}): Promise<GuestGrantRevocationResult> {
  if (!/^[a-f0-9]{64}$/.test(input.expectedJtiHash)) {
    throw new GuestCapabilityError("guest_grant_mismatch", 409, "Guest grant does not match revocation target");
  }
  const execution = await runWithGuestConversationOwnership({
    hotelId: input.hotelId,
    conversationId: input.conversationId,
    writerKind: "guest_web_grant_revocation",
    operation: async () => {
      const before = await getConversationById(input.hotelId, input.conversationId);
      if (!before) {
        throw new GuestCapabilityError("guest_conversation_not_found", 404, "Guest conversation is unavailable");
      }
      const grant = requirePersistedGrant(before);
      if (!safeHashMatch(grant.jtiHash, input.expectedJtiHash)) {
        throw new GuestCapabilityError("guest_grant_mismatch", 409, "Guest grant does not match revocation target");
      }
      if (grant.revokedAt) {
        return { status: "revoked" as const, revokedAt: grant.revokedAt, idempotent: true };
      }

      const revokedAt = (input.now ?? new Date()).toISOString();
      const mutation = await revokeGuestWebGrantIfActive({
        hotelId: input.hotelId,
        conversationId: input.conversationId,
        expectedJtiHash: input.expectedJtiHash,
        revokedAt,
      });
      if (mutation.status === "unknown") {
        throw new GuestCapabilityError(
          "guest_grant_revocation_unknown",
          503,
          "Guest grant revocation durable state is unknown",
        );
      }
      if (mutation.status === "active_confirmed") {
        throw new GuestCapabilityError(
          "guest_grant_revocation_not_applied",
          409,
          "Guest grant remains active and revocation was not applied",
        );
      }
      return {
        status: "revoked" as const,
        revokedAt: mutation.revokedAt,
        idempotent: mutation.revokedAt !== revokedAt,
      };
    },
  });
  if (!execution.reconciliationRequired || execution.ownershipRelease.status === "released") {
    return execution.result;
  }
  return {
    ...execution.result,
    reconciliationRequired: true,
    ownershipRelease: execution.ownershipRelease,
  };
}

export function guestCapabilityErrorResponse(error: unknown): Response {
  const known = error instanceof GuestCapabilityError
    ? error
    : new GuestCapabilityError("guest_authorization_failed", 401, "Guest authorization failed");
  return Response.json(
    { ok: false, error: known.message, code: known.code },
    {
      status: known.status,
      headers: {
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    },
  );
}
