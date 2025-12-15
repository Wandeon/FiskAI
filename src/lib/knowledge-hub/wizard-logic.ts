// src/lib/knowledge-hub/wizard-logic.ts
import { BusinessType, WizardAnswer, WizardState } from "./types"

export interface WizardQuestion {
  id: string
  question: string
  options: { value: string; label: string; description?: string }[]
  nextQuestion: (answer: string) => string | null
}

export const WIZARD_QUESTIONS: Record<string, WizardQuestion> = {
  employment: {
    id: "employment",
    question: "Koji je vaš trenutni radni status?",
    options: [
      { value: "employed", label: "Zaposlen/a sam", description: "Radim kod drugog poslodavca" },
      {
        value: "unemployed",
        label: "Nezaposlen/a sam",
        description: "Tražim posao ili pokrećem vlastiti",
      },
      { value: "retired", label: "Umirovljenik/ca", description: "Primam mirovinu" },
    ],
    nextQuestion: () => "intent",
  },
  intent: {
    id: "intent",
    question: "Što želite postići?",
    options: [
      { value: "side", label: "Dodatni prihod", description: "Uz postojeći posao ili mirovinu" },
      {
        value: "main",
        label: "Glavni izvor prihoda",
        description: "Ovo će biti moj primarni posao",
      },
      { value: "explore", label: "Istražujem opcije", description: "Još nisam siguran/na" },
    ],
    nextQuestion: () => "revenue",
  },
  revenue: {
    id: "revenue",
    question: "Koliki prihod očekujete godišnje?",
    options: [
      { value: "low", label: "Do 12.000 EUR", description: "Manji opseg poslovanja" },
      { value: "medium", label: "12.000 - 40.000 EUR", description: "Srednji opseg" },
      { value: "high", label: "40.000 - 60.000 EUR", description: "Veći opseg, blizu PDV praga" },
      { value: "over", label: "Više od 60.000 EUR", description: "Prelazi limit za paušal" },
    ],
    nextQuestion: (answer) => (answer === "over" ? "business_form" : "cash"),
  },
  cash: {
    id: "cash",
    question: "Hoćete li primati gotovinske uplate?",
    options: [
      { value: "yes", label: "Da, primam gotovinu", description: "Od kupaca ili klijenata" },
      { value: "no", label: "Ne, samo kartice/virman", description: "Bezgotovinsko poslovanje" },
      { value: "unsure", label: "Nisam siguran/na", description: "Još ne znam" },
    ],
    nextQuestion: () => "activity",
  },
  activity: {
    id: "activity",
    question: "Koja vrsta djelatnosti vas zanima?",
    options: [
      { value: "it", label: "IT / Programiranje", description: "Softver, web, konzalting" },
      { value: "services", label: "Ostale usluge", description: "Dizajn, marketing, savjetovanje" },
      { value: "trade", label: "Trgovina", description: "Prodaja proizvoda" },
      { value: "hospitality", label: "Ugostiteljstvo", description: "Kafići, restorani" },
    ],
    nextQuestion: () => null,
  },
  business_form: {
    id: "business_form",
    question: "Koji oblik poduzeća preferirate?",
    options: [
      { value: "doo", label: "d.o.o.", description: "Ograničena odgovornost, više administracije" },
      {
        value: "obrt",
        label: "Obrt na dohodak",
        description: "Jednostavnije, ali neograničena odgovornost",
      },
    ],
    nextQuestion: () => "partners",
  },
  partners: {
    id: "partners",
    question: "Imate li poslovne partnere?",
    options: [
      { value: "solo", label: "Radim sam/a", description: "Jednočlano društvo" },
      { value: "partners", label: "Imam partnere", description: "Višečlano društvo" },
    ],
    nextQuestion: () => null,
  },
}

export function getRecommendedBusinessType(answers: WizardAnswer[]): BusinessType {
  const getAnswer = (id: string) => answers.find((a) => a.questionId === id)?.value

  const employment = getAnswer("employment")
  const revenue = getAnswer("revenue")
  const activity = getAnswer("activity")
  const businessForm = getAnswer("business_form")
  const partners = getAnswer("partners")

  // Over 60k -> d.o.o. or obrt dohodak
  if (revenue === "over") {
    if (businessForm === "doo") {
      return partners === "partners" ? "doo-viseclano" : "doo-jednoclan"
    }
    return "obrt-dohodak"
  }

  // Retiree
  if (employment === "retired") {
    return "pausalni-obrt-umirovljenik"
  }

  // Employed
  if (employment === "employed") {
    return "pausalni-obrt-uz-zaposlenje"
  }

  // IT freelancer
  if (activity === "it") {
    return "it-freelancer"
  }

  // Hospitality
  if (activity === "hospitality") {
    return "ugostiteljstvo"
  }

  // Default to basic paušalni
  return "pausalni-obrt"
}

export function buildPersonalizationParams(answers: WizardAnswer[]): URLSearchParams {
  const params = new URLSearchParams()

  const revenueMap: Record<string, string> = {
    low: "10000",
    medium: "25000",
    high: "50000",
    over: "70000",
  }

  const revenue = answers.find((a) => a.questionId === "revenue")?.value
  if (revenue && revenueMap[revenue]) {
    params.set("prihod", revenueMap[revenue])
  }

  const cash = answers.find((a) => a.questionId === "cash")?.value
  if (cash) {
    params.set("gotovina", cash === "yes" ? "da" : "ne")
  }

  const employment = answers.find((a) => a.questionId === "employment")?.value
  if (employment === "employed") {
    params.set("zaposlenje", "da")
  }

  return params
}
