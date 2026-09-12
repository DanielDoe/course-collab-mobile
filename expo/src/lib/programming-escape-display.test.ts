import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { expandEncodedNewlines } from "./programming-escape-display"

describe("expandEncodedNewlines", () => {
  it("keeps literal \\n in escape-sequence questions", () => {
    const input = String.raw`Escape sequence \n moves output to a new line.`
    assert.equal(expandEncodedNewlines(input), input)
  })

  it("keeps \\n inside markdown inline code (homework bank format)", () => {
    const input = "Escape sequence `\\n` moves output to a new line."
    assert.equal(expandEncodedNewlines(input), input)
    assert.match(expandEncodedNewlines(input), /`\\n`/)
  })

  it("expands bank-encoded fenced cpp blocks into real newlines", () => {
    const input =
      "```cpp\\nvoid print(int x){ cout<<x; }\\nvoid print(double x){ cout<<x; }\\nint main(){ print(5.0); }\\n```\\nThis prints 5.0."
    const out = expandEncodedNewlines(input)
    assert.match(out, /^```cpp\n/)
    assert.match(out, /void print\(int x\)\{ cout<<x; \}\n/)
    assert.match(out, /\n```\nThis prints 5\.0\.$/)
    assert.equal(out.includes("cpp\\n"), false)
  })

  it("keeps \\n inside C string literals while formatting fences", () => {
    const input = "```cpp\\nprintf(\"hi\\n\");\\n```"
    const out = expandEncodedNewlines(input)
    assert.match(out, /^```cpp\n/)
    assert.match(out, /printf\("hi\\n"\);/)
    assert.match(out, /\n```$/)
  })

  it("still expands bank-encoded line breaks between clauses", () => {
    const input = String.raw`First line.\nSecond line.`
    assert.equal(expandEncodedNewlines(input), "First line.\nSecond line.")
  })

  it("expands paragraph breaks", () => {
    const input = String.raw`Para one.\n\nPara two.`
    assert.equal(expandEncodedNewlines(input), "Para one.\n\nPara two.")
  })

  it("keeps \\t and \\r tokens mid-sentence", () => {
    assert.equal(
      expandEncodedNewlines(String.raw`Tab is \t and return is \r here.`),
      String.raw`Tab is \t and return is \r here.`,
    )
  })
})
