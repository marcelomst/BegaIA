// Path: /root/begasist/app/admin/page.tsx
"use client";

import { useCurrentUser } from "@/lib/context/UserContext";
import { Settings, User, Hotel, Server, Users, FileText } from "lucide-react";
import UserStatus from "@/components/UsertStatus";
import Image from "next/image";
import { useEffect, useState } from "react";
import { getDictionary } from "@/lib/i18n/getDictionary";

// MOCK de estados por canal y usuarios
const channelData = [
  {
    key: "web",
    nameKey: "web",
    icon: <Image src="/icons/web.svg" alt="Web" width={20} height={20} className="inline mr-1" />,
    modeKey: "automatic",
    status: "online",
    todayMessages: 13,
    pending: 1,
  },
  {
    key: "email",
    nameKey: "email",
    icon: <Image src="/icons/email.svg" alt="Email" width={20} height={20} className="inline mr-1" />,
    modeKey: "supervised",
    status: "offline",
    todayMessages: 3,
    pending: 2,
  },
  {
    key: "whatsapp",
    nameKey: "whatsapp",
    icon: <Image src="/icons/whatsapp.svg" alt="WhatsApp" width={20} height={20} className="inline mr-1" />,
    modeKey: "automatic",
    status: "online",
    todayMessages: 10,
    pending: 0,
  },
  {
    key: "channelManager",
    nameKey: "channelManager",
    icon: <Image src="/icons/channelManager.svg" alt="ChannelMgr" width={20} height={20} className="inline mr-1" />,
    modeKey: "automatic",
    status: "online",
    todayMessages: 2,
    pending: 0,
  },
];

const usersMock = [
  { name: "marcelomst1@gmail.com", roleKey: "admin", lastLoginKey: "today", lastLogin: "8:23" },
  { name: "soporte@demo.com", roleKey: "receptionist", lastLoginKey: "yesterday", lastLogin: "22:10" },
];

const logsMockKeys = [
  "log.whatsappConnected",
  "log.webApproved",
  "log.emailDiscarded",
];

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
    <div className="min-h-screen bg-background text-foreground py-10 px-4">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Settings className="w-7 h-7" />
          {dictionary.admin.title}
        </h1>

        {/* Bloque: Datos del usuario y hotel */}
        <div className="rounded-lg bg-muted shadow p-6 flex flex-col gap-2">
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

        {/* Bloque: Estado de Canales */}
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 mb-3">
            <Server className="w-5 h-5" />
            {dictionary.admin.channelStatusTitle}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {channelData.map((ch) => (
              <div
                key={ch.key}
                className="rounded-lg bg-white dark:bg-zinc-900 shadow border border-gray-200 dark:border-zinc-700 p-4 flex flex-col gap-2"
              >
                <div className="flex items-center gap-2 font-semibold">
                  {ch.icon}
                  {dictionary.admin.channels[ch.nameKey]}
                  <span
                    className={`ml-auto px-2 py-0.5 rounded text-xs font-semibold ${
                      ch.status === "online"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {ch.status === "online"
                      ? dictionary.admin.online
                      : dictionary.admin.offline}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs mt-1">
                  <span
                    className={`px-2 py-0.5 rounded font-semibold ${
                      ch.modeKey === "automatic"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {dictionary.admin.modes[ch.modeKey]}
                  </span>
                  <span className="ml-auto">
                    {dictionary.admin.todayMessages}: <b>{ch.todayMessages}</b>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span>
                    {dictionary.admin.pending}:{" "}
                    <span className={ch.pending > 0 ? "text-red-600 font-bold" : ""}>
                      {ch.pending}
                    </span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bloque: Usuarios activos */}
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 mb-3">
            <Users className="w-5 h-5" />
            {dictionary.admin.activeUsersTitle}
          </h2>
          <div className="flex gap-6 flex-wrap">
            {usersMock.map((u, i) => (
              <div
                key={i}
                className="rounded bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 px-4 py-3 flex flex-col"
              >
                <span className="font-semibold">{u.name}</span>
                <span className="text-xs text-muted-foreground capitalize">
                  {dictionary.admin.roles[u.roleKey]}
                </span>
                <span className="text-xs text-primary">
                  {dictionary.admin.lastLoginLabel}: {dictionary.admin[u.lastLoginKey]} {u.lastLogin}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bloque: Logs recientes */}
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5" />
            {dictionary.admin.recentLogsTitle}
          </h2>
          <ul className="text-sm text-muted-foreground list-disc ml-6">
            {logsMockKeys.map((logKey, i) => (
              <li key={i}>{dictionary.admin.logs[logKey]}</li>
            ))}
          </ul>
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
