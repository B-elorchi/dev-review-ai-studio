import Editor, { loader } from "@monaco-editor/react";
import { forwardRef, useImperativeHandle, useRef } from "react";

loader.config({
  paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/min/vs" },
});

export type CodeEditorHandle = {
  /** Replace the entire editor content without remounting (preserves cursor). */
  setValue: (code: string) => void;
};

export const CodeEditor = forwardRef<CodeEditorHandle, {
  value?: string;
  defaultValue?: string;
  language?: string;
  height?: string | number;
  readOnly?: boolean;
  onChange?: (value: string) => void;
}>(function CodeEditor(
  { value, defaultValue, language = "typescript", height = "100%", readOnly = false, onChange },
  ref,
) {
  const editorRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    setValue(code: string) {
      const model = editorRef.current?.getModel();
      if (model) model.setValue(code);
    },
  }));

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
      value={defaultValue !== undefined ? undefined : value}
      defaultValue={defaultValue !== undefined ? defaultValue : undefined}
      onChange={(v) => onChange?.(v ?? "")}
      beforeMount={handleEditorWillMount}
      onMount={(editor) => { editorRef.current = editor; }}
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
});
