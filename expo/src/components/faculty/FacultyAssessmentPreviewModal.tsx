import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ApiError } from "../../lib/api"
import { ASSESSMENT_TYPE_CONFIG, type AssessmentType } from "../../lib/faculty-assessment-utils"
import { sortPreviewQuestions } from "../../lib/faculty-assessment-preview"
import { FACULTY_ASSESSMENT_COLOR } from "../../lib/faculty-assessment-theme"
import { instructorApi, type InstructorQuiz } from "../../lib/instructor-api"
import { FacultyAssessmentQuestionPreview } from "./FacultyAssessmentQuestionPreview"
import { useModuleTheme } from "../../lib/themed-module-shell"

type Scope = { instructorId: number; courseId: number }

type Props = {
  quiz: InstructorQuiz | null
  assessmentType: AssessmentType
  scope: Scope | null
  onClose: () => void
}

export function FacultyAssessmentPreviewModal({ quiz, assessmentType, scope, onClose }: Props) {
  const { styles: moduleStyles, native, tokens, type } = useModuleTheme()
  const insets = useSafeAreaInsets()
  const config = ASSESSMENT_TYPE_CONFIG[assessmentType]

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [questions, setQuestions] = useState<ReturnType<typeof sortPreviewQuestions>>([])

  const themedStyles = useMemo(
    () =>
      StyleSheet.create({
        topBar: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 10,
          gap: 10,
        },
        topCopy: { flex: 1, minWidth: 0, gap: 2 },
        topTitle: { ...type.bodyEmphasis, fontSize: 16, color: native.label },
        topSub: { ...type.caption, fontWeight: "600", color: native.secondaryLabel },
        topCounter: { fontSize: 14, fontWeight: "600", color: FACULTY_ASSESSMENT_COLOR.link },
        progressTrack: {
          height: 4,
          backgroundColor: native.fill,
          marginHorizontal: 16,
          borderRadius: 2,
          overflow: "hidden",
          marginBottom: 8,
        },
        progressFill: { height: "100%", backgroundColor: FACULTY_ASSESSMENT_COLOR.tabActive, borderRadius: 2 },
        center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
        errorText: { fontSize: 14, fontWeight: "600", color: tokens.danger, textAlign: "center" },
        retryBtn: {
          marginTop: 8,
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 10,
          backgroundColor: FACULTY_ASSESSMENT_COLOR.action,
        },
        retryBtnText: { color: FACULTY_ASSESSMENT_COLOR.actionInk, fontWeight: "600", fontSize: 14 },
        emptyTitle: { ...type.bodyEmphasis, fontSize: 16, color: native.label },
        emptyBody: { fontSize: 14, color: native.secondaryLabel, textAlign: "center" },
        content: { padding: 16, gap: 14 },
        questionNav: { flexDirection: "row", gap: 8, paddingVertical: 4 },
        navDot: {
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: native.secondaryGrouped,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: native.separator,
          alignItems: "center",
          justifyContent: "center",
        },
        navDotCurrent: {
          backgroundColor: FACULTY_ASSESSMENT_COLOR.tabActive,
          borderColor: FACULTY_ASSESSMENT_COLOR.tabActive,
        },
        navDotText: { fontSize: 13, fontWeight: "600", color: native.secondaryLabel },
        navDotTextActive: { color: "#ffffff" },
        footer: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingTop: 12,
          backgroundColor: native.secondaryGrouped,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: native.separator,
          gap: 8,
        },
        navBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 8, paddingHorizontal: 4 },
        navBtnDisabled: { opacity: 0.5 },
        navBtnText: { fontSize: 14, fontWeight: "700", color: FACULTY_ASSESSMENT_COLOR.link },
        navBtnTextDisabled: { color: native.tertiaryLabel },
        footerHint: { flexDirection: "row", alignItems: "center", gap: 4 },
        footerHintText: { fontSize: 12, fontWeight: "600", color: native.secondaryLabel },
      }),
    [native, tokens, type],
  )

  const load = useCallback(async () => {
    if (!scope || !quiz) return
    setLoading(true)
    setError("")
    try {
      const detail = await instructorApi.getQuiz(scope, quiz.id)
      setQuestions(sortPreviewQuestions(detail.questions ?? []))
      setCurrentIndex(0)
    } catch (err) {
      setQuestions([])
      setError(err instanceof ApiError ? err.message : "Could not load preview.")
    } finally {
      setLoading(false)
    }
  }, [scope, quiz])

  useEffect(() => {
    if (!quiz) {
      setQuestions([])
      setCurrentIndex(0)
      setError("")
      return
    }
    void load()
  }, [quiz, load])

  const currentQuestion = questions[currentIndex]
  const progressPct = useMemo(() => {
    if (!questions.length) return 0
    return Math.round(((currentIndex + 1) / questions.length) * 100)
  }, [currentIndex, questions.length])

  if (!quiz) return null

  return (
    <Modal visible={Boolean(quiz)} animationType="slide" onRequestClose={onClose}>
      <View style={[moduleStyles.root, { paddingTop: insets.top }]}>
        <View style={themedStyles.topBar}>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close preview">
            <Ionicons name="close" size={24} color={native.label} />
          </Pressable>
          <View style={themedStyles.topCopy}>
            <Text style={themedStyles.topTitle} numberOfLines={1}>
              {quiz.title}
            </Text>
            <Text style={themedStyles.topSub}>Student preview · {config.shortLabel}</Text>
          </View>
          {questions.length > 0 ? (
            <Text style={themedStyles.topCounter}>
              {currentIndex + 1}/{questions.length}
            </Text>
          ) : null}
        </View>

        <View style={themedStyles.progressTrack}>
          <View style={[themedStyles.progressFill, { width: `${progressPct}%` }]} />
        </View>

        {loading ? (
          <View style={[moduleStyles.center, themedStyles.center]}>
            <ActivityIndicator size="large" color={FACULTY_ASSESSMENT_COLOR.link} />
          </View>
        ) : error ? (
          <View style={[moduleStyles.center, themedStyles.center]}>
            <Text style={themedStyles.errorText}>{error}</Text>
            <Pressable style={themedStyles.retryBtn} onPress={() => void load()}>
              <Text style={themedStyles.retryBtnText}>Try again</Text>
            </Pressable>
          </View>
        ) : questions.length === 0 ? (
          <View style={[moduleStyles.center, themedStyles.center]}>
            <Ionicons name="document-text-outline" size={32} color={native.tertiaryLabel} />
            <Text style={themedStyles.emptyTitle}>No questions to preview</Text>
            <Text style={themedStyles.emptyBody}>Add questions in the editor first.</Text>
          </View>
        ) : (
          <>
            <ScrollView
              contentContainerStyle={[themedStyles.content, { paddingBottom: insets.bottom + 100 }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={themedStyles.questionNav}
              >
                {questions.map((q, i) => {
                  const current = i === currentIndex
                  return (
                    <Pressable
                      key={q.id}
                      style={[themedStyles.navDot, current && themedStyles.navDotCurrent]}
                      onPress={() => setCurrentIndex(i)}
                    >
                      <Text style={[themedStyles.navDotText, current && themedStyles.navDotTextActive]}>{i + 1}</Text>
                    </Pressable>
                  )
                })}
              </ScrollView>

              {currentQuestion ? (
                <FacultyAssessmentQuestionPreview key={currentQuestion.id} question={currentQuestion} />
              ) : null}
            </ScrollView>

            <View style={[themedStyles.footer, { paddingBottom: insets.bottom + 12 }]}>
              <Pressable
                style={[themedStyles.navBtn, currentIndex <= 0 && themedStyles.navBtnDisabled]}
                onPress={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                disabled={currentIndex <= 0}
              >
                <Ionicons
                  name="chevron-back"
                  size={18}
                  color={currentIndex <= 0 ? native.tertiaryLabel : FACULTY_ASSESSMENT_COLOR.link}
                />
                <Text style={[themedStyles.navBtnText, currentIndex <= 0 && themedStyles.navBtnTextDisabled]}>
                  Previous
                </Text>
              </Pressable>
              <View style={themedStyles.footerHint}>
                <Ionicons name="eye-outline" size={14} color={native.secondaryLabel} />
                <Text style={themedStyles.footerHintText}>Preview only</Text>
              </View>
              <Pressable
                style={[themedStyles.navBtn, currentIndex >= questions.length - 1 && themedStyles.navBtnDisabled]}
                onPress={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
                disabled={currentIndex >= questions.length - 1}
              >
                <Text
                  style={[
                    themedStyles.navBtnText,
                    currentIndex >= questions.length - 1 && themedStyles.navBtnTextDisabled,
                  ]}
                >
                  Next
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={currentIndex >= questions.length - 1 ? native.tertiaryLabel : FACULTY_ASSESSMENT_COLOR.link}
                />
              </Pressable>
            </View>
          </>
        )}
      </View>
    </Modal>
  )
}
