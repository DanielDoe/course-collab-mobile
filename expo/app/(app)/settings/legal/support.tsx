import { useRouter } from "expo-router"
import { LegalDocumentScreen } from "../../../../src/components/settings/LegalDocumentScreen"

export default function SupportRoute() {
  const router = useRouter()

  return (
    <LegalDocumentScreen
      docId="support"
      title="Support"
      footerAction={{
        label: "Open Help Center",
        onPress: () => router.push("/module/help-center" as never),
      }}
    />
  )
}
