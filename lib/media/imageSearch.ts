export type ImageResult = { url: string; alt?: string; source?: string };

export interface ImageSearchProvider {
  searchImages(query: string, opts?: { count?: number }): Promise<ImageResult[]>;
}

export class NoopImageSearchProvider implements ImageSearchProvider {
  async searchImages(): Promise<ImageResult[]> {
    return [];
  }
}

class BingImageSearchProvider implements ImageSearchProvider {
  private endpoint: string;
  private apiKey: string;

  constructor(endpoint: string, apiKey: string) {
    this.endpoint = endpoint.replace(/\/+$/, "");
    this.apiKey = apiKey;
  }

  async searchImages(query: string, opts?: { count?: number }): Promise<ImageResult[]> {
    const count = Math.max(1, Math.min(opts?.count ?? 4, 10));
    const url = `${this.endpoint}/images/search?q=${encodeURIComponent(query)}&count=${count}&safeSearch=Moderate`;
    try {
      const res = await fetch(url, {
        headers: {
          "Ocp-Apim-Subscription-Key": this.apiKey,
        },
      });
      if (!res.ok) return [];
      const data = (await res.json()) as { value?: Array<{ contentUrl?: string; name?: string }> };
      const items = Array.isArray(data.value) ? data.value : [];
      return items
        .map((it) => ({
          url: String(it.contentUrl || ""),
          alt: it.name || undefined,
          source: "bing",
        }))
        .filter((it) => /^https?:\/\//i.test(it.url));
    } catch {
      return [];
    }
  }
}

export function getImageSearchProvider(): ImageSearchProvider {
  const apiKey = process.env.BING_SEARCH_KEY;
  const endpoint = process.env.BING_SEARCH_ENDPOINT || "https://api.bing.microsoft.com/v7.0";
  if (!apiKey) return new NoopImageSearchProvider();
  return new BingImageSearchProvider(endpoint, apiKey);
}
