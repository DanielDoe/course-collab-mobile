import { useEffect, useMemo, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { NativeSelect } from "../NativeSelect"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import {
  campDatePickerYears,
  composeCampIsoDate,
  daysInCalendarMonth,
  splitCampIsoDate,
} from "../../lib/faculty-summer-camp-utils"

const MONTHS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
]

type Props = {
  value: string
  onChange: (iso: string) => void
  accessibilityLabel: string
}

export function FacultySummerCampDatePicker({ value, onChange, accessibilityLabel }: Props) {
  const native = useThemedNative()
  const type = useNativeType()
  const [parts, setParts] = useState(() => splitCampIsoDate(value))

  useEffect(() => {
    setParts(splitCampIsoDate(value))
  }, [value])

  const yearOptions = useMemo(
    () => campDatePickerYears().map((year) => ({ value: year, label: year })),
    [],
  )
  const dayCount = parts.year && parts.month ? daysInCalendarMonth(Number(parts.year), Number(parts.month)) : 31
  const dayOptions = useMemo(
    () =>
      Array.from({ length: dayCount }, (_, index) => {
        const day = String(index + 1).padStart(2, "0")
        return { value: day, label: String(index + 1) }
      }),
    [dayCount],
  )

  function emit(next: { year: string; month: string; day: string }) {
    const maxDay = next.year && next.month ? daysInCalendarMonth(Number(next.year), Number(next.month)) : 31
    const dayNum = Number(next.day)
    const clampedDay = next.day && dayNum > maxDay ? String(maxDay).padStart(2, "0") : next.day
    const nextParts = { ...next, day: clampedDay }
    setParts(nextParts)
    onChange(composeCampIsoDate(nextParts.year, nextParts.month, nextParts.day))
  }

  return (
    <View accessibilityLabel={accessibilityLabel} style={localStyles.wrap}>
      <View style={localStyles.row}>
        <View style={localStyles.year}>
          <NativeSelect
            placeholder="Year"
            value={parts.year}
            options={yearOptions}
            onChange={(year) => emit({ ...parts, year })}
          />
        </View>
        <View style={localStyles.month}>
          <NativeSelect
            placeholder="Month"
            value={parts.month}
            options={MONTHS}
            onChange={(month) => emit({ ...parts, month })}
          />
        </View>
        <View style={localStyles.day}>
          <NativeSelect
            placeholder="Day"
            value={parts.day}
            options={dayOptions}
            onChange={(day) => emit({ ...parts, day })}
          />
        </View>
      </View>
      {value ? (
        <Pressable
          onPress={() => onChange("")}
          accessibilityRole="button"
          accessibilityLabel={`Clear ${accessibilityLabel}`}
          style={localStyles.clear}
        >
          <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>Clear date</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const localStyles = StyleSheet.create({
  wrap: { gap: 6 },
  row: { flexDirection: "row", gap: 8 },
  year: { flex: 1.1 },
  month: { flex: 1.4 },
  day: { flex: 0.9 },
  clear: { alignSelf: "flex-start", minHeight: 32, justifyContent: "center" },
})
