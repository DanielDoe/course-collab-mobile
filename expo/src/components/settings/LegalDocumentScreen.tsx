import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native"
import { NotetakerScreenHeader } from "../notetaker/NotetakerScreenHeader"
import { ModuleScreen } from "../modules/ModuleScreen"
import { LegalDocumentView } from "./LegalDocumentView"
import type { LegalDocumentId } from "../../content/legal/types"
import { useLegalDocument } from "../../hooks/useLegalDocument"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useNativeType } from "../../lib/themed-module-theme"

type LegalDocumentScreenProps = {
  docId: LegalDocumentId
  title: string
  footerAction?: { label: string; onPress: () => void }
}

export function LegalDocumentScreen({ docId, title, footerAction }: LegalDocumentScreenProps) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const { document, loading, error, source, refresh } = useLegalDocument(docId)

  return (
    <View style={[styles.screenRoot, { backgroundColor: native.groupedBackground }]}>
      <NotetakerScreenHeader title={title} fallbackHref="/settings/privacy-security" />
      <ModuleScreen disableTopInsetAdjustment>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={tokens.accent} />
          </View>
        ) : error || !document ? (
          <View style={[styles.errorCard, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
            <Text style={[type.body, { color: native.secondaryLabel }]}>
              {error ?? "This document could not be loaded."}
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.retryBtn,
                { backgroundColor: tokens.accent, opacity: pressed ? NATIVE.pressedOpacity : 1 },
              ]}
              onPress={refresh}
            >
              <Text style={[type.bodyEmphasis, { color: "#FFFFFF" }]}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {source === "fallback" || source === "cache" ? (
              <Text style={[type.caption, styles.sourceHint, { color: native.tertiaryLabel }]}>
                {source === "fallback"
                  ? "Showing bundled copy — connect to refresh from CourseCollab."
                  : "Showing cached copy — pull to refresh when online."}
              </Text>
            ) : null}
            <LegalDocumentView document={document} footerAction={footerAction} />
          </>
        )}
      </ModuleScreen>
    </View>
  )
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1 },
  centered: { paddingVertical: 48, alignItems: "center" },
  errorCard: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
  },
  retryBtn: {
    alignSelf: "flex-start",
    borderRadius: NATIVE.sectionRadius,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sourceHint: { marginBottom: 8, paddingHorizontal: 4 },
})
