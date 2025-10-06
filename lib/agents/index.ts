// Path: /root/begasist/lib/agents/index.ts
import { AIMessage, BaseMessage } from "@langchain/core/messages";

type AgentGraph = {
  invoke(input: Record<string, unknown>): Promise<{
    messages: BaseMessage[];
    category?: string;
    reservationSlots?: Record<string, unknown>;
  }>;
};

let _graph: AgentGraph | null = null;
let _version = "ag-loader";

let _providerLogged = false;
function logProviderOnce() {
  if (_providerLogged) return;
  _providerLogged = true;
  console.log("[agentGraph] provider", {
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    hasGroq: !!process.env.GROQ_API_KEY,
  });
}

async function loadGraph(): Promise<AgentGraph> {
  if (_graph) return _graph!; // <- non-null assertion

  // 1) Preferir módulos runtime (tu grafo real debería estar aquí)
  const candidates = ["./graph", "./stateGraph", "./agentGraph", "./builder"] as const;
  for (const p of candidates) {
    try {
      const mod = await import(p);
      const candidate = (() => {
        const m = mod as unknown as Record<string, unknown>;
        const ag = m["agentGraph"];
        if (isAgentGraph(ag)) return ag;
        const def = m["default"];
        if (isAgentGraph(def)) return def;
        const cg = m["createAgentGraph"];
        if (typeof cg === "function") {
          const built = (cg as () => unknown)();
          if (isAgentGraph(built)) return built;
        }
        return undefined;
      })();
      if (candidate) {
        _graph = candidate;
        const mrec = mod as unknown as Record<string, unknown>;
        _version = (typeof (mrec as Record<string, unknown>).GRAPH_VERSION === "string"
          ? (mrec as Record<string, string>).GRAPH_VERSION
          : undefined) || `ag-runtime:${p.replace("./", "")}`;
        console.log("[agentGraph] loaded:", _version);
        logProviderOnce();
        return candidate; // <- devolvemos el candidato (no _graph)
      }
    } catch {
      /* seguir probando */
    }
  }

  // 2) compiledGraph (opcional). Import no-literal para evitar warnings de Turbopack.
  try {
    const pathComp = "./" + "compiledGraph";
    const mod = await import(pathComp);
    const candidate = (() => {
      const m = mod as unknown as Record<string, unknown>;
      const ag = m["agentGraph"];
      return isAgentGraph(ag) ? (ag as AgentGraph) : undefined;
    })();
    if (candidate) {
      _graph = candidate;
      const mrec = mod as unknown as Record<string, unknown>;
      _version = (typeof (mrec as Record<string, unknown>).GRAPH_VERSION === "string"
        ? (mrec as Record<string, string>).GRAPH_VERSION
        : undefined) || "ag-compiled";
      console.log("[agentGraph] loaded:", _version);
      logProviderOnce();
      return candidate; // <- devolvemos el candidato
    }
  } catch {
    /* no hay build compilado en dev */
  }

  // 3) Fallback mínimo para no romper en dev
  console.warn("[agentGraph] ⚠️ No graph module found. Using minimal fallback.");
  const fallback: AgentGraph = {
    async invoke(input: Record<string, unknown>) {
      const rec = input as Record<string, unknown>;
      const prior = Array.isArray(rec.messages) ? (rec.messages as BaseMessage[]) : [];
      const category = typeof rec.category === "string" ? (rec.category as string) : "other";
      const reservationSlots =
        typeof rec.reservationSlots === "object" && rec.reservationSlots !== null
          ? (rec.reservationSlots as Record<string, unknown>)
          : undefined;

      return {
        messages: [
          ...prior,
          new AIMessage("¿En qué puedo ayudarte? Nuestro equipo está disponible para asistirte."),
        ],
        category,
        ...(reservationSlots ? { reservationSlots } : {}),
      };
    },
  };
  _graph = fallback;
  _version = "ag-fallback";
  logProviderOnce();
  return fallback;
}

// Wrapper público estable
export const agentGraph: AgentGraph = {
  async invoke(input) {
    const g = await loadGraph();
    return g.invoke(input);
  },
};

// utilitarios opcionales
export const GRAPH_VERSION = () => _version;

// Placeholder para compat de tipos (si otros módulos importan GraphState desde aquí)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const GraphState = { State: {} as any };

// reexport útil
export { AIMessage };

// type guard
function isAgentGraph(x: unknown): x is AgentGraph {
  if (typeof x !== "object" || x === null) return false;
  const rec = x as Record<string, unknown>;
  return typeof rec.invoke === "function";
}
