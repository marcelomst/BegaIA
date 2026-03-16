import * as dotenv from "dotenv";
dotenv.config();

import type { Client } from "cassandra-driver";
import { getAstraDB, getCassandraClient } from "../lib/astra/connection";

type Args = {
  hotelId: string;
  apply: boolean;
};

type ConversationDoc = {
  conversationId?: string;
  hotelId?: string;
  guestId?: string;
  channel?: string;
};

type MessageDoc = {
  messageId?: string;
  hotelId?: string;
  guestId?: string;
  channel?: string;
  conversationId?: string | null;
};

type GuestDoc = {
  guestId?: string;
  hotelId?: string;
  aliases?: string[];
};

function parseArgs(argv: string[]): Args {
  const out: Args = { hotelId: "", apply: false };
  for (const raw of argv.slice(2)) {
    if (raw === "--apply") {
      out.apply = true;
      continue;
    }
    if (raw.startsWith("--hotelId=") || raw.startsWith("--hotel=")) {
      out.hotelId = raw.split("=", 2)[1] ?? "";
    }
  }
  if (!out.hotelId.trim()) {
    console.error("Uso: pnpm exec tsx scripts/cleanup-email-runtime.ts --hotelId=hotel999 [--apply]");
    process.exit(2);
  }
  out.hotelId = out.hotelId.trim();
  return out;
}

function norm(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isEmailAlias(alias: string): boolean {
  return alias.toLowerCase().startsWith("email:");
}

async function getAliasesByGuest(client: Client, hotelId: string, guestId: string): Promise<string[]> {
  const query = "SELECT alias FROM guest_aliases_by_guest WHERE hotelid = ? AND guestid = ?";
  const res = await client.execute(query, [hotelId, guestId], { prepare: true });
  const rows = Array.isArray((res as any)?.rows) ? (res as any).rows : [];
  return rows
    .map((row: any) => norm(row?.get?.("alias")))
    .filter(Boolean);
}

async function deleteAlias(client: Client, hotelId: string, guestId: string, alias: string): Promise<void> {
  await client.execute(
    "DELETE FROM guest_aliases WHERE hotelid = ? AND alias = ?",
    [hotelId, alias],
    { prepare: true },
  );
  await client.execute(
    "DELETE FROM guest_aliases_by_guest WHERE hotelid = ? AND guestid = ? AND alias = ?",
    [hotelId, guestId, alias],
    { prepare: true },
  );
}

async function main() {
  const args = parseArgs(process.argv);
  const db = getAstraDB();
  const cqlClient = getCassandraClient();
  const conversationsCol = db.collection<ConversationDoc>("conversations");
  const messagesCol = db.collection<MessageDoc>("messages");
  const convStateCol = db.collection("conv_state");
  const guestsCol = db.collection<GuestDoc>("guests");

  try {
    const emailConversations = await conversationsCol.find({
      hotelId: args.hotelId,
      channel: "email",
    }).toArray();

    const emailMessages = await messagesCol.find({
      hotelId: args.hotelId,
      channel: "email",
    }).toArray();

    const conversationIds = Array.from(
      new Set(emailConversations.map((c) => norm(c.conversationId)).filter(Boolean)),
    );
    const convStateIds = conversationIds.map((conversationId) => `${args.hotelId}:${conversationId}`);

    const impactedGuestIds = Array.from(
      new Set(
        [
          ...emailConversations.map((c) => norm(c.guestId)),
          ...emailMessages.map((m) => norm(m.guestId)),
        ].filter(Boolean),
      ),
    );

    const guestPlan: Array<{
      guestId: string;
      deleteGuest: boolean;
      emailAliases: string[];
      keepReasons: string[];
      patchGuestAliases: string[];
    }> = [];

    for (const guestId of impactedGuestIds) {
      const aliases = await getAliasesByGuest(cqlClient, args.hotelId, guestId);
      const emailAliases = aliases.filter(isEmailAlias);
      const nonEmailAliases = aliases.filter((alias) => !isEmailAlias(alias));

      const guestConversations = await conversationsCol.find({
        hotelId: args.hotelId,
        guestId,
      }).toArray();
      const nonEmailConversations = guestConversations.filter((conv) => norm(conv.channel) !== "email");

      const guestMessages = await messagesCol.find({
        hotelId: args.hotelId,
        guestId,
      }).toArray();
      const nonEmailMessages = guestMessages.filter((msg) => norm(msg.channel) !== "email");

      const guestDoc = await guestsCol.findOne({ hotelId: args.hotelId, guestId });
      const guestDocAliases = Array.isArray(guestDoc?.aliases) ? guestDoc.aliases.map(norm).filter(Boolean) : [];
      const patchGuestAliases = guestDocAliases.filter(isEmailAlias);

      const keepReasons: string[] = [];
      if (nonEmailConversations.length > 0) keepReasons.push(`nonEmailConversations=${nonEmailConversations.length}`);
      if (nonEmailMessages.length > 0) keepReasons.push(`nonEmailMessages=${nonEmailMessages.length}`);
      if (nonEmailAliases.length > 0) keepReasons.push(`nonEmailAliases=${nonEmailAliases.length}`);

      guestPlan.push({
        guestId,
        deleteGuest: keepReasons.length === 0,
        emailAliases,
        keepReasons,
        patchGuestAliases,
      });
    }

    const summary = {
      hotelId: args.hotelId,
      mode: args.apply ? "APPLY" : "DRY_RUN",
      emailConversations: emailConversations.length,
      emailMessages: emailMessages.length,
      impactedGuestIds: impactedGuestIds.length,
      convStateIds: convStateIds.length,
      guestsToDelete: guestPlan.filter((g) => g.deleteGuest).length,
      aliasesToDelete: guestPlan.reduce((acc, g) => acc + g.emailAliases.length, 0),
      guestDocsToPatch: guestPlan.filter((g) => g.patchGuestAliases.length > 0 && !g.deleteGuest).length,
    };

    console.log("Email cleanup plan:", JSON.stringify(summary, null, 2));
    for (const item of guestPlan) {
      console.log(
        JSON.stringify(
          {
            guestId: item.guestId,
            deleteGuest: item.deleteGuest,
            emailAliases: item.emailAliases,
            patchGuestAliases: item.patchGuestAliases,
            keepReasons: item.keepReasons,
          },
          null,
          2,
        ),
      );
    }

    if (!args.apply) {
      console.log("Dry-run completado. Repetí con --apply para borrar de verdad.");
      return;
    }

    if (emailMessages.length > 0) {
      const res = await messagesCol.deleteMany({
        hotelId: args.hotelId,
        channel: "email",
      });
      console.log(`messages.deleteMany(channel=email) -> ${res?.deletedCount ?? 0}`);
    }

    if (conversationIds.length > 0) {
      const res = await conversationsCol.deleteMany({
        hotelId: args.hotelId,
        channel: "email",
      });
      console.log(`conversations.deleteMany(channel=email) -> ${res?.deletedCount ?? 0}`);
    }

    if (convStateIds.length > 0) {
      const res = await convStateCol.deleteMany({
        _id: { $in: convStateIds },
      });
      console.log(`conv_state.deleteMany(ids) -> ${res?.deletedCount ?? 0}`);
    }

    for (const item of guestPlan) {
      for (const alias of item.emailAliases) {
        await deleteAlias(cqlClient, args.hotelId, item.guestId, alias);
        console.log(`deleted alias ${alias} for guest ${item.guestId}`);
      }

      if (item.patchGuestAliases.length > 0 && !item.deleteGuest) {
        const guestDoc = await guestsCol.findOne({ hotelId: args.hotelId, guestId: item.guestId });
        const currentAliases = Array.isArray(guestDoc?.aliases) ? guestDoc.aliases.map(norm).filter(Boolean) : [];
        const nextAliases = currentAliases.filter((alias) => !isEmailAlias(alias));
        await guestsCol.updateOne(
          { hotelId: args.hotelId, guestId: item.guestId },
          { $set: { aliases: nextAliases, updatedAt: new Date().toISOString() } },
        );
        console.log(`patched guest aliases for ${item.guestId}`);
      }

      if (item.deleteGuest) {
        await guestsCol.deleteOne({ hotelId: args.hotelId, guestId: item.guestId });
        console.log(`deleted guest ${item.guestId}`);
      }
    }

    console.log("Cleanup email runtime completado.");
  } finally {
    await cqlClient.shutdown().catch(() => {});
  }
}

main().catch((err) => {
  console.error("cleanup-email-runtime error:", err);
  process.exit(1);
});
