/** Repair LaTeX commands that lost their leading backslash in JSON / HTML pipelines. */
export function repairLatexDamagedByJsonEscapes(input: string): string {
  if (!input) return input
  return repairCommonLatexCommandEscapes(
    repairRmsSubscriptEscapes(input)
      .replace(/\text\{/g, "\\text{")
      .replace(/\text(?=[A-Za-z])/g, "\\text")
      .replace(/\frac\{/g, "\\frac{")
      .replace(/\boxed\{/g, "\\boxed{")
      .replace(/\right\b/g, "\\right")
      .replace(/\times\b/g, "\\times")
      .replace(/\tau\b/g, "\\tau")
      .replace(/\u0003/g, "")
      .replace(/\\text\{\s*k\}A/g, "\\text{k}\\Omega")
      .replace(/\\text\{\s*m\}A/g, "\\text{mA}"),
  )
}

/** Repair rms and similar subscripts broken by JS/JSON escape sequences (e.g. `\r` in `\rms`). */
export function repairRmsSubscriptEscapes(input: string): string {
  if (!input) return input
  return input
    // `\rms` in a JS string becomes `_` + carriage return + `ms` (the `\r` eats the `r`).
    .replace(/_\r([a-z]+)/gi, "_{r$1}")
    .replace(/\\rms\b/g, "{rms}")
    // Common bank/flashcard typos: V_rms, V_{rms}, V_ rms → V_{rms}
    .replace(/([A-Za-z])_\s*(?:\{rms\}|rms)\b/gi, "$1_{rms}")
}

/** Restore common LaTeX commands after `\c`-style escape corruption. */
export function repairCommonLatexCommandEscapes(input: string): string {
  if (!input) return input
  return input
    .replace(/(?<=[\s=^(}0-9.])\bcos\(/g, "\\cos(")
    .replace(/\^circ\b/g, "^\\circ")
}

/**
 * KaTeX treats `_rms` as subscript "r" only — expand multi-char subscripts inside math.
 * Example: `$V_rms$` → `$V_{rms}$`
 */
export function normalizeLatexMultiCharSubscripts(input: string): string {
  if (!input) return input
  return input.replace(/(\$\$[\s\S]*?\$\$|\$(?:\\.|[^$\n])+?\$)/g, (block) => {
    const isDisplay = block.startsWith("$$")
    const inner = isDisplay ? block.slice(2, -2) : block.slice(1, -1)
    const fixed = inner.replace(
      /([A-Za-z])_([A-Za-z0-9]{2,})(?![A-Za-z{])/g,
      "$1_{$2}",
    )
    return isDisplay ? `$$${fixed}$$` : `$${fixed}$`
  })
}
