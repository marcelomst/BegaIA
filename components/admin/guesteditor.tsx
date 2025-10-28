import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import type { Guest, GuestMode } from "@/types/guest";
import { LoaderCircle, Edit2 } from "lucide-react";
import { fetchGuest, saveGuest } from "@/lib/api/guests";

// --- Edición de perfil guest ---
function GuestEditor({
  hotelId,
  guestId,
  onSaved,
}: {
  hotelId: string;
  guestId: string;
  onSaved?: () => void;
}) {
  const [profile, setProfile] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editing, setEditing] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);

  // Usá tu shortId como antes
  function shortId(id: string | null | undefined) {
    if (!id) return "";
    if (id.length <= 8) return id;
    return `${id.slice(0, 3)}...${id.slice(-3)}`;
  }

  useEffect(() => {
  fetchGuest(hotelId, guestId).then((g: any) => {
      if (!g) {
        setProfile(null);
        setNotFound(true);
      } else {
        setProfile(g);
        setEditName(g?.name || "");
        setNotFound(false);
      }
    });
  }, [hotelId, guestId]);

  // --- Render si no existe el perfil
  if (notFound)
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        Perfil no existe.
        <button
          className="text-xs text-blue-600 underline"
          onClick={async () => {
            await saveGuest(hotelId, guestId, { name: "", mode: "automatic" });
            setNotFound(false);
            // Recargamos el perfil recién creado
            const g = await fetchGuest(hotelId, guestId);
            setProfile(g);
            setEditName(g?.name || "");
            onSaved?.();
          }}
        >
          Crear perfil
        </button>
      </div>
    );

  if (!profile)
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle className="animate-spin w-4 h-4" />
        Cargando perfil...
      </div>
    );

  // --- Handler para cambiar el modo con Switch
  async function handleToggleMode(newMode: GuestMode) {
    setSaving(true);
    await saveGuest(hotelId, guestId, { mode: newMode });
    const g = await fetchGuest(hotelId, guestId);
    setProfile(g);
    setSaving(false);
    onSaved?.();
  }

  return editing ? (
    <div className="flex items-center gap-2">
      <input
        className="border p-1 rounded text-xs"
        value={editName}
        placeholder="Nombre del guest"
        onChange={(e) => setEditName(e.target.value)}
      />
      <button
        className="text-blue-600 text-xs"
        onClick={async () => {
          setSaving(true);
          await saveGuest(hotelId, guestId, {
            name: editName,
          });
          setEditing(false);
          setSaving(false);
          onSaved?.();
        }}
        disabled={saving}
      >
        Guardar
      </button>
      <button
        className="text-gray-500 text-xs"
        onClick={() => setEditing(false)}
      >
        Cancelar
      </button>
    </div>
  ) : (
    <div className="flex items-center gap-2 text-sm">
      <span className="font-semibold">
        {profile.name && profile.name.trim().length > 0
          ? profile.name
          : shortId(guestId)}
      </span>
      {/* Switch para el modo */}
      <div className="flex items-center gap-1">
        <Switch
          checked={profile.mode === "supervised"}
          onCheckedChange={(checked) =>
            handleToggleMode(checked ? "supervised" : "automatic")
          }
          disabled={saving}
        />
        <span
          className={
            "px-2 py-0.5 rounded text-xs font-semibold " +
            (profile.mode === "supervised"
              ? "bg-yellow-100 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-200"
              : "bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-200")
          }
        >
          {profile.mode === "supervised" ? "Supervisado" : "Automático"}
        </span>
      </div>
      <button
        className="text-xs text-blue-500 ml-2 flex items-center gap-1"
        onClick={() => setEditing(true)}
        title="Editar guest"
      >
        <Edit2 className="w-4 h-4" />
        Editar
      </button>
    </div>
  );
}
