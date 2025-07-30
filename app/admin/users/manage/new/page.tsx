// Path: /app/admin/users/manage/new/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/lib/context/UserContext";
import { useCurrentHotel } from "@/lib/context/HotelContext";
import { Info } from "lucide-react";
import { RadixTooltip } from "@/components/ui/RadixTooltip";

// --- i18n: carga dinámica SOLO el idioma del hotel
function getDictionaryAsync(lang: string) {
  const code = lang?.slice(0, 2).toLowerCase();
  switch (code) {
    case "es":
      return import("@/lib/i18n/es").then((mod) => mod.default);
    case "pt":
      return import("@/lib/i18n/pt").then((mod) => mod.default);
    case "en":
    default:
      return import("@/lib/i18n/en").then((mod) => mod.default);
  }
}

export default function CreateUserPage() {
  const { user } = useCurrentUser();
  const { hotel } = useCurrentHotel();
  const router = useRouter();

  // Idioma según hotelConfig (default en inglés)
  const lang = hotel?.defaultLanguage || "en";
  const [t, setT] = useState<any>(null);
  const [loadingDict, setLoadingDict] = useState(true);

  // Carga el diccionario SOLO al montar/cambiar idioma
  useEffect(() => {
    setLoadingDict(true);
    getDictionaryAsync(lang)
      .then(setT)
      .catch(() => setT(null))
      .finally(() => setLoadingDict(false));
  }, [lang]);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [roleLevel, setRoleLevel] = useState<number | "">("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const isSystemHotel = user?.hotelId === "system";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    if (!user?.hotelId) {
      setError(t?.form?.errorHotel || "Hotel not identified");
      setSaving(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t?.form?.errorEmail || "Invalid email format.");
      setSaving(false);
      return;
    }
    if (!name.trim()) {
      setError(t?.form?.errorName || "Name is required");
      setSaving(false);
      return;
    }
    if (!position.trim()) {
      setError(t?.form?.errorPosition || "Position is required");
      setSaving(false);
      return;
    }
    if (roleLevel === "" || typeof roleLevel !== "number") {
      setError(t?.form?.errorRole || "Select a role for the user");
      setSaving(false);
      return;
    }

    const res = await fetch("/api/users/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hotelId: user.hotelId,
        email,
        name,
        position,
        roleLevel,
      }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || t?.form?.error || "Error creating user");
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/admin/users/manage"), 2000);
  }

  if (loadingDict || !t) {
    return <div className="mt-10 text-center">Cargando diccionario...</div>;
  }

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white dark:bg-zinc-900 rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        ➕ {t.form.submit}
        <RadixTooltip tip={t.tooltips.createUser}>
          <Info className="w-5 h-5 text-blue-600 cursor-pointer" />
        </RadixTooltip>
      </h1>
      {success ? (
        <div className="bg-green-100 border border-green-400 text-green-800 px-4 py-3 rounded mb-4">
          {t.form.success}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Email */}
          <div className="flex items-center gap-1">
            <RadixTooltip tip={t.tooltips.email}>
              <input
                type="email"
                placeholder={t.form.email}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border p-2 rounded"
                required
              />
            </RadixTooltip>
            <RadixTooltip tip={t.tooltips.email}>
              <Info className="w-4 h-4 text-blue-600 cursor-pointer" tabIndex={0} />
            </RadixTooltip>
          </div>

          {/* Name */}
          <div className="flex items-center gap-1">
            <RadixTooltip tip={t.tooltips.name}>
              <input
                type="text"
                placeholder={t.form.name}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border p-2 rounded"
                required
              />
            </RadixTooltip>
            <RadixTooltip tip={t.tooltips.name}>
              <Info className="w-4 h-4 text-blue-600 cursor-pointer" tabIndex={0} />
            </RadixTooltip>
          </div>

          {/* Position */}
          <div className="flex items-center gap-1">
            <RadixTooltip tip={t.tooltips.position}>
              <input
                type="text"
                placeholder={t.form.position}
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full border p-2 rounded"
                required
              />
            </RadixTooltip>
            <RadixTooltip tip={t.tooltips.position}>
              <Info className="w-4 h-4 text-blue-600 cursor-pointer" tabIndex={0} />
            </RadixTooltip>
          </div>

          {/* RoleLevel */}
          <div className="flex items-center gap-1">
            <RadixTooltip tip={t.tooltips.role}>
              <label className="block font-medium w-full">
                {t.form.role} <span className="text-red-500">*</span>
                <select
                  value={roleLevel}
                  onChange={(e) => setRoleLevel(e.target.value === "" ? "" : parseInt(e.target.value))}
                  className="w-full border p-2 rounded mt-1"
                  required
                >
                  <option value="">{t.form.role + "..."}</option>
                  {isSystemHotel && <option value={0}>{t.form.roleSuperuser}</option>}
                  <option value={10}>{t.form.roleAdmin}</option>
                  <option value={15}>{t.form.roleManager}</option>
                  <option value={20}>{t.form.roleReceptionist}</option>
                </select>
              </label>
            </RadixTooltip>
            <RadixTooltip tip={t.tooltips.role}>
              <Info className="w-4 h-4 text-blue-600 cursor-pointer" tabIndex={0} />
            </RadixTooltip>
          </div>

          {/* Mensaje de error */}
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex justify-between">
            <Button variant="secondary" type="button" onClick={() => router.back()}>
              ← {t.form.cancel}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? t.form.saving || "..." : t.form.submit}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
