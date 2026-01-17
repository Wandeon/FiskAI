# Repo Split DB Role and Permission Matrix (Per Table)

> Created: 2026-01-17
> Scope: fiskai-repo (current schema)
> Legend: Owner = target owner after split; App/Workers access = intended DB role privileges.

## Public schema (prisma/schema.prisma)

| Table                        | Owner   | App Access | Workers Access | Notes                             |
| ---------------------------- | ------- | ---------- | -------------- | --------------------------------- |
| User                         | app     | RW         | None           |                                   |
| Account                      | app     | RW         | None           |                                   |
| Session                      | app     | RW         | None           |                                   |
| VerificationToken            | app     | RW         | None           |                                   |
| VerificationCode             | app     | RW         | None           |                                   |
| PasswordResetToken           | app     | RW         | None           |                                   |
| Company                      | app     | RW         | None           |                                   |
| ChartOfAccounts              | app     | RW         | None           |                                   |
| AccountingPeriod             | app     | RW         | None           |                                   |
| ReportingStatus              | app     | RW         | None           |                                   |
| ReviewQueueItem              | app     | RW         | None           |                                   |
| ReviewDecision               | app     | RW         | None           |                                   |
| JournalEntry                 | app     | RW         | None           |                                   |
| JournalLine                  | app     | RW         | None           |                                   |
| TrialBalance                 | app     | RW         | None           |                                   |
| PostingRule                  | app     | RW         | None           |                                   |
| OperationalEvent             | app     | RW         | None           |                                   |
| ExportProfile                | app     | RW         | None           |                                   |
| AccountMapping               | app     | RW         | None           |                                   |
| ExportJob                    | app     | RW         | None           |                                   |
| Employee                     | app     | RW         | None           |                                   |
| EmployeeRole                 | app     | RW         | None           |                                   |
| EmploymentContract           | app     | RW         | None           |                                   |
| EmploymentContractVersion    | app     | RW         | None           |                                   |
| EmploymentTerminationEvent   | app     | RW         | None           |                                   |
| Dependent                    | app     | RW         | None           |                                   |
| Allowance                    | app     | RW         | None           |                                   |
| PensionPillar                | app     | RW         | None           |                                   |
| EntitlementHistory           | app     | RW         | None           |                                   |
| CompanyUser                  | app     | RW         | None           |                                   |
| StaffAssignment              | app     | RW         | None           |                                   |
| ClientInvitation             | app     | RW         | None           |                                   |
| StaffReview                  | app     | RW         | None           |                                   |
| Contact                      | app     | RW         | None           |                                   |
| Address                      | app     | RW         | None           |                                   |
| Organization                 | app     | RW         | None           |                                   |
| TaxIdentity                  | app     | RW         | None           |                                   |
| Person                       | app     | RW         | None           |                                   |
| PersonContactRole            | app     | RW         | None           |                                   |
| PersonEmployeeRole           | app     | RW         | None           |                                   |
| PersonDirectorRole           | app     | RW         | None           |                                   |
| PersonSnapshot               | app     | RW         | None           |                                   |
| PersonEvent                  | app     | RW         | None           |                                   |
| Product                      | app     | RW         | None           |                                   |
| Warehouse                    | app     | RW         | None           |                                   |
| StockItem                    | app     | RW         | None           |                                   |
| StockMovement                | app     | RW         | None           |                                   |
| ValuationSnapshot            | app     | RW         | None           |                                   |
| EInvoice                     | app     | RW         | None           |                                   |
| EInvoiceLine                 | app     | RW         | None           |                                   |
| EmailSuppression             | app     | RW         | None           |                                   |
| RevenueRegisterEntry         | app     | RW         | None           |                                   |
| InvoiceEvent                 | app     | RW         | None           |                                   |
| AuditLog                     | app     | RW         | None           |                                   |
| CashIn                       | app     | RW         | None           |                                   |
| CashOut                      | app     | RW         | None           |                                   |
| CashDayClose                 | app     | RW         | None           |                                   |
| CashLimitSetting             | app     | RW         | None           |                                   |
| BusinessPremises             | app     | RW         | None           |                                   |
| PaymentDevice                | app     | RW         | None           |                                   |
| InvoiceSequence              | app     | RW         | None           |                                   |
| Expense                      | app     | RW         | None           |                                   |
| ExpenseLine                  | app     | RW         | None           |                                   |
| SupplierBill                 | app     | RW         | None           |                                   |
| UraInput                     | app     | RW         | None           |                                   |
| Attachment                   | app     | RW         | None           |                                   |
| Document                     | app     | RW         | None           |                                   |
| ExpenseCorrection            | app     | RW         | None           |                                   |
| FixedAssetCandidate          | app     | RW         | None           |                                   |
| ExpenseCategory              | app     | RW         | None           |                                   |
| RecurringExpense             | app     | RW         | None           |                                   |
| TravelOrder                  | app     | RW         | None           |                                   |
| MileageLog                   | app     | RW         | None           |                                   |
| TravelPdf                    | app     | RW         | None           |                                   |
| SavedReport                  | app     | RW         | None           |                                   |
| BankAccount                  | app     | RW         | None           |                                   |
| BankTransaction              | app     | RW         | None           |                                   |
| MatchRecord                  | app     | RW         | None           |                                   |
| UnappliedPayment             | app     | RW         | None           |                                   |
| BankConnection               | app     | RW         | None           |                                   |
| PotentialDuplicate           | app     | RW         | None           |                                   |
| EmailConnection              | app     | RW         | None           |                                   |
| EmailImportRule              | app     | RW         | None           |                                   |
| EmailAttachment              | app     | RW         | None           |                                   |
| StatementImport              | app     | RW         | None           |                                   |
| ImportJob                    | app     | RW         | None           |                                   |
| Statement                    | app     | RW         | None           |                                   |
| StatementPage                | app     | RW         | None           |                                   |
| Transaction                  | app     | RW         | None           |                                   |
| SupportTicket                | app     | RW         | None           |                                   |
| SupportTicketMessage         | app     | RW         | None           |                                   |
| SupportTicketAttachment      | app     | RW         | None           |                                   |
| WebAuthnCredential           | app     | RW         | None           |                                   |
| FiscalCertificate            | app     | RW         | None           |                                   |
| IntegrationAccount           | app     | RW         | None           |                                   |
| CertificateNotification      | app     | RW         | None           |                                   |
| FiscalRequest                | app     | RW         | None           |                                   |
| FiscalResponse               | app     | RW         | None           |                                   |
| AIFeedback                   | app     | RW         | None           |                                   |
| AIUsage                      | app     | RW         | None           |                                   |
| ArticleJob                   | workers | R          | RW             | Article pipeline (worker-driven). |
| FactSheet                    | workers | R          | RW             | Article pipeline synthesis.       |
| Claim                        | workers | R          | RW             | Article pipeline claims.          |
| SourceChunk                  | workers | R          | RW             | Article pipeline sources.         |
| ArticleDraft                 | workers | R          | RW             | Article pipeline drafts.          |
| DraftParagraph               | workers | R          | RW             | Article pipeline drafts.          |
| ClaimVerification            | workers | R          | RW             | Article pipeline verification.    |
| Payout                       | app     | RW         | None           |                                   |
| PayoutLine                   | app     | RW         | None           |                                   |
| Payslip                      | app     | RW         | None           |                                   |
| PayslipArtifact              | app     | RW         | None           |                                   |
| CalculationSnapshot          | app     | RW         | None           |                                   |
| AppliedRuleSnapshot          | app     | RW         | None           |                                   |
| BankPaymentExport            | app     | RW         | None           |                                   |
| BankPaymentLine              | app     | RW         | None           |                                   |
| JoppdSubmission              | app     | RW         | None           |                                   |
| JoppdSubmissionLine          | app     | RW         | None           |                                   |
| JoppdSubmissionEvent         | app     | RW         | None           |                                   |
| DiscoveryEndpoint            | workers | R          | RW             | RTL discovery config.             |
| BackfillRun                  | workers | R          | RW             | RTL backfill tracking.            |
| DiscoveredItem               | workers | R          | RW             | RTL discovery queue state.        |
| SourcePointer                | workers | R          | RW             | RTL evidence linkage.             |
| Concept                      | workers | R          | RW             | RTL concepts.                     |
| ConceptEmbedding             | app     | RW         | None           |                                   |
| RegulatoryRule               | workers | R          | RW             | RTL output. App should read-only. |
| AuditSnapshot                | workers | R          | RW             | RTL audit snapshots.              |
| AtomicClaim                  | workers | R          | RW             | RTL atomic claims.                |
| ClaimException               | workers | R          | RW             | RTL claim exceptions.             |
| CandidateFact                | workers | R          | RW             | RTL extraction output.            |
| ConceptNode                  | workers | R          | RW             | RTL concept graph.                |
| RegulatoryProcess            | workers | R          | RW             | RTL processes.                    |
| ProcessStep                  | workers | R          | RW             | RTL processes.                    |
| ReferenceTable               | workers | R          | RW             | RTL references.                   |
| ReferenceEntry               | workers | R          | RW             | RTL references.                   |
| RegulatoryAsset              | workers | R          | RW             | RTL assets.                       |
| TransitionalProvision        | workers | R          | RW             | RTL legal transitions.            |
| TruthHealthSnapshot          | workers | R          | RW             | RTL health snapshots.             |
| GraphEdge                    | workers | R          | RW             | RTL knowledge graph.              |
| RuleRelease                  | workers | R          | RW             | RTL release tracking.             |
| AgentRun                     | workers | R          | RW             | RTL execution audit trail.        |
| AgentResultCache             | workers | R          | RW             | RTL caching.                      |
| PipelineProgress             | workers | R          | RW             | RTL pipeline progress.            |
| SourceHealth                 | workers | R          | RW             | RTL source health.                |
| RegulatoryConflict           | workers | R          | RW             | RTL conflicts.                    |
| RegulatoryAuditLog           | workers | R          | RW             | RTL audit log.                    |
| HumanReviewQueue             | workers | R          | RW             | RTL human review backlog.         |
| WatchdogHealth               | workers | R          | RW             | RTL watchdog.                     |
| WatchdogAlert                | workers | R          | RW             | RTL watchdog.                     |
| AdminAlert                   | app     | RW         | None           |                                   |
| WatchdogAudit                | workers | R          | RW             | RTL watchdog.                     |
| SoftFailLog                  | workers | R          | RW             | RTL soft-fail tracking.           |
| ReasoningTrace               | app     | RW         | None           |                                   |
| BetaFeedback                 | app     | RW         | None           |                                   |
| CoverageReport               | workers | R          | RW             | RTL quality metrics.              |
| ComparisonMatrix             | workers | R          | RW             | RTL quality metrics.              |
| SystemRegistryStatusSnapshot | app     | RW         | None           |                                   |
| SystemRegistryStatusPointer  | app     | RW         | None           |                                   |
| SystemRegistryStatusEvent    | app     | RW         | None           |                                   |
| SystemRegistryRefreshJob     | app     | RW         | None           |                                   |
| SystemRegistryRefreshLock    | app     | RW         | None           |                                   |
| FeatureFlag                  | app     | RW         | None           |                                   |
| Artifact                     | app     | RW         | None           |                                   |
| Permission                   | app     | RW         | None           |                                   |
| RolePermission               | app     | RW         | None           |                                   |
| FeatureFlagOverride          | app     | RW         | None           |                                   |
| FeatureFlagAuditLog          | app     | RW         | None           |                                   |
| UserSegment                  | app     | RW         | None           |                                   |
| SegmentMembershipHistory     | app     | RW         | None           |                                   |
| SegmentFeatureTarget         | app     | RW         | None           |                                   |
| Experiment                   | app     | RW         | None           |                                   |
| ExperimentSegment            | app     | RW         | None           |                                   |
| ExperimentVariant            | app     | RW         | None           |                                   |
| ExperimentAssignment         | app     | RW         | None           |                                   |
| ExperimentEvent              | app     | RW         | None           |                                   |
| WebhookSubscription          | workers | R          | RW             | RTL webhook ingest.               |
| WebhookEvent                 | workers | R          | RW             | RTL webhook ingest.               |
| CronJobError                 | app     | RW         | None           |                                   |
| FixedAsset                   | app     | RW         | None           |                                   |
| DepreciationSchedule         | app     | RW         | None           |                                   |
| DepreciationEntry            | app     | RW         | None           |                                   |
| DisposalEvent                | app     | RW         | None           |                                   |
| AssetCandidate               | app     | RW         | None           |                                   |
| OutboxEvent                  | app     | RW         | None           |                                   |
| ProviderSyncState            | app     | RW         | None           |                                   |

## Regulatory schema (prisma/regulatory.prisma)

| Table                   | Owner   | App Access | Workers Access | Notes                         |
| ----------------------- | ------- | ---------- | -------------- | ----------------------------- |
| RegulatorySource        | workers | R          | RW             | Regulatory schema (RTL-only). |
| Evidence                | workers | R          | RW             | Regulatory schema (RTL-only). |
| EvidenceArtifact        | workers | R          | RW             | Regulatory schema (RTL-only). |
| ExtractionRejected      | workers | R          | RW             | Regulatory schema (RTL-only). |
| ConflictResolutionAudit | workers | R          | RW             | Regulatory schema (RTL-only). |
| MonitoringAlert         | workers | R          | RW             | Regulatory schema (RTL-only). |
| RuleTable               | workers | R          | RW             | Regulatory schema (RTL-only). |
| RuleVersion             | workers | R          | RW             | Regulatory schema (RTL-only). |
| RuleSnapshot            | workers | R          | RW             | Regulatory schema (RTL-only). |
| RuleCalculation         | workers | R          | RW             | Regulatory schema (RTL-only). |
| RuleFact                | workers | R          | RW             | Regulatory schema (RTL-only). |
| SchedulerRun            | workers | R          | RW             | Regulatory schema (RTL-only). |
| RuleFactSnapshot        | workers | R          | RW             | Regulatory schema (RTL-only). |
| RuleFeedback            | workers | R          | RW             | Regulatory schema (RTL-only). |
| RuleRevalidation        | workers | R          | RW             | Regulatory schema (RTL-only). |
| ConfidenceCalibration   | workers | R          | RW             | Regulatory schema (RTL-only). |

## Assumptions and adjustments

- App-owned tables default to no worker access; grant read/write only if a worker remains in the workers repo (for example, if e-invoice inbound or outbox is moved).
- Article pipeline tables are marked as worker-owned because `worker-article` runs in the workers stack; if article generation moves to the app repo, flip these to app-owned.
- Webhook tables are marked worker-owned because RTL webhook ingestion currently lives under `src/lib/regulatory-truth/webhooks/*`.
- If regulatory tables migrate from public schema into the regulatory schema, keep the access rules the same but move ownership to the regulatory database.
