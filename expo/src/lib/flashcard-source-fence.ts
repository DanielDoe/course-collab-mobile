const CPP_START = /#include\s*[<"]|int\s+main\s*\(|using\s+namespace\s+std|std::|cout\s*<</
const MATLAB_START =
  /(?:^|\n)\s*(?:function\s+\w+\s*=|%[^\S\n]+\S|disp\s*\(|fprintf\s*\(|linspace\s*\(|zeros\s*\()/

function looksLikeCppSource(text: string): boolean {
  return CPP_START.test(text)
}

function looksLikeMatlabSource(text: string): boolean {
  return MATLAB_START.test(text)
}

/**
 * Wrap unfenced C++ / MATLAB so markdown keeps identifiers (max_value, i_s)
 * as code instead of turning them into KaTeX subscripts.
 */
export function fenceLikelySourceCode(text: string): string {
  const trimmed = text.trim()
  if (!trimmed || /```/.test(trimmed)) return text

  if (looksLikeCppSource(trimmed)) {
    const start = trimmed.search(CPP_START)
    if (start > 0) {
      return `${trimmed.slice(0, start).trim()}\n\n\`\`\`cpp\n${trimmed.slice(start).trim()}\n\`\`\``
    }
    return `\`\`\`cpp\n${trimmed}\n\`\`\``
  }

  if (looksLikeMatlabSource(trimmed)) {
    const start = trimmed.search(MATLAB_START)
    if (start > 0) {
      return `${trimmed.slice(0, start).trim()}\n\n\`\`\`matlab\n${trimmed.slice(start).trim()}\n\`\`\``
    }
    return `\`\`\`matlab\n${trimmed}\n\`\`\``
  }

  return text
}
