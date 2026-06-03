import Editor, { loader } from "@monaco-editor/react";
import { useEffect } from "react";

loader.config({
  paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/min/vs" },
});

export function CodeEditor({
  value, language = "typescript", height = "100%", readOnly = false,
}: { value: string; language?: string; height?: string | number; readOnly?: boolean }) {
  useEffect(() => {
    loader.init().then((monaco) => {
      monaco.editor.defineTheme("devreview-dark", {
        base: "vs-dark",
        inherit: true,
        rules: [],
        colors: {
          "editor.background": "#0e1320",
          "editor.lineHighlightBackground": "#1a2138",
          "editorGutter.background": "#0e1320",
          "editorLineNumber.foreground": "#3d4663",
        },
      });
    });
  }, []);

  return (
    <Editor
      height={height}
      language={language}
      value={value}
      theme="devreview-dark"
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 13,
        fontFamily: "'JetBrains Mono', monospace",
        smoothScrolling: true,
        scrollBeyondLastLine: false,
        padding: { top: 12 },
        renderLineHighlight: "all",
      }}
      loading={<div className="flex h-full items-center justify-center text-xs text-muted-foreground">Loading editor…</div>}
    />
  );
}
