import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { AuthKeyboardShell } from "../motion/AuthKeyboardShell"
import { ApiError, api, type UniversityRecord } from "../../lib/api"
import {
  submitStudentAccessRequest,
  type AccessLifecyclePayload,
} from "../../lib/access-governance"
import { courseUsesLabSections } from "../../lib/course-section-model"
import {
  fetchStudentEnrollmentCatalog,
  type EnrollmentCatalogCourse,
} from "../../lib/student-enrollment-catalog"
import { persistRememberedUniversity } from "../../lib/remembered-student-auth"
import { keyboardDismissScrollProps } from "../../lib/keyboard-dismiss-scroll-props"
import { useAuthScrollBottomPadding } from "./AuthFlowScroll"
import { useAuthFlowContentStyle, useAuthFlowLayout } from "../../lib/responsive-layout"
import { ErrorBanner } from "./LoginCard"
import { LoginButton } from "./LoginButton"
import { LoginBrandHeader } from "./LoginBrandHeader"
import { UniversityAuthLogoImage } from "./UniversityAuthLogoImage"
import { LoginBackLink, type RegisterAuthPanelBack } from "./login-chrome"
import { LoginCanvasBubbles } from "./LoginCanvasBubbles"
import { useLoginTheme } from "./login-theme"
import { StudentSignupFeaturePreview } from "./student-signup/StudentSignupFeaturePreview"
import { StudentSignupProgressBar } from "./student-signup/StudentSignupProgressBar"
import {
  STUDENT_SIGNUP_STEP_CAPTIONS,
  type StudentSignupStep,
} from "./student-signup/student-signup-artwork"
import { StudentSignupVerifyStep } from "./student-signup/StudentSignupVerifyStep"

import Animated, { FadeIn, FadeInRight, FadeOutLeft } from "react-native-reanimated"

type Step = "university" | StudentSignupStep

type Props = {
  initialUniversity?: UniversityRecord | null
  onBack?: () => void
  registerPanelBack?: RegisterAuthPanelBack
}

function isOtherUniversity(uni: Pick<UniversityRecord, "short_name"> | null | undefined): boolean {
  return String(uni?.short_name ?? "").trim().toUpperCase() === "OTHER"
}

function stepMeta(
  step: Step,
  showSectionStep: boolean,
): { eyebrow: string; title: string; description: string; captionStep: StudentSignupStep | null } {
  if (step === "university") {
    return {
      eyebrow: "Start here",
      title: "Choose your university",
      description: "Pick the school where your instructor uses CourseCollab.",
      captionStep: null,
    }
  }
  if (step === "course") {
    return {
      eyebrow: "Step 1 · Your class",
      title: "Which course are you joining?",
      description:
        "Choose the course your instructor set up. Your request goes directly to them for approval.",
      captionStep: "course",
    }
  }
  if (step === "section") {
    return {
      eyebrow: "Step 2 · Your section",
      title: "Pick your lecture section",
      description: "Select the section code from your syllabus so you join the right lecture group.",
      captionStep: "section",
    }
  }
  if (step === "profile") {
    return {
      eyebrow: showSectionStep ? "Step 3 · About you" : "Step 2 · About you",
      title: "Tell us who you are",
      description: "Use your roster name and university email. Your instructor uses these to confirm enrollment.",
      captionStep: "profile",
    }
  }
  return {
    eyebrow: "Almost there",
    title: "Check your inbox",
    description: "",
    captionStep: "verify",
  }
}

export function StudentSignupScreen({ initialUniversity, onBack, registerPanelBack }: Props) {
  const insets = useSafeAreaInsets()
  const { LOGIN, loginType } = useLoginTheme()
  const contentStyle = useAuthFlowContentStyle()
  const { horizontalPadding, contentGap, stackGap } = useAuthFlowLayout()

  const [step, setStep] = useState<Step>(initialUniversity ? "course" : "university")
  const [universities, setUniversities] = useState<UniversityRecord[]>([])
  const [loadingUniversities, setLoadingUniversities] = useState(!initialUniversity)
  const [selectedUniversity, setSelectedUniversity] = useState<UniversityRecord | null>(
    initialUniversity ?? null,
  )
  const [uniQuery, setUniQuery] = useState("")
  const [uniResults, setUniResults] = useState<UniversityRecord[]>([])
  const [searchingUniversities, setSearchingUniversities] = useState(false)
  const [savingUniversity, setSavingUniversity] = useState(false)

  const [loadingCatalog, setLoadingCatalog] = useState(Boolean(initialUniversity))
  const [activeTermLabel, setActiveTermLabel] = useState<string | null>(null)
  const [courses, setCourses] = useState<EnrollmentCatalogCourse[]>([])
  const [courseQuery, setCourseQuery] = useState("")
  const [selectedCourseId, setSelectedCourseId] = useState("")
  const [selectedSectionCode, setSelectedSectionCode] = useState("")

  const [fullName, setFullName] = useState("")
  const [studentId, setStudentId] = useState("")
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [accessStatus, setAccessStatus] = useState<AccessLifecyclePayload | null>(null)

  const selectedCourse = useMemo(
    () => courses.find((c) => String(c.id) === selectedCourseId) ?? null,
    [courses, selectedCourseId],
  )

  const lectureSections = useMemo(() => selectedCourse?.sections ?? [], [selectedCourse])

  const showSectionStep = Boolean(
    selectedCourse && courseUsesLabSections(selectedCourse.courseCode) && lectureSections.length > 1,
  )

  const progressSteps = useMemo(
    () => (showSectionStep ? (["course", "section", "profile"] as const) : (["course", "profile"] as const)),
    [showSectionStep],
  )

  const progressIndex = useMemo(() => {
    if (step === "university") return -1
    if (step === "verify" || step === "profile") return progressSteps.length - 1
    if (step === "section") return showSectionStep ? 1 : 0
    if (step === "course") return 0
    return -1
  }, [progressSteps.length, showSectionStep, step])

  const filteredCourses = useMemo(() => {
    const q = courseQuery.trim().toLowerCase()
    if (!q) return courses
    return courses.filter(
      (c) =>
        c.courseTitle.toLowerCase().includes(q) ||
        c.courseCode.toLowerCase().includes(q) ||
        (c.instructorName ?? "").toLowerCase().includes(q),
    )
  }, [courseQuery, courses])

  const schoolAccent = selectedUniversity?.primary_color ?? LOGIN.purple
  const meta = stepMeta(step, showSectionStep)

  useEffect(() => {
    if (initialUniversity) return
    let mounted = true
    void (async () => {
      try {
        const data = await api.getUniversities()
        if (!mounted) return
        setUniversities(data.universities ?? [])
      } catch (err) {
        if (!mounted) return
        setError(err instanceof ApiError ? err.message : "Failed to load universities.")
      } finally {
        if (mounted) setLoadingUniversities(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [initialUniversity])

  useEffect(() => {
    const q = uniQuery.trim()
    if (q.length < 2) {
      setUniResults([])
      setSearchingUniversities(false)
      return
    }
    const handle = setTimeout(() => {
      void (async () => {
        setSearchingUniversities(true)
        try {
          const data = await api.searchUniversities(q)
          setUniResults(data.universities ?? [])
        } catch {
          setUniResults([])
        } finally {
          setSearchingUniversities(false)
        }
      })()
    }, 280)
    return () => clearTimeout(handle)
  }, [uniQuery])

  useEffect(() => {
    if (!selectedUniversity?.id || step === "university") return
    let mounted = true
    void (async () => {
      setLoadingCatalog(true)
      setError("")
      try {
        const catalog = await fetchStudentEnrollmentCatalog(selectedUniversity.id)
        if (!mounted) return
        setCourses(catalog.courses)
        setActiveTermLabel(catalog.activeTerm?.label ?? null)
      } catch (err) {
        if (!mounted) return
        setError(err instanceof ApiError ? err.message : "Failed to load courses.")
        setCourses([])
      } finally {
        if (mounted) setLoadingCatalog(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [selectedUniversity?.id, step])

  useEffect(() => {
    if (!selectedCourse) {
      setSelectedSectionCode("")
      return
    }
    if (lectureSections.length === 1) {
      setSelectedSectionCode(lectureSections[0].code)
      return
    }
    setSelectedSectionCode((prev) =>
      prev && lectureSections.some((s) => s.code === prev) ? prev : "",
    )
  }, [selectedCourse, lectureSections])

  const featuredUniversities = useMemo(
    () => universities.filter((u) => !isOtherUniversity(u)),
    [universities],
  )
  const otherUniversity = useMemo(
    () => universities.find((u) => isOtherUniversity(u)) ?? null,
    [universities],
  )
  const showingUniversitySearch = uniQuery.trim().length >= 2

  async function continueFromUniversity() {
    if (!selectedUniversity) {
      setError("Select your university to continue.")
      return
    }
    setSavingUniversity(true)
    setError("")
    try {
      let university = selectedUniversity
      if (!university.id) {
        const ensured = await api.ensureUniversity({
          name: university.name,
          domain: university.domain,
          shortName: university.short_name,
        })
        university = ensured.university
        setSelectedUniversity(university)
      }
      await persistRememberedUniversity(university)
      setStep("course")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save your university.")
    } finally {
      setSavingUniversity(false)
    }
  }

  function continueFromCourse() {
    setError("")
    if (!selectedCourse) {
      setError("Choose the course you want to join.")
      return
    }
    setStep(showSectionStep ? "section" : "profile")
  }

  function continueFromSection() {
    setError("")
    if (!selectedSectionCode.trim()) {
      setError("Choose your lecture section.")
      return
    }
    setStep("profile")
  }

  async function submitRequest() {
    setError("")
    if (!selectedUniversity || !selectedCourse || !selectedSectionCode.trim()) {
      setError("Select your university, course, and section.")
      return
    }
    if (!fullName.trim() || !studentId.trim() || !email.trim()) {
      setError("Complete every field.")
      return
    }
    if (!email.trim().includes("@")) {
      setError("Enter a valid university email.")
      return
    }

    setSubmitting(true)
    try {
      const result = await submitStudentAccessRequest({
        fullName: fullName.trim(),
        studentId: studentId.trim(),
        section: selectedSectionCode.trim(),
        email: email.trim(),
        universityId: selectedUniversity.id,
        courseId: selectedCourse.id,
      })
      setAccessStatus({
        lifecycle: "pending_email_verification",
        accountType: "student",
        request: {
          fullName: fullName.trim(),
          email: email.trim(),
          section: selectedSectionCode.trim(),
        },
        error: result.message,
      })
      setStep("verify")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit your request.")
    } finally {
      setSubmitting(false)
    }
  }

  const handlePanelBack = useCallback((): boolean => {
    if (step === "verify") return false
    if (step === "profile") {
      setStep(showSectionStep ? "section" : "course")
      setError("")
      return true
    }
    if (step === "section") {
      setStep("course")
      setError("")
      return true
    }
    if (step === "course" && !initialUniversity) {
      setStep("university")
      setError("")
      return true
    }
    return false
  }, [initialUniversity, showSectionStep, step])

  useEffect(() => {
    registerPanelBack?.(handlePanelBack)
    return () => registerPanelBack?.(null)
  }, [handlePanelBack, registerPanelBack])

  const primaryAction = () => {
    if (step === "university") void continueFromUniversity()
    else if (step === "course") continueFromCourse()
    else if (step === "section") continueFromSection()
    else if (step === "profile") void submitRequest()
  }

  const primaryDisabled =
    submitting ||
    (step === "university" && (!selectedUniversity || savingUniversity)) ||
    (step === "course" && (!selectedCourseId || loadingCatalog)) ||
    (step === "section" && !selectedSectionCode)

  const primaryLabel =
    step === "profile" ? "Submit access request" : step === "university" ? "Continue" : "Continue"

  const showStickyFooter = step !== "verify"
  const bottomPad = useAuthScrollBottomPadding(showStickyFooter ? insets.bottom + 96 : insets.bottom + 28)

  return (
    <View style={[styles.root, { backgroundColor: LOGIN.canvas }]}>
      <LoginCanvasBubbles />

      <AuthKeyboardShell>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            contentStyle,
            {
              paddingTop: insets.top + 12,
              paddingHorizontal: horizontalPadding,
              gap: contentGap,
              paddingBottom: bottomPad,
            },
          ]}
          {...keyboardDismissScrollProps}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
        >
          <View style={[styles.stack, { gap: stackGap }]}>
            {step === "university" ? (
              <LoginBrandHeader
                title="Request Course Access"
                subtitle={meta.description}
                accent={schoolAccent}
              />
            ) : step !== "verify" && selectedUniversity ? (
              <View style={styles.compactBrand}>
                <UniversityAuthLogoImage university={selectedUniversity} variant="header" />
              </View>
            ) : null}

            {step !== "university" && step !== "verify" && progressIndex >= 0 ? (
              <StudentSignupProgressBar
                total={progressSteps.length}
                activeIndex={progressIndex}
                accent={schoolAccent}
              />
            ) : null}

            {meta.captionStep ? (
              <StudentSignupFeaturePreview
                caption={STUDENT_SIGNUP_STEP_CAPTIONS[meta.captionStep]}
                accent={schoolAccent}
              />
            ) : null}

            {step !== "verify" && step !== "university" ? (
              <Animated.View entering={FadeIn.duration(220)} style={styles.stepIntro}>
                <Text style={[loginType.fieldLabel, styles.eyebrow, { color: LOGIN.secondaryLabel }]}>
                  {meta.eyebrow}
                </Text>
                <Text style={[loginType.panelTitle, styles.stepTitle, { color: LOGIN.label }]}>{meta.title}</Text>
                <Text style={[loginType.panelDescription, { color: LOGIN.secondaryLabel }]}>{meta.description}</Text>
                {activeTermLabel ? (
                  <View style={[styles.termChip, { borderColor: LOGIN.separator, backgroundColor: LOGIN.grouped }]}>
                    <Ionicons name="sparkles-outline" size={14} color={schoolAccent} />
                    <Text style={[loginType.info, { color: LOGIN.label, fontWeight: "600" }]}>{activeTermLabel}</Text>
                  </View>
                ) : null}
              </Animated.View>
            ) : null}

            {error ? <ErrorBanner message={error} /> : null}

            <Animated.View
              key={step}
              entering={FadeInRight.duration(280)}
              exiting={FadeOutLeft.duration(180)}
              style={styles.stepBody}
            >
              {step === "university" ? (
                <UniversityStep
                  uniQuery={uniQuery}
                  onChangeQuery={setUniQuery}
                  loading={loadingUniversities}
                  searching={searchingUniversities}
                  options={showingUniversitySearch ? uniResults : featuredUniversities}
                  otherUniversity={!showingUniversitySearch ? otherUniversity : null}
                  selected={selectedUniversity}
                  onSelect={(uni) => {
                    setSelectedUniversity(uni)
                    setError("")
                  }}
                />
              ) : null}

              {step === "course" ? (
                <CourseStep
                  loading={loadingCatalog}
                  courses={filteredCourses}
                  query={courseQuery}
                  onChangeQuery={setCourseQuery}
                  selectedCourseId={selectedCourseId}
                  onSelectCourse={(id) => {
                    setSelectedCourseId(id)
                    setError("")
                  }}
                  accent={schoolAccent}
                  empty={!loadingCatalog && courses.length === 0}
                  universityLabel={selectedUniversity?.short_name ?? "this university"}
                />
              ) : null}

              {step === "section" && selectedCourse ? (
                <SectionStep
                  course={selectedCourse}
                  sections={lectureSections}
                  selectedSectionCode={selectedSectionCode}
                  onSelect={(code) => {
                    setSelectedSectionCode(code)
                    setError("")
                  }}
                  accent={schoolAccent}
                />
              ) : null}

              {step === "profile" && selectedCourse ? (
                <ProfileStep
                  course={selectedCourse}
                  sectionCode={selectedSectionCode}
                  fullName={fullName}
                  studentId={studentId}
                  email={email}
                  onChangeFullName={setFullName}
                  onChangeStudentId={setStudentId}
                  onChangeEmail={setEmail}
                  accent={schoolAccent}
                />
              ) : null}

              {step === "verify" && accessStatus ? (
                <StudentSignupVerifyStep
                  payload={accessStatus}
                  accent={schoolAccent}
                  portalLabel={selectedUniversity?.short_name ?? "your instructor"}
                  onBack={onBack}
                />
              ) : null}
            </Animated.View>

            {step === "university" && onBack ? (
              <LoginBackLink label="Back to sign in" onPress={onBack} />
            ) : null}

            {step !== "verify" && step !== "university" ? (
              <Pressable
                onPress={() => {
                  if (step === "course" && initialUniversity) {
                    onBack?.()
                    return
                  }
                  handlePanelBack()
                }}
                accessibilityRole="button"
                style={({ pressed }) => [styles.textBack, pressed && styles.pressed]}
              >
                <Text style={[loginType.link, { color: schoolAccent, textAlign: "center" }]}>
                  {step === "course" && initialUniversity ? "Back to sign in" : "Back"}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </ScrollView>

        {showStickyFooter ? (
          <View
            style={[
              styles.footer,
              {
                paddingBottom: Math.max(insets.bottom, 12),
                paddingHorizontal: horizontalPadding,
                borderTopColor: LOGIN.separator,
                backgroundColor: LOGIN.canvas,
              },
            ]}
          >
            <LoginButton
              label={primaryLabel}
              onPress={primaryAction}
              loading={submitting || savingUniversity}
              disabled={primaryDisabled}
              backgroundColor={schoolAccent}
              icon={step === "profile" ? "arrow-forward" : undefined}
            />
          </View>
        ) : null}
      </AuthKeyboardShell>
    </View>
  )
}

function UniversityStep({
  uniQuery,
  onChangeQuery,
  loading,
  searching,
  options,
  otherUniversity,
  selected,
  onSelect,
}: {
  uniQuery: string
  onChangeQuery: (value: string) => void
  loading: boolean
  searching: boolean
  options: UniversityRecord[]
  otherUniversity: UniversityRecord | null
  selected: UniversityRecord | null
  onSelect: (uni: UniversityRecord) => void
}) {
  const { LOGIN, loginType } = useLoginTheme()

  return (
    <View style={styles.stepSection}>
      <View style={[styles.searchBox, { borderColor: LOGIN.separator, backgroundColor: LOGIN.grouped }]}>
        <Ionicons name="search" size={17} color={LOGIN.secondaryLabel} />
        <TextInput
          value={uniQuery}
          onChangeText={onChangeQuery}
          placeholder="Search universities…"
          placeholderTextColor={LOGIN.secondaryLabel}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.searchInput, { color: LOGIN.label }]}
        />
        {searching ? <ActivityIndicator size="small" color={LOGIN.purple} /> : null}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={LOGIN.purple} />
        </View>
      ) : (
        <View style={styles.cardList}>
          {options.map((uni) => {
            const active = selected?.id === uni.id
            const accent = uni.primary_color ?? LOGIN.purple
            return (
              <Pressable
                key={`${uni.id}-${uni.name}`}
                onPress={() => onSelect(uni)}
                style={({ pressed }) => [
                  styles.cardRow,
                  {
                    borderColor: active ? accent : LOGIN.separator,
                    backgroundColor: active ? `${accent}12` : LOGIN.fill,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <View style={[styles.cardIcon, { backgroundColor: active ? accent : LOGIN.grouped }]}>
                  <Ionicons name="school-outline" size={18} color={active ? "#fff" : LOGIN.secondaryLabel} />
                </View>
                <View style={styles.cardCopy}>
                  <Text style={[loginType.stepLabel, { color: LOGIN.label }]}>{uni.short_name}</Text>
                  <Text style={[loginType.info, { color: LOGIN.secondaryLabel }]} numberOfLines={2}>
                    {uni.name}
                  </Text>
                </View>
                {active ? <Ionicons name="checkmark-circle" size={22} color={accent} /> : null}
              </Pressable>
            )
          })}
          {otherUniversity ? (
            <Pressable
              onPress={() => onSelect(otherUniversity)}
              style={({ pressed }) => [
                styles.cardRow,
                { borderColor: LOGIN.separator, backgroundColor: LOGIN.fill },
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.cardIcon, { backgroundColor: LOGIN.grouped }]}>
                <Ionicons name="globe-outline" size={18} color={LOGIN.secondaryLabel} />
              </View>
              <View style={styles.cardCopy}>
                <Text style={[loginType.stepLabel, { color: LOGIN.label }]}>Other</Text>
                <Text style={[loginType.info, { color: LOGIN.secondaryLabel }]}>School not listed</Text>
              </View>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  )
}

function CourseStep({
  loading,
  courses,
  query,
  onChangeQuery,
  selectedCourseId,
  onSelectCourse,
  accent,
  empty,
  universityLabel,
}: {
  loading: boolean
  courses: EnrollmentCatalogCourse[]
  query: string
  onChangeQuery: (value: string) => void
  selectedCourseId: string
  onSelectCourse: (id: string) => void
  accent: string
  empty: boolean
  universityLabel: string
}) {
  const { LOGIN, loginType } = useLoginTheme()

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={accent} />
        <Text style={[loginType.info, { color: LOGIN.secondaryLabel }]}>Loading courses…</Text>
      </View>
    )
  }

  if (empty) {
    return (
      <View style={[styles.emptyCard, { borderColor: LOGIN.separator, backgroundColor: LOGIN.grouped }]}>
        <Text style={[loginType.info, { color: LOGIN.secondaryLabel, textAlign: "center", lineHeight: 20 }]}>
          No courses at {universityLabel} are open for requests right now. Ask your instructor for an invitation
          link.
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.stepSection}>
      <View style={[styles.searchBox, { borderColor: LOGIN.separator, backgroundColor: LOGIN.grouped }]}>
        <Ionicons name="search" size={17} color={LOGIN.secondaryLabel} />
        <TextInput
          value={query}
          onChangeText={onChangeQuery}
          placeholder="Search courses…"
          placeholderTextColor={LOGIN.secondaryLabel}
          autoCapitalize="none"
          style={[styles.searchInput, { color: LOGIN.label }]}
        />
      </View>

      <View style={styles.cardList}>
        {courses.map((course) => {
          const active = String(course.id) === selectedCourseId
          return (
            <Pressable
              key={course.id}
              onPress={() => onSelectCourse(String(course.id))}
              style={({ pressed }) => [
                styles.cardRow,
                {
                  borderColor: active ? accent : LOGIN.separator,
                  backgroundColor: active ? `${accent}12` : LOGIN.fill,
                },
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.cardIcon, { backgroundColor: active ? accent : LOGIN.grouped }]}>
                <Ionicons name="book-outline" size={18} color={active ? "#fff" : LOGIN.secondaryLabel} />
              </View>
              <View style={styles.cardCopy}>
                <Text style={[loginType.stepLabel, { color: LOGIN.label }]}>{course.courseTitle}</Text>
                <Text style={[loginType.info, { color: LOGIN.secondaryLabel }]}>
                  {course.courseCode}
                  {course.instructorName ? ` · ${course.instructorName}` : ""}
                </Text>
                <Text style={[loginType.info, { color: LOGIN.secondaryLabel }]}>
                  {course.sections.length} section{course.sections.length === 1 ? "" : "s"}
                </Text>
              </View>
              {active ? <Ionicons name="checkmark-circle" size={22} color={accent} /> : null}
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

function SectionStep({
  course,
  sections,
  selectedSectionCode,
  onSelect,
  accent,
}: {
  course: EnrollmentCatalogCourse
  sections: EnrollmentCatalogCourse["sections"]
  selectedSectionCode: string
  onSelect: (code: string) => void
  accent: string
}) {
  const { LOGIN, loginType } = useLoginTheme()

  return (
    <View style={styles.stepSection}>
      <View style={[styles.joinCard, { borderColor: LOGIN.separator, backgroundColor: LOGIN.grouped }]}>
        <Text style={[loginType.stepLabel, { color: LOGIN.label }]}>{course.courseTitle}</Text>
        <Text style={[loginType.info, { color: LOGIN.secondaryLabel }]}>{course.courseCode}</Text>
      </View>

      <View style={styles.chipGrid}>
        {sections.map((section) => {
          const active = selectedSectionCode === section.code
          return (
            <Pressable
              key={section.id}
              onPress={() => onSelect(section.code)}
              style={({ pressed }) => [
                styles.sectionChip,
                {
                  borderColor: active ? accent : LOGIN.separator,
                  backgroundColor: active ? `${accent}14` : LOGIN.fill,
                },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[loginType.panelTitle, styles.chipCode, { color: LOGIN.label }]}>{section.code}</Text>
              {section.description && section.description !== section.code ? (
                <Text style={[loginType.info, { color: LOGIN.secondaryLabel }]} numberOfLines={2}>
                  {section.description}
                </Text>
              ) : null}
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

function ProfileStep({
  course,
  sectionCode,
  fullName,
  studentId,
  email,
  onChangeFullName,
  onChangeStudentId,
  onChangeEmail,
  accent,
}: {
  course: EnrollmentCatalogCourse
  sectionCode: string
  fullName: string
  studentId: string
  email: string
  onChangeFullName: (value: string) => void
  onChangeStudentId: (value: string) => void
  onChangeEmail: (value: string) => void
  accent: string
}) {
  const { LOGIN, loginType } = useLoginTheme()

  return (
    <View style={styles.stepSection}>
      <View style={[styles.joinCard, { borderColor: `${accent}44`, backgroundColor: `${accent}12` }]}>
        <Text style={[loginType.fieldLabel, { color: LOGIN.secondaryLabel, letterSpacing: 1.2 }]}>JOINING</Text>
        <Text style={[loginType.stepLabel, { color: LOGIN.label, fontSize: 18 }]}>{course.courseTitle}</Text>
        <Text style={[loginType.info, { color: LOGIN.secondaryLabel }]}>
          {course.courseCode}
          {sectionCode ? ` · ${sectionCode}` : ""}
        </Text>
      </View>

      <UnderlineField label="Full name" value={fullName} onChangeText={onChangeFullName} placeholder="As it appears on your roster" accent={accent} />
      <UnderlineField label="Student ID" value={studentId} onChangeText={onChangeStudentId} placeholder="From your syllabus" accent={accent} />
      <UnderlineField
        label="University email"
        value={email}
        onChangeText={onChangeEmail}
        placeholder="you@school.edu"
        accent={accent}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={[loginType.info, { color: LOGIN.secondaryLabel, lineHeight: 18 }]}>
        After email verification, your instructor approves the request. Then sign in with your university credentials.
      </Text>
    </View>
  )
}

function UnderlineField({
  label,
  value,
  onChangeText,
  placeholder,
  accent,
  keyboardType,
  autoCapitalize,
}: {
  label: string
  value: string
  onChangeText: (value: string) => void
  placeholder: string
  accent: string
  keyboardType?: "default" | "email-address"
  autoCapitalize?: "none" | "words"
}) {
  const { LOGIN, loginType } = useLoginTheme()

  return (
    <View style={styles.underlineField}>
      <Text style={[loginType.fieldLabel, { color: LOGIN.secondaryLabel, letterSpacing: 1 }]}>{label.toUpperCase()}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={LOGIN.secondaryLabel}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? "words"}
        autoCorrect={false}
        style={[loginType.body, styles.underlineInput, { color: LOGIN.label, borderBottomColor: `${accent}66` }]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  stack: {
    alignSelf: "stretch",
  },
  compactBrand: {
    alignItems: "center",
    paddingBottom: 2,
  },
  stepIntro: {
    gap: 8,
  },
  eyebrow: {
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  stepTitle: {
    textAlign: "left",
  },
  stepBody: {
    alignSelf: "stretch",
  },
  stepSection: {
    gap: 14,
  },
  termChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
  },
  cardList: {
    gap: 10,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  sectionChip: {
    minWidth: "47%",
    flexGrow: 1,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 4,
  },
  chipCode: {
    fontSize: 20,
  },
  joinCard: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  underlineField: {
    gap: 6,
  },
  underlineInput: {
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    paddingVertical: 8,
    paddingHorizontal: 2,
    fontSize: 18,
    fontWeight: "600",
  },
  emptyCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    padding: 16,
  },
  centered: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 20,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  textBack: {
    paddingVertical: 10,
  },
  pressed: {
    opacity: 0.85,
  },
})
