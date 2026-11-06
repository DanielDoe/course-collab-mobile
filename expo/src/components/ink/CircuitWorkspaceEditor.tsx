import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useState } from "react"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@/components/icons/AppIcon"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { WORKSPACE_MAX_PAGES, workspaceHasContent, type CircuitWorkspace } from "../../lib/circuit-workspace"
import {
  addWorkspacePage,
  deleteWorkspacePage,
  setActivePageIndex,
} from "../../lib/circuit-workspace-mutations"
import { CommGroupedList } from "../faculty/faculty-communication-ui"
import { CircuitWorkspaceCanvas } from "./CircuitWorkspaceCanvas"
import { CircuitWorkspaceToolbar } from "./CircuitWorkspaceToolbar"

type Props = {
  workspace: CircuitWorkspace
  onChange: (next: CircuitWorkspace) => void
  disabled?: boolean
  darkPaper?: boolean
  onDrawingActiveChange?: (active: boolean) => void
}

function stepPage(workspace: CircuitWorkspace, delta: number): CircuitWorkspace {
  const next = Math.min(
    workspace.pages.length - 1,
    Math.max(0, workspace.activePageIndex + delta),
  )
  return setActivePageIndex(workspace, next)
}

export function CircuitWorkspaceEditor({
  workspace,
  onChange,
  disabled,
  darkPaper,
  onDrawingActiveChange,
}: Props) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const insets = useSafeAreaInsets()
  const [expanded, setExpanded] = useState(false)
  const pageCount = workspace.pages.length
  const pageLabel = `Page ${workspace.activePageIndex + 1} of ${pageCount}`

  return (
    <View style={styles.root}>
      <View style={styles.toolbarRow}>
        <View style={styles.toolbarGrow}>
          <CircuitWorkspaceToolbar
            workspace={workspace}
            onChange={onChange}
            disabled={disabled}
            darkPaper={darkPaper}
          />
        </View>
        <Pressable
          onPress={() => setExpanded(true)}
          accessibilityRole="button"
          accessibilityLabel="Expand workspace"
          style={[styles.expandBtn, { backgroundColor: native.fill, borderColor: native.separator }]}
        >
          <Ionicons name="expand-outline" size={18} color={tokens.accent} />
        </Pressable>
      </View>

      <CommGroupedList>
        <CircuitWorkspaceCanvas
          workspace={workspace}
          onChange={onChange}
          disabled={disabled}
          darkPaper={darkPaper}
          onDrawingActiveChange={onDrawingActiveChange}
        />
      </CommGroupedList>

      <WorkspacePageStrip
        workspace={workspace}
        onChange={onChange}
        disabled={disabled}
      />

      {!workspaceHasContent(workspace) && !disabled ? (
        <Text style={[type.caption, { color: native.tertiaryLabel, textAlign: "center" }]}>
          Draw with your finger or Apple Pencil. Expand for a larger canvas.
        </Text>
      ) : null}

      <Modal
        visible={expanded}
        animationType="fade"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={() => setExpanded(false)}
      >
        <View
          style={[
            styles.expandedRoot,
            {
              backgroundColor: native.groupedBackground,
              paddingTop: Math.max(insets.top, 12),
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          <View style={styles.expandedHead}>
            <Pressable
              onPress={() => onChange(stepPage(workspace, -1))}
              disabled={workspace.activePageIndex <= 0}
              accessibilityRole="button"
              accessibilityLabel="Previous page"
              style={[
                styles.expandBtn,
                {
                  backgroundColor: native.fill,
                  borderColor: native.separator,
                  opacity: workspace.activePageIndex <= 0 ? 0.35 : 1,
                },
              ]}
            >
              <Ionicons name="chevron-back" size={20} color={native.label} />
            </Pressable>
            <View style={styles.expandedTitle}>
              <Text style={[type.bodyEmphasis, { color: native.label }]} numberOfLines={1}>
                {disabled ? "Instructor workspace" : "Workspace"}
              </Text>
              <Text style={[type.caption, { color: native.secondaryLabel }]}>{pageLabel}</Text>
            </View>
            <Pressable
              onPress={() => onChange(stepPage(workspace, 1))}
              disabled={workspace.activePageIndex >= pageCount - 1}
              accessibilityRole="button"
              accessibilityLabel="Next page"
              style={[
                styles.expandBtn,
                {
                  backgroundColor: native.fill,
                  borderColor: native.separator,
                  opacity: workspace.activePageIndex >= pageCount - 1 ? 0.35 : 1,
                },
              ]}
            >
              <Ionicons name="chevron-forward" size={20} color={native.label} />
            </Pressable>
            <Pressable
              onPress={() => setExpanded(false)}
              accessibilityRole="button"
              accessibilityLabel="Close expanded workspace"
              style={[styles.expandBtn, { backgroundColor: native.fill, borderColor: native.separator }]}
            >
              <Ionicons name="contract-outline" size={18} color={tokens.accent} />
            </Pressable>
          </View>

          {!disabled ? (
            <CircuitWorkspaceToolbar
              workspace={workspace}
              onChange={onChange}
              disabled={disabled}
              darkPaper={darkPaper}
            />
          ) : null}

          <View style={styles.expandedStage}>
            <CircuitWorkspaceCanvas
              workspace={workspace}
              onChange={onChange}
              disabled={disabled}
              darkPaper={darkPaper}
              contain
              onDrawingActiveChange={onDrawingActiveChange}
            />
          </View>

          {pageCount > 1 ? (
            <WorkspacePageStrip workspace={workspace} onChange={onChange} disabled={disabled} />
          ) : null}
        </View>
      </Modal>
    </View>
  )
}

function WorkspacePageStrip({
  workspace,
  onChange,
  disabled,
}: {
  workspace: CircuitWorkspace
  onChange: (next: CircuitWorkspace) => void
  disabled?: boolean
}) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()

  return (
    <View style={styles.pageRow}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pageStrip}>
        {workspace.pages.map((page, index) => {
          const active = index === workspace.activePageIndex
          const hasContent = page.strokes.length > 0
          return (
            <Pressable
              key={page.id}
              onPress={() => onChange(setActivePageIndex(workspace, index))}
              accessibilityRole="button"
              accessibilityLabel={`Page ${index + 1}`}
              accessibilityState={{ selected: active }}
              style={[
                styles.pageChip,
                {
                  backgroundColor: active ? `${tokens.accent}18` : native.fill,
                  borderColor: active ? tokens.accent : native.separator,
                },
              ]}
            >
              <Text style={[type.caption, { color: active ? tokens.accent : native.label, fontWeight: "700" }]}>
                {index + 1}
              </Text>
              {hasContent ? <View style={[styles.pageDot, { backgroundColor: tokens.accent }]} /> : null}
            </Pressable>
          )
        })}
      </ScrollView>

      {!disabled && workspace.pages.length < WORKSPACE_MAX_PAGES ? (
        <Pressable
          onPress={() => onChange(addWorkspacePage(workspace))}
          style={[styles.pageAction, { backgroundColor: native.fill }]}
          accessibilityRole="button"
          accessibilityLabel="Add page"
        >
          <Ionicons name="add" size={20} color={tokens.accent} />
        </Pressable>
      ) : null}

      {!disabled && workspace.pages.length > 1 ? (
        <Pressable
          onPress={() => onChange(deleteWorkspacePage(workspace, workspace.activePageIndex))}
          style={[styles.pageAction, { backgroundColor: native.fill }]}
          accessibilityRole="button"
          accessibilityLabel="Delete page"
        >
          <Ionicons name="trash-outline" size={18} color={tokens.danger} />
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  toolbarRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  toolbarGrow: { flex: 1, minWidth: 0 },
  expandBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  expandedRoot: { flex: 1, gap: 10, paddingHorizontal: 8 },
  expandedHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  expandedTitle: { flex: 1, minWidth: 0, gap: 2 },
  expandedStage: {
    flex: 1,
    minHeight: 280,
    borderRadius: 12,
    overflow: "hidden",
  },
  pageRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  pageStrip: { flexDirection: "row", alignItems: "center", gap: 8, flexGrow: 1 },
  pageChip: {
    minWidth: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    flexDirection: "row",
    gap: 4,
  },
  pageDot: { width: 6, height: 6, borderRadius: 3 },
  pageAction: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
})
