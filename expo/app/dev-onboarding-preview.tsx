import { OnboardingDemoGallery } from "../src/components/login/OnboardingDemoGallery"

/** Dev-only static gallery of all onboarding screens. Open: coursecollab://dev-onboarding-preview */
export default function DevOnboardingPreviewScreen() {
  if (!__DEV__) return null
  return <OnboardingDemoGallery />
}
