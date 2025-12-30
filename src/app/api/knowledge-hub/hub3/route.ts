import { NextResponse } from "next/server"
import { generateHub3DataUrl } from "@/lib/knowledge-hub/hub3"
import { PAYMENT_IBANS, PAYMENT_MODEL } from "@/lib/knowledge-hub/constants"
import { apiError } from "@/lib/api-error"

export const runtime = "nodejs"

type PaymentType = "MIO_I" | "MIO_II" | "HZZO" | "HOK"

type Hub3Request = {
  oib: string
  paymentType: PaymentType
  amount: number
  payerName?: string
  payerAddress?: string
  payerCity?: string
}

function validateOIB(oib: string): boolean {
  if (!/^\d{11}$/.test(oib)) return false

  let a = 10
  for (let i = 0; i < 10; i++) {
    a = (a + parseInt(oib[i], 10)) % 10
    if (a === 0) a = 10
    a = (a * 2) % 11
  }

  const controlDigit = (11 - a) % 10
  return controlDigit === parseInt(oib[10], 10)
}

function buildReference(oib: string) {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  return `${oib}-${year}${month}`
}

function getRecipient(paymentType: PaymentType) {
  switch (paymentType) {
    case "MIO_I":
      return {
        iban: PAYMENT_IBANS.STATE_BUDGET,
        recipientName: "DRŽAVNI PRORAČUN RH",
        recipientAddress: "",
        recipientCity: "ZAGREB",
        description: "MIO I. stup",
      }
    case "MIO_II":
      return {
        iban: PAYMENT_IBANS.MIO_II,
        recipientName: "OBVEZNI MIROVINSKI FONDOVI",
        recipientAddress: "",
        recipientCity: "ZAGREB",
        description: "MIO II. stup",
      }
    case "HZZO":
      return {
        iban: PAYMENT_IBANS.HZZO,
        recipientName: "HZZO",
        recipientAddress: "",
        recipientCity: "ZAGREB",
        description: "Zdravstveno osiguranje",
      }
    case "HOK":
      return {
        iban: PAYMENT_IBANS.HOK,
        recipientName: "HRVATSKA OBRTNIČKA KOMORA",
        recipientAddress: "",
        recipientCity: "ZAGREB",
        description: "HOK članarina",
      }
  }
}

export async function POST(request: Request) {
  let body: Hub3Request
  try {
    body = (await request.json()) as Hub3Request
  } catch {
    return NextResponse.json({ error: "Neispravan JSON." }, { status: 400 })
  }

  if (!body?.oib || !body.paymentType) {
    return NextResponse.json({ error: "Nedostaju obavezna polja." }, { status: 400 })
  }

  if (!validateOIB(body.oib)) {
    return NextResponse.json({ error: "Neispravan OIB." }, { status: 400 })
  }

  const amount = Number(body.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Neispravan iznos." }, { status: 400 })
  }

  const recipient = getRecipient(body.paymentType)
  const reference = buildReference(body.oib)

  try {
    const dataUrl = await generateHub3DataUrl({
      amount,
      payerName: body.payerName?.trim() || body.oib,
      payerAddress: body.payerAddress?.trim() || "",
      payerCity: body.payerCity?.trim() || "",
      recipientName: recipient.recipientName,
      recipientAddress: recipient.recipientAddress,
      recipientCity: recipient.recipientCity,
      recipientIBAN: recipient.iban,
      model: PAYMENT_MODEL,
      reference,
      description: recipient.description,
    })

    return NextResponse.json({
      dataUrl,
      reference,
      iban: recipient.iban,
      model: PAYMENT_MODEL,
      amount,
    })
  } catch (error) {
    return apiError(error, {
      status: 500,
      code: "OPERATION_FAILED",
      message: "Greška prilikom generiranja barkoda.",
    })
  }
}
