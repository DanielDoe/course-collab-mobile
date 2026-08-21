import { useId, useMemo, useState } from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import type { GuestLetterFilter } from "../../lib/guest-recommendation-utils"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import {
  useModuleSearchDockRegistration,
  type ModuleSearchDockEntry,
} from "../../context/ModuleSearchDockContext"
import { useNativeType } from "../../lib/themed-module-theme"
import { StudentFilterSheet, StudentSearchToolbarInner } from "../student/student-search-toolbar"

type FilterOption = {
  id: GuestLetterFilter
  label: string
  count: number
}

type Props = {
  search: string
  onSearchChange: (value: string) => void
  filter: GuestLetterFilter
  onFilterChange: (value: GuestLetterFilter) => void
  filterOptions: FilterOption[]
  resultsShown: number
  resultsTotal: number
}

export function GuestLetterSearchBar({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  filterOptions,
  resultsShown,
  resultsTotal,
}: Props) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const dockId = useId()
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)

  const filtersActive = filter !== "all"
  const queryActive = filtersActive || search.trim().length > 0

  const sheetOptions = filterOptions.map((opt) => ({
    value: opt.id,
    label: `${opt.label} (${opt.count})`,
  }))

  const dockEntry = useMemo<ModuleSearchDockEntry>(
    () => ({
      kind: "custom",
      node: (
        <View style={styles.dockContent}>
          <StudentSearchToolbarInner
            embedded
            value={search}
            onChange={onSearchChange}
            placeholder="Search purpose, course, instructor, status…"
            filterActive={filtersActive}
            onOpenFilter={() => setFilterSheetOpen(true)}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
            keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
          >
            {filterOptions.map((opt) => {
              const active = opt.id === filter
              return (
                <Pressable
                  key={opt.id}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active
                        ? tokens.accentSoftStrong
                        : tokens.isDark
                          ? "rgba(255, 255, 255, 0.1)"
                          : "rgba(118, 118, 128, 0.14)",
                      borderColor: active ? tokens.accentBorder : "transparent",
                    },
                  ]}
                  onPress={() => onFilterChange(opt.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text
                    style={[
                      type.caption,
                      styles.chipLabel,
                      { color: active ? tokens.accentDark : native.secondaryLabel },
                      active && styles.chipLabelActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  <View
                    style={[
                      styles.chipCount,
                      { backgroundColor: active ? tokens.accent : native.separator },
                    ]}
                  >
                    <Text
                      style={[
                        type.footnote,
                        styles.chipCountText,
                        { color: active ? "#ffffff" : native.label },
                      ]}
                    >
                      {opt.count}
                    </Text>
                  </View>
                </Pressable>
              )
            })}
          </ScrollView>
        </View>
      ),
    }),
    [search, filter, filtersActive, filterOptions, native, tokens, type, onSearchChange, onFilterChange],
  )

  useModuleSearchDockRegistration(dockId, dockEntry)

  return (
    <>
      {queryActive && resultsTotal > 0 ? (
        <View style={styles.resultsRow}>
          <Text style={[type.caption, { color: native.secondaryLabel, flex: 1 }]}>
            Showing {resultsShown} of {resultsTotal}
            {search.trim() ? ` · “${search.trim()}”` : ""}
          </Text>
          <Pressable
            onPress={() => {
              onSearchChange("")
              onFilterChange("all")
            }}
            hitSlop={8}
          >
            <Text style={[type.caption, { color: tokens.accent, fontWeight: "600" }]}>Clear</Text>
          </Pressable>
        </View>
      ) : null}

      <StudentFilterSheet
        visible={filterSheetOpen}
        title="Filter letters"
        subtitle="Narrow your recommendation letter list."
        options={sheetOptions}
        value={filter}
        onSelect={(value) => {
          onFilterChange(value as GuestLetterFilter)
          setFilterSheetOpen(false)
        }}
        onClose={() => setFilterSheetOpen(false)}
      />
    </>
  )
}

const styles = StyleSheet.create({
  dockContent: { gap: 8 },
  chipRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 4,
    paddingBottom: 2,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 7,
  },
  chipLabel: { fontWeight: "600" },
  chipLabelActive: { fontWeight: "700" },
  chipCount: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  chipCountText: { fontWeight: "700", fontSize: 11 },
  resultsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
})
