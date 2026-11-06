import assert from "node:assert/strict"
import test from "node:test"
import { fenceLikelySourceCode } from "./flashcard-source-fence"

test("fenceLikelySourceCode wraps unfenced C++", () => {
  const src = "#include <iostream>\nint main() { return 0; }"
  const fenced = fenceLikelySourceCode(src)
  assert.match(fenced, /```cpp/)
  assert.match(fenced, /#include <iostream>/)
})

test("fenceLikelySourceCode keeps prose before C++", () => {
  const src = "What does this print?\n#include <iostream>\nstd::cout << 1;"
  const fenced = fenceLikelySourceCode(src)
  assert.match(fenced, /What does this print\?/)
  assert.match(fenced, /```cpp/)
})

test("fenceLikelySourceCode wraps MATLAB function bodies", () => {
  const src = "function y = rms(x)\n  y = sqrt(mean(x.^2));\nend"
  const fenced = fenceLikelySourceCode(src)
  assert.match(fenced, /```matlab/)
  assert.match(fenced, /function y = rms/)
})

test("fenceLikelySourceCode leaves already-fenced code alone", () => {
  const src = "```cpp\nint max_value = 3;\n```"
  assert.equal(fenceLikelySourceCode(src), src)
})

test("fenceLikelySourceCode leaves plain questions alone", () => {
  assert.equal(fenceLikelySourceCode("What is a phasor?"), "What is a phasor?")
})
