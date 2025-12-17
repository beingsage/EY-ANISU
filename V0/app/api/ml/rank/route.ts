// ML ranking endpoint
import { mlRankingEngine } from "@/lib/services/ml-ranking-engine"
import { dataLayer } from "@/lib/services/data-layer"

export async function POST(request: Request) {
  const { session_id, customer_id, context_type } = await request.json()

  try {
    const products = dataLayer.getAllProducts()
    const ranked = await mlRankingEngine.rankProducts(products, {
      session_id,
      customer_id,
      context_type: context_type || "recommendation",
      cart_items: [],
    })

    return Response.json({
      session_id,
      ranked_products: ranked.map((r) => ({
        sku: r.product.sku,
        name: r.product.name,
        score: r.score,
        features: r.features,
      })),
      count: ranked.length,
    })
  } catch (error) {
    return Response.json({ error: "Ranking failed" }, { status: 500 })
  }
}
