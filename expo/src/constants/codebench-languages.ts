export type CodebenchLanguageId =
  | "cpp"
  | "javascript"
  | "typescript"
  | "python"
  | "java"
  | "csharp"
  | "go"
  | "rust"
  | "php"
  | "ruby"
  | "swift"
  | "kotlin"
  | "others"

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
    id: "javascript",
    label: "JavaScript",
    fileName: "main.js",
    apiLanguage: "javascript",
    defaultCode: `// JavaScript starter template
function main() {
  // Your code goes here
}

main();`,
  },
  {
    id: "typescript",
    label: "TypeScript",
    fileName: "main.ts",
    apiLanguage: "typescript",
    defaultCode: `// TypeScript starter template
function main(): void {
  // Your code goes here
}

main();`,
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
  {
    id: "java",
    label: "Java",
    fileName: "Main.java",
    apiLanguage: "java",
    defaultCode: `public class Main {
    public static void main(String[] args) {
        // Your code goes here
    }
}`,
  },
  {
    id: "csharp",
    label: "C#",
    fileName: "Program.cs",
    apiLanguage: "csharp",
    defaultCode: `using System;

class Program {
    static void Main() {
        // Your code goes here
    }
}`,
  },
  {
    id: "go",
    label: "Go",
    fileName: "main.go",
    apiLanguage: "go",
    defaultCode: `package main

import "fmt"

func main() {
    // Your code goes here
    fmt.Println("Hello, CodeBench")
}`,
  },
  {
    id: "rust",
    label: "Rust",
    fileName: "main.rs",
    apiLanguage: "rust",
    defaultCode: `fn main() {
    // Your code goes here
    println!("Hello, CodeBench");
}`,
  },
  {
    id: "php",
    label: "PHP",
    fileName: "main.php",
    apiLanguage: "php",
    defaultCode: `<?php
// Your code goes here
echo "Hello, CodeBench\\n";`,
  },
  {
    id: "ruby",
    label: "Ruby",
    fileName: "main.rb",
    apiLanguage: "ruby",
    defaultCode: `# Ruby starter template
def main
  # Your code goes here
end

main`,
  },
  {
    id: "swift",
    label: "Swift",
    fileName: "main.swift",
    apiLanguage: "swift",
    defaultCode: `import Foundation

func main() {
    // Your code goes here
}

main()`,
  },
  {
    id: "kotlin",
    label: "Kotlin",
    fileName: "Main.kt",
    apiLanguage: "kotlin",
    defaultCode: `fun main() {
    // Your code goes here
    println("Hello, CodeBench")
}`,
  },
  {
    id: "others",
    label: "Other",
    fileName: "snippet.txt",
    apiLanguage: "other",
    defaultCode: `// CodeBench — generic workspace
// Choose a language from the selector or paste any code here.

`,
  },
]

export const DEFAULT_CODEBENCH_LANGUAGE_ID: CodebenchLanguageId = "javascript"

export const LEARNING_MODE_OPTIONS: Array<{ value: CodebenchLearningMode; label: string; short: string }> = [
  { value: "beginner", label: "Beginner", short: "Beg" },
  { value: "intermediate", label: "Intermediate", short: "Int" },
  { value: "expert", label: "Expert", short: "Exp" },
]

export function getCodebenchLanguage(id: string | null | undefined): CodebenchLanguage {
  return (
    CODEBENCH_LANGUAGES.find((l) => l.id === id) ??
    CODEBENCH_LANGUAGES.find((l) => l.id === "javascript")!
  )
}
