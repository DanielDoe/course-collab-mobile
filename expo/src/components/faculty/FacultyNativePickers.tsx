import { View } from "react-native"
import { NativeSelect, type SelectOption } from "../NativeSelect"
import { FacultySummerCampDatePicker } from "./FacultySummerCampDatePicker"

function formatTime12h(hhmm: string): string {
  const [h, m] = hhmm.split(":").map((v) => Number.parseInt(v, 10))
  if (!Number.isFinite(h)) return hhmm
  const mer = h >= 12 ? "PM" : "AM"
  const h12 = h % 12 || 12
  return `${h12}:${String(m || 0).padStart(2, "0")} ${mer}`
}

function labelSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds} seconds`
  if (seconds % 60 === 0) return seconds === 60 ? "1 minute" : `${seconds / 60} minutes`
  return `${seconds} seconds`
}

export const TIME_OF_DAY_OPTIONS: SelectOption[] = [
  ...Array.from({ length: 32 }, (_, i) => {
    const minutes = 7 * 60 + i * 30
    const hh = String(Math.floor(minutes / 60)).padStart(2, "0")
    const mm = String(minutes % 60).padStart(2, "0")
    const value = `${hh}:${mm}`
    return { value, label: formatTime12h(value) }
  }),
  { value: "23:59", label: "11:59 PM" },
]

const SECOND_VALUES = [10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 300, 600, 900]

export function secondsSelectOptions(current?: number | null): SelectOption[] {
  const extra = current && Number.isFinite(current) && !SECOND_VALUES.includes(current) ? [current] : []
  return [...SECOND_VALUES, ...extra]
    .sort((a, b) => a - b)
    .map((value) => ({ value: String(value), label: labelSeconds(value) }))
}

export const CONCURRENT_STUDENT_OPTIONS: SelectOption[] = [
  { value: "", label: "Unlimited" },
  ...[10, 15, 20, 25, 30, 40, 50, 75, 100].map((n) => ({
    value: String(n),
    label: `${n} students`,
  })),
]

export const DAILY_LIMIT_OPTIONS: SelectOption[] = [5, 10, 15, 20, 25, 30, 40, 50, 75, 100].map((n) => ({
  value: String(n),
  label: `${n} questions / day`,
}))

export const QUESTION_COUNT_OPTIONS: SelectOption[] = [3, 5, 8, 10, 12, 15, 20].map((n) => ({
  value: String(n),
  label: `${n} questions`,
}))

export function yearSelectOptions(current?: string): SelectOption[] {
  const now = new Date().getFullYear()
  const years = [now - 1, now, now + 1, now + 2, now + 3]
  const extra = Number(current)
  if (Number.isFinite(extra) && !years.includes(extra)) years.push(extra)
  return years.sort((a, b) => a - b).map((year) => ({ value: String(year), label: String(year) }))
}

export const WEEK_OPTIONS: SelectOption[] = Array.from({ length: 16 }, (_, index) => ({
  value: String(index + 1),
  label: `Week ${index + 1}`,
}))

export const BATCH_SIZE_OPTIONS: SelectOption[] = [3, 5, 8, 10, 12, 15, 20].map((n) => ({
  value: String(n),
  label: `${n} cards`,
}))

export function withCurrentOption(options: SelectOption[], current: string, label = current): SelectOption[] {
  if (!current || options.some((option) => option.value === current)) return options
  return [...options, { value: current, label }]
}

export const HOUR_GRANT_OPTIONS: SelectOption[] = [1, 2, 4, 6, 8, 12, 24, 36, 48, 72].map((n) => ({
  value: String(n),
  label: n === 1 ? "1 hour" : `${n} hours`,
}))

export const EXTRA_ATTEMPT_OPTIONS: SelectOption[] = [1, 2, 3, 4, 5, 8, 10].map((n) => ({
  value: String(n),
  label: n === 1 ? "1 extra attempt" : `${n} extra attempts`,
}))

export const POINT_AWARD_OPTIONS: SelectOption[] = ["0.5", "1", "1.5", "2", "2.5", "3", "4", "5", "8", "10"].map(
  (value) => ({ value, label: `${value} pts` }),
)

export const WEIGHT_PERCENT_OPTIONS: SelectOption[] = [5, 10, 15, 20, 25, 30, 35, 40, 50, 60, 70, 80, 100].map((n) => ({
  value: String(n),
  label: `${n}%`,
}))

export const HINT_PENALTY_OPTIONS: SelectOption[] = [0, 5, 10, 15, 20, 25].map((n) => ({
  value: String(n),
  label: n === 0 ? "No penalty" : `${n}%`,
}))

export const TRADE_CAP_OPTIONS: SelectOption[] = [10, 20, 25, 50, 75, 100, 150, 200].map((n) => ({
  value: String(n),
  label: String(n),
}))

export const TRADE_WEIGHT_OPTIONS: SelectOption[] = ["0.25", "0.5", "0.75", "1", "1.25", "1.5", "2"].map((value) => ({
  value,
  label: value,
}))

export const TRADE_MAX_EC_OPTIONS: SelectOption[] = [1, 2, 3, 5, 8, 10].map((n) => ({
  value: String(n),
  label: String(n),
}))

export const RETAKE_LIMIT_OPTIONS: SelectOption[] = [1, 2, 3, 4, 5, 8, 10].map((n) => ({
  value: String(n),
  label: n === 1 ? "1 retake" : `${n} retakes`,
}))

export const STRIKE_COUNT_OPTIONS: SelectOption[] = [0, 1, 2, 3, 4, 5, 8, 10].map((n) => ({
  value: String(n),
  label: n === 0 ? "None" : n === 1 ? "1" : String(n),
}))

export const GEO_RADIUS_OPTIONS: SelectOption[] = [25, 50, 100, 200, 500, 1000, 2000].map((n) => ({
  value: String(n),
  label: n >= 1000 ? `${n / 1000} km` : `${n} m`,
}))

export const CONFIDENCE_THRESHOLD_OPTIONS: SelectOption[] = ["0.5", "0.6", "0.7", "0.8", "0.85", "0.9", "0.95"].map(
  (value) => ({ value, label: value }),
)

export const MINUTE_OPTIONS: SelectOption[] = [1, 2, 5, 10, 15, 20, 30, 45, 60, 90, 120].map((n) => ({
  value: String(n),
  label: n === 1 ? "1 min" : `${n} min`,
}))

export const DAY_COUNT_OPTIONS: SelectOption[] = [0, 1, 2, 3, 5, 7, 10, 14].map((n) => ({
  value: String(n),
  label: n === 0 ? "None" : n === 1 ? "1 day" : `${n} days`,
}))

export const TEAM_SIZE_OPTIONS: SelectOption[] = [1, 2, 3, 4, 5, 6, 8, 10].map((n) => ({
  value: String(n),
  label: n === 1 ? "1 student" : `${n} students`,
}))

export const CHAR_LIMIT_OPTIONS: SelectOption[] = [500, 1000, 1500, 2000, 3000, 4000, 8000].map((n) => ({
  value: String(n),
  label: `${n} chars`,
}))

export const MS_WINDOW_OPTIONS: SelectOption[] = [500, 1000, 1500, 2000, 3000, 5000].map((n) => ({
  value: String(n),
  label: n >= 1000 ? `${n / 1000}s` : `${n} ms`,
}))

export const MULTIPLIER_OPTIONS: SelectOption[] = ["1", "1.5", "2", "2.5", "3"].map((value) => ({
  value,
  label: `${value}×`,
}))

export const POINTS_CAP_OPTIONS: SelectOption[] = [10, 20, 25, 50, 75, 100, 150, 200].map((n) => ({
  value: String(n),
  label: `${n} pts`,
}))

export function splitLocalDateTime(raw: string): { date: string; time: string } {
  const normalized = raw.trim().replace(" ", "T")
  if (!normalized) return { date: "", time: "17:00" }
  const [date = "", timePart = ""] = normalized.split("T")
  return { date: date.slice(0, 10), time: timePart.slice(0, 5) || "17:00" }
}

export function joinLocalDateTime(date: string, time: string, style: "iso" | "space" = "iso"): string {
  if (!date) return ""
  const hhmm = time || "17:00"
  return style === "space" ? `${date} ${hhmm}` : `${date}T${hhmm}`
}

export function FacultyDateTimeField({
  value,
  onChange,
  dateLabel = "Date",
  timeLabel = "Time",
  joinStyle = "iso",
}: {
  value: string
  onChange: (next: string) => void
  dateLabel?: string
  timeLabel?: string
  joinStyle?: "iso" | "space"
}) {
  const { date, time } = splitLocalDateTime(value)
  const timeOptions = TIME_OF_DAY_OPTIONS.some((option) => option.value === time)
    ? TIME_OF_DAY_OPTIONS
    : [...TIME_OF_DAY_OPTIONS, { value: time, label: formatTime12h(time) }]
  return (
    <View style={{ gap: 8 }}>
      <FacultySummerCampDatePicker
        value={date}
        onChange={(nextDate) => onChange(joinLocalDateTime(nextDate, time, joinStyle))}
        accessibilityLabel={dateLabel}
      />
      <NativeSelect
        label={timeLabel}
        placeholder="5:00 PM"
        value={time}
        options={timeOptions}
        onChange={(nextTime) => onChange(joinLocalDateTime(date, nextTime, joinStyle))}
      />
    </View>
  )
}
