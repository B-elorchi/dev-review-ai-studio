import Editor, { loader } from "@monaco-editor/react";

loader.config({
  paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/min/vs" },
});

export function CodeEditor({
  value,
  defaultValue,
  language = "typescript",
  height = "100%",
  readOnly = false,
  onChange,
}: {
  // Use `value` for read-only / controlled display.
  // Use `defaultValue` for editable mode — avoids cursor resets on re-render.
  value?: string;
  defaultValue?: string;
  language?: string;
  height?: string | number;
  readOnly?: boolean;
  onChange?: (value: string) => void;
}) {
  const handleEditorWillMount = (monaco: any) => {
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
  };

  return (
    <Editor
      height={height}
      language={language}
      // When defaultValue is provided (edit mode) we leave value undefined so
      // Monaco manages its own state. key-based remounting handles file switches.
      value={defaultValue !== undefined ? undefined : value}
      defaultValue={defaultValue !== undefined ? defaultValue : undefined}
      onChange={(v) => onChange?.(v ?? "")}
      beforeMount={handleEditorWillMount}
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
        wordWrap: "on",
      }}
      loading={
        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
          Loading editor…
        </div>
      }
    />
  );
}
