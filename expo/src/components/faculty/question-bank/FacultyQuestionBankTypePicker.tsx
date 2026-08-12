import { Pressable, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { BANK_QUESTION_TYPES } from "../../../lib/faculty-question-bank-utils"
import {
  customTypeToMeta,
  QUESTION_BANK_TYPE_CATEGORIES,
  type CustomQuestionTypeDraft,
} from "../../../lib/custom-question-types"
import { FACULTY_QUESTION_BANK_COLOR } from "../../../lib/faculty-question-bank-theme"
import { semanticSoft } from "../../../lib/themed-module-theme"
import { NATIVE } from "../../../constants/faculty-native-theme"
import { useModuleTheme } from "../../../lib/themed-module-shell"
import { useKpiGridCardStyle } from "../../../lib/responsive-layout"

type Props = {
  value: string | null
  customTypes?: CustomQuestionTypeDraft[]
  onChange: (typeId: string) => void
  onCreateNewType?: () => void
}

export function FacultyQuestionBankTypePicker({
  value,
  customTypes = [],
  onChange,
  onCreateNewType,
}: Props) {
  const { native, tokens, type } = useModuleTheme()
  const linkSoft = semanticSoft(FACULTY_QUESTION_BANK_COLOR.link, tokens.isDark)

  return (
    <View style={styles.root}>
      <Text style={[type.bodyEmphasis, { color: native.label }]}>Question type</Text>
      <Text style={[type.caption, { color: native.secondaryLabel, marginBottom: 8 }]}>
        Choose a built-in or saved custom type — or create a new one with AI.
      </Text>

      {customTypes.length > 0 ? (
        <View style={styles.section}>
          <Text style={[type.caption, styles.sectionLabel, { color: native.secondaryLabel }]}>
            Your custom types
          </Text>
          <View style={styles.grid}>
            {customTypes.map((row) => {
              const meta = customTypeToMeta(row)
              const selected = value === row.typeId
              return (
                <TypeCard
                  key={row.typeId}
                  label={meta.label}
                  description={meta.description}
                  selected={selected}
                  accent
                  onPress={() => onChange(row.typeId)}
                />
              )
            })}
          </View>
        </View>
      ) : null}

      {QUESTION_BANK_TYPE_CATEGORIES.map((cat) => {
        const types = BANK_QUESTION_TYPES.filter((t) => {
          if (cat.id === "choice") {
            return ["mcq", "true_false", "select_all", "fill_blank"].includes(t.id)
          }
          if (cat.id === "coding") {
            return t.id.startsWith("code") || t.id === "debug_code" || t.id === "trace_output"
          }
          return ["multi_part", "circuit_submission"].includes(t.id)
        })
        if (types.length === 0) return null
        return (
          <View key={cat.id} style={styles.section}>
            <Text style={[type.caption, styles.sectionLabel, { color: native.secondaryLabel }]}>
              {cat.label}
            </Text>
            <View style={styles.grid}>
              {types.map((row) => (
                <TypeCard
                  key={row.id}
                  label={row.label}
                  description={row.label}
                  selected={value === row.id}
                  onPress={() => onChange(row.id)}
                />
              ))}
            </View>
          </View>
        )
      })}

      {onCreateNewType ? (
        <Pressable
          onPress={onCreateNewType}
          style={[
            styles.createCard,
            { borderColor: native.separator, backgroundColor: native.secondaryGrouped },
          ]}
        >
          <View style={[styles.iconBox, { backgroundColor: linkSoft }]}>
            <Ionicons name="add" size={18} color={FACULTY_QUESTION_BANK_COLOR.link} />
          </View>
          <View style={styles.cardCopy}>
            <Text style={[type.bodyEmphasis, { color: native.label }]}>Create new question type</Text>
            <Text style={[type.caption, { color: native.secondaryLabel }]}>
              Describe a format — AI builds the schema and saves it for reuse.
            </Text>
          </View>
        </Pressable>
      ) : null}
    </View>
  )
}

function TypeCard({
  label,
  description,
  selected,
  accent,
  onPress,
}: {
  label: string
  description: string
  selected: boolean
  accent?: boolean
  onPress: () => void
}) {
  const { native, tokens, type } = useModuleTheme()
  const cardLayout = useKpiGridCardStyle("48%")
  const linkSoft = semanticSoft(FACULTY_QUESTION_BANK_COLOR.link, tokens.isDark)
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.typeCard,
        cardLayout,
        {
          backgroundColor: native.secondaryGrouped,
          borderColor: selected ? FACULTY_QUESTION_BANK_COLOR.link : native.separator,
        },
        selected && { borderWidth: 2 },
      ]}
    >
      <View
        style={[
          styles.iconBox,
          { backgroundColor: accent ? linkSoft : native.tertiaryGrouped },
        ]}
      >
        <Ionicons
          name={accent ? "sparkles-outline" : "help-circle-outline"}
          size={16}
          color={accent ? FACULTY_QUESTION_BANK_COLOR.link : native.secondaryLabel}
        />
      </View>
      <Text style={[type.caption, { color: native.label, fontWeight: "600" }]} numberOfLines={2}>
        {label}
      </Text>
      <Text style={[type.caption, { color: native.tertiaryLabel, fontSize: 10 }]} numberOfLines={2}>
        {description}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  section: { gap: 8 },
  sectionLabel: { fontWeight: "700", textTransform: "none" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeCard: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
    gap: 4,
    minHeight: 88,
  },
  createCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: "dashed",
    padding: 12,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cardCopy: { flex: 1, gap: 4 },
})
