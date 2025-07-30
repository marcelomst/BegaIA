// Path: /root/begasist/app/admin/hotel/edit/page.tsx
"use client";
import { useCurrentUser } from "@/lib/context/UserContext";
import EditHotelForm from "@/components/admin/EditHotelForm";

export default function MyHotelEditPage() {
  const { user } = useCurrentUser();
  if (!user?.hotelId) return <div>No hotel</div>;
  return <EditHotelForm hotelId={user.hotelId} showBackButton />;
}
