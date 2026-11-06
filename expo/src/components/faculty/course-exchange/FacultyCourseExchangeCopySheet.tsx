import { ScrollView, Text } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  type ExchangeCopyRow,
  copyRowUpdateCount,
  summarizeCloneCounts,
} from "../../../lib/course-exchange-shared"
import { FACULTY_COURSE_EXCHANGE_COLOR, facultyCourseExchangeThumb } from "../../../lib/faculty-course-exchange-theme"
import {
  FacultySheetActionRow,
  FacultySheetChrome,
  FacultySheetHero,
  FacultySheetModal,
  FacultySheetNotice,
  FacultySheetSection,
  FacultySheetStatChip,
  FacultySheetStatRow,
  useCollabSheetStyles,
} from "../faculty-collab-sheet-ui"
import { FacultyStatusPill } from "../faculty-shared"
import { SHEET_METRIC, SHEET_SECTION } from "../faculty-sheet-semantics"
import { useNativeType } from "../../../lib/themed-module-theme"
import { useThemedNative } from "../../../context/AppearanceProvider"

type Props = {
  visible: boolean
  copy: ExchangeCopyRow | null
  variant: "shared-with-me" | "my-shared"
  updateCount?: number
  onClose: () => void
  onUpdate?: () => void
}

export function FacultyCourseExchangeCopySheet({
  visible,
  copy,
  variant,
  updateCount,
  onClose,
  onUpdate,
}: Props) {
  const insets = useSafeAreaInsets()
  const native = useThemedNative()
  const type = useNativeType()
  const collabSheetStyles = useCollabSheetStyles()

  if (!copy) return null

  const id = Number(copy.id ?? 0)
  const title =
    variant === "shared-with-me"
      ? String(copy.destination_course_code ?? "Imported copy")
      : String(copy.source_course_code ?? "Shared course")
  const subtitle =
    variant === "shared-with-me"
      ? `From ${String(copy.source_instructor_name ?? "creator")} · ${String(copy.source_course_code ?? "")}`
      : `Requested by ${String(copy.requester_name ?? "instructor")}`
  const summary = summarizeCloneCounts(
    (copy.clone_summary as Record<string, unknown> | undefined) ?? null,
  )
  const pending = updateCount ?? copyRowUpdateCount(copy)
  const thumb = facultyCourseExchangeThumb(id || title)

  return (
    <FacultySheetModal visible={visible} onRequestClose={onClose} layout="glassBottom">
      <FacultySheetChrome
        topInset={insets.top}
        title={variant === "shared-with-me" ? "Imported copy" : "Outbound share"}
        onClose={onClose}
        accentColor={FACULTY_COURSE_EXCHANGE_COLOR.action}
        pageSheet
      />
      <ScrollView
        contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <FacultySheetHero
          title={title}
          subtitle={subtitle}
          icon={variant === "shared-with-me" ? "book-outline" : "share-social-outline"}
          thumbColor={thumb.fill}
          pills={
            pending > 0 ? <FacultyStatusPill label={`${pending} updates`} tone="warning" /> : undefined
          }
        />

        <FacultySheetStatRow>
          {copy.source_course_code ? (
            <FacultySheetStatChip
              icon="school-outline"
              label="Source"
              value={String(copy.source_course_code)}
              tone={SHEET_METRIC.info}
            />
          ) : null}
          {copy.destination_course_code ? (
            <FacultySheetStatChip
              icon="download-outline"
              label="Destination"
              value={String(copy.destination_course_code)}
              tone={SHEET_METRIC.primary}
            />
          ) : null}
        </FacultySheetStatRow>

        {summary ? (
          <FacultySheetSection label="Copied materials" tone={SHEET_SECTION.review}>
            <Text style={[type.secondary, { color: native.secondaryLabel, lineHeight: 20 }]}>{summary}</Text>
          </FacultySheetSection>
        ) : null}

        <FacultySheetNotice message="This is an independent copy. Edits here never change the original course." />

        {variant === "shared-with-me" && pending > 0 && onUpdate ? (
          <FacultySheetSection label="Actions" tone={SHEET_SECTION.tools}>
            <FacultySheetActionRow
              icon="refresh-outline"
              label="Review source updates"
              subtitle={`${pending} changes are available from the original course`}
              tone="primary"
              onPress={onUpdate}
            />
          </FacultySheetSection>
        ) : null}
      </ScrollView>
    </FacultySheetModal>
  )
}
