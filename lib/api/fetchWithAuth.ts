// /lib/api/fetchWithAuth.ts

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
    const token = localStorage.getItem("token");
  
    const headers = {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  
    let res = await fetch(url, {
      ...options,
      headers,
    });
  
    // Si el token expiró, intentamos refrescarlo una sola vez
    if (res.status === 401) {
      const refreshRes = await fetch("/api/refresh");
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        localStorage.setItem("token", data.token);
  
        // Reintentamos el request original con el nuevo token
        const retryHeaders = {
          ...headers,
          Authorization: `Bearer ${data.token}`,
        };
  
        res = await fetch(url, {
          ...options,
          headers: retryHeaders,
        });
      }
    }
  
    return res;
  }
  