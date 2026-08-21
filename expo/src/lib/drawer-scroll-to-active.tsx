import { useCallback, useEffect, useRef, type ReactNode, type RefObject } from "react"
import { ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent, type View as ViewType } from "react-native"

const SCROLL_LEAD = 28
/** Modal open + spring settle — retry until the active row has a real layout. */
const OPEN_RETRY_MS = [0, 48, 120, 220, 360, 560, 900] as const

export function useDrawerScrollToActive(activeItemId: string | null, drawerOpen: boolean) {
  const scrollRef = useRef<ScrollView>(null)
  const contentRef = useRef<ViewType>(null)
  const rowRefs = useRef<Map<string, RefObject<ViewType | null>>>(new Map())
  const rowYRef = useRef<Map<string, number>>(new Map())
  const scrollOffsetRef = useRef(0)
  const activeItemIdRef = useRef(activeItemId)
  const drawerOpenRef = useRef(drawerOpen)

  activeItemIdRef.current = activeItemId
  drawerOpenRef.current = drawerOpen

  const registerRow = useCallback((itemId: string, ref: RefObject<ViewType | null>) => {
    rowRefs.current.set(itemId, ref)
  }, [])

  const unregisterRow = useCallback((itemId: string) => {
    rowRefs.current.delete(itemId)
    rowYRef.current.delete(itemId)
  }, [])

  const cacheRowY = useCallback((itemId: string, y: number) => {
    if (!Number.isFinite(y)) return
    rowYRef.current.set(itemId, y)
  }, [])

  const scrollToActive = useCallback(() => {
    const id = activeItemIdRef.current
    if (!id) return
    const scroll = scrollRef.current
    if (!scroll) return

    const applyY = (y: number) => {
      cacheRowY(id, y)
      scroll.scrollTo({ y: Math.max(0, y - SCROLL_LEAD), animated: false })
    }

    const cached = rowYRef.current.get(id)
    if (typeof cached === "number") {
      applyY(cached)
      return
    }

    const content = contentRef.current
    const row = rowRefs.current.get(id)?.current
    if (!row) return

    if (content) {
      row.measureLayout(
        content,
        (_x, y) => applyY(y),
        () => {
          row.measureInWindow((_rx, rowY) => {
            scroll.measureInWindow((_sx, scrollY) => {
              applyY(scrollOffsetRef.current + (rowY - scrollY))
            })
          })
        },
      )
      return
    }

    row.measureInWindow((_rx, rowY) => {
      scroll.measureInWindow((_sx, scrollY) => {
        applyY(scrollOffsetRef.current + (rowY - scrollY))
      })
    })
  }, [cacheRowY])

  const onRowLayout = useCallback(
    (itemId: string) => {
      const content = contentRef.current
      const row = rowRefs.current.get(itemId)?.current
      if (!content || !row) return
      row.measureLayout(
        content,
        (_x, y) => {
          cacheRowY(itemId, y)
          if (drawerOpenRef.current && activeItemIdRef.current === itemId) {
            scrollToActive()
          }
        },
        () => {},
      )
    },
    [cacheRowY, scrollToActive],
  )

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffsetRef.current = event.nativeEvent.contentOffset.y
  }, [])

  useEffect(() => {
    if (!drawerOpen || !activeItemId) return
    const timers = OPEN_RETRY_MS.map((ms) => setTimeout(scrollToActive, ms))
    return () => {
      for (const timer of timers) clearTimeout(timer)
    }
  }, [drawerOpen, activeItemId, scrollToActive])

  return {
    scrollRef,
    contentRef,
    registerRow,
    unregisterRow,
    scrollToActive,
    onRowLayout,
    onScroll,
  }
}

type DrawerNavAnchorProps = {
  itemId: string
  registerRow: (itemId: string, ref: RefObject<ViewType | null>) => void
  unregisterRow: (itemId: string) => void
  onRowLayout?: (itemId: string) => void
  children: ReactNode
}

/** Wraps a drawer row so we can scroll the menu to the active module on open. */
export function DrawerNavAnchor({
  itemId,
  registerRow,
  unregisterRow,
  onRowLayout,
  children,
}: DrawerNavAnchorProps) {
  const ref = useRef<ViewType>(null)

  useEffect(() => {
    registerRow(itemId, ref)
    return () => unregisterRow(itemId)
  }, [itemId, registerRow, unregisterRow])

  return (
    <View
      ref={ref}
      collapsable={false}
      onLayout={() => {
        onRowLayout?.(itemId)
      }}
    >
      {children}
    </View>
  )
}
