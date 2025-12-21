"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Modal, ModalFooter } from "@/components/ui/modal"
import { Mail, Gift, Download, Flag } from "lucide-react"
import { toast } from "@/lib/toast"
import type { TenantDetail } from "@/lib/admin/tenant-health"

const AVAILABLE_MODULES = [
  { key: "invoicing", name: "Invoicing" },
  { key: "e-invoicing", name: "E-Invoicing" },
  { key: "fiscalization", name: "Fiscalization" },
  { key: "contacts", name: "Contacts" },
  { key: "products", name: "Products" },
  { key: "expenses", name: "Expenses" },
  { key: "banking", name: "Banking" },
  { key: "reconciliation", name: "Reconciliation" },
  { key: "reports-basic", name: "Basic Reports" },
  { key: "reports-advanced", name: "Advanced Reports" },
  { key: "pausalni", name: "Pausalni" },
  { key: "vat", name: "VAT" },
  { key: "corporate-tax", name: "Corporate Tax" },
  { key: "pos", name: "POS" },
  { key: "documents", name: "Documents" },
  { key: "ai-assistant", name: "AI Assistant" },
]

const AVAILABLE_FLAGS = [
  { key: "needs-help", name: "Needs Help", color: "yellow" },
  { key: "at-risk", name: "At Risk", color: "orange" },
  { key: "churning", name: "Churning", color: "red" },
]

export function TenantDetailView({ tenant }: { tenant: TenantDetail }) {
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [giftModalOpen, setGiftModalOpen] = useState(false)
  const [flagModalOpen, setFlagModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Email form state
  const [emailSubject, setEmailSubject] = useState("")
  const [emailBody, setEmailBody] = useState("")

  // Gift module state
  const [selectedModule, setSelectedModule] = useState("")

  // Flag state
  const [selectedFlag, setSelectedFlag] = useState("")
  const [flagReason, setFlagReason] = useState("")
  const [flagAction, setFlagAction] = useState<"add" | "remove">("add")

  const handleSendEmail = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) {
      toast.error("Please fill in all fields")
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/admin/tenants/${tenant.profile.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "email",
          subject: emailSubject,
          body: emailBody,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to send email")
      }

      toast.success("Email sent successfully")
      setEmailModalOpen(false)
      setEmailSubject("")
      setEmailBody("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send email")
    } finally {
      setLoading(false)
    }
  }

  const handleGiftModule = async () => {
    if (!selectedModule) {
      toast.error("Please select a module")
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/admin/tenants/${tenant.profile.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "gift-module",
          moduleKey: selectedModule,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to gift module")
      }

      toast.success("Module gifted successfully")
      setGiftModalOpen(false)
      setSelectedModule("")
      window.location.reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to gift module")
    } finally {
      setLoading(false)
    }
  }

  const handleFlag = async () => {
    if (!selectedFlag || !flagReason.trim()) {
      toast.error("Please fill in all fields")
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/admin/tenants/${tenant.profile.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "flag",
          flag: selectedFlag,
          reason: flagReason,
          flagAction,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update flag")
      }

      toast.success(`Flag ${flagAction === "add" ? "added" : "removed"} successfully`)
      setFlagModalOpen(false)
      setSelectedFlag("")
      setFlagReason("")
      window.location.reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update flag")
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/tenants/${tenant.profile.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "export" }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to export data")
      }

      // Download as JSON file
      const blob = new Blob([JSON.stringify(data.data, null, 2)], {
        type: "application/json",
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `tenant-${tenant.profile.oib}-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success("Data exported successfully")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to export data")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{tenant.profile.name}</h1>
          <p className="text-muted-foreground">OIB: {tenant.profile.oib}</p>
        </div>
        <div className="flex gap-2">
          {tenant.flags.map((flag) => (
            <Badge key={flag} variant="destructive">
              {flag}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Profile */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>Legal Form: {tenant.profile.legalForm}</p>
            <p>VAT: {tenant.profile.isVatPayer ? "Yes" : "No"}</p>
            <p>Since: {tenant.profile.createdAt.toLocaleDateString()}</p>
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>Plan: {tenant.subscription.plan}</p>
            <Badge>{tenant.subscription.status}</Badge>
          </CardContent>
        </Card>

        {/* Owner */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Owner</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>{tenant.owner?.email || "No owner"}</p>
            <p className="text-muted-foreground">
              Last login: {tenant.owner?.lastLoginAt?.toLocaleDateString() || "Never"}
            </p>
          </CardContent>
        </Card>

        {/* Health */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              Onboarding:{" "}
              {tenant.health.onboardingComplete
                ? "Complete"
                : `Step ${tenant.health.onboardingStep}`}
            </p>
            <p>Competence: {tenant.health.competenceLevel}</p>
            <p>30-day activity: {tenant.health.thirtyDayActivity} invoices</p>
          </CardContent>
        </Card>
      </div>

      {/* 60k Limit Tracker */}
      <Card>
        <CardHeader>
          <CardTitle>60k Limit Tracker</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between text-sm">
            <span>Current: €{tenant.limitTracker.currentRevenue.toFixed(2)}</span>
            <span>Limit: €{tenant.limitTracker.limit.toLocaleString()}</span>
          </div>
          <Progress
            value={Math.min(tenant.limitTracker.percentage, 100)}
            className={
              tenant.limitTracker.status === "critical"
                ? "bg-red-200"
                : tenant.limitTracker.status === "warning"
                  ? "bg-amber-200"
                  : ""
            }
          />
          <p className="text-sm text-muted-foreground">
            Projected yearly: €{tenant.limitTracker.projectedYearly.toFixed(2)}
          </p>
        </CardContent>
      </Card>

      {/* Admin Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Admin Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEmailModalOpen(true)}>
            <Mail className="mr-2 h-4 w-4" />
            Email
          </Button>
          <Button variant="outline" size="sm" onClick={() => setGiftModalOpen(true)}>
            <Gift className="mr-2 h-4 w-4" />
            Gift Module
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={loading}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => setFlagModalOpen(true)}>
            <Flag className="mr-2 h-4 w-4" />
            Flag
          </Button>
        </CardContent>
      </Card>

      {/* Email Modal */}
      <Modal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        title="Send Email to Tenant"
        description="Send an email to the company owner"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="email-to">To</Label>
            <Input
              id="email-to"
              value={tenant.owner?.email || "No owner"}
              disabled
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="email-subject">Subject</Label>
            <Input
              id="email-subject"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Email subject"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="email-body">Message</Label>
            <Textarea
              id="email-body"
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              placeholder="Email message"
              rows={6}
              className="mt-1"
            />
          </div>
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setEmailModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSendEmail} disabled={loading}>
            {loading ? "Sending..." : "Send Email"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Gift Module Modal */}
      <Modal
        isOpen={giftModalOpen}
        onClose={() => setGiftModalOpen(false)}
        title="Gift Module to Tenant"
        description="Add a module to the company's entitlements"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="module-select">Select Module</Label>
            <select
              id="module-select"
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
            >
              <option value="">Choose a module...</option>
              {AVAILABLE_MODULES.filter((m) => !tenant.modules.includes(m.key)).map((module) => (
                <option key={module.key} value={module.key}>
                  {module.name}
                </option>
              ))}
            </select>
          </div>
          {tenant.modules.length > 0 && (
            <div>
              <Label>Current Modules</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {tenant.modules.map((mod) => (
                  <Badge key={mod} variant="secondary">
                    {mod}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setGiftModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleGiftModule} disabled={loading}>
            {loading ? "Gifting..." : "Gift Module"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Flag Modal */}
      <Modal
        isOpen={flagModalOpen}
        onClose={() => setFlagModalOpen(false)}
        title="Manage Tenant Flag"
        description="Add or remove a flag from this tenant"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="flag-action">Action</Label>
            <select
              id="flag-action"
              value={flagAction}
              onChange={(e) => setFlagAction(e.target.value as "add" | "remove")}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
            >
              <option value="add">Add Flag</option>
              <option value="remove">Remove Flag</option>
            </select>
          </div>
          <div>
            <Label htmlFor="flag-select">Select Flag</Label>
            <select
              id="flag-select"
              value={selectedFlag}
              onChange={(e) => setSelectedFlag(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
            >
              <option value="">Choose a flag...</option>
              {AVAILABLE_FLAGS.map((flag) => (
                <option key={flag.key} value={flag.key}>
                  {flag.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="flag-reason">Reason</Label>
            <Textarea
              id="flag-reason"
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              placeholder="Why are you adding/removing this flag?"
              rows={3}
              className="mt-1"
            />
          </div>
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setFlagModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleFlag} disabled={loading}>
            {loading ? "Updating..." : flagAction === "add" ? "Add Flag" : "Remove Flag"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
