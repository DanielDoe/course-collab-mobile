import { useMemo, type ReactNode } from "react"
import { Modal, ScrollView, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { SummerBadge, SummerGraduationRequirement, SummerGraduationTraining } from "../../lib/summer-camp-api"
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

type Selection =
  | { kind: "badge"; item: SummerBadge }
  | { kind: "requirement"; item: SummerGraduationRequirement; training: SummerGraduationTraining }

type Props = {
  visible: boolean
  selection: Selection | null
  onClose: () => void
}

export function SummerGraduationActionSheet({ visible, selection, onClose }: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const insets = useSafeAreaInsets()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const styles = useMemo(() => createStyles(native, tokens), [native, tokens])

  if (!selection) return null

  if (selection.kind === "badge") {
    const badge = selection.item
    return (
      <SheetShell visible={visible} title="Camp badge" onClose={onClose} insets={insets} styles={collabSheetStyles}>
        <FacultySheetHero
          title={badge.title}
          subtitle={badge.earned ? "Earned camp achievement" : "Badge not earned yet"}
          icon={badge.earned ? "ribbon-outline" : "lock-closed-outline"}
          pills={
            <FacultyStatusPill label={badge.earned ? "Earned" : "Locked"} tone={badge.earned ? "success" : "neutral"} onDark />
          }
        />
        {badge.description ? (
          <FacultySheetSection label="How to earn">
            <View style={styles.copyCard}>
              <Text style={[type.body, styles.copyText, { color: native.label }]}>{badge.description}</Text>
            </View>
          </FacultySheetSection>
        ) : null}
        <FacultySheetSection label="Details">
          <FacultySheetGroupedList>
            <FacultySheetMetricRow icon="sparkles-outline" label="Badge" value={badge.title} />
            <FacultySheetMetricRow icon="key-outline" label="Badge ID" value={badge.id} isLast />
          </FacultySheetGroupedList>
        </FacultySheetSection>
      </SheetShell>
    )
  }

  const requirement = selection.item
  const training = selection.training
  return (
    <SheetShell visible={visible} title="Graduation requirement" onClose={onClose} insets={insets} styles={collabSheetStyles}>
      <FacultySheetHero
        title={requirement.label}
        subtitle={training.training_title}
        icon={requirement.met ? "checkmark-circle-outline" : "ellipse-outline"}
        pills={
          <FacultyStatusPill label={requirement.met ? "Complete" : "Pending"} tone={requirement.met ? "success" : "warning"} onDark />
        }
      />
      <FacultySheetSection label="Progress">
        <FacultySheetGroupedList>
          <FacultySheetMetricRow
            icon="school-outline"
            label="Training"
            value={training.training_title}
            numberOfLines={2}
          />
          <FacultySheetMetricRow
            icon="grid-outline"
            label="Modules"
            value={`${training.modules_completed} / ${training.modules_total}`}
          />
          {requirement.detail ? (
            <FacultySheetMetricRow icon="information-circle-outline" label="Status" value={requirement.detail} isLast />
          ) : (
            <FacultySheetMetricRow
              icon="flag-outline"
              label="Requirement"
              value={requirement.met ? "Met" : "Not met yet"}
              isLast
            />
          )}
        </FacultySheetGroupedList>
      </FacultySheetSection>
      {!requirement.met ? (
        <View style={[styles.infoBanner, { backgroundColor: semanticSoft(tokens.warning, tokens.isDark) }]}>
          <View style={[styles.infoIcon, { backgroundColor: native.secondaryGrouped }]}>
            <Ionicons name="time-outline" size={18} color={tokens.warning} />
          </View>
          <View style={styles.infoCopy}>
            <Text style={[type.bodyEmphasis, { color: native.label }]}>Still in progress</Text>
            <Text style={[type.caption, { color: native.secondaryLabel }]}>
              Complete this requirement to move closer to camp graduation.
            </Text>
          </View>
        </View>
      ) : null}
    </SheetShell>
  )
}

function SheetShell({
  visible,
  title,
  onClose,
  insets,
  styles,
  children,
}: {
  visible: boolean
  title: string
  onClose: () => void
  insets: { top: number; bottom: number }
  styles: ReturnType<typeof useCollabSheetStyles>
  children: ReactNode
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome topInset={insets.top} title={title} onClose={onClose} />
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {children}
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
