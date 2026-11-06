import { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native"
import { AppAlert } from "../../lib/app-alert"
import { useRouter } from "expo-router"
import { useSession } from "../../context/SessionProvider"
import { useNotificationModuleRefresh } from "../../lib/notifications/notification-events"
import { ApiError } from "../../lib/student-api"
import type { StudentSession } from "../../lib/session"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useThemedNative } from "../../context/AppearanceProvider"
import {
  collaborationApi,
  formatRelativeTime,
  type GroupRecord,
  type OpenCall,
} from "../../lib/collaboration-api"
import { collabListThumb } from "../../lib/collaboration-list-theme"
import {
  CommEmptyState,
  CommSectionFooter,
  CommSectionHeader,
} from "../faculty/faculty-communication-ui"
import { SignatureListCard } from "../theme/SignatureListCard"
import { signatureListStyles } from "../theme/TabbedModuleLayout"
import { CollabFlowHeader } from "./collab-nav"
import { CollabActionSheet, type CollabSheetOption } from "./collab-native-sheet"

function useStudentSession(): StudentSession | null {
  const { session } = useSession()
  return session?.portal === "student" ? session : null
}

export function GroupsDiscoverScreen() {
  const session = useStudentSession()
  const router = useRouter()
  const native = useThemedNative()
  const [openGroups, setOpenGroups] = useState<GroupRecord[]>([])
  const [openCalls, setOpenCalls] = useState<OpenCall[]>([])
  const [loading, setLoading] = useState(true)
  const [sheet, setSheet] = useState<{ title: string; message?: string; options: CollabSheetOption[] } | null>(null)

  const load = useCallback(async () => {
    if (!session) return
    try {
      const res = await collaborationApi.getGroupsDiscover(session)
      setOpenGroups(res.openGroups)
      setOpenCalls(res.openCalls)
    } catch {
      setOpenGroups([])
      setOpenCalls([])
    }
  }, [session])

  useEffect(() => {
    if (!session) {
      setLoading(false)
      return
    }
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load, session])

  useNotificationModuleRefresh("groups", load)

  const requestJoin = async (groupId: number) => {
    if (!session) return
    try {
      await collaborationApi.requestJoinGroup(session, groupId)
      AppAlert.alert("Request Sent", "The group leader will review your request.")
    } catch (err) {
      AppAlert.alert("Failed", err instanceof ApiError ? err.message : "Could not send request.")
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: native.groupedBackground }]}>
      <CollabFlowHeader title="Discover Groups" subtitle="Join open teams or browse calls" fallbackHref="/module/groups" />
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator color={native.tint} style={{ marginTop: 24 }} />
        ) : (
          <>
            <CommSectionHeader title="Open Groups" />
            {openGroups.length === 0 ? (
              <CommEmptyState icon="people-outline" title="No Open Groups" body="No groups are accepting members right now." />
            ) : (
              <View style={signatureListStyles.list}>
                {openGroups.map((group, index) => (
                  <SignatureListCard
                    key={group.id}
                    index={index}
                    title={group.name}
                    subtitle={group.leader_name ? `Led by ${group.leader_name}` : "Course group"}
                    meta={`${group.member_count ?? 0}/4 members`}
                    metaIcon="people-outline"
                    statusLabel="Open to join"
                    statusIcon="radio-outline"
                    icon="people"
                    accent={collabListThumb(index).label}
                    onPress={() =>
                      setSheet({
                        title: group.name,
                        message: group.leader_name ? `Led by ${group.leader_name}` : undefined,
                        options: [
                          {
                            label: "Request to Join",
                            icon: "person-add-outline",
                            onPress: () => void requestJoin(group.id),
                          },
                          {
                            label: "View Group",
                            icon: "people-outline",
                            onPress: () => router.push(`/collaboration/groups/${group.id}` as never),
                          },
                        ],
                      })
                    }
                  />
                ))}
              </View>
            )}

            <CommSectionHeader title="Open Calls" />
            {openCalls.length === 0 ? (
              <CommEmptyState icon="megaphone-outline" title="No Open Calls" body="No students are looking for teammates right now." />
            ) : (
              <View style={signatureListStyles.list}>
                {openCalls.map((call, index) => (
                  <SignatureListCard
                    key={call.id}
                    index={index}
                    title={call.title}
                    subtitle={call.message || (call.owner_name ?? call.group_name ?? "Student")}
                    meta={formatRelativeTime(call.created_at)}
                    metaIcon="megaphone-outline"
                    statusLabel="Open"
                    statusIcon="radio-outline"
                    icon="megaphone-outline"
                    accent={collabListThumb(index).label}
                    onPress={
                      call.group_id
                        ? () => router.push(`/collaboration/groups/${call.group_id}` as never)
                        : undefined
                    }
                  />
                ))}
              </View>
            )}
            <CommSectionFooter>Open groups and calls use the same discovery feed as the web app.</CommSectionFooter>
          </>
        )}
      </ScrollView>
      <CollabActionSheet
        visible={sheet != null}
        onClose={() => setSheet(null)}
        title={sheet?.title ?? ""}
        message={sheet?.message}
        options={sheet?.options ?? []}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: NATIVE.pagePadding, gap: 12, paddingBottom: 40 },
})
