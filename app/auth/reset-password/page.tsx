// Path: /root/begasist/app/auth/reset-password/page.tsx
"use client";
export const dynamic = "force-dynamic";

import { Suspense } from "react";
import  ResetPasswordForm  from "./ResetPasswordForm";

// ¡Así debe exportarse en Next 15+!
export default function Page() {
  return (
    <Suspense fallback={<p className="text-center mt-20">Cargando...</p>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
