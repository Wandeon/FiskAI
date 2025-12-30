import { NextResponse } from "next/server"

import { requireAuth, requireCompany } from "@/lib/auth-utils"
import { getCashBalance, getCashLimitSetting } from "@/lib/cash/cash-service"

export async function GET() {
  const user = await requireAuth()
  const company = await requireCompany(user.id!)
  const companyId = company.id

  try {
    const [balance, limitSetting] = await Promise.all([
      getCashBalance(companyId),
      getCashLimitSetting(companyId),
    ])

    return NextResponse.json({
      balance: balance.toString(),
      currency: "EUR",
      limit: limitSetting
        ? {
            amount: limitSetting.limitAmount.toString(),
            isActive: limitSetting.isActive,
            percentUsed: limitSetting.isActive
              ? balance.dividedBy(limitSetting.limitAmount).times(100).toFixed(1)
              : null,
          }
        : null,
    })
  } catch (error) {
    console.error("Failed to get cash balance:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get balance" },
      { status: 500 }
    )
  }
}
