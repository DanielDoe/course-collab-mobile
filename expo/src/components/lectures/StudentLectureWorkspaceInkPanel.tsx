import { StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import {
  createEmptyWorkspace,
  workspaceHasContent,
  type CircuitWorkspace,
} from "../../lib/circuit-workspace"
import { CircuitWorkspaceEditor } from "../ink/CircuitWorkspaceEditor"

type Props = {
  workspace: CircuitWorkspace | null | undefined
  title?: string
}

/** Read-only in-class ink workspace — instructor worked solutions only (no student save). */
export function StudentLectureWorkspaceInkPanel({ workspace, title = "In-class workspace" }: Props) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const displayWorkspace = workspace ?? createEmptyWorkspace()
  const hasInk = workspace != null && workspaceHasContent(workspace)

  return (
    <View style={[styles.root, { borderColor: tokens.border, backgroundColor: native.groupedBackground }]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: tokens.accentSoft }]}>
          <Ionicons name="easel-outline" size={16} color={tokens.accent} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={[type.bodyEmphasis, { color: native.label }]}>{title}</Text>
          <Text style={[type.caption, { color: native.secondaryLabel }]}>
            {hasInk
              ? "Instructor worked solution — view only"
              : "Your instructor publishes ink solutions here during class"}
          </Text>
        </View>
      </View>

      <CircuitWorkspaceEditor workspace={displayWorkspace} onChange={() => {}} disabled />

      {!hasInk ? (
        <View style={[styles.emptyBanner, { backgroundColor: native.fill, borderColor: tokens.border }]}>
          <Ionicons name="information-circle-outline" size={16} color={native.secondaryLabel} />
          <Text style={[type.caption, { color: native.secondaryLabel, flex: 1, lineHeight: 18 }]}>
            No ink solution has been published for this problem yet. Step-by-step text and Cora are still
            available below.
          </Text>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    gap: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  emptyBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginHorizontal: 10,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
})
