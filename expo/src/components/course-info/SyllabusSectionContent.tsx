import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { NativeMarkdownContent } from "./NativeMarkdownContent"
import { InfoBulletList } from "./course-info-shared"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import {
  getSyllabusVisibleContent,
  resolveSyllabusAssetUrl,
  syllabusHasRenderableContent,
  type SyllabusSection,
} from "../../lib/syllabus"

function SyllabusTable({
  columns,
  rows,
  title,
}: {
  columns: string[]
  rows: string[][]
  title?: string
}) {
  const native = useThemedNative()
  const type = useNativeType()
  const minWidth = Math.max(columns.length * 112, 280)

  return (
    <View style={styles.tableBlock}>
      {title ? <Text style={[type.bodyEmphasis, styles.tableTitle]}>{title}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={[styles.table, { minWidth, borderColor: native.separator }]}>
          <View style={[styles.tableHead, { backgroundColor: native.fill }]}>
            {columns.map((col) => (
              <Text key={col} style={[styles.tableHeadCell, type.caption, { color: native.label }]}>
                {col}
              </Text>
            ))}
          </View>
          {rows.map((row, ri) => (
            <View key={ri} style={[styles.tableRow, { borderTopColor: native.separator }]}>
              {row.map((cell, ci) => (
                <Text key={ci} style={[type.secondary, styles.tableCell]}>
                  {cell}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

function SyllabusFieldRows({ entries }: { entries: Array<[string, string]> }) {
  const native = useThemedNative()
  const type = useNativeType()
  return (
    <View style={styles.fieldList}>
      {entries.map(([label, value], index) => (
        <View
          key={label}
          style={[
            styles.fieldRow,
            index > 0 && { borderTopColor: native.separator, borderTopWidth: StyleSheet.hairlineWidth },
          ]}
        >
          <Text style={[type.caption, { color: native.secondaryLabel }]}>{label}</Text>
          <Text style={[type.bodyEmphasis, styles.fieldValue]}>{value}</Text>
        </View>
      ))}
    </View>
  )
}

function SyllabusTextbookImage({ imageUrl, caption }: { imageUrl: string; caption?: string }) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  return (
    <View style={[styles.textbookCard, { backgroundColor: native.fill, borderColor: native.separator }]}>
      <Image
        source={{ uri: imageUrl }}
        style={[styles.textbookImage, { backgroundColor: native.secondaryGrouped }]}
        resizeMode="contain"
      />
      <View style={styles.textbookMeta}>
        <View style={styles.textbookBadge}>
          <Ionicons name="book-outline" size={14} color={tokens.warning} />
          <Text style={[styles.textbookBadgeText, { color: tokens.warning }]}>Required textbook</Text>
        </View>
        {caption ? <Text style={[type.secondary, styles.textbookCaption]}>{caption}</Text> : null}
      </View>
    </View>
  )
}

export function SyllabusSectionContent({
  section,
  searchQuery = "",
}: {
  section: SyllabusSection
  searchQuery?: string
}) {
  const type = useNativeType()
  const native = useThemedNative()
  const visible = getSyllabusVisibleContent(section, searchQuery)
  const imageUrl = resolveSyllabusAssetUrl(visible.imageUrl)
  const documentUrl = resolveSyllabusAssetUrl(visible.documentUrl)

  if (!syllabusHasRenderableContent(visible)) {
    return searchQuery.trim() ? (
      <Text style={[type.caption, styles.emptyMatch, { color: native.tertiaryLabel }]}>
        No matching content in this section.
      </Text>
    ) : null
  }

  const sectionId = section.sectionId ?? section.id ?? ""

  return (
    <View style={styles.sectionBody}>
      {documentUrl ? (
        <Pressable
          style={[styles.documentRow, { backgroundColor: native.fill, borderColor: native.separator }]}
          onPress={() => void Linking.openURL(documentUrl)}
          accessibilityRole="link"
        >
          <Ionicons name="document-text-outline" size={20} color={native.tint} />
          <View style={styles.documentCopy}>
            <Text style={[type.bodyEmphasis, { color: native.label }]}>
              {visible.documentFileName || "View PDF document"}
            </Text>
            <Text style={[type.caption, { color: native.secondaryLabel }]}>Tap to open</Text>
          </View>
          <Ionicons name="open-outline" size={18} color={native.tertiaryLabel} />
        </Pressable>
      ) : null}

      {sectionId === "required-materials" && imageUrl ? (
        <SyllabusTextbookImage imageUrl={imageUrl} caption={visible.imageCaption} />
      ) : null}

      {visible.fieldEntries.length > 0 ? <SyllabusFieldRows entries={visible.fieldEntries} /> : null}

      {visible.markdownBlocks.map((block, index) => (
        <NativeMarkdownContent key={`md-${index}`} markdown={block} />
      ))}

      {visible.items.length > 0 ? <InfoBulletList items={visible.items} /> : null}

      {visible.tables.map((table, index) => (
        <SyllabusTable
          key={`${table.title ?? "table"}-${index}`}
          title={table.title}
          columns={table.columns}
          rows={table.rows}
        />
      ))}

      {visible.legacyTable ? (
        <SyllabusTable columns={visible.legacyTable.columns} rows={visible.legacyTable.rows} />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  sectionBody: { gap: 14 },
  documentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  documentCopy: { flex: 1, gap: 2 },
  emptyMatch: { lineHeight: 20, fontStyle: "italic" },
  fieldList: { gap: 0 },
  fieldRow: { gap: 4, paddingVertical: 8 },
  fieldValue: { lineHeight: 21 },
  table: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, overflow: "hidden" },
  tableBlock: { gap: 8 },
  tableTitle: {},
  tableHead: { flexDirection: "row" },
  tableHeadCell: { width: 112, fontWeight: "700", padding: 10 },
  tableRow: { flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth },
  tableCell: { width: 112, lineHeight: 18, padding: 10 },
  textbookCard: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  textbookImage: { width: 88, height: 120, borderRadius: 8 },
  textbookMeta: { flex: 1, gap: 6, justifyContent: "center" },
  textbookBadge: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" },
  textbookBadgeText: { fontSize: 12, fontWeight: "700" },
  textbookCaption: { lineHeight: 19 },
})
