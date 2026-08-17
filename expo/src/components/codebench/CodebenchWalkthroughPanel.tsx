import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Animated, {
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated"
import { Ionicons } from "@/components/icons/AppIcon"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { hexToRgba } from "../../constants/app-themes"
import { NATIVE } from "../../constants/faculty-native-theme"
import type { CodeReplayPhase, CodeReplayStep } from "../../lib/codebench-replay"
import { useNativeType } from "../../lib/themed-module-theme"
import { CoraBrand } from "../cora/CoraBrand"
import { CoraThinkingIndicator } from "../ai-tutor/CoraThinkingIndicator"

const CORA_PURPLE = "#7C3AED"
const H_PAD = 20

const PHASE_LABEL: Record<CodeReplayPhase, string> = {
  setup: "Setup",
  loop: "Loop",
  condition: "Condition",
  body: "Body",
  update: "Update",
  output: "Output",
  return: "Return",
  call: "Call",
}

const PHASE_COLOR: Record<CodeReplayPhase, string> = {
  setup: "#0EA5E9",
  loop: "#8B5CF6",
  condition: "#F59E0B",
  body: "#10B981",
  update: "#6366F1",
  output: "#06B6D4",
  return: "#64748B",
  call: "#EC4899",
}

type Props = {
  steps: CodeReplayStep[]
  sourceCode: string
  expanded?: boolean
  bottomInset?: number
  fullscreen?: boolean
  loading?: boolean
  index?: number
  onIndexChange?: (index: number) => void
  onCollapse?: () => void
  onClose?: () => void
}

function codeContextWindow(sourceCode: string, lineNumber: number, pad = 2) {
  const lines = sourceCode.split("\n")
  const idx = Math.max(0, lineNumber - 1)
  const start = Math.max(0, idx - pad)
  const end = Math.min(lines.length, idx + pad + 1)
  return lines.slice(start, end).map((text, offset) => ({
    lineNumber: start + offset + 1,
    text,
    active: start + offset === idx,
  }))
}

function StepRail({
  steps,
  index,
  onSelect,
}: {
  steps: CodeReplayStep[]
  index: number
  onSelect: (next: number) => void
}) {
  const native = useThemedNative()
  const type = useNativeType()
  const railRef = useRef<ScrollView>(null)
  const compact = steps.length > 8

  useEffect(() => {
    if (!compact) return
    railRef.current?.scrollTo({ x: Math.max(0, index * 44 - 80), animated: true })
  }, [compact, index])

  const renderDot = (i: number) => {
    const done = i < index
    const active = i === index
    return (
      <Pressable
        key={`dot-${i}`}
        onPress={() => onSelect(i)}
        style={({ pressed }) => [styles.railDotHit, pressed && { opacity: NATIVE.pressedOpacity }]}
        accessibilityRole="button"
        accessibilityLabel={`Step ${i + 1}: ${steps[i]?.title ?? ""}`}
      >
        <View
          style={[
            styles.railDot,
            active && { backgroundColor: CORA_PURPLE, borderColor: CORA_PURPLE, transform: [{ scale: 1.08 }] },
            done && !active && { backgroundColor: hexToRgba(CORA_PURPLE, 0.35), borderColor: hexToRgba(CORA_PURPLE, 0.35) },
            !done && !active && { backgroundColor: native.secondaryGrouped, borderColor: native.separator },
          ]}
        >
          {done && !active ? (
            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
          ) : (
            <Text
              style={[
                type.footnote,
                {
                  color: active ? "#FFFFFF" : native.secondaryLabel,
                  fontWeight: "800",
                  fontSize: 12,
                },
              ]}
            >
              {i + 1}
            </Text>
          )}
        </View>
      </Pressable>
    )
  }

  const renderConnector = (i: number) => {
    const filled = i <= index
    return (
      <View
        key={`conn-${i}`}
        style={[
          compact ? styles.railConnectorFixed : styles.railConnectorFlex,
          { backgroundColor: filled ? hexToRgba(CORA_PURPLE, 0.55) : native.separator },
        ]}
      />
    )
  }

  const railBody = (
    <View style={[styles.railRow, compact && styles.railRowCompact]}>
      {steps.map((_, i) => (
        <View key={`seg-${i}`} style={[styles.railSegment, compact && styles.railSegmentCompact]}>
          {i > 0 ? renderConnector(i) : null}
          {renderDot(i)}
        </View>
      ))}
    </View>
  )

  if (compact) {
    return (
      <ScrollView
        ref={railRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.railScrollContent}
      >
        {railBody}
      </ScrollView>
    )
  }

  return railBody
}

function WalkthroughControls({
  index,
  total,
  onBack,
  onRestart,
  onNext,
}: {
  index: number
  total: number
  onBack: () => void
  onRestart: () => void
  onNext: () => void
}) {
  const native = useThemedNative()
  const type = useNativeType()
  const atStart = index === 0
  const atEnd = index >= total - 1

  return (
    <View style={[styles.controlBar, { backgroundColor: native.fill, borderColor: native.separator }]}>
      <Pressable
        onPress={onBack}
        disabled={atStart}
        style={({ pressed }) => [
          styles.controlSegment,
          atStart && styles.controlSegmentDisabled,
          pressed && !atStart && { opacity: NATIVE.pressedOpacity },
        ]}
        accessibilityLabel="Previous step"
      >
        <Ionicons name="chevron-back" size={18} color={atStart ? native.tertiaryLabel : native.label} />
        <Text style={[type.caption, { color: atStart ? native.tertiaryLabel : native.label, fontWeight: "600" }]}>
          Back
        </Text>
      </Pressable>

      <View style={[styles.controlDivider, { backgroundColor: native.separator }]} />

      <Pressable
        onPress={onRestart}
        style={({ pressed }) => [styles.controlSegmentIcon, pressed && { opacity: NATIVE.pressedOpacity }]}
        accessibilityLabel="Restart walkthrough"
      >
        <Ionicons name="refresh" size={18} color={native.label} />
      </Pressable>

      <View style={[styles.controlDivider, { backgroundColor: native.separator }]} />

      <Pressable
        onPress={onNext}
        disabled={atEnd}
        style={({ pressed }) => [
          styles.controlSegmentPrimary,
          { backgroundColor: atEnd ? native.fill : CORA_PURPLE },
          pressed && !atEnd && { opacity: NATIVE.pressedOpacity },
        ]}
        accessibilityLabel="Next step"
      >
        <Text style={[type.bodyEmphasis, { color: atEnd ? native.tertiaryLabel : "#FFFFFF" }]}>Next</Text>
        <Ionicons name="chevron-forward" size={18} color={atEnd ? native.tertiaryLabel : "#FFFFFF"} />
      </Pressable>
    </View>
  )
}

function StepDetail({
  step,
  sourceCode,
  phaseColor,
}: {
  step: CodeReplayStep
  sourceCode: string
  phaseColor: string
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  const codeLines = useMemo(
    () => codeContextWindow(sourceCode, step.lineNumber),
    [sourceCode, step.lineNumber],
  )

  return (
    <Animated.View entering={FadeInDown.duration(320).springify().damping(18)} exiting={FadeOut.duration(160)} style={styles.stepBody}>
      <View style={styles.tagRow}>
        {step.phase ? (
          <View style={[styles.tag, { backgroundColor: hexToRgba(phaseColor, 0.14) }]}>
            <Text style={[type.footnote, { color: phaseColor, fontWeight: "700" }]}>
              {PHASE_LABEL[step.phase]}
            </Text>
          </View>
        ) : null}
        {step.concept ? (
          <View style={[styles.tag, { backgroundColor: native.fill }]}>
            <Text style={[type.footnote, { color: native.secondaryLabel, fontWeight: "600" }]}>
              {step.concept}
            </Text>
          </View>
        ) : null}
      </View>

      <View
        style={[
          styles.codeCard,
          tokens.cardShadow,
          {
            backgroundColor: tokens.isDark ? "#0F1419" : "#FFFFFF",
            borderColor: native.separator,
          },
        ]}
      >
        {codeLines.map((line) => (
          <View
            key={line.lineNumber}
            style={[
              styles.codeRow,
              line.active && {
                backgroundColor: hexToRgba(CORA_PURPLE, tokens.isDark ? 0.28 : 0.1),
                borderLeftWidth: 3,
                borderLeftColor: CORA_PURPLE,
              },
            ]}
          >
            <Text
              style={[
                type.footnote,
                styles.lineNum,
                { color: line.active ? CORA_PURPLE : native.tertiaryLabel },
              ]}
            >
              {line.lineNumber}
            </Text>
            <Text
              style={[
                type.secondary,
                styles.codeText,
                {
                  color: line.active ? native.label : native.secondaryLabel,
                  fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
                },
              ]}
            >
              {line.text || " "}
            </Text>
            {line.active ? (
              <View style={[styles.nowBadge, { backgroundColor: CORA_PURPLE }]}>
                <Text style={[type.footnote, { color: "#FFFFFF", fontWeight: "800", fontSize: 9 }]}>NOW</Text>
              </View>
            ) : null}
          </View>
        ))}
      </View>

      {Object.keys(step.variables).length > 0 ? (
        <View style={styles.section}>
          <Text style={[type.caption, styles.sectionLabel, { color: native.secondaryLabel }]}>Memory</Text>
          <View style={styles.varRow}>
            {Object.entries(step.variables).map(([name, value]) => {
              const changed = step.changedVariables?.includes(name)
              return (
                <View
                  key={name}
                  style={[
                    styles.varChip,
                    {
                      borderColor: changed ? "#10B981" : native.separator,
                      backgroundColor: changed ? hexToRgba("#10B981", 0.12) : native.fill,
                    },
                  ]}
                >
                  <Text style={[type.caption, { color: native.secondaryLabel }]}>{name}</Text>
                  <Text style={[type.bodyEmphasis, { color: native.label }]}>{String(value)}</Text>
                  {changed ? (
                    <View style={styles.updBadge}>
                      <Text style={[type.footnote, { color: "#10B981", fontWeight: "800", fontSize: 9 }]}>upd</Text>
                    </View>
                  ) : null}
                </View>
              )
            })}
          </View>
        </View>
      ) : null}

      {step.condition ? (
        <View style={[styles.conditionBox, { borderColor: native.separator, backgroundColor: native.fill }]}>
          <Text style={[type.caption, { color: native.secondaryLabel }]}>Condition</Text>
          <Text
            style={[
              type.body,
              { color: native.label, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
            ]}
          >
            {step.condition}
          </Text>
          {step.result ? (
            <Text
              style={[
                type.caption,
                {
                  color: step.result.toLowerCase().includes("false") ? NATIVE.destructive : "#10B981",
                  fontWeight: "700",
                  marginTop: 6,
                },
              ]}
            >
              {step.result}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View
        style={[
          styles.explainBox,
          {
            borderColor: hexToRgba(CORA_PURPLE, 0.22),
            backgroundColor: hexToRgba(CORA_PURPLE, tokens.isDark ? 0.14 : 0.07),
          },
        ]}
      >
        <View style={styles.explainHead}>
          <CoraBrand size="xs" />
          <Text style={[type.caption, { color: CORA_PURPLE, fontWeight: "800", letterSpacing: 0.5 }]}>
            WHAT HAPPENS
          </Text>
        </View>
        <Text style={[type.body, { color: native.label, lineHeight: 24 }]}>{step.explanation}</Text>
        {step.bullets?.map((bullet) => (
          <View key={bullet} style={styles.bulletRow}>
            <Text style={[type.body, { color: CORA_PURPLE, lineHeight: 22 }]}>•</Text>
            <Text style={[type.secondary, { color: native.secondaryLabel, flex: 1, lineHeight: 22 }]}>
              {bullet}
            </Text>
          </View>
        ))}
      </View>

      {step.consoleOutput ? (
        <View style={[styles.consoleBox, { backgroundColor: "#0B1220", borderColor: "#1E293B" }]}>
          <View style={styles.consoleHead}>
            <Ionicons name="terminal-outline" size={13} color="#67E8F9" />
            <Text style={[type.footnote, { color: "#67E8F9", fontWeight: "700" }]}>Output</Text>
          </View>
          <Text
            style={[
              type.secondary,
              { color: "#E2E8F0", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", lineHeight: 22 },
            ]}
          >
            {step.consoleOutput}
          </Text>
        </View>
      ) : null}

      {step.teachingNote ? (
        <View
          style={[
            styles.tipBox,
            { borderColor: hexToRgba("#F59E0B", 0.35), backgroundColor: hexToRgba("#F59E0B", 0.08) },
          ]}
        >
          <Ionicons name="bulb-outline" size={16} color="#D97706" />
          <Text style={[type.secondary, { color: native.label, flex: 1, lineHeight: 22 }]}>{step.teachingNote}</Text>
        </View>
      ) : null}
    </Animated.View>
  )
}

export function CodebenchWalkthroughPanel({
  steps,
  sourceCode,
  expanded = false,
  bottomInset = 0,
  fullscreen = false,
  loading = false,
  index: controlledIndex,
  onIndexChange,
  onCollapse,
  onClose,
}: Props) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const insets = useSafeAreaInsets()

  const [internalIndex, setInternalIndex] = useState(0)
  const index = controlledIndex ?? internalIndex
  const step = steps[index]
  const total = steps.length
  const progress = total > 0 ? (index + 1) / total : 0

  const progressWidth = useSharedValue(progress)

  useEffect(() => {
    if (controlledIndex === undefined) {
      setInternalIndex(0)
    }
  }, [controlledIndex, steps])

  useEffect(() => {
    progressWidth.value = withSpring(progress, { damping: 20, stiffness: 160 })
  }, [progress, progressWidth])

  const progressAnimStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(100, progressWidth.value * 100))}%`,
  }))

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(total - 1, next))
      if (onIndexChange) onIndexChange(clamped)
      else setInternalIndex(clamped)
    },
    [onIndexChange, total],
  )

  const phaseColor = step?.phase ? PHASE_COLOR[step.phase] : CORA_PURPLE

  const chromeCard = step ? (
    <View
      style={[
        styles.chromeCard,
        tokens.cardShadow,
        {
          backgroundColor: native.secondaryGrouped,
          borderColor: native.separator,
        },
      ]}
    >
      <View style={styles.progressHeader}>
        <View style={styles.progressMeta}>
          <CoraBrand size="xs" />
          <Text style={[type.caption, { color: native.secondaryLabel, fontWeight: "600" }]}>
            Execution trace
          </Text>
        </View>
        <Text style={[type.caption, { color: native.label, fontWeight: "700" }]}>
          {index + 1} / {total}
        </Text>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: native.fill }]}>
        <Animated.View style={[styles.progressFill, progressAnimStyle, { backgroundColor: CORA_PURPLE }]} />
      </View>

      <StepRail steps={steps} index={index} onSelect={goTo} />

      <Animated.View
        key={`label-${index}`}
        entering={FadeInDown.duration(240).springify().damping(20)}
        style={styles.currentStepLabelWrap}
      >
        <Text style={[type.bodyEmphasis, styles.currentStepLabel, { color: native.label }]}>
          {step.title}
        </Text>
        {step.lineNumber ? (
          <Text style={[type.caption, { color: native.secondaryLabel }]}>Line {step.lineNumber}</Text>
        ) : null}
      </Animated.View>

      <WalkthroughControls
        index={index}
        total={total}
        onBack={() => goTo(index - 1)}
        onRestart={() => goTo(0)}
        onNext={() => goTo(index + 1)}
      />
    </View>
  ) : null

  const fullscreenHeader = (
    <View style={styles.fullscreenHead}>
      <View style={styles.fullscreenHeadBrand}>
        <CoraBrand size="sm" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[type.bodyEmphasis, { color: native.label }]}>
          {loading ? "Building walkthrough" : "Execution walkthrough"}
        </Text>
        <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={2}>
          {loading ? "Tracing your code step by step" : "Full screen · tap collapse to return to the editor"}
        </Text>
      </View>
      <View style={styles.fullscreenHeadActions}>
        <Pressable
          onPress={onCollapse}
          hitSlop={8}
          style={[styles.fullscreenHeadBtn, { backgroundColor: native.fill }]}
          accessibilityLabel="Collapse walkthrough"
        >
          <Ionicons name="contract-outline" size={18} color={native.label} />
        </Pressable>
        <Pressable
          onPress={onClose}
          hitSlop={8}
          style={styles.fullscreenHeadBtn}
          accessibilityLabel="Close walkthrough"
        >
          <Ionicons name="close" size={18} color={native.secondaryLabel} />
        </Pressable>
      </View>
    </View>
  )

  if (fullscreen) {
    return (
      <Modal visible animationType="fade" statusBarTranslucent presentationStyle="fullScreen">
        <View style={[styles.fullscreenHost, { backgroundColor: native.secondaryGrouped }]}>
          <View
            style={[
              styles.fullscreenFrame,
              { paddingTop: insets.top, paddingBottom: insets.bottom },
            ]}
          >
            {fullscreenHeader}
            {loading || !step || total === 0 ? (
              <View style={styles.fullscreenLoading}>
                <CoraThinkingIndicator context="codebench" hideBrand />
              </View>
            ) : (
              <ScrollView
                style={styles.fullscreenScroll}
                contentContainerStyle={[
                  styles.fullscreenScrollContent,
                  { paddingHorizontal: H_PAD, paddingBottom: 16 },
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.chrome}>{chromeCard}</View>
                <StepDetail key={`step-${index}`} step={step} sourceCode={sourceCode} phaseColor={phaseColor} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    )
  }

  if (!step || total === 0) {
    return (
      <View style={[styles.empty, { paddingHorizontal: H_PAD }]}>
        <CoraBrand size="md" />
        <Text style={[type.body, { color: native.secondaryLabel, textAlign: "center", lineHeight: 22 }]}>
          No walkthrough steps yet. Try again with more code in the editor.
        </Text>
      </View>
    )
  }

  return (
    <View style={[styles.root, expanded && styles.rootExpanded]}>
      <View style={[styles.chrome, { paddingHorizontal: H_PAD }]}>{chromeCard}</View>

      <ScrollView
        style={[styles.detailScroll, expanded && styles.detailScrollExpanded]}
        contentContainerStyle={[
          styles.detailContent,
          { paddingHorizontal: H_PAD, paddingBottom: expanded ? Math.max(bottomInset, 12) + 8 : 28 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <StepDetail key={`step-${index}`} step={step} sourceCode={sourceCode} phaseColor={phaseColor} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
  },
  rootExpanded: {
    flex: 1,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 32,
  },
  chrome: {
    paddingTop: 4,
    paddingBottom: 12,
  },
  chromeCard: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    gap: 14,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  railRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  railRowCompact: {
    width: undefined,
    minWidth: "100%",
  },
  railScrollContent: {
    paddingHorizontal: 2,
    alignItems: "center",
  },
  railSegment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  railSegmentCompact: {
    flex: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  railConnectorFlex: {
    flex: 1,
    height: 3,
    borderRadius: 999,
    marginHorizontal: 2,
  },
  railConnectorFixed: {
    width: 18,
    height: 3,
    borderRadius: 999,
    marginHorizontal: 2,
  },
  railDotHit: {
    padding: 2,
  },
  railDot: {
    width: 30,
    height: 30,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  currentStepLabelWrap: {
    gap: 4,
    paddingTop: 2,
  },
  currentStepLabel: {
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  controlBar: {
    flexDirection: "row",
    alignItems: "stretch",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    minHeight: 48,
  },
  controlSegment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  controlSegmentIcon: {
    width: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  controlSegmentPrimary: {
    flex: 1.15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  controlSegmentDisabled: {
    opacity: 0.55,
  },
  controlDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
  },
  detailScroll: {
    flex: 1,
    minHeight: 0,
  },
  detailScrollExpanded: {
    flex: 1,
  },
  detailContent: {
    gap: 16,
    paddingTop: 4,
  },
  stepBody: {
    gap: 16,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  codeCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  lineNum: {
    width: 24,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
    paddingTop: 1,
  },
  codeText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
  },
  nowBadge: {
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    alignSelf: "flex-start",
    marginTop: 1,
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    fontSize: 11,
  },
  varRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  varChip: {
    minWidth: 84,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  updBadge: {
    position: "absolute",
    top: 6,
    right: 8,
  },
  conditionBox: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 6,
  },
  explainBox: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 10,
  },
  explainHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bulletRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    paddingLeft: 2,
  },
  consoleBox: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 8,
  },
  consoleHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tipBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  fullscreenHost: {
    flex: 1,
  },
  fullscreenFrame: {
    flex: 1,
  },
  fullscreenHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
    flexShrink: 0,
  },
  fullscreenHeadBrand: {
    flexShrink: 0,
    alignSelf: "flex-start",
    paddingTop: 2,
  },
  fullscreenHeadActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  fullscreenHeadBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  fullscreenScroll: {
    flex: 1,
    minHeight: 0,
  },
  fullscreenScrollContent: {
    gap: 16,
    paddingTop: 4,
  },
  fullscreenLoading: {
    flex: 1,
    alignItems: "stretch",
    justifyContent: "flex-start",
    paddingHorizontal: H_PAD,
    paddingTop: 8,
  },
})
