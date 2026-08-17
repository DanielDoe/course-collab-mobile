import { StyleSheet, Text, View } from "react-native"
import { Ionicons, type IoniconName } from "@/components/icons/AppIcon"
import { LOGIN_PORTAL_THUMBS } from "../../lib/login-color-theme"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"
import { LoginBrandHeader } from "./LoginBrandHeader"
import { LoginBackLink, LoginPortalStack } from "./login-chrome"
import { useLoginTheme } from "./login-theme"

type Props = {
  onBack?: () => void
}

const EXPECTATIONS: Array<{ icon: IoniconName; title: string; body: string }> = [
  {
    icon: "school-outline",
    title: "Training Tracks",
    body: "Browse camp trainings, follow a learning roadmap, and submit checkpoints.",
  },
  {
    icon: "folder-open-outline",
    title: "Projects & Gallery",
    body: "Build camp projects and share work in the project gallery.",
  },
  {
    icon: "chatbubbles-outline",
    title: "Help & Messages",
    body: "Ask questions in discussions and message instructors from camp.",
  },
  {
    icon: "ribbon-outline",
    title: "Certificates & Graduation",
    body: "Earn achievements, climb the leaderboard, and finish with camp graduation.",
  },
]

export function SummerLoginPanel({ onBack }: Props) {
  const { LOGIN, loginType } = useLoginTheme()
  const thumb = LOGIN_PORTAL_THUMBS.summer

  return (
    <LoginPortalStack>
      <LoginBrandHeader
        title="Summer Camp"
        subtitle="Camper sign-in opens when camp starts."
      />

      <View
        style={[
          styles.badge,
          { backgroundColor: LOGIN.goldSoft, borderColor: `${LOGIN.gold}55` },
        ]}
        accessibilityRole="text"
        accessibilityLabel="Coming soon"
      >
        <Ionicons name="time-outline" size={16} color={LOGIN.goldInk} />
        <Text style={[styles.badgeLabel, { color: LOGIN.goldInk }]}>Coming Soon</Text>
      </View>

      <Text style={[loginType.panelDescription, styles.intro, { color: LOGIN.secondaryLabel }]}>
        Summer Camp sign-in is not open in this release. When camp starts, campers will sign in
        with the welcome email and password from their instructor.
      </Text>

      <View style={styles.section}>
        <Text style={[loginType.stepLabel, { color: LOGIN.label }]}>What To Expect</Text>
        <View
          style={[
            styles.list,
            {
              backgroundColor: LOGIN.grouped,
              borderColor: LOGIN.separator,
              borderRadius: LOGIN.sectionRadius,
            },
          ]}
        >
          {EXPECTATIONS.map((item, index) => (
            <View
              key={item.title}
              style={[
                styles.row,
                index < EXPECTATIONS.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: LOGIN.separator,
                },
              ]}
            >
              <SolidListThumbTile thumb={thumb} icon={item.icon} size="compact" />
              <View style={styles.rowCopy}>
                <Text style={[loginType.body, styles.rowTitle, { color: LOGIN.label }]}>
                  {item.title}
                </Text>
                <Text style={[loginType.info, { color: LOGIN.secondaryLabel }]}>{item.body}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View
        style={[
          styles.nextBox,
          {
            backgroundColor: LOGIN.accentSoft,
            borderColor: LOGIN.softBorder,
            borderRadius: LOGIN.sectionRadius,
          },
        ]}
      >
        <Text style={[loginType.stepLabel, styles.nextTitle, { color: LOGIN.label }]}>
          What You Can Do Now
        </Text>
        <Text style={[loginType.info, { color: LOGIN.secondaryLabel }]}>
          Watch for a camp welcome email when enrollment opens. If you already have a university
          course this term, use Student sign-in instead.
        </Text>
      </View>

      {onBack ? <LoginBackLink label="Other sign-in options" onPress={onBack} /> : null}
    </LoginPortalStack>
  )
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badgeLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  intro: {
    textAlign: "center",
    lineHeight: 22,
  },
  section: { gap: 10 },
  list: {
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowCopy: { flex: 1, gap: 2 },
  rowTitle: { fontWeight: "600" },
  nextBox: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  nextTitle: { fontSize: 15 },
})
