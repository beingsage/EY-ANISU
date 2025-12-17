// ETL (Extract, Transform, Load) pipeline for data ingestion
import { dataLayer } from "./data-layer"
import { ragLayer, type Document } from "./rag-layer"
import { eventBus } from "./event-bus"

export interface ETLConfig {
  source_type: "api" | "file" | "database" | "csv"
  batch_size: number
  deduplicate: boolean
  transform_rules?: Array<{
    field: string
    operation: "normalize" | "encrypt" | "hash" | "categorize"
  }>
}

export class ETLPipeline {
  async extractProductCatalog(): Promise<any[]> {
    // Extract all products from data layer
    const products = dataLayer.getAllProducts()

    await eventBus.publishToTopic("etl", "extract_completed", {
      source: "product_catalog",
      count: products.length,
    })

    return products
  }

  async transformForRAG(products: any[]): Promise<Document[]> {
    const documents: Document[] = []

    for (const product of products) {
      const doc: Document = {
        id: `product_${product.sku}`,
        type: "product",
        content: [
          product.name,
          product.description,
          product.category,
          Object.values(product.attributes || {}).join(" "),
          `Price: ${product.price}`,
          `Rating: ${product.rating}`,
          `Available: ${product.in_stock}`,
        ].join(" | "),
        metadata: {
          sku: product.sku,
          category: product.category,
          price: product.price,
          rating: product.rating,
          in_stock: product.in_stock,
        },
      }

      documents.push(doc)
    }

    await eventBus.publishToTopic("etl", "transform_completed", {
      input_count: products.length,
      output_count: documents.length,
    })

    return documents
  }

  async loadToRAG(documents: Document[]): Promise<number> {
    let loaded = 0

    for (const doc of documents) {
      try {
        ragLayer.addDocument(doc)
        loaded++
      } catch (error) {
        console.error(`Failed to load document ${doc.id}:`, error)
      }
    }

    await eventBus.publishToTopic("etl", "load_completed", {
      loaded_count: loaded,
      failed_count: documents.length - loaded,
    })

    return loaded
  }

  async runFullETL(config: ETLConfig): Promise<{ success: boolean; stats: Record<string, any> }> {
    const startTime = Date.now()

    try {
      await eventBus.publishToTopic("etl", "pipeline_started", { config })

      // Extract
      const extracted = await this.extractProductCatalog()

      // Transform
      const transformed = await this.transformForRAG(extracted)

      // Load
      const loaded = await this.loadToRAG(transformed)

      const duration = Date.now() - startTime

      await eventBus.publishToTopic("etl", "pipeline_completed", {
        extracted: extracted.length,
        transformed: transformed.length,
        loaded,
        duration_ms: duration,
      })

      return {
        success: true,
        stats: {
          extracted_count: extracted.length,
          transformed_count: transformed.length,
          loaded_count: loaded,
          duration_ms: duration,
        },
      }
    } catch (error) {
      await eventBus.publishToTopic("etl", "pipeline_failed", {
        error: String(error),
      })

      return { success: false, stats: { error: String(error) } }
    }
  }

  async syncCatalogUpdates(): Promise<void> {
    // Continuous sync for catalog changes
    const interval = setInterval(async () => {
      const result = await this.runFullETL({
        source_type: "database",
        batch_size: 100,
        deduplicate: true,
      })

      if (!result.success) {
        console.error("ETL sync failed:", result.stats)
      }
    }, 60000) // Every minute

    console.log("[ETL] Catalog sync started")
  }
}

export const etlPipeline = new ETLPipeline()
