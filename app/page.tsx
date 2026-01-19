// /app/page.tsx
import { Suspense } from "react";
import ChatPage from "@/components/admin/ChatPage";
import { RoomTypeIcon } from "@/components/RoomTypeIcon";

export default function Page() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <div className="space-y-6">
        <section className="mx-auto w-full max-w-3xl rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">RoomTypeIcon demo</h2>
          <div className="mt-3 flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <RoomTypeIcon base="SINGLE" />
              <span className="text-sm text-slate-700">SINGLE</span>
            </div>
            <div className="flex items-center gap-2">
              <RoomTypeIcon base="DOUBLE" modifiers={["SUPERIOR"]} />
              <span className="text-sm text-slate-700">DOUBLE + SUPERIOR</span>
            </div>
            <div className="flex items-center gap-2">
              <RoomTypeIcon base="TWIN" modifiers={["DELUXE"]} />
              <span className="text-sm text-slate-700">TWIN + DELUXE</span>
            </div>
            <div className="flex items-center gap-2">
              <RoomTypeIcon base="TRIPLE" />
              <span className="text-sm text-slate-700">TRIPLE</span>
            </div>
            <div className="flex items-center gap-2">
              <RoomTypeIcon base="SUITE" modifiers={["VIP"]} />
              <span className="text-sm text-slate-700">SUITE + VIP</span>
            </div>
          </div>
        </section>

        <ChatPage />
      </div>
    </Suspense>
  );
}
