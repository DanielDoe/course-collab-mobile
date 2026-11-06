import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  formatDenseCodeFencesForDisplay,
  formatDenseCodeLine,
} from "./code-fence-display"

describe("formatDenseCodeLine", () => {
  it("expands one-line C++ functions", () => {
    const out = formatDenseCodeLine("void print(int x){ cout<<x; }")
    assert.equal(
      out,
      "void print(int x) {\n  cout << x;\n}",
    )
  })

  it("leaves already multi-statement structured lines alone when not one-line funcs", () => {
    assert.equal(formatDenseCodeLine("int x = 1;"), "int x = 1;")
  })
})

describe("formatDenseCodeFencesForDisplay", () => {
  it("formats fenced cpp one-liners into readable blocks", () => {
    const input = [
      "```cpp",
      "void print(int x){ cout<<x; }",
      "void print(double x){ cout<<x; }",
      "int main(){ print(5.0); }",
      "```",
      "This prints 5.0.",
    ].join("\n")
    const out = formatDenseCodeFencesForDisplay(input)
    assert.match(out, /void print\(int x\) \{\n  cout << x;\n\}/)
    assert.match(out, /int main\(\) \{\n  print\(5\.0\);\n\}/)
    assert.match(out, /This prints 5\.0\./)
  })
})
