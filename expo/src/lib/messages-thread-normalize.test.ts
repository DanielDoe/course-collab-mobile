import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { normalizeThreadSummaries, normalizeMessageParticipant } from "./messages-thread-normalize"
import type { ThreadSummary } from "./messages-api"

describe("messages thread normalize", () => {
  it("survives a missing otherParticipant", () => {
    const threads = normalizeThreadSummaries([
      {
        id: 1,
        subject: null,
        updatedAt: "2026-01-01",
        unreadCount: 0,
        otherParticipant: undefined as unknown as ThreadSummary["otherParticipant"],
        lastMessage: null,
      },
    ])
    assert.equal(threads[0]?.otherParticipant.displayName, "Unknown participant")
    assert.equal(normalizeMessageParticipant(null).displayName, "Unknown participant")
  })

  it("coerces a missing lastMessage body so inbox preview cannot crash", () => {
    const threads = normalizeThreadSummaries([
      {
        id: 2,
        subject: "Office hours",
        updatedAt: "2026-01-02",
        unreadCount: 1,
        otherParticipant: { kind: "student", id: 9, displayName: "Ada", email: null, subtitle: "" },
        lastMessage: {
          body: null as unknown as string,
          createdAt: "2026-01-02",
          senderKind: "student",
          senderId: 9,
        },
      },
    ])
    assert.equal(threads[0]?.lastMessage?.body, "")
  })
})
