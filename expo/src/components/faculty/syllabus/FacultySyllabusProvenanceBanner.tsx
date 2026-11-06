import { StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import type { SyllabusTemplateProvenance } from "../../../lib/syllabus-exchange-types"
import { useThemedNative } from "../../../context/AppearanceProvider"
import { useNativeType } from "../../../lib/themed-module-theme"
import { NATIVE } from "../../../constants/faculty-native-theme"

type Props = {
  provenance: SyllabusTemplateProvenance
}

export function FacultySyllabusProvenanceBanner({ provenance }: Props) {
  const native = useThemedNative()
  const type = useNativeType()

  const source = [
    provenance.sourceCourseCode,
    provenance.sourceSessionCode,
    provenance.sourceTerm,
    provenance.sourceInstructorName,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <View style={[styles.wrap, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
      <Ionicons name="information-circle-outline" size={18} color={native.secondaryLabel} />
      <View style={styles.copy}>
        <Text style={[type.caption, { color: native.label, fontWeight: "600" }]}>
          Applied from syllabus template
        </Text>
        <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 18 }]} numberOfLines={3}>
          {source}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  copy: { flex: 1, gap: 4 },
})
