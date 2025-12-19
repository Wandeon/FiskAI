import { NextResponse } from "next/server"

const SYSTEM_PROMPT = `
Ti si FiskAI Asistent, stručni pomoćnik za hrvatsko računovodstvo, fiskalizaciju i korištenje FiskAI aplikacije.
Tvoj cilj je pomoći korisnicima (poduzetnicima, obrtnicima) da razumiju svoje obveze i koriste aplikaciju.

KONTEKST O APLIKACIJI FISKAI:
- FiskAI je web aplikacija za fakturiranje i vođenje poslovanja.
- Ključne funkcije: Izrada ponuda i računa (uključujući e-račune), fiskalizacija računa (za gotovinu/kartice), vođenje troškova, praćenje klijenata (adresara).
- Podržava: Paušalne obrte, obveznike PDV-a i tvrtke (d.o.o.).
- Navigacija: Dashboard (početna), Računi (izrada i pregled), E-računi (slanje FINA-i), Troškovi, Kontakti, Postavke.

ČESTA PITANJA I PRAVILA (Hrvatska):
- Paušalni obrt limit: 40.000 EUR godišnje.
- PDV prag: 40.000 EUR godišnje (ulazak u sustav PDV-a).
- Rok za plaćanje doprinosa: do 15. u mjesecu za prethodni mjesec.
- Fiskalizacija: Obavezna za sve račune naplaćene gotovinom ili karticama. Transakcijski račun ne podliježe fiskalizaciji (samo se izdaje račun).
- Elementi računa: Broj računa, datum i vrijeme, OIB izdavatelja i kupca (ako je pravna osoba), način plaćanja, operater (oznaka), ZKI i JIR (za fiskalizirane).

UPUTE ZA ODGOVARANJE:
- Budi koristan, pristojan i profesionalan.
- Odgovaraj na hrvatskom jeziku.
- Ako korisnik pita kako nešto napraviti u aplikaciji, vodi ga kroz izbornik (npr. "Idi na Računi > Novi račun").
- Ako nisi siguran oko zakonskog pitanja, naglasi da je to informativan savjet i da provjere s knjigovođom.
- Ne izmišljaj zakone.

Korisnik te sada pita:
`

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 })
    }

    // Construct the endpoint
    // Default to standard Ollama API endpoint
    let endpoint = process.env.OLLAMA_ENDPOINT || "https://ollama.com/api"
    // Remove trailing slash if present
    if (endpoint.endsWith("/")) endpoint = endpoint.slice(0, -1)

    // Ensure it ends with /chat (standard Ollama API)
    // If the user provided a full path ending in /v1/chat/completions (OpenAI style),
    // we might need to adjust, but let's assume standard Ollama for now as requested.
    if (!endpoint.endsWith("/chat")) {
      if (endpoint.endsWith("/api")) {
        endpoint = `${endpoint}/chat`
      } else {
        endpoint = `${endpoint}/api/chat`
      }
    }

    const apiKey = process.env.OLLAMA_API_KEY
    const model = process.env.OLLAMA_MODEL || "llama3"

    // Prepare messages
    const apiMessages = [{ role: "system", content: SYSTEM_PROMPT }, ...messages]

    console.log(`[Assistant] Sending request to ${endpoint} with model ${model}`)

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: model,
        messages: apiMessages,
        stream: true,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[Assistant] Upstream Error:", response.status, errorText)
      throw new Error(`Ollama API Error (${response.status}): ${errorText}`)
    }

    // Transform Ollama's NDJSON stream to a simple text stream
    const stream = new ReadableStream({
      async start(controller) {
        if (!response.body) {
          controller.close()
          return
        }
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split("\n")

            // Keep the last incomplete line in the buffer
            buffer = lines.pop() || ""

            for (const line of lines) {
              if (!line.trim()) continue
              try {
                const json = JSON.parse(line)
                if (json.message?.content) {
                  controller.enqueue(new TextEncoder().encode(json.message.content))
                }
                if (json.done) {
                  // End of stream
                }
              } catch (e) {
                console.warn("[Assistant] JSON Parse Error:", e)
              }
            }
          }
        } finally {
          controller.close()
        }
      },
    })

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    })
  } catch (error: any) {
    console.error("[Assistant] Server Error:", error)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}
