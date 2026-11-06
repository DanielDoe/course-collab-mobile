import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { useId, useMemo } from "react"
import { NATIVE } from "../../constants/faculty-native-theme"
import { STUDENT_BRAND, STUDENT_NATIVE } from "../../constants/student-theme"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import {
  useModuleSearchDockRegistration,
  type ModuleSearchDockEntry,
} from "../../context/ModuleSearchDockContext"
import { NativeCountBadge } from "../faculty/faculty-shared"
import {
  LiquidGlassSearchField,
  LiquidGlassSearchIconButton,
} from "../theme/LiquidGlassSearchField"
import { GlassFilterOptionRow, GlassMenuList } from "../theme/GlassActionSheetMenu"
import { useGlassChromeActive } from "../theme/GlassSurface"
import { ModuleFilterBottomSheet } from "../motion/ModuleFilterBottomSheet"
import { useNativeType } from "../../lib/themed-module-theme"
import type { FacultyFilterOption } from "../faculty/faculty-module-shell"

/** Lucide maps `options-outline` to an ellipsis — use the filter glyph in search docks. */
export const FILTER_TOOLBAR_ICON = "filter-outline" as const

export type StudentFilterGroup = {
  id: string
  title: string
  value: string
  options: FacultyFilterOption[]
}

type TrailingAction = {
  onPress: () => void
  accessibilityLabel: string
  icon?: keyof typeof Ionicons.glyphMap
  badgeCount?: number
}

export type StudentSearchToolbarProps = {
  value: string
  onChange: (v: string) => void
  placeholder: string
  filterActive?: boolean
  onOpenFilter?: () => void
  showFilter?: boolean
  showSearch?: boolean
  filterLabel?: string
  trailingAction?: TrailingAction
  placement?: "dock" | "inline"
  embedded?: boolean
}

/** Student module search — Liquid Glass dock at bottom by default. */
export function StudentSearchToolbar({ placement = "dock", embedded, ...props }: StudentSearchToolbarProps) {
  const dockId = useId()

  const dockEntry = useMemo<ModuleSearchDockEntry | null>(() => {
    if (placement !== "dock") return null
    return { kind: "student", props: { ...props, placement: "dock" } }
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
  return <StudentSearchToolbarInner {...props} embedded={embedded} />
}

export function StudentSearchToolbarInner({
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
}: StudentSearchToolbarProps) {
  const theme = useAppThemeTokens()
  const filterIconColor = filterActive ? theme.accentDark : theme.textMuted
  const glassActive = useGlassChromeActive()

  if (embedded || glassActive) {
    const trailing = (
      <>
        {showFilter && onOpenFilter ? (
          <LiquidGlassSearchIconButton
            icon={FILTER_TOOLBAR_ICON}
            onPress={onOpenFilter}
            accessibilityLabel={filterLabel ?? "Open filters"}
            active={filterActive}
          />
        ) : null}
        {trailingAction ? (
          <View style={styles.toolbarTrailingWrap}>
            <LiquidGlassSearchIconButton
              icon={trailingAction.icon ?? "add"}
              onPress={trailingAction.onPress}
              accessibilityLabel={trailingAction.accessibilityLabel}
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
          filterOnly={
            <Pressable
              style={styles.filterOnlyInner}
              onPress={onOpenFilter}
              accessibilityRole="button"
              accessibilityLabel={filterLabel ?? "Open filters"}
            >
              <Ionicons name={FILTER_TOOLBAR_ICON} size={18} color={filterIconColor} />
              <Text
                style={[
                  styles.filterOnlyLabel,
                  { color: theme.text },
                  filterActive && { color: theme.accentDark, fontWeight: "600" },
                ]}
                numberOfLines={1}
              >
                {filterLabel ?? "Filters"}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={theme.textMuted}
                style={styles.filterOnlyChevron}
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
      />
    )
  }

  const toolbarStyle = [
    styles.searchToolbar,
    theme.cardShadow,
    { backgroundColor: theme.surface, borderColor: theme.border },
  ]

  if (!showSearch && showFilter && onOpenFilter) {
    return (
      <View style={toolbarStyle}>
        <Pressable
          style={styles.filterOnlyInner}
          onPress={onOpenFilter}
          accessibilityRole="button"
          accessibilityLabel={filterLabel ?? "Open filters"}
        >
          <Ionicons name={FILTER_TOOLBAR_ICON} size={18} color={filterIconColor} />
          <Text style={[styles.filterOnlyLabel, filterActive && { color: theme.accentDark, fontWeight: "600" }]} numberOfLines={1}>
            {filterLabel ?? "Filters"}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={theme.textMuted} style={styles.filterOnlyChevron} />
        </Pressable>
        {trailingAction ? <StudentToolbarTrailing action={trailingAction} theme={theme} /> : null}
      </View>
    )
  }

  return (
    <View style={toolbarStyle}>
      {showSearch ? (
        <>
          <Ionicons name="search-outline" size={18} color={theme.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            selectionColor={theme.accent}
          />
        </>
      ) : null}
      {showFilter && onOpenFilter ? (
        <Pressable
          style={[styles.toolbarFilterBtn, filterActive && { backgroundColor: theme.accentSoftStrong }]}
          onPress={onOpenFilter}
          accessibilityRole="button"
          accessibilityLabel={filterLabel ?? "Open filters"}
        >
          <Ionicons name={FILTER_TOOLBAR_ICON} size={18} color={filterIconColor} />
        </Pressable>
      ) : null}
      {trailingAction ? <StudentToolbarTrailing action={trailingAction} theme={theme} /> : null}
    </View>
  )
}

function StudentToolbarTrailing({
  action,
  theme,
}: {
  action: TrailingAction
  theme: ReturnType<typeof useAppThemeTokens>
}) {
  return (
    <View style={styles.toolbarTrailingWrap}>
      <Pressable
        style={[
          styles.toolbarFilterBtn,
          {
            backgroundColor: theme.accentSoftStrong,
            borderWidth: theme.isDark ? 0 : 1,
            borderColor: theme.isDark ? "transparent" : theme.accentBorder,
          },
        ]}
        onPress={action.onPress}
        accessibilityRole="button"
        accessibilityLabel={action.accessibilityLabel}
      >
        <Ionicons name={action.icon ?? "add"} size={20} color={theme.accent} />
      </Pressable>
      {action.badgeCount != null && action.badgeCount > 0 ? (
        <NativeCountBadge
          count={action.badgeCount}
          variant="overlay"
          borderColor={theme.surface}
        />
      ) : null}
    </View>
  )
}

export function StudentFilterSheet({
  visible,
  title,
  subtitle,
  options,
  value,
  onSelect,
  onClose,
}: {
  visible: boolean
  title: string
  subtitle?: string
  options: FacultyFilterOption[]
  value: string
  onSelect: (value: string) => void
  onClose: () => void
}) {
  return (
    <ModuleFilterBottomSheet visible={visible} title={title} subtitle={subtitle} onClose={onClose}>
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
    </ModuleFilterBottomSheet>
  )
}

export function StudentGroupedFilterSheet({
  visible,
  title,
  subtitle,
  groups,
  onSelect,
  onClose,
}: {
  visible: boolean
  title: string
  subtitle?: string
  groups: StudentFilterGroup[]
  onSelect: (groupId: string, value: string) => void
  onClose: () => void
}) {
  const theme = useAppThemeTokens()
  const type = useNativeType()

  return (
    <ModuleFilterBottomSheet visible={visible} title={title} subtitle={subtitle} onClose={onClose}>
      {groups.map((group) => (
        <View key={group.id} style={styles.filterGroup}>
          <Text style={[type.sectionHeader, styles.filterGroupTitle, { color: theme.textSecondary }]}>
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
    </ModuleFilterBottomSheet>
  )
}

const styles = StyleSheet.create({
  searchToolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: NATIVE.secondaryGrouped,
    borderRadius: NATIVE.sectionRadius,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NATIVE.separator,
  },
  searchToolbarEmbedded: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "transparent",
    borderRadius: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingVertical: 0,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "400",
    color: NATIVE.label,
    padding: 0,
    letterSpacing: -0.2,
  },
  toolbarFilterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  toolbarFilterBtnActive: {
    backgroundColor: NATIVE.fill,
  },
  toolbarTrailingWrap: {
    position: "relative",
    flexShrink: 0,
  },
  filterOnlyInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 40,
  },
  filterOnlyLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: STUDENT_BRAND.inkSecondary,
  },
  filterOnlyLabelActive: {
    color: STUDENT_NATIVE.accentDark,
    fontWeight: "600",
  },
  filterOnlyChevron: { marginLeft: "auto" },
  filterSheet: {
    flex: 1,
    backgroundColor: NATIVE.groupedBackground,
    paddingHorizontal: 16,
  },
  filterSheetHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  filterSheetTitle: {
    fontSize: 17,
    fontWeight: NATIVE.titleWeight,
    color: NATIVE.label,
    letterSpacing: NATIVE.titleTracking,
  },
  filterSheetSub: {
    fontSize: 13,
    lineHeight: 18,
    color: STUDENT_BRAND.inkMuted,
    marginBottom: 14,
  },
  filterSheetList: { gap: 8, paddingBottom: 24 },
  filterSheetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: NATIVE.secondaryGrouped,
    borderRadius: NATIVE.sectionRadius,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NATIVE.separator,
  },
  filterSheetRowActive: {
    backgroundColor: STUDENT_NATIVE.accentSoft,
    borderColor: NATIVE.separator,
  },
  filterSheetRowText: {
    fontSize: 16,
    fontWeight: "400",
    color: NATIVE.label,
    letterSpacing: -0.3,
  },
  filterSheetRowTextActive: {
    fontWeight: "600",
    color: STUDENT_NATIVE.accentDark,
  },
  groupedFilterList: { gap: 20, paddingBottom: 24 },
  filterGroup: { gap: 8 },
  filterGroupTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: STUDENT_NATIVE.accentDark,
    letterSpacing: 0.2,
    paddingHorizontal: 2,
  },
})
