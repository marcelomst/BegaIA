// Path: /components/admin/KbTemplatesClient.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { compileTemplate } from "@/lib/kb/templateCompiler";

// Tipo mínimo usado en este componente
type Row = {
  categoryId: string;
  name: string;
  languages: string[];
};

// Helper puro fuera del componente
function availableLangsFor(row: { languages: string[] }): string[] {
  return row.languages && row.languages.length > 0 ? row.languages : ["es"];
}

// Helper seguro para convertir cualquier valor a string
function safeToString(value: any): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function KbTemplatesClient({ rows }: { rows: Row[] }) {
  // Estado para loading de vectorización
  const [vectorizing, setVectorizing] = useState(false);

  // Handler para vectorizar KB
  const handleVectorizeKB = async () => {
    setVectorizing(true);
    try {
      const res = await fetch("/api/hotel-content/vectorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelId }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.status === "ok") {
        toast.success(
          `Vectorización completa: ${json.indexed ?? 0} nuevos, ${
            json.skipped ?? 0
          } saltados`
        );
      } else {
        toast.error("Error al vectorizar KB");
      }
    } catch {
      toast.error("Error al vectorizar KB");
    } finally {
      setVectorizing(false);
    }
  };

  // --- Helpers internos restaurados ---
  // Ordenar categorías por categoryId
  const sorted = useMemo(
    () => [...rows].sort((a, b) => a.categoryId.localeCompare(b.categoryId)),
    [rows]
  );

  // HOOKS
  const [hotelId, setHotelId] = useState("hotel999");
  const [langByCat, setLangByCat] = useState<Record<string, string>>({});
  const [defaultLang, setDefaultLang] = useState<string>("es");
  const [busy, setBusy] = useState<string | null>(null);
  const [setCurrent, setSetCurrent] = useState(true);
  const [version, setVersion] = useState<string>("v1");
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchLog, setBatchLog] = useState<string[]>([]);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorCatId, setEditorCatId] = useState<string>("");
  const [editorLang, setEditorLang] = useState<string>("es");
  const [editorTitle, setEditorTitle] = useState<string>("");
  const [editorVersion, setEditorVersion] = useState<string>("v1");

  // Izquierda: texto humano (hydrated.body)
  const [humanBody, setHumanBody] = useState<string>("");

  // Derecha: plantilla con tokens (machine language)
  const [machineBody, setMachineBody] = useState<string>("");

  const [compileWarnings, setCompileWarnings] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState<boolean>(true);
  const [versionHistory, setVersionHistory] = useState<Array<any>>([]);
  const [versionHistoryLoading, setVersionHistoryLoading] =
    useState<boolean>(false);
  const [showDiffBlocks, setShowDiffBlocks] = useState<boolean>(false);
  const [rowSourceByCat, setRowSourceByCat] = useState<
    Record<string, "hotel" | "registry" | "seed" | "unknown">
  >({});

  // Estado de validación de tokens
  const [validation, setValidation] = useState<null | {
    missingFromHotelConfig: string[];
    invalidEachBlocks: string[];
    invalidJoinBlocks: string[];
    tokensMissingInDBVersion: string[];
    summary: "OK" | "ISSUES";
  }>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Cargar plantilla para edición
  const loadTemplate = async (categoryId: string, lang: string) => {
    setEditorLoading(true);
    try {
      const url = `/api/hotel-content/get?hotelId=${encodeURIComponent(
        hotelId
      )}&categoryId=${encodeURIComponent(
        categoryId
      )}&lang=${encodeURIComponent(lang)}`;
      const res = await fetch(url);
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok) {
        setEditorTitle(json.title || "");

        // humano: priorizamos hydrated.body; si no, content
        const hydratedBody =
          json?.hydrated?.body ?? json?.content ?? json?.body ?? "";
        setHumanBody(safeToString(hydratedBody));

        // máquina: priorizamos hydrated.machineBody; si no, content
        const templateTokens =
          json?.hydrated?.machineBody ??
          json?.content ??
          json?.template ??
          "";
        setMachineBody(safeToString(templateTokens));

        if (json.validation) {
          setValidation(json.validation);
        } else {
          setValidation(null);
        }
        setValidationError(null);

        if (json.source === "hotel" && (json.content || json.hydrated)) {
          setRowSourceByCat((m) => ({ ...m, [categoryId]: "hotel" }));
        } else if (json.source === "registry" || json.source === "seed") {
          setRowSourceByCat((m) => ({ ...m, [categoryId]: json.source }));
        } else {
          setRowSourceByCat((m) => ({ ...m, [categoryId]: "unknown" }));
        }
      } else {
        setEditorTitle("");
        setHumanBody("");
        setMachineBody("");
        setValidation(null);
        setValidationError("No se pudo validar la plantilla");
      }
    } catch {
      setEditorTitle("");
      setHumanBody("");
      setMachineBody("");
      setValidation(null);
      setValidationError("No se pudo validar la plantilla");
    } finally {
      setEditorLoading(false);
    }
  };

  // Cargar historial de versiones
  const loadVersionHistory = async (categoryId: string, lang: string) => {
    setVersionHistoryLoading(true);
    try {
      const url = `/api/hotel-content/list?hotelId=${encodeURIComponent(
        hotelId
      )}&categoryId=${encodeURIComponent(
        categoryId
      )}&lang=${encodeURIComponent(lang)}&diff=1`;
      const res = await fetch(url);
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok) {
        setVersionHistory(json.versions || []);
        const nums = (json.versions || [])
          .map((v: any) => v.versionNumber)
          .filter((n: any) => Number.isFinite(n));
        const next = nums.length ? Math.max(...nums) + 1 : 1;
        setEditorVersion(`v${next}`);
      } else {
        setVersionHistory([]);
        setEditorVersion("v1");
      }
    } catch {
      setVersionHistory([]);
      setEditorVersion("v1");
    } finally {
      setVersionHistoryLoading(false);
    }
  };

  // Sembrar todas las categorías
  const seedAll = async () => {
    setBatchBusy(true);
    setBatchLog([]);
    for (const r of sorted) {
      try {
        await seed(r.categoryId);
        setBatchLog((log) => [...log, `✔ ${r.categoryId}`]);
      } catch (e: any) {
        setBatchLog((log) => [
          ...log,
          `✗ ${r.categoryId}: ${e?.message || e}`,
        ]);
      }
    }
    setBatchBusy(false);
  };

  // Detectar origen (hotel vs fallback) al cargar la página sin necesidad de abrir cada fila.
  useEffect(() => {
    let cancelled = false;
    async function detectSources() {
      for (const r of sorted) {
        const lang =
          langByCat[r.categoryId] ||
          defaultLang ||
          (r.languages[0] || "es");
        try {
          const url = `/api/hotel-content/get?hotelId=${encodeURIComponent(
            hotelId
          )}&categoryId=${encodeURIComponent(
            r.categoryId
          )}&lang=${encodeURIComponent(lang)}`;
          const res = await fetch(url);
          const json = await res.json().catch(() => null);
          if (cancelled) return;
          if (json?.ok) {
            const source =
              json.source === "hotel"
                ? "hotel"
                : json.source === "registry" || json.source === "seed"
                ? json.source
                : "unknown";
            setRowSourceByCat((prev) => {
              if (prev[r.categoryId] === "hotel") return prev; // No sobrescribir éxito manual reciente
              return { ...prev, [r.categoryId]: source as any };
            });
          } else {
            setRowSourceByCat((prev) => {
              if (prev[r.categoryId] === "hotel") return prev;
              return { ...prev, [r.categoryId]: "unknown" };
            });
          }
        } catch {
          if (cancelled) return;
          setRowSourceByCat((prev) => {
            if (prev[r.categoryId] === "hotel") return prev;
            return { ...prev, [r.categoryId]: "unknown" };
          });
        }
      }
    }
    detectSources();
    return () => {
      cancelled = true;
    };
  }, [hotelId, sorted, defaultLang, langByCat]);

  async function seed(categoryId: string) {
    const lang = langByCat[categoryId] || defaultLang || "es";
    setBusy(categoryId);
    const tId = toast.loading(`Creando ${categoryId}…`);
    try {
      const res = await fetch("/api/category/seed-to-hotel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelId, categoryId, lang, setCurrent, version }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error");
      toast.success(
        `OK ${categoryId} v${(json.version || "v1").replace(/^v/i, "")}`,
        { id: tId }
      );
      // Marcamos inmediatamente el origen como hotel para reflejar el cambio sin abrir el editor.
      setRowSourceByCat((m) => ({ ...m, [categoryId]: "hotel" }));
    } catch (e: any) {
      toast.error(`Error ${categoryId}: ${e?.message || e}`, { id: tId });
    } finally {
      setBusy(null);
    }
  }

  // ---
  // Sincronizar desde seed (Hito 3) — pendiente de implementación fina
  // ---
  const syncFromSeed = async () => {
    // TODO: implementar llamada a endpoint de sync cuando lo tengas listo
  };

  async function openEditor(categoryId: string) {
    const lang = langByCat[categoryId] || defaultLang || "es";
    setEditorCatId(categoryId);
    setEditorLang(lang);
    setEditorTitle("");
    setEditorVersion(version || "v1");
    setHumanBody("");
    setMachineBody("");
    setCompileWarnings([]);
    setVersionHistory([]);
    setShowDiffBlocks(false);
    setEditorOpen(true);
    await loadTemplate(categoryId, lang);
    await loadVersionHistory(categoryId, lang);
  }

  async function saveEditorAndSeed() {
    if (!editorCatId) return;
    setBusy(editorCatId);
    const tId = toast.loading(`Guardando ${editorCatId}…`);
    try {
      // Compilamos SIEMPRE el texto humano actual a plantilla con tokens.
      let bodyToSave = machineBody;
      try {
        const compiled = compileTemplate(
          humanBody || "",
          {
            hotelConfig: {} as any,
            categoryId: editorCatId,
            lang: editorLang,
          },
          {}
        );
        bodyToSave = compiled.text;
        setMachineBody(compiled.text);
        setCompileWarnings(compiled.warnings);
        if (compiled.warnings?.length) {
          console.warn("[KB compileTemplate] Warnings:", compiled.warnings);
        }
      } catch (e) {
        console.warn(
          "[KB compileTemplate] Error al compilar, se guarda machineBody actual:",
          e
        );
      }

      const res = await fetch("/api/category/seed-to-hotel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelId,
          categoryId: editorCatId,
          lang: editorLang,
          setCurrent,
          version: editorVersion || version || "v1",
          overrideTitle: editorTitle || undefined,
          overrideBody: bodyToSave || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error");
      toast.success(
        `OK ${editorCatId} v${(json.version || version || "v1").replace(
          /^v/i,
          ""
        )}`,
        { id: tId }
      );
      setRowSourceByCat((m) => ({ ...m, [editorCatId]: "hotel" }));
      setEditorOpen(false);
    } catch (e: any) {
      toast.error(`Error ${editorCatId}: ${e?.message || e}`, { id: tId });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Controles superiores */}
      <div className="flex items-center gap-4">
        <label className="text-sm">Hotel ID</label>
        <input
          className="border rounded px-2 py-1 text-sm"
          value={hotelId}
          onChange={(e) => setHotelId(e.target.value)}
          placeholder="hotel999"
        />
        <label className="text-sm">Versión</label>
        <input
          className="border rounded px-2 py-1 text-sm w-24"
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          placeholder="v1"
        />
        <label className="text-sm">Lang por defecto</label>
        <select
          className="border rounded px-2 py-1"
          value={defaultLang}
          onChange={(e) => setDefaultLang(e.target.value)}
        >
          <option value="es">es</option>
          <option value="en">en</option>
          <option value="pt">pt</option>
        </select>
        <label className="text-sm flex items-center gap-2">
          <input
            type="checkbox"
            checked={setCurrent}
            onChange={(e) => setSetCurrent(e.target.checked)}
          />
          Set current version
        </label>
        <button
          className="px-3 py-1 rounded bg-green-600 text-white disabled:opacity-50"
          disabled={batchBusy || sorted.length === 0}
          onClick={seedAll}
        >
          {batchBusy ? "Creando todo…" : `Crear todo (${sorted.length})`}
        </button>
        <button
          className="px-3 py-1 rounded bg-purple-700 text-white disabled:opacity-50"
          disabled={vectorizing}
          onClick={handleVectorizeKB}
        >
          {vectorizing ? "Vectorizando KB…" : "Vectorizar KB"}
        </button>
      </div>

      {/* Tabla de categorías */}
      <div className="overflow-auto rounded border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-2">CategoryId</th>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Lang</th>
              <th className="text-left p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.categoryId} className="border-t">
                <td className="p-2 font-mono">{r.categoryId}</td>
                <td className="p-2">{r.name}</td>
                <td className="p-2">
                  <select
                    className="border rounded px-2 py-1"
                    value={
                      langByCat[r.categoryId] ||
                      availableLangsFor(r)[0] ||
                      defaultLang ||
                      "es"
                    }
                    onChange={(e) =>
                      setLangByCat((m) => ({
                        ...m,
                        [r.categoryId]: e.target.value,
                      }))
                    }
                  >
                    {availableLangsFor(r).map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                  <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded border align-middle">
                    {rowSourceByCat[r.categoryId] === "hotel" &&
                      "hotel_content"}
                    {(rowSourceByCat[r.categoryId] === "registry" ||
                      rowSourceByCat[r.categoryId] === "seed") &&
                      "fallback"}
                    {!rowSourceByCat[r.categoryId] && "?"}
                  </span>
                </td>
                <td className="p-2">
                  <button
                    className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-50"
                    disabled={busy === r.categoryId}
                    onClick={() => seed(r.categoryId)}
                  >
                    {busy === r.categoryId
                      ? "Creando…"
                      : "Crear desde plantilla"}
                  </button>
                  <button
                    className="ml-2 px-3 py-1 rounded bg-gray-700 text-white disabled:opacity-50"
                    disabled={busy === r.categoryId}
                    onClick={() => openEditor(r.categoryId)}
                  >
                    Ver / Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {batchLog.length > 0 && (
        <div className="rounded border p-2 text-xs font-mono whitespace-pre-wrap max-h-64 overflow-auto">
          {batchLog.join("\n")}
        </div>
      )}

      {/* Modal editor */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white dark:bg-zinc-900 rounded shadow-lg w-full max-w-3xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Editar plantilla</h2>
              <button
                className="text-sm"
                onClick={() => setEditorOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="text-xs text-muted-foreground mb-2 flex items-center flex-wrap gap-2">
              <span className="font-mono">{editorCatId}</span>
              <span>lang:</span>
              <select
                className="border rounded px-2 py-1"
                value={editorLang}
                onChange={(e) => {
                  const newLang = e.target.value;
                  setEditorLang(newLang);
                  if (editorCatId) {
                    loadTemplate(editorCatId, newLang);
                    loadVersionHistory(editorCatId, newLang);
                  }
                }}
              >
                {(["es", "en", "pt"] as const).map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
              <span>versión:</span>
              <input
                className="border rounded px-1 py-0.5 w-16"
                value={editorVersion}
                onChange={(e) => setEditorVersion(e.target.value)}
                placeholder="v1"
              />
              {versionHistory.length > 0 && (
                <span className="text-[10px] opacity-60">
                  sugerida siguiente: {editorVersion}
                </span>
              )}
            </div>
            {/* Validación automática de tokens */}
            {validationError && (
              <div className="mb-2 text-xs text-red-600 dark:text-red-400 border border-red-500/40 rounded px-2 py-1">
                {validationError}
              </div>
            )}
            {validation && (
              <div className="mb-2 text-xs">
                <span
                  className={
                    validation.summary === "OK"
                      ? "text-green-700 dark:text-green-400 font-semibold"
                      : "text-yellow-700 dark:text-yellow-400 font-semibold"
                  }
                >
                  Estado:{" "}
                  {validation.summary === "OK" ? "OK" : "Con issues"}
                </span>
                {validation.summary === "ISSUES" && (
                  <div className="mt-1 space-y-1">
                    {validation.missingFromHotelConfig.length > 0 && (
                      <div>
                        <span className="font-semibold">
                          Campos faltantes en hotel_config:
                        </span>
                        <ul className="list-disc list-inside ml-4">
                          {validation.missingFromHotelConfig.map((k) => (
                            <li key={k}>{k}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {validation.invalidEachBlocks.length > 0 && (
                      <div>
                        <span className="font-semibold">
                          Bloques each inválidos:
                        </span>
                        <ul className="list-disc list-inside ml-4">
                          {validation.invalidEachBlocks.map((k) => (
                            <li key={k}>{k}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {validation.invalidJoinBlocks.length > 0 && (
                      <div>
                        <span className="font-semibold">
                          Bloques join inválidos:
                        </span>
                        <ul className="list-disc list-inside ml-4">
                          {validation.invalidJoinBlocks.map((k) => (
                            <li key={k}>{k}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {validation.tokensMissingInDBVersion.length > 0 && (
                      <div>
                        <span className="font-semibold">
                          Tokens presentes en seed pero no en la versión actual:
                        </span>
                        <ul className="list-disc list-inside ml-4">
                          {validation.tokensMissingInDBVersion.map((k) => (
                            <li key={k}>{k}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {editorLoading ? (
              <div className="p-4">Cargando…</div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-sm">Título</label>
                  <input
                    className="mt-1 w-full border rounded px-2 py-1 text-sm"
                    value={editorTitle}
                    onChange={(e) => setEditorTitle(e.target.value)}
                    placeholder="# Encabezado…"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm">
                      Contenido (vista humana)
                    </label>
                    <label className="text-xs flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={showPreview}
                        onChange={(e) => setShowPreview(e.target.checked)}
                      />
                      Ver plantilla con tokens (lenguaje máquina)
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    {/* Izquierda: HUMANO */}
                    <textarea
                      className="border rounded px-2 py-1 text-sm min-h-[260px] font-mono col-span-1"
                      value={humanBody}
                      onChange={(e) => {
                        const value = e.target.value;
                        setHumanBody(value);
                        if (!editorCatId) return;
                        try {
                          const compiled = compileTemplate(
                            value,
                            {
                              hotelConfig: {} as any,
                              categoryId: editorCatId,
                              lang: editorLang,
                            },
                            {}
                          );
                          setMachineBody(compiled.text);
                          setCompileWarnings(compiled.warnings);
                        } catch (err) {
                          console.warn(
                            "[KB compileTemplate] Error al compilar en vivo:",
                            err
                          );
                        }
                      }}
                      placeholder="# Texto en Markdown comprensible por el recepcionista…"
                    />
                    {/* Derecha: MÁQUINA (tokens) */}
                    {showPreview && (
                      <div className="border rounded p-3 text-sm bg-white dark:bg-zinc-950 max-h-[260px] overflow-auto col-span-1 prose prose-sm dark:prose-invert">
                        <div className="text-xs text-muted-foreground mb-1">
                          Plantilla compilada (tokens [[key: ...]])
                        </div>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {machineBody ?? ""}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                  {compileWarnings.length > 0 && (
                    <div className="mt-2 text-xs text-yellow-700 dark:text-yellow-400 border border-yellow-500/40 rounded px-2 py-1">
                      <div className="font-semibold mb-1">
                        Avisos del compilador:
                      </div>
                      <ul className="list-disc list-inside space-y-0.5">
                        {compileWarnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <button
                    className="px-3 py-1 rounded bg-orange-500 text-white disabled:opacity-50"
                    disabled={busy === editorCatId}
                    onClick={syncFromSeed}
                  >
                    Actualizar desde plantilla base
                  </button>
                  <button
                    className="px-3 py-1 rounded"
                    onClick={() => setEditorOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-50"
                    disabled={!humanBody || busy === editorCatId}
                    onClick={saveEditorAndSeed}
                  >
                    Guardar y crear
                  </button>
                </div>

                {/* Evolución de versiones */}
                <div className="mt-6 border-t pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold">
                      Evolución de versiones
                    </h3>
                    <div className="flex items-center gap-3">
                      <button
                        className="text-xs px-2 py-1 rounded border"
                        onClick={() =>
                          loadVersionHistory(editorCatId, editorLang)
                        }
                        disabled={versionHistoryLoading}
                      >
                        {versionHistoryLoading
                          ? "Actualizando…"
                          : "Refrescar"}
                      </button>
                      <label className="text-xs flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={showDiffBlocks}
                          onChange={(e) =>
                            setShowDiffBlocks(e.target.checked)
                          }
                        />
                        Ver diff
                      </label>
                    </div>
                  </div>
                  {versionHistoryLoading && (
                    <div className="text-xs">Cargando historial…</div>
                  )}
                  {!versionHistoryLoading &&
                    versionHistory.length === 0 && (
                      <div className="text-xs text-muted-foreground">
                        Sin versiones previas para esta categoría / idioma.
                      </div>
                    )}
                  {!versionHistoryLoading &&
                    versionHistory.length > 0 && (
                      <div className="space-y-2 max-h-64 overflow-auto">
                        {versionHistory.map((v) => (
                          <div
                            key={v.versionTag}
                            className="border rounded p-2 text-xs bg-white dark:bg-zinc-950"
                          >
                            <div className="flex items-center justify-between">
                              <div className="font-mono font-semibold">
                                {v.versionTag}
                              </div>
                              <div className="flex items-center gap-2">
                                {v.isCurrent && (
                                  <span className="px-1.5 py-0.5 rounded bg-green-600 text-white">
                                    current
                                  </span>
                                )}
                                <span className="text-[10px] opacity-70">
                                  {v.bodyChars} chars
                                </span>
                                {v.updatedAt && (
                                  <span className="text-[10px] opacity-70">
                                    {(v.updatedAt || "").slice(0, 16)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="mt-1 line-clamp-3 whitespace-pre-wrap break-words">
                              {v.bodyPreview}
                            </div>
                            {showDiffBlocks &&
                              v.diff &&
                              Array.isArray(v.diff) &&
                              v.diff.length > 0 && (
                                <div className="mt-2 border-t pt-1">
                                  <div className="font-semibold mb-1">
                                    Diff vs versión previa:
                                  </div>
                                  <pre className="text-[10px] overflow-auto max-h-40">
                                    {v.diff
                                      .slice(0, 400)
                                      .map((d: any) => {
                                        if (d.type === "same")
                                          return `  ${d.a}\n`;
                                        if (d.type === "changed")
                                          return `~ ${d.a} => ${d.b}\n`;
                                        if (d.type === "removed")
                                          return `- ${d.a}\n`;
                                        if (d.type === "added")
                                          return `+ ${d.b}\n`;
                                        return "";
                                      })
                                      .join("")}
                                  </pre>
                                </div>
                              )}
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
