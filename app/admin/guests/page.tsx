// Path: /root/begasist/app/admin/guests/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useCurrentUser } from "@/lib/context/UserContext";
import { getGuestDisplayName } from "@/lib/utils/guestDisplay";
import { buildGuestMergeSuggestions } from "@/lib/utils/guestMergeSuggestions";

type GuestRow = {
  guestId: string;
  name: string | null;
  mode: string | null;
  aliases: string[];
  channels: string[];
  conversationCount: number;
  lastActivityAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  absorbed: boolean;
};

type ConversationSummary = {
  conversationId: string;
  channel?: string;
  subject?: string;
  lastUpdatedAt?: string;
  status?: string;
};

function fmtDate(v: string | null | undefined): string {
  if (!v) return "-";
  const t = Date.parse(v);
  if (!Number.isFinite(t)) return "-";
  return new Date(t).toLocaleString();
}

function compactGuestId(id: string): string {
  if (!id) return "";
  if (id.length <= 16) return id;
  return `${id.slice(0, 8)}...${id.slice(-6)}`;
}

export default function AdminGuestsPage() {
  const { user, loading } = useCurrentUser();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [selectedGuestId, setSelectedGuestId] = useState<string>("");
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [search, setSearch] = useState("");
  const [mergeSecondaryGuestId, setMergeSecondaryGuestId] = useState("");
  const [dismissedSuggestionKeys, setDismissedSuggestionKeys] = useState<string[]>([]);

  async function loadGuests() {
    if (!user?.hotelId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/guests?hotelId=${encodeURIComponent(user.hotelId)}`, {
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error("No se pudo cargar guests");
      const data = await res.json();
      const rows: GuestRow[] = Array.isArray(data?.guests) ? data.guests : [];
      setGuests(rows);
      if (!selectedGuestId && rows[0]?.guestId) {
        setSelectedGuestId(rows[0].guestId);
      } else if (selectedGuestId && !rows.find((g) => g.guestId === selectedGuestId)) {
        setSelectedGuestId(rows[0]?.guestId || "");
      }
    } catch (e) {
      setError((e as Error).message || "Error cargando guests");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    loadGuests();
  }, [user?.hotelId]);

  useEffect(() => {
    if (!user?.hotelId || !selectedGuestId) {
      setConversations([]);
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `/api/admin/conversations?hotelId=${encodeURIComponent(user.hotelId)}&guestId=${encodeURIComponent(selectedGuestId)}`,
          { credentials: "same-origin" },
        );
        if (!res.ok) {
          setConversations([]);
          return;
        }
        const data = await res.json();
        setConversations(Array.isArray(data?.conversations) ? data.conversations : []);
      } catch {
        setConversations([]);
      }
    })();
  }, [user?.hotelId, selectedGuestId]);

  const filteredGuests = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return guests;
    return guests.filter((g) => {
      const inId = g.guestId.toLowerCase().includes(q);
      const inName = String(g.name || "").toLowerCase().includes(q);
      const inAliases = g.aliases.some((a) => a.toLowerCase().includes(q));
      return inId || inName || inAliases;
    });
  }, [guests, search]);

  const selectedGuest = useMemo(
    () => guests.find((g) => g.guestId === selectedGuestId) || null,
    [guests, selectedGuestId],
  );

  const mergeCandidates = useMemo(
    () => guests.filter((g) => g.guestId !== selectedGuestId && !g.absorbed),
    [guests, selectedGuestId],
  );

  const guestsById = useMemo(
    () => new Map(guests.map((guest) => [guest.guestId, guest])),
    [guests],
  );

  const mergeSuggestions = useMemo(
    () =>
      buildGuestMergeSuggestions(guests).filter(
        (suggestion) => !dismissedSuggestionKeys.includes(suggestion.key),
      ),
    [guests, dismissedSuggestionKeys],
  );

  function dismissSuggestion(key: string) {
    setDismissedSuggestionKeys((current) => (current.includes(key) ? current : [...current, key]));
  }

  function prepareMergeFromSuggestion(primaryGuestId: string, secondaryGuestId: string) {
    setSelectedGuestId(primaryGuestId);
    setMergeSecondaryGuestId(secondaryGuestId);
    window.setTimeout(() => {
      document.getElementById("guest-merge-panel")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 60);
  }

  async function handleMerge() {
    if (!user?.hotelId || !selectedGuestId || !mergeSecondaryGuestId) return;
    const secondary = guests.find((g) => g.guestId === mergeSecondaryGuestId);
    const ok = window.confirm(
      `Vas a mergear identidad.\n\nPrimary: ${selectedGuestId}\nSecondary: ${mergeSecondaryGuestId}\n\nEsta acción mueve aliases y referencias conversacionales al guest principal.`,
    );
    if (!ok) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/guests/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          hotelId: user.hotelId,
          primaryGuestId: selectedGuestId,
          secondaryGuestId: mergeSecondaryGuestId,
          mergedBy: user.email,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(data?.error || "No se pudo mergear guests"));
      setMergeSecondaryGuestId("");
      await loadGuests();
      setSelectedGuestId(selectedGuestId);
      if (secondary) {
        await new Promise((r) => setTimeout(r, 80));
      }
    } catch (e) {
      setError((e as Error).message || "Error en merge manual");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Cargando sesión...</div>;
  }
  if (!user) {
    return <div className="p-6 text-sm text-muted-foreground">No autenticado.</div>;
  }

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Guests</h1>
        <p className="text-xs text-muted-foreground">
          Registro de identidades del hotel, aliases multicanal y consolidación manual.
        </p>
      </header>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded border border-border bg-background p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold">Posibles merges sugeridos</h2>
            <p className="text-xs text-muted-foreground">
              Sugerencias heurísticas para detectar posibles duplicados. El merge sigue siendo manual.
            </p>
          </div>
          <span className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
            {mergeSuggestions.length} sugerencia{mergeSuggestions.length === 1 ? "" : "s"}
          </span>
        </div>
        {mergeSuggestions.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No hay sugerencias útiles con las heurísticas actuales.
          </div>
        ) : (
          <div className="space-y-2">
            {mergeSuggestions.map((suggestion) => {
              const primary = guestsById.get(suggestion.primaryGuestId);
              const secondary = guestsById.get(suggestion.secondaryGuestId);
              if (!primary || !secondary) return null;

              const severityClass =
                suggestion.severity === "high"
                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200"
                  : suggestion.severity === "medium"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200"
                    : "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-200";

              return (
                <div
                  key={suggestion.key}
                  className="rounded border border-border bg-muted/20 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${severityClass}`}>
                        {suggestion.severity}
                      </span>
                      <span className="text-xs text-muted-foreground">score {suggestion.score}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="rounded border border-border bg-background px-2 py-1 text-xs hover:bg-muted"
                        onClick={() => setSelectedGuestId(primary.guestId)}
                      >
                        Revisar
                      </button>
                      <button
                        type="button"
                        className="rounded bg-amber-700 px-2 py-1 text-xs text-white hover:bg-amber-800"
                        onClick={() => prepareMergeFromSuggestion(primary.guestId, secondary.guestId)}
                      >
                        Preparar merge
                      </button>
                      <button
                        type="button"
                        className="rounded border border-border bg-background px-2 py-1 text-xs hover:bg-muted"
                        onClick={() => dismissSuggestion(suggestion.key)}
                      >
                        Ignorar por ahora
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded border border-border bg-background p-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Primary candidate
                      </div>
                      <div className="font-medium">
                        {getGuestDisplayName({
                          guestId: primary.guestId,
                          name: primary.name,
                          aliases: primary.aliases,
                          channel: primary.channels[0] || null,
                        })}
                      </div>
                      <div className="font-mono text-xs text-muted-foreground">
                        guestId: {compactGuestId(primary.guestId)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {primary.channels.length ? primary.channels.join(", ") : "-"} · {fmtDate(primary.lastActivityAt)}
                      </div>
                    </div>
                    <div className="rounded border border-border bg-background p-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Secondary candidate
                      </div>
                      <div className="font-medium">
                        {getGuestDisplayName({
                          guestId: secondary.guestId,
                          name: secondary.name,
                          aliases: secondary.aliases,
                          channel: secondary.channels[0] || null,
                        })}
                      </div>
                      <div className="font-mono text-xs text-muted-foreground">
                        guestId: {compactGuestId(secondary.guestId)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {secondary.channels.length ? secondary.channels.join(", ") : "-"} · {fmtDate(secondary.lastActivityAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {suggestion.signals.map((signal) => (
                      <span
                        key={signal}
                        className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground"
                      >
                        {signal}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded border border-border bg-background p-3">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="font-semibold">Listado real de huéspedes</h2>
            <button
              className="px-2 py-1 text-xs rounded border border-border hover:bg-muted"
              onClick={loadGuests}
              disabled={busy}
              type="button"
            >
              {busy ? "Actualizando..." : "Actualizar"}
            </button>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por guestId, nombre o alias"
            className="w-full mb-3 rounded border border-border px-2 py-1 text-sm bg-background"
          />
          <div className="max-h-[56vh] overflow-auto rounded border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="text-left px-2 py-1">Guest</th>
                  <th className="text-left px-2 py-1">Aliases</th>
                  <th className="text-left px-2 py-1">Canales</th>
                  <th className="text-left px-2 py-1">Convs</th>
                  <th className="text-left px-2 py-1">Última actividad</th>
                </tr>
              </thead>
              <tbody>
                {filteredGuests.map((g) => (
                  <tr
                    key={g.guestId}
                    className={`cursor-pointer border-t border-border ${
                      g.guestId === selectedGuestId ? "bg-blue-50 dark:bg-blue-950/30" : "hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedGuestId(g.guestId)}
                  >
                    <td className="px-2 py-1">
                      <div className="font-medium">
                        {getGuestDisplayName({
                          guestId: g.guestId,
                          name: g.name,
                          aliases: g.aliases,
                          channel: g.channels[0] || null,
                        })}
                      </div>
                      <div className="font-mono text-xs text-muted-foreground" title={g.guestId}>
                        guestId: {compactGuestId(g.guestId)}
                      </div>
                    </td>
                    <td className="px-2 py-1">{g.aliases.length}</td>
                    <td className="px-2 py-1">{g.channels.length ? g.channels.join(", ") : "-"}</td>
                    <td className="px-2 py-1">{g.conversationCount}</td>
                    <td className="px-2 py-1 text-xs">{fmtDate(g.lastActivityAt)}</td>
                  </tr>
                ))}
                {filteredGuests.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">
                      No hay huéspedes para mostrar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded border border-border bg-background p-3 space-y-3">
          <h2 className="font-semibold">Perfil básico del huésped</h2>
          {!selectedGuest ? (
            <div className="text-sm text-muted-foreground">Seleccioná un guest para ver detalle.</div>
          ) : (
            <>
              <div>
                <div className="text-base font-semibold">
                  {getGuestDisplayName({
                    guestId: selectedGuest.guestId,
                    name: selectedGuest.name,
                    aliases: selectedGuest.aliases,
                    channel: selectedGuest.channels[0] || null,
                  })}
                </div>
                <div className="font-mono text-xs text-muted-foreground">
                  guestId: {compactGuestId(selectedGuest.guestId)}
                </div>
              </div>
              <div className="text-sm">
                <div><span className="font-semibold">Guest ID:</span> <span className="font-mono">{selectedGuest.guestId}</span></div>
                <div><span className="font-semibold">Nombre:</span> {selectedGuest.name || "-"}</div>
                <div><span className="font-semibold">Mode:</span> {selectedGuest.mode || "-"}</div>
                <div><span className="font-semibold">Aliases:</span> {selectedGuest.aliases.length ? selectedGuest.aliases.join(", ") : "-"}</div>
                <div><span className="font-semibold">Canales:</span> {selectedGuest.channels.length ? selectedGuest.channels.join(", ") : "-"}</div>
                <div><span className="font-semibold">Conversations:</span> {selectedGuest.conversationCount}</div>
                <div><span className="font-semibold">Last activity:</span> {fmtDate(selectedGuest.lastActivityAt)}</div>
                <div><span className="font-semibold">Created at:</span> {fmtDate(selectedGuest.createdAt)}</div>
                <div><span className="font-semibold">Updated at:</span> {fmtDate(selectedGuest.updatedAt)}</div>
              </div>

              <div className="rounded border border-border p-2">
                <h3 className="text-sm font-semibold mb-2">Conversations asociadas</h3>
                {conversations.length === 0 ? (
                  <div className="text-xs text-muted-foreground">Sin conversaciones asociadas.</div>
                ) : (
                  <div className="max-h-40 overflow-auto space-y-1">
                    {conversations.map((c) => (
                      <div key={c.conversationId} className="text-xs rounded bg-muted px-2 py-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-mono">{c.conversationId}</span>
                          <Link
                            href={`/admin/inbox?guestId=${encodeURIComponent(selectedGuestId)}&conversationId=${encodeURIComponent(c.conversationId)}`}
                            className="shrink-0 rounded border border-border bg-background px-2 py-0.5 text-[11px] font-medium hover:bg-background/80"
                          >
                            Abrir en Inbox
                          </Link>
                        </div>
                        <div>{c.channel || "-"} · {c.status || "-"} · {fmtDate(c.lastUpdatedAt || null)}</div>
                        <div className="text-muted-foreground">{c.subject || "Sin asunto"}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div
                id="guest-merge-panel"
                className="rounded border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-2"
              >
                <h3 className="text-sm font-semibold mb-2">Merge manual de identidad</h3>
                <p className="text-xs mb-2">
                  Seleccioná un guest secundario para consolidar aliases y actividad en el guest principal actual.
                </p>
                <div className="flex items-center gap-2">
                  <select
                    value={mergeSecondaryGuestId}
                    onChange={(e) => setMergeSecondaryGuestId(e.target.value)}
                    className="flex-1 rounded border border-border px-2 py-1 text-sm bg-background"
                  >
                    <option value="">Seleccionar secondary guest...</option>
                    {mergeCandidates.map((g) => (
                      <option key={g.guestId} value={g.guestId}>
                        {getGuestDisplayName({
                          guestId: g.guestId,
                          name: g.name,
                          aliases: g.aliases,
                          channel: g.channels[0] || null,
                        })} ({compactGuestId(g.guestId)})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleMerge}
                    disabled={busy || !mergeSecondaryGuestId}
                    type="button"
                    className="rounded bg-amber-700 text-white px-3 py-1 text-sm disabled:opacity-50"
                  >
                    Merge
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
