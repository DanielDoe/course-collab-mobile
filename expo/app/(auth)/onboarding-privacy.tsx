import { Redirect } from "expo-router"

export default function OnboardingPrivacyRoute() {
  return <Redirect href="/(auth)/onboarding-terms" />
}
