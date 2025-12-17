// RAG (Retrieval Augmented Generation) & Vector Embeddings
import type { Product } from "@/lib/types"
import { dataLayer } from "./data-layer"

export interface Document {
  id: string
  type: "product" | "policy" | "faq" | "style_guide"
  content: string
  metadata: Record<string, any>
  embedding?: number[]
}

export class RAGLayer {
  private documents: Map<string, Document> = new Map()
  private embeddings: Map<string, number[]> = new Map()

  constructor() {
    this.initializeRAGDocuments()
  }

  private initializeRAGDocuments() {
    // Index all products
    const products = dataLayer.getAllProducts()
    for (const product of products) {
      const doc: Document = {
        id: `product_${product.sku}`,
        type: "product",
        content: `${product.name} ${product.category} ${product.description} ${Object.values(product.attributes).join(" ")}`,
        metadata: {
          sku: product.sku,
          price: product.price,
          category: product.category,
        },
      }
      this.documents.set(doc.id, doc)
      // Simulated embedding
      this.embeddings.set(doc.id, this.generateEmbedding(doc.content))
    }

    // Add policy documents
    const policies: Document[] = [
      {
        id: "policy_returns",
        type: "policy",
        content: "Returns accepted within 30 days of purchase. Items must be unused and in original packaging.",
        metadata: { category: "returns" },
      },
      {
        id: "policy_shipping",
        type: "policy",
        content: "Free shipping on orders above Rs. 500. Standard delivery 3-5 business days.",
        metadata: { category: "shipping" },
      },
      {
        id: "policy_warranty",
        type: "policy",
        content: "All electronics come with 1-year manufacturer warranty covering manufacturing defects.",
        metadata: { category: "warranty" },
      },
    ]

    for (const policy of policies) {
      this.documents.set(policy.id, policy)
      this.embeddings.set(policy.id, this.generateEmbedding(policy.content))
    }

    // Add FAQs
    const faqs: Document[] = [
      {
        id: "faq_payment",
        type: "faq",
        content:
          "We accept all major credit cards, debit cards, UPI, and digital wallets. Payment is processed securely.",
        metadata: { question: "What payment methods do you accept?" },
      },
      {
        id: "faq_delivery",
        type: "faq",
        content: "You can track your order using the order ID sent via email. Real-time tracking available.",
        metadata: { question: "How can I track my order?" },
      },
    ]

    for (const faq of faqs) {
      this.documents.set(faq.id, faq)
      this.embeddings.set(faq.id, this.generateEmbedding(faq.content))
    }
  }

  private generateEmbedding(text: string): number[] {
    // Simulated embedding (in production, use OpenAI embeddings or similar)
    // Hash the text and create a 384-dimensional vector
    const hash = this.simpleHash(text)
    const embedding: number[] = []
    for (let i = 0; i < 384; i++) {
      embedding.push(Math.sin(hash + i) * 0.5 + 0.5)
    }
    return embedding
  }

  private simpleHash(text: string): number {
    let hash = 0
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash)
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) || 1)
  }

  async retrieve(query: string, topK = 5, docType?: string): Promise<Document[]> {
    const queryEmbedding = this.generateEmbedding(query)

    let candidates = Array.from(this.documents.values())
    if (docType) {
      candidates = candidates.filter((doc) => doc.type === docType)
    }

    const scored = candidates.map((doc) => {
      const docEmbedding = this.embeddings.get(doc.id)
      if (!docEmbedding) return { doc, score: 0 }

      const similarity = this.cosineSimilarity(queryEmbedding, docEmbedding)
      return { doc, score: similarity }
    })

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((s) => s.doc)
  }

  async answerQuestion(question: string): Promise<{
    answer: string
    sources: Document[]
    confidence: number
  }> {
    // Retrieve relevant documents
    const relevantDocs = await this.retrieve(question, 3)

    if (relevantDocs.length === 0) {
      return {
        answer: "I don't have information to answer that question.",
        sources: [],
        confidence: 0,
      }
    }

    // Combine retrieved content (in production, feed to LLM for generation)
    const combinedContent = relevantDocs.map((doc) => doc.content).join(" ")
    const answer = `Based on our policies: ${combinedContent}`

    return {
      answer,
      sources: relevantDocs,
      confidence: 0.85,
    }
  }

  async recommendProducts(query: string, limit = 5): Promise<{ products: Product[]; relevance: number[] }> {
    const productDocs = await this.retrieve(query, limit, "product")

    const products = productDocs.map((doc) => dataLayer.getProduct(doc.metadata.sku)).filter(Boolean) as Product[]

    const relevance = productDocs.map(() => 0.8 + Math.random() * 0.2)

    return { products, relevance }
  }

  addDocument(document: Document) {
    this.documents.set(document.id, document)
    this.embeddings.set(document.id, this.generateEmbedding(document.content))
  }

  async search(query: string, filters?: Record<string, any>): Promise<Document[]> {
    let results = await this.retrieve(query, 10)

    if (filters) {
      results = results.filter((doc) => {
        for (const [key, value] of Object.entries(filters)) {
          if (doc.metadata[key] !== value) return false
        }
        return true
      })
    }

    return results
  }
}

export const ragLayer = new RAGLayer()
