import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useAppThemeTokens } from "../../context/AppearanceProvider"
import type { CoraUiPayload } from "../../lib/cora/models/types"
import { isRedundantCoraUiPayload } from "../../lib/cora/ui-payload"

export { isRedundantCoraUiPayload }

type Props = {
  ui: CoraUiPayload
  accent?: string
  onOpenRoute?: (route: string) => void
}

type PreviewField = { label: string; value: string }

function confirmationFields(preview: Record<string, unknown>): PreviewField[] {
  const raw = preview.fields
  if (!Array.isArray(raw)) return []
  return raw
    .map((row) => {
      if (!row || typeof row !== "object") return null
      const rec = row as Record<string, unknown>
      const label = String(rec.label ?? "").trim()
      const value = String(rec.value ?? "").trim()
      if (!label && !value) return null
      return { label: label || "Detail", value }
    })
    .filter((row): row is PreviewField => row != null)
}

/**
 * Renders structured Cora UI cards (`ui.created_resource`, errors, …).
 * Confirmation writes use `CoraActionCard` — this card does not dump raw preview JSON.
 */
export function CoraUiPayloadCard({ ui, accent, onOpenRoute }: Props) {
  const tokens = useAppThemeTokens()
  const native = tokens.native
  const link = accent ?? tokens.accent
  const cardChrome = {
    backgroundColor: tokens.elevatedSurface || native.secondaryGrouped,
    borderColor: native.separatorOpaque || tokens.border,
  }

  if (ui.type === "permission_denied" || ui.type === "error" || ui.type === "insufficient_credits") {
    return (
      <View style={[styles.card, cardChrome]}>
        <Text style={[styles.message, { color: native.label }]}>{ui.message}</Text>
      </View>
    )
  }

  if (ui.type === "confirmation") {
    const title = typeof ui.preview?.title === "string" ? ui.preview.title : "Confirm action"
    const summary = typeof ui.preview?.summary === "string" ? ui.preview.summary : ui.message
    const fields = ui.preview && typeof ui.preview === "object" ? confirmationFields(ui.preview) : []
    return (
      <View style={[styles.card, cardChrome]}>
        <Text style={[styles.title, { color: native.label }]} numberOfLines={2}>
          {title}
        </Text>
        {summary ? (
          <Text style={[styles.summary, { color: native.secondaryLabel }]}>{summary}</Text>
        ) : null}
        {fields.length ? (
          <View style={[styles.preview, { borderTopColor: native.separator }]}>
            {fields.map((field) => (
              <View key={`${field.label}-${field.value}`} style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { color: native.tertiaryLabel }]}>{field.label}</Text>
                <Text style={[styles.fieldValue, { color: native.label }]} numberOfLines={3}>
                  {field.value}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    )
  }

  if (ui.type !== "created_resource") return null

  const actions = (ui.actions ?? []).filter((action) => action.route?.trim())
  const resourceTitle = ui.resource?.title ? String(ui.resource.title) : null

  return (
    <View style={[styles.card, cardChrome]}>
      {resourceTitle ? (
        <Text style={[styles.title, { color: native.label }]} numberOfLines={2}>
          {resourceTitle}
        </Text>
      ) : null}
      {actions.length ? (
        <View style={styles.actions}>
          {actions.map((action) => {
            const route = action.route?.trim()
            return (
              <Pressable
                key={`${action.label}-${route ?? action.actionId ?? "action"}`}
                style={[styles.actionBtn, { borderColor: `${link}44` }]}
                onPress={() => route && onOpenRoute?.(route)}
                accessibilityRole="button"
                accessibilityLabel={action.label}
              >
                <Ionicons name="open-outline" size={16} color={link} />
                <Text style={[styles.actionLabel, { color: link }]} numberOfLines={1}>
                  {action.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  summary: {
    fontSize: 14,
    lineHeight: 19,
  },
  message: {
    fontSize: 15,
    lineHeight: 21,
  },
  preview: {
    gap: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  fieldRow: {
    gap: 2,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  fieldValue: {
    fontSize: 14,
    lineHeight: 19,
  },
  actions: {
    gap: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "600",
    maxWidth: 240,
  },
})
