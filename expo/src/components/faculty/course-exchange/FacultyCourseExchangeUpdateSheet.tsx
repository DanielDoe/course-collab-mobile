import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  COURSE_EXCHANGE_MODULE_LABELS,
  type ExchangeSyncChange,
  type ExchangeSyncDiff,
} from "../../../lib/course-exchange-shared"
import { FACULTY_COURSE_EXCHANGE_COLOR } from "../../../lib/faculty-course-exchange-theme"
import { instructorApi } from "../../../lib/instructor-api"
import { useFacultyScope } from "../../../hooks/useFacultyScope"
import {
  FacultySheetChrome,
  FacultySheetContainer,
  useCollabSheetStyles,
} from "../faculty-collab-sheet-ui"
import { useThemedNative } from "../../../context/AppearanceProvider"
import { useNativeType } from "../../../lib/themed-module-theme"
import { AppButton } from "../../theme/AppButton"

type Props = {
  visible: boolean
  copyId: number | null
  onClose: () => void
  onApplied?: () => void
}

function moduleLabel(module: ExchangeSyncChange["module"]) {
  if (module === "syllabus") return "Syllabus"
  return COURSE_EXCHANGE_MODULE_LABELS[module as keyof typeof COURSE_EXCHANGE_MODULE_LABELS] ?? module
}

function kindBadge(kind: ExchangeSyncChange["kind"]) {
  if (kind === "added") return "New"
  if (kind === "modified") return "Updated"
  return "Removed"
}

export function FacultyCourseExchangeUpdateSheet({ visible, copyId, onClose, onApplied }: Props) {
  const insets = useSafeAreaInsets()
  const { scope } = useFacultyScope()
  const native = useThemedNative()
  const type = useNativeType()
  const collabSheetStyles = useCollabSheetStyles()

  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [applying, setApplying] = useState(false)
  const [diff, setDiff] = useState<ExchangeSyncDiff | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const loadDiff = useCallback(
    async (force = false) => {
      if (!scope || copyId == null) return
      const setBusy = force ? setRefreshing : setLoading
      setBusy(true)
      try {
        const data = await instructorApi.getCourseExchangeCopySync(scope, copyId, force)
        const next = data.diff
        if (!next?.changes) {
          setDiff(null)
          setSelected(new Set())
          return
        }
        setDiff(next)
        setSelected(new Set(next.changes.filter((c) => c.kind !== "removed").map((c) => c.changeId)))
      } finally {
        setBusy(false)
      }
    },
    [scope, copyId],
  )

  useEffect(() => {
    if (!visible || copyId == null) return
    void loadDiff(false)
  }, [visible, copyId, loadDiff])

  const selectableChanges = useMemo(
    () => (diff?.changes ?? []).filter((c) => c.kind !== "removed"),
    [diff],
  )

  async function applySelected() {
    if (!scope || copyId == null || selected.size === 0) return
    setApplying(true)
    try {
      await instructorApi.applyCourseExchangeCopySync(scope, copyId, [...selected])
      onApplied?.()
      onClose()
    } finally {
      setApplying(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer style={{ flex: 1 }}>
        <FacultySheetChrome
          title="Review source updates"
          subtitle={
            diff
              ? `${diff.sourceCourseCode} → ${diff.destinationCourseCode} · v${diff.sourceVersion}`
              : "Compare incoming creator changes with your copy."
          }
          topInset={insets.top}
          onClose={onClose}
          accentColor={FACULTY_COURSE_EXCHANGE_COLOR.update}
          rightSlot={
            <Pressable onPress={() => void loadDiff(true)} accessibilityRole="button" accessibilityLabel="Refresh">
              {refreshing ? (
                <ActivityIndicator color={FACULTY_COURSE_EXCHANGE_COLOR.link} size="small" />
              ) : (
                <Ionicons name="refresh-outline" size={20} color={native.tint} />
              )}
            </Pressable>
          }
        />
        <ScrollView contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}>
          {loading ? (
            <ActivityIndicator color={FACULTY_COURSE_EXCHANGE_COLOR.link} style={{ marginTop: 24 }} />
          ) : !diff?.hasUpdates ? (
            <Text style={[type.secondary, { color: native.secondaryLabel, textAlign: "center", marginTop: 24 }]}>
              Your copy matches the latest shared content from the creator.
            </Text>
          ) : (
            <>
              <Text style={[type.caption, { color: native.secondaryLabel, marginBottom: 12 }]}>
                Select changes to apply. Unselected items keep your local edits.
              </Text>
              <View style={[styles.list, { borderColor: native.separator }]}>
                {diff.changes.map((change) => {
                  const disabled = change.kind === "removed"
                  const checked = selected.has(change.changeId)
                  return (
                    <Pressable
                      key={change.changeId}
                      disabled={disabled}
                      onPress={() => {
                        if (disabled) return
                        setSelected((prev) => {
                          const next = new Set(prev)
                          if (checked) next.delete(change.changeId)
                          else next.add(change.changeId)
                          return next
                        })
                      }}
                      style={[styles.changeRow, { borderBottomColor: native.separator, opacity: disabled ? 0.6 : 1 }]}
                    >
                      <Ionicons
                        name={checked ? "checkbox" : "square-outline"}
                        size={20}
                        color={checked ? FACULTY_COURSE_EXCHANGE_COLOR.action : native.tertiaryLabel}
                      />
                      <View style={{ flex: 1, gap: 2 }}>
                        <View style={styles.changeHeader}>
                          <Text style={[type.bodyEmphasis, { color: native.label }]}>{change.label}</Text>
                          <Text style={[type.caption, { color: FACULTY_COURSE_EXCHANGE_COLOR.link }]}>
                            {moduleLabel(change.module)}
                          </Text>
                          <Text style={[type.caption, { color: native.secondaryLabel }]}>{kindBadge(change.kind)}</Text>
                        </View>
                        <Text style={[type.caption, { color: native.secondaryLabel }]}>{change.summary}</Text>
                        {change.yoursLabel || change.incomingLabel ? (
                          <View style={styles.diffCompare}>
                            {change.yoursLabel ? (
                              <Text style={[type.caption, { color: native.secondaryLabel }]}>
                                Yours: {change.yoursLabel}
                              </Text>
                            ) : null}
                            {change.incomingLabel ? (
                              <Text style={[type.caption, { color: native.label }]}>
                                Incoming: {change.incomingLabel}
                              </Text>
                            ) : null}
                          </View>
                        ) : null}
                      </View>
                    </Pressable>
                  )
                })}
              </View>
              <AppButton
                label={`Apply ${selected.size} change${selected.size === 1 ? "" : "s"}`}
                backgroundColor={FACULTY_COURSE_EXCHANGE_COLOR.action}
                disabled={applying || selected.size === 0}
                loading={applying}
                onPress={() => void applySelected()}
              />
            </>
          )}
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}

const styles = StyleSheet.create({
  list: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, overflow: "hidden" },
  changeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  changeHeader: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  diffCompare: { gap: 2, marginTop: 4 },
})
