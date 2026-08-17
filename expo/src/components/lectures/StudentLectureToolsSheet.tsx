import { Modal, ScrollView } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import {
  FacultySheetActionRow,
  FacultySheetChrome,
  FacultySheetContainer,
  FacultySheetHero,
  FacultySheetSection,
  useCollabSheetStyles,
} from "../faculty/faculty-collab-sheet-ui"
import { SHEET_LECTURE, SHEET_SECTION } from "../faculty/faculty-sheet-semantics"

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
  const tokens = useAppThemeTokens()

  function pick(action: () => void) {
    onClose()
    requestAnimationFrame(action)
  }

  const subtitle =
    lectureTitle?.trim() ||
    "Practice problems, workspace, downloads, and other options for this deck."

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome topInset={insets.top} title="Slide tools" onClose={onClose} />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <FacultySheetHero
            title="Lecture tools"
            subtitle={subtitle}
            icon="layers-outline"
            thumbColor={tokens.accent}
          />

          <FacultySheetSection label="On slides" tone={SHEET_SECTION.highlight}>
            <FacultySheetActionRow
              icon="sparkles-outline"
              label={samplePracticeLabel}
              subtitle={countDetail(
                samplePracticeCount,
                "example",
                "examples",
                "Interactive drills while you follow the deck",
              )}
              accent={SHEET_LECTURE.samplePractice}
              onPress={() => pick(onOpenSamplePractice)}
            />
            <FacultySheetActionRow
              icon="brush-outline"
              label={workspaceLabel}
              subtitle={countDetail(
                workspaceCount,
                "problem",
                "problems",
                "Ink workspace with step-by-step solutions",
              )}
              accent={SHEET_LECTURE.workspace}
              onPress={() => pick(onOpenWorkspace)}
            />
          </FacultySheetSection>

          {canDownload || canOpenExternally ? (
            <FacultySheetSection label="Slide deck" tone={SHEET_LECTURE.slideDeck}>
              {canDownload ? (
                <FacultySheetActionRow
                  icon="download-outline"
                  label="Download slides"
                  subtitle="Save the PDF deck to your device"
                  accent={SHEET_LECTURE.deck}
                  onPress={() => pick(onDownloadSlides)}
                />
              ) : null}
              {canOpenExternally ? (
                <FacultySheetActionRow
                  icon="open-outline"
                  label="Open externally"
                  subtitle="View in browser or Files"
                  accent={SHEET_LECTURE.preview}
                  onPress={() => pick(onOpenExternally)}
                />
              ) : null}
            </FacultySheetSection>
          ) : null}
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}
