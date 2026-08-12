import { useMemo } from "react"
import { Modal, ScrollView, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { SummerBrowseCamp, SummerBrowseTraining } from "../../lib/summer-camp-api"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { semanticSoft, useNativeType } from "../../lib/themed-module-theme"
import { FacultyStatusPill } from "../faculty/faculty-shared"
import {
  FacultySheetContainer,
  FacultySheetActionRow,
  FacultySheetChrome,
  FacultySheetGroupedList,
  FacultySheetHero,
  FacultySheetMetricRow,
  FacultySheetSection,
  useCollabSheetStyles,
} from "../faculty/faculty-collab-sheet-ui"

export type BrowseTrainingSelection = {
  camp: SummerBrowseCamp
  training: SummerBrowseTraining
}

type Props = {
  visible: boolean
  selection: BrowseTrainingSelection | null
  onClose: () => void
  onOpenDetail?: (selection: BrowseTrainingSelection) => void
  onContinueTraining?: (selection: BrowseTrainingSelection) => void
  onEnroll?: (selection: BrowseTrainingSelection) => void
  enrolling?: boolean
}

function formatStatus(training: SummerBrowseTraining): string {
  if (training.enrolled) return "Enrolled"
  if (training.available) return "Available to join"
  return training.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function statusTone(training: SummerBrowseTraining): "success" | "live" | "neutral" {
  if (training.enrolled) return "success"
  if (training.available) return "live"
  return "neutral"
}

function formatFacultyRole(role?: string): string {
  if (!role) return "Faculty"
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export function SummerBrowseTrainingActionSheet({
  visible,
  selection,
  onClose,
  onOpenDetail,
  onContinueTraining,
  onEnroll,
  enrolling = false,
}: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const insets = useSafeAreaInsets()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const styles = useMemo(() => createStyles(native, tokens), [native, tokens])

  if (!selection) return null

  const { camp, training } = selection
  const overview = training.meta.overview || training.meta.summary || training.description
  const leadFaculty = training.faculty.filter((member) => member.role === "lead")
  const assistantFaculty = training.faculty.filter((member) => member.role !== "lead")
  const facultyPreview = (leadFaculty[0] ?? training.faculty[0])?.name

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome topInset={insets.top} title="Training" onClose={onClose} />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <FacultySheetHero
            title={training.title}
            subtitle={[camp.title, training.meta.duration].filter(Boolean).join(" · ") || camp.title}
            icon="school-outline"
            pills={<FacultyStatusPill label={formatStatus(training)} tone={statusTone(training)} onDark />}
          />

          {overview ? (
            <FacultySheetSection label="Overview">
              <View style={styles.copyCard}>
                <Text style={[type.body, styles.copyText, { color: native.label }]}>{overview}</Text>
              </View>
            </FacultySheetSection>
          ) : null}

          <FacultySheetSection label="Details">
            <FacultySheetGroupedList>
              <FacultySheetMetricRow icon="calendar-outline" label="Camp" value={camp.title} numberOfLines={2} />
              {training.meta.duration ? (
                <FacultySheetMetricRow icon="time-outline" label="Duration" value={training.meta.duration} />
              ) : null}
              {training.meta.difficulty ? (
                <FacultySheetMetricRow icon="speedometer-outline" label="Difficulty" value={training.meta.difficulty} />
              ) : null}
              {training.meta.audience ? (
                <FacultySheetMetricRow icon="people-outline" label="Audience" value={training.meta.audience} numberOfLines={2} />
              ) : null}
              {training.meta.format ? (
                <FacultySheetMetricRow icon="layers-outline" label="Format" value={training.meta.format} numberOfLines={2} />
              ) : null}
              {facultyPreview ? (
                <FacultySheetMetricRow icon="person-outline" label="Lead faculty" value={facultyPreview} isLast={!training.meta.tags.length} />
              ) : null}
              {training.meta.tags.length ? (
                <FacultySheetMetricRow icon="pricetags-outline" label="Tags" value={training.meta.tags.join(", ")} isLast />
              ) : null}
            </FacultySheetGroupedList>
          </FacultySheetSection>

          {training.meta.outcomes.length ? (
            <FacultySheetSection label="Learning outcomes">
              <View style={styles.copyCard}>
                {training.meta.outcomes.map((outcome) => (
                  <View key={outcome} style={styles.outcomeRow}>
                    <Ionicons name="checkmark-circle-outline" size={16} color={tokens.success} />
                    <Text style={[type.body, styles.outcomeText, { color: native.label }]}>{outcome}</Text>
                  </View>
                ))}
              </View>
            </FacultySheetSection>
          ) : null}

          {training.faculty.length ? (
            <FacultySheetSection label="Faculty team">
              <FacultySheetGroupedList>
                {[...leadFaculty, ...assistantFaculty].map((member, index, arr) => (
                  <FacultySheetMetricRow
                    key={member.id}
                    icon="person-circle-outline"
                    label={formatFacultyRole(member.role)}
                    value={[member.name, member.job_title].filter(Boolean).join(" · ")}
                    numberOfLines={2}
                    isLast={index === arr.length - 1}
                  />
                ))}
              </FacultySheetGroupedList>
            </FacultySheetSection>
          ) : null}

          {(onOpenDetail || onEnroll || onContinueTraining) ? (
            <FacultySheetSection label="Actions">
              {!training.enrolled && training.available && onEnroll ? (
                <FacultySheetActionRow
                  icon="add-circle-outline"
                  label={enrolling ? "Enrolling…" : "Enroll in this training"}
                  subtitle="Join this camp track and start Module 0 in My Trainings"
                  tone="primary"
                  onPress={() => onEnroll(selection)}
                />
              ) : null}
              {training.enrolled && onContinueTraining ? (
                <FacultySheetActionRow
                  icon="play-circle-outline"
                  label="Continue training"
                  subtitle="Open the interactive module viewer where you left off"
                  tone="primary"
                  onPress={() => onContinueTraining(selection)}
                />
              ) : null}
              {onOpenDetail ? (
                <FacultySheetActionRow
                  icon="document-text-outline"
                  label="View training details"
                  subtitle="Review syllabus, faculty, modules, and capstone projects"
                  tone={training.enrolled ? "default" : "primary"}
                  onPress={() => onOpenDetail(selection)}
                />
              ) : null}
            </FacultySheetSection>
          ) : null}

          <View style={[styles.infoBanner, { backgroundColor: semanticSoft(tokens.accent, tokens.isDark) }]}>
            <View style={[styles.infoIcon, { backgroundColor: native.secondaryGrouped }]}>
              <Ionicons name="sunny-outline" size={18} color={tokens.accent} />
            </View>
            <View style={styles.infoCopy}>
              <Text style={[type.bodyEmphasis, { color: native.label }]}>
                {training.enrolled ? "You are enrolled in this track" : "Summer camp training track"}
              </Text>
              <Text style={[type.caption, { color: native.secondaryLabel }]}>
                {training.enrolled
                  ? "Open your training workspace to continue modules, checkpoints, and projects."
                  : "View full training details in the app and enroll when you are ready."}
              </Text>
            </View>
          </View>
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
      gap: 10,
    },
    copyText: { lineHeight: 23 },
    outcomeRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
    outcomeText: { flex: 1, lineHeight: 22 },
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
