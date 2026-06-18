// Path: /root/begasist/lib/i18n/es.ts
import { formatGuestCountLabel } from "@/lib/agents/helpers";

const es = {
  reservation: {
    slotFillingPrompt: (missing: string[]) =>
      `Para avanzar con tu reserva necesito: **${missing.join(", ")}**. ¿Me lo compartís?`,
    valueNudge: (s: any) => {
      const parts: string[] = [];
      if (s?.roomType) parts.push(`**${capitalize(s.roomType)}** con excelente relación precio/calidad`);
      if (s?.checkIn && s?.checkOut) parts.push(`fechas **${s.checkIn} → ${s.checkOut}**`);
      if (s?.numGuests) parts.push(formatGuestCountLabel(s.numGuests, "es"));
      const core = parts.length
        ? `Tengo disponibilidad para ${parts.join(", ")}.`
        : `Puedo ofrecerte muy buena disponibilidad ahora.`;
      return `${core} ¿Querés que la deje **confirmada ahora** y aseguramos la tarifa?`;
    },
    softClose: (s: any) => [
      `Perfecto, haré la reserva a nombre de **${s.guestName ?? "el huésped"}**.`,
      `Habitación: **${capitalize(s.roomType)}**.`,
      `Fechas: **${s.checkIn} → ${s.checkOut}**${s.numGuests ? ` · Huéspedes: **${s.numGuests}**` : ""}.`,
      `¿Te confirmo ahora mismo?`,
    ].join("\n"),
    noAvailability: (s: any) =>
      `No tengo disponibilidad en **${capitalize(s.roomType)}** para **${s.checkIn} → ${s.checkOut}**.`,
    alternativesSameDates: (summary: string) =>
      `Opciones en otras categorías para esas fechas:\n${summary}`,
    alternativesMoveOneDay: (minusRange: string, minusSummary: string, plusRange: string, plusSummary: string) =>
      `También puedo mover **un día**:\n• **${minusRange}**:\n${minusSummary}\n• **${plusRange}**:\n${plusSummary}`,
    askChooseAlternative: () =>
      `¿Querés que reserve alguna de estas opciones o preferís que busque otra combinación?`,
    confirmSuccess: (created: any, s: any) =>
      `✅ ¡Reserva confirmada! Código **${created?.reservationId ?? "pendiente"}**.\n` +
      `Habitación **${capitalize(s.roomType)}**, ` +
      `Fechas **${s.checkIn} → ${s.checkOut}**` +
      (s.numGuests ? ` · **${formatGuestCountLabel(s.numGuests, "es")}**` : "") +
      `. ¡Gracias, ${(() => { const n = String(s.guestName || "").trim(); const p = n.split(/\s+/); return p[0] || n; })()}!`,
  },
  hotelEdit: {
    title: "Editar hotel",
    country: "País",
    city: "Ciudad",
    name: "Nombre",
    address: "Dirección",
    postalCode: "Código postal",
    phone: "Teléfono",
    timezone: "Zona horaria",
    defaultLanguage: "Idioma",
    channels: "Canales",
    whatsapp: "WhatsApp",
    webChannel: "Web",
    email: "Correo electrónico",
    celNumber: "Número de celular",
    dirEmail: "Dirección de email",
    enabled: "Habilitado",
    automatic: "Automático",
    supervised: "Supervisado",
    saving: "Guardando...",
    save: "Guardar cambios",
    cancel: "Cancelar",
    errors: {
      saveHotel: "Error al guardar hotel",
      unknown: "Error desconocido",
    },
  },
  layout: {
    checkingSession: "Verificando sesión...",
    panelTitle: "Panel de Control",
    home: "Inicio",
    hotels: "Hoteles",
    upload: "Carga de Datos",
    channels: "Canales",
    users: "Usuarios",
    usersManage: "Administración",
    development: "Desarrollo",
    prompts: "Prompts Curados",
    embeddings: "Embeddings",
    logs: "Logs y Debug",
    changePassword: "Cambiar contraseña",
    hideSidebar: "Ocultar menú lateral",
    showSidebar: "Mostrar menú lateral",
    myHotelEdit: "Editar hotel",
  },
  form: {
    email: "Correo electrónico",
    name: "Nombre",
    position: "Cargo",
    role: "Rol",
    roleSuperuser: "🛡️ Superusuario técnico (0)",
    roleAdmin: "🧑‍💻 Administrador (10)",
    roleManager: "👔 Técnico/Manager (15)",
    roleReceptionist: "👩‍💼 Recepcionista / Administrativo (20)",
    submit: "Crear usuario",
    saving: "Creando...",
    cancel: "Cancelar",
    success: "¡Usuario creado exitosamente! Se envió el email de activación.",
    error: "Ocurrió un error. Verifica los datos.",
    errorHotel: "Hotel no identificado.",
    errorEmail: "El email no tiene un formato válido.",
    errorName: "El nombre es obligatorio.",
    errorPosition: "El cargo es obligatorio.",
    errorRole: "Debes seleccionar un rol para el usuario.",
  },
  sidebar: {
    channelsPanel: "Canales",
    hideChannels: "Ocultar canales",
    showChannels: "Mostrar canales",
    web: "Web",
    whatsapp: "WhatsApp",
    email: "Email",
    channelManager: "Channel Manager",
    telegram: "Telegram",
    instagram: "Instagram",
    tiktok: "TikTok",
    x: "X (Twitter)",
    facebook: "Facebook",
    overview: "Visión general",
    unknown: "Desconocido",
  },
  tooltips: {
    createUser: "Desde aquí das de alta nuevos usuarios.",
    email: "Ingrese un correo válido. Será el usuario para login y notificaciones.",
    name: "Nombre y apellido completo del usuario.",
    position: "Ejemplo: Recepcionista, Gerente, Contable, etc.",
    role: "Determina los permisos: Recepcionista, Técnico, Administrador, etc.",
  },
  hotelEditDetails: {
    title: "Editar hotel",
    name: "Nombre del hotel",
    country: "País",
    city: "Ciudad",
    address: "Dirección",
    postalCode: "Código Postal",
    phone: "Teléfono",
    timezone: "Zona horaria",
    defaultLanguage: "Idioma por defecto",
    channels: "Canales",
    whatsapp: "WhatsApp",
    celNumber: "Número de WhatsApp",
    saving: "Guardando...",
    save: "Guardar cambios",
    cancel: "Cancelar",
    loading: "Cargando...",
    notFound: "No se encontró el hotel",
    success: "¡Hotel actualizado correctamente!",
    error: "Ocurrió un error",
    errors: {
      fetchHotel: "Error al obtener el hotel",
      saveHotel: "Error al guardar el hotel",
      unknown: "Error inesperado",
    },
  },
  chat: {
    title: "💬 Chat con IA",
    myConversations: "Mis conversaciones",
    noPreviousChats: "No hay chats previos.",
    placeholder: "Escribí tu pregunta...",
    ask: "Preguntar",
    thinking: "Pensando...",
    newConversation: "Nueva conversación",
    languageLabel: "Idioma:",
    lang_es: "Español",
    lang_en: "Inglés",
    lang_pt: "Portugués",
    pendingResponse: "🕓 Tu consulta fue enviada. Un recepcionista está revisando tu solicitud...",
    noSubject: "Sin asunto",
    subjectLabel: "Asunto:",
  },
  errors: {
    serverError: "⚠️ Error del servidor o la ruta no existe. Consulta el backend.",
    generic: "Error al obtener respuesta.",
  },
  admin: {
    title: "Panel de Control",
    loadingUser: "Cargando usuario...",
    notAuthenticated: "No autenticado",
    userLabel: "Usuario",
    hotelLabel: "Hotel",
    roleLabel: "Rol",
    channelStatusTitle: "Estado de canales",
    online: "Online",
    offline: "Offline",
    todayMessages: "Mensajes hoy",
    pending: "Pendientes",
    modes: {
      automatic: "Automático",
      supervised: "Supervisado",
    },
    channels: {
      web: "Web",
      email: "Email",
      whatsapp: "WhatsApp",
      channelManager: "Channel Manager",
    },
    activeUsersTitle: "Usuarios activos",
    roles: {
      admin: "Administrador",
      receptionist: "Recepcionista",
    },
    lastLoginLabel: "Último acceso",
    today: "hoy",
    yesterday: "ayer",
    recentLogsTitle: "Logs recientes",
    logs: {
      "log.whatsappConnected": "Canal WhatsApp conectado correctamente.",
      "log.webApproved": "Recepcionista aprobó respuesta a usuario Web.",
      "log.emailDiscarded": "Mensaje de Email sin remitente descartado.",
    },
  },
  channelOverview: {
    title: "Visión general de los canales",
    loading: "Cargando estado de canales...",
    qrReady: "QR listo",
    scanQr: "Escaneá este QR desde WhatsApp Web:",
    status: {
      active: "Activo",
      disabled: "Desactivado",
      supervised: "Supervisado",
      automatic: "Automático",
      connected: "Conectado",
      developing: "En desarrollo",
      waitingQr: "Esperando QR",
      disconnected: "Desconectado",
      notConfigured: "No configurado",
      unknown: "Desconocido",
    },
  },
  classifierPrompt: `
    Dada la siguiente consulta del usuario, responde solo con un JSON válido con dos campos:
    - "category": una de las siguientes: {{allowedCategories}}
    - "promptKey": si la categoría necesita un prompt curado especial, elige una de: [{{allPromptKeys}}]; si no, pon null.

    Ejemplo de respuesta:
    {
      "category": "retrieval_based",
      "promptKey": "room_info"
    }
    Consulta:
    "{{question}}"
    `.trim(),
  sentimentPrompt: `Analiza el sentimiento del siguiente mensaje de un huésped de hotel. Responde SOLO con una palabra: "positive", "neutral" o "negative".

    Mensaje:
    """
    {{text}}
    """`,
  // ...
};
function capitalize(str?: string) {
  if (!str) return str as any;
  return str.charAt(0).toUpperCase() + str.slice(1);
}
export default es;
