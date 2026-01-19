export type WebResult = { title: string; url: string; snippet?: string; source?: string };

export interface WebSearchProvider {
  searchWeb(query: string, opts?: { count?: number }): Promise<WebResult[]>;
}

export class NoopWebSearchProvider implements WebSearchProvider {
  async searchWeb(): Promise<WebResult[]> {
    return [];
  }
}

class BingWebSearchProvider implements WebSearchProvider {
  private endpoint: string;
  private apiKey: string;

  constructor(endpoint: string, apiKey: string) {
    this.endpoint = endpoint.replace(/\/+$/, "");
    this.apiKey = apiKey;
  }

  async searchWeb(query: string, opts?: { count?: number }): Promise<WebResult[]> {
    const count = Math.max(1, Math.min(opts?.count ?? 8, 10));
    const url = `${this.endpoint}/search?q=${encodeURIComponent(query)}&count=${count}`;
    try {
      const res = await fetch(url, {
        headers: {
          "Ocp-Apim-Subscription-Key": this.apiKey,
        },
      });
      if (!res.ok) return [];
      const data = (await res.json()) as {
        webPages?: { value?: Array<{ name?: string; url?: string; snippet?: string }> };
      };
      const items = data.webPages?.value ?? [];
      return items
        .map((it) => ({
          title: String(it.name || ""),
          url: String(it.url || ""),
          snippet: it.snippet || undefined,
          source: "bing",
        }))
        .filter((it) => it.title && /^https?:\/\//i.test(it.url));
    } catch {
      return [];
    }
  }
}

export function getWebSearchProvider(): WebSearchProvider {
  const apiKey = process.env.BING_SEARCH_KEY;
  const endpoint =
    process.env.BING_WEB_ENDPOINT ||
    process.env.BING_SEARCH_ENDPOINT ||
    "https://api.bing.microsoft.com/v7.0";
  if (!apiKey) return new NoopWebSearchProvider();
  return new BingWebSearchProvider(endpoint, apiKey);
}
