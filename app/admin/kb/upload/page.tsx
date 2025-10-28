import KbUploadForm from "@/components/admin/KbUploadForm";

export default function AdminKbUploadPage() {
  // In a real app, hotelId/uploader would come from the session of the logged-in user.
  return (
    <div className="max-w-3xl mx-auto py-6">
      <h1 className="text-2xl font-bold mb-4">Conocimiento del Hotel · Cargar documento</h1>
      <KbUploadForm defaultHotelId="hotel999" defaultUploader="recepcion@hotel.com" />
    </div>
  );
}
