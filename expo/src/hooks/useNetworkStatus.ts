import { useEffect, useState } from "react"
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo"

/** Real offline only — never infer connectivity from request timing alone. */
export function useNetworkStatus() {
  const [connected, setConnected] = useState(true)

  useEffect(() => {
    const apply = (state: NetInfoState) => {
      setConnected(state.isConnected !== false)
    }
    const unsub = NetInfo.addEventListener(apply)
    NetInfo.fetch().then(apply)
    return () => unsub()
  }, [])

  return { connected, offline: !connected }
}
