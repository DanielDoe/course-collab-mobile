import { StyleSheet } from "react-native"

/** Shared compact controls for circuit / upload submission panels. */
export const circuitSubmissionUi = StyleSheet.create({
  modeSegment: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  modeSegmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    minHeight: 40,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  modeSegmentDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
  },
  modeLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionBtnPrimary: {
    minHeight: 52,
    paddingVertical: 14,
  },
  /** Taller tap target for PDF/image pick on tablet quiz layouts. */
  uploadDropZone: {
    minHeight: 136,
    paddingVertical: 22,
    paddingHorizontal: 16,
    flexDirection: "column",
    gap: 8,
    borderStyle: "dashed",
    borderWidth: 1.5,
  },
  actionBtnHalf: { flex: 1 },
  photoRow: { flexDirection: "row", gap: 8 },
})
