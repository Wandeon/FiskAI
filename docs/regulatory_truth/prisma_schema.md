v2 translated into a Prisma schema

This schema assumes Postgres and a modern Prisma setup. It models:

append-only evidence snapshots

precise citation pointers

concepts

rules with time validity, authority, confidence, risk, automation policy

conflicts with resolution and automation blocking

releases as immutable bundles

audit log

graph nodes + edges (so you can grow beyond basic edges later)

// schema.prisma
// Datasource / generator omitted for brevity.
// Assumes PostgreSQL.

enum EvidenceSource {
NARODNE_NOVINE
POREZNA_UPRAVA
FINA
HZMO
HZZO
}

enum EvidenceContentType {
PDF
HTML
}

enum EvidenceStatus {
PENDING
PROCESSED
IGNORED
}

enum PointerType {
PDF_PAGE_SPAN
HTML_SELECTOR
ARTICLE_REF
}

enum RuleType {
THRESHOLD
DEADLINE
OBLIGATION
DEFINITION
PROCEDURE
}

enum AuthorityLevel {
LAW
GUIDANCE
PROCEDURE
PRACTICE
}

enum RiskLevel {
LOW
MEDIUM
HIGH
}

enum RuleStability {
STABLE
VOLATILE
}

enum AutomationPolicy {
ALLOW
CONFIRM
BLOCK
}

enum RuleStatus {
DRAFT
ACTIVE
DEPRECATED
STALE
}

enum ConflictSeverity {
CRITICAL
WARNING
}

enum ConflictResolutionPolicy {
LAW_WINS
GUIDANCE_WINS
NEEDS_JUDGMENT
}

enum ConflictStatus {
OPEN
RESOLVED
}

enum GraphNodeType {
LEGAL_ACT
ARTICLE
GUIDANCE
PROCEDURE
CONCEPT
OBLIGATION
EXCEPTION
ENTITY_TYPE
EVENT
}

enum GraphRelationType {
AMENDS
INTERPRETS
REQUIRES
EXEMPTS
DEPENDS_ON
REFERENCES
}

enum AuditEntityType {
RULE
RELEASE
CONFLICT
EVIDENCE
POINTER
CONCEPT
GRAPH_NODE
GRAPH_EDGE
}

model Evidence {
id String @id @default(cuid())
source EvidenceSource
publisher String
url String
fetchedAt DateTime
contentHash String
rawContentPath String
extractedTextPath String?
contentType EvidenceContentType
effectiveDate DateTime?
status EvidenceStatus @default(PENDING)

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

pointers SourcePointer[]
auditLogs AuditLog[]

@@index([source, fetchedAt])
@@index([contentHash])
@@unique([url, contentHash])
}

model SourcePointer {
id String @id @default(cuid())
evidenceId String
type PointerType
// locator: store JSON for pdf spans (page, bbox), selectors, article/paragraph refs
locator Json
excerpt String

createdAt DateTime @default(now())

evidence Evidence @relation(fields: [evidenceId], references: [id], onDelete: Cascade)
ruleLinks RulePointer[]

auditLogs AuditLog[]

@@index([evidenceId, type])
}

model Concept {
id String @id @default(cuid())
name String @unique
aliases String[] // Postgres text[]
tags String[] // Postgres text[]

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

ruleLinks RuleConcept[]
graphNodes GraphNode[]

auditLogs AuditLog[]
}

model Rule {
id String @id // allow semantic IDs like "RULE-VAT-THRESHOLD"
topic String
ruleType RuleType

statement String
// AppliesWhen DSL stored as JSON (see DSL section)
appliesWhen Json
// Outcome payload stored as JSON (value/action/steps)
outcome Json

effectiveFrom DateTime
effectiveUntil DateTime?

authorityLevel AuthorityLevel
parseConfidence Float // 0..1
riskLevel RiskLevel
ruleStability RuleStability

automationPolicy AutomationPolicy
status RuleStatus @default(DRAFT)

humanVerifiedBy String?
verifiedAt DateTime?

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

pointers RulePointer[]
concepts RuleConcept[]

conflictsA Conflict[] @relation("ConflictRuleA")
conflictsB Conflict[] @relation("ConflictRuleB")

releaseLinks ReleaseRule[]

auditLogs AuditLog[]

@@index([topic, ruleType])
@@index([status])
@@index([effectiveFrom, effectiveUntil])
}

model RulePointer {
ruleId String
pointerId String

// Optional: store “role” of pointer (supporting, contradicting, example)
role String?

createdAt DateTime @default(now())

rule Rule @relation(fields: [ruleId], references: [id], onDelete: Cascade)
pointer SourcePointer @relation(fields: [pointerId], references: [id], onDelete: Cascade)

@@id([ruleId, pointerId])
@@index([pointerId])
}

model RuleConcept {
ruleId String
conceptId String

createdAt DateTime @default(now())

rule Rule @relation(fields: [ruleId], references: [id], onDelete: Cascade)
concept Concept @relation(fields: [conceptId], references: [id], onDelete: Cascade)

@@id([ruleId, conceptId])
@@index([conceptId])
}

model Conflict {
id String @id @default(cuid())
description String
severity ConflictSeverity
resolutionPolicy ConflictResolutionPolicy
recommendedAction String
automationBlocked Boolean @default(true)
status ConflictStatus @default(OPEN)

// Pairwise relationship to rules (extendable later to N rules via join table if needed)
ruleAId String
ruleBId String
ruleA Rule @relation("ConflictRuleA", fields: [ruleAId], references: [id], onDelete: Cascade)
ruleB Rule @relation("ConflictRuleB", fields: [ruleBId], references: [id], onDelete: Cascade)

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

auditLogs AuditLog[]

@@index([status, severity])
}

model Release {
id String @id @default(cuid())
version String @unique // "YYYY.MM.DD"
publishedAt DateTime
approvedBy String

changelog String[] // text[]
createdAt DateTime @default(now())

rules ReleaseRule[]

auditLogs AuditLog[]
}

model ReleaseRule {
releaseId String
ruleId String

createdAt DateTime @default(now())

release Release @relation(fields: [releaseId], references: [id], onDelete: Cascade)
rule Rule @relation(fields: [ruleId], references: [id], onDelete: Cascade)

@@id([releaseId, ruleId])
@@index([ruleId])
}

model GraphNode {
id String @id @default(cuid())
type GraphNodeType
// Optional: store human-readable key, like act name, article number, etc.
key String?
label String
data Json?

validFrom DateTime?
validTo DateTime?

// Link to Concept optionally (for Concept nodes)
conceptId String?
concept Concept? @relation(fields: [conceptId], references: [id], onDelete: SetNull)

edgesOut GraphEdge[] @relation("GraphEdgeOut")
edgesIn GraphEdge[] @relation("GraphEdgeIn")

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

auditLogs AuditLog[]

@@index([type])
@@index([validFrom, validTo])
}

model GraphEdge {
id String @id @default(cuid())
fromId String
toId String
relation GraphRelationType

validFrom DateTime?
validTo DateTime?

data Json?

from GraphNode @relation("GraphEdgeOut", fields: [fromId], references: [id], onDelete: Cascade)
to GraphNode @relation("GraphEdgeIn", fields: [toId], references: [id], onDelete: Cascade)

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

auditLogs AuditLog[]

@@index([relation])
@@index([fromId, relation])
@@index([toId, relation])
@@index([validFrom, validTo])
}

model AuditLog {
id String @id @default(cuid())
action String
entityType AuditEntityType
entityId String
performedBy String
performedAt DateTime @default(now())
metadata Json?

// Optional soft links (no FK because entityId points to many tables)
// You can add convenience fields if you want strict FK per entity type later.

evidenceId String?
evidence Evidence? @relation(fields: [evidenceId], references: [id], onDelete: SetNull)

pointerId String?
pointer SourcePointer? @relation(fields: [pointerId], references: [id], onDelete: SetNull)

ruleId String?
rule Rule? @relation(fields: [ruleId], references: [id], onDelete: SetNull)

conflictId String?
conflict Conflict? @relation(fields: [conflictId], references: [id], onDelete: SetNull)

releaseId String?
release Release? @relation(fields: [releaseId], references: [id], onDelete: SetNull)

conceptId String?
concept Concept? @relation(fields: [conceptId], references: [id], onDelete: SetNull)

graphNodeId String?
graphNode GraphNode? @relation(fields: [graphNodeId], references: [id], onDelete: SetNull)

graphEdgeId String?
graphEdge GraphEdge? @relation(fields: [graphEdgeId], references: [id], onDelete: SetNull)

@@index([entityType, entityId])
@@index([performedBy, performedAt])
}

Notes

Rule.id is string primary key intentionally so you can use stable semantic IDs.

Rule.appliesWhen and Rule.outcome are JSON by design. That’s your DSL and outcome schema.

If you later want N-way conflicts, switch Conflict to a join table ConflictRuleLink[]. Pairwise is enough to start.

AuditLog includes optional foreign keys for convenience while still supporting polymorphic entityType/entityId.
