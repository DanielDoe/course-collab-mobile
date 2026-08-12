import { useMemo } from "react"
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useStudentCoraContextValue } from "../../context/StudentCoraContextProvider"
import { type StudentCoraCapabilityId } from "../../lib/student-cora-config"
import { resolveStudentCoraCapability } from "../../lib/student-cora-context-store"
import {
  STUDENT_CORA_COLOR,
  studentCoraActionColors,
  studentCoraCardSurface,
  studentCoraMaterialCardStyle,
} from "../../lib/student-cora-theme"
import { coraHomeQuickActionThumb } from "../../lib/cora-home-theme"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"
import { CommGroupedList, CommListRow } from "../faculty/faculty-communication-ui"
import { FacultySheetChrome, FacultySheetContainer } from "../faculty/faculty-collab-sheet-ui"

type Props = {
  visible: boolean
  capabilityId: StudentCoraCapabilityId | null
  onClose: () => void
  onStart: (capabilityId: StudentCoraCapabilityId, prompt?: string) => void
}

export function StudentCoraCapabilitySheet({ visible, capabilityId, onClose, onStart }: Props) {
  const insets = useSafeAreaInsets()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const { context, capabilities } = useStudentCoraContextValue()
  const action = useMemo(() => studentCoraActionColors(tokens), [tokens])

  if (!capabilityId) return null

  const capability =
    capabilities.find((item) => item.id === capabilityId) ??
    resolveStudentCoraCapability(capabilityId, context)
  const index = capabilityId.length % 8
  const thumb = coraHomeQuickActionThumb(capabilityId, index)
  const cardBg = studentCoraCardSurface(native.secondaryGrouped)
  const materialStyle = studentCoraMaterialCardStyle(tokens.isDark, native.separator)

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer menuSheet style={{ flex: 1, backgroundColor: native.groupedBackground }}>
        <FacultySheetChrome topInset={insets.top} title={capability.label} onClose={onClose} />
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.heroStrip, materialStyle, { backgroundColor: cardBg }]}>
            <SolidListThumbTile thumb={thumb} icon={capability.icon} size="list" />
            <View style={styles.heroCopy}>
              <Text style={[type.bodyEmphasis, { color: native.label }]}>{capability.label}</Text>
              <Text style={[type.caption, { color: native.secondaryLabel }]}>{capability.tagline}</Text>
            </View>
          </View>

          <Text style={[type.body, { color: native.secondaryLabel, lineHeight: 22 }]}>{capability.description}</Text>

          {capability.examplePrompts.length > 0 ? (
            <>
              <Text style={[type.sectionHeader, styles.sectionLabel, { color: native.secondaryLabel }]}>
                Try asking
              </Text>
              <CommGroupedList>
                {capability.examplePrompts.map((prompt, promptIndex) => (
                  <CommListRow
                    key={prompt}
                    title={prompt}
                    icon="chatbubble-outline"
                    iconColor={STUDENT_CORA_COLOR.link}
                    iconSoft={`${STUDENT_CORA_COLOR.link}18`}
                    onPress={() => {
                      onClose()
                      onStart(capabilityId, prompt)
                    }}
                    isLast={promptIndex === capability.examplePrompts.length - 1}
                  />
                ))}
              </CommGroupedList>
            </>
          ) : null}

          <Pressable
            onPress={() => {
              onClose()
              onStart(capabilityId)
            }}
            style={({ pressed }) => [
              styles.primaryBtn,
              materialStyle,
              {
                backgroundColor: action.background,
                opacity: pressed ? NATIVE.pressedOpacity : 1,
              },
            ]}
          >
            <Text style={[type.bodyEmphasis, { color: action.ink }]}>Get started</Text>
          </Pressable>
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: {
    paddingHorizontal: NATIVE.pagePadding,
    paddingTop: 12,
    gap: 16,
  },
  heroStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    padding: 14,
  },
  heroCopy: { flex: 1, gap: 4 },
  sectionLabel: { paddingHorizontal: 4 },
  primaryBtn: {
    marginTop: 8,
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
})
