import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import {
  WORKSPACE_ERASER_WIDTHS,
  WORKSPACE_PAPER_PATTERNS,
  WORKSPACE_WIDTHS,
  resolveWorkspaceColorForTool,
  workspaceColorsForTool,
  type CircuitWorkspace,
  type WorkspacePaperPattern,
  type WorkspaceTool,
} from "../../lib/circuit-workspace"
import {
  clearActivePage,
  setWorkspaceColor,
  setWorkspaceEraserWidth,
  setWorkspaceTool,
  setWorkspaceWidth,
  undoLastStroke,
} from "../../lib/circuit-workspace-mutations"

type Props = {
  workspace: CircuitWorkspace
  onChange: (next: CircuitWorkspace) => void
  disabled?: boolean
  darkPaper?: boolean
}

type ToolDef = {
  id: WorkspaceTool
  icon: keyof typeof Ionicons.glyphMap
  label: string
}

const TOOLS: ToolDef[] = [
  { id: "pen", icon: "pencil-outline", label: "Pen" },
  { id: "highlighter", icon: "color-fill-outline", label: "Highlighter" },
  { id: "eraser", icon: "backspace-outline", label: "Eraser" },
  { id: "line", icon: "remove-outline", label: "Line" },
  { id: "rect", icon: "square-outline", label: "Rectangle" },
  { id: "ellipse", icon: "ellipse-outline", label: "Ellipse" },
]

function ToolButton({
  active,
  icon,
  label,
  onPress,
  disabled,
  accent,
  native,
}: {
  active: boolean
  icon: keyof typeof Ionicons.glyphMap
  label: string
  onPress: () => void
  disabled?: boolean
  accent: string
  native: ReturnType<typeof useThemedNative>
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.toolBtn,
        {
          backgroundColor: active ? `${accent}18` : native.fill,
          opacity: pressed || disabled ? 0.6 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={18} color={active ? accent : native.label} />
    </Pressable>
  )
}

export function CircuitWorkspaceToolbar({ workspace, onChange, disabled, darkPaper }: Props) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const paperTheme = darkPaper ? "dark" : "light"
  const tool = workspace.tool ?? "pen"
  const activeColor = resolveWorkspaceColorForTool(tool, workspace, paperTheme)
  const palette =
    tool === "highlighter" ? workspaceColorsForTool("highlighter", paperTheme) : workspaceColorsForTool(tool, paperTheme)

  return (
    <View style={styles.root}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolRow}>
        {TOOLS.map((item) => (
          <ToolButton
            key={item.id}
            active={tool === item.id}
            icon={item.icon}
            label={item.label}
            disabled={disabled}
            accent={tokens.accent}
            native={native}
            onPress={() => onChange(setWorkspaceTool(workspace, item.id))}
          />
        ))}
        <View style={[styles.divider, { backgroundColor: native.separator }]} />
        <Pressable
          onPress={() => !disabled && onChange(undoLastStroke(workspace))}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Undo stroke"
          style={({ pressed }) => [styles.actionBtn, { opacity: pressed || disabled ? 0.5 : 1 }]}
        >
          <Ionicons name="arrow-undo-outline" size={18} color={tokens.accent} />
        </Pressable>
        <Pressable
          onPress={() => !disabled && onChange(clearActivePage(workspace))}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Clear page"
          style={({ pressed }) => [styles.actionBtn, { opacity: pressed || disabled ? 0.5 : 1 }]}
        >
          <Ionicons name="trash-outline" size={18} color={tokens.danger} />
        </Pressable>
      </ScrollView>

      {tool !== "eraser" ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.paletteRow}>
          {palette.map((swatch) => (
            <Pressable
              key={swatch.id}
              onPress={() => !disabled && onChange(setWorkspaceColor(workspace, swatch.value, tool))}
              accessibilityRole="button"
              accessibilityLabel={`${swatch.id} color`}
              style={[
                styles.colorSwatch,
                { backgroundColor: swatch.value },
                activeColor.toLowerCase() === swatch.value.toLowerCase() && {
                  borderColor: tokens.accent,
                  borderWidth: 2,
                },
              ]}
            />
          ))}
          {WORKSPACE_WIDTHS.map((w) => (
            <Pressable
              key={w.id}
              onPress={() => !disabled && onChange(setWorkspaceWidth(workspace, w.value))}
              accessibilityRole="button"
              accessibilityLabel={`${w.label} stroke`}
              style={[
                styles.widthSwatch,
                { borderColor: native.separator },
                (workspace.width ?? 4) === w.value && { borderColor: tokens.accent, borderWidth: 2 },
              ]}
            >
              <View
                style={{
                  width: w.dot,
                  height: w.dot,
                  borderRadius: w.dot / 2,
                  backgroundColor: native.label,
                }}
              />
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.paletteRow}>
          {WORKSPACE_ERASER_WIDTHS.map((w) => (
            <Pressable
              key={w.id}
              onPress={() => !disabled && onChange(setWorkspaceEraserWidth(workspace, w.value))}
              accessibilityRole="button"
              accessibilityLabel={`${w.label} eraser`}
              style={[
                styles.widthSwatch,
                { borderColor: native.separator },
                (workspace.eraserWidth ?? 24) === w.value && { borderColor: tokens.accent, borderWidth: 2 },
              ]}
            >
              <View
                style={{
                  width: w.dot,
                  height: w.dot,
                  borderRadius: w.dot / 2,
                  backgroundColor: native.secondaryLabel,
                }}
              />
            </Pressable>
          ))}
        </ScrollView>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.paletteRow}>
        {WORKSPACE_PAPER_PATTERNS.map((pattern) => (
          <Pressable
            key={pattern.id}
            onPress={() =>
              !disabled && onChange({ ...workspace, paperPattern: pattern.id as WorkspacePaperPattern })
            }
            style={[
              styles.patternChip,
              {
                backgroundColor:
                  (workspace.paperPattern ?? "ruled") === pattern.id ? `${tokens.accent}18` : native.fill,
              },
            ]}
          >
            <Text
              style={[
                type.caption,
                {
                  color: (workspace.paperPattern ?? "ruled") === pattern.id ? tokens.accent : native.secondaryLabel,
                  fontWeight: "600",
                },
              ]}
            >
              {pattern.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: 8 },
  toolRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 2 },
  toolBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: { width: StyleSheet.hairlineWidth, height: 24, marginHorizontal: 4 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  paletteRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 2 },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "transparent",
  },
  widthSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  patternChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: NATIVE.sectionRadius,
  },
})
