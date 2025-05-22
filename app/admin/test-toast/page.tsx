// /app/admin/test-toast/page.tsx
"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function TestToastPage() {
  return (
    <div className="max-w-md mx-auto mt-10 text-center space-y-4">
      <h1 className="text-xl font-semibold">🚀 Prueba de Toast</h1>
      <Button
        onClick={() => toast.success("¡Este es un toast exitoso! 🎉")}
      >
        Mostrar Toast
      </Button>
    </div>
  );
}
