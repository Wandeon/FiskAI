import { NextResponse } from "next/server"
import { withApiLogging } from "@/lib/api-logging"

export const dynamic = "force-dynamic"

export const GET = withApiLogging(async () => {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "0.1.0",
  })
})
