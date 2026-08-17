import { ScrollView, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useModuleScrollContentPadding } from "../../context/ChromeInsetContext"
import { getFacultyModuleMeta } from "../../lib/faculty-module-meta"
import { NATIVE } from "../../constants/faculty-native-theme"
import { FACULTY_ADMIN_COLOR } from "../../lib/faculty-admin-theme"
import { useModuleTheme } from "../../lib/themed-module-shell"

export function FacultyModulePlaceholderScreen({ moduleId }: { moduleId: string }) {
  const { styles: moduleStyles, native, type } = useModuleTheme()
  const scrollPad = useModuleScrollContentPadding(32)
  const meta = getFacultyModuleMeta(moduleId)

  return (
    <ScrollView
      style={[moduleStyles.scroll, styles.scroll]}
      contentContainerStyle={[styles.content, scrollPad]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.hero, { backgroundColor: native.secondaryGrouped }]}>
        <View style={[styles.iconWrap, { backgroundColor: `${FACULTY_ADMIN_COLOR.link}18` }]}>
          <Ionicons name={meta.icon} size={28} color={FACULTY_ADMIN_COLOR.link} />
        </View>
        <Text style={[type.sheetTitle, styles.title, { color: native.label }]}>{meta.title}</Text>
        <Text style={[type.secondary, styles.summary, { color: native.secondaryLabel }]}>{meta.summary}</Text>
      </View>

      <Text style={[type.sectionHeader, styles.sectionHeader, { color: native.secondaryLabel }]}>
        Planned Capabilities
      </Text>
      <View style={[styles.card, { backgroundColor: native.secondaryGrouped }]}>
        {meta.features.map((feature, index) => (
          <View
            key={feature}
            style={[
              styles.featureRow,
              index < meta.features.length - 1 && {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: native.separator,
              },
            ]}
          >
            <Ionicons name="checkmark-circle" size={18} color={FACULTY_ADMIN_COLOR.link} />
            <Text style={[type.body, styles.featureText, { color: native.label }]}>{feature}</Text>
          </View>
        ))}
      </View>

      <Text style={[type.caption, styles.footer, { color: native.secondaryLabel }]}>
        Native tools for {meta.title.toLowerCase()} are coming soon to mobile.
      </Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: NATIVE.pagePadding, gap: 12 },
  hero: {
    borderRadius: NATIVE.sectionRadius,
    padding: 20,
    gap: 10,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {},
  summary: { lineHeight: 22 },
  sectionHeader: {
    textTransform: "none",
    paddingHorizontal: 4,
    marginTop: 8,
  },
  card: {
    borderRadius: NATIVE.sectionRadius,
    overflow: "hidden",
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: NATIVE.rowMinHeight,
  },
  featureText: { flex: 1 },
  footer: { paddingHorizontal: 4, paddingTop: 4 },
})
