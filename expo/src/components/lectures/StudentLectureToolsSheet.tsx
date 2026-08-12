import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useNativeType } from "../../lib/themed-module-theme"
import {
  LECTURE_TOOL_SECTION_ACCENT,
  LECTURE_TOOL_THUMBS,
  LECTURE_TOOLS_CHROME_ACCENT,
  LECTURE_TOOLS_HERO,
  LECTURE_TOOLS_HERO_ICON,
  LECTURE_TOOLS_PILL,
} from "../../lib/lecture-tools-sheet-theme"
import type { SolidListThumb } from "../../lib/solid-list-thumb"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"
import {
  FacultySheetChrome,
  FacultySheetContainer,
  useCollabSheetStyles,
  useFacultySheetSurfaces,
} from "../faculty/faculty-collab-sheet-ui"

type Props = {
  visible: boolean
  onClose: () => void
  lectureTitle?: string
  samplePracticeLabel: string
  samplePracticeCount: number
  workspaceLabel: string
  workspaceCount: number
  canDownload: boolean
  canOpenExternally: boolean
  onOpenSamplePractice: () => void
  onOpenWorkspace: () => void
  onDownloadSlides: () => void
  onOpenExternally: () => void
}

function countDetail(count: number, singular: string, plural: string, fallback: string): string {
  if (count > 0) return `${count} ${count === 1 ? singular : plural}`
  return fallback
}

function ToolPill({ label, fill, text }: { label: string; fill: string; text: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: fill }]}>
      <Text style={[styles.pillText, { color: text }]}>{label}</Text>
    </View>
  )
}

function ToolsHero({
  title,
  subtitle,
  samplePracticeCount,
  workspaceCount,
}: {
  title: string
  subtitle: string
  samplePracticeCount: number
  workspaceCount: number
}) {
  const tokens = useAppThemeTokens()

  return (
    <View style={[styles.heroShell, tokens.cardShadow]}>
      <View style={[styles.heroCard, { backgroundColor: LECTURE_TOOLS_HERO.fill }]}>
        <SolidListThumbTile
          thumb={LECTURE_TOOLS_HERO_ICON}
          icon="layers-outline"
          style={styles.heroIconTile}
          iconSize={28}
        />
        <Text style={styles.heroTitle}>{title}</Text>
        {samplePracticeCount > 0 || workspaceCount > 0 ? (
          <View style={styles.heroPills}>
            {samplePracticeCount > 0 ? (
              <ToolPill
                label={`${samplePracticeCount} practice`}
                fill={LECTURE_TOOLS_PILL.practice.fill}
                text={LECTURE_TOOLS_PILL.practice.text}
              />
            ) : null}
            {workspaceCount > 0 ? (
              <ToolPill
                label={`${workspaceCount} workspace`}
                fill={LECTURE_TOOLS_PILL.workspace.fill}
                text={LECTURE_TOOLS_PILL.workspace.text}
              />
            ) : null}
          </View>
        ) : null}
        <Text style={styles.heroSubtitle}>{subtitle}</Text>
      </View>
    </View>
  )
}

function ToolSection({
  label,
  accent,
  children,
}: {
  label: string
  accent: string
  children: React.ReactNode
}) {
  const tokens = useAppThemeTokens()
  const surfaces = useFacultySheetSurfaces()
  const type = useNativeType()

  return (
    <View
      style={[
        styles.sectionCard,
        !surfaces.isGlass && tokens.cardShadow,
        { backgroundColor: surfaces.cardBg, borderColor: surfaces.cardBorder },
      ]}
    >
      <View style={styles.sectionHead}>
        <View style={[styles.sectionDot, { backgroundColor: accent }]} />
        <Text style={[type.sectionHeader, { textTransform: "none" }]}>{label}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  )
}

function ToolActionRow({
  icon,
  label,
  subtitle,
  thumb,
  highlight,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  subtitle: string
  thumb: SolidListThumb
  highlight?: boolean
  onPress: () => void
}) {
  const native = useThemedNative()
  const surfaces = useFacultySheetSurfaces()

  return (
    <Pressable
      style={({ pressed }) => [
        styles.actionRow,
        {
          backgroundColor: surfaces.cardBg,
          borderColor: highlight ? thumb.fill : surfaces.cardBorder,
        },
        pressed && { opacity: NATIVE.pressedOpacity },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[label, subtitle].join(", ")}
    >
      <SolidListThumbTile thumb={thumb} icon={icon} size="compact" style={styles.actionIconTile} />
      <View style={styles.actionCopy}>
        <Text style={[styles.actionLabel, { color: native.label }]}>{label}</Text>
        <Text style={[styles.actionSubtitle, { color: native.secondaryLabel }]}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} />
    </Pressable>
  )
}

export function StudentLectureToolsSheet({
  visible,
  onClose,
  lectureTitle,
  samplePracticeLabel,
  samplePracticeCount,
  workspaceLabel,
  workspaceCount,
  canDownload,
  canOpenExternally,
  onOpenSamplePractice,
  onOpenWorkspace,
  onDownloadSlides,
  onOpenExternally,
}: Props) {
  const insets = useSafeAreaInsets()
  const collabSheetStyles = useCollabSheetStyles()

  function pick(action: () => void) {
    onClose()
    requestAnimationFrame(action)
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome
          topInset={insets.top}
          title="Slide tools"
          accentColor={LECTURE_TOOLS_CHROME_ACCENT}
          onClose={onClose}
        />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, styles.scroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ToolsHero
            title="Lecture tools"
            subtitle={
              lectureTitle?.trim() ||
              "Practice problems, workspace, downloads, and other options for this deck."
            }
            samplePracticeCount={samplePracticeCount}
            workspaceCount={workspaceCount}
          />

          <ToolSection label="On slides" accent={LECTURE_TOOL_SECTION_ACCENT.onSlides}>
            <View style={styles.actionStack}>
              <ToolActionRow
                icon="sparkles-outline"
                label={samplePracticeLabel}
                subtitle={countDetail(
                  samplePracticeCount,
                  "example",
                  "examples",
                  "Interactive drills while you follow the deck",
                )}
                thumb={LECTURE_TOOL_THUMBS.samplePractice}
                highlight
                onPress={() => pick(onOpenSamplePractice)}
              />
              <ToolActionRow
                icon="brush-outline"
                label={workspaceLabel}
                subtitle={countDetail(
                  workspaceCount,
                  "problem",
                  "problems",
                  "Ink workspace with step-by-step solutions",
                )}
                thumb={LECTURE_TOOL_THUMBS.workspace}
                onPress={() => pick(onOpenWorkspace)}
              />
            </View>
          </ToolSection>

          {(canDownload || canOpenExternally) && (
            <ToolSection label="Slide deck" accent={LECTURE_TOOL_SECTION_ACCENT.slideDeck}>
              <View style={styles.actionStack}>
                {canDownload ? (
                  <ToolActionRow
                    icon="download-outline"
                    label="Download slides"
                    subtitle="Save the PDF deck to your device"
                    thumb={LECTURE_TOOL_THUMBS.download}
                    onPress={() => pick(onDownloadSlides)}
                  />
                ) : null}
                {canOpenExternally ? (
                  <ToolActionRow
                    icon="open-outline"
                    label="Open externally"
                    subtitle="View in browser or Files"
                    thumb={LECTURE_TOOL_THUMBS.external}
                    onPress={() => pick(onOpenExternally)}
                  />
                ) : null}
              </View>
            </ToolSection>
          )}
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}

const styles = StyleSheet.create({
  scroll: {
    gap: 4,
  },
  actionStack: {
    gap: 10,
  },
  heroShell: {
    borderRadius: NATIVE.sectionRadius,
    overflow: "hidden",
  },
  heroCard: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 22,
  },
  heroIconTile: {
    width: 64,
    height: 64,
    borderRadius: 18,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  heroPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  heroSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255,255,255,0.92)",
    textAlign: "center",
    lineHeight: 18,
  },
  sectionCard: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 12,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sectionBody: {
    gap: 10,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionIconTile: {
    width: 36,
    height: 36,
    borderRadius: 12,
  },
  actionCopy: {
    flex: 1,
    gap: 2,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  actionSubtitle: {
    fontSize: 12,
    fontWeight: "600",
  },
})
