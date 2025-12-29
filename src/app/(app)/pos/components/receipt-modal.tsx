// src/app/(dashboard)/pos/components/receipt-modal.tsx
"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Modal, ModalFooter } from "@/components/ui/modal"
import type { ProcessPosSaleResult } from "@/types/pos"
import { generateFiscalQRCode, type FiscalQRData } from "@/lib/fiscal/qr-generator"

interface Props {
  isOpen: boolean
  result: ProcessPosSaleResult
  onNewSale: () => void
  onClose: () => void
}

export function ReceiptModal({ isOpen, result, onNewSale, onClose }: Props) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("hr-HR", {
      style: "currency",
      currency: "EUR",
    }).format(price)

  // Generate QR code when fiscalization data is available
  useEffect(() => {
    async function generateQR() {
      if (!result.jir || !result.zki || !result.invoice || !result.issuerOib) {
        setQrCodeDataUrl(null)
        return
      }

      // Skip QR for demo JIRs
      if (result.jir.startsWith("DEMO")) {
        setQrCodeDataUrl(null)
        return
      }

      try {
        const qrData: FiscalQRData = {
          jir: result.jir,
          zki: result.zki,
          invoiceNumber: result.invoice.invoiceNumber,
          issuerOib: result.issuerOib,
          amount: result.invoice.totalAmount,
          dateTime: new Date(result.invoice.issueDate),
        }
        const dataUrl = await generateFiscalQRCode(qrData)
        setQrCodeDataUrl(dataUrl)
      } catch (error) {
        console.error("Failed to generate QR code:", error)
        setQrCodeDataUrl(null)
      }
    }

    if (isOpen) {
      generateQR()
    }
  }, [isOpen, result])

  function handlePrint() {
    if (result.pdfUrl) {
      window.open(result.pdfUrl, "_blank")
    }
  }

  return (
    <Modal isOpen={isOpen} title="Prodaja zavrsena" onClose={onClose}>
      <div className="text-center space-y-6 py-4">
        {/* Success icon */}
        <div className="text-6xl text-success">&#10003;</div>

        {/* Invoice info */}
        <div>
          <p className="text-sm text-muted-foreground">Broj racuna</p>
          <p className="text-xl font-mono font-bold">{result.invoice?.invoiceNumber}</p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Ukupno</p>
          <p className="text-3xl font-bold">{formatPrice(result.invoice?.totalAmount || 0)}</p>
        </div>

        {/* Fiscalization Status */}
        <div className="bg-muted/50 rounded-lg p-4 text-left space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Status fiskalizacije</h4>

          {result.zki && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">ZKI:</span>
              <code className="text-xs font-mono bg-background px-2 py-1 rounded">
                {result.zki.substring(0, 20)}...
              </code>
            </div>
          )}

          {result.jir && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">JIR:</span>
              {result.jir.startsWith("DEMO") ? (
                <Badge variant="warning">Demo: {result.jir}</Badge>
              ) : (
                <code className="text-xs font-mono text-success bg-background px-2 py-1 rounded">
                  {result.jir}
                </code>
              )}
            </div>
          )}

          {!result.jir && (
            <p className="text-sm text-warning flex items-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-warning border-t-transparent rounded-full animate-spin" />
              Fiskalizacija u tijeku...
            </p>
          )}
        </div>

        {/* QR Code for fiscal verification */}
        {qrCodeDataUrl && (
          <div className="bg-card rounded-lg p-4 inline-block mx-auto">
            <Image
              src={qrCodeDataUrl}
              alt="QR kod za provjeru racuna"
              width={128}
              height={128}
              className="mx-auto"
            />
            <p className="text-xs text-muted-foreground mt-2">Skenirajte za provjeru racuna</p>
          </div>
        )}
      </div>

      <ModalFooter>
        <Button variant="outline" onClick={handlePrint}>
          Ispisi racun
        </Button>
        <Button onClick={onNewSale}>Nova prodaja</Button>
      </ModalFooter>
    </Modal>
  )
}
