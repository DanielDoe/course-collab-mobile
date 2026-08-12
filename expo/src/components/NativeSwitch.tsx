import { Platform, Switch, type SwitchProps } from "react-native"
import { useThemedNative } from "../context/AppearanceProvider"

export type NativeSwitchProps = Pick<
  SwitchProps,
  "value" | "onValueChange" | "disabled" | "testID" | "accessibilityLabel" | "style"
> & {
  /** When set, overrides appearance accent for the ON track (faculty sheets use cyan link). */
  activeTrackColor?: string
}

/**
 * Platform-native toggle (UISwitch / Material Switch) using the active appearance theme.
 */
export function NativeSwitch({
  value,
  onValueChange,
  disabled,
  style,
  activeTrackColor,
  ...rest
}: NativeSwitchProps) {
  const native = useThemedNative()
  const trackColor = {
    false: native.switchTrackOff,
    true: activeTrackColor ?? native.switchTrackOn,
  }

  if (Platform.OS === "ios") {
    return (
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={trackColor}
        ios_backgroundColor={native.switchIosOffBackground}
        style={style}
        {...rest}
      />
    )
  }

  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={trackColor}
      thumbColor={value ? native.switchAndroidThumbOn : native.switchAndroidThumbOff}
      style={style}
      {...rest}
    />
  )
}

/** @deprecated Use NativeSwitch */
export const FacultyNativeSwitch = NativeSwitch
