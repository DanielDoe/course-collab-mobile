import { useMemo, useState } from "react"
import { Modal, Pressable, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@/components/icons/AppIcon"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import {
  addMonths,
  buildMonthGrid,
  dateKey,
  sameDay,
  startOfMonth,
} from "../../lib/calendar"
import {
  campDatePickerYears,
  formatCampDateLabel,
  normalizeCampIsoDate,
} from "../../lib/faculty-summer-camp-utils"
import { FacultySheetChrome, FacultySheetContainer } from "./faculty-collab-sheet-ui"

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

type Props = {
  value: string
  onChange: (iso: string) => void
  accessibilityLabel: string
  /** Upcoming deadlines start at the current year instead of showing older years. */
  yearPolicy?: "historical" | "upcoming"
}

function isoFromDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function dateFromIso(iso: string): Date | null {
  const normalized = normalizeCampIsoDate(iso)
  if (!normalized) return null
  const [y, m, d] = normalized.split("-").map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

export function FacultySummerCampDatePicker({
  value,
  onChange,
  accessibilityLabel,
  yearPolicy = "historical",
}: Props) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const insets = useSafeAreaInsets()
  const [open, setOpen] = useState(false)
  const selected = dateFromIso(value)
  const [month, setMonth] = useState(() => startOfMonth(selected ?? new Date()))
  const [yearPicker, setYearPicker] = useState(false)

  const years = useMemo(
    () => campDatePickerYears(undefined, yearPolicy === "upcoming" ? { pastYears: 0 } : undefined),
    [yearPolicy],
  )
  const minDate = yearPolicy === "upcoming" ? startOfMonth(new Date()) : null
  const today = new Date()
  const label = formatCampDateLabel(value) || "Select date"
  const days = buildMonthGrid(month)

  function openSheet() {
    setMonth(startOfMonth(selected ?? new Date()))
    setYearPicker(false)
    setOpen(true)
  }

  function pickDay(date: Date) {
    if (!date || date.getMonth() !== month.getMonth()) return
    if (yearPolicy === "upcoming") {
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      if (date < startOfToday) return
    }
    onChange(isoFromDate(date))
    setOpen(false)
  }

  return (
    <View accessibilityLabel={accessibilityLabel} style={styles.wrap}>
      <Pressable
        onPress={openSheet}
        accessibilityRole="button"
        accessibilityLabel={`${accessibilityLabel}, ${label}`}
        style={({ pressed }) => [
          styles.field,
          {
            backgroundColor: native.fill,
            borderColor: native.separator,
            opacity: pressed ? 0.88 : 1,
          },
        ]}
      >
        <Ionicons name="calendar-outline" size={18} color={tokens.accent} />
        <Text style={[type.body, { color: value ? native.label : native.tertiaryLabel, flex: 1 }]}>
          {label}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} />
      </Pressable>
      {value ? (
        <Pressable
          onPress={() => onChange("")}
          accessibilityRole="button"
          accessibilityLabel={`Clear ${accessibilityLabel}`}
          style={styles.clear}
        >
          <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>Clear date</Text>
        </Pressable>
      ) : null}

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <FacultySheetContainer>
          <FacultySheetChrome topInset={insets.top} title={accessibilityLabel} onClose={() => setOpen(false)} />
          <View style={styles.sheetBody}>
            <View style={styles.monthNav}>
              <Pressable
                onPress={() => setMonth((prev) => addMonths(prev, -1))}
                accessibilityRole="button"
                accessibilityLabel="Previous month"
                hitSlop={8}
                style={styles.navBtn}
              >
                <Ionicons name="chevron-back" size={22} color={native.label} />
              </Pressable>
              <Pressable
                onPress={() => setYearPicker((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel="Choose year"
                style={styles.monthTitleBtn}
              >
                <Text style={[type.bodyEmphasis, { color: native.label }]}>
                  {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                </Text>
                <Ionicons
                  name={yearPicker ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={native.secondaryLabel}
                />
              </Pressable>
              <Pressable
                onPress={() => setMonth((prev) => addMonths(prev, 1))}
                accessibilityRole="button"
                accessibilityLabel="Next month"
                hitSlop={8}
                style={styles.navBtn}
              >
                <Ionicons name="chevron-forward" size={22} color={native.label} />
              </Pressable>
            </View>

            {yearPicker ? (
              <View style={styles.yearGrid}>
                {years.map((year) => {
                  const active = month.getFullYear() === Number(year)
                  return (
                    <Pressable
                      key={year}
                      onPress={() => {
                        setMonth(new Date(Number(year), month.getMonth(), 1))
                        setYearPicker(false)
                      }}
                      style={[
                        styles.yearChip,
                        {
                          backgroundColor: active ? tokens.accentSoft : native.fill,
                          borderColor: active ? tokens.accent : native.separator,
                        },
                      ]}
                    >
                      <Text style={[type.caption, { color: active ? tokens.accent : native.label, fontWeight: "700" }]}>
                        {year}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            ) : null}

            <View style={styles.weekHead}>
              {WEEKDAYS.map((day) => (
                <Text key={day} style={[type.caption, styles.weekCell, { color: native.secondaryLabel }]}>
                  {day}
                </Text>
              ))}
            </View>
            <View style={styles.grid}>
              {days.map((day) => {
                const inMonth = day.inMonth
                const isSelected = selected ? sameDay(day.date, selected) : false
                const isToday = sameDay(day.date, today)
                const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
                const disabled =
                  !inMonth ||
                  (yearPolicy === "upcoming" && day.date < startOfToday) ||
                  (minDate != null &&
                    yearPolicy === "historical" &&
                    day.date.getFullYear() < Number(years[0] ?? "0"))
                return (
                  <Pressable
                    key={dateKey(day.date)}
                    onPress={() => pickDay(day.date)}
                    disabled={disabled}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected, disabled }}
                    accessibilityLabel={day.date.toLocaleDateString()}
                    style={[
                      styles.day,
                      isSelected && { backgroundColor: tokens.accent },
                      isToday && !isSelected && { borderColor: tokens.accent, borderWidth: StyleSheet.hairlineWidth },
                    ]}
                  >
                    <Text
                      style={[
                        type.caption,
                        {
                          color: !inMonth || disabled
                            ? native.tertiaryLabel
                            : isSelected
                              ? "#ffffff"
                              : native.label,
                          fontWeight: isSelected || isToday ? "700" : "500",
                        },
                      ]}
                    >
                      {day.date.getDate()}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>
        </FacultySheetContainer>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 48,
  },
  clear: { alignSelf: "flex-start", minHeight: 32, justifyContent: "center" },
  sheetBody: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  monthTitleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 40,
  },
  yearGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  yearChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  weekHead: { flexDirection: "row" },
  weekCell: { flex: 1, textAlign: "center", fontWeight: "600" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  day: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
})
