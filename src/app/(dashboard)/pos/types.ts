export interface PosProduct {
  id: string
  name: string
  price: number
  vatRate: number
  sku?: string | null
}

export interface CartItem {
  id: string
  productId?: string
  description: string
  quantity: number
  unitPrice: number
  vatRate: number
}
