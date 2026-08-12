import { useMemo } from "react"
import { Linking, Platform, StyleSheet, Text, View } from "react-native"
import { NATIVE } from "../../constants/faculty-native-theme"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { parseNativeMarkdown, type MdBlock, type MdInline } from "../../lib/native-markdown"

type Props = {
  markdown: string
  compact?: boolean
}

function InlineNodes({ nodes, baseStyle, linkColor }: { nodes: MdInline[]; baseStyle: object; linkColor: string }) {
  return (
    <>
      {nodes.map((node, index) => {
        if (node.type === "text") {
          return (
            <Text key={index} style={baseStyle}>
              {node.text}
            </Text>
          )
        }
        if (node.type === "strong") {
          return (
            <Text key={index} style={[baseStyle, styles.strong]}>
              <InlineNodes nodes={node.children} baseStyle={baseStyle} linkColor={linkColor} />
            </Text>
          )
        }
        if (node.type === "em") {
          return (
            <Text key={index} style={[baseStyle, styles.em]}>
              <InlineNodes nodes={node.children} baseStyle={baseStyle} linkColor={linkColor} />
            </Text>
          )
        }
        if (node.type === "code") {
          return (
            <Text key={index} style={[baseStyle, styles.inlineCode]}>
              {node.text}
            </Text>
          )
        }
        return (
          <Text
            key={index}
            style={[baseStyle, styles.link, { color: linkColor }]}
            onPress={() => void Linking.openURL(node.url)}
            accessibilityRole="link"
          >
            <InlineNodes nodes={node.children} baseStyle={baseStyle} linkColor={linkColor} />
          </Text>
        )
      })}
    </>
  )
}

function MarkdownBlock({
  block,
  compact,
  linkColor,
  textStyle,
  headingStyles,
  codeBg,
  quoteBg,
  separator,
}: {
  block: MdBlock
  compact?: boolean
  linkColor: string
  textStyle: object
  headingStyles: Record<1 | 2 | 3 | 4, object>
  codeBg: string
  quoteBg: string
  separator: string
}) {
  if (block.type === "heading") {
    return (
      <Text style={[headingStyles[block.level], compact && block.level > 2 && styles.compactHeading]}>
        <InlineNodes nodes={block.inlines} baseStyle={headingStyles[block.level]} linkColor={linkColor} />
      </Text>
    )
  }

  if (block.type === "paragraph") {
    return (
      <Text style={textStyle}>
        <InlineNodes nodes={block.inlines} baseStyle={textStyle} linkColor={linkColor} />
      </Text>
    )
  }

  if (block.type === "bullet_list") {
    return (
      <View style={styles.list}>
        {block.items.map((item, index) => (
          <View key={index} style={styles.listRow}>
            <Text style={[textStyle, styles.listMarker]}>{"\u2022"}</Text>
            <Text style={[textStyle, styles.listCopy]}>
              <InlineNodes nodes={item} baseStyle={textStyle} linkColor={linkColor} />
            </Text>
          </View>
        ))}
      </View>
    )
  }

  if (block.type === "ordered_list") {
    return (
      <View style={styles.list}>
        {block.items.map((item, index) => (
          <View key={index} style={styles.listRow}>
            <Text style={[textStyle, styles.listMarker]}>{index + 1}.</Text>
            <Text style={[textStyle, styles.listCopy]}>
              <InlineNodes nodes={item} baseStyle={textStyle} linkColor={linkColor} />
            </Text>
          </View>
        ))}
      </View>
    )
  }

  if (block.type === "blockquote") {
    return (
      <View style={[styles.quote, { backgroundColor: quoteBg, borderLeftColor: linkColor }]}>
        <Text style={textStyle}>
          <InlineNodes nodes={block.inlines} baseStyle={textStyle} linkColor={linkColor} />
        </Text>
      </View>
    )
  }

  if (block.type === "code") {
    return (
      <View style={[styles.codeBlock, { backgroundColor: codeBg }]}>
        <Text style={[textStyle, styles.codeBlockText]} selectable>
          {block.text}
        </Text>
      </View>
    )
  }

  return <View style={[styles.hr, { backgroundColor: separator }]} />
}

export function NativeMarkdownContent({ markdown, compact = false }: Props) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const blocks = useMemo(() => parseNativeMarkdown(markdown), [markdown])

  if (!markdown.trim() || blocks.length === 0) return null

  const textStyle = compact ? type.caption : type.secondary
  const headingStyles = {
    1: [type.sheetTitle, styles.h1],
    2: [type.bodyEmphasis, styles.h2, { color: native.label }],
    3: [type.bodyEmphasis, styles.h3, { color: tokens.accent }],
    4: [type.caption, styles.h4, { color: native.secondaryLabel, fontWeight: "700" }],
  } as const

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      {blocks.map((block, index) => (
        <MarkdownBlock
          key={index}
          block={block}
          compact={compact}
          linkColor={tokens.accent}
          textStyle={textStyle}
          headingStyles={headingStyles}
          codeBg={native.fill}
          quoteBg={tokens.accentSoft ?? `${tokens.accent}12`}
          separator={native.separator}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  wrapCompact: { gap: 8 },
  h1: { letterSpacing: Platform.OS === "ios" ? -0.3 : 0 },
  h2: { marginTop: 2 },
  h3: { marginTop: 2 },
  h4: { marginTop: 2, textTransform: "none" },
  compactHeading: { marginTop: 0 },
  strong: { fontWeight: "700" },
  em: { fontStyle: "italic" },
  inlineCode: {
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    fontSize: 13,
  },
  link: { textDecorationLine: "underline", fontWeight: "600" },
  list: { gap: 6 },
  listRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  listMarker: { minWidth: 18, lineHeight: 21 },
  listCopy: { flex: 1, lineHeight: 21 },
  quote: {
    borderLeftWidth: 3,
    borderRadius: NATIVE.sectionRadius,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  codeBlock: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  codeBlockText: {
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    fontSize: 13,
    lineHeight: 19,
  },
  hr: {
    height: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
  },
})
