import { type ReactNode } from "react"
import { ActivityIndicator, KeyboardAvoidingView, Platform, RefreshControl, StyleSheet, Text, View } from "react-native"
import { ScrollView } from "react-native-gesture-handler"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useModuleScrollContentPadding, useChromeTopInset } from "../../context/ChromeInsetContext"
import { useModuleContentStyle } from "../../lib/responsive-layout"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { PillSwipeTabs } from "./PillSwipeTabs"
import type { MobbinPillSegmentOption } from "./MobbinPillSegmentControl"
import { DismissKeyboardView } from "../ui/DismissKeyboardView"
import { keyboardDismissScrollProps } from "../../lib/keyboard-dismiss-scroll-props"

type TabOption<T extends string> = MobbinPillSegmentOption<T>

type Props<T extends string> = {
  tabs: TabOption<T>[]
  tab: T
  onTabChange: (tab: T) => void
  pages: ReactNode[]
  chrome?: ReactNode
  loading?: boolean
  refreshing?: boolean
  onRefresh?: () => void
  error?: string
  pagePaddingHorizontal?: number
  /** Horizontally scroll the tab bar when there are many tabs. */
  scrollableTabs?: boolean
}

export function TabbedModuleLayout<T extends string>({
  tabs,
  tab,
  onTabChange,
  pages,
  chrome,
  loading,
  refreshing,
  onRefresh,
  error,
  pagePaddingHorizontal = NATIVE.pagePadding,
  scrollableTabs = false,
}: Props<T>) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const scrollPad = useModuleScrollContentPadding()
  const chromeTop = useChromeTopInset()
  const moduleContentStyle = useModuleContentStyle()
  const hasInlineChrome = Boolean(error) || Boolean(chrome)
  // Keep tab-strip clearance stable. Mounting dock-only search in `chrome` renders
  // nothing inline but used to flip paddingTop and shift the pills on tab change.
  const chromePaddingTop = chromeTop > 0 ? chromeTop + 4 : 6

  const pageScrollStyle = {
    paddingBottom: scrollPad.paddingBottom,
    flexGrow: 1 as const,
    ...moduleContentStyle,
  }

  function wrapPage(content: ReactNode) {
    if (loading && !refreshing) {
      return (
        <View style={styles.pageCenter}>
          <ActivityIndicator size="large" color={tokens.accent} />
          <Text style={[type.caption, { color: native.secondaryLabel }]}>Loading…</Text>
        </View>
      )
    }

    return (
      <ScrollView
        style={styles.pageScroll}
        contentContainerStyle={pageScrollStyle}
        showsVerticalScrollIndicator={false}
        {...keyboardDismissScrollProps}
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        directionalLockEnabled
        nestedScrollEnabled
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={tokens.accent} />
          ) : undefined
        }
      >
        <DismissKeyboardView>{content}</DismissKeyboardView>
      </ScrollView>
    )
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: native.groupedBackground }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={[
          styles.chrome,
          hasInlineChrome ? styles.chromeWithContent : styles.chromeTabsOnly,
          {
            paddingTop: chromePaddingTop,
            paddingHorizontal: NATIVE.pagePadding,
          },
        ]}
      >
        {error ? (
          <View style={[styles.errorBox, { backgroundColor: `${tokens.danger}18` }]}>
            <Text style={[type.destructive, styles.errorText]}>{error}</Text>
          </View>
        ) : null}
        {chrome}
      </View>

      <PillSwipeTabs
        options={tabs}
        value={tab}
        onChange={onTabChange}
        pagePaddingHorizontal={pagePaddingHorizontal}
        scrollable={scrollableTabs}
        visibleSegmentCount={scrollableTabs ? 3 : tabs.length}
        pages={pages.map((page) => wrapPage(page))}
      />
    </KeyboardAvoidingView>
  )
}

export const signatureListStyles = StyleSheet.create({
  list: {
    gap: 10,
    paddingTop: 4,
    paddingBottom: 8,
  },
  footer: {
    paddingTop: 4,
    paddingBottom: 8,
  },
})

const styles = StyleSheet.create({
  root: { flex: 1 },
  chrome: {},
  chromeWithContent: { gap: 12, paddingBottom: 4 },
  chromeTabsOnly: { gap: 0, paddingBottom: 0 },
  pageScroll: { flex: 1 },
  pageCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 48,
  },
  errorBox: { padding: 12, borderRadius: NATIVE.sectionRadius },
  errorText: { fontSize: 14, lineHeight: 20 },
})
