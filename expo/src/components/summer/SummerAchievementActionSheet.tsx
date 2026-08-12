import { useMemo } from "react"
import { Modal, ScrollView, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { SummerBadge } from "../../lib/summer-camp-api"
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

type Props = {
  visible: boolean
  badge: SummerBadge | null
  earnedCount?: number
  totalCount?: number
  onClose: () => void
}

export function SummerAchievementActionSheet({
  visible,
  badge,
  earnedCount,
  totalCount,
  onClose,
}: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const insets = useSafeAreaInsets()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const styles = useMemo(() => createStyles(native, tokens), [native, tokens])

  if (!badge) return null

  const statusLabel = badge.earned ? "Earned" : "In progress"
  const statusTone = badge.earned ? "success" : "neutral"

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome topInset={insets.top} title="Achievement" onClose={onClose} />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <FacultySheetHero
            title={badge.title}
            subtitle={badge.earned ? "Camp achievement unlocked" : "Keep going to unlock this badge"}
            initials={badge.emoji}
            pills={<FacultyStatusPill label={statusLabel} tone={statusTone} onDark />}
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
              <FacultySheetMetricRow icon="ribbon-outline" label="Badge" value={badge.title} />
              <FacultySheetMetricRow icon="sparkles-outline" label="Status" value={statusLabel} />
              {earnedCount != null && totalCount != null ? (
                <FacultySheetMetricRow
                  icon="trophy-outline"
                  label="Your collection"
                  value={`${earnedCount} of ${totalCount} earned`}
                />
              ) : null}
              <FacultySheetMetricRow icon="key-outline" label="Badge ID" value={badge.id} isLast />
            </FacultySheetGroupedList>
          </FacultySheetSection>

          {badge.earned ? (
            <View style={[styles.infoBanner, { backgroundColor: semanticSoft(tokens.success, tokens.isDark) }]}>
              <View style={[styles.infoIcon, { backgroundColor: native.secondaryGrouped }]}>
                <Ionicons name="checkmark-circle-outline" size={18} color={tokens.success} />
              </View>
              <View style={styles.infoCopy}>
                <Text style={[type.bodyEmphasis, { color: native.label }]}>Achievement unlocked</Text>
                <Text style={[type.caption, { color: native.secondaryLabel }]}>
                  This badge is on your camp profile. Keep completing modules to earn more.
                </Text>
              </View>
            </View>
          ) : (
            <View style={[styles.infoBanner, { backgroundColor: semanticSoft(tokens.warning, tokens.isDark) }]}>
              <View style={[styles.infoIcon, { backgroundColor: native.secondaryGrouped }]}>
                <Ionicons name="lock-closed-outline" size={18} color={tokens.warning} />
              </View>
              <View style={styles.infoCopy}>
                <Text style={[type.bodyEmphasis, { color: native.label }]}>Not earned yet</Text>
                <Text style={[type.caption, { color: native.secondaryLabel }]}>
                  {badge.description || "Complete the related camp activity to unlock this achievement."}
                </Text>
              </View>
            </View>
          )}
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
