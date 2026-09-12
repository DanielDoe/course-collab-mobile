import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { htmlToChatMarkdown } from "./html-to-chat-markdown"

describe("htmlToChatMarkdown", () => {
  it("turns paragraphs, bold, and ordered lists into markdown", () => {
    const md = htmlToChatMarkdown(
      "<p>Hi Daniel,</p><p><strong>What to do next</strong></p><ol><li>Review phasors.</li><li>Retry the set.</li></ol>",
    )
    assert.match(md, /^Hi Daniel,/)
    assert.match(md, /\*\*What to do next\*\*/)
    assert.match(md, /1\. Review phasors\./)
    assert.match(md, /2\. Retry the set\./)
  })
})
