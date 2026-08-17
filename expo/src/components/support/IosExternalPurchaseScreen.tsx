import { Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native"
import { Redirect, useRouter } from "expo-router"
import { Ionicons } from "@/components/icons/AppIcon"
import { ModuleScreen } from "../modules/ModuleScreen"
import { NotetakerScreenHeader } from "../notetaker/NotetakerScreenHeader"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useNativeType } from "../../lib/themed-module-theme"
import {
  iosCoraCreditsPurchaseNotice,
  iosMembershipPurchaseNotice,
  membershipWebCheckoutUrl,
} from "../../lib/compliance/ios-purchase-policy"
import { AppAlert } from "../../lib/app-alert"

type Props = {
  title: string
  webPath: string
  notice?: string
  fallbackHref?: string
}

export function IosExternalPurchaseScreen({
  title,
  webPath,
  notice = iosMembershipPurchaseNotice(),
  fallbackHref = "/membership",
}: Props) {
  const router = useRouter()
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const url = membershipWebCheckoutUrl(webPath)

  async function openWebCheckout() {
    try {
      const canOpen = await Linking.canOpenURL(url)
      if (!canOpen) {
        AppAlert.alert("Unable to open link", url)
        return
      }
      await Linking.openURL(url)
    } catch {
      AppAlert.alert("Unable to open link", "Try again from Safari on course-collab.com.")
    }
  }

  if (Platform.OS !== "ios") {
    return <Redirect href={fallbackHref as never} />
  }

  return (
    <View style={[styles.root, { backgroundColor: native.groupedBackground }]}>
      <NotetakerScreenHeader title={title} fallbackHref={fallbackHref} />
      <ModuleScreen disableTopInsetAdjustment>
        <View style={[styles.card, tokens.cardShadow, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
          <Ionicons name="globe-outline" size={28} color={tokens.accent} />
          <Text style={[type.bodyEmphasis, { color: native.label }]}>Upgrade on the web</Text>
          <Text style={[type.body, styles.body, { color: native.secondaryLabel }]}>{notice}</Text>
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: tokens.accent }]}
            onPress={() => void openWebCheckout()}
            accessibilityRole="button"
          >
            <Text style={[type.bodyEmphasis, { color: "#fff" }]}>Open CourseCollab checkout</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={() => router.back()} accessibilityRole="button">
            <Text style={[type.body, { color: tokens.accent }]}>Not now</Text>
          </Pressable>
        </View>
      </ModuleScreen>
    </View>
  )
}

export function IosCoraCreditsPurchaseScreen(props: Omit<Props, "notice">) {
  return <IosExternalPurchaseScreen {...props} notice={iosCoraCreditsPurchaseNotice()} />
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  card: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    gap: 12,
    alignItems: "flex-start",
  },
  body: { lineHeight: 22 },
  primaryBtn: {
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    borderRadius: NATIVE.sectionRadius,
    marginTop: 4,
  },
  secondaryBtn: {
    alignSelf: "center",
    paddingVertical: 8,
  },
})
