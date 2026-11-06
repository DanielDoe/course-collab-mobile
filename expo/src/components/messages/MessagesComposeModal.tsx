import { useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { presentApiError, type ApiErrorPresentation } from "../../lib/present-api-error"
import {
  messagesApi,
  type MessageRecipient,
  type MessagesAuth,
} from "../../lib/messages-api"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { FACULTY_COMMUNICATION_COLOR, FACULTY_COMM_BUTTON_RADIUS } from "../../lib/faculty-communication-theme"
import { FacultySheetChrome, FacultySheetContainer } from "../faculty/faculty-collab-sheet-ui"
import { AppErrorNotice } from "../errors/AppErrorNotice"
import { usePresenceTracking } from "../../hooks/usePresenceTracking"
import { MessageAvatar } from "./messages-ui"
import { AppAlert } from "../../lib/app-alert"
import {
  LOCAL_DEVICE_FILE_PASTE_ERROR,
  messageIsOnlyLocalDeviceFile,
  plainTextHasLocalDeviceFileUrl,
  stripLocalDeviceFileUrls,
} from "../../lib/message-local-file"

type Props = {
  visible: boolean
  auth: MessagesAuth
  onClose: () => void
  onSent: (threadId: number) => void
  initialBody?: string
  initialSubject?: string
  title?: string
}

export function MessagesComposeModal({
  visible,
  auth,
  onClose,
  onSent,
  initialBody = "",
  initialSubject = "",
  title = "New message",
}: Props) {
  const insets = useSafeAreaInsets()
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()

  const [recipientQuery, setRecipientQuery] = useState("")
  const [recipientResults, setRecipientResults] = useState<MessageRecipient[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedRecipient, setSelectedRecipient] = useState<MessageRecipient | null>(null)
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<ApiErrorPresentation | null>(null)

  const composeParticipants = useMemo(
    () => recipientResults.map((recipient) => ({ kind: recipient.kind, id: recipient.id })),
    [recipientResults],
  )
  const { getStatus } = usePresenceTracking(composeParticipants)

  useEffect(() => {
    if (!visible) {
      setRecipientQuery("")
      setRecipientResults([])
      setSelectedRecipient(null)
      setSubject("")
      setBody("")
      setError(null)
      return
    }
    setSubject(initialSubject)
    setBody(initialBody)
  }, [visible, initialBody, initialSubject])

  useEffect(() => {
    if (!visible) return
    const q = recipientQuery.trim()
    if (q.length < 2) {
      setRecipientResults([])
      return
    }

    const timer = setTimeout(() => {
      setSearching(true)
      messagesApi
        .searchRecipients(auth, q)
        .then((data) => setRecipientResults(data.recipients ?? []))
        .catch(() => setRecipientResults([]))
        .finally(() => setSearching(false))
    }, 250)

    return () => clearTimeout(timer)
  }, [auth, recipientQuery, visible])

  function handleBodyChange(next: string) {
    if (plainTextHasLocalDeviceFileUrl(next)) {
      setBody(stripLocalDeviceFileUrls(next))
      AppAlert.alert("Photo didn't upload", LOCAL_DEVICE_FILE_PASTE_ERROR)
      return
    }
    setBody(next)
  }

  async function handleSend() {
    if (messageIsOnlyLocalDeviceFile(body)) {
      AppAlert.alert("Photo didn't upload", LOCAL_DEVICE_FILE_PASTE_ERROR)
      return
    }
    if (!selectedRecipient || !body.trim()) return
    setSending(true)
    setError(null)
    try {
      const result = await messagesApi.createThread(auth, {
        recipientKind: selectedRecipient.kind,
        recipientId: selectedRecipient.id,
        subject: subject.trim() || null,
        body: body.trim(),
      })
      if (!result.threadId) throw new Error("Send failed")
      onSent(result.threadId)
    } catch (err) {
      setError(
        presentApiError(err, {
          feature: "New message",
          fallbackMessage: "Could not send your message.",
        }),
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <FacultySheetContainer style={styles.root}>
        <FacultySheetChrome topInset={insets.top} title={title} onClose={onClose} accentColor={FACULTY_COMMUNICATION_COLOR.link} />
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        >
          <Text style={[type.caption, styles.label, { color: native.secondaryLabel }]}>To</Text>
          {selectedRecipient ? (
            <View style={[styles.selectedRecipient, { backgroundColor: native.fill }]}>
              <MessageAvatar
                name={selectedRecipient.displayName}
                presenceStatus={getStatus(selectedRecipient.kind, selectedRecipient.id)}
              />
              <View style={styles.selectedCopy}>
                <Text style={type.bodyEmphasis} numberOfLines={1}>
                  {selectedRecipient.displayName}
                </Text>
                <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={1}>
                  {selectedRecipient.subtitle}
                </Text>
              </View>
              <Pressable onPress={() => setSelectedRecipient(null)} hitSlop={8}>
                <Ionicons name="close-circle" size={20} color={native.secondaryLabel} />
              </Pressable>
            </View>
          ) : (
            <>
              <View style={[styles.searchBox, { backgroundColor: native.fill }]}>
                <Ionicons name="search-outline" size={18} color={native.tertiaryLabel} />
                <TextInput
                  style={[styles.searchInput, { color: native.label }]}
                  value={recipientQuery}
                  onChangeText={setRecipientQuery}
                  placeholder="Search name, email, or student ID…"
                  placeholderTextColor={native.tertiaryLabel}
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="Search recipients"
                  testID="compose-search-recipients"
                />
                {searching ? <ActivityIndicator size="small" color={FACULTY_COMMUNICATION_COLOR.link} /> : null}
              </View>
              {recipientResults.map((recipient) => (
                <Pressable
                  key={`${recipient.kind}-${recipient.id}`}
                  style={[styles.resultRow, { backgroundColor: native.secondaryGrouped }]}
                  accessibilityRole="button"
                  accessibilityLabel={`${recipient.displayName}, ${recipient.subtitle}`}
                  onPress={() => {
                    setSelectedRecipient(recipient)
                    setRecipientQuery("")
                    setRecipientResults([])
                  }}
                >
                  <MessageAvatar
                    name={recipient.displayName}
                    presenceStatus={getStatus(recipient.kind, recipient.id)}
                  />
                  <View style={styles.resultCopy}>
                    <Text style={type.bodyEmphasis} numberOfLines={1}>
                      {recipient.displayName}
                    </Text>
                    <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={1}>
                      {recipient.subtitle}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </>
          )}

          <Text style={[type.caption, styles.label, { color: native.secondaryLabel }]}>Subject (optional)</Text>
          <TextInput
            style={[styles.field, { color: native.label, backgroundColor: native.fill }]}
            value={subject}
            onChangeText={setSubject}
            placeholder="Topic or course context"
            placeholderTextColor={native.tertiaryLabel}
            accessibilityLabel="Message subject"
            testID="compose-message-subject"
          />

          <Text style={[type.caption, styles.label, { color: native.secondaryLabel }]}>Message</Text>
          <TextInput
            style={[styles.messageField, { color: native.label, backgroundColor: native.fill }]}
            value={body}
            onChangeText={handleBodyChange}
            placeholder="Write your message…"
            placeholderTextColor={native.tertiaryLabel}
            multiline
            textAlignVertical="top"
            accessibilityLabel="Message body"
            testID="compose-message-body"
          />

          {error ? (
            <AppErrorNotice
              presentation={error}
              variant="compact"
              onDismiss={() => setError(null)}
              style={styles.errorNotice}
            />
          ) : null}

          <Pressable
            style={[
              styles.sendBtn,
              {
                backgroundColor:
                  selectedRecipient && body.trim() ? tokens.accent : native.fill,
              },
            ]}
            disabled={!selectedRecipient || !body.trim() || sending}
            onPress={() => void handleSend()}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            testID="compose-send-message"
          >
            {sending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text
                style={[
                  type.bodyEmphasis,
                  { color: selectedRecipient && body.trim() ? "#ffffff" : native.tertiaryLabel },
                ]}
              >
                Send message
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </FacultySheetContainer>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { paddingHorizontal: 16, gap: 8 },
  label: { marginTop: 8, fontWeight: "600" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 16 },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
  },
  resultCopy: { flex: 1, minWidth: 0 },
  selectedRecipient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    padding: 12,
  },
  selectedCopy: { flex: 1, minWidth: 0 },
  field: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  messageField: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 120,
  },
  sendBtn: {
    marginTop: 12,
    borderRadius: FACULTY_COMM_BUTTON_RADIUS,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  errorNotice: { marginHorizontal: 0 },
})
