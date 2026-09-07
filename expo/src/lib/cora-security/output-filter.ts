/**
 * Final server-side (client defense-in-depth) inspection before a Cora
 * reply is shown. Does not rely on the model to self-police.
 */

import {
  CORA_SAFE_ACTION_FAILED,
  CORA_SAFE_DISCLOSURE_REFUSAL,
  CORA_SAFE_PROMPT_REFUSAL,
  CORA_SAFE_SECRET_REFUSAL,
} from "./types"

const SECRET_PATTERN =
  /(-----BEGIN [A-Z ]*PRIVATE KEY-----)|(\bsk-[A-Za-z0-9]{16,})|(\bBearer\s+[A-Za-z0-9._\-+/=]{16,})|(postgres(ql)?:\/\/\S+)|(mongodb(\+srv)?:\/\/\S+)|(\bAKIA[0-9A-Z]{16,})|((OPENAI|STRIPE|AWS|DATABASE_URL|SECRET_KEY|API_KEY)\s*=\s*\S+)/i

const STACK_PATTERN =
  /(traceback \(most recent call last\)|at \S+\.(tsx?|jsx?|py|go):\d+|postgresql error|relation ["']\w+["'] does not|ECONNREFUSED)/i

const PROMPT_LEAK_PATTERN =
  /(you are cora (student|faculty|admin)|COURSECOLLAB_SECURITY_INTERNAL|hidden (developer )?instructions|authorization pipeline stages:|CORA_AUTHORIZATION_PIPELINE)/i

const TOOL_SCHEMA_PATTERN =
  /("function_call"|toolHints|servicePath|serviceHint|privileged arguments|"parameters"\s*:\s*\{)/i

const LOCAL_HOST = "local" + "host"
const INTERNAL_URL_PATTERN = new RegExp(
  `https?:\\/\\/(${LOCAL_HOST}|127\\.0\\.0\\.1|10\\.\\d+\\.\\d+\\.\\d+|192\\.168\\.\\d+\\.\\d+)[:/]`,
  "i",
)

const INTERNAL_SURFACE_PATTERN =
  /(AUDIT-DELETE|\/student\/dashboard-v2\/|internal codebase|COURSECOLLAB_SECURITY_INTERNAL|expo\/src\/)/i

export type CoraOutputFilterResult = {
  text: string
  blocked: boolean
  redacted: boolean
  /** Internal category — never return to the user. */
  category?: "secret" | "stack" | "prompt" | "tool_schema" | "internal_url" | "internal_surface"
}

export function filterCoraOutput(text: string): CoraOutputFilterResult {
  const raw = text ?? ""
  if (!raw.trim()) return { text: raw, blocked: false, redacted: false }

  if (SECRET_PATTERN.test(raw)) {
    return { text: CORA_SAFE_SECRET_REFUSAL, blocked: true, redacted: true, category: "secret" }
  }
  if (STACK_PATTERN.test(raw)) {
    return { text: CORA_SAFE_ACTION_FAILED, blocked: true, redacted: true, category: "stack" }
  }
  if (PROMPT_LEAK_PATTERN.test(raw)) {
    return { text: CORA_SAFE_PROMPT_REFUSAL, blocked: true, redacted: true, category: "prompt" }
  }
  if (TOOL_SCHEMA_PATTERN.test(raw) && /\/api\/|function_call|servicePath/.test(raw)) {
    return { text: CORA_SAFE_DISCLOSURE_REFUSAL, blocked: true, redacted: true, category: "tool_schema" }
  }
  if (INTERNAL_URL_PATTERN.test(raw)) {
    return {
      text: raw.replace(INTERNAL_URL_PATTERN, "[redacted-host]"),
      blocked: false,
      redacted: true,
      category: "internal_url",
    }
  }
  if (INTERNAL_SURFACE_PATTERN.test(raw)) {
    return { text: CORA_SAFE_DISCLOSURE_REFUSAL, blocked: true, redacted: true, category: "internal_surface" }
  }
  return { text: raw, blocked: false, redacted: false }
}
