// ETL pipeline trigger endpoint
import { etlPipeline } from "@/lib/services/etl-pipeline"

export async function POST(request: Request) {
  const { full_sync } = await request.json()

  try {
    const result = await etlPipeline.runFullETL({
      source_type: "database",
      batch_size: 100,
      deduplicate: true,
    })

    return Response.json(result)
  } catch (error) {
    return Response.json({ error: "ETL execution failed" }, { status: 500 })
  }
}
