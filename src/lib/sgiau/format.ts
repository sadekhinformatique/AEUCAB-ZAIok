import { CURRENCY } from "./constants"

export function formatCurrency(amount: number | null | undefined): string {
  const value = Number(amount ?? 0)
  return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} ${CURRENCY}`
}

export function formatNumber(value: number | null | undefined): string {
  return Number(value ?? 0).toLocaleString("fr-FR")
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—"
  const d = typeof date === "string" ? new Date(date) : date
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—"
  const d = typeof date === "string" ? new Date(date) : date
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function initials(firstName?: string | null, lastName?: string | null): string {
  const a = firstName?.trim()?.[0] ?? ""
  const b = lastName?.trim()?.[0] ?? ""
  return (a + b).toUpperCase() || "?"
}

export function genReference(prefix: string): string {
  const ts = Date.now().toString(36).toUpperCase().slice(-6)
  const rnd = Math.random().toString(36).toUpperCase().slice(2, 6)
  return `${prefix}-${ts}-${rnd}`
}

export function genMatricule(year: string, seq: number): string {
  return `${year}-${String(seq).padStart(4, "0")}`
}

export function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ""
  const headers = Object.keys(rows[0])
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v)
    return `"${s.replace(/"/g, '""')}"`
  }
  const lines = [headers.join(",")]
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","))
  }
  return lines.join("\n")
}

export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
