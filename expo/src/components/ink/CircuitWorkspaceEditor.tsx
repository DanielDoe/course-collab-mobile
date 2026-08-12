import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { NATIVE } from "../../constants/faculty-native-theme"
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
}

export function CircuitWorkspaceEditor({ workspace, onChange, disabled, darkPaper }: Props) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()

  return (
    <View style={styles.root}>
      <CircuitWorkspaceToolbar
        workspace={workspace}
        onChange={onChange}
        disabled={disabled}
        darkPaper={darkPaper}
      />

      <CommGroupedList>
        <CircuitWorkspaceCanvas
          workspace={workspace}
          onChange={onChange}
          disabled={disabled}
          darkPaper={darkPaper}
        />
      </CommGroupedList>

      <View style={styles.pageRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pageStrip}>
          {workspace.pages.map((page, index) => {
            const active = index === workspace.activePageIndex
            const hasContent = page.strokes.length > 0
            return (
              <Pressable
                key={page.id}
                onPress={() => !disabled && onChange(setActivePageIndex(workspace, index))}
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
                {hasContent ? (
                  <View style={[styles.pageDot, { backgroundColor: tokens.accent }]} />
                ) : null}
              </Pressable>
            )
          })}
        </ScrollView>

        {!disabled && workspace.pages.length < WORKSPACE_MAX_PAGES ? (
          <Pressable
            onPress={() => onChange(addWorkspacePage(workspace))}
            style={[styles.pageAction, { backgroundColor: native.fill }]}
            accessibilityLabel="Add page"
          >
            <Ionicons name="add" size={20} color={tokens.accent} />
          </Pressable>
        ) : null}

        {!disabled && workspace.pages.length > 1 ? (
          <Pressable
            onPress={() => onChange(deleteWorkspacePage(workspace, workspace.activePageIndex))}
            style={[styles.pageAction, { backgroundColor: native.fill }]}
            accessibilityLabel="Delete page"
          >
            <Ionicons name="trash-outline" size={18} color={tokens.danger} />
          </Pressable>
        ) : null}
      </View>

      {!workspaceHasContent(workspace) && !disabled ? (
        <Text style={[type.caption, { color: native.tertiaryLabel, textAlign: "center" }]}>
          Draw with your finger or Apple Pencil. Ink syncs with the web app.
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: 12 },
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
