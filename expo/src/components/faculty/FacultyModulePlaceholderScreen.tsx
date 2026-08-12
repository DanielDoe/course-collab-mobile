import { ScrollView, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useModuleScrollContentPadding } from "../../context/ChromeInsetContext"
import { getFacultyModuleMeta } from "../../lib/faculty-module-meta"
import { NATIVE, nativeType } from "../../constants/faculty-native-theme"
import { useModuleTheme } from "../../lib/themed-module-shell"

export function FacultyModulePlaceholderScreen({ moduleId }: { moduleId: string }) {
  const { styles: moduleStyles, native, tokens, type } = useModuleTheme()
  const scrollPad = useModuleScrollContentPadding(32)
  const meta = getFacultyModuleMeta(moduleId)

  return (
    <ScrollView
      style={[moduleStyles.scroll, styles.scroll]}
      contentContainerStyle={[styles.content, scrollPad]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <View style={styles.iconWrap}>
          <Ionicons name={meta.icon} size={28} color={NATIVE.accent} />
        </View>
        <Text style={styles.title}>{meta.title}</Text>
        <Text style={styles.summary}>{meta.summary}</Text>
      </View>

      <Text style={styles.sectionHeader}>Planned Capabilities</Text>
      <View style={styles.card}>
        {meta.features.map((feature, index) => (
          <View
            key={feature}
            style={[styles.featureRow, index < meta.features.length - 1 && styles.featureBorder]}
          >
            <Ionicons name="checkmark-circle" size={18} color={NATIVE.accent} />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.footer}>
        Native tools for {meta.title.toLowerCase()} are coming soon to mobile.
      </Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1},
  content: { padding: NATIVE.pagePadding, gap: 12 },
  hero: {
    borderRadius: NATIVE.sectionRadius,
    padding: 20,
    gap: 10},
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"},
  title: nativeType.sheetTitle,
  summary: { ...nativeType.secondary, lineHeight: 22 },
  sectionHeader: { ...nativeType.sectionHeader, paddingHorizontal: 4, marginTop: 8 },
  card: {
    borderRadius: NATIVE.sectionRadius,
    overflow: "hidden"},
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: NATIVE.rowMinHeight},
  featureBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: NATIVE.separator},
  featureText: { ...nativeType.body, flex: 1 },
  footer: { ...nativeType.caption, paddingHorizontal: 16, paddingTop: 4 }})
