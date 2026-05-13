import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CompositionEvent
} from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";
import {
  Activity,
  FilePlus,
  FolderOpen,
  Moon,
  Save,
  SaveAll,
  Sun
} from "lucide-react";

const text = {
  appName: "\u004d\u0061\u0072\u006b\u0064\u006f\u0077\u006e \u0053\u0074\u0075\u0064\u0069\u006f",
  untitled: "\u672a\u547d\u540d\u6587\u6863",
  documentActions: "\u6587\u6863\u64cd\u4f5c",
  newDocument: "\u65b0\u5efa\u6587\u6863",
  openFile: "\u6253\u5f00\u6587\u4ef6",
  saveFile: "\u4fdd\u5b58\u6587\u4ef6",
  saveAs: "\u53e6\u5b58\u4e3a",
  new: "\u65b0\u5efa",
  open: "\u6253\u5f00",
  save: "\u4fdd\u5b58",
  switchToLight: "\u5207\u6362\u5230\u6d45\u8272\u6a21\u5f0f",
  switchToDark: "\u5207\u6362\u5230\u6df1\u8272\u6a21\u5f0f",
  editorLabel: "\u004d\u0061\u0072\u006b\u0064\u006f\u0077\u006e \u7f16\u8f91\u5668",
  edit: "\u7f16\u8f91",
  preview: "\u9884\u89c8",
  source: "\u6e90\u6587",
  rendered: "\u6e32\u67d3",
  lines: "\u884c",
  chars: "\u5b57\u7b26",
  unsaved: "\u672a\u4fdd\u5b58",
  saved: "\u5df2\u4fdd\u5b58",
  synced: "\u6eda\u52a8\u540c\u6b65"
};

const starterMarkdown = `# \u6211\u7684\u7b2c\u4e00\u7bc7 Markdown

\u6b22\u8fce\u4f7f\u7528\u4f60\u7684 Markdown \u7f16\u8f91\u5668\u3002

## \u53ef\u4ee5\u8bd5\u8bd5\u8fd9\u4e9b\u8bed\u6cd5

- \u5199\u4e00\u4e2a\u5217\u8868
- \u4f7f\u7528 **\u52a0\u7c97\u6587\u5b57**
- \u4f7f\u7528 \`\u884c\u5185\u4ee3\u7801\`

\`\`\`js
console.log("Hello Markdown");
\`\`\`
`;

const defaultEditorFontSize = 14;
const minEditorFontSize = 12;
const maxEditorFontSize = 22;
const maxUndoHistory = 100;

type EditorSnapshot = {
  content: string;
  selectionStart: number;
  selectionEnd: number;
};

function getFileName(filePath: string | null) {
  if (!filePath) {
    return text.untitled;
  }

  return filePath.split(/[\\/]/).pop() ?? text.untitled;
}

export default function App() {
  const [content, setContent] = useState(starterMarkdown);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [editorFontSize, setEditorFontSize] = useState(defaultEditorFontSize);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const previewRef = useRef<HTMLElement | null>(null);
  const isSyncingScrollRef = useRef(false);
  const savedContentRef = useRef(starterMarkdown);
  const undoHistoryRef = useRef<EditorSnapshot[]>([]);
  const isComposingRef = useRef(false);
  const compositionSnapshotRef = useRef<EditorSnapshot | null>(null);
  const ignoreNextChangeValueRef = useRef<string | null>(null);

  const previewHtml = useMemo(() => {
    const html = marked.parse(content, { breaks: true }) as string;
    return DOMPurify.sanitize(html);
  }, [content]);

  const fileName = getFileName(filePath);
  const lineCount = content.length === 0 ? 1 : content.split(/\r\n|\r|\n/).length;
  const characterCount = content.length;

  const syncScroll = useCallback((source: HTMLElement, target: HTMLElement) => {
    if (isSyncingScrollRef.current) {
      return;
    }

    const sourceMaxScroll = source.scrollHeight - source.clientHeight;
    const targetMaxScroll = target.scrollHeight - target.clientHeight;
    const scrollRatio = sourceMaxScroll > 0 ? source.scrollTop / sourceMaxScroll : 0;

    isSyncingScrollRef.current = true;
    target.scrollTop = targetMaxScroll > 0 ? scrollRatio * targetMaxScroll : 0;

    window.requestAnimationFrame(() => {
      isSyncingScrollRef.current = false;
    });
  }, []);

  useLayoutEffect(() => {
    if (!editorRef.current || !previewRef.current) {
      return;
    }

    syncScroll(editorRef.current, previewRef.current);
  }, [previewHtml, syncScroll]);

  useEffect(() => {
    window.markdownApi.updateDocumentState({
      filePath,
      content,
      isDirty
    });
  }, [content, filePath, isDirty]);

  const restoreEditorSelection = useCallback((start: number, end: number) => {
    window.requestAnimationFrame(() => {
      const editor = editorRef.current;

      if (!editor) {
        return;
      }

      editor.focus();
      editor.setSelectionRange(start, end);
    });
  }, []);

  const appendUndoSnapshot = useCallback((snapshot: EditorSnapshot) => {
    const latestSnapshot = undoHistoryRef.current[undoHistoryRef.current.length - 1];

    if (
      latestSnapshot?.content === snapshot.content &&
      latestSnapshot.selectionStart === snapshot.selectionStart &&
      latestSnapshot.selectionEnd === snapshot.selectionEnd
    ) {
      return;
    }

    undoHistoryRef.current = [...undoHistoryRef.current, snapshot].slice(-maxUndoHistory);
  }, []);

  const recordUndoSnapshot = useCallback(() => {
    const editor = editorRef.current;

    appendUndoSnapshot({
      content,
      selectionStart: editor?.selectionStart ?? content.length,
      selectionEnd: editor?.selectionEnd ?? content.length
    });
  }, [appendUndoSnapshot, content]);

  const updateComposingContent = useCallback((nextContent: string) => {
    setContent(nextContent);
    setIsDirty(nextContent !== savedContentRef.current);
  }, []);

  const commitEditorContent = useCallback(
    (nextContent: string, selectionStart?: number, selectionEnd?: number) => {
      if (nextContent === content) {
        return;
      }

      recordUndoSnapshot();
      setContent(nextContent);
      setIsDirty(nextContent !== savedContentRef.current);

      if (selectionStart !== undefined && selectionEnd !== undefined) {
        restoreEditorSelection(selectionStart, selectionEnd);
      }
    },
    [content, recordUndoSnapshot, restoreEditorSelection]
  );

  const handleUndo = useCallback(() => {
    const snapshot = undoHistoryRef.current[undoHistoryRef.current.length - 1];

    if (!snapshot) {
      return false;
    }

    undoHistoryRef.current = undoHistoryRef.current.slice(0, -1);
    setContent(snapshot.content);
    setIsDirty(snapshot.content !== savedContentRef.current);
    restoreEditorSelection(snapshot.selectionStart, snapshot.selectionEnd);
    return true;
  }, [restoreEditorSelection]);

  const handleCompositionStart = useCallback(
    (event: CompositionEvent<HTMLTextAreaElement>) => {
      isComposingRef.current = true;
      compositionSnapshotRef.current = {
        content,
        selectionStart: event.currentTarget.selectionStart,
        selectionEnd: event.currentTarget.selectionEnd
      };
    },
    [content]
  );

  const handleCompositionEnd = useCallback(
    (event: CompositionEvent<HTMLTextAreaElement>) => {
      const nextContent = event.currentTarget.value;
      const snapshot = compositionSnapshotRef.current;

      isComposingRef.current = false;
      compositionSnapshotRef.current = null;
      ignoreNextChangeValueRef.current = nextContent;

      if (snapshot && snapshot.content !== nextContent) {
        appendUndoSnapshot(snapshot);
      }

      setContent(nextContent);
      setIsDirty(nextContent !== savedContentRef.current);
    },
    [appendUndoSnapshot]
  );

  const handleNewFile = useCallback(async () => {
    setContent("");
    setFilePath(null);
    savedContentRef.current = "";
    undoHistoryRef.current = [];
    setIsDirty(false);
  }, []);

  const handleOpenFile = useCallback(async () => {
    const result = await window.markdownApi.openFile();

    if (!result) {
      return;
    }

    setContent(result.content);
    setFilePath(result.filePath);
    savedContentRef.current = result.content;
    undoHistoryRef.current = [];
    setIsDirty(false);
  }, []);

  const handleSaveFile = useCallback(async () => {
    const result = await window.markdownApi.saveFile({
      filePath,
      content
    });

    if (!result) {
      return;
    }

    setFilePath(result.filePath);
    savedContentRef.current = content;
    undoHistoryRef.current = [];
    setIsDirty(false);
  }, [content, filePath]);

  const handleSaveAsFile = useCallback(async () => {
    const result = await window.markdownApi.saveFileAs({ content });

    if (!result) {
      return;
    }

    setFilePath(result.filePath);
    savedContentRef.current = content;
    undoHistoryRef.current = [];
    setIsDirty(false);
  }, [content]);

  const handleToggleTheme = useCallback(() => {
    setIsDark((current) => !current);
  }, []);

  const toggleMarkdownWrapper = useCallback(
    (prefix: string, suffix: string, fallback: string) => {
      const editor = editorRef.current;

      if (!editor) {
        return;
      }

      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      const selectedText = content.slice(start, end) || fallback;
      const hasWrapper =
        selectedText.startsWith(prefix) &&
        selectedText.endsWith(suffix) &&
        selectedText.length >= prefix.length + suffix.length;
      const isBoldOnlySelection =
        prefix === "*" &&
        selectedText.startsWith("**") &&
        selectedText.endsWith("**") &&
        !selectedText.startsWith("***") &&
        !selectedText.endsWith("***");

      if (hasWrapper && !isBoldOnlySelection) {
        const unwrappedText = selectedText.slice(prefix.length, selectedText.length - suffix.length);
        const nextContent =
          content.slice(0, start) + unwrappedText + content.slice(end);

        commitEditorContent(nextContent, start, start + unwrappedText.length);
        return;
      }

      const wrappedText = prefix + selectedText + suffix;
      const nextContent = content.slice(0, start) + wrappedText + content.slice(end);
      const selectedStart = start + prefix.length;
      const selectedEnd = selectedStart + selectedText.length;

      commitEditorContent(nextContent, selectedStart, selectedEnd);
    },
    [commitEditorContent, content]
  );

  const insertMarkdownLink = useCallback(() => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selectedText = content.slice(start, end) || "\u94fe\u63a5\u6587\u672c";
    const url = "https://";
    const replacement = `[${selectedText}](${url})`;
    const nextContent = content.slice(0, start) + replacement + content.slice(end);
    const urlStart = start + selectedText.length + 3;

    commitEditorContent(nextContent, urlStart, urlStart + url.length);
  }, [commitEditorContent, content]);

  const indentSelectedLines = useCallback(
    (shouldOutdent: boolean) => {
      const editor = editorRef.current;

      if (!editor) {
        return;
      }

      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      const lineStart = content.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
      const endForLine = end > start && content[end - 1] === "\n" ? end - 1 : end;
      const nextLineBreak = content.indexOf("\n", endForLine);
      const lineEnd = nextLineBreak === -1 ? content.length : nextLineBreak;
      const block = content.slice(lineStart, lineEnd);
      const nextBlock = block
        .split("\n")
        .map((line) => {
          if (shouldOutdent) {
            return line.replace(/^ {1,2}|\t/, "");
          }

          return line.length > 0 ? `  ${line}` : line;
        })
        .join("\n");

      commitEditorContent(
        content.slice(0, lineStart) + nextBlock + content.slice(lineEnd),
        lineStart,
        lineStart + nextBlock.length
      );
    },
    [commitEditorContent, content]
  );

  const changeEditorFontSize = useCallback((delta: number) => {
    setEditorFontSize((current) =>
      Math.min(maxEditorFontSize, Math.max(minEditorFontSize, current + delta))
    );
  }, []);

  const resetEditorFontSize = useCallback(() => {
    setEditorFontSize(defaultEditorFontSize);
  }, []);

  useEffect(() => {
    function handleKeyboardShortcuts(event: KeyboardEvent) {
      const isShortcut = event.ctrlKey || event.metaKey;

      if (!isShortcut) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "z" && !event.shiftKey) {
        if (handleUndo()) {
          event.preventDefault();
        }

        return;
      }

      if (key === "n") {
        event.preventDefault();
        void handleNewFile();
        return;
      }

      if (key === "o") {
        event.preventDefault();
        void handleOpenFile();
        return;
      }

      if (key === "s" && event.shiftKey) {
        event.preventDefault();
        void handleSaveAsFile();
        return;
      }

      if (key === "s") {
        event.preventDefault();
        void handleSaveFile();
        return;
      }

      if (key === ",") {
        event.preventDefault();
        handleToggleTheme();
        return;
      }

      if (key === "b") {
        event.preventDefault();
        toggleMarkdownWrapper("**", "**", "\u52a0\u7c97\u6587\u5b57");
        return;
      }

      if (key === "i") {
        event.preventDefault();
        toggleMarkdownWrapper("*", "*", "\u659c\u4f53\u6587\u5b57");
        return;
      }

      if (key === "k") {
        event.preventDefault();
        insertMarkdownLink();
        return;
      }

      if (key === "=" || key === "+") {
        event.preventDefault();
        changeEditorFontSize(1);
        return;
      }

      if (key === "-") {
        event.preventDefault();
        changeEditorFontSize(-1);
        return;
      }

      if (key === "0") {
        event.preventDefault();
        resetEditorFontSize();
      }
    }

    window.addEventListener("keydown", handleKeyboardShortcuts);

    return () => {
      window.removeEventListener("keydown", handleKeyboardShortcuts);
    };
  }, [
    changeEditorFontSize,
    handleNewFile,
    handleOpenFile,
    handleSaveAsFile,
    handleSaveFile,
    handleToggleTheme,
    handleUndo,
    insertMarkdownLink,
    resetEditorFontSize,
    toggleMarkdownWrapper
  ]);

  return (
    <main className={isDark ? "app app-dark" : "app"}>
      <header className="toolbar">
        <div className="brand-strip">
          <span className="brand-mark">MD</span>
          <div className="title-block">
            <span className="eyebrow">{text.appName}</span>
            <h1 title={fileName}>
              {fileName}
              {isDirty ? " *" : ""}
            </h1>
          </div>
        </div>

        <div className="toolbar-actions" aria-label={text.documentActions}>
          <button className="tool-button" type="button" onClick={handleNewFile} title={text.newDocument}>
            <FilePlus size={18} />
            <span>{text.new}</span>
          </button>
          <button className="tool-button" type="button" onClick={handleOpenFile} title={text.openFile}>
            <FolderOpen size={18} />
            <span>{text.open}</span>
          </button>
          <button className="tool-button primary-action" type="button" onClick={handleSaveFile} title={text.saveFile}>
            <Save size={18} />
            <span>{text.save}</span>
          </button>
          <button className="tool-button" type="button" onClick={handleSaveAsFile} title={text.saveAs}>
            <SaveAll size={18} />
            <span>{text.saveAs}</span>
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={handleToggleTheme}
            title={isDark ? text.switchToLight : text.switchToDark}
            aria-label={isDark ? text.switchToLight : text.switchToDark}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      <section className="editor-shell" aria-label={text.editorLabel}>
        <label className="pane editor-pane">
          <span className="pane-label">
            <Activity size={13} />
            {text.source}
          </span>
          <textarea
            ref={editorRef}
            value={content}
            style={{ fontSize: `${editorFontSize}px` }}
            spellCheck="false"
            onKeyDown={(event) => {
              if (event.key === "Tab") {
                event.preventDefault();
                indentSelectedLines(event.shiftKey);
              }
            }}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            onScroll={(event) => {
              if (previewRef.current) {
                syncScroll(event.currentTarget, previewRef.current);
              }
            }}
            onChange={(event) => {
              if (isComposingRef.current) {
                updateComposingContent(event.target.value);
                return;
              }

              if (ignoreNextChangeValueRef.current === event.target.value) {
                ignoreNextChangeValueRef.current = null;
                updateComposingContent(event.target.value);
                return;
              }

              commitEditorContent(event.target.value);
            }}
          />
        </label>

        <section
          ref={previewRef}
          className="pane preview-pane"
          aria-label={text.preview}
          onScroll={(event) => {
            if (editorRef.current) {
              syncScroll(event.currentTarget, editorRef.current);
            }
          }}
        >
          <span className="pane-label">
            <Activity size={13} />
            {text.rendered}
          </span>
          <article
            className="markdown-preview"
            style={{ fontSize: `${editorFontSize}px` }}
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </section>
      </section>

      <footer className="status-bar">
        <span className={isDirty ? "status-pill status-warning" : "status-pill status-ok"}>
          {isDirty ? text.unsaved : text.saved}
        </span>
        <span>{lineCount} {text.lines}</span>
        <span>{characterCount} {text.chars}</span>
        <span>{text.synced}</span>
      </footer>
    </main>
  );
}
