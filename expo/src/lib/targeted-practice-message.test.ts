import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  parseTargetedPracticeMessage,
  targetedPracticePreviewText,
} from "./targeted-practice-message"

const CURRENT_HTML = [
  "<p>Hi Daniel,</p>",
  "<p>Daniel, you've completed 22 Cora sessions and your scores have been acceptable despite high usage. This practice helps you focus on the specific Cora topic areas where your requests were most concentrated.</p>",
  "<p><strong>Focus:</strong> codebench-analyze, codebench-learning-plan, codebench-debug, codebench-error-spotting</p>",
  "<p><strong>What to do next</strong></p>",
  "<ol>",
  "<li>Allocate your next practice time to codebench-analyze and codebench-learning-plan first.</li>",
  "<li>Then complete one focused pass on codebench-debug (3 Cora requests category).</li>",
  "<li>Complete one focused pass on codebench-error-spotting to improve how you identify errors.</li>",
  "</ol>",
  "<p>Daniel, your high Cora volume with acceptable results is a strong sign you are putting effort into the process.</p>",
  "<p>A copy is also in your Progress Review.</p>",
].join("")

const NEXT_HTML = [
  "<h3>Targeted practice</h3>",
  "<p>Hi Daniel,</p>",
  "<p>Channel your Cora usage into targeted improvement on the strongest recurring areas.</p>",
  "<p><strong>Focus topics</strong></p>",
  "<ul><li>codebench-analyze</li><li>codebench-debug</li></ul>",
  "<p><strong>What to do next</strong></p>",
  "<ol><li>Do 2 additional codebench-analyze practice requests.</li><li>Do 1 codebench-debug practice request.</li></ol>",
  "<p>Use Cora for hints if you get stuck, then finish the item on your own.</p>",
  "<p>A copy is also in your Progress Review.</p>",
].join("\n")

describe("parseTargetedPracticeMessage", () => {
  it("splits current Cora Insights HTML into greeting, focus chips, and numbered tasks", () => {
    const plan = parseTargetedPracticeMessage(CURRENT_HTML)
    assert.ok(plan)
    assert.equal(plan?.greeting, "Hi Daniel,")
    assert.match(plan?.summary ?? "", /22 Cora sessions/)
    assert.deepEqual(plan?.topics, [
      "codebench-analyze",
      "codebench-learning-plan",
      "codebench-debug",
      "codebench-error-spotting",
    ])
    assert.equal(plan?.tasks.length, 3)
    assert.match(plan?.tasks[0] ?? "", /Allocate your next practice time/)
    assert.match(plan?.encouragement ?? "", /high Cora volume/)
    assert.equal(plan?.hasProgressReviewNote, true)
  })

  it("reads topic bullets and a title from the newer HTML shape", () => {
    const plan = parseTargetedPracticeMessage(NEXT_HTML)
    assert.ok(plan)
    assert.deepEqual(plan?.topics, ["codebench-analyze", "codebench-debug"])
    assert.equal(plan?.tasks[1], "Do 1 codebench-debug practice request.")
    assert.equal(targetedPracticePreviewText(plan!), "Targeted practice · codebench-analyze, codebench-debug")
  })

  it("ignores ordinary chat", () => {
    assert.equal(parseTargetedPracticeMessage("Can we meet Thursday?"), null)
  })
})
