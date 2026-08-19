import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import * as DocumentPicker from "expo-document-picker"
import { Ionicons } from "@/components/icons/AppIcon"
import { AppAlert } from "../../../lib/app-alert"
import { API_BASE_URL } from "../../../constants"
import { NATIVE } from "../../../constants/faculty-native-theme"
import type { SummerCheckpointSubmission, SummerModuleBlock, SummerModuleProgressRecord } from "../../../lib/summer-camp-api"
import { getBlockSubmission, isSummerBlockComplete } from "../../../lib/summer-module-viewer-utils"
import { useAppThemeTokens, useThemedNative } from "../../../context/AppearanceProvider"
import { useNativeType, semanticSoft } from "../../../lib/themed-module-theme"
import { MarkdownContentWebView } from "../../course-info/MarkdownContentWebView"
import { QuestionContentWebView } from "../../rewards/QuestionContent"
import { SummerModuleBlockShell, SummerModulePrimaryButton } from "./summer-module-block-ui"

type SaveProgress = (
  progressType: string,
  metadata?: Record<string, unknown>,
) => Promise<void>

type Props = {
  block: SummerModuleBlock
  progress: SummerModuleProgressRecord[]
  submissions?: SummerCheckpointSubmission[]
  onSaveProgress: SaveProgress
  onSubmitCheckpoint?: (file: { uri: string; name: string; mime: string }) => Promise<void>
  saving: boolean
  onAutoComplete?: () => void
}

function resolveAssetUrl(path: string): string {
  if (!path) return path
  if (path.startsWith("http://") || path.startsWith("https://")) return path
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function asNumberArray(value: unknown): number[] {
  return Array.isArray(value) ? value.filter((item): item is number => typeof item === "number") : []
}

export function SummerModuleBlockRenderer({
  block,
  progress,
  submissions = [],
  onSaveProgress,
  onSubmitCheckpoint,
  saving,
  onAutoComplete,
}: Props) {
  const complete = isSummerBlockComplete(block, progress, submissions)

  useEffect(() => {
    if (complete || !onAutoComplete) return
    if (["hero", "callout", "text", "video", "image_gallery", "faculty_cards", "mission_objectives", "code"].includes(block.block_type)) {
      onAutoComplete()
    }
  }, [block.block_type, complete, onAutoComplete])

  switch (block.block_type) {
    case "hero":
      return <HeroBlock block={block} complete={complete} />
    case "callout":
      return <CalloutBlock block={block} complete={complete} />
    case "text":
      return <TextBlock block={block} complete={complete} />
    case "activity":
      return (
        <ActivityBlock
          block={block}
          progress={progress}
          complete={complete}
          saving={saving}
          onSaveProgress={onSaveProgress}
        />
      )
    case "interactive":
      return (
        <InteractiveBlock
          block={block}
          complete={complete}
          saving={saving}
          onSaveProgress={onSaveProgress}
        />
      )
    case "reflection":
      return (
        <ReflectionBlock
          block={block}
          progress={progress}
          complete={complete}
          saving={saving}
          onSaveProgress={onSaveProgress}
        />
      )
    case "quiz":
      return (
        <QuizBlock
          block={block}
          progress={progress}
          complete={complete}
          saving={saving}
          onSaveProgress={onSaveProgress}
        />
      )
    case "feedback":
      return (
        <FeedbackBlock
          block={block}
          progress={progress}
          complete={complete}
          saving={saving}
          onSaveProgress={onSaveProgress}
        />
      )
    case "image_gallery":
      return <GalleryBlock block={block} complete={complete} />
    case "video":
      return <VideoBlock block={block} complete={complete} />
    case "faculty_cards":
      return <FacultyCardsBlock block={block} complete={complete} />
    case "mission_objectives":
      return <MissionObjectivesBlock block={block} complete={complete} />
    case "profile_form":
      return (
        <ProfileFormBlock
          block={block}
          complete={complete}
          saving={saving}
          onSaveProgress={onSaveProgress}
        />
      )
    case "step":
      return (
        <StepBlock
          block={block}
          complete={complete}
          saving={saving}
          onSaveProgress={onSaveProgress}
        />
      )
    case "code":
      return <CodeBlock block={block} complete={complete} />
    case "checkpoint":
      return (
        <CheckpointBlock
          block={block}
          submission={getBlockSubmission(block.id, submissions)}
          complete={complete}
          saving={saving}
          onSubmitCheckpoint={onSubmitCheckpoint}
        />
      )
    case "module_completion":
      return (
        <ModuleCompletionBlock
          block={block}
          complete={complete}
          saving={saving}
          onSaveProgress={onSaveProgress}
        />
      )
    default:
      return <FallbackBlock block={block} complete={complete} saving={saving} onSaveProgress={onSaveProgress} />
  }
}

function HeroBlock({ block, complete }: { block: SummerModuleBlock; complete: boolean }) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const title = asString(block.content.title) ?? "Summer module"
  const subtitle = asString(block.content.subtitle)

  return (
    <View style={[styles.hero, tokens.cardShadow, { backgroundColor: tokens.accent }]}>
      <View style={styles.heroIcon}>
        <Ionicons name="rocket-outline" size={24} color="#ffffff" />
      </View>
      <Text style={[type.bodyEmphasis, styles.heroTitle, { color: "#ffffff" }]}>{title}</Text>
      {subtitle ? <Text style={[type.body, styles.heroSubtitle]}>{subtitle}</Text> : null}
      {complete ? (
        <View style={styles.heroBadge}>
          <Ionicons name="checkmark-circle" size={16} color="#ffffff" />
          <Text style={type.caption}>Viewed</Text>
        </View>
      ) : null}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: native.groupedBackground, opacity: 0 }]} />
    </View>
  )
}

function CalloutBlock({ block, complete }: { block: SummerModuleBlock; complete: boolean }) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const text = asString(block.content.text) ?? ""
  const variant = asString(block.content.variant) ?? "tip"
  const icon = variant === "warning" ? "warning-outline" : "information-circle-outline"

  return (
    <View style={[styles.callout, { backgroundColor: semanticSoft(tokens.accent, tokens.isDark), borderColor: tokens.accentBorder }]}>
      <Ionicons name={icon} size={18} color={tokens.accent} />
      <Text style={[type.body, { color: native.label, flex: 1, lineHeight: 22 }]}>{text}</Text>
      {complete ? <Ionicons name="checkmark-circle-outline" size={18} color={tokens.success} /> : null}
    </View>
  )
}

function TextBlock({ block, complete }: { block: SummerModuleBlock; complete: boolean }) {
  const native = useThemedNative()
  const type = useNativeType()
  const markdown = asString(block.content.markdown)
  const variant = asString(block.content.variant)

  if (variant === "welcome_intro") {
    return (
      <SummerModuleBlockShell title="Welcome" complete={complete}>
        <Text style={[type.body, { color: native.label, lineHeight: 24 }]}>
          Welcome to summer camp! You will build real AI systems on real hardware, work with faculty mentors, and
          complete hands-on missions throughout the program.
        </Text>
      </SummerModuleBlockShell>
    )
  }

  if (!markdown) return null
  return (
    <SummerModuleBlockShell complete={complete}>
      <MarkdownContentWebView markdown={markdown} variant="embedded" />
    </SummerModuleBlockShell>
  )
}

function ActivityBlock({
  block,
  progress,
  complete,
  saving,
  onSaveProgress,
}: {
  block: SummerModuleBlock
  progress: SummerModuleProgressRecord[]
  complete: boolean
  saving: boolean
  onSaveProgress: SaveProgress
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const title = asString(block.content.title) ?? "Activity"
  const prompt = asString(block.content.prompt)
  const options = asStringArray(block.content.options)
  const multiSelect = block.content.multiSelect === true
  const revealTitle = asString(block.content.revealTitle)
  const revealMessage = asString(block.content.revealMessage)
  const saved = progress.find((record) => record.progress_type === "engagement")
  const savedSelected = asNumberArray(saved?.metadata?.selected)
  const [selected, setSelected] = useState<number[]>(savedSelected)
  const [revealed, setRevealed] = useState(saved?.metadata?.revealed === true || complete)

  function toggleOption(index: number) {
    if (complete || revealed) return
    setSelected((current) => {
      if (multiSelect) {
        return current.includes(index) ? current.filter((item) => item !== index) : [...current, index]
      }
      return [index]
    })
  }

  async function handleSubmit() {
    if (!selected.length) return
    await onSaveProgress("engagement", {
      labels: options,
      selected,
      revealed: true,
      activityType: asString(block.content.activityType) ?? "poll",
    })
    setRevealed(true)
  }

  return (
    <SummerModuleBlockShell title={title} complete={complete}>
      {prompt ? <QuestionContentWebView text={prompt} embedded compact /> : null}
      <View style={styles.optionList}>
        {options.map((option, index) => {
          const active = selected.includes(index)
          return (
            <Pressable
              key={option}
              style={[
                styles.option,
                {
                  borderColor: active ? tokens.accent : native.separator,
                  backgroundColor: active ? tokens.accentSoft : native.fill,
                },
              ]}
              onPress={() => toggleOption(index)}
              disabled={complete || revealed}
            >
              <Ionicons
                name={multiSelect ? (active ? "checkbox" : "square-outline") : active ? "radio-button-on" : "radio-button-off"}
                size={18}
                color={active ? tokens.accent : native.tertiaryLabel}
              />
              <View style={{ flex: 1 }}>
                <QuestionContentWebView text={option} embedded compact />
              </View>
            </Pressable>
          )
        })}
      </View>
      {!complete && !revealed ? (
        <SummerModulePrimaryButton label="Submit answer" onPress={() => void handleSubmit()} disabled={!selected.length} loading={saving} />
      ) : null}
      {revealed && (revealTitle || revealMessage) ? (
        <View style={[styles.revealBox, { backgroundColor: semanticSoft(tokens.success, tokens.isDark) }]}>
          {revealTitle ? <QuestionContentWebView text={revealTitle} embedded compact /> : null}
          {revealMessage ? <QuestionContentWebView text={revealMessage} embedded compact /> : null}
        </View>
      ) : null}
    </SummerModuleBlockShell>
  )
}

function InteractiveBlock({
  block,
  complete,
  saving,
  onSaveProgress,
}: {
  block: SummerModuleBlock
  complete: boolean
  saving: boolean
  onSaveProgress: SaveProgress
}) {
  const native = useThemedNative()
  const type = useNativeType()
  const title = asString(block.content.title) ?? "Interactive"
  const variant = asString(block.content.variant) ?? "interactive"
  const rows = Array.isArray(block.content.rows) ? (block.content.rows as Array<Record<string, unknown>>) : []

  const description =
    variant === "start_journey"
      ? "Tap below when you are ready to begin this camp track."
      : variant === "demo_flow"
        ? "Explore the interactive demonstration, then mark this step complete."
        : variant === "roadmap_map"
          ? "Review your mission journey map for this training."
          : variant === "comparison_table"
            ? "Compare how AI capabilities relate to human skills."
            : "Complete this interactive step to continue."

  return (
    <SummerModuleBlockShell title={title} complete={complete}>
      <Text style={[type.body, { color: native.secondaryLabel, lineHeight: 22 }]}>{description}</Text>
      {variant === "comparison_table" && rows.length ? (
        <View style={[styles.table, { borderColor: native.separator }]}>
          <View style={[styles.tableRow, { backgroundColor: native.fill }]}>
            <Text style={[type.caption, styles.tableHead, { color: native.secondaryLabel }]}>AI</Text>
            <Text style={[type.caption, styles.tableHead, { color: native.secondaryLabel }]}>Human</Text>
          </View>
          {rows.map((row, index) => (
            <View key={index} style={[styles.tableRow, { borderTopColor: native.separator }]}>
              <Text style={[type.body, styles.tableCell, { color: native.label }]}>{asString(row.ai)}</Text>
              <Text style={[type.body, styles.tableCell, { color: native.label }]}>{asString(row.human)}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {!complete ? (
        <SummerModulePrimaryButton
          label={variant === "start_journey" ? "Start my journey" : "Mark step complete"}
          onPress={() => void onSaveProgress("step_complete", {})}
          loading={saving}
        />
      ) : null}
    </SummerModuleBlockShell>
  )
}

function ReflectionBlock({
  block,
  progress,
  complete,
  saving,
  onSaveProgress,
}: {
  block: SummerModuleBlock
  progress: SummerModuleProgressRecord[]
  complete: boolean
  saving: boolean
  onSaveProgress: SaveProgress
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const prompt = asString(block.content.prompt) ?? "Reflection"
  const hint = asString(block.content.hint)
  const options = asStringArray(block.content.options)
  const saved = progress.find((record) => record.progress_type === "reflection")
  const [text, setText] = useState(asString(saved?.metadata?.text) ?? "")
  const [selectedIndex, setSelectedIndex] = useState<number | null>(
    typeof saved?.metadata?.optionIndex === "number" ? (saved.metadata.optionIndex as number) : null,
  )

  async function handleSubmit() {
    if (options.length) {
      if (selectedIndex == null) return
      await onSaveProgress("reflection", {
        selection: options[selectedIndex],
        optionIndex: selectedIndex,
      })
      return
    }
    if (!text.trim()) return
    await onSaveProgress("reflection", { text: text.trim() })
  }

  return (
    <SummerModuleBlockShell title="Reflection" complete={complete}>
      <QuestionContentWebView text={prompt} embedded />
      {hint ? <QuestionContentWebView text={hint} embedded compact /> : null}
      {options.length ? (
        <View style={styles.optionList}>
          {options.map((option, index) => (
            <Pressable
              key={option}
              style={[
                styles.option,
                {
                  borderColor: selectedIndex === index ? tokens.accent : native.separator,
                  backgroundColor: selectedIndex === index ? tokens.accentSoft : native.fill,
                },
              ]}
              onPress={() => !complete && setSelectedIndex(index)}
              disabled={complete}
            >
              <QuestionContentWebView text={option} embedded compact />
            </Pressable>
          ))}
        </View>
      ) : (
        <TextInput
          style={[styles.input, type.body, { color: native.label, borderColor: native.separator, backgroundColor: native.fill }]}
          value={text}
          onChangeText={setText}
          placeholder="Share your thoughts…"
          placeholderTextColor={native.tertiaryLabel}
          multiline
          editable={!complete}
        />
      )}
      {!complete ? (
        <SummerModulePrimaryButton label="Save reflection" onPress={() => void handleSubmit()} loading={saving} />
      ) : null}
    </SummerModuleBlockShell>
  )
}

function QuizBlock({
  block,
  progress,
  complete,
  saving,
  onSaveProgress,
}: {
  block: SummerModuleBlock
  progress: SummerModuleProgressRecord[]
  complete: boolean
  saving: boolean
  onSaveProgress: SaveProgress
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const title = asString(block.content.title) ?? "Knowledge check"
  const questions = Array.isArray(block.content.questions)
    ? (block.content.questions as Array<Record<string, unknown>>)
    : []
  const saved = progress.find((record) => record.progress_type === "quiz_response")
  const savedAnswers =
    saved?.metadata?.answers && typeof saved.metadata.answers === "object"
      ? (saved.metadata.answers as Record<string, unknown>)
      : {}
  const [answers, setAnswers] = useState<Record<string, number | number[]>>(() => {
    const initial: Record<string, number | number[]> = {}
    for (const [key, value] of Object.entries(savedAnswers)) {
      if (typeof value === "number" || Array.isArray(value)) initial[key] = value
    }
    return initial
  })

  function scoreQuiz(): { correctCount: number; totalQuestions: number } {
    let correctCount = 0
    for (const question of questions) {
      const id = asString(question.id) ?? ""
      const answer = answers[id]
      const options = asStringArray(question.options)
      const correctIndex = typeof question.correctIndex === "number" ? question.correctIndex : null
      const correctIndices = asNumberArray(question.correctIndices)
      if (Array.isArray(answer) && correctIndices.length) {
        const sortedA = [...answer].sort((a, b) => a - b).join(",")
        const sortedB = [...correctIndices].sort((a, b) => a - b).join(",")
        if (sortedA === sortedB) correctCount += 1
      } else if (typeof answer === "number" && correctIndex != null && answer === correctIndex) {
        correctCount += 1
      }
    }
    return { correctCount, totalQuestions: questions.length }
  }

  async function handleSubmit() {
    const { correctCount, totalQuestions } = scoreQuiz()
    await onSaveProgress("quiz_response", {
      answers,
      submitted: true,
      correctCount,
      totalQuestions,
      completedAt: new Date().toISOString(),
    })
  }

  return (
    <SummerModuleBlockShell title={title} complete={complete}>
      {questions.map((question, qIndex) => {
        const id = asString(question.id) ?? `q${qIndex}`
        const prompt = asString(question.prompt) ?? `Question ${qIndex + 1}`
        const options = asStringArray(question.options)
        const multiSelect = question.multiSelect === true || Array.isArray(question.correctIndices)
        const current = answers[id]

        return (
          <View key={id} style={styles.quizQuestion}>
            <QuestionContentWebView text={prompt} embedded />
            <View style={styles.optionList}>
              {options.map((option, index) => {
                const active = multiSelect
                  ? Array.isArray(current) && current.includes(index)
                  : current === index
                return (
                  <Pressable
                    key={option}
                    style={[
                      styles.option,
                      {
                        borderColor: active ? tokens.accent : native.separator,
                        backgroundColor: active ? tokens.accentSoft : native.fill,
                      },
                    ]}
                    onPress={() => {
                      if (complete) return
                      setAnswers((prev) => {
                        if (multiSelect) {
                          const list = Array.isArray(prev[id]) ? [...(prev[id] as number[])] : []
                          return {
                            ...prev,
                            [id]: list.includes(index) ? list.filter((item) => item !== index) : [...list, index],
                          }
                        }
                        return { ...prev, [id]: index }
                      })
                    }}
                    disabled={complete}
                  >
                    <QuestionContentWebView text={option} embedded compact />
                  </Pressable>
                )
              })}
            </View>
          </View>
        )
      })}
      {!complete ? (
        <SummerModulePrimaryButton label="Submit quiz" onPress={() => void handleSubmit()} loading={saving} />
      ) : saved?.metadata ? (
        <Text style={[type.caption, { color: native.secondaryLabel }]}>
          Score: {String(saved.metadata.correctCount ?? "—")}/{String(saved.metadata.totalQuestions ?? questions.length)}
        </Text>
      ) : null}
    </SummerModuleBlockShell>
  )
}

function FeedbackBlock({
  block,
  progress,
  complete,
  saving,
  onSaveProgress,
}: {
  block: SummerModuleBlock
  progress: SummerModuleProgressRecord[]
  complete: boolean
  saving: boolean
  onSaveProgress: SaveProgress
}) {
  const native = useThemedNative()
  const type = useNativeType()
  const interestingPrompt =
    asString(block.content.interestingPrompt) ?? "What was the most interesting thing you learned?"
  const saved = progress.find((record) => record.progress_type === "feedback")
  const [interesting, setInteresting] = useState(asString(saved?.metadata?.interesting) ?? "")
  const [confidence, setConfidence] = useState(
    typeof saved?.metadata?.confidence === "number" ? (saved.metadata.confidence as number) : 3,
  )

  async function handleSubmit() {
    if (!interesting.trim()) return
    await onSaveProgress("feedback", {
      kind: asString(block.content.kind) ?? "module_reflection",
      submitted: true,
      interesting: interesting.trim(),
      confidence,
    })
  }

  return (
    <SummerModuleBlockShell title="Module feedback" complete={complete}>
      <Text style={[type.body, { color: native.label, lineHeight: 22 }]}>{interestingPrompt}</Text>
      <TextInput
        style={[styles.input, type.body, { color: native.label, borderColor: native.separator, backgroundColor: native.fill }]}
        value={interesting}
        onChangeText={setInteresting}
        placeholder="Your response…"
        placeholderTextColor={native.tertiaryLabel}
        multiline
        editable={!complete}
      />
      <Text style={[type.caption, { color: native.secondaryLabel }]}>Confidence: {confidence}/5</Text>
      <View style={styles.confidenceRow}>
        {[1, 2, 3, 4, 5].map((value) => (
          <Pressable
            key={value}
            style={[
              styles.confidenceDot,
              {
                backgroundColor: confidence >= value ? native.tint : native.fill,
                borderColor: native.separator,
              },
            ]}
            onPress={() => !complete && setConfidence(value)}
          />
        ))}
      </View>
      {!complete ? (
        <SummerModulePrimaryButton label="Submit feedback" onPress={() => void handleSubmit()} loading={saving} />
      ) : null}
    </SummerModuleBlockShell>
  )
}

function GalleryBlock({ block, complete }: { block: SummerModuleBlock; complete: boolean }) {
  const native = useThemedNative()
  const type = useNativeType()
  const cards = Array.isArray(block.content.cards) ? (block.content.cards as Array<Record<string, unknown>>) : []

  return (
    <SummerModuleBlockShell title="Gallery" complete={complete}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryRow}>
        {cards.map((card, index) => {
          const imageUrl = asString(card.imageUrl)
          return (
            <View key={index} style={[styles.galleryCard, { backgroundColor: native.fill, borderColor: native.separator }]}>
              {imageUrl ? (
                <Image source={{ uri: resolveAssetUrl(imageUrl) }} style={styles.galleryImage} resizeMode="cover" />
              ) : (
                <View style={[styles.galleryImage, styles.galleryPlaceholder, { backgroundColor: native.secondaryGrouped }]}>
                  <Ionicons name="image-outline" size={24} color={native.tertiaryLabel} />
                </View>
              )}
              <Text style={[type.bodyEmphasis, { color: native.label }]} numberOfLines={2}>
                {asString(card.title) ?? "Example"}
              </Text>
              {asString(card.description) ? (
                <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={3}>
                  {asString(card.description)}
                </Text>
              ) : null}
            </View>
          )
        })}
      </ScrollView>
    </SummerModuleBlockShell>
  )
}

function VideoBlock({ block, complete }: { block: SummerModuleBlock; complete: boolean }) {
  const native = useThemedNative()
  const type = useNativeType()
  const title = asString(block.content.title) ?? "Video"
  const url = asString(block.content.url)

  return (
    <SummerModuleBlockShell title={title} complete={complete}>
      <View style={[styles.videoPlaceholder, { backgroundColor: native.fill, borderColor: native.separator }]}>
        <Ionicons name="videocam-outline" size={28} color={native.tertiaryLabel} />
        <Text style={[type.body, { color: native.secondaryLabel, textAlign: "center", lineHeight: 22 }]}>
          {url ? "Faculty video is linked to this module." : "Faculty video will appear here when published."}
        </Text>
      </View>
    </SummerModuleBlockShell>
  )
}

function FacultyCardsBlock({ block, complete }: { block: SummerModuleBlock; complete: boolean }) {
  const native = useThemedNative()
  const type = useNativeType()
  const faculty = Array.isArray(block.content.faculty) ? (block.content.faculty as Array<Record<string, unknown>>) : []
  const assistants = Array.isArray(block.content.assistants)
    ? (block.content.assistants as Array<Record<string, unknown>>)
    : []

  return (
    <SummerModuleBlockShell title="Meet the team" complete={complete}>
      {[...faculty, ...assistants].map((person, index) => (
        <View key={index} style={[styles.personCard, { borderColor: native.separator }]}>
          <Text style={[type.bodyEmphasis, { color: native.label }]}>{asString(person.name) ?? "Faculty"}</Text>
          {asString(person.role) ? (
            <Text style={[type.caption, { color: native.secondaryLabel }]}>{asString(person.role)}</Text>
          ) : null}
          {asString(person.funFact) ? (
            <Text style={[type.body, { color: native.label, lineHeight: 21 }]}>{asString(person.funFact)}</Text>
          ) : null}
        </View>
      ))}
    </SummerModuleBlockShell>
  )
}

function MissionObjectivesBlock({ block, complete }: { block: SummerModuleBlock; complete: boolean }) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const missions = Array.isArray(block.content.missions)
    ? (block.content.missions as Array<Record<string, unknown>>)
    : []

  return (
    <SummerModuleBlockShell title="Mission objectives" complete={complete}>
      {missions.map((mission, index) => (
        <View key={index} style={styles.missionRow}>
          <View style={[styles.missionIcon, { backgroundColor: tokens.accentSoft }]}>
            <Ionicons name="flag-outline" size={16} color={tokens.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[type.bodyEmphasis, { color: native.label }]}>{asString(mission.title) ?? "Mission"}</Text>
            {typeof mission.xp === "number" ? (
              <Text style={[type.caption, { color: native.secondaryLabel }]}>{mission.xp} XP</Text>
            ) : null}
          </View>
        </View>
      ))}
    </SummerModuleBlockShell>
  )
}

function ProfileFormBlock({
  block,
  complete,
  saving,
  onSaveProgress,
}: {
  block: SummerModuleBlock
  complete: boolean
  saving: boolean
  onSaveProgress: SaveProgress
}) {
  const native = useThemedNative()
  const type = useNativeType()
  const title = asString(block.content.title) ?? "Tell us about yourself"
  const fields = Array.isArray(block.content.fields) ? (block.content.fields as Array<Record<string, unknown>>) : []
  const [values, setValues] = useState<Record<string, string>>({})

  async function handleSubmit() {
    await onSaveProgress("step_complete", {})
  }

  return (
    <SummerModuleBlockShell title={title} complete={complete}>
      {fields.map((field) => {
        const key = asString(field.key) ?? asString(field.label) ?? "field"
        const label = asString(field.label) ?? key
        const multiline = field.type === "textarea"
        return (
          <View key={key} style={{ gap: 6 }}>
            <Text style={[type.caption, { color: native.secondaryLabel }]}>{label}</Text>
            <TextInput
              style={[
                multiline ? styles.inputTall : styles.input,
                type.body,
                { color: native.label, borderColor: native.separator, backgroundColor: native.fill },
              ]}
              value={values[key] ?? ""}
              onChangeText={(text) => setValues((prev) => ({ ...prev, [key]: text }))}
              placeholder={label}
              placeholderTextColor={native.tertiaryLabel}
              multiline={multiline}
              editable={!complete}
            />
          </View>
        )
      })}
      {!complete ? (
        <SummerModulePrimaryButton label="Save profile" onPress={() => void handleSubmit()} loading={saving} />
      ) : null}
    </SummerModuleBlockShell>
  )
}

function StepBlock({
  block,
  complete,
  saving,
  onSaveProgress,
}: {
  block: SummerModuleBlock
  complete: boolean
  saving: boolean
  onSaveProgress: SaveProgress
}) {
  const native = useThemedNative()
  const type = useNativeType()
  const title = asString(block.content.title) ?? "Step"
  const description = asString(block.content.description)
  const checkable = block.content.checkable !== false

  return (
    <SummerModuleBlockShell title={title} complete={complete}>
      {description ? (
        <Text style={[type.body, { color: native.label, lineHeight: 22 }]}>{description}</Text>
      ) : null}
      {checkable && !complete ? (
        <SummerModulePrimaryButton
          label="Mark step complete"
          onPress={() => void onSaveProgress("step_complete", {})}
          loading={saving}
        />
      ) : null}
    </SummerModuleBlockShell>
  )
}

function CodeBlock({ block, complete }: { block: SummerModuleBlock; complete: boolean }) {
  const native = useThemedNative()
  const type = useNativeType()
  const title = asString(block.content.title) ?? "Sample code"
  const code = asString(block.content.code) ?? ""

  return (
    <SummerModuleBlockShell title={title} complete={complete}>
      {code ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Text
            style={[
              type.caption,
              styles.codeBlock,
              { color: native.label, backgroundColor: native.fill, borderColor: native.separator },
            ]}
          >
            {code}
          </Text>
        </ScrollView>
      ) : (
        <Text style={[type.body, { color: native.secondaryLabel }]}>Code sample will appear here when published.</Text>
      )}
    </SummerModuleBlockShell>
  )
}

function CheckpointBlock({
  block,
  submission,
  complete,
  saving,
  onSubmitCheckpoint,
}: {
  block: SummerModuleBlock
  submission?: SummerCheckpointSubmission
  complete: boolean
  saving: boolean
  onSubmitCheckpoint?: (file: { uri: string; name: string; mime: string }) => Promise<void>
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const title = asString(block.content.title) ?? "Checkpoint"
  const description = asString(block.content.description)
  const acceptedTypes = asStringArray(block.content.acceptedTypes)
  const maxSizeMb = typeof block.content.maxSizeMb === "number" ? block.content.maxSizeMb : undefined
  const facultyApproval = block.content.facultyApproval === true

  async function pickAndUpload() {
    if (!onSubmitCheckpoint) return
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: acceptedTypes.length ? acceptedTypes : "*/*",
    })
    if (result.canceled || !result.assets?.[0]) return
    const asset = result.assets[0]
    if (maxSizeMb != null && asset.size != null && asset.size > maxSizeMb * 1024 * 1024) {
      AppAlert.alert("File too large", `Choose a file under ${maxSizeMb} MB.`)
      return
    }
    await onSubmitCheckpoint({
      uri: asset.uri,
      name: asset.name ?? "checkpoint-upload",
      mime: asset.mimeType ?? "application/octet-stream",
    })
  }

  return (
    <SummerModuleBlockShell title={title} complete={complete}>
      {description ? (
        <Text style={[type.body, { color: native.label, lineHeight: 22 }]}>{description}</Text>
      ) : null}
      {acceptedTypes.length ? (
        <Text style={[type.caption, { color: native.secondaryLabel }]}>
          Accepted: {acceptedTypes.map((item) => item.split("/").pop()).join(", ")}
          {maxSizeMb != null ? ` · ${maxSizeMb} MB max` : ""}
        </Text>
      ) : null}
      {facultyApproval ? (
        <Text style={[type.caption, { color: tokens.warning }]}>Faculty review required after upload.</Text>
      ) : null}

      {submission?.file_url ? (
        <Pressable
          style={[styles.submissionCard, { borderColor: native.separator, backgroundColor: native.fill }]}
          onPress={() => void Linking.openURL(submission.file_url!)}
        >
          <Ionicons name="document-attach-outline" size={18} color={tokens.accent} />
          <View style={{ flex: 1 }}>
            <Text style={[type.bodyEmphasis, { color: native.label }]} numberOfLines={1}>
              {submission.file_name ?? "Submitted file"}
            </Text>
            <Text style={[type.caption, { color: native.secondaryLabel }]}>
              {submission.status === "approved" ? "Approved" : "Submitted · tap to open"}
            </Text>
          </View>
        </Pressable>
      ) : null}

      {!complete ? (
        <SummerModulePrimaryButton
          label={submission ? "Replace submission" : "Upload checkpoint file"}
          onPress={() => void pickAndUpload()}
          loading={saving}
        />
      ) : submission?.feedback ? (
        <View style={[styles.revealBox, { backgroundColor: semanticSoft(tokens.accent, tokens.isDark) }]}>
          <Text style={[type.body, { color: native.label, lineHeight: 22 }]}>{submission.feedback}</Text>
        </View>
      ) : null}
    </SummerModuleBlockShell>
  )
}

function ModuleCompletionBlock({
  block,
  complete,
  saving,
  onSaveProgress,
}: {
  block: SummerModuleBlock
  complete: boolean
  saving: boolean
  onSaveProgress: SaveProgress
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const title = asString(block.content.title) ?? "Congratulations!"
  const message = asString(block.content.message)
  const rewards =
    block.content.rewards && typeof block.content.rewards === "object"
      ? (block.content.rewards as Record<string, unknown>)
      : null

  return (
    <View style={[styles.completion, tokens.cardShadow, { backgroundColor: semanticSoft(tokens.success, tokens.isDark) }]}>
      <Ionicons name="trophy-outline" size={28} color={tokens.success} />
      <Text style={[type.bodyEmphasis, { color: native.label, textAlign: "center", fontSize: 22, lineHeight: 28 }]}>{title}</Text>
      {message ? <Text style={[type.body, { color: native.label, textAlign: "center", lineHeight: 23 }]}>{message}</Text> : null}
      {typeof rewards?.xp === "number" ? (
        <Text style={[type.bodyEmphasis, { color: tokens.success }]}>+{rewards.xp} XP</Text>
      ) : null}
      {!complete ? (
        <SummerModulePrimaryButton
          label="Complete module"
          onPress={() => void onSaveProgress("module_complete", {})}
          loading={saving}
        />
      ) : (
        <Text style={[type.caption, { color: native.secondaryLabel }]}>Module complete</Text>
      )}
    </View>
  )
}

function FallbackBlock({
  block,
  complete,
  saving,
  onSaveProgress,
}: {
  block: SummerModuleBlock
  complete: boolean
  saving: boolean
  onSaveProgress: SaveProgress
}) {
  const native = useThemedNative()
  const type = useNativeType()
  return (
    <SummerModuleBlockShell title={block.block_type.replace(/_/g, " ")} complete={complete}>
      <Text style={[type.body, { color: native.secondaryLabel, lineHeight: 22 }]}>
        This block type is not fully supported yet on mobile. Mark it complete to continue your training path.
      </Text>
      {!complete ? (
        <SummerModulePrimaryButton label="Mark complete" onPress={() => void onSaveProgress("step_complete", {})} loading={saving} />
      ) : null}
    </SummerModuleBlockShell>
  )
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: NATIVE.sectionRadius,
    padding: 18,
    gap: 8,
    alignItems: "flex-start",
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { color: "#ffffff", fontSize: 24, lineHeight: 30 },
  heroSubtitle: { color: "rgba(255,255,255,0.88)", lineHeight: 22 },
  heroBadge: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  callout: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  optionList: { gap: 8 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  revealBox: { borderRadius: 12, padding: 12, gap: 6 },
  table: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, overflow: "hidden" },
  tableRow: { flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth },
  tableHead: { flex: 1, padding: 10, textTransform: "uppercase", letterSpacing: 0.4 },
  tableCell: { flex: 1, padding: 10, lineHeight: 21 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
  },
  inputTall: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 96,
    textAlignVertical: "top",
  },
  quizQuestion: { gap: 8 },
  confidenceRow: { flexDirection: "row", gap: 8 },
  confidenceDot: { width: 28, height: 28, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
  galleryRow: { gap: 12, paddingVertical: 2 },
  galleryCard: {
    width: 220,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 10,
    gap: 8,
  },
  galleryImage: { width: "100%", height: 120, borderRadius: 10 },
  galleryPlaceholder: { alignItems: "center", justifyContent: "center" },
  videoPlaceholder: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  personCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  missionRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  missionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  completion: {
    borderRadius: NATIVE.sectionRadius,
    padding: 18,
    gap: 10,
    alignItems: "center",
  },
  codeBlock: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    lineHeight: 18,
  },
  submissionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
  },
})
