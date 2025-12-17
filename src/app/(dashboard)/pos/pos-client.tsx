"use client"

import { useState, useCallback } from "react"
import type { PosProduct, CartItem } from "./types"
import type { ProcessPosSaleResult } from "@/types/pos"

interface Props {
  products: PosProduct[]
  companyIban?: string | null
  terminalReaderId?: string | null
}

export function PosClient({ products, companyIban, terminalReaderId }: Props) {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [showCashModal, setShowCashModal] = useState(false)
  const [showCardModal, setShowCardModal] = useState(false)
  const [saleResult, setSaleResult] = useState<ProcessPosSaleResult | null>(null)

  const addToCart = useCallback((product: PosProduct) => {
    setCartItems((items) => {
      const existing = items.find((i) => i.productId === product.id)
      if (existing) {
        return items.map((i) =>
          i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [
        ...items,
        {
          id: crypto.randomUUID(),
          productId: product.id,
          description: product.name,
          quantity: 1,
          unitPrice: product.price,
          vatRate: product.vatRate,
        },
      ]
    })
  }, [])

  const addCustomItem = useCallback(
    (item: { description: string; unitPrice: number; vatRate: number }) => {
      setCartItems((items) => [
        ...items,
        {
          id: crypto.randomUUID(),
          description: item.description,
          quantity: 1,
          unitPrice: item.unitPrice,
          vatRate: item.vatRate,
        },
      ])
    },
    []
  )

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      setCartItems((items) => items.filter((i) => i.id !== id))
    } else {
      setCartItems((items) =>
        items.map((i) => (i.id === id ? { ...i, quantity } : i))
      )
    }
  }, [])

  const removeItem = useCallback((id: string) => {
    setCartItems((items) => items.filter((i) => i.id !== id))
  }, [])

  const clearCart = useCallback(() => {
    setCartItems([])
  }, [])

  const total = cartItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity * (1 + item.vatRate / 100),
    0
  )

  const handleSaleComplete = (result: ProcessPosSaleResult) => {
    setSaleResult(result)
    setShowCashModal(false)
    setShowCardModal(false)
  }

  const handleNewSale = () => {
    clearCart()
    setSaleResult(null)
  }

  // Placeholder UI until child components are created
  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">Blagajna</h1>
        <div className="flex items-center gap-2">
          {terminalReaderId ? (
            <span className="text-xs text-green-600">● Terminal povezan</span>
          ) : (
            <span className="text-xs text-gray-400">● Nema terminala</span>
          )}
        </div>
      </header>

      {/* Main content - placeholder */}
      <div className="flex-1 flex overflow-hidden">
        {/* Product Grid placeholder */}
        <div className="flex-1 overflow-auto p-4">
          <div className="text-center text-gray-500 py-12">
            <p>ProductGrid component placeholder</p>
            <p className="text-sm">{products.length} proizvoda dostupno</p>
          </div>
        </div>

        {/* Cart placeholder */}
        <div className="w-96 bg-white border-l flex flex-col p-4">
          <h2 className="font-bold mb-4">Košarica</h2>
          <p className="text-sm text-gray-500">{cartItems.length} stavki</p>
          <p className="mt-4 font-bold">
            Ukupno: {new Intl.NumberFormat("hr-HR", { style: "currency", currency: "EUR" }).format(total)}
          </p>
        </div>
      </div>

      {/* Payment Bar placeholder */}
      <div className="bg-white border-t p-4 text-center">
        <p className="text-gray-500">PaymentBar component placeholder</p>
      </div>
    </div>
  )
}
