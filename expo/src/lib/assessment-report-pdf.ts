import { Platform, Share } from "react-native"
import type { AssessmentAttemptResults, AssessmentResultQuestion } from "./assessment-results-api"
import { questionMarkdownToPrintHtml } from "./classroom-submission"
import { formatAssessmentType } from "../components/assessments/assessment-config"

async function printToPdfFile(html: string): Promise<string> {
  try {
    const Print = await import("expo-print")
    const { uri } = await Print.printToFileAsync({ html })
    return uri
  } catch (err) {
    const message =
      err instanceof Error && err.message.includes("ExpoPrint")
        ? "PDF export is not available in this build. Rebuild the iOS app (npm run ios) after installing expo-print."
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

function sanitizeFilenameSegment(input: string | null | undefined): string {
  if (!input?.trim()) return ""
  return input
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

export function buildAssessmentReportPdfFilename(data: AssessmentAttemptResults): string {
  const name = sanitizeFilenameSegment(data.student_name) || "student"
  const section = sanitizeFilenameSegment((data as { section?: string }).section) || "no-section"
  const type = sanitizeFilenameSegment(
    (data.assessment_type ?? "quiz").replace(/_/g, "-"),
  ) || "quiz"
  return `${name}-${section}-${type}.pdf`
}

function questionStatusLabel(q: AssessmentResultQuestion): string {
  if (q.requires_review) return "Pending"
  if (q.is_correct) return "Correct"
  const earned = Number(q.points_earned ?? 0)
  const hasAnswer = q.selected_answer != null && String(q.selected_answer).trim() !== ""
  if (!hasAnswer && earned <= 0) return "Skipped"
  return "Missed"
}

function buildReportHtml(data: AssessmentAttemptResults): string {
  const title = escapeHtml(data.quiz_title ?? "Assessment")
  const student = escapeHtml(data.student_name ?? "Student")
  const typeLabel = escapeHtml(formatAssessmentType(data.assessment_type))
  const pct = Math.round(data.percentage ?? 0)
  const score = data.score ?? 0
  const total = data.total_points ?? data.total_questions ?? 0
  const completed = data.completed_at
    ? new Date(data.completed_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : ""

  const sections = (data.section_breakdown ?? [])
    .map(
      (s) => `
      <tr>
        <td>${escapeHtml(s.title)}</td>
        <td>${s.weightPercent}%</td>
        <td>${Math.round(s.sectionPercentage)}%</td>
        <td>${s.earned} / ${s.max}</td>
      </tr>`,
    )
    .join("")

  const questions = (data.questions ?? [])
    .map((q, index) => {
      const order = q.question_order != null ? Number(q.question_order) : index + 1
      const prompt = questionMarkdownToPrintHtml(q.question_text ?? `Question ${order}`)
      const status = questionStatusLabel(q)
      const earned = Number(q.points_earned ?? 0)
      const maxPts = Number(q.max_points ?? q.points ?? 1)
      const answer = questionMarkdownToPrintHtml(String(q.selected_answer ?? "—"))
      return `
      <div class="question">
        <div class="q-head"><strong>Q${order}</strong> · ${status} · ${earned}/${maxPts} pts</div>
        <div class="q-prompt">${prompt}</div>
        <div class="q-answer"><span>Your answer:</span> ${answer}</div>
      </div>`
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
    .summary { display: flex; gap: 16px; margin-bottom: 22px; }
    .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px 16px; flex: 1; }
    .card-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #667085; }
    .card-value { font-size: 28px; font-weight: 700; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0 24px; font-size: 12px; }
    th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
    th { background: #f9fafb; }
    .question { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; margin-bottom: 10px; page-break-inside: avoid; }
    .q-head { font-size: 12px; color: #475569; margin-bottom: 6px; }
    .q-prompt { font-size: 14px; line-height: 1.45; margin-bottom: 8px; }
    .q-prompt p, .q-answer p { margin: 0 0 8px; }
    .q-prompt p:last-child, .q-answer p:last-child { margin-bottom: 0; }
    .q-prompt ul, .q-prompt ol, .q-answer ul, .q-answer ol { margin: 0 0 8px; padding-left: 20px; }
    .q-prompt li, .q-answer li { margin: 0 0 4px; }
    .q-prompt strong, .q-answer strong { font-weight: 700; }
    .q-answer { font-size: 13px; color: #334155; }
    .q-answer span { color: #667085; font-weight: 600; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">${student} · ${typeLabel}${completed ? ` · Completed ${escapeHtml(completed)}` : ""}</div>
  <div class="summary">
    <div class="card"><div class="card-label">Score</div><div class="card-value">${score} / ${total}</div></div>
    <div class="card"><div class="card-label">Percentage</div><div class="card-value">${pct}%</div></div>
    <div class="card"><div class="card-label">Correct</div><div class="card-value">${data.correct_answers ?? "—"} / ${data.total_questions ?? "—"}</div></div>
  </div>
  ${
    sections
      ? `<h2>Section breakdown</h2><table><thead><tr><th>Section</th><th>Weight</th><th>Score</th><th>Points</th></tr></thead><tbody>${sections}</tbody></table>`
      : ""
  }
  <h2>Question review</h2>
  ${questions || "<p>No questions available.</p>"}
</body>
</html>`
}

export async function downloadAssessmentReportPdf(data: AssessmentAttemptResults): Promise<string> {
  const html = buildReportHtml(data)
  const uri = await printToPdfFile(html)
  const filename = buildAssessmentReportPdfFilename(data)

  if (Platform.OS === "ios" || Platform.OS === "android") {
    await Share.share({
      url: uri,
      title: filename,
      message: Platform.OS === "android" ? filename : undefined,
    })
  }

  return uri
}
