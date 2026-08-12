import { useEffect, useState } from "react"
import { StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { deleteTestThreads } from "../src/lib/ai-tutor-chat-storage"
import { deleteWorkspaceConversation } from "../src/lib/cora-api"
import { useSession } from "../src/context/SessionProvider"
import { BrandLoadingMark } from "../src/components/login/BrandLoadingMark"

/** Dev-only: delete Maestro/simulator test chats only. coursecollab://dev-cora-cleanup */
export default function DevCoraCleanupScreen() {
  const router = useRouter()
  const { session } = useSession()
  const [message, setMessage] = useState("Removing test chats…")

  useEffect(() => {
    if (!__DEV__) {
      router.replace("/dashboard")
      return
    }
    if (!session || session.portal !== "student") {
      setMessage("Student session required.")
      return
    }

    void (async () => {
      try {
        const { deletedIds } = await deleteTestThreads(session.databaseId)
        await Promise.all(
          deletedIds.map((id) => deleteWorkspaceConversation(session, id).catch(() => undefined)),
        )
        setMessage(
          deletedIds.length > 0
            ? `Removed ${deletedIds.length} test chat${deletedIds.length === 1 ? "" : "s"}.`
            : "No test chats found to remove.",
        )
        setTimeout(() => router.replace("/module/ai-tutor"), 800)
      } catch {
        setMessage("Cleanup failed.")
      }
    })()
  }, [router, session])

  if (!__DEV__) return null

  return (
    <View style={styles.boot}>
      {message === "Removing test chats…" ? <BrandLoadingMark /> : <Text style={styles.text}>{message}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  text: { color: "#334155", paddingHorizontal: 24, textAlign: "center" },
})
