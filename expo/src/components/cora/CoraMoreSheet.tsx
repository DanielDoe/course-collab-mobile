import { Modal, ScrollView, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@/components/icons/AppIcon"
import { CORA_SECTIONS, type CoraSectionId } from "../../lib/cora-nav-config"
import {
  FacultySheetActionRow,
  FacultySheetChrome,
  FacultySheetContainer,
  FacultySheetSection,
  useCollabSheetStyles,
} from "../faculty/faculty-collab-sheet-ui"
import { SHEET_SECTION } from "../faculty/faculty-sheet-semantics"

type MoreSection = {
  id: CoraSectionId
  label: string
  icon: keyof typeof Ionicons.glyphMap
  subtitle: string
}

const LEARNING_SECTIONS: MoreSection[] = [
  {
    id: "learn",
    label: "Learn",
    icon: "book-outline",
    subtitle: "Lecture summaries, flashcards, and quizzes",
  },
  {
    id: "study-plan",
    label: "Study Plan",
    icon: "flag-outline",
    subtitle: "Daily focus, exam countdown, adaptive weekly plans",
  },
  {
    id: "insights",
    label: "Insights",
    icon: "bar-chart-outline",
    subtitle: "Topic mastery graph and activity snapshot",
  },
]

const TOOLS_SECTIONS: MoreSection[] = [
  {
    id: "code",
    label: "Code",
    icon: "code-slash-outline",
    subtitle: "CodeBench — C++, MATLAB, and debugging tools",
  },
  {
    id: "tools",
    label: "Tools",
    icon: "construct-outline",
    subtitle: "Summarize, flashcards, quiz, export to notes",
  },
  {
    id: "preferences",
    label: "Preferences",
    icon: "settings-outline",
    subtitle: "Cora Memory and learning personalization",
  },
]

/** Ensure nav config stays the source of truth for labels/icons. */
function resolveSection(section: MoreSection): MoreSection {
  const fromNav = CORA_SECTIONS.find((item) => item.id === section.id)
  if (!fromNav) return section
  return { ...section, label: fromNav.label, icon: fromNav.icon }
}

type Props = {
  visible: boolean
  onClose: () => void
  onSelect: (section: CoraSectionId) => void
}

function SectionRows({
  sections,
  onSelect,
  onClose,
}: {
  sections: MoreSection[]
  onSelect: (section: CoraSectionId) => void
  onClose: () => void
}) {
  return (
    <View style={styles.actionStack}>
      {sections.map((section) => {
        const item = resolveSection(section)
        return (
          <FacultySheetActionRow
            key={item.id}
            icon={item.icon}
            label={item.label}
            subtitle={item.subtitle}
            onPress={() => {
              onSelect(item.id)
              onClose()
            }}
          />
        )
      })}
    </View>
  )
}

export function CoraMoreSheet({ visible, onClose, onSelect }: Props) {
  const insets = useSafeAreaInsets()
  const collabSheetStyles = useCollabSheetStyles()

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome topInset={insets.top} title="Explore Cora" onClose={onClose} />
        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, styles.scroll, { paddingBottom: insets.bottom + 28 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        >
          <FacultySheetSection label="Learning & Progress" tone={SHEET_SECTION.review} hint="Study smarter with course-aware tools">
            <SectionRows sections={LEARNING_SECTIONS} onSelect={onSelect} onClose={onClose} />
          </FacultySheetSection>

          <FacultySheetSection label="Build & Settings" tone={SHEET_SECTION.tools} hint="Programming workspace and Cora preferences">
            <SectionRows sections={TOOLS_SECTIONS} onSelect={onSelect} onClose={onClose} />
          </FacultySheetSection>
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}

const styles = StyleSheet.create({
  scroll: {
    gap: 14,
  },
  actionStack: {
    gap: 10,
  },
})
