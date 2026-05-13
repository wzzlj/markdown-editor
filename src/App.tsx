import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";
import {
  Activity,
  BarChart3,
  FilePlus,
  FileText,
  FolderOpen,
  Moon,
  Save,
  SaveAll,
  SplitSquareHorizontal,
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
  workspace: "\u5de5\u4f5c\u53f0",
  markdownView: "\u004d\u0061\u0072\u006b\u0064\u006f\u0077\u006e \u89c6\u56fe",
  splitView: "\u5206\u680f\u89c6\u56fe",
  livePreview: "\u5b9e\u65f6\u9884\u89c8",
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
  const [isDark, setIsDark] = useState(true);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const previewRef = useRef<HTMLElement | null>(null);
  const isSyncingScrollRef = useRef(false);

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

  async function handleNewFile() {
    setContent("");
    setFilePath(null);
    setIsDirty(false);
  }

  async function handleOpenFile() {
    const result = await window.markdownApi.openFile();

    if (!result) {
      return;
    }

    setContent(result.content);
    setFilePath(result.filePath);
    setIsDirty(false);
  }

  async function handleSaveFile() {
    const result = await window.markdownApi.saveFile({
      filePath,
      content
    });

    if (!result) {
      return;
    }

    setFilePath(result.filePath);
    setIsDirty(false);
  }

  async function handleSaveAsFile() {
    const result = await window.markdownApi.saveFileAs({ content });

    if (!result) {
      return;
    }

    setFilePath(result.filePath);
    setIsDirty(false);
  }

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
            onClick={() => setIsDark((current) => !current)}
            title={isDark ? text.switchToLight : text.switchToDark}
            aria-label={isDark ? text.switchToLight : text.switchToDark}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      <div className="workspace">
        <aside className="side-rail" aria-label={text.workspace}>
          <button className="rail-button active" type="button" title={text.markdownView}>
            <FileText size={20} />
          </button>
          <button className="rail-button" type="button" title={text.splitView}>
            <SplitSquareHorizontal size={20} />
          </button>
          <button className="rail-button" type="button" title={text.livePreview}>
            <BarChart3 size={20} />
          </button>
        </aside>

        <section className="editor-shell" aria-label={text.editorLabel}>
          <label className="pane editor-pane">
            <span className="pane-label">
              <Activity size={13} />
              {text.source}
            </span>
            <textarea
              ref={editorRef}
              value={content}
              spellCheck="false"
              onScroll={(event) => {
                if (previewRef.current) {
                  syncScroll(event.currentTarget, previewRef.current);
                }
              }}
              onChange={(event) => {
                setContent(event.target.value);
                setIsDirty(true);
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
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </section>
        </section>
      </div>

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
