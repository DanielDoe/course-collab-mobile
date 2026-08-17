import { StyleSheet, Text, View } from "react-native"
import { AI_DATA_DISCLOSURE } from "../../config/ai"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useNativeType } from "../../lib/themed-module-theme"

function DisclosureBlock({ title, body }: { title: string; body: string }) {
  const native = useThemedNative()
  const type = useNativeType()
  return (
    <View style={styles.block}>
      <Text style={[type.bodyEmphasis, { color: native.label }]}>{title}</Text>
      <Text style={[type.body, styles.body, { color: native.secondaryLabel }]}>{body}</Text>
    </View>
  )
}

export function AiDataDisclosureContent() {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()

  return (
    <View style={styles.root}>
      <View style={[styles.callout, { backgroundColor: tokens.accentSoft, borderColor: tokens.accentBorder }]}>
        <Text style={[type.caption, { color: native.secondaryLabel }]}>
          This summary describes how {AI_DATA_DISCLOSURE.productName} works in CourseCollab based on the current app
          implementation. It is not a substitute for the Privacy Policy.
        </Text>
      </View>

      <DisclosureBlock title="What Cora processes" body={AI_DATA_DISCLOSURE.thirdPartyDescription} />
      <DisclosureBlock title="Conversation storage" body={AI_DATA_DISCLOSURE.conversationStorage} />
      <DisclosureBlock title="Device preferences" body={AI_DATA_DISCLOSURE.localPreferences} />
      <DisclosureBlock title="Course context" body={AI_DATA_DISCLOSURE.courseContext} />
      <DisclosureBlock title="Membership" body={AI_DATA_DISCLOSURE.studentMembershipNote} />
      <DisclosureBlock title="Accuracy" body={AI_DATA_DISCLOSURE.accuracyNote} />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: 16 },
  callout: {
    padding: 12,
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
  },
  block: { gap: 6 },
  body: { lineHeight: 21 },
})
