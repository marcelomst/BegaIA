// Path: /root/begasist/lib/utils/getChannelIcon.tsx

import Image from "next/image";
import type { Channel } from "@/types/channel";

// Devuelve un componente <Image> para el icono del canal, con fallback
export function getChannelIcon(channel: Channel | string, size = 20) {
  // Asegura que el nombre es seguro (lowercase)
  const iconFile = `/icons/${channel?.toLowerCase() || "unknown"}.svg`;
  return (
    <Image
      src={iconFile}
      alt={channel}
      width={size}
      height={size}
      style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }}
      onError={(e: any) => { e.currentTarget.src = "/icons/unknown.svg"; }}
    />
  );
}
