// Path: /app/auth/verify-account/page.tsx
"use client";

import { Suspense } from "react";
import VerifyAccountClient from "./VerifyAccountClient";

export default function Page() {
  return (
    <Suspense fallback={<p className="text-center mt-20">Cargando...</p>}>
      <VerifyAccountClient />
    </Suspense>
  );
}
