import { Image, type ImageContentFit, type ImageStyle } from "expo-image"
import type { StyleProp } from "react-native"
import { displayImageUrl, type ImageVariant } from "../../lib/media/image-url"

type Props = {
  uri: string
  variant?: ImageVariant
  style?: StyleProp<ImageStyle>
  contentFit?: ImageContentFit
  recyclingKey?: string
  onError?: () => void
  accessibilityLabel?: string
}

/** Disk-cached remote image. Request the smallest variant that still looks correct. */
export function CachedRemoteImage({
  uri,
  variant = "medium",
  style,
  contentFit = "cover",
  recyclingKey,
  onError,
  accessibilityLabel,
}: Props) {
  return (
    <Image
      source={{ uri: displayImageUrl(uri, variant) }}
      style={style}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      recyclingKey={recyclingKey ?? `${variant}:${uri}`}
      transition={0}
      allowDownscaling
      onError={onError}
      accessibilityLabel={accessibilityLabel}
    />
  )
}
