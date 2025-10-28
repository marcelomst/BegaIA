"use client";
import { useMemo, useState, type FormEvent, useContext, useEffect } from "react";
import { HotelContext } from "@/lib/context/HotelContext";
import { useCurrentUser } from "@/lib/context/UserContext";

type Props = {
  defaultHotelId?: string;
  defaultUploader?: string;
};

const CATEGORIES = [
  { value: "amenities", label: "amenities" },
  { value: "billing", label: "billing" },
  { value: "support", label: "support" },
  { value: "retrieval_based", label: "retrieval_based" },
];

const COMMON_PROMPT_KEYS = [
  "kb_general",
  "amenities_list",
  "breakfast_bar",
  "parking",
  "pool_gym_spa",
  "arrivals_transport",
  "payments_and_billing",
  "invoice_receipts",
  "contact_support",
];

export default function KbUploadForm({ defaultHotelId = "hotel999", defaultUploader = "admin@hotel" }: Props) {
  const hotelCtx = useContext(HotelContext);
  const { user } = useCurrentUser?.() || { user: null } as any;
  const [hotelId, setHotelId] = useState<string>(defaultHotelId);
  const [uploader, setUploader] = useState<string>(defaultUploader);
  const [category, setCategory] = useState(CATEGORIES[0].value);
  const [promptKey, setPromptKey] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok?: boolean; version?: string; error?: string } | null>(null);

  useEffect(() => {
    const hId = hotelCtx?.hotel?.hotelId;
    if (hId && hId !== hotelId) setHotelId(hId);
  }, [hotelCtx?.hotel?.hotelId]);

  useEffect(() => {
    const email = user?.email;
    if (email && email !== uploader) setUploader(email);
  }, [user?.email]);

  const isReady = useMemo(() => !!file && !!hotelId && !!category, [file, hotelId, category]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setSubmitting(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("hotelId", hotelId);
      form.append("uploader", uploader || "anon");
      form.append("category", category);
      if (promptKey.trim()) form.append("promptKey", promptKey.trim());
      if (notes.trim()) form.append("notes", notes.trim());

      const res = await fetch("/api/upload-hotel-document", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok || data?.error) {
        setResult({ ok: false, error: data?.error || "Upload failed" });
      } else {
        setResult({ ok: true, version: data?.version });
        // Keep the selections, just clear file input
        setFile(null);
        const fileEl = document.getElementById("kb-file-input") as HTMLInputElement | null;
        if (fileEl) fileEl.value = "";
      }
    } catch (err: any) {
      setResult({ ok: false, error: err?.message || String(err) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-4 p-4 border rounded-md bg-white/60">
      <h2 className="text-lg font-semibold">Subir nueva versión de documento (KB)</h2>

      <div className="grid grid-cols-1 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-700">Hotel ID</span>
          <input
            type="text"
            value={hotelId}
            readOnly
            className="border rounded px-3 py-2 bg-gray-100 text-gray-700"
            placeholder="hotel999"
            title="Se toma de tu sesión"
          />
          <span className="text-xs text-gray-500">Se toma de tu sesión. (Bloqueado para evitar errores)</span>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-700">Uploader</span>
          <input
            type="email"
            value={uploader}
            onChange={(e) => setUploader(e.target.value)}
            className="border rounded px-3 py-2"
            placeholder="recepcion@hotel.com"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-700">Categoría</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="border rounded px-3 py-2"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-700">PromptKey</span>
            <input
              list="promptKey-list"
              value={promptKey}
              onChange={(e) => setPromptKey(e.target.value)}
              className="border rounded px-3 py-2"
              placeholder="ej: breakfast_bar"
            />
            <datalist id="promptKey-list">
              {COMMON_PROMPT_KEYS.map((k) => (
                <option key={k} value={k} />
              ))}
            </datalist>
            <span className="text-xs text-gray-500">Si lo dejás vacío, se infiere o queda null.</span>
          </label>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-700">Archivo (.txt o .pdf)</span>
          <input
            id="kb-file-input"
            type="file"
            accept=".txt,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="border rounded px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-700">Notas (opcional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="border rounded px-3 py-2"
            placeholder="Comentario para auditoría/versionado"
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!isReady || submitting}
          className={`px-4 py-2 rounded text-white ${isReady && !submitting ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 cursor-not-allowed"}`}
        >
          {submitting ? "Subiendo…" : "Subir nueva versión"}
        </button>
        {result?.ok && (
          <span className="text-sm text-green-700">OK · versión {result.version || "v?"}</span>
        )}
        {result?.ok === false && (
          <span className="text-sm text-red-700">Error: {result.error}</span>
        )}
      </div>

      <p className="text-xs text-gray-500">
        Tip: mantené Categoria y PromptKey consistentes. Para cambios chicos (ej: teléfono/WhatsApp), subí solo ese archivo.
      </p>
    </form>
  );
}
