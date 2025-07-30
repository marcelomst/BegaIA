// Path: /root/begasist/lib/utils/shortGuestId.ts

// Detecta número uruguayo (ajusta según tu contexto de países)
function formatUruguayMobile(num: string) {
  // Elimina todo lo que no sea dígito
  num = num.replace(/\D/g, "");
  // Solo aplica si es 11 dígitos y empieza con 598
  if (num.length === 11 && num.startsWith("598")) {
    // 598 91 359375 (ejemplo)
    return `${num.slice(0, 3)} ${num.slice(3, 5)} ${num.slice(5)}`;
  }
  return num;
}

export function shortGuestId(id: string | null | undefined, channel: string) {
  if (!id) return "";
  // WhatsApp/mobile: mostrar número formateado completo
  if (channel === "whatsapp") {
    // Elimina sufijos tipo "@c.us"
    const num = id.replace(/[@:].*$/, "");
    return formatUruguayMobile(num);
  }
  // Canal web: abrevía hash largo
  if (channel === "web") {
    return id.length > 8 ? `${id.slice(0, 3)}...${id.slice(-3)}` : id;
  }
  // Email: muestra usuario acortado + dominio
  if (channel === "email") {
    const [user, domain] = id.split("@");
    if (!user || !domain) return id;
    return user.length > 3 ? `${user.slice(0, 3)}...@${domain}` : id;
  }
  // Otros canales: igual que web
  return id.length > 8 ? `${id.slice(0, 3)}...${id.slice(-3)}` : id;
}
