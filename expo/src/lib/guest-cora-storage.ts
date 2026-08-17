import * as SecureStore from "expo-secure-store"
import type { GuestCoraConversation } from "./guest-types"

const STORAGE_KEY = "guest_cora_conversations_v1"

export async function loadGuestCoraConversations(): Promise<GuestCoraConversation[]> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isGuestCoraConversation)
  } catch {
    return []
  }
}

export async function saveGuestCoraConversations(conversations: GuestCoraConversation[]): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(conversations))
}

export async function clearGuestCoraConversations(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEY)
}

export async function upsertGuestCoraConversation(conversation: GuestCoraConversation): Promise<void> {
  const list = await loadGuestCoraConversations()
  const next = [conversation, ...list.filter((item) => item.id !== conversation.id)].slice(0, 40)
  await saveGuestCoraConversations(next)
}

export function createGuestCoraConversation(title = "New conversation"): GuestCoraConversation {
  const now = new Date().toISOString()
  return {
    id: `guest-cora-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    updatedAt: now,
    requestId: null,
    messages: [],
  }
}

function isGuestCoraConversation(value: unknown): value is GuestCoraConversation {
  if (!value || typeof value !== "object") return false
  const record = value as Record<string, unknown>
  return (
    typeof record.id === "string" &&
    typeof record.title === "string" &&
    typeof record.updatedAt === "string" &&
    Array.isArray(record.messages)
  )
}
