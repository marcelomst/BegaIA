// Path: /root/begasist/app/admin/hotels/[hotelId]/widget/page.tsx
import { headers } from "next/headers";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";

type Props = { params: { hotelId: string } };

// ⚠️ Server Component
export default async function WidgetSnippetPage({ params }: Props) {
  const hotelId = params.hotelId;

  // Config del hotel desde tu backend
  const hotelCfg = await getHotelConfig(hotelId).catch(() => null);
  const defaultLang = hotelCfg?.defaultLanguage || "es";

  // TS: BaseChannelConfig no expone position/theme en su tipo -> leemos como any
  const webCfg = ((hotelCfg as any)?.channelConfigs?.web ?? {}) as any;
  const position: "bottom-right" | "bottom-left" =
    (webCfg.position as any) || "bottom-right";
  const primary: string = webCfg?.theme?.primary || "#0ea5e9";
  const languages = ["es", "en", "pt"]; // ajustable si lo guardás en DB

  // Origen público (portal)
  // TS: en tu entorno, headers() está tipado como Promise<ReadonlyHeaders>, por eso await
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const portalOrigin = `${proto}://${host}`;

  // Backend que sirve /api y /widget
  const apiBase =
    process.env.NEXT_PUBLIC_WIDGET_ORIGIN ||
    process.env.NEXT_PUBLIC_APP_URL ||
    portalOrigin;

  // Snippet inline recomendado (config + carga del bundle)
  const INLINE_SNIPPET = [
    "<!-- Begasist Chat Widget -->",
    "<script>",
    "(function (w, d) {",
    `  var HOTEL_ID = ${JSON.stringify(hotelId)};`,
    `  var API_BASE = ${JSON.stringify(apiBase)};`,
    `  var LANG_DEFAULT = ${JSON.stringify(defaultLang)};`,
    `  var LANGUAGES = ${JSON.stringify(languages)};`,
    `  var POSITION = ${JSON.stringify(position)};`,
    `  var THEME_PRIMARY = ${JSON.stringify(primary)};`,
    "",
    "  w.BegasistChat = Object.assign({}, w.BegasistChat, {",
    "    hotelId: HOTEL_ID,",
    "    apiBase: API_BASE,",
    "    lang: LANG_DEFAULT,",
    "    languages: LANGUAGES,",
    "    position: POSITION,",
    "    theme: { primary: THEME_PRIMARY },",
    "    requireName: false",
    "  });",
    "",
    "  var s = d.createElement('script');",
    "  s.async = true;",
    "  s.src = (API_BASE || '').replace(/\\/+$/, '') + '/widget/begasist-chat.js';",
    "  d.head.appendChild(s);",
    "})(window, document);",
    "</script>",
  ].join("\n");

  // Variante “una sola etiqueta” (CSP-friendly)
  const oneTagUrl =
    `${apiBase.replace(/\/+$/, "")}/widget/embed` +
    `?hotel=${encodeURIComponent(hotelId)}` +
    `&apiBase=${encodeURIComponent(apiBase)}` +
    `&lang=${encodeURIComponent(defaultLang)}` +
    `&pos=${encodeURIComponent(position)}` +
    `&primary=${encodeURIComponent(primary)}` +
    `&langs=${encodeURIComponent(languages.join(","))}`;

  const ONE_TAG = `<script async src="${oneTagUrl}"></script>`;

  return (
    <main
      style={{
        maxWidth: 920,
        margin: "24px auto",
        padding: "0 16px",
        fontFamily: "ui-sans-serif, system-ui",
      }}
    >
      <h1 style={{ marginBottom: 8 }}>Generar snippet del widget (Web)</h1>
      <p style={{ marginTop: 0, color: "#556" }}>
        Hotel: <b>{hotelId}</b> &middot; API: <code>{apiBase}</code>
      </p>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ marginBottom: 8 }}>
          1) Snippet recomendado (pegar antes de <code>&lt;/body&gt;</code>)
        </h2>
        <p style={{ marginTop: 0 }}>Incluye configuración + carga del bundle.</p>
        <textarea
          id="ta-inline"
          readOnly
          value={INLINE_SNIPPET}
          style={{
            width: "100%",
            minHeight: 260,
            fontFamily: "monospace",
            fontSize: 13,
            padding: 12,
            borderRadius: 8,
            border: "1px solid #ccd",
          }}
        />
        <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
          {/* TS: sin onClick a funciones globales inexistentes */}
          <button id="copy-inline" style={btnStyle}>
            Copiar
          </button>
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ marginBottom: 8 }}>2) Una sola etiqueta (CSP friendly)</h2>
        <p style={{ marginTop: 0 }}>
          Evita inline JS. Carga <code>/widget/embed</code> que configura y luego
          inyecta el bundle.
        </p>
        <textarea
          id="ta-one"
          readOnly
          value={ONE_TAG}
          style={{
            width: "100%",
            minHeight: 84,
            fontFamily: "monospace",
            fontSize: 13,
            padding: 12,
            borderRadius: 8,
            border: "1px solid #ccd",
          }}
        />
        <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
          <button id="copy-one" style={btnStyle}>
            Copiar
          </button>
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ marginBottom: 8 }}>Pasos para el técnico del hotel</h2>
        <ol style={{ lineHeight: 1.7 }}>
          <li>
            Pegar el snippet en las páginas donde quieran ver el chat (antes de{" "}
            <code>&lt;/body&gt;</code>).
          </li>
          <li>
            Verificar CORS del backend para el dominio del hotel (POST{" "}
            <code>/api/chat</code> y GET <code>/api/web/events</code>).
          </li>
          <li>
            Abrir la página del hotel, ver el bubble, enviar “Hola” y confirmar
            respuesta.
          </li>
        </ol>
      </section>

      {/* Script de la propia página para copiar al portapapeles (evita onClick a símbolos no declarados) */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
          (function(){
            function doCopy(id){
              var el = document.getElementById(id);
              if(!el) return;
              el.select && el.select();
              el.setSelectionRange && el.setSelectionRange(0, 999999);
              (navigator.clipboard && navigator.clipboard.writeText)
                ? navigator.clipboard.writeText(el.value).then(function(){ alert('Copiado al portapapeles'); })
                : document.execCommand && document.execCommand('copy');
            }
            var b1 = document.getElementById('copy-inline');
            var b2 = document.getElementById('copy-one');
            b1 && b1.addEventListener('click', function(){ doCopy('ta-inline'); });
            b2 && b2.addEventListener('click', function(){ doCopy('ta-one'); });
          })();
        `,
        }}
      />
    </main>
  );
}

const btnStyle: React.CSSProperties = {
  background: "#0ea5e9",
  color: "#052b3a",
  border: "1px solid #0ea5e9",
  borderRadius: 8,
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: 700,
};
