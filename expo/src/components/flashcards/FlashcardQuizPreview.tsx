import { useEffect, useMemo, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import type { FlashcardCard } from "../../lib/flashcards-api"
import { buildFlashcardMcq, canUseFlashcardMcq } from "../../lib/flashcard-quiz"
import { FlashcardMcqChoices, FlashcardMcqPrompt } from "./FlashcardMcqUI"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { NATIVE } from "../../constants/faculty-native-theme"

type Props = {
  cards: FlashcardCard[]
  activeCardId?: number | null
  onActiveCardIdChange?: (cardId: number) => void
  accentColor?: string
}

export function FlashcardQuizPreview({ cards, activeCardId, onActiveCardIdChange, accentColor }: Props) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const accent = accentColor ?? tokens.accent
  const [internalIndex, setInternalIndex] = useState(0)

  const activeIndex = useMemo(() => {
    if (activeCardId != null) {
      const idx = cards.findIndex((c) => c.id === activeCardId)
      if (idx >= 0) return idx
    }
    return Math.min(internalIndex, Math.max(cards.length - 1, 0))
  }, [activeCardId, cards, internalIndex])

  useEffect(() => {
    if (activeCardId != null) {
      const idx = cards.findIndex((c) => c.id === activeCardId)
      if (idx >= 0) setInternalIndex(idx)
    }
  }, [activeCardId, cards])

  const setIndex = (nextIndex: number) => {
    const clamped = Math.max(0, Math.min(nextIndex, cards.length - 1))
    setInternalIndex(clamped)
    const nextCard = cards[clamped]
    if (nextCard && onActiveCardIdChange) onActiveCardIdChange(nextCard.id)
  }

  const target = cards[activeIndex]
  const mcq = useMemo(() => {
    if (!target || !canUseFlashcardMcq(cards)) return null
    return buildFlashcardMcq(target, cards)
  }, [cards, target])

  if (cards.length === 0) {
    return (
      <Text style={[type.caption, { color: native.secondaryLabel }]}>
        Add cards to preview how students will be quizzed.
      </Text>
    )
  }

  if (!canUseFlashcardMcq(cards)) {
    return (
      <Text style={[type.caption, { color: native.secondaryLabel }]}>
        Add at least two cards with front and back text to enable quiz preview.
      </Text>
    )
  }

  if (!target || !mcq) {
    return (
      <View style={[styles.empty, { borderColor: native.separator }]}>
        <Text style={[type.caption, { color: native.secondaryLabel, textAlign: "center" }]}>
          Could not build a quiz for this card — check front and back text.
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <FlashcardMcqPrompt
        mcq={mcq}
        badge={`Quiz preview · ${activeIndex + 1}/${cards.length}`}
        variant="quiz"
        accentColor={accentColor}
      />
      <FlashcardMcqChoices mcq={mcq} previewCorrect />
      <View style={styles.nav}>
        <Pressable
          onPress={() => setIndex(activeIndex - 1)}
          disabled={activeIndex <= 0}
          style={[styles.navBtn, { opacity: activeIndex <= 0 ? 0.35 : 1 }]}
        >
          <Ionicons name="chevron-back" size={20} color={accent} />
        </Pressable>
        <Text style={[type.caption, { color: native.secondaryLabel }]}>
          Card {activeIndex + 1} of {cards.length}
        </Text>
        <Pressable
          onPress={() => setIndex(activeIndex + 1)}
          disabled={activeIndex >= cards.length - 1}
          style={[styles.navBtn, { opacity: activeIndex >= cards.length - 1 ? 0.35 : 1 }]}
        >
          <Ionicons name="chevron-forward" size={20} color={accent} />
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  empty: {
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: "dashed",
    borderRadius: NATIVE.sectionRadius,
    padding: 16,
  },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  navBtn: { padding: 8 },
})
