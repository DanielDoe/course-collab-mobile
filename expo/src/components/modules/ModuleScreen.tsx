import { useCallback, type ReactNode } from "react"
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useThemedNative } from "../../context/AppearanceProvider"
import { useChromeTopInset, useModuleScrollContentPadding } from "../../context/ChromeInsetContext"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useNativeType } from "../../lib/themed-module-theme"
import { solidListThumb, type SolidListThumb } from "../../lib/solid-list-thumb"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"
import { FacultyEmptyState } from "../faculty/faculty-shared"
import { AppErrorScreen } from "../errors/AppErrorScreen"

export const MODULE_PAGE_BG = NATIVE.groupedBackground

type Props = {
  children: ReactNode
  loading?: boolean
  refreshing?: boolean
  onRefresh?: () => void
  empty?: boolean
  emptyTitle?: string
  emptyBody?: string
  emptyIcon?: keyof typeof Ionicons.glyphMap
  /** Plain string or Error/ApiError — shown as a full custom error panel when set. */
  error?: unknown
  errorFeature?: string
  onRetryError?: () => void
  contentStyle?: StyleProp<ViewStyle>
  /** Prevent iOS ScrollView from re-applying top safe-area inset (immersive screens with custom header). */
  disableTopInsetAdjustment?: boolean
  /** Screen stacks its own header below the status bar (e.g. NotetakerScreenHeader). */
  stackedHeader?: boolean
}

export function ModuleScreen({
  children,
  loading,
  refreshing,
  onRefresh,
  empty,
  emptyTitle = "Nothing here yet",
  emptyBody,
  emptyIcon = "folder-open-outline",
  error,
  errorFeature,
  onRetryError,
  contentStyle,
  disableTopInsetAdjustment = false,
  stackedHeader = false,
}: Props) {
  const insets = useSafeAreaInsets()
  const native = useThemedNative()
  const chromeTop = useChromeTopInset()
  const scrollPad = useModuleScrollContentPadding()
  const type = useNativeType()
  const { height: windowHeight } = useWindowDimensions()
  const refreshEnabled = Boolean(onRefresh)
  const showBlockingLoad = Boolean(loading && refreshEnabled)
  const stackedHeaderOffset = stackedHeader ? 52 : 0

  const handleRefresh = useCallback(() => {
    if (!onRefresh) return
    void Promise.resolve(onRefresh())
  }, [onRefresh])

  if (loading && !refreshEnabled) {
    return (
      <View style={[styles.center, { paddingBottom: insets.bottom, backgroundColor: native.groupedBackground }]}>
        <ActivityIndicator size="large" color={native.tint} />
        <Text style={[type.caption, { color: native.secondaryLabel }]}>Loading…</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: native.groupedBackground }]}
      contentContainerStyle={[
        styles.content,
        scrollPad,
        contentStyle,
        refreshEnabled
          ? {
              minHeight: Math.max(
                windowHeight - insets.top - insets.bottom - stackedHeaderOffset,
                320,
              ),
            }
          : null,
      ]}
      contentInsetAdjustmentBehavior={
        disableTopInsetAdjustment || chromeTop > 0 ? "never" : "automatic"
      }
      automaticallyAdjustContentInsets={!disableTopInsetAdjustment}
      automaticallyAdjustsScrollIndicatorInsets={!disableTopInsetAdjustment}
      alwaysBounceVertical={refreshEnabled}
      overScrollMode={refreshEnabled ? "always" : undefined}
      refreshControl={
        refreshEnabled ? (
          <RefreshControl
            refreshing={Boolean(refreshing) || showBlockingLoad}
            onRefresh={handleRefresh}
            tintColor={native.tint}
            {...(chromeTop > 0 ? { progressViewOffset: chromeTop } : {})}
          />
        ) : undefined
      }
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {error ? (
        <AppErrorScreen
          error={typeof error === "string" ? new Error(error) : error}
          feature={errorFeature}
          onRetry={onRetryError ?? onRefresh}
          style={styles.errorScreen}
        />
      ) : showBlockingLoad ? (
        <View style={styles.inlineLoad}>
          <ActivityIndicator size="large" color={native.tint} />
          <Text style={[type.caption, { color: native.secondaryLabel }]}>Loading…</Text>
        </View>
      ) : empty ? (
        <FacultyEmptyState icon={emptyIcon} title={emptyTitle} body={emptyBody ?? ""} />
      ) : (
        children
      )}
    </ScrollView>
  )
}

export function ModuleSectionHeader({
  title,
  action,
  style,
}: {
  title: string
  action?: ReactNode
  style?: StyleProp<ViewStyle>
}) {
  const type = useNativeType()

  return (
    <View style={[styles.sectionHeaderRow, style]}>
      <Text style={[type.sectionHeader, styles.sectionHeader]}>{title}</Text>
      {action}
    </View>
  )
}

export function ModuleSection({
  title,
  children,
  footer,
  style,
}: {
  title?: string
  children: ReactNode
  footer?: string
  style?: StyleProp<ViewStyle>
}) {
  const native = useThemedNative()
  const type = useNativeType()

  return (
    <View style={style}>
      {title ? <ModuleSectionHeader title={title} /> : null}
      <View style={[styles.section, { backgroundColor: native.secondaryGrouped }]}>{children}</View>
      {footer ? (
        <Text style={[type.caption, styles.sectionFooter, { color: native.secondaryLabel }]}>{footer}</Text>
      ) : null}
    </View>
  )
}

/** @deprecated Prefer ModuleSection with inset grouped rows */
export function ModuleCard({
  title,
  subtitle,
  children,
}: {
  title?: string
  subtitle?: string
  children: ReactNode
}) {
  const type = useNativeType()

  return (
    <ModuleSection title={title}>
      {subtitle ? (
        <Text style={[type.caption, styles.cardSubtitle, { color: type.caption.color }]}>{subtitle}</Text>
      ) : null}
      {children}
    </ModuleSection>
  )
}

export function ModuleListRow({
  title,
  subtitle,
  meta,
  icon,
  iconBg,
  iconColor,
  thumbIndex,
  solidThumb: solidThumbProp,
  badge,
  trailing,
  onPress,
  onTrailingPress,
  last,
}: {
  title: string
  subtitle?: string
  meta?: string
  icon?: keyof typeof Ionicons.glyphMap
  iconBg?: string
  iconColor?: string
  /** Rotating solid Color Hunt tile — overrides iconBg/iconColor when set. */
  thumbIndex?: number
  /** Fixed solid Color Hunt tile — takes precedence over thumbIndex. */
  solidThumb?: SolidListThumb
  badge?: ReactNode
  trailing?: ReactNode
  onPress?: () => void
  onTrailingPress?: () => void
  last?: boolean
}) {
  const native = useThemedNative()
  const type = useNativeType()
  const solidThumb = solidThumbProp ?? (thumbIndex != null ? solidListThumb(thumbIndex) : null)

  const trailingNode =
    trailing ??
    (onPress || onTrailingPress ? (
      <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} />
    ) : null)

  const rowBody = (
    <>
      {icon ? (
        solidThumb ? (
          <SolidListThumbTile thumb={solidThumb} icon={icon} size="compact" />
        ) : (
          <View style={[styles.iconTile, iconBg ? { backgroundColor: iconBg } : { backgroundColor: native.fill }]}>
            <Ionicons name={icon} size={16} color={iconColor ?? native.accent} />
          </View>
        )
      ) : null}
      <View style={styles.listCopy}>
        <Text style={[styles.listTitle, { color: native.label }]} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[type.caption, styles.listSubtitle]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? <Text style={[type.footnote, styles.listMeta]}>{meta}</Text> : null}
      </View>
      {badge}
    </>
  )

  if (onPress && !onTrailingPress) {
    return (
      <Pressable
        style={({ pressed }) => [pressed && { opacity: NATIVE.pressedOpacity }]}
        onPress={onPress}
        android_ripple={Platform.OS === "android" ? { color: "rgba(128,128,128,0.12)" } : undefined}
      >
        <View
          style={[
            styles.listRow,
            { borderBottomColor: native.separator },
            last && styles.listRowLast,
          ]}
        >
          <View style={[styles.listRowMain, styles.listRowMainFull]}>{rowBody}</View>
          {trailingNode}
        </View>
      </Pressable>
    )
  }

  if (!onPress && !onTrailingPress) {
    return (
      <View
        style={[
          styles.listRow,
          { borderBottomColor: native.separator },
          last && styles.listRowLast,
        ]}
      >
        <View style={[styles.listRowMain, styles.listRowMainFull]}>{rowBody}</View>
        {trailingNode}
      </View>
    )
  }

  return (
    <View
      style={[
        styles.listRow,
        { borderBottomColor: native.separator },
        last && styles.listRowLast,
      ]}
    >
      {onPress ? (
        <Pressable
          style={({ pressed }) => [styles.listRowMain, pressed && { opacity: NATIVE.pressedOpacity }]}
          onPress={onPress}
          android_ripple={Platform.OS === "android" ? { color: "rgba(128,128,128,0.12)" } : undefined}
        >
          {rowBody}
        </Pressable>
      ) : (
        <View style={styles.listRowMain}>{rowBody}</View>
      )}
      {trailingNode && onTrailingPress ? (
        <Pressable
          style={({ pressed }) => [styles.listRowTrailing, pressed && { opacity: NATIVE.pressedOpacity }]}
          onPress={onTrailingPress}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`More about ${title}`}
        >
          {trailingNode}
        </Pressable>
      ) : (
        trailingNode
      )}
    </View>
  )
}

/**
 * Inline "Show more" footer row for lists that are sliced instead of virtualized.
 * ModuleScreen renders children inside a plain ScrollView, so long lists must be
 * paged rather than mounted in full.
 */
export function ModuleShowMoreRow({
  remaining,
  onPress,
  label,
  variant = "inset",
}: {
  remaining: number
  onPress: () => void
  label?: string
  /** "inset" sits at the bottom of a ModuleSection; "card" stands alone in a gapped list. */
  variant?: "inset" | "card"
}) {
  const native = useThemedNative()
  const type = useNativeType()

  if (remaining <= 0) return null

  const text = label ?? `Show ${remaining} more`

  return (
    <Pressable
      style={({ pressed }) => [
        styles.showMoreRow,
        variant === "card"
          ? {
              backgroundColor: native.secondaryGrouped,
              borderRadius: NATIVE.sectionRadius,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: native.separator,
            }
          : { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: native.separator },
        pressed && { opacity: NATIVE.pressedOpacity },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={text}
      android_ripple={Platform.OS === "android" ? { color: "rgba(128,128,128,0.12)" } : undefined}
    >
      <Text style={[type.caption, styles.showMoreText, { color: native.tint }]}>{text}</Text>
      <Ionicons name="chevron-down" size={15} color={native.tint} />
    </Pressable>
  )
}

/** @deprecated Prefer ModuleListRow */
export function ModuleRow({
  title,
  meta,
  badge,
}: {
  title: string
  meta?: string
  badge?: string
}) {
  return (
    <ModuleListRow
      title={title}
      meta={meta}
      trailing={
        badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : undefined
      }
    />
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: NATIVE.pagePadding, gap: 12, flexGrow: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  inlineLoad: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 48,
  },
  errorScreen: {
    flexGrow: 1,
    minHeight: 280,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  sectionHeader: {
    textTransform: "none",
  },
  sectionFooter: {
    marginTop: 8,
    paddingHorizontal: 2,
    lineHeight: 18,
  },
  section: {
    borderRadius: NATIVE.sectionRadius,
    overflow: "hidden",
  },
  cardSubtitle: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: NATIVE.rowMinHeight,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listRowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingLeft: 14,
    paddingVertical: 12,
    minWidth: 0,
  },
  listRowMainFull: {
    paddingRight: 14,
  },
  listRowTrailing: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  listRowLast: { borderBottomWidth: 0 },
  showMoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  showMoreText: { fontWeight: "600" },
  iconTile: {
    width: NATIVE.iconTileSize,
    height: NATIVE.iconTileSize,
    borderRadius: NATIVE.iconTileRadius,
    alignItems: "center",
    justifyContent: "center",
  },
  listCopy: { flex: 1, gap: 2, minWidth: 0 },
  listTitle: {
    fontSize: 15,
    fontWeight: NATIVE.titleWeight,
    letterSpacing: Platform.OS === "ios" ? -0.2 : 0,
    lineHeight: 20,
  },
  listSubtitle: { lineHeight: 18 },
  listMeta: {},
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: { fontSize: 11, fontWeight: "600" },
  openHint: { fontSize: 13, fontWeight: "600" },
})
