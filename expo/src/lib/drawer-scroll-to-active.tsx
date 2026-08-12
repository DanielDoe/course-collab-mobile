import { useCallback, useEffect, useRef, type ReactNode, type RefObject } from "react"
import { ScrollView, View, type View as ViewType } from "react-native"

const SCROLL_LEAD = 20
/** Wait for drawer open animation before measuring row positions. */
const OPEN_ANIM_MS = 260

export function useDrawerScrollToActive(activeItemId: string | null, drawerOpen: boolean) {
  const scrollRef = useRef<ScrollView>(null)
  const contentRef = useRef<ViewType>(null)
  const rowRefs = useRef<Map<string, RefObject<ViewType | null>>>(new Map())

  const registerRow = useCallback((itemId: string, ref: RefObject<ViewType | null>) => {
    rowRefs.current.set(itemId, ref)
  }, [])

  const unregisterRow = useCallback((itemId: string) => {
    rowRefs.current.delete(itemId)
  }, [])

  const scrollToActive = useCallback(() => {
    if (!activeItemId) return
    const scroll = scrollRef.current
    const content = contentRef.current
    const row = rowRefs.current.get(activeItemId)?.current
    if (!scroll || !content || !row) return

    row.measureLayout(
      content,
      (_x, y) => {
        scroll.scrollTo({ y: Math.max(0, y - SCROLL_LEAD), animated: true })
      },
      () => {},
    )
  }, [activeItemId])

  useEffect(() => {
    if (!drawerOpen || !activeItemId) return
    const timer = setTimeout(scrollToActive, OPEN_ANIM_MS)
    const retry = setTimeout(scrollToActive, OPEN_ANIM_MS + 360)
    return () => {
      clearTimeout(timer)
      clearTimeout(retry)
    }
  }, [drawerOpen, activeItemId, scrollToActive])

  return { scrollRef, contentRef, registerRow, unregisterRow, scrollToActive }
}

type DrawerNavAnchorProps = {
  itemId: string
  registerRow: (itemId: string, ref: RefObject<ViewType | null>) => void
  unregisterRow: (itemId: string) => void
  children: ReactNode
}

/** Wraps a drawer row so we can scroll the menu to the active module on open. */
export function DrawerNavAnchor({ itemId, registerRow, unregisterRow, children }: DrawerNavAnchorProps) {
  const ref = useRef<ViewType>(null)

  useEffect(() => {
    registerRow(itemId, ref)
    return () => unregisterRow(itemId)
  }, [itemId, registerRow, unregisterRow])

  return (
    <View ref={ref} collapsable={false}>
      {children}
    </View>
  )
}
