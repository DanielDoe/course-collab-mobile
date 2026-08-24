import { useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  COURSE_EXCHANGE_MODULE_LABELS,
  EXCHANGE_OWN_GROUPS_PROJECTS_NOTE,
  EXCHANGE_POST_IMPORT_CHECKLIST,
  type DestinationCourseRow,
  type ExchangeRequestDetail,
  type ExchangeSessionRow,
} from "../../../lib/course-exchange-shared"
import { isOwnGroupsProjectsSession } from "../../../lib/course-exchange/groups-projects-session-policy"
import { FACULTY_COURSE_EXCHANGE_COLOR } from "../../../lib/faculty-course-exchange-theme"
import {
  FacultySheetChrome,
  FacultySheetContainer,
  FacultySheetNotice,
  FacultySheetSection,
  useCollabSheetStyles,
} from "../faculty-collab-sheet-ui"
import { useThemedNative } from "../../../context/AppearanceProvider"
import { useNativeType } from "../../../lib/themed-module-theme"
import { AppButton } from "../../theme/AppButton"

type Props = {
  visible: boolean
  request: ExchangeRequestDetail | null
  destinationCourses: DestinationCourseRow[]
  sessions: ExchangeSessionRow[]
  loading: boolean
  onClose: () => void
  onImport: (payload: { destinationCourseId: number; destinationSessionId?: number | null }) => Promise<void>
}

export function FacultyCourseExchangeImportSheet({
  visible,
  request,
  destinationCourses,
  sessions,
  loading,
  onClose,
  onImport,
}: Props) {
  const insets = useSafeAreaInsets()
  const native = useThemedNative()
  const type = useNativeType()
  const collabSheetStyles = useCollabSheetStyles()

  const [destinationCourseId, setDestinationCourseId] = useState<number | null>(null)
  const [destinationSessionId, setDestinationSessionId] = useState<number | null>(null)

  useEffect(() => {
    if (!visible || !request) return
    const preferred =
      request.destination_course_id ??
      destinationCourses[0]?.course_id ??
      null
    setDestinationCourseId(preferred)
    setDestinationSessionId(request.destination_session_id ?? null)
  }, [visible, request, destinationCourses])

  const importHasGroupsProjects = useMemo(
    () => (request?.approved_modules ?? []).some((m) => m === "groups" || m === "projects"),
    [request],
  )

  const filteredSessions = useMemo(() => {
    if (!destinationCourseId) return []
    let list = sessions.filter((s) => s.course_id === destinationCourseId)
    if (importHasGroupsProjects) {
      list = list.filter((s) => !isOwnGroupsProjectsSession(s.code))
    }
    return list
  }, [destinationCourseId, sessions, importHasGroupsProjects])

  const selectedDestinationCode = useMemo(() => {
    if (!destinationCourseId) return null
    return destinationCourses.find((c) => c.course_id === destinationCourseId)?.course_code ?? null
  }, [destinationCourseId, destinationCourses])

  const groupsProjectsExcludedForCourse = isOwnGroupsProjectsSession(selectedDestinationCode)

  if (!request) return null

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer style={{ flex: 1 }}>
        <FacultySheetChrome
          title="Import approved modules"
          subtitle={[request.courseCode, request.courseTitle].filter(Boolean).join(" — ")}
          topInset={insets.top}
          onClose={onClose}
          accentColor={FACULTY_COURSE_EXCHANGE_COLOR.action}
        />
        <ScrollView contentContainerStyle={[collabSheetStyles.scroll, { paddingBottom: insets.bottom + 24 }]}>
          <FacultySheetSection label="Approved for import">
            <Text style={[type.secondary, { color: native.secondaryLabel }]}>
              {(request.approved_modules ?? []).map((m) => COURSE_EXCHANGE_MODULE_LABELS[m]).join(" · ")}
            </Text>
          </FacultySheetSection>

          <FacultySheetSection label="Course shell">
            <View style={styles.list}>
              {destinationCourses.map((c) => {
                const active = destinationCourseId === c.course_id
                return (
                  <Pressable
                    key={c.course_id}
                    onPress={() => {
                      setDestinationCourseId(c.course_id)
                      setDestinationSessionId(null)
                    }}
                    style={[
                      styles.row,
                      {
                        borderColor: active ? FACULTY_COURSE_EXCHANGE_COLOR.action : native.separator,
                        backgroundColor: active ? `${FACULTY_COURSE_EXCHANGE_COLOR.action}12` : native.fill,
                      },
                    ]}
                  >
                    <Ionicons
                      name={active ? "radio-button-on" : "radio-button-off"}
                      size={18}
                      color={active ? FACULTY_COURSE_EXCHANGE_COLOR.action : native.tertiaryLabel}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[type.bodyEmphasis, { color: native.label }]}>{c.course_code}</Text>
                      <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={1}>
                        {c.course_title}
                      </Text>
                    </View>
                  </Pressable>
                )
              })}
            </View>
          </FacultySheetSection>

          {filteredSessions.length > 0 ? (
            <FacultySheetSection label="Destination section (optional)">
              {importHasGroupsProjects ? (
                <FacultySheetNotice message={EXCHANGE_OWN_GROUPS_PROJECTS_NOTE} />
              ) : null}
              <View style={styles.list}>
                <Pressable
                  onPress={() => setDestinationSessionId(null)}
                  style={[
                    styles.row,
                    {
                      borderColor: destinationSessionId == null ? FACULTY_COURSE_EXCHANGE_COLOR.action : native.separator,
                      backgroundColor:
                        destinationSessionId == null ? `${FACULTY_COURSE_EXCHANGE_COLOR.action}12` : native.fill,
                    },
                  ]}
                >
                  <Text style={[type.body, { color: native.label }]}>No section mapping</Text>
                </Pressable>
                {filteredSessions.map((s) => {
                  const active = destinationSessionId === s.id
                  return (
                    <Pressable
                      key={s.id}
                      onPress={() => setDestinationSessionId(s.id)}
                      style={[
                        styles.row,
                        {
                          borderColor: active ? FACULTY_COURSE_EXCHANGE_COLOR.action : native.separator,
                          backgroundColor: active ? `${FACULTY_COURSE_EXCHANGE_COLOR.action}12` : native.fill,
                        },
                      ]}
                    >
                      <Text style={[type.bodyEmphasis, { color: native.label }]}>{s.code}</Text>
                    </Pressable>
                  )
                })}
              </View>
            </FacultySheetSection>
          ) : null}

          <FacultySheetSection label="After import">
            {EXCHANGE_POST_IMPORT_CHECKLIST.map((item) => (
              <Text key={item} style={[type.caption, { color: native.secondaryLabel }]}>
                · {item}
              </Text>
            ))}
          </FacultySheetSection>

          {groupsProjectsExcludedForCourse && importHasGroupsProjects ? (
            <FacultySheetNotice
              tone="warning"
              message="Groups and projects will be skipped for this destination. Other approved modules will still import."
            />
          ) : (
            <FacultySheetNotice
              tone="warning"
              message="This creates an independent copy. Your edits never affect the creator's course."
            />
          )}

          <AppButton
            label="Run import"
            backgroundColor={FACULTY_COURSE_EXCHANGE_COLOR.action}
            disabled={loading || !destinationCourseId}
            loading={loading}
            onPress={() =>
              destinationCourseId
                ? void onImport({
                    destinationCourseId,
                    destinationSessionId,
                  })
                : undefined
            }
          />
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}

const styles = StyleSheet.create({
  list: { gap: 8, marginTop: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
})
