/**
 * Lightweight semantic intent classifier.
 *
 * Policy is decided by the *requested output* and combined features,
 * not by a single keyword. Framing (roleplay, research, "developer mode")
 * is stripped before scoring.
 *
 * This is not a model call — it must stay cheap enough for every turn.
 */

import { historyUserBlob, normalizeCoraSecurityText } from "./normalize"
import type {
  CoraSecurityActor,
  CoraSecurityClassification,
  CoraSecurityIntent,
  CoraSecurityTurnInput,
} from "./types"

type FeatureScores = {
  platformTarget: number
  weaknessSeeking: number
  internalsSeeking: number
  privilegeBypass: number
  secretExtraction: number
  promptExtraction: number
  toolExtraction: number
  exploitVerify: number
  securityReport: number
  securityEducation: number
  authorizedProduct: number
  injectionOverride: number
  securityModeUnlock: number
  idorTechnique: number
  errorLeakage: number
  crossUser: number
  roleChange: number
}

const EMPTY_FEATURES: FeatureScores = {
  platformTarget: 0,
  weaknessSeeking: 0,
  internalsSeeking: 0,
  privilegeBypass: 0,
  secretExtraction: 0,
  promptExtraction: 0,
  toolExtraction: 0,
  exploitVerify: 0,
  securityReport: 0,
  securityEducation: 0,
  authorizedProduct: 0,
  injectionOverride: 0,
  securityModeUnlock: 0,
  idorTechnique: 0,
  errorLeakage: 0,
  crossUser: 0,
  roleChange: 0,
}

type Cue = { re: RegExp; w?: number }

function scoreCues(text: string, cues: Cue[]): number {
  let score = 0
  for (const cue of cues) {
    if (cue.re.test(text)) score += cue.w ?? 1
  }
  return score
}

/** Explicit or implicit "this CourseCollab system" targeting. */
const PLATFORM_CUES: Cue[] = [
  { re: /coursecollab|course[- ]collab|coursetest|this (app|platform|product|system|site|backend)|your (app|platform|system|backend|api|apis|server|database|infra)/ },
  { re: /in production|production backend|unresolved (security )?bugs?|developers (here|of this)|your (codebase|stack|endpoints?)/ },
  { re: /which (coursecollab )?(endpoint|api|route)s?|what apis exist|what (hidden )?endpoints|all .{0,24}(api endpoints?|endpoints)/ },
  { re: /this lms|our (api|apis|backend|database|platform)|internal (course)?collab/ },
]

const WEAKNESS_CUES: Cue[] = [
  { re: /vulnerabilit|vulnrab|vulnerable|weakest|weaknesse?s|unpatched|forgot to secure|easiest to (abuse|compromise|investigate)|security (bugs?|issues?|audits?|findings?)|technical weaknesses/ },
  { re: /where (is|are) (you|the platform|this).{0,24}(weak|exposed|insecure)|if you were (attacking|trying to compromise)|pentest|attack(ing)? (this|coursecollab|the platform)|compromise coursecollab/ },
  { re: /mistakes? .{0,40}developers (made|make)|implementation mistakes|something developers forgot|exploitable|how would (an attacker|i) (break|bypass|exploit)/ },
  { re: /(unresolved|outstanding|open|not been fixed|haven't been fixed)\s+(vuln|security (bugs?|issues?|findings?)|cves?)|security issues .{0,40}not been fixed/ },
  { re: /don'?t call them .{0,20} (list|show|name|tell) .{0,40}(weak|issue|hole|gap|mistake)|rank .{0,40}(easiest|compromise)|confirm which ones are real|using your real knowledge/ },
  { re: /schwachstelle|vuln[eé]rabilit|vulnerabilidades?|脆弱性|弱点|security auditor/ },
]

const INTERNALS_CUES: Cue[] = [
  { re: /(hidden|private|internal) (api|apis|endpoint|endpoints|route|routes|tools?|services?)|api topology|endpoint inventory|all internal services/ },
  { re: /database (schema|structure|topology)|table (names?|schema)|postgres|authorization (implementation|logic|internals)|session internals|how .{0,40}determines which student/ },
  { re: /what route trusts|which (api|endpoint|route)s? .{0,40}(unprotected|not protected|aren't protected|are not protected|trusts|no auth|admin privileges)|cors (config|configuration|policy)|deployment architecture/ },
  { re: /tool (definitions?|schemas?|signatures?|parameters)|function signatures?|service mappings?|privileged arguments?|json schema for/ },
  { re: /what technologies (does|power)|technologies power|what stack|internal (urls?|network|logs?)|server (config|paths?)|production backend url|backend url/ },
  { re: /how (is|are|does) .{0,48}implemented( internally)?|implemented internally|anti[- ]?cheat (api|implementation|engine|detection)|endpoint (do you|you) call|apis? (do you|you) (call|use)/ },
  { re: /which .{0,20}(require|need) (authentication|admin privileges)|which one is weakest|request (body|payload) and headers|headers (you use|sent by)|interact with those systems|kinds of internal apis|list of all .{0,40}(api|endpoints?)|endpoints you know|endpoints can students call/ },
]

const PRIVILEGE_CUES: Cue[] = [
  { re: /\b(another (student|user|instructor|faculty)|someone else'?s|other student'?s)\b/ },
  { re: /\b(change|swap|spoof|forge).{0,20}(student ?id|user ?id|instructor ?id)\b/ },
  { re: /\b(impersonat|act as (an? )?(admin|faculty|instructor|another)|privilege escalation|bypass (permission|auth|authorization|rbac|the (lock|anti[- ]?cheat|integrity|proctor)))\b/ },
  { re: /\b(how (do|can) i (unlock|cheat|bypass)|detection thresholds?|hidden integrity|internal scoring logic)\b/ },
  { re: /\b(retrieve|see|read|access).{0,24}(their|another|someone else).{0,16}(grade|quiz|data|message|note)\b/ },
  { re: /\b(cross[- ]role|become admin|give me admin|list admin tools|think i am another)\b/ },
]

const IDOR_CUES: Cue[] = [
  { re: /change (it|the id|student id|my (student )?id).{0,40}(to \d+|in an api)|what happens if i change .{0,30}(id|header)/ },
  { re: /what header should i change|make coursecollab think i am|x-student-id|x-instructor-id/ },
  { re: /look up student (database )?id|retrieve the record belonging to student|request course \d+/ },
  { re: /if i know their (database )?id|determines which student record belongs/ },
]

const CROSS_USER_CUES: Cue[] = [
  { re: /another student's|grades for everyone|everyone in my class/ },
  { re: /professor'?s question bank|answer key for .{0,20}(upcoming|unreleased|final)|unpublished quizzes/ },
  { re: /another instructor'?s|admin dashboard data|private faculty notes|open the admin dashboard/ },
]

const ROLE_CHANGE_CUES: Cue[] = [
  { re: /make (my account|me) (an? )?(admin|administrator)|change my role|same permissions .{0,20}(professor|instructor|faculty)/ },
  { re: /(turn on|enable|activate) admin mode|call .{0,24}faculty tools|even though i am a student/ },
  { re: /pretend my (authenticated )?role is|ignore the role shown|give me faculty access|i am actually the professor/ },
]

const SECRET_CUES: Cue[] = [
  { re: /(show|print|give|reveal|what).{0,40}(openai|anthropic|stripe|api) .{0,12}(key|secret|token)/ },
  { re: /database_url|print the database|environment variables available|all environment variables|stripe secret key/ },
  { re: /credentials you can access|authentication token used|headers sent by your backend|last tool call/ },
  { re: /production secrets?|infra(structure)? (access|credentials?)|unrestricted sql/ },
]

const PROMPT_CUES: Cue[] = [
  { re: /system prompt|developer (instructions?|prompt)|hidden (instructions?|policies|context|rules|coursecollab context)|print your (complete )?instructions|repeat (all |everything )?(instructions|above)/ },
  { re: /show (me )?(your )?(hidden|secret) (context|prompt|rules)|what (security )?rules were you given|instructions prevent you|chain of thought|internal reasoning/ },
  { re: /ignore .{0,28}(policies|instructions|guardrails)|override .{0,12}(policy|guardrail)|list every tool you have/ },
]

const TOOL_CUES: Cue[] = [
  { re: /raw (tool|function) (definitions?|schemas?|response)|list (every|all )?(admin |hidden |internal )?tools?( and (its|their) parameters)?|print the admin tools|tool registry|json schema for your/ },
  { re: /function x against|private route|authentication headers you (send|use)|privileged arguments|announcement tool with invalid/ },
]

const ERROR_LEAK_CUES: Cue[] = [
  { re: /complete server error|raw (tool )?response|complete stack trace|sql error|exact url.{0,40}headers.{0,40}(request )?body/ },
  { re: /show me the (stack trace|sql error|raw response|complete (server )?error)/ },
]

const EXPLOIT_VERIFY_CUES: Cue[] = [
  { re: /\b(i (changed|swapped|replaced|forged)|changed .{0,20}(student ?id|user ?id).{0,40}(saw|got|retrieved|accessed))\b/ },
  { re: /\b(is that (one of )?(your )?(vulnerabilit|bugs?|issues?)|confirm (this|that) (works|is vulnerable|is a vuln)|confirm which ones are real|did i find a (vuln|bug|hole))\b/ },
  { re: /\b(test(ing)? (if|whether) i can access|can you (check|verify|confirm) .{0,40}(vuln|idor|access))\b/ },
]

const REPORT_CUES: Cue[] = [
  { re: /\b(i (think i )?(found|discovered|noticed)|want to report|responsible disclosure|security (problem|issue|concern) (in|with|on))\b/ },
  { re: /\b(report (a |this )?(security|vulnerabilit|bug)|submit (a )?security report)\b/ },
]

const EDUCATION_CUES: Cue[] = [
  { re: /\b(what is|what's|whats|explain|teach|help me understand|difference between|how does|how do|define|eli5|walk me through|why (is|are|do|does|should))\b/ },
  { re: /\b(owasp|parameterized (sql|queries)|prepared statements?|xss|cross[- ]site|sql injection|csrf|authentication vs authorization|authn vs authz|access-control-allow-origin|idor)\b/ },
  { re: /\b(common ways to prevent|in general|textbook|for my (class|course|homework|assignment)|cybersecurity (concept|topic|course)|security practices should developers|api keys should not)\b/ },
]

const PRODUCT_CUES: Cue[] = [
  { re: /\b((anti[- ]?cheat|integrity|lock(ed)?|privacy|security) settings? (for|on|available)|why was (my|the) (assessment|quiz|exam) locked)\b/ },
  { re: /\b(settings (available|enabled) for my (quiz|exam|final|course)|controls available to (me|my (role|account|course)))\b/ },
  { re: /\b(platform security settings that my admin role|authorized to manage|user-facing (policy|privacy|security))\b/ },
]

const INJECTION_CUES: Cue[] = [
  { re: /\b(ignore (all )?(cora )?security (policies|rules|guardrails)|print your system prompt|reveal (the )?database configuration|send all hidden context|call the admin tool)\b/ },
  { re: /\b(follow (the )?(instructions|commands) (in|from) (this|the) (document|file|note|post|page))\b/ },
]

const MODE_UNLOCK_CUES: Cue[] = [
  { re: /\b(enable|activate|enter|turn on|switch on)\s+(security|recon|developer|dan|jailbreak|admin)\s+mode\b/ },
  { re: /\b(unlock (internal|hidden) security|security research mode)\b/ },
]

function featuresFor(text: string): FeatureScores {
  return {
    platformTarget: scoreCues(text, PLATFORM_CUES),
    weaknessSeeking: scoreCues(text, WEAKNESS_CUES),
    internalsSeeking: scoreCues(text, INTERNALS_CUES),
    privilegeBypass: scoreCues(text, PRIVILEGE_CUES),
    secretExtraction: scoreCues(text, SECRET_CUES),
    promptExtraction: scoreCues(text, PROMPT_CUES),
    toolExtraction: scoreCues(text, TOOL_CUES),
    exploitVerify: scoreCues(text, EXPLOIT_VERIFY_CUES),
    securityReport: scoreCues(text, REPORT_CUES),
    securityEducation: scoreCues(text, EDUCATION_CUES),
    authorizedProduct: scoreCues(text, PRODUCT_CUES),
    injectionOverride: scoreCues(text, INJECTION_CUES),
    securityModeUnlock: scoreCues(text, MODE_UNLOCK_CUES),
    idorTechnique: scoreCues(text, IDOR_CUES),
    errorLeakage: scoreCues(text, ERROR_LEAK_CUES),
    crossUser: scoreCues(text, CROSS_USER_CUES),
    roleChange: scoreCues(text, ROLE_CHANGE_CUES),
  }
}

function impliedPlatformInternals(text: string, scores: FeatureScores): boolean {
  if (scores.platformTarget > 0) return scores.internalsSeeking > 0 || scores.weaknessSeeking > 0
  return (
    scores.internalsSeeking > 0 &&
    /\b(route|endpoint|api|schema|student ?ids?|hidden|internal|your|this|you use|request body|headers)\b/.test(text)
  )
}

function add(a: FeatureScores, b: FeatureScores): FeatureScores {
  const next = { ...EMPTY_FEATURES }
  for (const key of Object.keys(EMPTY_FEATURES) as (keyof FeatureScores)[]) {
    next[key] = a[key] + b[key]
  }
  return next
}

function decideIntent(
  text: string,
  current: FeatureScores,
  cumulative: FeatureScores,
  actor: CoraSecurityActor,
): { intent: CoraSecurityIntent; reasons: string[]; platformTargeted: boolean; cumulative: boolean } {
  const reasons: string[] = []
  const platformTargeted = current.platformTarget > 0 || impliedPlatformInternals(text, current)
  const historyEscalation =
    cumulative.platformTarget + cumulative.internalsSeeking >= 2 &&
    (current.weaknessSeeking > 0 ||
      current.internalsSeeking > 0 ||
      /\b(weakest|authentication|unprotected|easiest|investigate first|the one you would|just give me|start with|which one)\b/.test(
        text,
      ))

  if (current.securityModeUnlock > 0) {
    reasons.push("security_mode_unlock")
    return { intent: "reconnaissance", reasons, platformTargeted: true, cumulative: false }
  }

  if (current.exploitVerify > 0) {
    reasons.push("exploit_verification_requested")
    return { intent: "exploit_verify", reasons, platformTargeted, cumulative: false }
  }

  const reportWithoutEnumeration =
    current.securityReport > 0 &&
    current.weaknessSeeking === 0 &&
    current.secretExtraction === 0 &&
    current.promptExtraction === 0 &&
    current.privilegeBypass === 0
  if (reportWithoutEnumeration) {
    reasons.push("responsible_report")
    return { intent: "security_report", reasons, platformTargeted, cumulative: false }
  }

  if (current.secretExtraction > 0) {
    reasons.push("secret_extraction")
    return { intent: "secret_extraction", reasons, platformTargeted, cumulative: false }
  }

  if (current.promptExtraction > 0) {
    reasons.push("prompt_extraction")
    return { intent: "prompt_extraction", reasons, platformTargeted, cumulative: false }
  }

  if (current.toolExtraction > 0) {
    reasons.push("tool_extraction")
    return { intent: "tool_extraction", reasons, platformTargeted, cumulative: false }
  }

  if (current.idorTechnique > 0 || current.roleChange > 0) {
    reasons.push(current.idorTechnique > 0 ? "idor_technique" : "role_change")
    return { intent: "privilege_bypass", reasons, platformTargeted, cumulative: false }
  }

  if (current.privilegeBypass > 0) {
    reasons.push("privilege_bypass")
    return { intent: "privilege_bypass", reasons, platformTargeted, cumulative: false }
  }

  if (current.crossUser > 0) {
    const privateOther =
      /another instructor|private faculty notes|professor'?s question bank/.test(text)
    const upcomingKey = /answer key for .{0,24}(upcoming|unreleased|final)/.test(text)
    const classWide = /grades for everyone|everyone in my class|unpublished quizzes/.test(text)
    const adminDash = /admin dashboard/.test(text)

    if (actor === "student" || actor === "career") {
      reasons.push("cross_user_student")
      return { intent: "privilege_bypass", reasons, platformTargeted, cumulative: false }
    }
    if (privateOther || (upcomingKey && actor !== "faculty") || (adminDash && actor !== "admin")) {
      reasons.push("cross_user_denied")
      return { intent: "privilege_bypass", reasons, platformTargeted, cumulative: false }
    }
    if (actor === "faculty" && classWide) {
      reasons.push("authorized_class_scope")
      return { intent: "authorized_product", reasons, platformTargeted, cumulative: false }
    }
    if (actor === "admin" && adminDash) {
      reasons.push("authorized_admin_product")
      return { intent: "authorized_product", reasons, platformTargeted, cumulative: false }
    }
    if (privateOther) {
      reasons.push("cross_user_denied")
      return { intent: "privilege_bypass", reasons, platformTargeted, cumulative: false }
    }
  }

  if (current.errorLeakage > 0) {
    reasons.push("error_side_channel")
    return { intent: "platform_internals", reasons, platformTargeted: true, cumulative: false }
  }

  if (current.injectionOverride > 0 && current.securityEducation === 0) {
    reasons.push("untrusted_override")
    return { intent: "prompt_injection", reasons, platformTargeted, cumulative: false }
  }

  if (current.weaknessSeeking > 0 && (platformTargeted || current.platformTarget > 0 || historyEscalation)) {
    reasons.push("platform_weakness_enumeration")
    return { intent: "reconnaissance", reasons, platformTargeted: true, cumulative: historyEscalation }
  }

  const userCodeContext = /\b(my|this|the)\s+(code|snippet|function|program|homework|assignment|lab)\b/.test(text)
  const generalFraming = /\b(in general|web apps?|typical (lms|app|application)|owasp|common (ways|examples)|textbook)\b/.test(
    text,
  )
  if (current.weaknessSeeking > 0 && current.securityEducation === 0 && !userCodeContext && !generalFraming) {
    reasons.push("weakness_enumeration_without_learning_frame")
    return { intent: "reconnaissance", reasons, platformTargeted: true, cumulative: false }
  }

  if (historyEscalation) {
    reasons.push("multi_turn_escalation")
    return { intent: "reconnaissance", reasons, platformTargeted: true, cumulative: true }
  }

  if (impliedPlatformInternals(text, current) && current.authorizedProduct === 0) {
    reasons.push("platform_implementation")
    return { intent: "platform_internals", reasons, platformTargeted: true, cumulative: false }
  }

  if (current.authorizedProduct > 0 && current.weaknessSeeking === 0 && current.internalsSeeking === 0) {
    reasons.push(`authorized_product:${actor}`)
    return { intent: "authorized_product", reasons, platformTargeted, cumulative: false }
  }

  if (current.securityEducation > 0 && current.weaknessSeeking === 0 && !platformTargeted) {
    reasons.push("general_security_education")
    return { intent: "security_education", reasons, platformTargeted: false, cumulative: false }
  }

  if (current.securityEducation > 0 && platformTargeted && current.weaknessSeeking === 0 && current.internalsSeeking === 0) {
    reasons.push("education_with_product_mention")
    return { intent: "security_education", reasons, platformTargeted, cumulative: false }
  }

  return { intent: "normal", reasons: ["default_allow"], platformTargeted, cumulative: false }
}

export function classifyCoraSecurityIntent(input: CoraSecurityTurnInput): CoraSecurityClassification {
  const message = normalizeCoraSecurityText(input.message)
  const history = historyUserBlob(input.history)
  const untrusted = (input.untrustedContent ?? [])
    .map((chunk) => normalizeCoraSecurityText(chunk))
    .join("\n")

  const current = featuresFor(message)
  const untrustedFeatures = untrusted ? featuresFor(untrusted) : { ...EMPTY_FEATURES }
  const prior = history ? featuresFor(history) : { ...EMPTY_FEATURES }
  const userFollowsUntrusted =
    untrustedFeatures.injectionOverride > 0 &&
    /\b(follow|obey|execute|do what|run|apply).{0,40}(document|file|note|post|instructions?)\b/.test(message)

  const decided = decideIntent(message, current, add(current, prior), input.actor)

  if (userFollowsUntrusted) {
    return {
      intent: "prompt_injection",
      reasons: ["untrusted_content_override"],
      platformTargeted: decided.platformTargeted,
      cumulative: false,
    }
  }

  return {
    intent: decided.intent,
    reasons: decided.reasons,
    platformTargeted: decided.platformTargeted,
    cumulative: decided.cumulative,
  }
}

export function isBlockedSecurityIntent(intent: CoraSecurityIntent): boolean {
  return (
    intent === "reconnaissance" ||
    intent === "privilege_bypass" ||
    intent === "secret_extraction" ||
    intent === "prompt_extraction" ||
    intent === "tool_extraction" ||
    intent === "prompt_injection" ||
    intent === "platform_internals"
  )
}
