// src/lib/assistant/reasoning/topic-dimensions.ts

/**
 * Dimension requirement with optional conditional logic
 */
export interface DimensionRequirement {
  dimension: string
  required:
    | boolean
    | {
        dependsOn: string
        value: string
      }
  possibleValues?: string[]
  defaultValue?: string
  defaultSource?: "jurisdiction" | "temporal" | "profile"
}

/**
 * Topic-specific dimension requirements
 */
export interface TopicDimensions {
  topic: string
  dimensions: DimensionRequirement[]
}

/**
 * VAT Rate determination dimensions
 */
export const VAT_RATE_DIMENSIONS: TopicDimensions = {
  topic: "vat-rate",
  dimensions: [
    { dimension: "Item", required: true },
    {
      dimension: "ServiceContext",
      required: false,
      possibleValues: ["on-premises", "takeaway", "delivery"],
    },
    { dimension: "Date", required: true, defaultValue: "today", defaultSource: "temporal" },
    { dimension: "Place", required: true, defaultValue: "HR", defaultSource: "jurisdiction" },
    { dimension: "BuyerType", required: false, possibleValues: ["B2B", "B2C"] },
    { dimension: "VAT_ID", required: { dependsOn: "BuyerType", value: "B2B" } },
  ],
}

/**
 * OSS Threshold dimensions
 */
export const OSS_THRESHOLD_DIMENSIONS: TopicDimensions = {
  topic: "oss-threshold",
  dimensions: [
    {
      dimension: "SellerCountry",
      required: true,
      defaultValue: "HR",
      defaultSource: "jurisdiction",
    },
    { dimension: "BuyerCountry", required: true },
    { dimension: "SalesAmount", required: true },
    {
      dimension: "Period",
      required: true,
      defaultValue: "current-year",
      defaultSource: "temporal",
    },
  ],
}

/**
 * Lump-sum taxation dimensions
 */
export const PAUSALNI_DIMENSIONS: TopicDimensions = {
  topic: "pausalni",
  dimensions: [
    { dimension: "LegalForm", required: true, possibleValues: ["obrt", "slobodna-djelatnost"] },
    { dimension: "AnnualRevenue", required: true },
    { dimension: "Activity", required: false },
    { dimension: "Year", required: true, defaultValue: "current-year", defaultSource: "temporal" },
  ],
}

/**
 * Business registration dimensions
 */
export const REGISTRATION_DIMENSIONS: TopicDimensions = {
  topic: "registration",
  dimensions: [
    { dimension: "LegalForm", required: true },
    { dimension: "Activity", required: true },
    { dimension: "Location", required: true, defaultValue: "HR", defaultSource: "jurisdiction" },
    { dimension: "CapitalAmount", required: { dependsOn: "LegalForm", value: "d.o.o." } },
  ],
}

/**
 * All topic dimensions registry
 */
const TOPIC_DIMENSIONS_REGISTRY: TopicDimensions[] = [
  VAT_RATE_DIMENSIONS,
  OSS_THRESHOLD_DIMENSIONS,
  PAUSALNI_DIMENSIONS,
  REGISTRATION_DIMENSIONS,
]

/**
 * Get dimensions for a specific topic
 */
export function getTopicDimensions(topic: string): TopicDimensions | undefined {
  return TOPIC_DIMENSIONS_REGISTRY.find((t) => t.topic === topic)
}

/**
 * Get all registered topics
 */
export function getAllTopics(): string[] {
  return TOPIC_DIMENSIONS_REGISTRY.map((t) => t.topic)
}

/**
 * Check if a dimension is conditionally required
 */
export function isConditionallyRequired(
  dim: DimensionRequirement,
  resolvedDimensions: Record<string, string>
): boolean {
  if (typeof dim.required === "boolean") {
    return dim.required
  }

  const { dependsOn, value } = dim.required
  return resolvedDimensions[dependsOn] === value
}
