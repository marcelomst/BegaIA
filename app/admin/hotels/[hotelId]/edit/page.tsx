// Path: /root/begasist/app/admin/hotels/[hotelId]/edit/page.tsx
"use client";
import { useParams } from "next/navigation";
import EditHotelForm from "@/components/admin/EditHotelForm";

export default function EditHotelPage() {
  const params = useParams();
  const hotelId = params?.hotelId as string;
  if (!hotelId) return <div>No hotelId</div>;
  return <EditHotelForm hotelId={hotelId} showBackButton />;
}
