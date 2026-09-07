import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"
import { keyboardAwareFormLayout } from "./keyboard-aware-form-insets"

const here = dirname(fileURLToPath(import.meta.url))

describe("keyboard-aware form insets", () => {
  it("lets iOS adjust insets when there is no sticky footer", () => {
    const layout = keyboardAwareFormLayout({
      platform: "ios",
      hasFooter: false,
      safeBottom: 34,
      extraBottomPadding: 24,
      keyboardHeight: 336,
    })
    assert.equal(layout.useAutomaticKeyboardInsets, true)
    assert.equal(layout.avoidingBehavior, "padding")
    assert.equal(layout.scrollPaddingBottom, 24 + 34)
  })

  it("adds Android keyboard padding when the form has no footer", () => {
    const layout = keyboardAwareFormLayout({
      platform: "android",
      hasFooter: false,
      safeBottom: 24,
      extraBottomPadding: 24,
      keyboardHeight: 280,
    })
    assert.equal(layout.useAutomaticKeyboardInsets, false)
    assert.equal(layout.scrollPaddingBottom, 24 + 24 + 280)
  })

  it("keeps a sticky footer above the home indicator and clears the last field", () => {
    const compact = keyboardAwareFormLayout({
      platform: "ios",
      hasFooter: true,
      safeBottom: 34,
      extraBottomPadding: 24,
      keyboardHeight: 300,
    })
    assert.equal(compact.useAutomaticKeyboardInsets, false)
    assert.equal(compact.scrollPaddingBottom, 24 + 8 + 12)

    const scaled = keyboardAwareFormLayout({
      platform: "android",
      hasFooter: true,
      safeBottom: 48,
      extraBottomPadding: 24,
      keyboardHeight: 0,
    })
    assert.equal(scaled.scrollPaddingBottom, 24 + 8)
  })

  it("KeyboardAwareForm uses shared insets on iOS and Android", () => {
    const source = readFileSync(join(here, "../components/ui/KeyboardAwareForm.tsx"), "utf8")
    assert.match(source, /keyboardAwareFormLayout/)
    assert.match(source, /nestedScrollEnabled/)
    assert.match(source, /keyboardWillShow/)
    assert.match(source, /keyboardDidShow/)
    assert.match(source, /export const FormScreen = KeyboardAwareForm/)
  })
})
