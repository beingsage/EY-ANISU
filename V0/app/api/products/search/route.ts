// Product search endpoint
import { dataLayer } from "@/lib/services/data-layer"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")
  const limit = Number.parseInt(searchParams.get("limit") || "10")

  if (!query) {
    return Response.json({ error: "Missing search query" }, { status: 400 })
  }

  try {
    const products = dataLayer.searchProducts(query, limit)
    return Response.json({ products, count: products.length })
  } catch (error) {
    return Response.json({ error: "Search failed" }, { status: 500 })
  }
}
