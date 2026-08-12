import { useMemo } from "react"
import { Modal, ScrollView, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { SummerCheckpoint } from "../../lib/summer-camp-api"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { semanticSoft, useNativeType } from "../../lib/themed-module-theme"
import { FacultyStatusPill } from "../faculty/faculty-shared"
import {
  FacultySheetContainer,
  FacultySheetChrome,
  FacultySheetGroupedList,
  FacultySheetHero,
  FacultySheetMetricRow,
  FacultySheetSection,
  useCollabSheetStyles,
} from "../faculty/faculty-collab-sheet-ui"

type CheckpointVariant = "pending" | "approved"

type Props = {
  visible: boolean
  checkpoint: SummerCheckpoint | null
  variant: CheckpointVariant
  onClose: () => void
}

function formatAcceptedTypes(types?: string[]): string {
  if (!types?.length) return "Any supported file type"
  return types
    .map((type) => {
      const parts = type.split("/")
      return (parts[parts.length - 1] ?? type).replace(/[-_]/g, " ").toUpperCase()
    })
    .join(", ")
}

function formatSubmittedAt(value?: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function statusLabel(variant: CheckpointVariant): string {
  return variant === "approved" ? "Approved" : "Pending"
}

function statusTone(variant: CheckpointVariant): "success" | "warning" {
  return variant === "approved" ? "success" : "warning"
}

export function SummerCheckpointActionSheet({ visible, checkpoint, variant, onClose }: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const insets = useSafeAreaInsets()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const styles = useMemo(() => createStyles(native, tokens), [native, tokens])

  if (!checkpoint) return null

  const submittedAt = formatSubmittedAt(checkpoint.submitted_at)
  const approvalLabel = checkpoint.content.facultyApproval ? "Faculty review required" : "Auto-approved on upload"
  const maxSizeLabel =
    checkpoint.content.maxSizeMb != null ? `${checkpoint.content.maxSizeMb} MB max` : "No size limit listed"

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome topInset={insets.top} title="Checkpoint" onClose={onClose} />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <FacultySheetHero
            title={checkpoint.content.title}
            subtitle={[checkpoint.module_title, checkpoint.training_title].filter(Boolean).join(" · ")}
            icon={variant === "approved" ? "checkmark-circle-outline" : "cloud-upload-outline"}
            pills={
              <>
                <FacultyStatusPill label={statusLabel(variant)} tone={statusTone(variant)} onDark />
                {checkpoint.content.facultyApproval ? (
                  <FacultyStatusPill label="Faculty review" tone="warning" onDark />
                ) : null}
              </>
            }
          />

          {checkpoint.content.description ? (
            <FacultySheetSection label="Instructions">
              <View style={styles.copyCard}>
                <Text style={[type.body, styles.copyText, { color: native.label }]}>
                  {checkpoint.content.description}
                </Text>
              </View>
            </FacultySheetSection>
          ) : null}

          <FacultySheetSection label="Submission requirements">
            <FacultySheetGroupedList>
              <FacultySheetMetricRow icon="document-outline" label="Accepted types" value={formatAcceptedTypes(checkpoint.content.acceptedTypes)} numberOfLines={3} />
              <FacultySheetMetricRow icon="resize-outline" label="Max file size" value={maxSizeLabel} />
              <FacultySheetMetricRow icon="shield-checkmark-outline" label="Review" value={approvalLabel} isLast />
            </FacultySheetGroupedList>
          </FacultySheetSection>

          <FacultySheetSection label="Context">
            <FacultySheetGroupedList>
              <FacultySheetMetricRow icon="folder-open-outline" label="Project module" value={checkpoint.module_title} numberOfLines={2} />
              <FacultySheetMetricRow icon="school-outline" label="Training" value={checkpoint.training_title} />
              {submittedAt ? (
                <FacultySheetMetricRow icon="time-outline" label="Submitted" value={submittedAt} isLast />
              ) : (
                <FacultySheetMetricRow
                  icon="information-circle-outline"
                  label="Status"
                  value={variant === "approved" ? "Approved by camp faculty" : "Waiting for your submission"}
                  isLast
                />
              )}
            </FacultySheetGroupedList>
          </FacultySheetSection>

          {variant === "pending" ? (
            <View style={[styles.infoBanner, { backgroundColor: semanticSoft(tokens.accent, tokens.isDark) }]}>
              <View style={[styles.infoIcon, { backgroundColor: native.secondaryGrouped }]}>
                <Ionicons name="information-circle-outline" size={18} color={tokens.accent} />
              </View>
              <View style={styles.infoCopy}>
                <Text style={[type.bodyEmphasis, { color: native.label }]}>Submit from your project module</Text>
                <Text style={[type.caption, { color: native.secondaryLabel }]}>
                  Upload the required file when you reach this checkpoint in your camp project workflow.
                </Text>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}

function createStyles(
  native: ReturnType<typeof useThemedNative>,
  tokens: ReturnType<typeof useAppThemeTokens>,
) {
  return StyleSheet.create({
    copyCard: {
      borderRadius: NATIVE.sectionRadius,
      padding: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: native.separator,
      backgroundColor: native.secondaryGrouped,
    },
    copyText: { lineHeight: 23 },
    infoBanner: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      marginTop: 4,
      padding: 14,
      borderRadius: NATIVE.sectionRadius,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: tokens.accentBorder,
    },
    infoIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    infoCopy: { flex: 1, gap: 4 },
  })
}
