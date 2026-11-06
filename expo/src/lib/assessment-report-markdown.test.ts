import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  needsMarkdownRichRender,
  prepareMessageRichContent,
} from "./assessment-report-markdown"

describe("needsMarkdownRichRender", () => {
  it("treats targeted-practice and performance notes as rich", () => {
    const practice = [
      "Focus next on **AC power**.",
      "- Review $P = VI\\cos\\theta$",
      "- Then retry the targeted practice set",
    ].join("\n")
    const performance = [
      "Class performance",
      "",
      "| Topic | Accuracy |",
      "| --- | --- |",
      "| Phasors | 62% |",
      "",
      "Recommend $\\frac{1}{2}CV^2$ review before the quiz.",
    ].join("\n")

    assert.equal(needsMarkdownRichRender(practice), true)
    assert.equal(needsMarkdownRichRender(performance), true)
    assert.equal(needsMarkdownRichRender("See you Thursday."), false)
  })
})

describe("prepareMessageRichContent", () => {
  it("turns composer HTML into markdown so lists and bold survive", () => {
    const html = "<p>Please complete the <strong>targeted practice</strong> set.</p>"
    assert.equal(prepareMessageRichContent(html), "Please complete the **targeted practice** set.")
  })

  it("collapses empty TipTap paragraphs to blank (no empty WebView)", () => {
    assert.equal(prepareMessageRichContent("<p></p>"), "")
    assert.equal(prepareMessageRichContent("<p><br></p>"), "")
    assert.equal(needsMarkdownRichRender(prepareMessageRichContent("<p></p>")), false)
  })

  it("normalizes markdown math so KaTeX can render it", () => {
    const prepared = prepareMessageRichContent("Average power is \\(P = VI\\cos\\theta\\).")
    assert.match(prepared, /\$P = VI\\cos\\theta\$/)
  })
})
