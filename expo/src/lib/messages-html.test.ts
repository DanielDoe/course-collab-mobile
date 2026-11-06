import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  extractMessageImageUrls,
  inferMessageAttachmentMime,
  isImageMimeType,
  isPersistedMessageAttachmentUrl,
  stripMessageHtml,
} from "./messages-media"

describe("messages-media", () => {
  it("strips tags and decodes entities", () => {
    const text = stripMessageHtml("<p>Hello</p><p>world &amp; more</p>")
    assert.match(text, /Hello/)
    assert.match(text, /world & more/)
    assert.doesNotMatch(text, /<p>/)
  })

  it("extracts img src urls from composer html", () => {
    const urls = extractMessageImageUrls(
      '<p>see this</p><p><img src="https://blob.example/a.png" alt="shot"></p>',
    )
    assert.deepEqual(urls, ["https://blob.example/a.png"])
  })

  it("detects image mime and extensions", () => {
    assert.equal(isImageMimeType("image/jpeg", "x.bin"), true)
    assert.equal(isImageMimeType(null, "photo.HEIC"), true)
    assert.equal(isImageMimeType("application/pdf", "notes.pdf"), false)
  })

  it("infers mime from filename when declared type is empty", () => {
    assert.equal(inferMessageAttachmentMime("shot.HEIC", ""), "image/heic")
    assert.equal(inferMessageAttachmentMime("notes.pdf", "application/octet-stream"), "application/pdf")
    assert.equal(inferMessageAttachmentMime("photo.jpg", "image/jpeg"), "image/jpeg")
  })

  it("requires http(s) for persisted attachment urls", () => {
    assert.equal(isPersistedMessageAttachmentUrl("https://blob.example/a.jpg"), true)
    assert.equal(isPersistedMessageAttachmentUrl("/uploads/messages/a.jpg"), false)
    assert.equal(isPersistedMessageAttachmentUrl(""), false)
  })
})
