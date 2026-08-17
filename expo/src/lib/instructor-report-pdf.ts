import { Platform, Share } from "react-native"
import {
  buildInstructorReportExportFilename,
  formatReportCellValue,
  getReportTableColumns,
  reportTypeLabel,
  type SavedInstructorReport,
} from "./instructor-reports-utils"

async function printToPdfFile(html: string): Promise<string> {
  try {
    const Print = await import("expo-print")
    const { uri } = await Print.printToFileAsync({ html })
    return uri
  } catch (err) {
    const message =
      err instanceof Error && err.message.includes("ExpoPrint")
        ? "PDF export is not available in this build. Rebuild the iOS app after installing expo-print."
        : err instanceof Error
          ? err.message
          : "Could not generate PDF."
    throw new Error(message)
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function formatReportColumnLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function buildInstructorReportPdfHtml(report: SavedInstructorReport): string {
  const rows = report.data ?? []
  const columns = getReportTableColumns(rows)
  const typeLabel = escapeHtml(reportTypeLabel(report.type))
  const title = escapeHtml(report.title)
  const when = report.createdAt ?? report.generatedAt
  const generated = when
    ? escapeHtml(
        new Date(when).toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }),
      )
    : escapeHtml(new Date().toLocaleString())

  const head = columns
    .map((col) => `<th>${escapeHtml(formatReportColumnLabel(col))}</th>`)
    .join("")

  const body = rows
    .map((row) => {
      const cells = columns
        .map((col) => `<td>${escapeHtml(formatReportCellValue(row[col]))}</td>`)
        .join("")
      return `<tr>${cells}</tr>`
    })
    .join("")

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #111827; padding: 28px; }
    h1 { font-size: 22px; margin: 0 0 6px; }
    .meta { color: #667085; font-size: 13px; margin-bottom: 18px; }
    .summary { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
    .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px 14px; min-width: 120px; }
    .card-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #667085; }
    .card-value { font-size: 22px; font-weight: 700; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #e5e7eb; padding: 7px 8px; text-align: left; vertical-align: top; word-break: break-word; }
    th { background: #f9fafb; font-weight: 700; }
    tr:nth-child(even) td { background: #fcfcfd; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">${typeLabel} · Generated ${generated}</div>
  <div class="summary">
    <div class="card"><div class="card-label">Records</div><div class="card-value">${rows.length}</div></div>
    <div class="card"><div class="card-label">Columns</div><div class="card-value">${columns.length}</div></div>
  </div>
  ${
    rows.length
      ? `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
      : "<p>No tabular rows in this report.</p>"
  }
</body>
</html>`
}

export async function shareReportPdf(report: SavedInstructorReport): Promise<void> {
  if (!report.data?.length) throw new Error("This report has no data to export.")
  const html = buildInstructorReportPdfHtml(report)
  const uri = await printToPdfFile(html)
  const filename = buildInstructorReportExportFilename(report, "pdf")

  await Share.share({
    url: uri,
    title: filename,
    message: Platform.OS === "android" ? report.title : undefined,
  })
}

export async function shareStudentIndividualReportPdf(
  report: import("./instructor-reports-utils").StudentIndividualReportPayload,
): Promise<void> {
  const student = escapeHtml(report.student.fullName)
  const email = escapeHtml(report.student.email)
  const section = report.student.section ? escapeHtml(report.student.section) : "—"
  const rows = report.attempts ?? []
  const attemptRows = rows
    .map(
      (attempt) => `<tr>
        <td>${escapeHtml(attempt.quizTitle ?? "Attempt")}</td>
        <td>${attempt.percentage != null ? `${Math.round(attempt.percentage)}%` : "—"}</td>
        <td>${attempt.completedAt ? escapeHtml(String(attempt.completedAt).slice(0, 10)) : "—"}</td>
        <td>${attempt.tabSwitches ?? 0}</td>
        <td>${attempt.copyPasteAttempts ?? 0}</td>
      </tr>`,
    )
    .join("")

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<style>
  body { font-family: -apple-system, sans-serif; padding: 28px; color: #111827; }
  h1 { font-size: 22px; margin-bottom: 6px; }
  .meta { color: #667085; font-size: 13px; margin-bottom: 18px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
  th { background: #f9fafb; }
</style></head><body>
  <h1>${student}</h1>
  <div class="meta">${email} · Section ${section}</div>
  <p><strong>Average:</strong> ${Math.round(report.summary.avgPercentage)}% · <strong>Attempts:</strong> ${report.summary.completedAttempts}</p>
  <table><thead><tr><th>Assessment</th><th>Score</th><th>Completed</th><th>Tab switches</th><th>Copy/paste</th></tr></thead>
  <tbody>${attemptRows || "<tr><td colspan='5'>No attempts</td></tr>"}</tbody></table>
</body></html>`

  const uri = await printToPdfFile(html)
  await Share.share({
    url: uri,
    title: `${report.student.fullName}-student-report.pdf`,
    message: Platform.OS === "android" ? `${report.student.fullName} student report` : undefined,
  })
}
