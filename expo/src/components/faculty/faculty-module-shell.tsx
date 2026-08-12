import { createContext, type ReactNode, useContext } from "react"
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native"
import { useId, useMemo } from "react"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { NATIVE, nativeType } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useModuleSearchDockRegistration,
  type ModuleSearchDockEntry,
} from "../../context/ModuleSearchDockContext"
import { useModuleScrollContentPadding, useChromeTopInset } from "../../context/ChromeInsetContext"
import { useNativeType, useThemedStudentNative } from "../../lib/themed-module-theme"
import type { InstructorSession } from "../../lib/instructor-api"
import { NativeCountBadge } from "./faculty-shared"
import {
  LiquidGlassSearchField,
  LiquidGlassSearchIconButton,
} from "../theme/LiquidGlassSearchField"
import { HorizontalScrollWithHints } from "../theme/HorizontalScrollWithHints"
import { useModuleTheme } from "../../lib/themed-module-shell"
import { useGlassChromeActive } from "../theme/GlassSurface"
import { GlassFilterOptionRow, GlassMenuList } from "../theme/GlassActionSheetMenu"
import { FacultySheetChrome, FacultySheetContainer } from "./faculty-collab-sheet-ui"
import { CleanPillTabBar } from "../theme/CleanPillTabs"
import { FACULTY_COLLAB_COLOR } from "../../lib/faculty-collab-theme"
import { semanticSoft } from "../../lib/themed-module-theme"

/** @deprecated Use useFacultyPageBg() — static value is light-mode only. */
export const FACULTY_PAGE_BG = NATIVE.groupedBackground

/** @deprecated Use useFacultyCardShadow() — static value is light-mode only. */
export const FACULTY_CARD_SHADOW = NATIVE.raisedShadow

export function useFacultyPageBg(): string {
  const native = useThemedNative()
  return native.groupedBackground
}

export function useFacultyCardShadow() {
  const tokens = useAppThemeTokens()
  return tokens.cardShadow
}

/** Scroll padding for faculty module lists when top bar / bottom search dock float over content. */
export function useFacultyModuleScrollPadding(extraBottom = 24, extraTop?: number) {
  return useModuleScrollContentPadding(extraBottom, extraTop)
}

/**
 * When tabs or a header band sit outside the ScrollView, apply floating chrome inset on
 * the sticky zone only — not again on the list (avoids a large empty gap before cards).
 */
export function useFacultyStickyHeaderScrollLayout(options?: {
  extraBottom?: number
  listTopGap?: number
  stickyTopGap?: number
}) {
  const { extraBottom = 24, listTopGap = 12, stickyTopGap = 10 } = options ?? {}
  const chromeTop = useChromeTopInset()
  const scrollPad = useFacultyModuleScrollPadding(extraBottom)
  const chromeSpacer = chromeTop > 0 ? chromeTop + stickyTopGap : stickyTopGap + 2
  const stickyHeaderStyle = { height: chromeSpacer }
  const listScrollPad = { ...scrollPad, paddingTop: listTopGap }
  return { chromeTop, scrollPad, stickyHeaderStyle, listScrollPad, chromeSpacer }
}

const ModuleStickyHeaderContext = createContext(false)

export function useModuleStickyHeaderContext(): boolean {
  return useContext(ModuleStickyHeaderContext)
}

/** Pins module tabs, search, and header actions below floating Liquid Glass top chrome. */
export function FacultyModuleStickyHeader({
  children,
  style,
  bordered = true,
}: {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  bordered?: boolean
}) {
  const native = useThemedNative()
  const { chromeSpacer } = useFacultyStickyHeaderScrollLayout()
  return (
    <ModuleStickyHeaderContext.Provider value={true}>
      <View
        style={[
          shellStyles.stickyModuleHeader,
          {
            paddingTop: chromeSpacer,
            backgroundColor: native.groupedBackground,
            borderBottomColor: native.separator,
            borderBottomWidth: bordered ? StyleSheet.hairlineWidth : 0,
            zIndex: 10,
          },
          style,
        ]}
      >
        {children}
      </View>
    </ModuleStickyHeaderContext.Provider>
  )
}

export type FacultyFilterOption = { value: string; label: string }

export type FacultyStatBadgeTone = "green" | "violet" | "blue" | "amber"

export function FacultyStatCard({
  icon,
  iconBg,
  iconColor,
  value,
  label,
  badge,
  badgeTone = "green"}: {
  icon: keyof typeof Ionicons.glyphMap
  iconBg: string
  iconColor: string
  value: string
  label: string
  badge?: string
  badgeTone?: FacultyStatBadgeTone
}) {
  const native = useThemedNative()
  const type = useNativeType()
  const tokens = useAppThemeTokens()
  const badgeStyles = {
    green: { bg: `${tokens.success}18`, text: tokens.success },
    violet: { bg: `${tokens.accent}18`, text: tokens.accent },
    blue: { bg: `${tokens.accent}14`, text: tokens.accentHover },
    amber: { bg: `${tokens.warning}18`, text: tokens.warning }}[badgeTone]

  return (
    <View
      style={[
        shellStyles.statCard,
        tokens.cardShadow,
        { backgroundColor: native.fill, borderColor: native.separator, borderWidth: StyleSheet.hairlineWidth },
      ]}
    >
      <View style={[shellStyles.statIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <Text style={[type.bodyEmphasis, shellStyles.statValue]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[type.caption, shellStyles.statLabel]}>{label}</Text>
      {badge ? (
        <View style={[shellStyles.statBadge, { backgroundColor: badgeStyles.bg }]}>
          <Text style={[shellStyles.statBadgeText, { color: badgeStyles.text }]}>{badge}</Text>
        </View>
      ) : null}
    </View>
  )
}

export function FacultyStatRow({ children }: { children: ReactNode }) {
  return <View style={shellStyles.statRow}>{children}</View>
}

export function FacultyInsightBanner({
  title,
  message,
  icon = "analytics-outline"}: {
  title: string
  message: string
  icon?: keyof typeof Ionicons.glyphMap
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  return (
    <View style={[shellStyles.insightBanner, { backgroundColor: native.secondaryGrouped }]}>
      <View style={[shellStyles.insightIcon, { backgroundColor: native.fill }]}>
        <Ionicons name={icon} size={18} color={tokens.accent} />
      </View>
      <View style={shellStyles.insightCopy}>
        <Text style={[type.bodyEmphasis, shellStyles.insightTitle]}>{title}</Text>
        <Text style={[type.secondary, shellStyles.insightSub]}>{message}</Text>
      </View>
      <View style={[shellStyles.insightArrow, { backgroundColor: native.fill }]}>
        <Ionicons name="arrow-up-outline" size={16} color={tokens.accent} />
      </View>
    </View>
  )
}

export function FacultyFilterChip({
  label,
  active,
  onPress}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  const native = useThemedNative()
  return (
    <Pressable
      style={[
        shellStyles.chip,
        { backgroundColor: active ? native.fill : native.secondaryGrouped },
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          shellStyles.chipText,
          { color: active ? native.label : native.secondaryLabel },
          active && shellStyles.chipTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  )
}

export function FacultyFilterBar({
  options,
  value,
  onChange,
  onOpenFilter,
  showAllChip = true,
  allLabel = "All",
  allValue = "ALL"}: {
  options: FacultyFilterOption[]
  value: string
  onChange: (value: string) => void
  onOpenFilter: () => void
  showAllChip?: boolean
  allLabel?: string
  allValue?: string
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const filterActive = value !== allValue

  return (
    <View style={shellStyles.filterRow}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={shellStyles.filterScroll}
        contentContainerStyle={shellStyles.chipRow}
      >
        {showAllChip ? (
          <FacultyFilterChip label={allLabel} active={value === allValue} onPress={() => onChange(allValue)} />
        ) : null}
        {options.map((opt, index) => (
          <FacultyFilterChip
            key={`${opt.value}-${index}`}
            label={opt.label}
            active={value === opt.value}
            onPress={() => onChange(opt.value)}
          />
        ))}
      </ScrollView>
      <Pressable
        style={[
          shellStyles.filterBtn,
          { backgroundColor: filterActive ? native.fill : native.secondaryGrouped },
          tokens.cardShadow,
        ]}
        onPress={onOpenFilter}
        accessibilityRole="button"
        accessibilityLabel="Open filter"
      >
        <Ionicons
          name="funnel-outline"
          size={18}
          color={filterActive ? tokens.accentDark : native.secondaryLabel}
        />
      </Pressable>
    </View>
  )
}

export function FacultySectionFilterBar({
  sections,
  value,
  onChange,
  onOpenFilter}: {
  sections: InstructorSession[]
  value: string
  onChange: (code: string) => void
  onOpenFilter: () => void
}) {
  const uniqueSections = sections.filter(
    (session, index, list) => list.findIndex((row) => row.code === session.code) === index,
  )
  return (
    <FacultyFilterBar
      options={uniqueSections.map((s) => ({ value: s.code, label: s.code }))}
      value={value}
      onChange={onChange}
      onOpenFilter={onOpenFilter}
      showAllChip
      allLabel="All"
    />
  )
}

export function FacultyFilterSheet({
  visible,
  title,
  subtitle,
  options,
  value,
  onSelect,
  onClose}: {
  visible: boolean
  title: string
  subtitle?: string
  options: FacultyFilterOption[]
  value: string
  onSelect: (value: string) => void
  onClose: () => void
}) {
  const insets = useSafeAreaInsets()
  const native = useThemedNative()
  const type = useNativeType()

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer style={shellStyles.filterSheet}>
        <FacultySheetChrome topInset={insets.top} title={title} onClose={onClose} />
        {subtitle ? (
          <Text style={[type.secondary, shellStyles.filterSheetSub, { color: native.secondaryLabel }]}>
            {subtitle}
          </Text>
        ) : null}
        <ScrollView
          contentContainerStyle={[shellStyles.filterSheetList, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <GlassMenuList>
            {options.map((opt, index) => (
              <GlassFilterOptionRow
                key={opt.value}
                label={opt.label}
                active={value === opt.value}
                onPress={() => onSelect(opt.value)}
                showSeparator={index < options.length - 1}
              />
            ))}
          </GlassMenuList>
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}

export function sectionFilterSheetOptions(sections: InstructorSession[]): FacultyFilterOption[] {
  return [
    { value: "ALL", label: "All sections" },
    ...sections.map((s) => ({
      value: String(s.id),
      label: s.description && s.description !== s.code ? `${s.code} · ${s.description}` : s.code})),
  ]
}

/** Resolve a section filter value (session id or legacy code) to a session code for APIs. */
export function resolveSessionFilterCode(
  sections: InstructorSession[],
  filter: string,
): string | undefined {
  if (filter === "ALL") return undefined
  const byId = sections.find((s) => String(s.id) === filter)
  if (byId) return byId.code
  return filter
}

export function sessionFilterDisplayLabel(sections: InstructorSession[], filter: string): string {
  if (filter === "ALL") return "All sections"
  const session = sections.find((s) => String(s.id) === filter || s.code === filter)
  return session ? `Section ${session.code}` : `Section ${filter}`
}

export type FacultyModuleTabItem<T extends string> = {
  id: T
  label: string
  icon?: keyof typeof Ionicons.glyphMap
  count?: number
}

/**
 * Signature faculty module tabs — underline rail with indigo active marker.
 * Used across Groups, Projects, Flashcards, Summer Camp, and all faculty modules.
 */
export function FacultySignatureTabBar<T extends string>({
  tabs,
  tab,
  onChange,
  scrollable = true,
  embedded = false,
}: {
  tabs: FacultyModuleTabItem<T>[]
  tab: T
  onChange: (tab: T) => void
  scrollable?: boolean
  embedded?: boolean
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const accent = FACULTY_COLLAB_COLOR.tabActive

  const content = tabs.map((item) => {
    const active = item.id === tab
    const showCount = item.count != null && item.count > 0

    return (
      <Pressable
        key={item.id}
        style={({ pressed }) => [
          shellStyles.signatureTab,
          active && { borderBottomColor: accent },
          pressed && { opacity: NATIVE.pressedOpacity },
        ]}
        onPress={() => onChange(item.id)}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
      >
        {item.icon ? (
          <Ionicons name={item.icon} size={17} color={active ? accent : native.tertiaryLabel} />
        ) : null}
        <Text
          style={[
            type.caption,
            shellStyles.signatureTabLabel,
            { color: active ? native.label : native.secondaryLabel },
            active && shellStyles.signatureTabLabelActive,
          ]}
          numberOfLines={1}
        >
          {item.label}
        </Text>
        {showCount ? (
          <View
            style={[
              shellStyles.signatureTabCount,
              { backgroundColor: semanticSoft(FACULTY_COLLAB_COLOR.nudge, tokens.isDark) },
            ]}
          >
            <Text style={[type.footnote, shellStyles.signatureTabCountText, { color: FACULTY_COLLAB_COLOR.nudge }]}>
              {item.count}
            </Text>
          </View>
        ) : null}
      </Pressable>
    )
  })

  return (
    <View
      style={[
        embedded ? shellStyles.signatureTabWrapEmbedded : shellStyles.signatureTabWrap,
        { borderBottomColor: native.separator },
      ]}
      accessibilityRole="tablist"
    >
      {scrollable ? (
        <HorizontalScrollWithHints showHints={tabs.length > 4} contentContainerStyle={shellStyles.signatureTabScroll}>
          {content}
        </HorizontalScrollWithHints>
      ) : (
        <View style={shellStyles.signatureTabRow}>{content}</View>
      )}
    </View>
  )
}

export function FacultyModuleTabBar<T extends string>({
  tabs,
  tab,
  onChange,
  scrollable,
  theme = "faculty",
  embedded,
}: {
  tabs: FacultyModuleTabItem<T>[]
  tab: T
  onChange: (tab: T) => void
  scrollable?: boolean
  theme?: "faculty" | "student"
  /** Tighter insets when rendered inside FacultyModuleStickyHeader. */
  embedded?: boolean
}) {
  const stickyEmbedded = useModuleStickyHeaderContext()
  if (theme === "student") {
    return (
      <CleanPillTabBar
        tabs={tabs}
        value={tab}
        onChange={onChange}
        scrollable={scrollable ?? true}
        theme="student"
        embedded={embedded ?? stickyEmbedded}
      />
    )
  }
  return (
    <FacultySignatureTabBar
      tabs={tabs}
      tab={tab}
      onChange={onChange}
      scrollable={scrollable ?? tabs.length > 3}
      embedded={embedded ?? stickyEmbedded}
    />
  )
}

/** @deprecated Prefer FacultyModuleTabBar — same signature underline tabs. */
export function FacultyUnderlineTabBar<T extends string>({
  tabs,
  tab,
  onChange,
}: {
  tabs: Array<{ id: T; label: string; count?: number; icon?: keyof typeof Ionicons.glyphMap }>
  tab: T
  onChange: (tab: T) => void
}) {
  return (
    <FacultySignatureTabBar
      tabs={tabs}
      tab={tab}
      onChange={onChange}
      scrollable={tabs.length > 3}
    />
  )
}

/** Primary module segment switcher — signature underline tabs on faculty. */
export function FacultySegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: Array<{ id: T; label: string; icon?: keyof typeof Ionicons.glyphMap }>
}) {
  return (
    <FacultySignatureTabBar
      tabs={options}
      tab={value}
      onChange={onChange}
      scrollable={options.length > 3}
    />
  )
}

/** Primary module segment switcher — signature tabs on faculty, pills on student. */
export function FacultyAdaptiveSegmentNav<T extends string>({
  tabs,
  tab,
  onChange,
  theme = "faculty",
}: {
  tabs: FacultyModuleTabItem<T>[]
  tab: T
  onChange: (tab: T) => void
  theme?: "faculty" | "student"
}) {
  return (
    <FacultyModuleTabBar
      tabs={tabs}
      tab={tab}
      onChange={onChange}
      scrollable={tabs.length > 3}
      theme={theme}
    />
  )
}

export type FacultyModuleSearchProps = {
  value: string
  onChange: (v: string) => void
  placeholder: string
  placement?: "dock" | "inline"
  embedded?: boolean
}

export function FacultyModuleSearch({ placement = "dock", embedded, ...props }: FacultyModuleSearchProps) {
  const dockId = useId()
  const dockEntry = useMemo<ModuleSearchDockEntry | null>(() => {
    if (placement !== "dock") return null
    return { kind: "faculty-search", props: { ...props, placement: "dock" } }
  }, [placement, props.value, props.onChange, props.placeholder])
  useModuleSearchDockRegistration(dockId, dockEntry)
  if (placement === "dock") return null
  return <FacultyModuleSearchInner {...props} embedded={embedded} placement={placement} />
}

export function FacultyModuleSearchInner({
  value,
  onChange,
  placeholder,
  embedded = false,
  placement = "dock",
}: FacultyModuleSearchProps) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const glassActive = useGlassChromeActive()
  const useGlassField = (embedded || glassActive) && placement !== "inline"

  if (useGlassField) {
    return (
      <LiquidGlassSearchField
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    )
  }

  return (
    <View
      style={[
        shellStyles.searchBox,
        tokens.cardShadow,
        {
          backgroundColor: native.secondaryGrouped,
          borderColor: tokens.border,
          borderWidth: StyleSheet.hairlineWidth,
        },
      ]}
    >
      <Ionicons name="search-outline" size={18} color={native.tertiaryLabel} />
      <TextInput
        style={[shellStyles.searchInput, { color: native.label }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={native.tertiaryLabel}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  )
}

export type FacultySearchToolbarProps = {
  value: string
  onChange: (v: string) => void
  placeholder: string
  filterActive?: boolean
  onOpenFilter?: () => void
  showFilter?: boolean
  showSearch?: boolean
  filterLabel?: string
  trailingAction?: {
    onPress: () => void
    accessibilityLabel: string
    icon?: keyof typeof Ionicons.glyphMap
    badgeCount?: number
  }
  placement?: "dock" | "inline"
  embedded?: boolean
}

/** Search + optional filter button — Liquid Glass dock at bottom by default. */
export function FacultySearchToolbar({ placement = "dock", embedded, ...props }: FacultySearchToolbarProps) {
  const dockId = useId()
  const dockEntry = useMemo<ModuleSearchDockEntry | null>(() => {
    if (placement !== "dock") return null
    return { kind: "faculty-toolbar", props: { ...props, placement: "dock" } }
  }, [
    placement,
    props.value,
    props.onChange,
    props.placeholder,
    props.filterActive,
    props.onOpenFilter,
    props.showFilter,
    props.showSearch,
    props.filterLabel,
    props.trailingAction,
  ])
  useModuleSearchDockRegistration(dockId, dockEntry)
  if (placement === "dock") return null
  return <FacultySearchToolbarInner {...props} embedded={embedded} placement={placement} />
}

export function FacultySearchToolbarInner({
  value,
  onChange,
  placeholder,
  filterActive = false,
  onOpenFilter,
  showFilter = true,
  showSearch = true,
  filterLabel,
  trailingAction,
  embedded = false,
  placement = "dock",
}: FacultySearchToolbarProps) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const glassActive = useGlassChromeActive()
  const facultyAccent = FACULTY_COLLAB_COLOR.link
  const useGlassField = (embedded || glassActive) && placement !== "inline"

  if (useGlassField) {
    const trailing = (
      <>
        {showFilter && onOpenFilter ? (
          <LiquidGlassSearchIconButton
            icon="filter-outline"
            onPress={onOpenFilter}
            accessibilityLabel="Open filters"
            active={filterActive}
            accentColor={facultyAccent}
          />
        ) : null}
        {trailingAction ? (
          <View style={shellStyles.toolbarTrailingWrap}>
            <LiquidGlassSearchIconButton
              icon={trailingAction.icon ?? "add"}
              onPress={trailingAction.onPress}
              accessibilityLabel={trailingAction.accessibilityLabel}
              accentColor={facultyAccent}
            />
            {trailingAction.badgeCount != null && trailingAction.badgeCount > 0 ? (
              <NativeCountBadge
                count={trailingAction.badgeCount}
                variant="overlay"
                borderColor="transparent"
              />
            ) : null}
          </View>
        ) : null}
      </>
    )

    if (!showSearch && showFilter && onOpenFilter) {
      return (
        <LiquidGlassSearchField
          placeholder={placeholder}
          value=""
          onChange={() => {}}
          accentColor={facultyAccent}
          filterOnly={
            <Pressable
              style={shellStyles.filterOnlyInner}
              onPress={onOpenFilter}
              accessibilityRole="button"
              accessibilityLabel="Open filters"
            >
              <Ionicons
                name="filter-outline"
                size={18}
                color={filterActive ? facultyAccent : native.secondaryLabel}
              />
              <Text
                style={[
                  shellStyles.filterOnlyLabel,
                  { color: filterActive ? native.label : native.secondaryLabel },
                  filterActive && { fontWeight: "600" },
                ]}
                numberOfLines={1}
              >
                {filterLabel ?? "Filters"}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={native.tertiaryLabel}
                style={shellStyles.filterOnlyChevron}
              />
            </Pressable>
          }
          trailing={trailing}
        />
      )
    }

    return (
      <LiquidGlassSearchField
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        trailing={trailing}
        accentColor={facultyAccent}
      />
    )
  }

  const toolbarStyle = [
    shellStyles.searchToolbar,
    tokens.cardShadow,
    {
      backgroundColor: native.secondaryGrouped,
      borderColor: tokens.border,
      borderWidth: StyleSheet.hairlineWidth,
    },
  ]

  if (!showSearch && showFilter && onOpenFilter) {
    return (
      <View style={toolbarStyle}>
        <Pressable
          style={shellStyles.filterOnlyInner}
          onPress={onOpenFilter}
          accessibilityRole="button"
          accessibilityLabel="Open filters"
        >
          <Ionicons
            name="filter-outline"
            size={18}
            color={filterActive ? facultyAccent : native.secondaryLabel}
          />
          <Text
            style={[
              shellStyles.filterOnlyLabel,
              { color: filterActive ? native.label : native.secondaryLabel },
              filterActive && { fontWeight: "600" },
            ]}
            numberOfLines={1}
          >
            {filterLabel ?? "Filters"}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={native.tertiaryLabel} style={shellStyles.filterOnlyChevron} />
        </Pressable>
        {trailingAction ? (
          <View style={shellStyles.toolbarTrailingWrap}>
            <Pressable
              style={[shellStyles.toolbarFilterBtn, shellStyles.toolbarAddBtn, { backgroundColor: native.fill }]}
              onPress={trailingAction.onPress}
              accessibilityRole="button"
              accessibilityLabel={trailingAction.accessibilityLabel}
            >
              <Ionicons name={trailingAction.icon ?? "add"} size={20} color={facultyAccent} />
            </Pressable>
            {trailingAction.badgeCount != null && trailingAction.badgeCount > 0 ? (
              <NativeCountBadge
                count={trailingAction.badgeCount}
                variant="overlay"
                borderColor={native.secondaryGrouped}
              />
            ) : null}
          </View>
        ) : null}
      </View>
    )
  }

  return (
    <View style={toolbarStyle}>
      {showSearch ? (
        <>
          <Ionicons name="search-outline" size={18} color={native.tertiaryLabel} />
          <TextInput
            style={[shellStyles.searchInput, { color: native.label }]}
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor={native.tertiaryLabel}
            autoCapitalize="none"
            autoCorrect={false}
            selectionColor={facultyAccent}
          />
        </>
      ) : null}
      {showFilter && onOpenFilter ? (
        <Pressable
          style={[
            shellStyles.toolbarFilterBtn,
            filterActive && { backgroundColor: native.fill },
          ]}
          onPress={onOpenFilter}
          accessibilityRole="button"
          accessibilityLabel="Open filters"
        >
          <Ionicons
            name="filter-outline"
            size={18}
            color={filterActive ? facultyAccent : native.secondaryLabel}
          />
        </Pressable>
      ) : null}
      {trailingAction ? (
        <View style={shellStyles.toolbarTrailingWrap}>
          <Pressable
            style={[shellStyles.toolbarFilterBtn, shellStyles.toolbarAddBtn, { backgroundColor: native.fill }]}
            onPress={trailingAction.onPress}
            accessibilityRole="button"
            accessibilityLabel={trailingAction.accessibilityLabel}
          >
            <Ionicons name={trailingAction.icon ?? "add"} size={20} color={facultyAccent} />
          </Pressable>
          {trailingAction.badgeCount != null && trailingAction.badgeCount > 0 ? (
            <NativeCountBadge
              count={trailingAction.badgeCount}
              variant="overlay"
              borderColor={native.secondaryGrouped}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

export type FacultyFilterGroup = {
  id: string
  title: string
  value: string
  options: FacultyFilterOption[]
}

export function FacultyGroupedFilterSheet({
  visible,
  title,
  subtitle,
  groups,
  onSelect,
  onClose}: {
  visible: boolean
  title: string
  subtitle?: string
  groups: FacultyFilterGroup[]
  onSelect: (groupId: string, value: string) => void
  onClose: () => void
}) {
  const insets = useSafeAreaInsets()
  const native = useThemedNative()
  const type = useNativeType()

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer style={shellStyles.filterSheet}>
        <FacultySheetChrome topInset={insets.top} title={title} onClose={onClose} />
        {subtitle ? (
          <Text style={[type.secondary, shellStyles.filterSheetSub, { color: native.secondaryLabel }]}>
            {subtitle}
          </Text>
        ) : null}
        <ScrollView
          contentContainerStyle={[shellStyles.groupedFilterList, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {groups.map((group) => (
            <View key={group.id} style={shellStyles.filterGroup}>
              <Text style={[type.sectionHeader, shellStyles.filterGroupTitle, { color: native.secondaryLabel }]}>
                {group.title}
              </Text>
              <GlassMenuList>
                {group.options.map((opt, index) => (
                  <GlassFilterOptionRow
                    key={`${group.id}-${opt.value}`}
                    label={opt.label}
                    active={group.value === opt.value}
                    onPress={() => onSelect(group.id, opt.value)}
                    showSeparator={index < group.options.length - 1}
                  />
                ))}
              </GlassMenuList>
            </View>
          ))}
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}

const shellStyles = StyleSheet.create({
  statRow: { flexDirection: "row", gap: 8 },
  statCard: {
    flex: 1,
    borderRadius: NATIVE.sectionRadius,
    padding: 12,
    alignItems: "center",
    gap: 6,
    minHeight: 112},
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center"},
  statValue: {
    fontSize: 17,
    letterSpacing: NATIVE.titleTracking},
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: -0.08},
  statBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginTop: 2 },
  statBadgeText: { fontSize: 10, fontWeight: "700" },
  insightBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: NATIVE.sectionRadius,
    padding: 14},
  insightIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"},
  insightCopy: { flex: 1, gap: 2 },
  insightTitle: {
    letterSpacing: -0.2},
  insightSub: {
    lineHeight: 17},
  insightArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"},
  filterRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  filterScroll: { flex: 1 },
  chipRow: { flexDirection: "row", gap: 8, paddingVertical: 2, paddingRight: 4 },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8},
  chipActive: {},
  chipText: { fontSize: 13, fontWeight: "600" },
  chipTextActive: {},
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0},
  filterBtnActive: {},
  filterSheet: { flex: 1, paddingHorizontal: 16 },
  filterSheetHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6},
  filterSheetTitle: {
    letterSpacing: NATIVE.titleTracking},
  filterSheetSub: {
    lineHeight: 18,
    marginBottom: 14},
  filterSheetList: { gap: 8, paddingBottom: 24 },
  filterSheetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: NATIVE.sectionRadius,
    paddingHorizontal: 14,
    paddingVertical: 14},
  filterSheetRowActive: {},
  filterSheetRowText: {
    letterSpacing: -0.3},
  filterSheetRowTextActive: {},
  segmentBar: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 },
  segmentTrack: {
    flexDirection: "row",
    borderRadius: 9,
    padding: 2,
    gap: 2},
  segmentBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999},
  segmentBtnActive: {
    ...NATIVE.raisedShadow},
  segmentBtnText: { fontSize: 13, fontWeight: "500", color: NATIVE.secondaryLabel },
  segmentBtnTextActive: { color: NATIVE.label, fontWeight: "600" },
  segmentNavWrap: {
    paddingTop: 10,
    paddingBottom: 4,
  },
  mainTabBar: { flexDirection: "row", gap: 8 },
  mainTabScrollRow: { flexDirection: "row", gap: 8, paddingVertical: 4 },
  mainTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NATIVE.separator},
  mainTabScroll: { flex: 0, minWidth: 112 },
  mainTabActive: {
    borderColor: NATIVE.separatorOpaque},
  mainTabText: { ...nativeType.caption, fontWeight: "600", color: NATIVE.secondaryLabel },
  mainTabTextActive: { color: NATIVE.label, fontWeight: NATIVE.titleWeight },
  underlineTabBarWrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: NATIVE.separator},
  underlineTabBar: { paddingHorizontal: 12, gap: 4 },
  underlineTabItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent"},
  underlineTabItemActive: { borderBottomColor: NATIVE.accent },
  underlineTabLabel: { fontSize: 14, fontWeight: "600", color: NATIVE.secondaryLabel },
  underlineTabLabelActive: { color: NATIVE.label, fontWeight: "600" },
  signatureTabWrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingTop: 2,
  },
  signatureTabWrapEmbedded: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  signatureTabScroll: {
    paddingHorizontal: 16,
    gap: 4,
  },
  signatureTabRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 4,
  },
  signatureTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginBottom: -StyleSheet.hairlineWidth,
  },
  signatureTabLabel: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.15,
  },
  signatureTabLabelActive: {
    fontWeight: "700",
  },
  signatureTabCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  signatureTabCountText: {
    fontWeight: "700",
    fontSize: 11,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: NATIVE.sectionRadius,
    paddingHorizontal: 14,
    paddingVertical: 12},
  searchToolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: NATIVE.sectionRadius,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 6},
  searchToolbarEmbedded: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "transparent",
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 4},
  searchBoxEmbedded: {
    backgroundColor: "transparent",
    paddingVertical: 4,
  },
  toolbarFilterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0},
  toolbarAddBtn: {},
  toolbarTrailingWrap: { position: "relative", flexShrink: 0 },
  filterOnlyInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6},
  filterOnlyLabel: { flex: 1, fontSize: 15, fontWeight: "500" },
  filterOnlyLabelActive: { fontWeight: "600" },
  filterOnlyChevron: { marginLeft: "auto" },
  groupedFilterList: { gap: 20, paddingBottom: 24 },
  filterGroup: { gap: 8 },
  filterGroupTitle: {
    ...nativeType.sectionHeader,
    paddingHorizontal: 2},
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "400",
    padding: 0,
    letterSpacing: -0.2},
  stickyModuleHeader: {
    flexShrink: 0,
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 10,
  },
})
