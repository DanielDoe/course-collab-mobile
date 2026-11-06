import { useCallback, useEffect, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { ApiError } from "../../../lib/api"
import { AppAlert } from "../../../lib/app-alert"
import { instructorApi, type InstructorSyllabus } from "../../../lib/instructor-api"
import type { DiscoverableSyllabusRow } from "../../../lib/syllabus-exchange-types"
import { useFacultyScope } from "../../../hooks/useFacultyScope"
import { useFacultyModuleStyles } from "../../../lib/faculty-themed-ui"
import { useNativeType } from "../../../lib/themed-module-theme"
import { useThemedNative } from "../../../context/AppearanceProvider"
import { FacultyEmptyState } from "../faculty-shared"
import {
  COURSE_INFO_ACTION,
  COURSE_INFO_SYLLABUS_STATUS,
  courseInfoSyllabusThumb,
} from "../../../lib/course-info-color-theme"
import { SolidListThumbTile } from "../../theme/SolidListThumbTile"

type Props = {
  onApplied: (syllabus: InstructorSyllabus) => void
  contentPad: { paddingBottom: number }
}

export function FacultySyllabusExchangePanel({ onApplied, contentPad }: Props) {
  const { scope } = useFacultyScope()
  const styles = useFacultyModuleStyles()
  const native = useThemedNative()
  const type = useNativeType()

  const [searchInput, setSearchInput] = useState("")
  const [query, setQuery] = useState("")
  const [rows, setRows] = useState<DiscoverableSyllabusRow[]>([])
  const [loading, setLoading] = useState(true)
  const [applyingId, setApplyingId] = useState<number | null>(null)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    if (!scope) return
    setLoading(true)
    setError("")
    try {
      const data = await instructorApi.discoverSyllabusTemplates(scope, query)
      setRows(data.syllabi ?? [])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not search syllabi.")
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [query, scope])

  useEffect(() => {
    void load()
  }, [load])

  function applyTemplate(row: DiscoverableSyllabusRow) {
    if (!scope) return
    AppAlert.alert(
      "Use template",
      `Apply syllabus from ${row.instructorName} · ${row.courseCode}${row.sessionCode ? ` ${row.sessionCode}` : ""}? Your current draft will be replaced.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Use template",
          onPress: () => {
            void (async () => {
              setApplyingId(row.syllabusId)
              try {
                const result = await instructorApi.applySyllabusTemplate(scope, row.syllabusId)
                onApplied(result.syllabus)
                AppAlert.alert(
                  "Template applied",
                  "Review sections, edit for your course, then save or publish.",
                )
              } catch (err) {
                AppAlert.alert(
                  "Could not apply",
                  err instanceof ApiError ? err.message : "Try again.",
                )
              } finally {
                setApplyingId(null)
              }
            })()
          },
        },
      ],
    )
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, contentPad, localStyles.pad]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.card, localStyles.intro]}>
        <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 20 }]}>
          Public syllabus templates — search syllabi from any instructor on CourseCollab. Applying a
          template copies content into your course as a draft. Provenance is recorded automatically.
        </Text>
        <View style={localStyles.searchRow}>
          <View style={[localStyles.searchField, { backgroundColor: native.secondaryGrouped }]}>
            <Ionicons name="search-outline" size={18} color={native.tertiaryLabel} />
            <TextInput
              value={searchInput}
              onChangeText={setSearchInput}
              placeholder="Course code, title, instructor, term…"
              placeholderTextColor={native.tertiaryLabel}
              style={[type.body, localStyles.searchInput, { color: native.label }]}
              returnKeyType="search"
              onSubmitEditing={() => setQuery(searchInput.trim())}
            />
          </View>
          <Pressable
            style={[localStyles.searchBtn, { backgroundColor: COURSE_INFO_ACTION.fill }]}
            onPress={() => setQuery(searchInput.trim())}
            accessibilityRole="button"
          >
            <Text style={[type.bodyEmphasis, { color: COURSE_INFO_ACTION.ink }]}>Search</Text>
          </Pressable>
        </View>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={16} color={native.label} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator color={COURSE_INFO_ACTION.fill} style={{ marginTop: 24 }} />
      ) : rows.length === 0 ? (
        <FacultyEmptyState
          icon="copy-outline"
          title="No syllabi found"
          body="Try a different search, or publish a syllabus so others can discover it."
        />
      ) : (
        rows.map((row, index) => {
          const thumb = courseInfoSyllabusThumb(index)
          const meta = [
            row.courseTitle,
            row.term || null,
            row.instructorName,
            row.university,
            row.contentMode === "pdf"
              ? "PDF syllabus"
              : `${row.sectionCount} section${row.sectionCount === 1 ? "" : "s"}`,
          ]
            .filter(Boolean)
            .join(" · ")

          return (
            <View key={row.syllabusId} style={[styles.card, localStyles.rowCard]}>
              <View style={localStyles.rowMain}>
                <SolidListThumbTile thumb={thumb} icon="copy-outline" size="compact" />
                <View style={localStyles.rowCopy}>
                  <Text style={[type.bodyEmphasis, { color: native.label }]} numberOfLines={2}>
                    {row.courseCode}
                    {row.sessionCode ? ` · ${row.sessionCode}` : ""}
                  </Text>
                  <View style={localStyles.badges}>
                    <View
                      style={[
                        localStyles.chip,
                        {
                          backgroundColor:
                            row.status === "published"
                              ? COURSE_INFO_SYLLABUS_STATUS.published.bg
                              : COURSE_INFO_SYLLABUS_STATUS.draft.bg,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          localStyles.chipText,
                          {
                            color:
                              row.status === "published"
                                ? COURSE_INFO_SYLLABUS_STATUS.published.text
                                : COURSE_INFO_SYLLABUS_STATUS.draft.text,
                          },
                        ]}
                      >
                        {row.status === "published" ? "Published" : "Draft"}
                      </Text>
                    </View>
                    {row.isOwnCourse ? (
                      <View style={[localStyles.chip, { backgroundColor: native.secondaryGrouped }]}>
                        <Text style={[localStyles.chipText, { color: native.secondaryLabel }]}>
                          Your course
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={3}>
                    {meta}
                  </Text>
                </View>
              </View>
              <Pressable
                style={[
                  localStyles.useBtn,
                  { backgroundColor: COURSE_INFO_ACTION.fill },
                  applyingId != null && applyingId !== row.syllabusId && { opacity: 0.5 },
                ]}
                disabled={applyingId != null}
                onPress={() => applyTemplate(row)}
                accessibilityRole="button"
              >
                {applyingId === row.syllabusId ? (
                  <ActivityIndicator color={COURSE_INFO_ACTION.ink} size="small" />
                ) : (
                  <>
                    <Ionicons name="arrow-down-outline" size={16} color={COURSE_INFO_ACTION.ink} />
                    <Text style={[type.bodyEmphasis, { color: COURSE_INFO_ACTION.ink }]}>
                      Use template
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          )
        })
      )}
    </ScrollView>
  )
}

const localStyles = StyleSheet.create({
  pad: { gap: 10 },
  intro: { gap: 12 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  searchField: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  searchInput: { flex: 1, paddingVertical: 8 },
  searchBtn: {
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  rowCard: { gap: 12 },
  rowMain: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  rowCopy: { flex: 1, minWidth: 0, gap: 6 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { fontSize: 10, fontWeight: "700" },
  useBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    paddingVertical: 12,
  },
})
