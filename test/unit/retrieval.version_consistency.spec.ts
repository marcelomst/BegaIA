import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const mocks = vi.hoisted(() => ({
  getCassandraClientMock: vi.fn(),
  insertedTextDocs: [] as any[],
  insertedVectorDocs: [] as any[],
  registryDocs: [] as any[],
}));

vi.mock("@langchain/openai", () => ({
  OpenAIEmbeddings: class {
    async embedQuery() {
      return Array(5).fill(0.1);
    }
  },
}));

vi.mock("@/lib/astra/connection", () => ({
  getCassandraClient: mocks.getCassandraClientMock,
  getHotelAstraCollection: vi.fn(),
  getAstraDB: () => ({
    collection: (name: string) => {
      if (name === "hotel_text_collection") {
        return {
          insertOne: async (doc: any) => {
            mocks.insertedTextDocs.push(doc);
            return { insertedId: "text-1" };
          },
        };
      }
      if (name === "category_registry") {
        return {
          findOne: async (query: any) =>
            mocks.registryDocs.find((doc) => doc.categoryId === query.categoryId) ?? null,
          insertOne: async (doc: any) => {
            mocks.registryDocs.push(doc);
            return { insertedId: "registry-1" };
          },
        };
      }
      return {
        insertOne: async (doc: any) => {
          mocks.insertedVectorDocs.push(doc);
          return { insertedId: doc._id };
        },
        replaceOne: async (_filter: any, doc: any) => {
          mocks.insertedVectorDocs.push(doc);
          return { modifiedCount: 1 };
        },
      };
    },
  }),
}));

import { loadDocumentFileForHotel } from "@/lib/retrieval";

describe("retrieval version consistency", () => {
  let tmpDir = "";

  beforeEach(async () => {
    mocks.insertedTextDocs.length = 0;
    mocks.insertedVectorDocs.length = 0;
    mocks.registryDocs.length = 0;
    mocks.getCassandraClientMock.mockReset();
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-version-"));
  });

  afterEach(async () => {
    if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("vectoriza hotel_content existente con la misma versión fuente y metadata trazable", async () => {
    const filePath = path.join(tmpDir, "arrivals_transport.es.txt");
    await fs.writeFile(
      filePath,
      "Aeropuertos cercanos: MVD y PDP. Transfer privado, taxi y bus disponibles.",
      "utf8"
    );

    const result = await loadDocumentFileForHotel({
      hotelId: "hotel999",
      filePath,
      originalName: "arrivals_transport.es.txt",
      enforcedCategory: "retrieval_based",
      enforcedPromptKey: "arrivals_transport",
      targetLang: "es",
      versionOverride: "v4",
      metadata: {
        fromHotelContent: true,
        sourceVersion: "v4",
      },
    });

    expect(result.version).toBe("v4");
    expect(mocks.insertedTextDocs).toHaveLength(1);
    expect(mocks.insertedTextDocs[0]).toMatchObject({
      hotelId: "hotel999",
      originalName: "arrivals_transport.es.txt",
      version: "v4",
      targetLang: "es",
    });
    expect(mocks.insertedVectorDocs).toHaveLength(1);
    expect(mocks.insertedVectorDocs[0]).toMatchObject({
      hotelId: "hotel999",
      category: "retrieval_based",
      promptKey: "arrivals_transport",
      targetLang: "es",
      version: "v4",
      sourceVersion: "v4",
      vectorVersion: "v4",
      fromHotelContent: true,
    });
    expect(mocks.insertedVectorDocs[0].text).toContain("MVD");
    expect(mocks.insertedVectorDocs[0].text).toContain("PDP");
    expect(mocks.getCassandraClientMock).not.toHaveBeenCalled();
  });
});
