import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useMemo } from "react"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { useAppThemeTokens, useThemedNative } from "../../../context/AppearanceProvider"
import { useNativeType } from "../../../lib/themed-module-theme"
import { NATIVE } from "../../../constants/faculty-native-theme"
import {
  facultyCoraModuleRoute,
  isFacultyCoraRestrictedModule,
  type FacultyCoraCapabilityId,
} from "../../../lib/faculty-cora-config"
import { findFacultyNavItem } from "../../../constants/faculty-nav"
import { useFacultyCoraContext } from "../../../context/FacultyCoraContextProvider"
import { resolveFacultyCoraCapability } from "../../../lib/faculty-cora-context-store"
import { facultyCoraActionColors, facultyCoraCapabilityAccent, facultyCoraCardSurface, facultyCoraMaterialCardStyle, FACULTY_CORA_COLOR } from "../../../lib/faculty-cora-theme"
import { CoraBrand } from "../../cora/CoraBrand"
import { SolidListThumbTile } from "../../theme/SolidListThumbTile"
import { FacultySheetChrome, FacultySheetContainer } from "../faculty-collab-sheet-ui"
import { CommGroupedList, CommListRow } from "../faculty-communication-ui"

type Props = {
  visible: boolean
  capabilityId: FacultyCoraCapabilityId | null
  suggestedPrompt?: string
  onClose: () => void
  onStartChat: (capabilityId: FacultyCoraCapabilityId, prompt?: string) => void
}

export function FacultyCoraCapabilitySheet({
  visible,
  capabilityId,
  suggestedPrompt,
  onClose,
  onStartChat,
}: Props) {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const tokens = useAppThemeTokens()
  const coraAction = useMemo(() => facultyCoraActionColors(tokens), [tokens])
  const native = useThemedNative()
  const type = useNativeType()

  const { context } = useFacultyCoraContext()

  if (!capabilityId) return null
  const capability = resolveFacultyCoraCapability(capabilityId, context)
  const accent = facultyCoraCapabilityAccent(capabilityId)
  const cardBg = facultyCoraCardSurface(native.secondaryGrouped)
  const materialStyle = facultyCoraMaterialCardStyle(tokens.isDark, native.separator)
  const modules = capability.relatedModuleIds
    .filter((id) => !isFacultyCoraRestrictedModule(id))
    .slice(0, 6)

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer style={{ flex: 1, backgroundColor: native.groupedBackground }}>
        <FacultySheetChrome topInset={insets.top} title={`${capability.emoji} ${capability.label}`} onClose={onClose} />
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.heroStrip, materialStyle, { backgroundColor: cardBg }]}>
            <SolidListThumbTile thumb={accent.thumb} icon={capability.icon} size="list" />
            <View style={styles.heroCopy}>
              <Text style={[type.bodyEmphasis, { color: native.label }]}>{capability.label}</Text>
              <Text style={[type.caption, { color: native.secondaryLabel }]}>{capability.tagline}</Text>
            </View>
          </View>

          <Text style={[type.body, { color: native.secondaryLabel, lineHeight: 22 }]}>{capability.description}</Text>

          <Text style={[type.sectionHeader, styles.sectionLabel, { color: native.secondaryLabel }]}>
            Try asking
          </Text>
          <CommGroupedList>
            {capability.examplePrompts.map((prompt, index) => (
              <CommListRow
                key={prompt}
                title={prompt}
                titleLines={3}
                icon="chatbubble-outline"
                iconColor={accent.accent}
                iconSoft={accent.iconSoft(tokens.isDark)}
                onPress={() => {
                  onClose()
                  onStartChat(capabilityId, prompt)
                }}
                isLast={index === capability.examplePrompts.length - 1}
              />
            ))}
          </CommGroupedList>

          {modules.length > 0 ? (
            <>
              <Text style={[type.sectionHeader, styles.sectionLabel, { color: native.secondaryLabel }]}>
                Related modules
              </Text>
              <CommGroupedList>
                {modules.map((moduleId, index) => {
                  const nav = findFacultyNavItem(moduleId)
                  const label = nav?.label ?? moduleId.replace(/-/g, " ")
                  return (
                    <CommListRow
                      key={moduleId}
                      title={label}
                      icon={nav?.icon ?? "folder-outline"}
                      iconColor={FACULTY_CORA_COLOR.link}
                      iconSoft={accent.iconSoft(tokens.isDark)}
                      onPress={() => {
                        onClose()
                        router.push(facultyCoraModuleRoute(moduleId) as never)
                      }}
                      isLast={index === modules.length - 1}
                    />
                  )
                })}
              </CommGroupedList>
            </>
          ) : null}

          <Pressable
            onPress={() => {
              onClose()
              onStartChat(capabilityId, suggestedPrompt)
            }}
            style={[styles.primaryBtn, { backgroundColor: coraAction.background }]}
            accessibilityRole="button"
            accessibilityLabel={`Open chat with Cora for ${capability.label}`}
          >
            <Ionicons name="chatbubbles-outline" size={18} color={coraAction.ink} />
            <Text style={[type.bodyEmphasis, { color: coraAction.ink }]}>Open chat with</Text>
            <CoraBrand size="xs" variant="solid" color={coraAction.ink} />
          </Pressable>
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: NATIVE.pagePadding,
    paddingTop: 12,
    gap: 12,
  },
  heroStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
  },
  heroCopy: {
    flex: 1,
    gap: 2,
  },
  sectionLabel: {
    marginTop: 8,
    marginBottom: -4,
    paddingHorizontal: 4,
  },
  primaryBtn: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: NATIVE.sectionRadius,
  },
})
