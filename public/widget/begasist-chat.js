// Path: /root/begasist/public/widget/begasist-chat.js
(() => {
  const cfg = (window.BegasistChat ||= {});
  const primary = (cfg.theme && cfg.theme.primary) || "#0ea5e9";
  const pos = (cfg.position || "bottom-right").toLowerCase();
  const side = pos.includes("left") ? "left" : "right";
  const api = (cfg.apiBase || "").replace(/\/+$/, "");
  const hotelId = cfg.hotelId || "hotel-demo";

  // 🌐 idiomas soportados
  const SUPPORTED = ["es", "en", "pt"];
  const uiLangs = Array.isArray(cfg.languages) && cfg.languages.length
    ? cfg.languages.map(normLang).filter((l) => SUPPORTED.includes(l))
    : SUPPORTED.slice();

  // i18n por defecto del widget (claves mínimas que usamos en la UI)
  const I18N = {
    es: { assistant: "Asistente", placeholder: "Escribí tu mensaje...", send: "Enviar", ariaOpen: "Abrir chat", ariaClose: "Cerrar", statusOpen: "abierto" },
    en: { assistant: "Assistant", placeholder: "Type your message...", send: "Send", ariaOpen: "Open chat", ariaClose: "Close", statusOpen: "open" },
    pt: { assistant: "Assistente", placeholder: "Escreva sua mensagem...", send: "Enviar", ariaOpen: "Abrir chat", ariaClose: "Fechar", statusOpen: "aberto" },
  };

  // Diccionarios/Traductor externos opcionales provistos por tu app
  // - dict: { es: {assistant:"..."}, en:{...}, pt:{...} }
  // - t: (key, lang) => string
  const externalDicts = (cfg.dict && typeof cfg.dict === "object") ? cfg.dict : (cfg.i18n && typeof cfg.i18n === "object" ? cfg.i18n : null);
  const externalT = typeof cfg.t === "function" ? cfg.t : null;

  function normLang(l) {
    return String(l || "").toLowerCase().replace("_", "-").slice(0, 2);
  }

  // Idioma inicial: localStorage > config.lang > navegador > "es"
  const langKey = `begasist:lang:${hotelId}`;
  const storedLang = normLang(localStorage.getItem(langKey));
  const cfgLang = normLang(cfg.lang || "");
  const navLang = normLang(typeof navigator !== "undefined" ? navigator.language : "es");
  let currentLang =
    (storedLang && SUPPORTED.includes(storedLang) && storedLang) ||
    (cfgLang && SUPPORTED.includes(cfgLang) && cfgLang) ||
    (SUPPORTED.includes(navLang) ? navLang : "es");
  localStorage.setItem(langKey, currentLang);

  // Traductor de la UI
  const t = (key) => {
    try {
      if (externalT) {
        const v = externalT(key, currentLang);
        if (typeof v === "string" && v) return v;
      }
      const ext = externalDicts?.[currentLang]?.[key];
      if (typeof ext === "string" && ext) return ext;
    } catch {}
    return (I18N[currentLang] || I18N.es)[key] || key;
  };

  // 🔐 conversación persistente
  const lsConvKey = `begasist:conversationId:${hotelId}`;
  const getConv = () => localStorage.getItem(lsConvKey);
  const setConv = (id) => localStorage.setItem(lsConvKey, id);

  if (!api) console.warn("[BegasistChat] Falta apiBase en window.BegasistChat");

  // --- estilos
  const style = document.createElement("style");
  style.textContent = `
  .bgst-bubble{position:fixed;${side}:18px;bottom:18px;border-radius:999px;border:0;
    background:${primary};color:#03131d;font-weight:800;width:56px;height:56px;
    box-shadow:0 10px 30px ${primary}55;display:grid;place-items:center;cursor:pointer;z-index:999999}
  .bgst-panel{position:fixed;${side}:18px;bottom:86px;width:min(360px,92vw);
    max-height:70vh;background:#0b1220;color:#e5eef9;border:1px solid #263650;border-radius:16px;
    box-shadow:0 10px 40px #0008;display:none;flex-direction:column;overflow:hidden;z-index:999999}
  .bgst-header{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;background:#0c1428;border-bottom:1px solid #263650}
  .bgst-title{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .bgst-header-right{display:flex;align-items:center;gap:8px}
  .bgst-lang{appearance:none;background:#0b1220;border:1px solid #263650;color:#e5eef9;border-radius:8px;padding:6px 8px;font-size:12px;cursor:pointer}
  .bgst-close{background:transparent;border:0;color:#9fb3c8;cursor:pointer;font-size:18px}
  .bgst-msgs{padding:10px;display:flex;flex-direction:column;gap:8px;overflow:auto}
  .bgst-row{max-width:80%;padding:8px 10px;border-radius:12px}
  .bgst-user{align-self:flex-end;background:#cfe8ff;color:#043a63}
  .bgst-ai{align-self:flex-start;background:#e5e7eb;color:#111827}
  .bgst-input{border-top:1px solid #263650;display:flex;gap:8px;padding:8px;background:#0c1428}
  .bgst-input textarea{flex:1;resize:none;height:64px;background:#0b1220;color:#e5eef9;border:1px solid #263650;border-radius:8px;padding:8px;outline:none}
  .bgst-input button{background:${primary};border:0;color:#03131d;font-weight:700;padding:8px 12px;border-radius:10px;cursor:pointer}
  .bgst-input button:disabled{opacity:.6;cursor:not-allowed}
  `;
  document.head.appendChild(style);

  // --- UI
  const bubble = document.createElement("button");
  bubble.className = "bgst-bubble";
  bubble.setAttribute("aria-label", t("ariaOpen"));
  bubble.setAttribute("aria-expanded", "false");
  bubble.setAttribute("aria-controls", "bgst-panel");
  bubble.innerHTML = "💬";

  const panel = document.createElement("div");
  panel.className = "bgst-panel";
  panel.id = "bgst-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "false");
  panel.setAttribute("aria-label", `${t("assistant")} • ${hotelId}`);

  const langSelect = document.createElement("select");
  langSelect.className = "bgst-lang";
  langSelect.setAttribute("aria-label", "Seleccionar idioma / Select language");
  for (const code of uiLangs) {
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = code.toUpperCase();
    if (code === currentLang) opt.selected = true;
    langSelect.appendChild(opt);
  }

  panel.innerHTML = `
    <div class="bgst-header">
      <div class="bgst-title" id="bgst-title">${t("assistant")} • ${hotelId}</div>
      <div class="bgst-header-right">
        <!-- select de idioma se inserta aquí -->
        <button class="bgst-close" aria-label="${t("ariaClose")}">✕</button>
      </div>
    </div>
    <div class="bgst-msgs" id="bgst-msgs" aria-live="polite"></div>
    <div class="bgst-input">
      <textarea id="bgst-input" placeholder="${t("placeholder")}"></textarea>
      <button id="bgst-send">${t("send")}</button>
    </div>
  `;

  document.body.appendChild(bubble);
  document.body.appendChild(panel);

  const headerRight = panel.querySelector(".bgst-header-right");
  headerRight.insertBefore(langSelect, headerRight.firstChild);

  const msgs = panel.querySelector("#bgst-msgs");
  const ta = panel.querySelector("#bgst-input");
  const btn = panel.querySelector("#bgst-send");
  const btnClose = panel.querySelector(".bgst-close");
  const titleEl = panel.querySelector("#bgst-title");

  const applyLangToUI = () => {
    document.documentElement.lang = currentLang;
    bubble.setAttribute("aria-label", t("ariaOpen"));
    btnClose.setAttribute("aria-label", t("ariaClose"));
    titleEl.textContent = `${t("assistant")} • ${hotelId}`;
    ta.placeholder = t("placeholder");
    btn.textContent = t("send");
  };
  applyLangToUI();

  langSelect.addEventListener("change", () => {
    const newLang = normLang(langSelect.value);
    if (!SUPPORTED.includes(newLang)) return;
    currentLang = newLang;
    localStorage.setItem(langKey, currentLang);
    applyLangToUI();
    appendMsg("ai", `${t("assistant")} (${t("statusOpen")})`);
  });

  const appendMsg = (role, text) => {
    if (!text) return;
    const row = document.createElement("div");
    row.className = `bgst-row ${role === "user" ? "bgst-user" : "bgst-ai"}`;
    row.textContent = text;
    msgs.appendChild(row);
    msgs.scrollTop = msgs.scrollHeight;
  };

  // --- SSE
  let es = null;
  let esConvId = null;
  const openSSE = (conversationId) => {
    try {
      if (!window.EventSource) return;
      if (es) { try { es.close(); } catch {} es = null; }
      esConvId = conversationId;
      const url = `${api}/api/web/events?conversationId=${encodeURIComponent(conversationId)}`;
      es = new EventSource(url, { withCredentials: false });
      es.onopen = () => console.log("[BegasistChat] SSE abierto:", url);
      es.onerror = (e) => console.warn("[BegasistChat] SSE error:", e);
      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          const text = data.response || data.delta || data.text || "";
          if (text) appendMsg("ai", text);
        } catch { if (ev.data) appendMsg("ai", ev.data); }
      };
    } catch (e) {
      console.warn("[BegasistChat] SSE no disponible:", e);
    }
  };

  const prev = getConv();
  if (prev) openSSE(prev);

  const toggle = () => {
    const isOpen = panel.style.display === "flex";
    if (isOpen) {
      panel.style.display = "none";
      bubble.setAttribute("aria-expanded", "false");
    } else {
      panel.style.display = "flex";
      bubble.setAttribute("aria-expanded", "true");
      ta.focus();
    }
  };
  bubble.addEventListener("click", toggle);
  btnClose.addEventListener("click", toggle);

  const send = async () => {
    const text = (ta.value || "").trim();
    if (!text) return;
    ta.value = "";
    btn.disabled = true;
    appendMsg("user", text);

    // Asegurar conversationId y SSE antes del POST
    let conv = getConv();
    if (!conv) {
      conv = (typeof crypto !== "undefined" && crypto.randomUUID)
        ? crypto.randomUUID() : String(Date.now());
      setConv(conv);
      openSSE(conv);
    } else if (esConvId !== conv) {
      openSSE(conv);
    }

    const payload = {
      query: text,
      channel: "web",
      hotelId,
      conversationId: conv,
      lang: currentLang,        // ← idioma preferido del usuario
    };

    try {
      const res = await fetch(`${api}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const raw = await res.text();
      let data = {};
      try { data = JSON.parse(raw); } catch {}

      if (data.conversationId && data.conversationId !== getConv()) {
        setConv(data.conversationId);
        openSSE(data.conversationId);
      }

      // Fallback si no hay adapter web
      if (data && data.response) {
        appendMsg("ai", typeof data.response === "string" ? data.response : JSON.stringify(data.response));
      } else if (!res.ok) {
        appendMsg("ai", "⚠️ Error del servidor o ruta no disponible.");
      }
    } catch (err) {
      appendMsg("ai", "⚠️ No se pudo conectar con el servidor.");
      console.warn("[BegasistChat] error:", err);
    } finally {
      btn.disabled = false;
      ta.focus();
    }
  };

  const onEnterSend = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };
  document.documentElement.lang = currentLang;
  btn.addEventListener("click", send);
  ta.addEventListener("keydown", onEnterSend);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panel.style.display === "flex") toggle();
  });

  console.log("[BegasistChat] listo •", { hotelId, apiBase: api, lang: currentLang, position: pos });
})();
