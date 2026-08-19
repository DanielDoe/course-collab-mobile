import { useEffect, useRef } from "react"
import { Pressable, StyleSheet, Text, View, useWindowDimensions, type ViewStyle } from "react-native"
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { hexToRgba } from "../../constants/app-themes"
import { useNativeType } from "../../lib/themed-module-theme"
import {
  FLASHCARD_WABI_RADIUS,
  FLASHCARD_WABI_SPRING,
  flashcardWabiCardHeight,
  flashcardWabiCardWidth,
  type FlashcardWabiFace,
  type FlashcardWabiStackLayer,
} from "../../lib/flashcard-wabi-theme"
import { useIsTabletLayout } from "../../lib/responsive-layout"
import {
  normalizeFlashcardDifficulty,
  type FlashcardDifficulty,
} from "../../lib/flashcard-difficulty"
import { flashcardWabiThemeForDifficulty } from "../../lib/flashcard-difficulty-theme"

type Props = {
  frontText: string
  backText: string
  flipped: boolean
  onFlip: () => void
  style?: ViewStyle
  cardKey?: string | number
  cardIndex?: number
  difficulty?: FlashcardDifficulty | string | null
  /** Next cards in queue — stack peek tints match their difficulty hues. */
  stackDifficulties?: Array<FlashcardDifficulty | string | null | undefined>
  showStack?: boolean
  /** Play mastered-card exit (slide to back of deck) before advancing. */
  exiting?: boolean
  onExitComplete?: () => void
}

type KnownExitDirection = "right" | "left" | "top"

function knownExitDirection(cardIndex: number): KnownExitDirection {
  const modes: KnownExitDirection[] = ["right", "left", "top"]
  return modes[cardIndex % modes.length] ?? "right"
}

function WabiCardFace({
  face,
  title,
  body,
  footer,
  large,
}: {
  face: FlashcardWabiFace
  title: string
  body: string
  footer: string
  large?: boolean
}) {
  const type = useNativeType()

  return (
    <View
      style={[
        styles.faceSurface,
        { backgroundColor: face.background, borderColor: face.border },
      ]}
    >
      <View style={[styles.faceInner, large && styles.faceInnerLarge]}>
        <View style={[styles.orbOuter, large && styles.orbOuterLarge]}>
          <View style={[styles.orb, { backgroundColor: face.orb }]}>
            <View style={styles.orbHighlightLarge} />
            <View style={styles.orbHighlightSmall} />
          </View>
        </View>

        <View style={styles.copyBlock}>
          <Text
            style={[
              styles.cardTitle,
              large && styles.cardTitleLarge,
              type.bodyEmphasis,
              { color: face.title },
            ]}
            selectable
          >
            {title}
          </Text>
          {body.trim() ? (
            <Text
              style={[
                styles.cardBody,
                large && styles.cardBodyLarge,
                type.body,
                { color: face.body },
              ]}
              selectable
            >
              {body}
            </Text>
          ) : null}
        </View>

        <View style={styles.bottomSpacer} />

        <View style={styles.footerBlock}>
          <View style={[styles.divider, { backgroundColor: face.divider }]} />
          <Text style={[styles.cardFooter, large && styles.cardFooterLarge, type.caption, { color: face.footer }]}>
            {footer}
          </Text>
        </View>
      </View>
    </View>
  )
}

function StackLayer({
  layer,
  progress,
  index,
  cardHeight,
}: {
  layer: FlashcardWabiStackLayer
  progress: SharedValue<number>
  index: number
  cardHeight: number
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value
    const delayFactor = 1 - index * 0.06
    return {
      opacity: interpolate(p, [0, 1], [0, Math.max(0.92, delayFactor)]),
      transform: [
        { translateX: layer.offsetX * p },
        { translateY: layer.offsetY * p },
        { rotate: layer.rotate },
        { scale: interpolate(p, [0, 1], [0.88, layer.scale]) },
      ],
    }
  })

  return (
    <Animated.View
      style={[
        styles.stackLayer,
        {
          backgroundColor: layer.background,
          borderColor: layer.border,
          height: cardHeight,
        },
        animatedStyle,
      ]}
    />
  )
}

export function FlashcardFlipCard({
  frontText,
  backText,
  flipped,
  onFlip,
  style,
  cardKey = 0,
  cardIndex = 0,
  difficulty = "medium",
  stackDifficulties,
  showStack = true,
  exiting = false,
  onExitComplete,
}: Props) {
  const tokens = useAppThemeTokens()
  const { width } = useWindowDimensions()
  const isTablet = useIsTabletLayout()
  const normalizedDifficulty = normalizeFlashcardDifficulty(difficulty)
  const theme = flashcardWabiThemeForDifficulty(
    normalizedDifficulty,
    tokens.isDark,
    stackDifficulties,
  )
  const exitDirection = knownExitDirection(cardIndex)
  const cardWidth = flashcardWabiCardWidth(width)
  const cardHeight = flashcardWabiCardHeight(width)
  const exitDistance = Math.round((cardWidth / 272) * 156)

  const flipProgress = useSharedValue(flipped ? 1 : 0)
  const enterProgress = useSharedValue(1)
  const stackProgress = useSharedValue(1)
  const exitProgress = useSharedValue(0)
  const lastCardKey = useRef<string | number>(cardKey)
  const onExitCompleteRef = useRef(onExitComplete)
  onExitCompleteRef.current = onExitComplete

  useEffect(() => {
    if (exiting) return
    flipProgress.value = withSpring(flipped ? 1 : 0, FLASHCARD_WABI_SPRING.flip)
  }, [flipped, flipProgress, exiting])

  useEffect(() => {
    if (!exiting) {
      cancelAnimation(exitProgress)
      exitProgress.value = 0
      return
    }

    cancelAnimation(exitProgress)
    exitProgress.value = 0
    exitProgress.value = withTiming(
      1,
      { duration: FLASHCARD_WABI_SPRING.knownExit.duration, easing: Easing.inOut(Easing.cubic) },
      (finished) => {
        if (finished && onExitCompleteRef.current) {
          runOnJS(onExitCompleteRef.current)()
        }
      },
    )
  }, [exiting, exitProgress])

  useEffect(() => {
    if (lastCardKey.current === cardKey) return
    lastCardKey.current = cardKey
    flipProgress.value = 0
    exitProgress.value = 0
    enterProgress.value = 0.94
    stackProgress.value = 0
    enterProgress.value = withSpring(1, FLASHCARD_WABI_SPRING.cardEnter)
    stackProgress.value = withDelay(40, withSpring(1, FLASHCARD_WABI_SPRING.fan))
  }, [cardKey, enterProgress, stackProgress, flipProgress, exitProgress])

  const shellStyle = useAnimatedStyle(() => {
    const exit = exitProgress.value
    const enter = enterProgress.value

    let translateX = 0
    let translateY = interpolate(enter, [0, 1], [10, 0])
    let rotateZ = 0
    let scale = interpolate(enter, [0, 1], [0.97, 1])

    if (exit > 0) {
      if (exitDirection === "right") {
        translateX = interpolate(exit, [0, 1], [0, exitDistance])
        translateY += interpolate(exit, [0, 1], [0, 52])
        rotateZ = interpolate(exit, [0, 1], [0, 14])
        scale *= interpolate(exit, [0, 1], [1, 0.84])
      } else if (exitDirection === "left") {
        translateX = interpolate(exit, [0, 1], [0, -exitDistance])
        translateY += interpolate(exit, [0, 1], [0, 52])
        rotateZ = interpolate(exit, [0, 1], [0, -14])
        scale *= interpolate(exit, [0, 1], [1, 0.84])
      } else {
        translateX = interpolate(exit, [0, 1], [0, 18])
        translateY += interpolate(exit, [0, 1], [0, -Math.round(exitDistance * 0.85)])
        rotateZ = interpolate(exit, [0, 1], [0, -8])
        scale *= interpolate(exit, [0, 1], [1, 0.76])
      }
    }

    return {
      opacity: interpolate(exit, [0, 0.7, 1], [interpolate(enter, [0.94, 1], [0.72, 1]), 0.5, 0]),
      transform: [{ translateX }, { translateY }, { scale }, { rotateZ: `${rotateZ}deg` }],
      zIndex: exit > 0 ? 30 : 1,
    }
  })

  const flipStageStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1400 },
      { scale: interpolate(flipProgress.value, [0, 0.5, 1], [1, 0.992, 1]) },
    ],
  }))

  const frontStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipProgress.value, [0, 1], [0, 180])
    return {
      transform: [{ rotateY: `${rotateY}deg` }],
      zIndex: flipProgress.value < 0.5 ? 2 : 1,
    }
  })

  const backStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipProgress.value, [0, 1], [180, 360])
    return {
      transform: [{ rotateY: `${rotateY}deg` }],
      zIndex: flipProgress.value >= 0.5 ? 2 : 1,
    }
  })

  const cardShadow = (face: FlashcardWabiFace) => ({
    shadowColor: face.background,
    shadowOffset: { width: 0, height: tokens.isDark ? 24 : 18 },
    shadowOpacity: tokens.isDark ? 0.85 : 0.22,
    shadowRadius: tokens.isDark ? 40 : 32,
    elevation: tokens.isDark ? 18 : 12,
  })

  return (
    <View style={[styles.container, { width: cardWidth, height: cardHeight }, style]}>
      {showStack
        ? theme.stack.map((layer, index) => (
            <StackLayer
              key={`${cardKey}-stack-${index}-${layer.background}`}
              layer={layer}
              progress={stackProgress}
              index={index}
              cardHeight={cardHeight}
            />
          ))
        : null}

      <Animated.View style={[styles.topCardShell, shellStyle]}>
        <Pressable
          onPress={exiting ? undefined : onFlip}
          disabled={exiting}
          style={[styles.pressable, { height: cardHeight }]}
          accessibilityRole="button"
          accessibilityLabel={flipped ? "Show question" : "Show answer"}
        >
          <Animated.View style={[styles.flipStage, flipStageStyle]}>
            <Animated.View style={[styles.faceShell, cardShadow(theme.front), frontStyle]}>
              <WabiCardFace
                face={theme.front}
                title={frontText}
                body=""
                footer="Tap to reveal the answer"
                large={isTablet}
              />
            </Animated.View>

            <Animated.View style={[styles.faceShell, cardShadow(theme.back), backStyle]}>
              <WabiCardFace
                face={theme.back}
                title="Answer"
                body={backText}
                footer="Tap to flip back"
                large={isTablet}
              />
            </Animated.View>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </View>
  )
}

/** Thin progress bar for timed mode (1 → 0 as timer elapses). */
export function FlashcardTimerBar({
  secondsLeft,
  totalSeconds,
}: {
  secondsLeft: number
  totalSeconds: number
}) {
  const tokens = useAppThemeTokens()
  const ratio = Math.max(0, Math.min(1, secondsLeft / totalSeconds))
  const barColor = ratio > 0.25 ? tokens.accent : tokens.danger

  return (
    <View style={[styles.timerTrack, { backgroundColor: hexToRgba(tokens.accent, tokens.isDark ? 0.18 : 0.08) }]}>
      <View style={[styles.timerFill, { width: `${ratio * 100}%`, backgroundColor: barColor }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "center",
    justifyContent: "flex-start",
    overflow: "visible",
    position: "relative",
  },
  topCardShell: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  stackLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    borderRadius: FLASHCARD_WABI_RADIUS,
    borderWidth: 2,
    zIndex: 0,
  },
  pressable: {
    width: "100%",
  },
  flipStage: {
    flex: 1,
    position: "relative",
  },
  faceShell: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: FLASHCARD_WABI_RADIUS,
    overflow: "hidden",
    backfaceVisibility: "hidden",
  },
  faceSurface: {
    flex: 1,
    borderRadius: FLASHCARD_WABI_RADIUS,
    borderWidth: 2,
  },
  faceInner: {
    flex: 1,
    paddingTop: 44,
    paddingHorizontal: 24,
    paddingBottom: 20,
    alignItems: "center",
  },
  faceInnerLarge: {
    paddingTop: 52,
    paddingHorizontal: 32,
    paddingBottom: 28,
  },
  orbOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: "hidden",
    marginBottom: 20,
  },
  orbOuterLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 24,
  },
  orb: {
    flex: 1,
    borderRadius: 40,
  },
  orbHighlightLarge: {
    position: "absolute",
    top: 14,
    left: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.78)",
  },
  orbHighlightSmall: {
    position: "absolute",
    bottom: 18,
    right: 16,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.48)",
  },
  copyBlock: {
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 10,
    paddingHorizontal: 4,
  },
  bottomSpacer: {
    flex: 1,
    minHeight: 16,
    width: "100%",
  },
  cardTitle: {
    fontSize: 22,
    lineHeight: 30,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  cardTitleLarge: {
    fontSize: 28,
    lineHeight: 36,
  },
  cardBody: {
    fontSize: 17,
    lineHeight: 25,
    textAlign: "center",
  },
  cardBodyLarge: {
    fontSize: 19,
    lineHeight: 28,
  },
  footerBlock: {
    width: "100%",
    alignItems: "center",
    gap: 12,
    paddingTop: 4,
  },
  divider: {
    width: "72%",
    height: StyleSheet.hairlineWidth,
  },
  cardFooter: {
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  cardFooterLarge: {
    fontSize: 15,
    lineHeight: 22,
  },
  timerTrack: {
    height: 5,
    borderRadius: 999,
    overflow: "hidden",
    marginHorizontal: 16,
    marginBottom: 8,
  },
  timerFill: {
    height: "100%",
    borderRadius: 999,
  },
})
