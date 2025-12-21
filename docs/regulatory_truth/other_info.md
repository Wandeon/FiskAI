2. appliesWhen predicate DSL (spec + examples)

Goal: a machine-evaluable, time-aware, composable predicate language that’s:

explicit (no hidden logic)

auditable

safe for LLM-assisted generation (but validated by your code)

2.1 DSL shape

Store appliesWhen as JSON with this grammar:

type AppliesWhen =
| { op: "and" | "or"; args: AppliesWhen[] }
| { op: "not"; arg: AppliesWhen }
| { op: "cmp"; field: FieldRef; cmp: CmpOp; value: JsonValue }
| { op: "in"; field: FieldRef; values: JsonValue[] }
| { op: "exists"; field: FieldRef }
| { op: "between"; field: FieldRef; gte?: JsonValue; lte?: JsonValue }
| { op: "matches"; field: FieldRef; pattern: string } // regex, optional
| { op: "date_in_effect"; dateField: FieldRef; on?: string }; // for scenario date selection

type FieldRef = string; // dotpath, e.g. "entity.type", "txn.amount", "entity.vat.status"
type CmpOp = "eq" | "neq" | "gt" | "gte" | "lt" | "lte";

2.2 Standard context object

Your evaluator should receive a context object, same shape everywhere:

type Context = {
asOf: string; // ISO date-time, scenario time
entity: {
type: "OBRT" | "DOO" | "JDOO" | "UDRUGA" | "OTHER";
obrtSubtype?: "PAUSALNI" | "DOHODAS" | "DOBITAS";
vat: { status: "IN_VAT" | "OUTSIDE_VAT" | "UNKNOWN"; };
activityNkd?: string;
location?: { country: "HR"; county?: string; };
};
txn?: {
kind: "SALE" | "PURCHASE" | "PAYMENT" | "PAYROLL" | "OTHER";
b2b?: boolean;
paymentMethod?: "CASH" | "CARD" | "TRANSFER" | "OTHER";
amount?: number;
currency?: "EUR";
itemCategory?: string;
date?: string;
};
counters?: {
revenueYtd?: number;
invoicesThisMonth?: number;
};
flags?: {
isAutomationRequest?: boolean;
};
};

2.3 Evaluation rules

Missing fields evaluate as:

exists false

cmp false (unless you explicitly handle UNKNOWN)

asOf must be passed and used for:

selecting active rules by effectiveFrom/effectiveUntil

any “date_in_effect” checks

2.4 Examples

Example A: Rule applies to paušalni obrt outside VAT

{
"op": "and",
"args": [
{ "op": "cmp", "field": "entity.type", "cmp": "eq", "value": "OBRT" },
{ "op": "cmp", "field": "entity.obrtSubtype", "cmp": "eq", "value": "PAUSALNI" },
{ "op": "cmp", "field": "entity.vat.status", "cmp": "eq", "value": "OUTSIDE_VAT" }
]
}

Example B: Cash payment requires fiskalization

{
"op": "and",
"args": [
{ "op": "cmp", "field": "txn.kind", "cmp": "eq", "value": "SALE" },
{ "op": "in", "field": "txn.paymentMethod", "values": ["CASH", "CARD"] }
]
}

Example C: Threshold rule, revenueYtd exceeds 40k

{
"op": "cmp",
"field": "counters.revenueYtd",
"cmp": "gt",
"value": 40000
}

2.5 Outcome schema (so rules can drive actions)

I recommend you standardize outcome so automation logic can be consistent:

type Outcome =
| {
kind: "VALUE";
value: any; // number/string/object
unit?: string;
}
| {
kind: "OBLIGATION";
obligation: {
code: string; // e.g., "SUBMIT_PDV", "ISSUE_E_INVOICE"
description: string;
deadline?: { type: "RELATIVE" | "FIXED"; value: any };
steps?: { title: string; details?: string }[];
};
}
| {
kind: "PROCEDURE";
procedure: {
system: "FINA" | "POREZNA" | "HZMO" | "HZZO" | "OTHER";
action: string;
payloadSchema?: any;
};
};

This makes it possible to:

answer questions

generate checklists

later trigger automations safely (only if policy allows)

2.6 Validation and safety gates (non-negotiable)

Every appliesWhen must validate against your grammar.

Every field must be in an allowlist of known field paths.

Every rule must declare riskLevel and automationPolicy.

If riskLevel=HIGH, default automationPolicy=BLOCK unless manually overridden and verified.

3. Reviewer dashboard UX (practical and buildable)

Design goal: a “newsroom + CI/CD console” where reviewers:

process incoming change proposals fast

see exact evidence snippets and diffs

approve/reject/edit rules

resolve conflicts explicitly

publish versioned releases

see backlog and system health

3.1 Information architecture

Main nav

Inbox

Conflicts

Releases

Evidence

Rules

Concepts

Graph (optional early)

System Health (jobs + staleness)

3.2 Inbox (Draft Rules)

Primary screen: Draft queue

Filters:

Source (NN / Porezna / FINA / HZMO / HZZO)

Topic

Risk level

Authority level

“Automation impacted”

Effective date window

Each row shows:

Rule ID + topic

Proposed change type (threshold/deadline/obligation/etc.)

Authority level (LAW/GUIDANCE/…)

Risk level (LOW/MED/HIGH)

Parse confidence

EffectiveFrom

Status badges: “NEW”, “STALE-IMPACT”, “BLOCKS AUTOMATION”

Click a row → Split review layout (2-column)

Left column: “What changed”

Previous rule snapshot (current ACTIVE)

Proposed DRAFT rule

Diff view for:

statement

appliesWhen JSON (rendered as readable chips)

outcome JSON (rendered as structured)

EffectiveFrom/Until controls

Right column: “Why we believe it”

Evidence panel:

evidence title + source + fetchedAt

content hash + snapshot link (open raw PDF/HTML)

SourcePointer panel:

excerpt(s) highlighted

page number or selector

Change classification:

threshold/deadline/definition/etc.

“semantic change” yes/no

Bottom bar: Reviewer actions

Approve

Approve with edits

Reject

Send to conflict

Mark as “needs legal review”

Set automation policy override (only for authorized role)

Approval requires:

at least 1 SourcePointer attached

risk level set

automation policy set

effectiveFrom set

3.3 Conflicts screen

Purpose: make disagreements explicit and resolved intentionally.

Conflict list view

severity, status, automationBlocked, involved rules

“layer mismatch” indicator (LAW vs GUIDANCE etc.)

time relevance (effectiveFrom is upcoming or already active)

Conflict detail view

Side-by-side:

Rule A + citations

Rule B + citations

“Resolution decision” controls:

resolutionPolicy

recommendedAction (free text + templates)

set which rule is “operational winner” (enforcement)

optionally: create a new “Resolution Rule” that merges both:

statement includes both

outcome uses conservative default

metadata warns about divergence

One-button action

“Block automation for topic until resolved” (bulk safety)

3.4 Releases screen

Release builder

shows list of “Approved but not released” rules

shows how many active rules will change

shows affected topics and risk distribution

shows regression test status

Publish flow

choose version (default YYYY.MM.DD)

require:

changelog items auto-generated + editable

approvedBy identity

tests green OR explicit override + reason (logged)

After publish

immutable release view:

diff summary

rule list

evidence list touched

audit log export

3.5 Evidence screen

searchable by source, date, url, hash

status pipeline view (pending/processed/ignored)

“diff against previous snapshot” button

“create pointers” tool:

for PDF: select page range + highlight excerpt (store bbox)

for HTML: pick DOM selector + excerpt

“linked rules” and “linked conflicts” widgets

3.6 Rules screen

query active rules by topic, date, risk

time travel slider: “as of”

view:

statement

appliesWhen rendered

outcome rendered

pointers

conflicts

releases included

audit trail

3.7 System Health screen

This prevents the “daily chaos” failure mode.

Must show:

last successful ingest per source

pending evidence count

draft rules awaiting review

open conflicts count

stale rules count (by risk)

automation blocked topics

regression test last run

3.8 UX rules that matter

Every approve/reject/edit produces an AuditLog entry automatically.

Any HIGH risk rule cannot be published without:

humanVerifiedBy + verifiedAt

Any conflict involving LAW vs GUIDANCE defaults to:

automation blocked until resolution

If you want the fastest build path

Tell your team to implement in this order:

Evidence + SourcePointer + AuditLog + basic admin pages

Rule CRUD with appliesWhen/outcome renderer + approvals

Release builder + versioned publish

Conflict workflows

Graph nodes/edges + impact mapping

Only then: RAG assistant for explanations

That order avoids building a clever system that can’t be trusted.
