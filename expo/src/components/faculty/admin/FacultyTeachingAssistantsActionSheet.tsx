import { useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppAlert } from '../../../lib/app-alert'
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  instructorAdminApi,
  type CreateTeachingAssistantPayload,
  type TaPermissionsResponse,
  type TeachingAssistant,
  type UpdateTeachingAssistantPayload,
} from "../../../lib/instructor-admin-api"
import type { InstructorCourse } from "../../../lib/instructor-api"
import { FACULTY_ADMIN_COLOR } from "../../../lib/faculty-admin-theme"
import { facultyAdminTaThumb } from "../../../lib/faculty-admin-theme"
import { FACULTY_NAV_GROUPS } from "../../../constants/faculty-nav"
import { NATIVE } from "../../../constants/faculty-native-theme"
import { semanticSoft } from "../../../lib/themed-module-theme"
import { useModuleTheme } from "../../../lib/themed-module-shell"
import { FacultyStatusPill } from "../faculty-shared"
import { FacultyAdminToggleRow } from "../faculty-admin-ui"
import {
  FacultySheetChrome,
  FacultySheetField,
  FacultySheetGroupedList,
  FacultySheetHero,
  FacultySheetSaveAction,
  FacultySheetSection,
  FacultySheetStatChip,
  FacultySheetStatRow,
  FacultySheetTextInput,
  FacultySheetErrorBanner,
  useCollabSheetStyles,
} from "../faculty-collab-sheet-ui"
import { SHEET_SECTION } from "../faculty-sheet-semantics"
import { GlassBottomSheetModal } from "../../theme/GlassBottomSheetModal"
import { GlassSheetBackground } from "../../theme/GlassSurface"

type CourseWithTerm = InstructorCourse & { is_active_term?: boolean }

export type FacultyTeachingAssistantSheetProps = {
  visible: boolean
  mode: "create" | "edit"
  instructorId: number
  courses: CourseWithTerm[]
  initial?: TeachingAssistant | null
  onClose: () => void
  onSaved: () => void
}

const PERMISSION_LABELS: Record<string, string> = Object.fromEntries(
  FACULTY_NAV_GROUPS.flatMap((group) => group.items.map((item) => [item.id, item.label])),
)

function taInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

function formatPermissionLabel(key: string) {
  return (
    PERMISSION_LABELS[key] ??
    key
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
  )
}

function formatLastLogin(value?: string | null) {
  if (!value) return "Never"
  try {
    return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
  } catch {
    return value
  }
}

export function FacultyTeachingAssistantActionSheet({
  visible,
  mode,
  instructorId,
  courses,
  initial,
  onClose,
  onSaved,
}: FacultyTeachingAssistantSheetProps) {
  const insets = useSafeAreaInsets()
  const collabSheetStyles = useCollabSheetStyles()
  const { native, tokens, type } = useModuleTheme()

  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [courseIds, setCourseIds] = useState<number[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [permCourseId, setPermCourseId] = useState<number | null>(null)
  const [permissions, setPermissions] = useState<TaPermissionsResponse | null>(null)
  const [permLoading, setPermLoading] = useState(false)
  const [permSaving, setPermSaving] = useState<string | null>(null)

  useEffect(() => {
    if (!visible) return
    setUsername(initial?.username ?? "")
    setEmail(initial?.email ?? "")
    setName(initial?.name ?? "")
    setPassword("")
    setCourseIds(initial?.assigned_course_ids ?? [])
    setError("")
    setPermissions(null)
    const firstCourse = initial?.assigned_course_ids?.[0] ?? courses[0]?.id ?? null
    setPermCourseId(firstCourse)
  }, [visible, initial, courses])

  useEffect(() => {
    if (!visible || mode !== "edit" || !initial || !permCourseId) {
      setPermissions(null)
      return
    }
    setPermLoading(true)
    instructorAdminApi
      .getTaPermissions(instructorId, initial.id, permCourseId)
      .then(setPermissions)
      .catch(() => setPermissions(null))
      .finally(() => setPermLoading(false))
  }, [visible, mode, initial, permCourseId, instructorId])

  function toggleCourse(courseId: number) {
    setCourseIds((prev) => {
      const next = prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
      if (mode === "edit" && permCourseId && !next.includes(permCourseId)) {
        setPermCourseId(next[0] ?? null)
      }
      return next
    })
  }

  async function handleSubmit() {
    if (!username.trim() || !email.trim() || !name.trim()) {
      setError("Username, email, and name are required.")
      return
    }
    if (mode === "create" && courseIds.length === 0) {
      setError("Assign at least one course before creating the assistant.")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      if (mode === "create") {
        const payload: CreateTeachingAssistantPayload = {
          username: username.trim(),
          email: email.trim(),
          name: name.trim(),
          course_ids: courseIds,
        }
        if (password.trim()) payload.password = password.trim()
        await instructorAdminApi.createTeachingAssistant(instructorId, payload)
      } else if (initial) {
        const payload: UpdateTeachingAssistantPayload = {
          username: username.trim(),
          email: email.trim(),
          name: name.trim(),
          course_ids: courseIds,
        }
        if (password.trim()) payload.password = password.trim()
        await instructorAdminApi.updateTeachingAssistant(instructorId, initial.id, payload)
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save teaching assistant.")
    } finally {
      setSubmitting(false)
    }
  }

  function handleDeactivate() {
    if (!initial) return
    AppAlert.alert(
      "Deactivate assistant",
      `${initial.name} will lose access until you reactivate their account.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deactivate",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setSubmitting(true)
              try {
                await instructorAdminApi.deleteTeachingAssistant(instructorId, initial.id)
                onSaved()
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not deactivate.")
              } finally {
                setSubmitting(false)
              }
            })()
          },
        },
      ],
    )
  }

  async function togglePermission(key: string, enabled: boolean) {
    if (!initial || !permCourseId) return
    setPermSaving(key)
    try {
      const response = await instructorAdminApi.patchTaPermissions(instructorId, {
        taId: initial.id,
        courseId: permCourseId,
        permissions: { [key]: enabled },
      })
      setPermissions((prev) =>
        prev
          ? {
              ...prev,
              effective: response.effective,
              navAccess: response.navAccess ?? prev.navAccess,
            }
          : prev,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update permissions.")
    } finally {
      setPermSaving(null)
    }
  }

  const permissionKeys = useMemo(() => {
    if (!permissions) return [] as string[]
    if (permissions.keys?.length) return permissions.keys
    if (permissions.navAccess) return Object.keys(permissions.navAccess)
    return Object.keys(permissions.effective ?? {})
  }, [permissions])

  const assignedCourses = useMemo(
    () => courses.filter((course) => courseIds.includes(course.id)),
    [courses, courseIds],
  )

  const permCourse = courses.find((course) => course.id === permCourseId)

  return (
    <GlassBottomSheetModal
      visible={visible}
      onClose={onClose}
      maxHeight="92%"
      keyboardAvoiding
      accessibilityLabel={mode === "create" ? "Close add teaching assistant" : "Close teaching assistant"}
    >
      <GlassSheetBackground style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <FacultySheetChrome
          topInset={0}
          title={mode === "create" ? "Add Teaching Assistant" : "Manage Assistant"}
          subtitle={
            mode === "edit" && initial
              ? `@${initial.username}`
              : "Credentials, course access, and module permissions"
          }
          onClose={onClose}
          accentColor={FACULTY_ADMIN_COLOR.link}
          rightSlot={
            <FacultySheetSaveAction
              label={mode === "create" ? "Create" : "Save"}
              saving={submitting}
              onPress={() => void handleSubmit()}
            />
          }
        />

        <View style={[collabSheetStyles.scroll, styles.scrollBody]}>
          {error ? <FacultySheetErrorBanner message={error} /> : null}

          {mode === "create" ? (
            <FacultySheetHero
              title="New teaching assistant"
              subtitle="Create login credentials, assign courses, then fine-tune module access after saving."
              icon="person-add-outline"
              thumbColor={FACULTY_ADMIN_COLOR.link}
            />
          ) : initial ? (
            <>
              <FacultySheetHero
                title={initial.name}
                subtitle={initial.email}
                initials={taInitials(initial.name)}
                thumbColor={facultyAdminTaThumb(initial.id).fill}
                pills={
                  <>
                    <FacultyStatusPill
                      label={initial.is_active ? "Active" : "Inactive"}
                      tone={initial.is_active ? "live" : "neutral"}
                    />
                    {assignedCourses.length ? (
                      <FacultyStatusPill
                        label={`${assignedCourses.length} course${assignedCourses.length === 1 ? "" : "s"}`}
                        tone="neutral"
                      />
                    ) : null}
                  </>
                }
              />

              <FacultySheetStatRow>
                <FacultySheetStatChip
                  icon="at-outline"
                  label="Username"
                  value={`@${initial.username}`}
                  tone="slate"
                />
                <FacultySheetStatChip
                  icon="time-outline"
                  label="Last login"
                  value={formatLastLogin(initial.last_login)}
                  tone="sky"
                />
              </FacultySheetStatRow>
            </>
          ) : null}

          <FacultySheetSection
            label="Account"
            hint="Login identity used when the TA signs in to CourseCollab."
            tone={SHEET_SECTION.edit}
          >
            <FacultySheetField label="Username">
              <FacultySheetTextInput
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                placeholder="ta_username"
              />
            </FacultySheetField>
            <FacultySheetField label="Email">
              <FacultySheetTextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="ta@university.edu"
              />
            </FacultySheetField>
            <FacultySheetField label="Full name">
              <FacultySheetTextInput value={name} onChangeText={setName} placeholder="Teaching Assistant" />
            </FacultySheetField>
            <FacultySheetField label={mode === "create" ? "Password" : "New password (optional)"}>
              <FacultySheetTextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                placeholder={mode === "create" ? "Temporary password" : "Leave blank to keep current"}
              />
            </FacultySheetField>
          </FacultySheetSection>

          <FacultySheetSection
            label="Course access"
            hint="TAs only see modules for courses you assign here."
            tone={SHEET_SECTION.roster}
          >
            {courses.length === 0 ? (
              <Text style={[type.secondary, { color: native.secondaryLabel, paddingVertical: 8 }]}>
                No courses available on this account.
              </Text>
            ) : (
              <FacultySheetGroupedList>
                {courses.map((course, index) => (
                  <FacultyAdminToggleRow
                    key={course.id}
                    label={course.course_code}
                    subtitle={[course.course_title, course.semester].filter(Boolean).join(" · ")}
                    value={courseIds.includes(course.id)}
                    onChange={() => toggleCourse(course.id)}
                    isLast={index === courses.length - 1}
                  />
                ))}
              </FacultySheetGroupedList>
            )}
          </FacultySheetSection>

          {mode === "edit" && initial ? (
            <FacultySheetSection
              label="Module permissions"
              hint={
                permCourse
                  ? `Access toggles for ${permCourse.course_code} — changes apply immediately.`
                  : "Assign a course above to configure module access."
              }
              tone={SHEET_SECTION.review}
            >
              {courseIds.length === 0 ? (
                <Text style={[type.secondary, { color: native.secondaryLabel, paddingVertical: 8 }]}>
                  Assign at least one course to manage permissions.
                </Text>
              ) : courseIds.length > 1 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.permCourseRow}
                >
                  {courseIds.map((id) => {
                    const course = courses.find((c) => c.id === id)
                    const active = permCourseId === id
                    return (
                      <Pressable
                        key={id}
                        style={[
                          styles.permCourseChip,
                          {
                            backgroundColor: active ? `${FACULTY_ADMIN_COLOR.link}18` : native.fill,
                            borderColor: active ? FACULTY_ADMIN_COLOR.link : native.separator,
                          },
                        ]}
                        onPress={() => setPermCourseId(id)}
                      >
                        <Text
                          style={[
                            type.caption,
                            styles.permCourseChipText,
                            { color: active ? FACULTY_ADMIN_COLOR.link : native.secondaryLabel },
                          ]}
                        >
                          {course?.course_code ?? `#${id}`}
                        </Text>
                      </Pressable>
                    )
                  })}
                </ScrollView>
              ) : null}

              {permLoading ? (
                <View style={styles.permLoading}>
                  <ActivityIndicator color={FACULTY_ADMIN_COLOR.link} />
                  <Text style={[type.caption, { color: native.secondaryLabel }]}>Loading permissions…</Text>
                </View>
              ) : !permCourseId ? null : permissionKeys.length === 0 ? (
                <Text style={[type.secondary, { color: native.secondaryLabel, paddingVertical: 8 }]}>
                  No module permissions returned for this course.
                </Text>
              ) : (
                <FacultySheetGroupedList>
                  {permissionKeys.map((key, index) => {
                    const enabled =
                      permissions?.navAccess?.[key] ?? permissions?.effective?.[key] ?? false
                    return (
                      <FacultyAdminToggleRow
                        key={key}
                        label={formatPermissionLabel(key)}
                        subtitle="Allow access to this faculty module"
                        value={Boolean(enabled)}
                        disabled={permSaving === key}
                        isLast={index === permissionKeys.length - 1}
                        onChange={(next) => void togglePermission(key, next)}
                      />
                    )
                  })}
                </FacultySheetGroupedList>
              )}
            </FacultySheetSection>
          ) : null}

          {mode === "edit" && initial ? (
            <Pressable
              style={[
                styles.deactivateBtn,
                { backgroundColor: semanticSoft(tokens.danger, tokens.isDark) },
              ]}
              onPress={handleDeactivate}
              disabled={submitting}
            >
              <Text style={[type.bodyEmphasis, { color: tokens.danger }]}>Deactivate Assistant</Text>
            </Pressable>
          ) : null}
        </View>
      </GlassSheetBackground>
    </GlassBottomSheetModal>
  )
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  scrollBody: {
    paddingBottom: 20,
  },
  permCourseRow: {
    gap: 8,
    paddingBottom: 12,
  },
  permCourseChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
  },
  permCourseChipText: {
    fontWeight: "700",
  },
  permLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
  },
  deactivateBtn: {
    marginTop: 4,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: NATIVE.sectionRadius,
  },
})
