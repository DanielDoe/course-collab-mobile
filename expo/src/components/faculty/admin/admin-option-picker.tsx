import { ScrollView } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { FACULTY_ADMIN_COLOR } from "../../../lib/faculty-admin-theme"
import { GlassFilterOptionRow, GlassMenuList } from "../../theme/GlassActionSheetMenu"
import { FacultySheetChrome, FacultySheetContainer, FacultySheetModal } from "../faculty-collab-sheet-ui"

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
  const insets = useSafeAreaInsets()

  return (
    <FacultySheetModal visible={visible} onRequestClose={onClose}>
      <FacultySheetContainer style={{ flex: 1 }}>
        <FacultySheetChrome
          topInset={0}
          title={title}
          onClose={onClose}
          accentColor={FACULTY_ADMIN_COLOR.link}
          pageSheet
        />
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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
        </ScrollView>
      </FacultySheetContainer>
    </FacultySheetModal>
  )
}
