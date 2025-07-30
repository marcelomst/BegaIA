// /app/page.tsx
import { Suspense } from "react";
import ChatPage from "@/components/admin/ChatPage";

export default function Page() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <ChatPage />
    </Suspense>
  );
}
