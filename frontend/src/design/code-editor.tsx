import { lazy, Suspense, useRef } from "react";
import type { BeforeMount, OnMount } from "@monaco-editor/react";
import { useAppTheme } from "../context/ThemeContextProvider";
import { Skeleton } from "../ui/skeleton";

const MonacoEditor = lazy(() => import("@monaco-editor/react"));

/** Monaco themes derived from the Signal tokens (docs/REDESIGN.md §2). */
const defineThemes: BeforeMount = (monaco) => {
  monaco.editor.defineTheme("signal-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "5c6473", fontStyle: "italic" },
      { token: "string", foreground: "50e3c2" },
      { token: "number", foreground: "f5b544" },
      { token: "keyword", foreground: "b18cff" },
      { token: "type", foreground: "6fa8f0" },
      { token: "key", foreground: "9fb4d8" },
      { token: "string.key.json", foreground: "9fb4d8" },
      { token: "string.value.json", foreground: "50e3c2" },
    ],
    colors: {
      "editor.background": "#00000000",
      "editor.foreground": "#dfe4ec",
      "editorLineNumber.foreground": "#3a404b",
      "editorLineNumber.activeForeground": "#7c8494",
      "editor.lineHighlightBackground": "#ffffff08",
      "editor.lineHighlightBorder": "#00000000",
      "editor.selectionBackground": "#50e3c22e",
      "editor.inactiveSelectionBackground": "#50e3c214",
      "editorCursor.foreground": "#50e3c2",
      "editorIndentGuide.background1": "#ffffff0d",
      "editorIndentGuide.activeBackground1": "#ffffff26",
      "editorWidget.background": "#11141a",
      "editorWidget.border": "#ffffff1f",
      "scrollbarSlider.background": "#ffffff14",
      "scrollbarSlider.hoverBackground": "#ffffff26",
      "diffEditor.insertedTextBackground": "#50e3c21f",
      "diffEditor.removedTextBackground": "#ff5c7a24",
    },
  });
  monaco.editor.defineTheme("signal-paper", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "9aa0a8", fontStyle: "italic" },
      { token: "string", foreground: "0f8a74" },
      { token: "number", foreground: "a8650f" },
      { token: "keyword", foreground: "6e35d9" },
      { token: "type", foreground: "2f6fc0" },
      { token: "string.key.json", foreground: "2f4f7f" },
      { token: "string.value.json", foreground: "0f8a74" },
    ],
    colors: {
      "editor.background": "#00000000",
      "editor.foreground": "#14181f",
      "editorLineNumber.foreground": "#c4c7cc",
      "editorLineNumber.activeForeground": "#6b7280",
      "editor.lineHighlightBackground": "#14181f06",
      "editor.lineHighlightBorder": "#00000000",
      "editor.selectionBackground": "#0f9f8626",
      "editorCursor.foreground": "#0f9f86",
      "editorWidget.background": "#ffffff",
      "scrollbarSlider.background": "#14181f14",
    },
  });
};

export type CodeEditorProps = {
  value: string;
  onChange?: (value: string) => void;
  language?: string;
  readOnly?: boolean;
  onSave?: () => void;
  height?: string | number;
  ariaLabel?: string;
};

export function CodeEditor({ value, onChange, language = "plaintext", readOnly, onSave, height = "100%", ariaLabel }: CodeEditorProps) {
  const { themeMode } = useAppTheme();
  // Monaco binds commands once at mount; read the latest handler through a ref.
  const saveRef = useRef(onSave);
  saveRef.current = onSave;
  const onMount: OnMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => saveRef.current?.());
  };
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <MonacoEditor
        value={value}
        language={language}
        height={height}
        theme={themeMode === "light" ? "signal-paper" : "signal-dark"}
        beforeMount={defineThemes}
        onMount={onMount}
        onChange={(next) => onChange?.(next ?? "")}
        loading={<EditorSkeleton />}
        options={{
          readOnly,
          ariaLabel,
          fontFamily: '"Geist Mono Variable", ui-monospace, Menlo, monospace',
          fontSize: 13,
          lineHeight: 21,
          fontLigatures: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          renderLineHighlight: "all",
          padding: { top: 16, bottom: 96 },
          smoothScrolling: true,
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          wordWrap: "on",
          tabSize: 2,
          guides: { indentation: true },
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8, useShadows: false },
          automaticLayout: true,
        }}
      />
    </Suspense>
  );
}

function EditorSkeleton() {
  return (
    <div className="grid gap-2 p-5" aria-busy="true">
      {[70, 45, 82, 30, 60].map((width, index) => (
        <Skeleton key={index} className="h-3" style={{ width: `${width}%` }} />
      ))}
    </div>
  );
}

const LANGUAGE_BY_TYPE: [RegExp, string][] = [
  [/json/, "json"],
  [/html/, "html"],
  [/xml/, "xml"],
  [/css/, "css"],
  [/typescript/, "typescript"],
  [/javascript/, "javascript"],
  [/yaml/, "yaml"],
  [/markdown/, "markdown"],
  [/python/, "python"],
  [/shellscript|x-sh/, "shell"],
  [/sql/, "sql"],
  [/ini|toml/, "ini"],
  [/properties/, "ini"],
  [/php/, "php"],
  [/ruby/, "ruby"],
  [/x-go/, "go"],
  [/rust/, "rust"],
  [/java\b|x-java/, "java"],
  [/csharp/, "csharp"],
  [/x-c\+\+/, "cpp"],
  [/x-c\b/, "c"],
];

export function languageForContentType(contentType: string) {
  return LANGUAGE_BY_TYPE.find(([pattern]) => pattern.test(contentType))?.[1] ?? "plaintext";
}
