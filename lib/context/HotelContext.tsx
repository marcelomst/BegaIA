// Path: /lib/context/HotelContext.tsx
import { createContext, useContext } from "react";
import type { HotelConfig } from "@/types/channel";

export const HotelContext = createContext<{ hotel: HotelConfig | null }>({ hotel: null });

export function useCurrentHotel() {
  return useContext(HotelContext);
}
