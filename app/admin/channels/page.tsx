// Path: /root/begasist/app/admin/channels/page.tsx
"use client";

import { useState } from "react";
import ChannelSidebar from "@/components/admin/ChannelSidebar";
import ChannelPanel from "@/components/admin/ChannelPanel";
import ChannelOverview from "@/components/admin/ChannelOverview";

export default function AdminChannelsPage() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <ChannelSidebar selected={selected || ""} onSelect={setSelected} />
      <main className="flex-1 flex flex-col">
        <div className="flex-1">
          {!selected && <ChannelOverview hotelId="yourHotelIdHere" />}
          {selected && <ChannelPanel channel={selected} />}
        </div>
      </main>
    </div>
  );
}
