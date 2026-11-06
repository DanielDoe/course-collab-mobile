import { useMemo } from "react"
import { StyleSheet, View } from "react-native"
import { NativeSelect } from "../NativeSelect"
import { FacultySummerCampDatePicker } from "./FacultySummerCampDatePicker"

const MINUTE_STEPS = [0, 15, 30, 45]

function pad2(n: number) {
  return String(n).padStart(2, "0")
}

function hourCycle(hours24: number) {
  const period: "AM" | "PM" = hours24 >= 12 ? "PM" : "AM"
  return { hour12: hours24 % 12 || 12, period }
}

function toHours24(hour12: number, period: "AM" | "PM") {
  if (period === "AM") return hour12 === 12 ? 0 : hour12
  return hour12 === 12 ? 12 : hour12 + 12
}

export function toOfficeHourDatetimeLocal(value: unknown): string {
  if (!value) return ""
  const date = new Date(value as string)
  if (Number.isNaN(date.getTime())) return ""
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

function splitOfficeHourDatetime(value: string) {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(value)
  if (!match) return { date: "", hours24: 9, minutes: 0 }
  return { date: match[1], hours24: Number(match[2]), minutes: Number(match[3]) }
}

function composeOfficeHourDatetime(date: string, hours24: number, minutes: number) {
  const day = date || new Date().toISOString().slice(0, 10)
  return `${day}T${pad2(hours24)}:${pad2(minutes)}`
}

type Props = {
  value: string
  onChange: (next: string) => void
}

export function FacultyOfficeHourDateTimeField({ value, onChange }: Props) {
  const parts = splitOfficeHourDatetime(value)
  const { hour12, period } = hourCycle(parts.hours24)
  const minuteOptions = useMemo(() => {
    const minutes = MINUTE_STEPS.includes(parts.minutes)
      ? MINUTE_STEPS
      : [...MINUTE_STEPS, parts.minutes].sort((a, b) => a - b)
    return minutes.map((minute) => ({ value: String(minute), label: pad2(minute) }))
  }, [parts.minutes])
  const hourOptions = useMemo(
    () => Array.from({ length: 12 }, (_, index) => ({ value: String(index + 1), label: String(index + 1) })),
    [],
  )

  return (
    <View style={styles.wrap}>
      <FacultySummerCampDatePicker
        value={parts.date}
        onChange={(date) => onChange(date ? composeOfficeHourDatetime(date, parts.hours24, parts.minutes) : "")}
        accessibilityLabel="Office hours date"
      />
      <View style={styles.timeRow}>
        <View style={styles.timeCell}>
          <NativeSelect
            label="Hour"
            placeholder="Hour"
            sheetTitle="Hour"
            value={String(hour12)}
            options={hourOptions}
            onChange={(next) =>
              onChange(composeOfficeHourDatetime(parts.date, toHours24(Number(next), period), parts.minutes))
            }
          />
        </View>
        <View style={styles.timeCell}>
          <NativeSelect
            label="Minute"
            placeholder="Minute"
            sheetTitle="Minute"
            value={String(parts.minutes)}
            options={minuteOptions}
            onChange={(next) =>
              onChange(composeOfficeHourDatetime(parts.date, parts.hours24, Number(next)))
            }
          />
        </View>
        <View style={styles.timeCell}>
          <NativeSelect
            label="AM/PM"
            placeholder="AM/PM"
            sheetTitle="AM or PM"
            value={period}
            options={[
              { value: "AM", label: "AM" },
              { value: "PM", label: "PM" },
            ]}
            onChange={(next) =>
              onChange(
                composeOfficeHourDatetime(
                  parts.date,
                  toHours24(hour12, next === "PM" ? "PM" : "AM"),
                  parts.minutes,
                ),
              )
            }
          />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  timeRow: { flexDirection: "row", gap: 8 },
  timeCell: { flex: 1, minWidth: 0 },
})
