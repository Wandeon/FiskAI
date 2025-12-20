// src/lib/tutorials/tracks.ts

import type { TutorialTrack } from "./types"

export const PAUSALNI_FIRST_WEEK: TutorialTrack = {
  id: "pausalni-first-week",
  name: "Paušalni First Week",
  description: "Naučite koristiti FiskAI u 5 dana",
  targetLegalForm: ["OBRT_PAUSAL"],
  days: [
    {
      day: 1,
      title: "Kontakti",
      tasks: [
        {
          id: "add-first-customer",
          title: "Dodaj prvog kupca",
          href: "/contacts/new",
          completionCheck: (ctx) => ctx.contactsCount >= 1,
        },
        {
          id: "understand-oib",
          title: "Razumij OIB validaciju",
          description: "OIB je 11-znamenkasti identifikacijski broj",
          href: "/vodici/oib-validacija",
        },
        {
          id: "import-csv",
          title: "Uvezi kontakte iz CSV",
          isOptional: true,
          href: "/contacts/import",
        },
      ],
    },
    {
      day: 2,
      title: "Proizvodi/Usluge",
      tasks: [
        {
          id: "add-first-product",
          title: "Dodaj svoju glavnu uslugu",
          href: "/products/new",
          completionCheck: (ctx) => ctx.productsCount >= 1,
        },
        {
          id: "set-price-vat",
          title: "Postavi cijenu i PDV status",
          description: "Paušalci ne naplaćuju PDV",
          href: "/products",
        },
        {
          id: "understand-no-vat",
          title: "Razumij 'bez PDV-a' za paušalce",
          href: "/vodici/pausalni-pdv",
        },
      ],
    },
    {
      day: 3,
      title: "Prvi račun",
      tasks: [
        {
          id: "create-first-invoice",
          title: "Kreiraj račun za kupca",
          href: "/invoices/new",
          completionCheck: (ctx) => ctx.invoicesCount >= 1,
        },
        {
          id: "preview-pdf",
          title: "Pregledaj PDF preview",
          href: "/invoices",
        },
        {
          id: "send-or-download",
          title: "Pošalji e-mailom ili preuzmi",
          href: "/invoices",
        },
        {
          id: "understand-kpr",
          title: "Razumij KPR unos",
          description: "Račun se automatski upisuje u Knjigu primitaka",
          href: "/vodici/kpr",
        },
      ],
    },
    {
      day: 4,
      title: "KPR i PO-SD",
      tasks: [
        {
          id: "open-kpr",
          title: "Otvori Knjiga primitaka",
          href: "/pausalni",
          completionCheck: (ctx) => ctx.hasKprEntry,
        },
        {
          id: "understand-60k",
          title: "Razumij running total vs 60k",
          description: "Limit za paušalni obrt je 60.000 EUR godišnje",
          href: "/vodici/pausalni-limit",
        },
        {
          id: "preview-posd",
          title: "Pregledaj PO-SD wizard",
          href: "/pausalni/po-sd",
        },
        {
          id: "set-reminder",
          title: "Postavi podsjetnik za 15.1.",
          description: "Rok za PO-SD je 15. siječnja",
          href: "/settings/reminders",
        },
      ],
    },
    {
      day: 5,
      title: "Doprinosi i rokovi",
      tasks: [
        {
          id: "view-calendar",
          title: "Pregledaj kalendar obveza",
          href: "/rokovi",
        },
        {
          id: "understand-contributions",
          title: "Razumij MIO/HZZO/HOK",
          href: "/vodici/doprinosi",
        },
        {
          id: "generate-payment",
          title: "Generiraj uplatnicu (Hub3)",
          href: "/pausalni/forms",
        },
        {
          id: "connect-google",
          title: "Poveži s Google kalendarom",
          isOptional: true,
          href: "/settings/integrations",
          completionCheck: (ctx) => ctx.hasCalendarReminder,
        },
      ],
    },
  ],
}

export const ALL_TRACKS = [PAUSALNI_FIRST_WEEK]

export function getTrackForLegalForm(legalForm: string): TutorialTrack | null {
  return ALL_TRACKS.find((track) => track.targetLegalForm.includes(legalForm)) || null
}
