import { SCHEMA_VERSION, type AssistantResponse } from "../types"

const baseResponse = {
  schemaVersion: SCHEMA_VERSION,
  requestId: "req_demo",
  traceId: "trace_demo",
  surface: "MARKETING" as const,
  createdAt: new Date().toISOString(),
}

export const DEMO_FIXTURES: Record<string, AssistantResponse> = {
  ANSWER: {
    ...baseResponse,
    kind: "ANSWER",
    topic: "REGULATORY",
    headline: "Prag za paušalno oporezivanje je 39.816,84 EUR",
    directAnswer:
      "Godišnji primitak do 39.816,84 EUR omogućuje paušalno oporezivanje prema Zakonu o porezu na dohodak.",
    confidence: { level: "HIGH", score: 0.95 },
    citations: {
      primary: {
        id: "src_1",
        title: "Zakon o porezu na dohodak, čl. 82",
        authority: "LAW",
        reference: "NN 115/16, 106/18",
        quote: "Godišnji primitak od 39.816,84 eura",
        url: "https://narodne-novine.nn.hr/clanci/sluzbeni/2016_12_115_2519.html",
        effectiveFrom: "2024-01-01",
        confidence: 0.95,
      },
      supporting: [
        {
          id: "src_2",
          title: "Uputa Porezne uprave",
          authority: "GUIDANCE",
          url: "https://www.porezna-uprava.hr/upute",
          effectiveFrom: "2024-01-15",
          confidence: 0.88,
        },
      ],
    },
    relatedQuestions: [
      "Koji su uvjeti za paušalni obrt?",
      "Kada prelazim u redovno oporezivanje?",
      "Kako se računa godišnji primitak?",
    ],
  },

  NO_CITABLE_RULES: {
    ...baseResponse,
    kind: "REFUSAL",
    topic: "REGULATORY",
    headline: "Nema dostupnih službenih izvora",
    directAnswer: "",
    refusalReason: "NO_CITABLE_RULES",
    refusal: {
      message: "Nismo pronašli službene izvore koji odgovaraju na vaše pitanje.",
      relatedTopics: ["porez na dohodak", "PDV stope", "paušalni obrt"],
    },
  },

  OUT_OF_SCOPE: {
    ...baseResponse,
    kind: "REFUSAL",
    topic: "PRODUCT",
    headline: "Ovo pitanje nije regulatorne prirode",
    directAnswer: "",
    refusalReason: "OUT_OF_SCOPE",
    refusal: {
      message: "Ovaj asistent odgovara samo na regulatorna pitanja.",
      redirectOptions: [
        { label: "Kontaktirajte podršku", href: "/contact", type: "SUPPORT" },
        { label: "Pogledajte dokumentaciju", href: "/docs", type: "DOCS" },
      ],
    },
  },

  UNRESOLVED_CONFLICT: {
    ...baseResponse,
    kind: "REFUSAL",
    topic: "REGULATORY",
    headline: "Proturječni propisi",
    directAnswer: "",
    refusalReason: "UNRESOLVED_CONFLICT",
    conflict: {
      status: "UNRESOLVED",
      description: "Dva izvora navode različite vrijednosti za istu regulativu.",
      sources: [
        {
          id: "src_conflict_1",
          title: "Izvor A",
          authority: "LAW",
          url: "https://example.com/a",
          effectiveFrom: "2024-01-01",
          confidence: 0.9,
        },
        {
          id: "src_conflict_2",
          title: "Izvor B",
          authority: "LAW",
          url: "https://example.com/b",
          effectiveFrom: "2024-02-01",
          confidence: 0.9,
        },
      ],
    },
    refusal: {
      message: "Pronađeni su proturječni propisi. Preporučujemo konzultaciju sa stručnjakom.",
    },
  },

  MISSING_CLIENT_DATA: {
    ...baseResponse,
    surface: "APP",
    kind: "REFUSAL",
    topic: "REGULATORY",
    headline: "Potrebni su dodatni podaci",
    directAnswer: "",
    refusalReason: "MISSING_CLIENT_DATA",
    refusal: {
      message: "Za personalizirani odgovor potrebno je povezati podatke.",
      missingData: [
        {
          label: "Godišnji prihod",
          impact: "Određuje porezni razred",
          connectAction: "/connect/revenue",
        },
        {
          label: "Vrsta djelatnosti",
          impact: "Utječe na doprinose",
          connectAction: "/connect/activity",
        },
      ],
    },
  },
}

export type FixtureKey = keyof typeof DEMO_FIXTURES
