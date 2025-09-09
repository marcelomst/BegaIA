// Path: /root/begasist/lib/agents/index.ts
import { AIMessage, BaseMessage } from "@langchain/core/messages";

type AgentGraph = {
  invoke(input: Record<string, any>): Promise<{
    messages: BaseMessage[];
    category?: string;
    reservationSlots?: Record<string, any>;
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
      const m: any = await import(p as any);
      const candidate: AgentGraph | undefined =
        m?.agentGraph ?? m?.default ??
        (typeof m?.createAgentGraph === "function" ? m.createAgentGraph() : undefined);
      if (candidate) {
        _graph = candidate;
        _version = m?.GRAPH_VERSION || `ag-runtime:${p.replace("./", "")}`;
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
    const mod: any = await import(pathComp as any);
    const candidate: AgentGraph | undefined = mod?.agentGraph;
    if (candidate) {
      _graph = candidate;
      _version = mod?.GRAPH_VERSION || "ag-compiled";
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
    async invoke(input) {
      const messages = Array.isArray(input?.messages) ? input.messages : [];
      return {
        ...input,
        messages: [
          ...messages,
          new AIMessage("¿En qué puedo ayudarte? Nuestro equipo está disponible para asistirte."),
        ],
        category: input?.category ?? "other",
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
export const GraphState = { State: {} as any };

// reexport útil
export { AIMessage };
