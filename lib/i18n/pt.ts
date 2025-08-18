// Path: /lib/i18n/pt.ts
export default {
    hotelEdit: {
      title: "Editar hotel",
      country: "País",
      city: "Cidade",
      name: "Nome",
      address: "Endereço",
      postalCode: "Código postal",
      phone: "Telefone",
      timezone: "Fuso horário",
      defaultLanguage: "Idioma",
      channels: "Canais",
      whatsapp: "WhatsApp",
      webChannel: "Web",
      email: "Email",
      celNumber: "Número de celular",
      dirEmail: "Endereço de email",
      enabled: "Habilitado",
      automatic: "Automático",
      supervised: "Supervisionado",
      saving: "Salvando...",
      save: "Salvar alterações",
      cancel: "Cancelar",
      errors: {
        saveHotel: "Erro ao salvar hotel",
        unknown: "Erro desconhecido",
      },
    },
  layout: {
    checkingSession: "Verificando sessão...",
    panelTitle: "Painel de Controle",
    home: "Início",
    hotels: "Hotéis",
    upload: "Carregar Dados",
    channels: "Canais",
    users: "Usuários",
    usersManage: "Administração",
    development: "Desenvolvimento",
    prompts: "Prompts Curados",
    embeddings: "Embeddings",
    logs: "Logs e Debug",
    changePassword: "Alterar senha",
    hideSidebar: "Ocultar menu lateral",
    showSidebar: "Mostrar menu lateral",
    myHotelEdit: "Editar hotel",
  },
  form: {
    email: "Email",
    name: "Nome",
    position: "Cargo",
    role: "Função",
    roleSuperuser: "🛡️ Superusuário técnico (0)",
    roleAdmin: "🧑‍💻 Administrador (10)",
    roleManager: "👔 Técnico/Gerente (15)",
    roleReceptionist: "👩‍💼 Recepcionista / Administrativo (20)",
    submit: "Criar usuário",
    saving: "Criando...",
    cancel: "Cancelar",
    success: "Usuário criado com sucesso! Email de ativação enviado.",
    error: "Ocorreu um erro. Verifique os campos.",
    errorHotel: "Hotel não identificado.",
    errorEmail: "Formato de email inválido.",
    errorName: "Nome é obrigatório.",
    errorPosition: "Cargo é obrigatório.",
    errorRole: "Selecione uma função para o usuário.",
  },
  sidebar: {
    channelsPanel: "Canais",
    hideChannels: "Ocultar canais",
    showChannels: "Mostrar canais",
    web: "Web",
    whatsapp: "WhatsApp",
    email: "Email",
    channelManager: "Channel Manager",
    telegram: "Telegram",
    instagram: "Instagram",
    tiktok: "TikTok",
    x: "X (Twitter)",
    facebook: "Facebook",
    overview: "Visão geral",
    unknown: "Desconhecido",
  },
  tooltips: {
    createUser: "Cadastre novos usuários aqui.",
    email: "Informe um email válido. Usado para login e notificações.",
    name: "Nome completo do usuário.",
    position: "Exemplo: Recepcionista, Gerente, Contador, etc.",
    role: "Define permissões: Recepcionista, Técnico, Administrador, etc.",
  },
  chat: {
    title: "💬 Chat com IA",
    myConversations: "Minhas conversas",
    noPreviousChats: "Nenhuma conversa anterior.",
    placeholder: "Digite sua pergunta...",
    ask: "Perguntar",
    thinking: "Pensando...",
    newConversation: "Nova conversa",
    languageLabel: "Idioma:",
    lang_es: "Espanhol",
    lang_en: "Inglês",
    lang_pt: "Português",
    pendingResponse: "🕓 Sua solicitação foi enviada. Um recepcionista está revisando sua pergunta...",
    noSubject: "Sem assunto",
    subjectLabel: "Assunto:",
  },
  errors: {
    serverError: "⚠️ Erro no servidor ou rota inexistente. Verifique o backend.",
    generic: "Erro ao obter resposta.",
  },
  admin: {
    title: "Painel de Controle",
    loadingUser: "Carregando usuário...",
    notAuthenticated: "Não autenticado",
    userLabel: "Usuário",
    hotelLabel: "Hotel",
    roleLabel: "Função",
    channelStatusTitle: "Status dos canais",
    online: "Online",
    offline: "Offline",
    todayMessages: "Mensagens hoje",
    pending: "Pendentes",
    modes: {
      automatic: "Automático",
      supervised: "Supervisionado",
    },
    channels: {
      web: "Web",
      email: "Email",
      whatsapp: "WhatsApp",
      channelManager: "Channel Manager",
    },
    activeUsersTitle: "Usuários ativos",
    roles: {
      admin: "Administrador",
      receptionist: "Recepcionista",
    },
    lastLoginLabel: "Último acesso",
    today: "hoje",
    yesterday: "ontem",
    recentLogsTitle: "Logs recentes",
    logs: {
      "log.whatsappConnected": "Canal WhatsApp conectado com sucesso.",
      "log.webApproved": "Recepcionista aprovou resposta ao usuário Web.",
      "log.emailDiscarded": "Mensagem de Email sem remetente descartada.",
    }
  },
  channelOverview: {
    title: "Visão geral dos canais",
    loading: "Carregando estado dos canais...",
    qrReady: "QR pronto",
    scanQr: "Escaneie este QR no WhatsApp Web:",
    status: {
      active: "Ativo",
      disabled: "Desativado",
      supervised: "Supervisionado",
      automatic: "Automático",
      connected: "Conectado",
      developing: "Em desenvolvimento",
      waitingQr: "Aguardando QR",
      disconnected: "Desconectado",
      notConfigured: "Não configurado",
      unknown: "Desconhecido",
    },
  },
  classifierPrompt: `
    Dada a seguinte consulta do usuário, responda apenas com um JSON válido contendo dois campos:
    - "category": um dos seguintes: {{allowedCategories}}
    - "promptKey": se a categoria exigir um prompt curado específico, escolha um de: [{{allPromptKeys}}]; caso contrário, defina como null.

    Exemplo de resposta:
    {
      "category": "retrieval_based",
      "promptKey": "room_info"
    }
    Consulta:
    "{{question}}"
    `.trim(),
  sentimentPrompt: `Analise o sentimento da seguinte mensagem de um hóspede de hotel. Responda com APENAS UMA PALAVRA: "positive", "neutral" ou "negative".

    Mensagem:
    """
    {{text}}
    """`,
  
  reservation: {
    slotFillingPrompt: (missing: string[]) =>
      `Para seguir com a reserva preciso: **${missing.join(", ")}**. Pode me informar?`,
    valueNudge: (s: any) => {
      const parts: string[] = [];
      if (s?.roomType) parts.push(`**${cap(s.roomType)}** com ótimo custo-benefício`);
      if (s?.checkIn && s?.checkOut) parts.push(`datas **${s.checkIn} → ${s.checkOut}**`);
      if (s?.numGuests) parts.push(`${s.numGuests} hóspede(s)`);
      const core = parts.length
        ? `Tenho disponibilidade para ${parts.join(", ")}.`
        : `Posso oferecer ótima disponibilidade agora.`;
      return `${core} Quer que eu **confirme agora** para garantir a tarifa?`;
    },
    softClose: (s: any) => [
      `Perfeito, farei a reserva em nome de **${s.guestName ?? "o hóspede"}**.`,
      `Quarto: **${cap(s.roomType)}**.`,
      `Datas: **${s.checkIn} → ${s.checkOut}**${s.numGuests ? ` · Hóspedes: **${s.numGuests}**` : ""}.`,
      `Confirmo agora?`,
    ].join("\n"),
    noAvailability: (s: any) =>
      `Não há disponibilidade em **${cap(s.roomType)}** para **${s.checkIn} → ${s.checkOut}**.`,
    alternativesSameDates: (summary: string) =>
      `Opções em outras categorias nessas datas:\n${summary}`,
    alternativesMoveOneDay: (minusRange: string, minusSummary: string, plusRange: string, plusSummary: string) =>
      `Também posso mover **um dia**:\n• **${minusRange}**:\n${minusSummary}\n• **${plusRange}**:\n${plusSummary}`,
    askChooseAlternative: () =>
      `Quer que eu reserve alguma dessas opções ou prefira que eu procure outra combinação?`,
    confirmSuccess: (created: any, s: any) =>
      `✅ Reserva confirmada! Código **${created?.reservationId ?? "pendente"}**.\n` +
      `Quarto **${cap(s.roomType)}**, ` +
      `Datas **${s.checkIn} → ${s.checkOut}**` +
      (s.numGuests ? ` · **${s.numGuests}** hóspede(s)` : "") +
      `. Obrigado, ${s.guestName}!`,
  },
};

function cap(str?: string) {
  if (!str) return str as any;
  return str.charAt(0).toUpperCase() + str.slice(1);
}