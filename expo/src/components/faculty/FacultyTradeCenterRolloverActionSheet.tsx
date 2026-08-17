import { Modal, ScrollView } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  formatTradeLogWhen,
  humanizeTradeStatus,
  type TradeCenterRolloverTradeView,
} from "../../lib/faculty-trade-center-utils"
import { studentInitials } from "../../lib/faculty-students-utils"
import {
  FACULTY_TRADE_CENTER_COLOR,
  facultyTradeCenterTraderThumb,
} from "../../lib/faculty-trade-center-theme"
import { FacultyStatusPill } from "./faculty-shared"
import {
  FacultySheetChrome,
  FacultySheetContainer,
  FacultySheetGroupedList,
  FacultySheetHero,
  FacultySheetMetricRow,
  FacultySheetSection,
  useCollabSheetStyles,
} from "./faculty-collab-sheet-ui"
import { SHEET_SECTION } from "./faculty-sheet-semantics"

type Props = {
  visible: boolean
  trade: TradeCenterRolloverTradeView | null
  onClose: () => void
}

export function FacultyTradeCenterRolloverActionSheet({ visible, trade, onClose }: Props) {
  const collabSheetStyles = useCollabSheetStyles()
  const insets = useSafeAreaInsets()

  if (!trade) return null

  const thumb = facultyTradeCenterTraderThumb(trade.studentId || trade.studentName)
  const statusTone = trade.isActive ? "live" : "neutral"
  const statusLabel = trade.isActive ? "Active" : "Expired"

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer>
        <FacultySheetChrome
          topInset={insets.top}
          title="Rollover trade"
          onClose={onClose}
          accentColor={FACULTY_TRADE_CENTER_COLOR.rollover}
        />

        <ScrollView
          contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <FacultySheetHero
            title={trade.studentName}
            subtitle={[trade.studentNumber, trade.section].filter(Boolean).join(" · ") || "Student rollover"}
            initials={studentInitials(trade.studentName)}
            thumbColor={thumb.fill}
            pills={
              <>
                <FacultyStatusPill label={statusLabel} tone={statusTone} />
                {trade.isDevFixture ? <FacultyStatusPill label="Simulator QA" tone="neutral" /> : null}
              </>
            }
          />

          <FacultySheetSection label="Assignment" tone={SHEET_SECTION.roster}>
            <FacultySheetGroupedList>
              <FacultySheetMetricRow icon="document-text-outline" label="Title" value={trade.quizTitle} />
              <FacultySheetMetricRow
                icon="school-outline"
                label="Assessment type"
                value={humanizeTradeStatus(trade.assessmentType || "assessment")}
              />
              {trade.quizId > 0 ? (
                <FacultySheetMetricRow icon="key-outline" label="Assessment ID" value={String(trade.quizId)} isLast />
              ) : (
                <FacultySheetMetricRow icon="key-outline" label="Assessment ID" value="—" isLast />
              )}
            </FacultySheetGroupedList>
          </FacultySheetSection>

          <FacultySheetSection label="Rollover details" tone={SHEET_SECTION.edit}>
            <FacultySheetGroupedList>
              <FacultySheetMetricRow icon="layers-outline" label="Source" value={trade.sourceLabel} />
              <FacultySheetMetricRow
                icon="sparkles-outline"
                label="Points traded"
                value={trade.pointsTraded > 0 ? `${trade.pointsTraded} pts` : "Instructor grant"}
              />
              <FacultySheetMetricRow icon="time-outline" label="Extension" value={`${trade.hours} hours`} />
              <FacultySheetMetricRow
                icon="calendar-outline"
                label="Applied"
                value={trade.appliedAt ? formatTradeLogWhen(trade.appliedAt) : "—"}
              />
              <FacultySheetMetricRow
                icon="hourglass-outline"
                label="Expires"
                value={trade.expiresAt ? formatTradeLogWhen(trade.expiresAt) : "—"}
              />
              {trade.membershipTier ? (
                <FacultySheetMetricRow icon="ribbon-outline" label="Membership" value={trade.membershipTier} isLast />
              ) : (
                <FacultySheetMetricRow icon="ribbon-outline" label="Membership" value="—" isLast />
              )}
            </FacultySheetGroupedList>
          </FacultySheetSection>
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}
