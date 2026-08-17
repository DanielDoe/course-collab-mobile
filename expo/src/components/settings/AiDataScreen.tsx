import { StyleSheet, View } from "react-native"
import { NotetakerScreenHeader } from "../notetaker/NotetakerScreenHeader"
import { ModuleScreen } from "../modules/ModuleScreen"
import { AiDataDisclosureContent } from "./AiDataDisclosureContent"
import { useThemedNative } from "../../context/AppearanceProvider"
import { NATIVE } from "../../constants/faculty-native-theme"

export function AiDataScreen() {
  const native = useThemedNative()

  return (
    <View style={[styles.screenRoot, { backgroundColor: native.groupedBackground }]}>
      <NotetakerScreenHeader title="AI & Data" fallbackHref="/settings/privacy-security" />
      <ModuleScreen disableTopInsetAdjustment>
        <View style={[styles.card, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
          <AiDataDisclosureContent />
        </View>
      </ModuleScreen>
    </View>
  )
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1 },
  card: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
})
