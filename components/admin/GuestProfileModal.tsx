"use client";
import React, { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import type { Guest, GuestMode } from "@/types/channel";
import { fetchGuest, saveGuest } from "@/utils/fetchGuest";

interface Props {
  open: boolean;
  hotelId: string;
  guestId: string;
  profile: Guest | null;
  onClose: () => void;
  onSaved: (profile: Guest) => void;
}

const GuestProfileModal: React.FC<Props> = ({
  open,
  hotelId,
  guestId,
  profile,
  onClose,
  onSaved,
}) => {
  const [editName, setEditName] = useState(profile?.name || "");
  const [editMode, setEditMode] = useState<GuestMode>(profile?.mode || "automatic");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEditName(profile?.name || "");
    setEditMode(profile?.mode || "automatic");
  }, [profile, guestId]);

  async function handleSave() {
    setSaving(true);
    await saveGuest(hotelId, guestId, { name: editName, mode: editMode });
    const updated = await fetchGuest(hotelId, guestId);
    if (updated) onSaved(updated);
    setSaving(false);
    onClose();
  }

  if (!open || !profile) return null;
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 min-w-[340px] max-w-lg relative">
        <button
          className="absolute top-2 right-2 text-gray-600 dark:text-gray-300"
          onClick={onClose}
        >
          ✖
        </button>
        <h3 className="font-bold mb-4 text-lg">Editar perfil del guest</h3>
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSave();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-medium mb-1">Nombre:</label>
            <input
              className="border p-2 rounded text-sm w-full"
              value={editName}
              placeholder="Nombre del guest"
              onChange={e => setEditName(e.target.value)}
              maxLength={32}
              disabled={saving}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={editMode === "supervised"}
              onCheckedChange={checked => setEditMode(checked ? "supervised" : "automatic")}
              disabled={saving}
            />
            <span className={
              "flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold " +
              (editMode === "supervised"
                ? "bg-yellow-100 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-200"
                : "bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-200")
            }>
              {editMode === "supervised"
                ? (<><span className="mr-1">🧍</span>Sup.</>)
                : (<><span className="mr-1">🧠</span>Aut.</>)
              }
            </span>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <button
              className="px-4 py-1 rounded bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition"
              type="submit"
              disabled={saving}
            >
              Guardar
            </button>
            <button
              className="px-4 py-1 rounded bg-gray-200 text-gray-700 text-sm"
              type="button"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GuestProfileModal;
