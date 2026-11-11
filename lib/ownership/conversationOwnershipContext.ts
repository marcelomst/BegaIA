// Path: lib/ownership/conversationOwnershipContext.ts

import { AsyncLocalStorage } from "node:async_hooks";
import type { ConversationWriterGuard } from "@/lib/db/convState";

export type ConversationOwnershipContext = Readonly<{
  hotelId: string;
  conversationId: string;
  guard: Readonly<ConversationWriterGuard>;
}>;

const ownershipStorage = new AsyncLocalStorage<ConversationOwnershipContext>();

function sameOwnership(
  left: ConversationOwnershipContext,
  right: ConversationOwnershipContext,
): boolean {
  return left.hotelId === right.hotelId &&
    left.conversationId === right.conversationId &&
    left.guard.contractVersion === right.guard.contractVersion &&
    left.guard.token === right.guard.token &&
    left.guard.operationId === right.guard.operationId &&
    left.guard.writerKind === right.guard.writerKind &&
    left.guard.instanceId === right.guard.instanceId &&
    left.guard.buildId === right.guard.buildId &&
    left.guard.acquiredAt === right.guard.acquiredAt &&
    left.guard.messageId === right.guard.messageId;
}

function assertContextShape(context: ConversationOwnershipContext): void {
  const required = [
    context.hotelId,
    context.conversationId,
    context.guard?.contractVersion,
    context.guard?.token,
    context.guard?.operationId,
  ];
  if (required.some((value) => typeof value !== "string" || !value.trim())) {
    throw new Error("conversation ownership context requires canonical non-empty identity");
  }
}

export function getConversationOwnershipContext(): ConversationOwnershipContext | null {
  return ownershipStorage.getStore() ?? null;
}

export async function runWithConversationOwnership<T>(
  context: ConversationOwnershipContext,
  operation: () => Promise<T>,
): Promise<T> {
  assertContextShape(context);
  const current = ownershipStorage.getStore();
  if (current) {
    if (!sameOwnership(current, context)) {
      throw new Error("nested conversation ownership requires the same conversation and token");
    }
    return operation();
  }
  const isolated = Object.freeze({
    hotelId: context.hotelId,
    conversationId: context.conversationId,
    guard: Object.freeze({ ...context.guard }),
  });
  return ownershipStorage.run(isolated, operation);
}
