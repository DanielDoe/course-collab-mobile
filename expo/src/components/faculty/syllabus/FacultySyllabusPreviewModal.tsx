import { useMemo, useState } from "react"
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { InstructorSyllabus } from "../../../lib/instructor-api"
import {
  getSyllabusSectionDisplayTitle,
  getSyllabusSectionId,
  prepareSyllabusForDisplay,
} from "../../../lib/syllabus"
import { SyllabusSectionContent } from "../../course-info/SyllabusSectionContent"
import { useThemedNative } from "../../../context/AppearanceProvider"
import { useNativeType } from "../../../lib/themed-module-theme"
import { NATIVE } from "../../../constants/faculty-native-theme"
import { COURSE_INFO_ACTION } from "../../../lib/course-info-color-theme"

type Props = {
  visible: boolean
  syllabus: InstructorSyllabus | null
  onClose: () => void
}

export function FacultySyllabusPreviewModal({ visible, syllabus, onClose }: Props) {
  const insets = useSafeAreaInsets()
  const native = useThemedNative()
  const type = useNativeType()
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())

  const prepared = useMemo(
    () => (syllabus ? prepareSyllabusForDisplay(syllabus) : null),
    [syllabus],
  )

  const sections = prepared?.sections ?? []

  if (!syllabus) return null

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: native.groupedBackground, paddingTop: insets.top }]}>
        <View style={[styles.header, { borderBottomColor: native.separator }]}>
          <Pressable onPress={onClose} accessibilityRole="button" hitSlop={8}>
            <Text style={[type.body, { color: COURSE_INFO_ACTION.fill, fontWeight: "600" }]}>Close</Text>
          </Pressable>
          <Text style={[type.bodyEmphasis, styles.headerTitle]}>Student preview</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.hero, { backgroundColor: native.secondaryGrouped }]}>
            <Text style={[type.bodyEmphasis, { color: native.label, textAlign: "center", fontSize: 20 }]}>
              {syllabus.title}
            </Text>
            {syllabus.term ? (
              <Text style={[type.caption, { color: native.secondaryLabel, textAlign: "center" }]}>
                {syllabus.term}
              </Text>
            ) : null}
          </View>

          {sections.map((section, index) => {
            const id = getSyllabusSectionId(section, index)
            const open = openIds.has(id)
            const title = getSyllabusSectionDisplayTitle(section)
            return (
              <View
                key={id}
                style={[styles.section, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}
              >
                <Pressable
                  style={styles.sectionHead}
                  onPress={() => toggle(id)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open }}
                >
                  <Text style={[type.bodyEmphasis, { color: native.label, flex: 1 }]}>{title}</Text>
                  <Ionicons
                    name={open ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={native.tertiaryLabel}
                  />
                </Pressable>
                {open ? (
                  <View style={styles.sectionBody}>
                    <SyllabusSectionContent section={section} />
                  </View>
                ) : null}
              </View>
            )
          })}
        </ScrollView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 17 },
  headerSpacer: { width: 48 },
  content: { padding: 16, gap: 10 },
  hero: { borderRadius: NATIVE.sectionRadius, padding: 16, gap: 6 },
  section: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  sectionBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
})
