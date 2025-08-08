
// Path: /lib/i18n/en.ts
export default {
  hotelEdit: {
    title: "Edit hotel",
    country: "Country",
    city: "City",
    name: "Name",
    address: "Address",
    postalCode: "Postal Code",
    phone: "Phone",
    timezone: "Timezone",
    defaultLanguage: "Language",
    channels: "Channels",
    whatsapp: "WhatsApp",
    webChannel: "Web",
    email: "Email",
    celNumber: "Cell number",
    dirEmail: "Email address",
    enabled: "Enabled",
    automatic: "Automatic",
    supervised: "Supervised",
    saving: "Saving...",
    save: "Save changes",
    cancel: "Cancel",
    errors: {
      saveHotel: "Error saving hotel",
      unknown: "Unknown error",
    },
  },
  layout: {
    checkingSession: "Checking session...",
    panelTitle: "Control Panel",
    home: "Home",
    hotels: "Hotels",
    upload: "Data Upload",
    channels: "Channels",
    users: "Users",
    usersManage: "Management",
    development: "Development",
    prompts: "Curated Prompts",
    embeddings: "Embeddings",
    logs: "Logs & Debug",
    changePassword: "Change password",
    hideSidebar: "Hide sidebar",
    showSidebar: "Show sidebar",
    myHotelEdit: "Edit hotel",
  },
  form: {
    email: "Email",
    name: "Name",
    position: "Position",
    role: "Role",
    roleSuperuser: "🛡️ Superuser (0)",
    roleAdmin: "🧑‍💻 Admin (10)",
    roleManager: "👔 Technician/Manager (15)",
    roleReceptionist: "👩‍💼 Receptionist / Administrative (20)",
    submit: "Create user",
    saving: "Creating...",
    cancel: "Cancel",
    success: "User created successfully! Activation email sent.",
    error: "An error occurred. Check the fields.",
    errorHotel: "Hotel not identified.",
    errorEmail: "Invalid email format.",
    errorName: "Name is required.",
    errorPosition: "Position is required.",
    errorRole: "You must select a role for the user.",
  },
   sidebar: {
    channelsPanel: "Channels",
    hideChannels: "Hide channels",
    showChannels: "Show channels",
    web: "Web",
    whatsapp: "WhatsApp",
    email: "Email",
    channelManager: "Channel Manager",
    telegram: "Telegram",
    instagram: "Instagram",
    tiktok: "TikTok",
    x: "X (Twitter)",
    facebook: "Facebook",
    overview: "Overview",
    unknown: "Unknown",
  },
  tooltips: {
    createUser: "Add new users here.",
    email: "Enter a valid email. Used for login and notifications.",
    name: "Full name of the user.",
    position: "Example: Receptionist, Manager, Accountant, etc.",
    role: "Determines permissions: Receptionist, Technician, Admin, etc.",
  },
  chat: {
    title: "💬 Chat with AI",
    myConversations: "My conversations",
    noPreviousChats: "No previous chats.",
    placeholder: "Type your question...",
    ask: "Ask",
    thinking: "Thinking...",
    newConversation: "New conversation",
    languageLabel: "Language:",
    lang_es: "Spanish",
    lang_en: "English",
    lang_pt: "Portuguese",
    pendingResponse: "🕓 Your request has been sent. A staff member is reviewing your question...",
    noSubject: "No subject",
    subjectLabel: "Subject:",
  },
  errors: {
    serverError: "⚠️ Server error or route does not exist. Check the backend.",
    generic: "Error getting response.",
  },
  admin: {
    title: "Control Panel",
    loadingUser: "Loading user...",
    notAuthenticated: "Not authenticated",
    userLabel: "User",
    hotelLabel: "Hotel",
    roleLabel: "Role",
    channelStatusTitle: "Channel status",
    online: "Online",
    offline: "Offline",
    todayMessages: "Messages today",
    pending: "Pending",
    modes: {
      automatic: "Automatic",
      supervised: "Supervised",
    },
    channels: {
      web: "Web",
      email: "Email",
      whatsapp: "WhatsApp",
      channelManager: "Channel Manager",
    },
    activeUsersTitle: "Active users",
    roles: {
      admin: "Administrator",
      receptionist: "Receptionist",
    },
    lastLoginLabel: "Last login",
    today: "today",
    yesterday: "yesterday",
    recentLogsTitle: "Recent logs",
    logs: {
      "log.whatsappConnected": "WhatsApp channel connected successfully.",
      "log.webApproved": "Receptionist approved response to Web user.",
      "log.emailDiscarded": "Email message without sender discarded.",
    }
  },
  channelOverview: {
    title: "Channel Overview",
    loading: "Loading channel states...",
    qrReady: "QR ready",
    scanQr: "Scan this QR from WhatsApp Web:",
    status: {
      active: "Active",
      disabled: "Disabled",
      supervised: "Supervised",
      automatic: "Automatic",
      connected: "Connected",
      developing: "In development",
      waitingQr: "Waiting for QR",
      disconnected: "Disconnected",
      notConfigured: "Not configured",
      unknown: "Unknown",
    },
  },
  classifierPrompt: `
    Given the following user query, reply only with a valid JSON containing two fields:
    - "category": one of the following: {{allowedCategories}}
    - "promptKey": if the category requires a specific curated prompt, pick one from: [{{allPromptKeys}}]; if not, set it to null.

    Sample response:
    {
      "category": "retrieval_based",
      "promptKey": "room_info"
    }
    Query:
    "{{question}}"
    `.trim(),
    sentimentPrompt: `Analyze the sentiment of the following hotel guest message. Reply with ONLY ONE WORD: "positive", "neutral" or "negative".
    Message:
    """
    {{text}}
    """`,
    reservation: {
      slotFillingPrompt: (missing: string[]) =>
        `Thank you for your interest! To proceed with your booking, could you please provide ${missing.join(", ")}?`,
      confirmation: (resId?: string) =>
        resId
          ? `Booking confirmed! Your reservation number is ${resId}.`
          : "Booking confirmed!",
      cancellation: (resId?: string) =>
        resId
          ? `Your reservation ${resId} has been successfully canceled.`
          : "Your reservation has been successfully canceled.",
      // ...other texts
    },
};

  