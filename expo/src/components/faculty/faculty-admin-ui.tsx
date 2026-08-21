import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react"
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { MODERN, NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import {
  useChromeBottomInset,
  useChromeTopInset,
  useModuleScrollContentPadding,
} from "../../context/ChromeInsetContext"
import { useRouter } from "expo-router"
import { hasFacultyNavAccess } from "../../constants/faculty-nav"
import { useFacultyShell } from "../../context/FacultyShellContext"
import { useFacultyScope } from "../../hooks/useFacultyScope"
import { FACULTY_ADMIN_COLOR } from "../../lib/faculty-admin-theme"
import { getFacultyNavUpgradePrompt } from "../../lib/faculty-membership-tier"
import type { FacultyMembershipTier } from "../../types/dashboard"
import { solidListThumbFixed } from "../../lib/solid-list-thumb"
import { semanticSoft, useNativeType } from "../../lib/themed-module-theme"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { NativeSwitch } from "../NativeSwitch"
import { FacultyEmptyState } from "./faculty-shared"
import { AdminOptionPickerModal } from "./admin/admin-option-picker"

/**
 * Shared faculty administration UI — grouped canvas, inset lists, save footer.
 *
 * @see expo/docs/ios-native-module-design.md
 */

const SUCCESS_TOAST_MS = 2500

export type AdminStatItem = {
  label: string
  value: string
  icon?: keyof typeof Ionicons.glyphMap
  iconColor?: string
  iconBg?: string
}

export function useAdminStyles() {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  return useMemo(() => createAdminStyles(native, tokens, type), [native, tokens, type])
}

export function FacultyAdminCourseGate({ children }: { children: ReactNode }) {
  const { ready } = useFacultyScope()
  const scrollPad = useModuleScrollContentPadding(32)
  const { styles: moduleStyles } = useModuleTheme()

  if (!ready) {
    return (
      <View style={[moduleStyles.root, { flex: 1, justifyContent: "center" }, scrollPad]}>
        <FacultyEmptyState
          icon="book-outline"
          title="Select a Course"
          body="Choose a course from the drawer to manage settings for this module."
        />
      </View>
    )
  }

  return <>{children}</>
}

export function FacultyAdminTierGate({
  minTier,
  featureLabel,
  children,
}: {
  minTier: FacultyMembershipTier
  featureLabel: string
  children: ReactNode
}) {
  const router = useRouter()
  const { membershipTier, membershipTierLoaded } = useFacultyShell()
  const scrollPad = useModuleScrollContentPadding(32)
  const { styles: moduleStyles } = useModuleTheme()
  const adminStyles = useAdminStyles()

  if (!membershipTierLoaded) {
    return (
      <View style={[moduleStyles.root, { flex: 1, justifyContent: "center", alignItems: "center" }, scrollPad]}>
        <ActivityIndicator size="large" color={FACULTY_ADMIN_COLOR.link} />
      </View>
    )
  }

  if (!hasFacultyNavAccess(membershipTier, minTier)) {
    const prompt = getFacultyNavUpgradePrompt({ id: featureLabel, label: featureLabel, minTier }, membershipTier)
    return (
      <View style={[moduleStyles.root, adminStyles.screenRoot, scrollPad]}>
        <FacultyEmptyState icon="lock-closed-outline" title={prompt.title} body={prompt.message} />
        <Pressable
          style={({ pressed }) => [adminStyles.saveBtn, pressed && { opacity: NATIVE.pressedOpacity }]}
          onPress={() => router.push("/membership" as never)}
          accessibilityRole="button"
          accessibilityLabel={`Upgrade to ${minTier}`}
        >
          <Text style={adminStyles.saveBtnText}>Upgrade to {minTier}</Text>
        </Pressable>
      </View>
    )
  }

  return <>{children}</>
}

type FacultyAdminScreenProps = {
  title?: string
  loading?: boolean
  saving?: boolean
  refreshing?: boolean
  error?: string | null
  dirty?: boolean
  successMessage?: string | null
  onSave?: () => void
  onRefresh?: () => void
  children: ReactNode
  footerExtra?: ReactNode
}

export function FacultyAdminScreen({
  title,
  loading = false,
  saving = false,
  refreshing = false,
  error,
  dirty = false,
  successMessage,
  onSave,
  onRefresh,
  children,
  footerExtra,
}: FacultyAdminScreenProps) {
  const insets = useSafeAreaInsets()
  const chromeTop = useChromeTopInset()
  const chromeBottom = useChromeBottomInset()
  const { styles: moduleStyles } = useModuleTheme()
  const adminStyles = useAdminStyles()
  const { tokens } = adminStyles
  const showFooter = Boolean(footerExtra || (dirty && onSave))
  const footerBarHeight = showFooter ? 72 : 0
  const scrollPad = useModuleScrollContentPadding(footerBarHeight + 32)
  const toastTop = (chromeTop > 0 ? chromeTop : insets.top) + 8

  return (
    <View style={[moduleStyles.root, adminStyles.screenRoot]}>
      {successMessage ? (
        <View style={[adminStyles.successToast, { top: toastTop }]}>
          <Ionicons name="checkmark-circle" size={18} color={tokens.success} />
          <Text style={adminStyles.successToastText} numberOfLines={2}>
            {successMessage}
          </Text>
        </View>
      ) : null}

      <ScrollView
        style={[moduleStyles.scroll, adminStyles.screenScroll]}
        contentContainerStyle={[adminStyles.screenContent, scrollPad]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={FACULTY_ADMIN_COLOR.link} />
          ) : undefined
        }
      >
        {title ? <Text style={adminStyles.screenTitle}>{title}</Text> : null}

        {error ? (
          <View style={adminStyles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color={tokens.danger} />
            <Text style={adminStyles.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={adminStyles.loadingWrap}>
            <ActivityIndicator size="large" color={FACULTY_ADMIN_COLOR.link} />
          </View>
        ) : (
          children
        )}
      </ScrollView>

      {showFooter ? (
        <View style={[adminStyles.footer, { paddingBottom: insets.bottom + chromeBottom + 12 }]}>
          {footerExtra}
          {dirty && onSave ? (
            <Pressable
              style={[adminStyles.saveBtn, (saving || !dirty) && adminStyles.saveBtnDisabled]}
              onPress={onSave}
              disabled={saving || !dirty}
              accessibilityRole="button"
              accessibilityLabel="Save changes"
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={adminStyles.saveBtnText}>Save Changes</Text>
              )}
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

type FacultyAdminSectionProps = {
  title: string
  footer?: string
  children: ReactNode
}

export function FacultyAdminSection({ title, footer, children }: FacultyAdminSectionProps) {
  const adminStyles = useAdminStyles()
  const rows = Children.toArray(children)

  return (
    <View style={adminStyles.sectionWrap}>
      <Text style={adminStyles.sectionHeader}>{title}</Text>
      <View style={adminStyles.groupedList}>
        {rows.map((child, index) => {
          if (!isValidElement(child)) return child
          const isLast = index === rows.length - 1
          return cloneElement(child as ReactElement<{ isLast?: boolean }>, { isLast, key: child.key ?? index })
        })}
      </View>
      {footer ? <Text style={adminStyles.sectionFooter}>{footer}</Text> : null}
    </View>
  )
}

type RowProps = { isLast?: boolean }

export function FacultyAdminToggleRow({
  label,
  subtitle,
  value,
  onChange,
  disabled,
  isLast,
  activeTrackColor,
}: RowProps & {
  label: string
  subtitle?: string
  value: boolean
  disabled?: boolean
  onChange: (next: boolean) => void
  activeTrackColor?: string
}) {
  const adminStyles = useAdminStyles()

  return (
    <View style={[adminStyles.row, !isLast && adminStyles.rowBorder]}>
      <View style={adminStyles.rowCopy}>
        <Text style={adminStyles.rowLabel}>{label}</Text>
        {subtitle ? (
          <Text style={adminStyles.rowSubtitle} numberOfLines={3}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <NativeSwitch
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        activeTrackColor={activeTrackColor}
      />
    </View>
  )
}

export function FacultyAdminNumberField({
  label,
  value,
  onChangeText,
  onBlur,
  suffix,
  placeholder,
  isLast,
}: RowProps & {
  label: string
  value: string
  onChangeText: (text: string) => void
  onBlur?: () => void
  suffix?: string
  placeholder?: string
}) {
  const adminStyles = useAdminStyles()
  const { tokens } = adminStyles

  return (
    <View style={[adminStyles.row, !isLast && adminStyles.rowBorder]}>
      <Text style={[adminStyles.rowLabel, adminStyles.numberRowLabel]} numberOfLines={2}>
        {label}
      </Text>
      <View style={adminStyles.numberTrailing}>
        <TextInput
          style={adminStyles.numberInputInline}
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          accessibilityLabel={label}
          placeholderTextColor={adminStyles.placeholderColor}
          keyboardAppearance={tokens.isDark ? "dark" : "light"}
          textAlign="right"
        />
        {suffix ? <Text style={adminStyles.inputSuffixInline}>{suffix}</Text> : null}
      </View>
    </View>
  )
}

export function FacultyAdminTextField({
  label,
  value,
  onChangeText,
  multiline = false,
  placeholder,
  isLast,
}: RowProps & {
  label: string
  value: string
  onChangeText: (text: string) => void
  multiline?: boolean
  placeholder?: string
}) {
  const adminStyles = useAdminStyles()
  const { tokens } = adminStyles

  return (
    <View style={[adminStyles.fieldRow, !isLast && adminStyles.rowBorder]}>
      <Text style={adminStyles.fieldLabel}>{label}</Text>
      <TextInput
        style={[adminStyles.textInput, multiline && adminStyles.textInputMultiline]}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        placeholder={placeholder}
        placeholderTextColor={adminStyles.placeholderColor}
        keyboardAppearance={tokens.isDark ? "dark" : "light"}
      />
    </View>
  )
}

export function FacultyAdminChoiceField({
  label,
  value,
  options,
  onChange,
  disabled,
  isLast,
}: RowProps & {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const merged =
    value && !options.some((option) => option.value === value)
      ? [...options, { value, label: value }]
      : options
  const valueLabel = merged.find((option) => option.value === value)?.label ?? (value || "Select")

  return (
    <View>
      <FacultyAdminSelectRow
        label={label}
        valueLabel={valueLabel}
        onPress={() => {
          if (!disabled) setOpen(true)
        }}
        disabled={disabled}
        isLast={isLast}
      />
      <AdminOptionPickerModal
        visible={open}
        title={label}
        options={merged}
        value={value || merged[0]?.value || ""}
        onSelect={onChange}
        onClose={() => setOpen(false)}
      />
    </View>
  )
}

export function FacultyAdminSelectRow({
  label,
  valueLabel,
  onPress,
  disabled,
  isLast,
}: RowProps & {
  label: string
  valueLabel: string
  onPress: () => void
  disabled?: boolean
}) {
  const adminStyles = useAdminStyles()
  const native = useThemedNative()

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      android_ripple={{ color: native.fill }}
      style={({ pressed }) => [
        adminStyles.row,
        !isLast && adminStyles.rowBorder,
        pressed && !disabled && adminStyles.rowPressed,
        disabled && adminStyles.rowDisabled,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${valueLabel}`}
    >
      <Text style={adminStyles.rowLabel}>{label}</Text>
      <View style={adminStyles.selectTrailing}>
        <Text style={adminStyles.selectValue} numberOfLines={1}>
          {valueLabel}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} />
      </View>
    </Pressable>
  )
}

export function FacultyAdminStatRow({ stats }: { stats: AdminStatItem[] }) {
  const adminStyles = useAdminStyles()
  const items = stats.slice(0, 4)
  if (items.length === 0) return null

  return (
    <View style={adminStyles.statRow}>
      {items.map((stat) => {
        const iconColor = stat.iconColor ?? FACULTY_ADMIN_COLOR.link
        const thumb = solidListThumbFixed(iconColor)
        return (
          <View key={`${stat.label}-${stat.value}`} style={adminStyles.statChip}>
            <View style={adminStyles.statChipRow}>
              <View style={adminStyles.statCopy}>
                <Text style={adminStyles.statLabel} numberOfLines={1}>
                  {stat.label}
                </Text>
                <Text style={adminStyles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>
                  {stat.value}
                </Text>
              </View>
              {stat.icon ? (
                <View style={[adminStyles.statIconTile, { backgroundColor: thumb.fill }]}>
                  <Ionicons name={stat.icon} size={16} color={thumb.icon} />
                </View>
              ) : null}
            </View>
          </View>
        )
      })}
    </View>
  )
}

export function useAdminSaveState() {
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current)
    }
  }, [])

  const markDirty = useCallback(() => setDirty(true), [])
  const resetDirty = useCallback(() => setDirty(false), [])
  const clearError = useCallback(() => setError(""), [])

  const showSuccess = useCallback((message = "Saved") => {
    if (successTimer.current) clearTimeout(successTimer.current)
    setSuccessMessage(message)
    successTimer.current = setTimeout(() => setSuccessMessage(null), SUCCESS_TOAST_MS)
  }, [])

  const runSave = useCallback(
    async (saveFn: () => Promise<void>, options?: { successMessage?: string }) => {
      setSaving(true)
      setError("")
      try {
        await saveFn()
        setDirty(false)
        showSuccess(options?.successMessage ?? "Saved")
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save.")
      } finally {
        setSaving(false)
      }
    },
    [showSuccess],
  )

  return {
    dirty,
    saving,
    error,
    successMessage,
    setDirty,
    markDirty,
    resetDirty,
    setError,
    clearError,
    showSuccess,
    runSave,
  }
}

function createAdminStyles(
  native: ReturnType<typeof useThemedNative>,
  tokens: ReturnType<typeof useAppThemeTokens>,
  type: ReturnType<typeof useNativeType>,
) {
  return {
    ...StyleSheet.create({
      screenRoot: { flex: 1 },
      screenScroll: { flex: 1 },
      screenContent: {
        paddingHorizontal: NATIVE.pagePadding,
        gap: NATIVE.sectionGap,
      },
      screenTitle: {
        ...type.sheetTitle,
        fontSize: 28,
        lineHeight: 34,
        letterSpacing: Platform.OS === "ios" ? -0.6 : 0.15,
      },
      loadingWrap: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 48,
      },
      errorBanner: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
        backgroundColor: semanticSoft(tokens.danger, tokens.isDark),
        borderRadius: NATIVE.sectionRadius,
        padding: 14,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: `${tokens.danger}33`,
      },
      errorBannerText: {
        flex: 1,
        ...type.callout,
        fontWeight: "600",
        color: tokens.danger,
        lineHeight: 20,
      },
      successToast: {
        position: "absolute",
        left: NATIVE.pagePadding,
        right: NATIVE.pagePadding,
        zIndex: 20,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        borderRadius: NATIVE.sectionRadius,
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: native.secondaryGrouped,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: native.separator,
        ...tokens.cardShadow,
      },
      successToastText: {
        flex: 1,
        ...type.callout,
        fontWeight: "600",
        color: native.label,
      },
      footer: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: "row",
        gap: 10,
        paddingHorizontal: NATIVE.pagePadding,
        paddingTop: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: native.separator,
        backgroundColor: native.groupedBackground,
        ...tokens.cardShadow,
      },
      saveBtn: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: NATIVE.sectionRadius,
        paddingVertical: 14,
        minHeight: 48,
        backgroundColor: FACULTY_ADMIN_COLOR.action,
      },
      saveBtnDisabled: { opacity: 0.55 },
      saveBtnText: {
        ...type.bodyEmphasis,
        color: "#ffffff",
      },
      sectionWrap: { gap: 8 },
      sectionHeader: {
        ...type.sectionHeader,
        paddingHorizontal: 4,
        textTransform: "none",
      },
      sectionFooter: {
        ...type.caption,
        paddingHorizontal: 16,
        paddingTop: 4,
      },
      groupedList: {
        borderRadius: NATIVE.sectionRadius,
        overflow: "hidden",
        backgroundColor: native.secondaryGrouped,
      },
      row: {
        flexDirection: "row",
        alignItems: "center",
        minHeight: NATIVE.rowMinHeight,
        paddingVertical: 11,
        paddingHorizontal: 14,
        gap: 12,
        backgroundColor: native.secondaryGrouped,
      },
      rowBorder: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: native.separator,
      },
      rowPressed: { opacity: NATIVE.pressedOpacity },
      rowDisabled: { opacity: 0.45 },
      rowCopy: { flex: 1, gap: 2 },
      rowLabel: { ...type.body },
      rowSubtitle: { ...type.caption, lineHeight: 17 },
      selectTrailing: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        maxWidth: "55%",
      },
      selectValue: {
        ...type.secondary,
        fontSize: 15,
        flexShrink: 1,
        textAlign: "right",
      },
      fieldRow: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 8,
        backgroundColor: native.secondaryGrouped,
      },
      fieldLabel: {
        ...type.sectionHeader,
        textTransform: "none",
      },
      numberInputWrap: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
      },
      numberRowLabel: {
        flex: 1,
        paddingRight: 8,
      },
      numberTrailing: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 6,
        flexShrink: 0,
      },
      numberInput: {
        flex: 1,
        ...type.bodyEmphasis,
        fontSize: 15,
        color: native.label,
        paddingVertical: Platform.OS === "ios" ? 8 : 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        fontVariant: ["tabular-nums"],
        backgroundColor: native.fill,
        borderWidth: 1,
        borderColor: tokens.border,
        maxWidth: 120,
      },
      numberInputInline: {
        minWidth: 56,
        maxWidth: 72,
        ...type.bodyEmphasis,
        fontSize: 17,
        color: native.label,
        paddingVertical: Platform.OS === "ios" ? 4 : 2,
        paddingHorizontal: 8,
        borderRadius: 8,
        fontVariant: ["tabular-nums"],
        backgroundColor: native.fill,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: native.separator,
      },
      inputSuffix: {
        ...type.callout,
        fontWeight: "600",
      },
      inputSuffixInline: {
        ...type.callout,
        fontWeight: "600",
        color: native.secondaryLabel,
        minWidth: 28,
      },
      textInput: {
        ...type.body,
        fontSize: 15,
        color: native.label,
        paddingVertical: Platform.OS === "ios" ? 10 : 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        minHeight: 44,
        backgroundColor: native.fill,
        borderWidth: 1,
        borderColor: tokens.border,
      },
      textInputMultiline: {
        minHeight: 96,
        paddingTop: 10,
      },
      statRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
      },
      statChip: {
        flexGrow: 1,
        flexBasis: "47%",
        minWidth: 0,
        maxWidth: "100%",
        borderRadius: NATIVE.sectionRadius,
        padding: 12,
        backgroundColor: native.secondaryGrouped,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: native.separator,
        ...tokens.cardShadow,
      },
      statChipRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 8,
      },
      statCopy: { flex: 1, minWidth: 0, gap: 4 },
      statIconTile: {
        width: MODERN.metricIconSize,
        height: MODERN.metricIconSize,
        borderRadius: MODERN.metricIconRadius,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      },
      statLabel: { ...type.caption },
      statValue: {
        ...type.bodyEmphasis,
        fontSize: 15,
        lineHeight: 20,
        fontVariant: ["tabular-nums"],
      },
    }),
    placeholderColor: native.tertiaryLabel,
    native,
    tokens,
    type,
  }
}
