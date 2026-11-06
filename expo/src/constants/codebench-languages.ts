export type CodebenchLanguageId = "cpp" | "c" | "python"

export type CodebenchLanguage = {
  id: CodebenchLanguageId
  label: string
  fileName: string
  apiLanguage: string
  defaultCode: string
}

export type CodebenchLearningMode = "beginner" | "intermediate" | "expert"

export const CODEBENCH_LANGUAGES: CodebenchLanguage[] = [
  {
    id: "cpp",
    label: "C++",
    fileName: "main.cpp",
    apiLanguage: "cpp",
    defaultCode: `#include <iostream>
using namespace std;

int main() {
    // Your code goes here

    return 0;
}`,
  },
  {
    id: "c",
    label: "C",
    fileName: "main.c",
    apiLanguage: "c",
    defaultCode: `#include <stdio.h>

int main(void) {
    /* Your code goes here */

    return 0;
}`,
  },
  {
    id: "python",
    label: "Python",
    fileName: "main.py",
    apiLanguage: "python",
    defaultCode: `# Python starter template
def main():
    # Your code goes here
    pass

if __name__ == "__main__":
    main()`,
  },
]

export const DEFAULT_CODEBENCH_LANGUAGE_ID: CodebenchLanguageId = "cpp"

export const LEARNING_MODE_OPTIONS: Array<{ value: CodebenchLearningMode; label: string; short: string }> = [
  { value: "beginner", label: "Beginner", short: "Beg" },
  { value: "intermediate", label: "Intermediate", short: "Int" },
  { value: "expert", label: "Expert", short: "Exp" },
]

const SELECTABLE = new Set<string>(CODEBENCH_LANGUAGES.map((language) => language.id))

export function isCodebenchLanguageId(id: string | null | undefined): id is CodebenchLanguageId {
  return Boolean(id && SELECTABLE.has(id))
}

/** Maps leftover stored ids (JavaScript, Java, …) onto the three Cora languages. */
export function normalizeCodebenchLanguageId(id: string | null | undefined): CodebenchLanguageId {
  if (isCodebenchLanguageId(id)) return id
  const raw = String(id ?? "").trim().toLowerCase()
  if (raw === "c++" || raw === "cplusplus") return "cpp"
  if (raw === "py" || raw === "python3") return "python"
  return DEFAULT_CODEBENCH_LANGUAGE_ID
}

export function getCodebenchLanguage(id: string | null | undefined): CodebenchLanguage {
  const normalized = normalizeCodebenchLanguageId(id)
  return CODEBENCH_LANGUAGES.find((language) => language.id === normalized) ?? CODEBENCH_LANGUAGES[0]!
}
