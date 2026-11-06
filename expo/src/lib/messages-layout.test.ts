import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  messagesAvatarSize,
  messagesBubbleMaxWidthPercent,
  messagesComposerHorizontalInset,
  messagesThreadRowMinHeight,
} from "./messages-layout"

describe("messages-layout", () => {
  it("scales bubble width down on tablet", () => {
    assert.equal(messagesBubbleMaxWidthPercent(390), "82%")
    assert.equal(messagesBubbleMaxWidthPercent(820), "62%")
  })

  it("uses smaller avatars on compact phones", () => {
    assert.equal(messagesAvatarSize(320), 36)
    assert.equal(messagesAvatarSize(390), 40)
    assert.equal(messagesAvatarSize(820), 44)
  })

  it("matches module horizontal padding for composer inset", () => {
    assert.equal(messagesComposerHorizontalInset(390), 20)
    assert.equal(messagesComposerHorizontalInset(820), 24)
  })

  it("adjusts thread row height by breakpoint", () => {
    assert.equal(messagesThreadRowMinHeight(320), 68)
    assert.equal(messagesThreadRowMinHeight(820), 76)
  })
})
