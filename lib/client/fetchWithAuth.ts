// /lib/client/fetchWithAuth.ts
export async function fetchWithAuth(
    input: RequestInfo | URL,
    init: RequestInit = {},
    retry = true
  ): Promise<Response> {
    const res = await fetch(input, init);
  
    if (res.status !== 401 || !retry) {
      return res;
    }
  
    // 🔁 Intentar renovar token usando refreshToken
    const refreshRes = await fetch("/api/refresh");
  
    if (refreshRes.ok) {
      // Reintentar la solicitud original (solo una vez)
      return fetchWithAuth(input, init, false);
    }
  
    // ❌ Si la renovación también falló → redirigir al login
    if (typeof window !== "undefined") {
      window.location.href = "/auth/login";
    }
  
    return res; // por si es usado en lógica que espera una Response
  }
  