import { useEffect, useState } from "react"
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../lib/app-alert'
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import {
  instructorApi,
  type RegularOfficeHourDraft,
  type RegularOfficeHourSlot,
} from "../../lib/instructor-api"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { NativeSelect } from "../NativeSelect"
import { TIME_OF_DAY_OPTIONS, withCurrentOption } from "./FacultyNativePickers"
import {
  FacultySheetAddButton,
  FacultySheetContainer,
  FacultySheetChrome,
  FacultySheetNotice,
  FacultySheetSection,
  FacultySheetSubmitButton,
  useCollabSheetStyles,
} from "./faculty-collab-sheet-ui"
import { SHEET_SECTION } from "./faculty-sheet-semantics"

const DAY_OPTIONS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
] as const

type Scope = { instructorId: number; courseId: number }

type Props = {
  visible: boolean
  scope: Scope | null
  initialSlots: RegularOfficeHourSlot[]
  onClose: () => void
  onSaved: (slots: RegularOfficeHourSlot[]) => void
}

function toDrafts(slots: RegularOfficeHourSlot[]): RegularOfficeHourDraft[] {
  return slots.map((slot) => ({
    dayOfWeek: slot.dayOfWeek,
    startTime: slot.startTime?.slice(0, 5) || "12:00",
    endTime: slot.endTime?.slice(0, 5) || "13:00",
  }))
}

export function FacultyRegularOfficeHoursSheet({
  visible,
  scope,
  initialSlots,
  onClose,
  onSaved,
}: Props) {
  const { native, tokens, type } = useModuleTheme()
  const collabSheetStyles = useCollabSheetStyles()
  const insets = useSafeAreaInsets()

  const [slots, setSlots] = useState<RegularOfficeHourDraft[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!visible) return
    setSlots(initialSlots.length > 0 ? toDrafts(initialSlots) : [{ dayOfWeek: 1, startTime: "12:00", endTime: "13:00" }])
    setError("")
  }, [visible, initialSlots])

  function updateSlot(index: number, patch: Partial<RegularOfficeHourDraft>) {
    setSlots((prev) => prev.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)))
  }

  function addSlot() {
    setSlots((prev) => [...prev, { dayOfWeek: 1, startTime: "12:00", endTime: "13:00" }])
  }

  function removeSlot(index: number) {
    setSlots((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  async function save() {
    if (!scope) return
    const cleaned = slots.filter((slot) => slot.startTime.trim() && slot.endTime.trim())
    if (cleaned.length === 0) {
      setError("Add at least one time slot.")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      const saved = await instructorApi.saveRegularOfficeHours(scope, { slots: cleaned })
      AppAlert.alert("Saved", "Regular office hours updated for this course.")
      onSaved(saved)
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save regular hours.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome topInset={insets.top} title="Regular office hours" onClose={onClose} />
        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <FacultySheetNotice message="Set recurring weekly availability for this course. Students see these times when requesting office hours." />

          <FacultySheetSection label="Weekly slots" tone={SHEET_SECTION.edit}>
            {slots.map((slot, index) => (
              <View
                key={`${index}-${slot.dayOfWeek}`}
                style={[
                  localStyles.slotCard,
                  {
                    backgroundColor: native.secondaryGrouped,
                    borderColor: native.separator,
                  },
                  tokens.cardShadow,
                ]}
              >
                <View style={localStyles.slotHeader}>
                  <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "700" }]}>
                    Slot {index + 1}
                  </Text>
                  {slots.length > 1 ? (
                    <Pressable
                      onPress={() => removeSlot(index)}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove slot ${index + 1}`}
                      hitSlop={8}
                    >
                      <Ionicons name="trash-outline" size={18} color={tokens.danger} />
                    </Pressable>
                  ) : null}
                </View>

                <NativeSelect
                  label="Day"
                  placeholder="Choose day"
                  value={String(slot.dayOfWeek) as (typeof DAY_OPTIONS)[number]["value"]}
                  options={[...DAY_OPTIONS]}
                  onChange={(value) => updateSlot(index, { dayOfWeek: Number.parseInt(value, 10) })}
                  variant="grouped"
                />

                <View style={localStyles.timeRow}>
                  <View style={localStyles.timeField}>
                    <NativeSelect
                      label="Start"
                      placeholder="12:00 PM"
                      value={slot.startTime}
                      options={withCurrentOption(TIME_OF_DAY_OPTIONS, slot.startTime)}
                      onChange={(startTime) => updateSlot(index, { startTime })}
                    />
                  </View>
                  <View style={localStyles.timeField}>
                    <NativeSelect
                      label="End"
                      placeholder="1:00 PM"
                      value={slot.endTime}
                      options={withCurrentOption(TIME_OF_DAY_OPTIONS, slot.endTime)}
                      onChange={(endTime) => updateSlot(index, { endTime })}
                    />
                  </View>
                </View>
              </View>
            ))}

            <FacultySheetAddButton label="Add another slot" onPress={addSlot} />
          </FacultySheetSection>

          {error ? <Text style={collabSheetStyles.errorText}>{error}</Text> : null}

          <FacultySheetSubmitButton
            label={submitting ? "Saving…" : "Save regular hours"}
            onPress={() => void save()}
            disabled={submitting}
            loading={submitting}
          />
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}

const localStyles = StyleSheet.create({
  slotCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 12,
    marginBottom: 10,
  },
  slotHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timeRow: { flexDirection: "row", gap: 10 },
  timeField: { flex: 1, gap: 6 },
  timeLabel: { fontWeight: "600" },
  timeInput: { minHeight: 44 },
})
