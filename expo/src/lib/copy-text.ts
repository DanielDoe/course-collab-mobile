import { Share } from "react-native"

/** Copy text without extra native modules (works in Expo Go and existing dev builds). */
export async function copyText(text: string): Promise<void> {
  await Share.share({ message: text })
}
