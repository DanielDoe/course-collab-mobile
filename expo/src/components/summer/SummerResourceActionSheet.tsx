import { useMemo } from "react"
import { Modal, ScrollView, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { SummerResource } from "../../lib/summer-camp-api"
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
import { resourceTypeIcon, resourceTypeLabel } from "./SummerResourceListCard"

type Props = {
  visible: boolean
  resource: SummerResource | null
  trainingTitle?: string
  onClose: () => void
}

export function SummerResourceActionSheet({ visible, resource, trainingTitle, onClose }: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const insets = useSafeAreaInsets()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const styles = useMemo(() => createStyles(native, tokens), [native, tokens])

  if (!resource) return null

  const typeLabel = resourceTypeLabel(resource.type)
  const icon = resourceTypeIcon(resource.type)

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome topInset={insets.top} title="Resource" onClose={onClose} />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <FacultySheetHero
            title={resource.title}
            subtitle={[trainingTitle, typeLabel].filter(Boolean).join(" · ") || "Camp resource"}
            icon={icon}
            pills={<FacultyStatusPill label={typeLabel} tone="neutral" onDark />}
          />

          {resource.description ? (
            <FacultySheetSection label="Summary">
              <View style={styles.copyCard}>
                <Text style={[type.body, styles.copyText, { color: native.label }]}>{resource.description}</Text>
              </View>
            </FacultySheetSection>
          ) : null}

          <FacultySheetSection label="Details">
            <FacultySheetGroupedList>
              <FacultySheetMetricRow icon={icon} label="Type" value={typeLabel} />
              {resource.module_title ? (
                <FacultySheetMetricRow icon="folder-open-outline" label="Module" value={resource.module_title} numberOfLines={2} />
              ) : null}
              {trainingTitle ? (
                <FacultySheetMetricRow icon="school-outline" label="Training" value={trainingTitle} isLast />
              ) : (
                <FacultySheetMetricRow icon="library-outline" label="Resource ID" value={`#${resource.id}`} isLast />
              )}
            </FacultySheetGroupedList>
          </FacultySheetSection>

          <View style={[styles.infoBanner, { backgroundColor: semanticSoft(tokens.accent, tokens.isDark) }]}>
            <View style={[styles.infoIcon, { backgroundColor: native.secondaryGrouped }]}>
              <Ionicons name="library-outline" size={18} color={tokens.accent} />
            </View>
            <View style={styles.infoCopy}>
              <Text style={[type.bodyEmphasis, { color: native.label }]}>Open from your training module</Text>
              <Text style={[type.caption, { color: native.secondaryLabel }]}>
                Camp readings, scripts, and videos are linked to the modules where you use them.
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
