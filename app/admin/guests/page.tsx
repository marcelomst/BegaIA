// Path: /root/begasist/app/admin/guests/page.tsx
"use client";

import { useEffect, useState } from "react";
import ChannelInbox from "@/components/admin/ChannelInbox";
import { useCurrentUser } from "@/lib/context/UserContext";
import { getDictionary } from "@/lib/i18n/getDictionary";

export default function AdminGuestsPage() {
  const { user, loading } = useCurrentUser();
  const [t, setT] = useState<any>(null);

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
        <h1 className="text-2xl font-semibold">Guests</h1>
        <p className="text-xs text-muted-foreground">
          Dominio guest-centric con foco en perfil y actividad por huésped.
        </p>
      </header>
      <ChannelInbox hotelId={user.hotelId} channel="all" t={t} viewMode="guests" />
    </section>
  );
}
