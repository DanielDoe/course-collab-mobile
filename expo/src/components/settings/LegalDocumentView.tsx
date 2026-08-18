import { Linking, Pressable, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import type { LegalDocument } from "../../content/legal/types"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useNativeType } from "../../lib/themed-module-theme"


function openEmail(address: string) {
  void Linking.openURL(`mailto:${address}`)
}

function RichParagraph({ text }: { text: string }) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.trim())

  if (isEmail) {
    return (
      <Pressable onPress={() => openEmail(text.trim())} accessibilityRole="link">
        <Text style={[type.body, styles.paragraph, { color: tokens.accent, fontWeight: "600" }]}>{text}</Text>
      </Pressable>
    )
  }

  return <Text style={[type.body, styles.paragraph, { color: native.secondaryLabel }]}>{text}</Text>
}

function LegalSectionCard({
  title,
  paragraphs,
  bullets,
}: {
  title: string
  paragraphs?: readonly string[]
  bullets?: readonly string[]
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  return (
    <View style={styles.sectionWrap}>
      <Text style={[type.sectionHeader, styles.sectionHeader, { color: native.secondaryLabel }]}>{title}</Text>
      <View
        style={[
          styles.card,
          tokens.cardShadow,
          { backgroundColor: native.secondaryGrouped, borderColor: native.separator },
        ]}
      >
        {paragraphs?.map((paragraph) => (
          <RichParagraph key={paragraph} text={paragraph} />
        ))}
        {bullets?.map((bullet) => (
          <View key={bullet} style={styles.bulletRow}>
            <Text style={[type.body, styles.bulletDot, { color: tokens.accent }]}>•</Text>
            <RichParagraph text={bullet} />
          </View>
        ))}
      </View>
    </View>
  )
}

type LegalDocumentViewProps = {
  document: LegalDocument
  footerAction?: { label: string; onPress: () => void }
}

export function LegalDocumentView({ document, footerAction }: LegalDocumentViewProps) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  return (
    <View style={styles.root}>
      <View style={[styles.metaCard, { backgroundColor: native.fill, borderColor: native.separator }]}>
        <Text style={[type.caption, { color: native.tertiaryLabel }]}>Last updated {document.updated}</Text>
        {document.intro ? (
          <Text style={[type.body, styles.intro, { color: native.secondaryLabel }]}>{document.intro}</Text>
        ) : null}
      </View>

      {document.sections.map((section) => (
        <LegalSectionCard
          key={section.title}
          title={section.title}
          paragraphs={section.paragraphs}
          bullets={section.bullets}
        />
      ))}

      {footerAction ? (
        <Pressable
          style={({ pressed }) => [
            styles.footerBtn,
            { backgroundColor: tokens.accent, opacity: pressed ? NATIVE.pressedOpacity : 1 },
          ]}
          onPress={footerAction.onPress}
          accessibilityRole="button"
        >
          <Text style={[type.bodyEmphasis, { color: "#FFFFFF" }]}>{footerAction.label}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

export function useLegalInAppRoute() {
  const router = useRouter()
  return {
    openPrivacy: () => router.push("/settings/legal/privacy" as never),
    openTerms: () => router.push("/settings/legal/terms" as never),
    openSupport: () => router.push("/settings/legal/support" as never),
    openAiData: () => router.push("/settings/ai-data" as never),
    openHelpCenter: () => router.push("/module/help-center" as never),
  }
}

const styles = StyleSheet.create({
  root: { gap: 20, paddingBottom: 24 },
  metaCard: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 8,
  },
  intro: { lineHeight: 22 },
  sectionWrap: { gap: 8 },
  sectionHeader: { paddingHorizontal: 4 },
  card: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 10,
  },
  paragraph: { lineHeight: 22 },
  bulletRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  bulletDot: { lineHeight: 22, width: 12 },
  footerBtn: {
    marginTop: 4,
    borderRadius: NATIVE.sectionRadius,
    paddingVertical: 14,
    alignItems: "center",
  },
})
