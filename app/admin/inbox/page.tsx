// Path: /root/begasist/app/admin/inbox/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ChannelInbox from "@/components/admin/ChannelInbox";
import { useCurrentUser } from "@/lib/context/UserContext";
import { getDictionary } from "@/lib/i18n/getDictionary";

export default function AdminInboxPage() {
  const { user, loading } = useCurrentUser();
  const searchParams = useSearchParams();
  const [t, setT] = useState<any>(null);
  const initialGuestId = searchParams?.get("guestId") ?? "";
  const initialConversationId = searchParams?.get("conversationId") ?? "";

  useEffect(() => {
    if (!user?.defaultLanguage) {
      setT(null);
      return;
    }
    getDictionary(user.defaultLanguage)
      .then(setT)
      .catch(() => setT(null));
  }, [user?.defaultLanguage]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Cargando sesión...</div>;
  }
  if (!user) {
    return <div className="p-6 text-sm text-muted-foreground">No autenticado.</div>;
  }
  if (!t) {
    return <div className="p-6 text-sm text-muted-foreground">Cargando diccionario...</div>;
  }

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Inbox</h1>
        <p className="text-xs text-muted-foreground">
          Vista operativa multicanal por conversaciones activas.
        </p>
      </header>
      <ChannelInbox
        hotelId={user.hotelId}
        channel="all"
        t={t}
        viewMode="inbox"
        initialGuestId={initialGuestId || undefined}
        initialConversationId={initialConversationId || undefined}
      />
    </section>
  );
}
