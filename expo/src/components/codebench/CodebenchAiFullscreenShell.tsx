import type { ReactNode } from "react"
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { CoraBrand } from "../cora/CoraBrand"
import { CoraThinkingIndicator } from "../ai-tutor/CoraThinkingIndicator"

type Props = {
  title: string
  subtitle?: string
  loading?: boolean
  onCollapse: () => void
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

export function CodebenchAiFullscreenShell({
  title,
  subtitle = "Full screen · tap collapse to return to the editor",
  loading = false,
  onCollapse,
  onClose,
  children,
  footer,
}: Props) {
  const native = useThemedNative()
  const type = useNativeType()
  const insets = useSafeAreaInsets()

  return (
    <Modal visible animationType="fade" statusBarTranslucent presentationStyle="fullScreen">
      <View style={[styles.host, { backgroundColor: native.secondaryGrouped }]}>
        <View
          style={[
            styles.frame,
            { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          <View style={styles.head}>
            <View style={styles.headBrand}>
              <CoraBrand size="sm" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[type.bodyEmphasis, { color: native.label }]}>{title}</Text>
              <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={2}>
                {loading ? "Cora is analyzing your code…" : subtitle}
              </Text>
            </View>
            <View style={styles.headActions}>
              <Pressable
                onPress={onCollapse}
                hitSlop={8}
                style={[styles.headBtn, { backgroundColor: native.fill }]}
                accessibilityLabel="Collapse AI assistant"
              >
                <Ionicons name="contract-outline" size={18} color={native.label} />
              </Pressable>
              <Pressable
                onPress={onClose}
                hitSlop={8}
                style={styles.headBtn}
                accessibilityLabel="Close AI assistant"
              >
                <Ionicons name="close" size={18} color={native.secondaryLabel} />
              </Pressable>
            </View>
          </View>

          {loading ? (
            <View style={styles.loading}>
              <CoraThinkingIndicator context="codebench" hideBrand />
            </View>
          ) : (
            <>
              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator
                keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
              >
                {children}
              </ScrollView>
              {footer ? <View style={styles.footer}>{footer}</View> : null}
            </>
          )}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
  },
  frame: {
    flex: 1,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
    flexShrink: 0,
  },
  headBrand: {
    flexShrink: 0,
    alignSelf: "flex-start",
    paddingTop: 2,
  },
  headActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  headBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingBottom: 16,
  },
  footer: {
    flexShrink: 0,
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  loading: {
    flex: 1,
    alignItems: "stretch",
    justifyContent: "flex-start",
    paddingHorizontal: 14,
    paddingTop: 8,
  },
})
