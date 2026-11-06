import { GlassFilterOptionRow, GlassMenuList } from "../../theme/GlassActionSheetMenu"
import { ModuleFilterBottomSheet } from "../../motion/ModuleFilterBottomSheet"

export type AdminOption<T extends string> = { value: T; label: string }

type Props<T extends string> = {
  visible: boolean
  title: string
  options: AdminOption<T>[]
  value: T
  onSelect: (value: T) => void
  onClose: () => void
}

export function AdminOptionPickerModal<T extends string>({
  visible,
  title,
  options,
  value,
  onSelect,
  onClose,
}: Props<T>) {
  return (
    <ModuleFilterBottomSheet visible={visible} title={title} onClose={onClose}>
      <GlassMenuList>
        {options.map((option, index) => (
          <GlassFilterOptionRow
            key={option.value}
            label={option.label}
            active={option.value === value}
            onPress={() => {
              onSelect(option.value)
              onClose()
            }}
            showSeparator={index < options.length - 1}
          />
        ))}
      </GlassMenuList>
    </ModuleFilterBottomSheet>
  )
}
