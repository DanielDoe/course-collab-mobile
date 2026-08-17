import { useMemo, type ReactNode } from "react"
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { SummerGalleryAward, SummerGalleryEntry, SummerGalleryLeaderboardEntry } from "../../lib/summer-camp-api"
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

type GallerySelection =
  | { kind: "project"; item: SummerGalleryEntry }
  | { kind: "award"; item: SummerGalleryAward }
  | { kind: "leaderboard"; item: SummerGalleryLeaderboardEntry }

type Props = {
  visible: boolean
  selection: GallerySelection | null
  onClose: () => void
  onVote?: (entryId: number) => void
  voting?: boolean
}

export function SummerGalleryActionSheet({ visible, selection, onClose, onVote, voting }: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const insets = useSafeAreaInsets()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const styles = useMemo(() => createStyles(native, tokens), [native, tokens])

  if (!selection) return null

  if (selection.kind === "project") {
    const entry = selection.item
    return (
      <GallerySheetShell visible={visible} title="Showcase project" onClose={onClose} insets={insets} styles={collabSheetStyles}>
        <FacultySheetHero
          title={entry.title}
          subtitle={entry.student_name ?? "Camp showcase project"}
          icon="images-outline"
          pills={<FacultyStatusPill label="Showcase" tone="live" onDark />}
        />
        {entry.description ? (
          <FacultySheetSection label="Project summary">
            <View style={styles.copyCard}>
              <Text style={[type.body, styles.copyText, { color: native.label }]}>{entry.description}</Text>
            </View>
          </FacultySheetSection>
        ) : null}
        <FacultySheetSection label="Details">
          <FacultySheetGroupedList>
            {entry.student_name ? (
              <FacultySheetMetricRow icon="person-outline" label="Camper" value={entry.student_name} />
            ) : null}
            {entry.training_title ? (
              <FacultySheetMetricRow icon="school-outline" label="Training" value={entry.training_title} />
            ) : null}
            {typeof entry.votes === "number" ? (
              <FacultySheetMetricRow icon="heart-outline" label="Votes" value={String(entry.votes)} isLast={!onVote} />
            ) : (
              <FacultySheetMetricRow icon="images-outline" label="Gallery ID" value={`#${entry.id}`} isLast={!onVote} />
            )}
          </FacultySheetGroupedList>
        </FacultySheetSection>
        {onVote ? (
          <Pressable
            style={[styles.voteBtn, { backgroundColor: entry.has_voted ? native.fill : tokens.accent, borderColor: native.separator }]}
            disabled={entry.has_voted || voting}
            onPress={() => onVote(entry.id)}
          >
            <Ionicons name={entry.has_voted ? "heart" : "heart-outline"} size={16} color={entry.has_voted ? native.secondaryLabel : "#ffffff"} />
            <Text style={[type.caption, { color: entry.has_voted ? native.secondaryLabel : "#ffffff", fontWeight: "700" }]}>
              {voting ? "Submitting vote…" : entry.has_voted ? "You voted for this project" : "Vote for People's Choice"}
            </Text>
          </Pressable>
        ) : null}
        <InfoBanner styles={styles} native={native} tokens={tokens} type={type} />
      </GallerySheetShell>
    )
  }

  if (selection.kind === "award") {
    const award = selection.item
    return (
      <GallerySheetShell visible={visible} title="Camp award" onClose={onClose} insets={insets} styles={collabSheetStyles}>
        <FacultySheetHero
          title={award.title}
          subtitle={award.student_name ?? "Award winner"}
          icon="ribbon-outline"
          pills={
            award.award_label ? (
              <FacultyStatusPill label={award.award_label} tone="warning" onDark />
            ) : (
              <FacultyStatusPill label="Award" tone="warning" onDark />
            )
          }
        />
        {award.description ? (
          <FacultySheetSection label="Award notes">
            <View style={styles.copyCard}>
              <Text style={[type.body, styles.copyText, { color: native.label }]}>{award.description}</Text>
            </View>
          </FacultySheetSection>
        ) : null}
        <FacultySheetSection label="Details">
          <FacultySheetGroupedList>
            {award.student_name ? (
              <FacultySheetMetricRow icon="person-outline" label="Winner" value={award.student_name} />
            ) : null}
            {award.project_title ? (
              <FacultySheetMetricRow icon="folder-open-outline" label="Project" value={award.project_title} isLast />
            ) : (
              <FacultySheetMetricRow icon="ribbon-outline" label="Award ID" value={`#${award.id}`} isLast />
            )}
          </FacultySheetGroupedList>
        </FacultySheetSection>
      </GallerySheetShell>
    )
  }

  const entry = selection.item
  return (
    <GallerySheetShell visible={visible} title="People's Choice" onClose={onClose} insets={insets} styles={collabSheetStyles}>
      <FacultySheetHero
        title={entry.student_name}
        subtitle={entry.project_title ?? "Camp gallery vote leader"}
        icon="heart-outline"
        pills={<FacultyStatusPill label={`#${entry.rank || "—"}`} tone="live" onDark />}
      />
      <FacultySheetSection label="Vote standing">
        <FacultySheetGroupedList>
          <FacultySheetMetricRow icon="trophy-outline" label="Rank" value={`#${entry.rank || "—"}`} />
          <FacultySheetMetricRow
            icon="heart-outline"
            label="Votes"
            value={String(entry.votes ?? entry.total_votes ?? "—")}
            isLast
          />
        </FacultySheetGroupedList>
      </FacultySheetSection>
    </GallerySheetShell>
  )
}

function GallerySheetShell({
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

function InfoBanner({
  styles,
  native,
  tokens,
  type,
}: {
  styles: ReturnType<typeof createStyles>
  native: ReturnType<typeof useThemedNative>
  tokens: ReturnType<typeof useAppThemeTokens>
  type: ReturnType<typeof useNativeType>
}) {
  return (
    <View style={[styles.infoBanner, { backgroundColor: semanticSoft(tokens.accent, tokens.isDark) }]}>
      <View style={[styles.infoIcon, { backgroundColor: native.secondaryGrouped }]}>
        <Ionicons name="images-outline" size={18} color={tokens.accent} />
      </View>
      <View style={styles.infoCopy}>
        <Text style={[type.bodyEmphasis, { color: native.label }]}>Final project showcase</Text>
        <Text style={[type.caption, { color: native.secondaryLabel }]}>
          Camp projects appear here after faculty publishes the end-of-camp gallery.
        </Text>
      </View>
    </View>
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
    voteBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 4,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
    },
  })
}
