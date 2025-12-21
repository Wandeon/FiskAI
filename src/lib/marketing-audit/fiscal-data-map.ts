import path from "node:path"
import { pathToFileURL } from "node:url"

export async function loadFiscalDataMap() {
  const modulePath = path.resolve(process.cwd(), "src/lib/fiscal-data/index.ts")
  const moduleUrl = pathToFileURL(modulePath)
  const mod = await import(moduleUrl.toString())
  return mod
}
