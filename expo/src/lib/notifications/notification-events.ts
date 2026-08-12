import { useEffect } from "react"
import {
  type NotificationModule,
  isMessageNotificationType,
  notificationTypeToModules,
} from "../notification-link"

export type { NotificationModule } from "../notification-link"
export type MessageRefreshPayload = {
  threadId?: number
}

type MessageRefreshListener = (payload?: MessageRefreshPayload) => void
type VoidListener = () => void

const messageListeners = new Set<MessageRefreshListener>()
const inboxListeners = new Set<VoidListener>()
const moduleListeners = new Map<NotificationModule, Set<VoidListener>>()

export function emitMessagesRefresh(payload?: MessageRefreshPayload) {
  messageListeners.forEach((listener) => listener(payload))
}

export function onMessagesRefresh(listener: MessageRefreshListener): () => void {
  messageListeners.add(listener)
  return () => messageListeners.delete(listener)
}

export function emitNotificationsRefresh() {
  inboxListeners.forEach((listener) => listener())
}

export function onNotificationsRefresh(listener: VoidListener): () => void {
  inboxListeners.add(listener)
  return () => inboxListeners.delete(listener)
}

export function emitModuleRefresh(modules: NotificationModule | NotificationModule[]) {
  const list = Array.isArray(modules) ? modules : [modules]
  for (const module of list) {
    moduleListeners.get(module)?.forEach((listener) => listener())
  }
}

export function onModuleRefresh(module: NotificationModule, listener: VoidListener): () => void {
  let set = moduleListeners.get(module)
  if (!set) {
    set = new Set()
    moduleListeners.set(module, set)
  }
  set.add(listener)
  return () => set!.delete(listener)
}

export function emitNotificationSideEffects(data: Record<string, unknown> | undefined) {
  const type = data?.type
  const link = typeof data?.link === "string" ? data.link : null

  if (isMessageNotificationType(type)) {
    emitMessagesRefresh({ threadId: parseThreadIdFromNotificationData(data) })
  }

  emitModuleRefresh(notificationTypeToModules(type, link))
  emitNotificationsRefresh()
}

export function parseThreadIdFromNotificationData(
  data: Record<string, unknown> | undefined,
): number | undefined {
  if (!data) return undefined
  const raw = data.threadId
  if (typeof raw === "number" && Number.isFinite(raw)) return raw
  if (typeof raw === "string" && /^\d+$/.test(raw)) return Number(raw)
  return undefined
}

/** Subscribe a screen/data loader to push-driven refreshes for one or more modules. */
export function useNotificationModuleRefresh(
  modules: NotificationModule | NotificationModule[],
  onRefresh: () => void | Promise<void>,
) {
  const moduleList = Array.isArray(modules) ? modules : [modules]

  useEffect(() => {
    const unsubs = moduleList.map((module) =>
      onModuleRefresh(module, () => void onRefresh()),
    )
    return () => unsubs.forEach((unsub) => unsub())
  }, [moduleList.join(","), onRefresh])
}

export { isMessageNotificationType, notificationTypeToModules }
