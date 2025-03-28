// lib/vector/MockVectorStore.ts
import { Document } from "@langchain/core/documents";

export class MockVectorStore {
  private docs: Document[];

  constructor(docs: Document[]) {
    this.docs = docs;
  }

  async similaritySearch(query: string, k: number = 3): Promise<Document[]> {
    return this.docs
      .filter((doc) =>
        doc.pageContent.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, k);
  }

  static async fromDocuments(docs: Document[]): Promise<MockVectorStore> {
    return new MockVectorStore(docs);
  }

  async addDocuments(docs: Document[]) {
    this.docs.push(...docs);
  }
}
