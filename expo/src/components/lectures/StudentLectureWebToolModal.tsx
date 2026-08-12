import { Modal, StyleSheet, View } from "react-native"
import { WebModuleScreen } from "../modules/WebModuleScreen"
import { LectureSlidePreviewToolbar } from "./LectureSlidePreviewToolbar"
import type { LectureWebToolPanel } from "../../lib/web-session-inject"
import { buildLectureToolPanelInjectScript } from "../../lib/web-session-inject"

type Props = {
  visible: boolean
  webPath: string
  title: string
  panel?: LectureWebToolPanel
  extraInjectScript?: string
  onClose: () => void
}

/** Full-screen web lecture tool — opens workspace or sample practice, not the bare slide deck. */
export function StudentLectureWebToolModal({
  visible,
  webPath,
  title,
  panel,
  extraInjectScript,
  onClose,
}: Props) {
  const panelScript = panel ? buildLectureToolPanelInjectScript(panel) : undefined
  const combinedInject = [panelScript, extraInjectScript].filter(Boolean).join("\n") || undefined

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={styles.root}>
        <LectureSlidePreviewToolbar title={title} onBack={onClose} />
        <View style={styles.viewer}>
          <WebModuleScreen
            webPath={webPath}
            immersive
            immersiveLecture
            insetTop={false}
            extraInjectScript={combinedInject}
          />
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  viewer: { flex: 1, minHeight: 0 },
})
