// Path: /root/begasist/app/admin/page.tsx
"use client";

import { useCurrentUser } from "@/lib/context/UserContext";
import { Settings, User, Hotel, Server, FileText } from "lucide-react";
import UserStatus from "@/components/UsertStatus";
import { useEffect, useState } from "react";
import { getDictionary } from "@/lib/i18n/getDictionary";

export default function AdminDashboard() {
  const { user, loading } = useCurrentUser();

  // i18n state
  const [dictionary, setDictionary] = useState<any>(null);
  const [lang, setLang] = useState<string>("es");
  const [dictError, setDictError] = useState<string | null>(null);

  // 1) Setea automáticamente el idioma cuando se carga el usuario
  useEffect(() => {
    if (user?.defaultLanguage) {
      setLang(user.defaultLanguage);
    }
  }, [user]);

  // 2) Carga el diccionario cada vez que cambia el idioma (lang)
  useEffect(() => {
    setDictError(null);
    getDictionary(lang)
      .then((dict: any) => {
        setDictionary(dict);
      })
      .catch((err: unknown) => {
        setDictionary(null);
        setDictError("Error cargando diccionario: " + (err instanceof Error ? err.message : String(err)));
      });
  }, [lang]);

  // Early return: no continuar si falta el diccionario, hay error o no está el usuario
  if (dictError) {
    return <div className="p-6 text-red-600">{dictError}</div>;
  }
  if (!dictionary || !dictionary.admin) {
    return <div className="p-6 text-muted-foreground">Cargando diccionario...</div>;
  }
  if (loading) {
    return <div>{dictionary.admin.loadingUser || "Cargando usuario..."}</div>;
  }
  if (!user) {
    return <div>{dictionary.admin.notAuthenticated || "No autenticado"}</div>;
  }

  return (
    <div className="min-h-screen bg-transparent px-4 py-10 text-[#1F1724] dark:text-foreground">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Settings className="w-7 h-7" />
          {dictionary.admin.title}
        </h1>

        {/* Bloque: Datos del usuario y hotel */}
        <div className="flex flex-col gap-2 rounded-xl border border-[#E8DDEA] bg-[#FDF4FB] p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-primary" />
            <span className="font-semibold">{dictionary.admin.userLabel}</span> {user.email}
          </div>
          <div className="flex items-center gap-3">
            <Hotel className="w-5 h-5 text-primary" />
            <span className="font-semibold">{dictionary.admin.hotelLabel}</span> {user.hotelName}
            <span className="text-xs text-muted-foreground">(ID: {user.hotelId})</span>
          </div>
          <div className="flex items-center gap-3">
            <Server className="w-5 h-5 text-primary" />
            <span className="font-semibold">{dictionary.admin.roleLabel}</span> {user.roleLevel}
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-[#E8DDEA] bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <a className="text-sm underline" href="/admin/events">Eventos</a>
          <span className="text-xs text-muted-foreground">
            {user.hotelId === "system" ? "Incluye POI" : "Eventos del hotel"}
          </span>
        </div>

        {/* Bloque: Estado de Canales */}
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 mb-3">
            <Server className="w-5 h-5" />
            {dictionary.admin.channelStatusTitle}
          </h2>
          <div className="rounded-xl border border-[#E8DDEA] bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-sm text-slate-600 dark:text-zinc-300">
              El estado mostrado en Canales se obtiene de la configuración real del hotel. No se muestran métricas demo como actividad operativa.
            </p>
            <a
              href="/admin/channels"
              className="mt-4 inline-flex rounded-lg bg-[#AB0389] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#6F025C] dark:bg-white dark:text-zinc-900"
            >
              Ver configuración de canales
            </a>
          </div>
        </div>

        {/* Bloque: Logs recientes */}
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5" />
            {dictionary.admin.recentLogsTitle}
          </h2>
          <div className="rounded-xl border border-dashed border-[#D7B8D1] bg-[#FDF4FB] px-5 py-6 text-sm text-[#6B5D70] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            Sin eventos recientes reales para mostrar.
          </div>
        </div>

        {/* UserStatus (opcional) */}
        <UserStatus />
      </div>
    </div>
  );
}

/* 
---- NOTA SINTÉTICA ----

- El idioma (`lang`) se sincroniza automáticamente con el idioma nativo del hotel (`user.defaultLanguage`) ni bien el usuario está disponible.
- Así, el admin siempre respeta el idioma correcto SIN depender de valores hardcodeados o props.
- El warning de TS sobre `setLang` desaparece, y podés evolucionar a selector dinámico en el futuro si lo deseas.
*/
