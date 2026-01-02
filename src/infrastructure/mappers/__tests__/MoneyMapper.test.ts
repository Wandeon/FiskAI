// src/infrastructure/mappers/__tests__/MoneyMapper.test.ts
import { describe, it, expect } from "vitest"
import { MoneyMapper } from "../MoneyMapper"
import { Money } from "@/domain/shared"
import { Prisma } from "@prisma/client"

describe("MoneyMapper", () => {
  describe("toDomain", () => {
    it("converts cents to Money", () => {
      const money = MoneyMapper.toDomain(10050)

      expect(money.toDecimal().toNumber()).toBe(100.5)
      expect(money.currency).toBe("EUR")
    })

    it("converts zero cents", () => {
      const money = MoneyMapper.toDomain(0)

      expect(money.isZero()).toBe(true)
    })

    it("converts negative cents", () => {
      const money = MoneyMapper.toDomain(-5000)

      expect(money.toDecimal().toNumber()).toBe(-50)
      expect(money.isNegative()).toBe(true)
    })

    it("converts bigint cents", () => {
      const money = MoneyMapper.toDomain(BigInt(10050))

      expect(money.toDecimal().toNumber()).toBe(100.5)
    })

    it("uses specified currency", () => {
      const money = MoneyMapper.toDomain(1000, "USD")

      expect(money.currency).toBe("USD")
    })
  })

  describe("fromPrismaDecimal", () => {
    it("converts Prisma Decimal to Money", () => {
      const prismaDecimal = new Prisma.Decimal("100.50")
      const money = MoneyMapper.fromPrismaDecimal(prismaDecimal)

      expect(money.toDecimal().toNumber()).toBe(100.5)
      expect(money.currency).toBe("EUR")
    })

    it("handles null by returning zero", () => {
      const money = MoneyMapper.fromPrismaDecimal(null)

      expect(money.isZero()).toBe(true)
      expect(money.currency).toBe("EUR")
    })

    it("handles null with specified currency", () => {
      const money = MoneyMapper.fromPrismaDecimal(null, "USD")

      expect(money.isZero()).toBe(true)
      expect(money.currency).toBe("USD")
    })

    it("converts precise decimal values", () => {
      const prismaDecimal = new Prisma.Decimal("1234.56")
      const money = MoneyMapper.fromPrismaDecimal(prismaDecimal)

      expect(money.toDecimal().toString()).toBe("1234.56")
    })

    it("converts negative Prisma Decimal", () => {
      const prismaDecimal = new Prisma.Decimal("-500.25")
      const money = MoneyMapper.fromPrismaDecimal(prismaDecimal)

      expect(money.toDecimal().toNumber()).toBe(-500.25)
      expect(money.isNegative()).toBe(true)
    })
  })

  describe("toPersistence", () => {
    it("converts Money to cents", () => {
      const money = Money.fromString("100.50")
      const cents = MoneyMapper.toPersistence(money)

      expect(cents).toBe(10050)
    })

    it("converts zero Money", () => {
      const money = Money.zero()
      const cents = MoneyMapper.toPersistence(money)

      expect(cents).toBe(0)
    })

    it("converts negative Money", () => {
      const money = Money.fromString("-50.00")
      const cents = MoneyMapper.toPersistence(money)

      expect(cents).toBe(-5000)
    })

    it("handles whole amounts", () => {
      const money = Money.fromString("100.00")
      const cents = MoneyMapper.toPersistence(money)

      expect(cents).toBe(10000)
    })
  })

  describe("toPrismaDecimal", () => {
    it("converts Money to Prisma Decimal", () => {
      const money = Money.fromString("100.50")
      const prismaDecimal = MoneyMapper.toPrismaDecimal(money)

      expect(prismaDecimal.toString()).toBe("100.5")
    })

    it("converts zero Money", () => {
      const money = Money.zero()
      const prismaDecimal = MoneyMapper.toPrismaDecimal(money)

      expect(prismaDecimal.toString()).toBe("0")
    })

    it("converts negative Money", () => {
      const money = Money.fromString("-500.25")
      const prismaDecimal = MoneyMapper.toPrismaDecimal(money)

      expect(prismaDecimal.toString()).toBe("-500.25")
    })

    it("preserves precision", () => {
      const money = Money.fromString("1234.56")
      const prismaDecimal = MoneyMapper.toPrismaDecimal(money)

      expect(prismaDecimal.toString()).toBe("1234.56")
    })
  })

  describe("fromLegacyNumber", () => {
    it("converts number to Money", () => {
      const money = MoneyMapper.fromLegacyNumber(100.5)

      expect(money.toDecimal().toNumber()).toBe(100.5)
      expect(money.currency).toBe("EUR")
    })

    it("handles integer values", () => {
      const money = MoneyMapper.fromLegacyNumber(100)

      expect(money.toDecimal().toNumber()).toBe(100)
    })

    it("handles zero", () => {
      const money = MoneyMapper.fromLegacyNumber(0)

      expect(money.isZero()).toBe(true)
    })

    it("handles negative values", () => {
      const money = MoneyMapper.fromLegacyNumber(-50.25)

      expect(money.toDecimal().toNumber()).toBe(-50.25)
      expect(money.isNegative()).toBe(true)
    })

    it("uses specified currency", () => {
      const money = MoneyMapper.fromLegacyNumber(100, "USD")

      expect(money.currency).toBe("USD")
    })
  })

  describe("roundtrip conversions", () => {
    it("maintains value through cents roundtrip", () => {
      const original = Money.fromString("1234.56")
      const cents = MoneyMapper.toPersistence(original)
      const restored = MoneyMapper.toDomain(cents)

      expect(restored.equals(original)).toBe(true)
    })

    it("maintains value through Prisma Decimal roundtrip", () => {
      const original = Money.fromString("9876.54")
      const prismaDecimal = MoneyMapper.toPrismaDecimal(original)
      const restored = MoneyMapper.fromPrismaDecimal(prismaDecimal)

      expect(restored.equals(original)).toBe(true)
    })
  })
})
