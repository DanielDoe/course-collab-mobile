import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { NATIVE } from "../../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../../context/AppearanceProvider"
import { useNativeType } from "../../../lib/themed-module-theme"
import {
  COURSE_EXCHANGE_MODULE_LABELS,
  COURSE_EXCHANGE_MODULES,
  type CourseExchangeModule,
} from "../../../lib/course-exchange-shared"
import { FACULTY_COURSE_EXCHANGE_COLOR } from "../../../lib/faculty-course-exchange-theme"

/** Shorter labels keep the 2-column picker grid even-height on narrow sheets. */
const MODULE_PICKER_LABELS: Partial<Record<CourseExchangeModule, string>> = {
  course_notes: "Course Notes",
  question_bank: "Question Bank",
  practice_hub: "Practice Hub",
  classroom_points: "Points (tasks only)",
  mid_semester_exams: "Mid-Semester",
  final_exams: "Final Exams",
}

function modulePickerLabel(mod: CourseExchangeModule): string {
  return MODULE_PICKER_LABELS[mod] ?? COURSE_EXCHANGE_MODULE_LABELS[mod]
}

export function FacultyCourseExchangeModulePicker({
  allowed,
  selected,
  onChange,
  defaults,
  moduleHints,
}: {
  allowed?: CourseExchangeModule[]
  selected: CourseExchangeModule[]
  onChange: (mods: CourseExchangeModule[]) => void
  defaults?: CourseExchangeModule[]
  moduleHints?: Partial<Record<CourseExchangeModule, string>>
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const modules = allowed?.length ? allowed : COURSE_EXCHANGE_MODULES

  function toggle(mod: CourseExchangeModule) {
    onChange(selected.includes(mod) ? selected.filter((m) => m !== mod) : [...selected, mod])
  }

  function selectDefaults() {
    if (defaults?.length) onChange([...defaults])
  }

  function selectAll() {
    onChange([...modules])
  }

  function clearAll() {
    onChange([])
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.toolbar}>
        <Text style={[type.caption, { color: native.secondaryLabel }]}>
          {selected.length} of {modules.length} selected
        </Text>
        <View style={styles.actions}>
          <Pressable onPress={selectDefaults} hitSlop={6} accessibilityRole="button">
            <Text style={[type.caption, styles.actionLink, { color: tokens.accent }]}>Defaults</Text>
          </Pressable>
          <Pressable onPress={selectAll} hitSlop={6} accessibilityRole="button">
            <Text style={[type.caption, styles.actionLink, { color: tokens.accent }]}>All</Text>
          </Pressable>
          <Pressable onPress={clearAll} hitSlop={6} accessibilityRole="button">
            <Text style={[type.caption, styles.actionLink, { color: native.secondaryLabel }]}>Clear</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.grid}>
        {modules.map((mod) => {
          const active = selected.includes(mod)
          const hint = moduleHints?.[mod]
          return (
            <View key={mod} style={styles.gridItem}>
              <Pressable
                onPress={() => toggle(mod)}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    borderColor: active ? FACULTY_COURSE_EXCHANGE_COLOR.action : tokens.border,
                    backgroundColor: active
                      ? `${FACULTY_COURSE_EXCHANGE_COLOR.action}14`
                      : native.secondaryGrouped,
                    opacity: pressed ? NATIVE.pressedOpacity : 1,
                  },
                ]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: active }}
                accessibilityLabel={COURSE_EXCHANGE_MODULE_LABELS[mod]}
              >
                <View style={styles.chipRow}>
                  <Ionicons
                    name={active ? "checkmark-circle" : "ellipse-outline"}
                    size={16}
                    color={active ? FACULTY_COURSE_EXCHANGE_COLOR.action : native.tertiaryLabel}
                  />
                  <Text
                    style={[type.caption, styles.chipLabel, { color: native.label }]}
                    numberOfLines={2}
                  >
                    {modulePickerLabel(mod)}
                  </Text>
                </View>
                {hint ? (
                  <Text style={[type.caption, styles.chipHint, { color: native.secondaryLabel }]} numberOfLines={1}>
                    {hint}
                  </Text>
                ) : null}
              </Pressable>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  actions: { flexDirection: "row", alignItems: "center", gap: 14 },
  actionLink: { fontWeight: "600" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  gridItem: {
    flexBasis: "50%",
    maxWidth: "50%",
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  chip: {
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  chipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  chipLabel: {
    flex: 1,
    fontWeight: "600",
    lineHeight: 16,
  },
  chipHint: {
    fontSize: 10,
    marginLeft: 24,
  },
})
