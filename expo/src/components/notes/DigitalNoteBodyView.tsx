import { AnnouncementBodyWebView } from "../course-info/AnnouncementBodyWebView"
import { isMarkdownNoteContent, noteBodyForEditor } from "../../lib/markdown-note-content"
import { MarkdownNotePreview } from "./MarkdownNotePreview"

type Props = {
  content: string
  accentColor?: string
  paddingHorizontal?: number
}

/** Renders note body — KaTeX markdown for Cora exports, HTML for rich notes. */
export function DigitalNoteBodyView({ content, accentColor, paddingHorizontal = 2 }: Props) {
  if (!content.trim()) return null
  const body = noteBodyForEditor(content)
  if (isMarkdownNoteContent(body)) {
    return <MarkdownNotePreview markdown={body} paddingHorizontal={paddingHorizontal} />
  }
  return (
    <AnnouncementBodyWebView
      content={content}
      accentColor={accentColor}
      paddingHorizontal={paddingHorizontal}
    />
  )
}
