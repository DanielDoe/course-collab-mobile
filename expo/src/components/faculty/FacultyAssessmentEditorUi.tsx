import { type ReactNode, useMemo } from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { NativeSwitch } from "../NativeSwitch"
import { Ionicons } from "@/components/icons/AppIcon"
import { FACULTY_CARD_SHADOW } from "./faculty-module-shell"
import { FACULTY_SHEET_CHIP_RADIUS, FacultySheetTextInput } from "./faculty-collab-sheet-ui"
import { FACULTY_ASSESSMENT_COLOR } from "../../lib/faculty-assessment-theme"
import { semanticSoft } from "../../lib/themed-module-theme"
import { useModuleTheme } from "../../lib/themed-module-shell"

function useEditorUiStyles() {
  const { native, tokens, type, cardShadow } = useModuleTheme()
  const linkSoft = semanticSoft(FACULTY_ASSESSMENT_COLOR.link, tokens.isDark)
  return useMemo(
    () => ({
      native,
      tokens,
      type,
      styles: StyleSheet.create({
        sectionCard: {
          backgroundColor: native.secondaryGrouped,
          borderRadius: 16,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: native.separator,
          overflow: "hidden",
          ...cardShadow,
        },
        sectionHead: {
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 14,
          paddingTop: 14,
          paddingBottom: 10,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: native.separator,
        },
        sectionIcon: {
          width: 40,
          height: 40,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
        },
        sectionCopy: { flex: 1, gap: 2 },
        sectionTitle: { ...type.bodyEmphasis, color: native.label },
        sectionSub: { ...type.caption, lineHeight: 16, color: native.secondaryLabel, fontWeight: "600" },
        sectionBody: { padding: 14, gap: 12 },
        heroCard: {
          backgroundColor: native.secondaryGrouped,
          borderRadius: 16,
          padding: 16,
          gap: 14,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: native.separator,
          ...cardShadow,
        },
        heroTop: { flexDirection: "row", alignItems: "center", gap: 12 },
        heroIcon: {
          width: 48,
          height: 48,
          borderRadius: 14,
          backgroundColor: linkSoft,
          alignItems: "center",
          justifyContent: "center",
        },
        heroCopy: { flex: 1, gap: 2 },
        heroEyebrow: {
          ...type.caption,
          fontWeight: "600",
          color: native.tertiaryLabel,
          letterSpacing: 0.4,
        },
        heroType: { fontSize: 18, fontWeight: "600", color: native.label },
        heroStats: { flexDirection: "row", gap: 10 },
        heroStat: {
          flex: 1,
          backgroundColor: native.fill,
          borderRadius: 12,
          paddingVertical: 10,
          paddingHorizontal: 8,
          alignItems: "center",
          gap: 2,
        },
        heroStatValue: { fontSize: 16, fontWeight: "600", color: native.label },
        heroStatLabel: { fontSize: 10, fontWeight: "700", color: native.tertiaryLabel },
        field: { gap: 6 },
        labelWrap: { gap: 2 },
        fieldLabel: {
          fontSize: 11,
          fontWeight: "600",
          color: native.secondaryLabel,
          letterSpacing: 0.4,
        },
        fieldHint: { fontSize: 12, lineHeight: 16, color: native.tertiaryLabel, fontWeight: "600" },
        inputMultiline: { minHeight: 96, textAlignVertical: "top" },
        toggleRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          paddingVertical: 4,
        },
        toggleNested: { paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: native.separator },
        toggleDisabled: { opacity: 0.55 },
        toggleCopy: { flex: 1, gap: 2 },
        toggleLabel: { fontSize: 14, fontWeight: "700", color: native.label },
        toggleHint: { fontSize: 12, color: native.secondaryLabel, lineHeight: 16 },
        chipRow: { flexDirection: "row", gap: 8, paddingVertical: 2 },
        multiChipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
        chip: {
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: FACULTY_SHEET_CHIP_RADIUS,
          backgroundColor: native.fill,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: native.separator,
        },
        multiChip: {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: FACULTY_SHEET_CHIP_RADIUS,
          backgroundColor: native.fill,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: native.separator,
        },
        chipActive: { backgroundColor: linkSoft, borderColor: FACULTY_ASSESSMENT_COLOR.link },
        chipText: { fontSize: 13, fontWeight: "700", color: native.secondaryLabel },
        chipTextActive: { color: FACULTY_ASSESSMENT_COLOR.link },
        inlineFields: { flexDirection: "row", gap: 8 },
        inlineField: { flex: 1 },
        notice: {
          borderRadius: 10,
          borderWidth: 1,
          padding: 10,
        },
        noticeText: { fontSize: 12, lineHeight: 17, fontWeight: "600" },
        divider: { height: StyleSheet.hairlineWidth, backgroundColor: native.separator, marginVertical: 2 },
      }),
    }),
    [native, tokens, type, cardShadow, linkSoft],
  )
}

export function EditorSectionCard({
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap
  iconBg?: string
  iconColor?: string
  title: string
  subtitle?: string
  children: ReactNode
}) {
  const { styles: uiStyles, tokens } = useEditorUiStyles()
  const linkSoft = semanticSoft(FACULTY_ASSESSMENT_COLOR.link, tokens.isDark)
  return (
    <View style={uiStyles.sectionCard}>
      <View style={uiStyles.sectionHead}>
        <View style={[uiStyles.sectionIcon, { backgroundColor: iconBg ?? linkSoft }]}>
          <Ionicons name={icon} size={18} color={iconColor ?? FACULTY_ASSESSMENT_COLOR.link} />
        </View>
        <View style={uiStyles.sectionCopy}>
          <Text style={uiStyles.sectionTitle}>{title}</Text>
          {subtitle ? <Text style={uiStyles.sectionSub}>{subtitle}</Text> : null}
        </View>
      </View>
      <View style={uiStyles.sectionBody}>{children}</View>
    </View>
  )
}

export function EditorHeroCard({
  typeLabel,
  questionCount,
  totalPoints,
  timePerQuestion,
  showPoints,
}: {
  typeLabel: string
  questionCount: number
  totalPoints: number
  timePerQuestion: number
  showPoints?: boolean
}) {
  const { styles: uiStyles, tokens } = useEditorUiStyles()
  return (
    <View style={uiStyles.heroCard}>
      <View style={uiStyles.heroTop}>
        <View style={uiStyles.heroIcon}>
          <Ionicons name="create-outline" size={22} color={FACULTY_ASSESSMENT_COLOR.link} />
        </View>
        <View style={uiStyles.heroCopy}>
          <Text style={uiStyles.heroEyebrow}>Assessment editor</Text>
          <Text style={uiStyles.heroType}>{typeLabel}</Text>
        </View>
      </View>
      <View style={uiStyles.heroStats}>
        <HeroStat label="Questions" value={String(questionCount)} />
        {showPoints ? <HeroStat label="Points" value={String(totalPoints)} /> : null}
        <HeroStat label="Default time" value={`${timePerQuestion}s`} />
      </View>
    </View>
  )
}

function HeroStat({ label, value }: { label: string; value: string }) {
  const { styles: uiStyles } = useEditorUiStyles()
  return (
    <View style={uiStyles.heroStat}>
      <Text style={uiStyles.heroStatValue}>{value}</Text>
      <Text style={uiStyles.heroStatLabel}>{label}</Text>
    </View>
  )
}

export function EditorFieldLabel({ children, hint }: { children: string; hint?: string }) {
  const { styles: uiStyles } = useEditorUiStyles()
  return (
    <View style={uiStyles.labelWrap}>
      <Text style={uiStyles.fieldLabel}>{children}</Text>
      {hint ? <Text style={uiStyles.fieldHint}>{hint}</Text> : null}
    </View>
  )
}

export function EditorTextField({
  label,
  hint,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
}: {
  label: string
  hint?: string
  value: string
  onChangeText: (v: string) => void
  placeholder?: string
  multiline?: boolean
  keyboardType?: "default" | "numeric" | "decimal-pad"
}) {
  const { styles: uiStyles } = useEditorUiStyles()
  return (
    <View style={uiStyles.field}>
      <EditorFieldLabel hint={hint}>{label}</EditorFieldLabel>
      <FacultySheetTextInput
        style={multiline ? uiStyles.inputMultiline : undefined}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        accessibilityLabel={label}
        multiline={multiline}
        keyboardType={
          keyboardType === "numeric" || keyboardType === "decimal-pad" ? keyboardType : "ascii-capable"
        }
        autoCorrect={false}
        textAlignVertical={multiline ? "top" : "center"}
      />
    </View>
  )
}

export function EditorToggleRow({
  label,
  hint,
  value,
  onValueChange,
  disabled,
  nested,
}: {
  label: string
  hint?: string
  value: boolean
  onValueChange: (v: boolean) => void
  disabled?: boolean
  nested?: boolean
}) {
  const { styles: uiStyles } = useEditorUiStyles()
  return (
    <View style={[uiStyles.toggleRow, nested && uiStyles.toggleNested, disabled && uiStyles.toggleDisabled]}>
      <View style={uiStyles.toggleCopy}>
        <Text style={uiStyles.toggleLabel}>{label}</Text>
        {hint ? <Text style={uiStyles.toggleHint}>{hint}</Text> : null}
      </View>
      <NativeSwitch value={value} onValueChange={onValueChange} disabled={disabled} />
    </View>
  )
}

export function EditorChipPicker({
  label,
  hint,
  options,
  value,
  onChange,
}: {
  label: string
  hint?: string
  options: { id: string; label: string }[]
  value: string
  onChange: (id: string) => void
}) {
  const { styles: uiStyles } = useEditorUiStyles()
  return (
    <View style={uiStyles.field}>
      <EditorFieldLabel hint={hint}>{label}</EditorFieldLabel>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={uiStyles.chipRow}>
        {options.map((opt) => {
          const active = value === opt.id
          return (
            <Pressable
              key={opt.id || "__empty__"}
              style={[uiStyles.chip, active && uiStyles.chipActive]}
              onPress={() => onChange(opt.id)}
            >
              <Text style={[uiStyles.chipText, active && uiStyles.chipTextActive]}>{opt.label}</Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

export function EditorMultiChipPicker({
  label,
  hint,
  options,
  values,
  onChange,
  exclusiveId,
}: {
  label: string
  hint?: string
  options: { id: string; label: string }[]
  values: string[]
  onChange: (next: string[]) => void
  exclusiveId?: string
}) {
  const { styles: uiStyles, tokens } = useEditorUiStyles()

  function toggle(id: string) {
    if (exclusiveId && id === exclusiveId) {
      onChange([])
      return
    }
    const base = values.filter((v) => v !== exclusiveId)
    if (base.includes(id)) {
      onChange(base.filter((v) => v !== id))
    } else {
      onChange([...base, id])
    }
  }

  const noneActive = exclusiveId ? values.length === 0 : false

  return (
    <View style={uiStyles.field}>
      <EditorFieldLabel hint={hint}>{label}</EditorFieldLabel>
      <View style={uiStyles.multiChipWrap}>
        {options.map((opt) => {
          const active = opt.id === exclusiveId ? noneActive : values.includes(opt.id)
          return (
            <Pressable
              key={opt.id || "__empty__"}
              style={[uiStyles.multiChip, active && uiStyles.chipActive]}
              onPress={() => toggle(opt.id)}
            >
              {active ? (
                <Ionicons name="checkmark-circle" size={14} color={FACULTY_ASSESSMENT_COLOR.link} />
              ) : null}
              <Text style={[uiStyles.chipText, active && uiStyles.chipTextActive]}>{opt.label}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

export function EditorInlineFields({ children }: { children: ReactNode }) {
  const { styles: uiStyles } = useEditorUiStyles()
  return <View style={uiStyles.inlineFields}>{children}</View>
}

export function EditorInlineField({ children }: { children: ReactNode }) {
  const { styles: uiStyles } = useEditorUiStyles()
  return <View style={uiStyles.inlineField}>{children}</View>
}

export function EditorNotice({
  tone = "info",
  text,
}: {
  tone?: "info" | "warn" | "success"
  text: string
}) {
  const { styles: uiStyles, tokens, native } = useEditorUiStyles()
  const palette =
    tone === "warn"
      ? { bg: `${tokens.warning}18`, border: `${tokens.warning}44`, text: tokens.warning }
      : tone === "success"
        ? { bg: `${tokens.success}18`, border: `${tokens.success}44`, text: tokens.success }
        : { bg: native.fill, border: native.separator, text: native.label }
  return (
    <View style={[uiStyles.notice, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <Text style={[uiStyles.noticeText, { color: palette.text }]}>{text}</Text>
    </View>
  )
}

export function EditorDivider() {
  const { styles: uiStyles } = useEditorUiStyles()
  return <View style={uiStyles.divider} />
}
