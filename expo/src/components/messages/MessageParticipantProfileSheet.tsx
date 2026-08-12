import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useEffect, useMemo, useState } from "react"
import { presentApiError, type ApiErrorPresentation } from "../../lib/present-api-error"
import {
  messagesApi,
  type MessageParticipantProfile,
  type MessageRecipient,
  type MessagesAuth,
} from "../../lib/messages-api"
import { formatParticipantSubtitleLine } from "../../lib/presence/format-presence-activity"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { FacultySheetChrome, FacultySheetContainer } from "../faculty/faculty-collab-sheet-ui"
import { AppErrorNotice } from "../errors/AppErrorNotice"
import { MessageAvatar } from "./messages-ui"
import { PresenceIndicator } from "../presence/PresenceIndicator"
import type { PresenceStatus } from "../../lib/presence/types"

type Props = {
  visible: boolean
  participant: MessageRecipient | null
  auth: MessagesAuth | null
  presenceStatus?: PresenceStatus
  presenceLastSeenAt?: string | null
  onClose: () => void
}

function roleLabelForProfile(profile: MessageParticipantProfile): string {
  return profile.categoryLabel?.trim() || profile.subtitle?.trim() || ""
}

export function MessageParticipantProfileSheet({
  visible,
  participant,
  auth,
  presenceStatus,
  presenceLastSeenAt,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ApiErrorPresentation | null>(null)
  const [profile, setProfile] = useState<MessageParticipantProfile | null>(null)

  useEffect(() => {
    if (!visible || !participant || !auth) {
      setProfile(null)
      setError(null)
      return
    }

    let mounted = true
    setLoading(true)
    setError(null)

    void messagesApi
      .getParticipantProfile(auth, participant.kind, participant.id)
      .then((data) => {
        if (mounted) setProfile(data.profile)
      })
      .catch((err) => {
        if (!mounted) return
        setError(
          presentApiError(err, {
            feature: "Profile",
            fallbackMessage: "Could not load this profile.",
          }),
        )
        setProfile(null)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [auth, participant, visible])

  const displayName = profile?.displayName ?? participant?.displayName ?? "Profile"

  const statusLine = useMemo(() => {
    if (!profile) return null
    const role = roleLabelForProfile(profile)
    return formatParticipantSubtitleLine(role, presenceStatus, presenceLastSeenAt)
  }, [profile, presenceStatus, presenceLastSeenAt])

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer style={styles.sheet}>
        <FacultySheetChrome topInset={insets.top} title={displayName} onClose={onClose} />
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={tokens.accent} />
            </View>
          ) : error ? (
            <AppErrorNotice presentation={error} onRetry={() => {
              if (!participant || !auth) return
              setLoading(true)
              void messagesApi
                .getParticipantProfile(auth, participant.kind, participant.id)
                .then((data) => setProfile(data.profile))
                .catch((err) =>
                  setError(
                    presentApiError(err, {
                      feature: "Profile",
                      fallbackMessage: "Could not load this profile.",
                    }),
                  ),
                )
                .finally(() => setLoading(false))
            }} />
          ) : profile ? (
            <View style={[styles.card, { backgroundColor: native.secondaryGrouped, borderColor: native.separator }]}>
              <View style={styles.hero}>
                <MessageAvatar name={profile.displayName} size={52} presenceStatus={presenceStatus} />
                <View style={styles.heroCopy}>
                  <Text style={[type.bodyEmphasis, { color: native.label }]}>{profile.displayName}</Text>
                  {statusLine ? (
                    <View style={styles.statusRow}>
                      {presenceStatus ? <PresenceIndicator status={presenceStatus} size="md" /> : null}
                      <Text style={[type.caption, { color: native.secondaryLabel, flex: 1 }]} numberOfLines={2}>
                        {statusLine}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              {profile.fields.length > 0 ? (
                <View style={styles.fields}>
                  {profile.fields.map((field) => (
                    <View key={field.label} style={[styles.fieldRow, { borderTopColor: native.separator }]}>
                      <Text style={[type.caption, styles.fieldLabel, { color: native.secondaryLabel }]}>
                        {field.label}
                      </Text>
                      <Text style={[type.body, { color: native.label, flex: 1 }]} selectable>
                        {field.value}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[type.secondary, { color: native.secondaryLabel, textAlign: "center" }]}>
                  No additional details available.
                </Text>
              )}
            </View>
          ) : null}
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}

const styles = StyleSheet.create({
  sheet: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  center: { paddingVertical: 48, alignItems: "center" },
  errorBox: { borderRadius: 12, padding: 12 },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    padding: 16,
    gap: 16,
  },
  hero: { flexDirection: "row", alignItems: "center", gap: 14 },
  heroCopy: { flex: 1, minWidth: 0, gap: 6 },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fields: { gap: 0 },
  fieldRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  fieldLabel: { width: 108, fontWeight: "600" },
})
