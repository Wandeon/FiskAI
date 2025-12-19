import OpenAI from "openai"
import * as dotenv from "dotenv"

// Load environment variables
dotenv.config({ path: ".env.local" })
dotenv.config({ path: ".env" })

const apiKey = process.env.OLLAMA_API_KEY
const endpoint = process.env.OLLAMA_ENDPOINT
const model = process.env.OLLAMA_MODEL

console.log("--- Configuration Check ---")
console.log(`OLLAMA_API_KEY set: ${!!apiKey}`)
console.log(`OLLAMA_ENDPOINT: ${endpoint}`)
console.log(`OLLAMA_MODEL: ${model}`)

if (!endpoint) {
  console.error("Error: OLLAMA_ENDPOINT is not set.")
  process.exit(1)
}

const openai = new OpenAI({
  apiKey: apiKey || "ollama",
  baseURL: endpoint.endsWith("/v1") ? endpoint : `${endpoint}/v1`,
})

async function testConnection() {
  console.log("\n--- Testing Connection ---")
  try {
    const response = await openai.chat.completions.create({
      model: model || "llama3",
      messages: [{ role: "user", content: "Hello, are you working?" }],
      stream: false,
    })
    console.log("Success! Response:")
    console.log(response.choices[0].message.content)
  } catch (error: any) {
    console.error("Connection Failed:", error.message)
    if (error.cause) console.error("Cause:", error.cause)
  }
}

testConnection()
