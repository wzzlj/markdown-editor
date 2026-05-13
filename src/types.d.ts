export {};

type OpenFileResult = {
  filePath: string;
  content: string;
};

type SaveFileResult = {
  filePath: string;
};

declare global {
  interface Window {
    markdownApi: {
      openFile: () => Promise<OpenFileResult | null>;
      saveFile: (payload: {
        filePath: string | null;
        content: string;
      }) => Promise<SaveFileResult | null>;
      saveFileAs: (payload: { content: string }) => Promise<SaveFileResult | null>;
      updateDocumentState: (payload: {
        filePath: string | null;
        content: string;
        isDirty: boolean;
      }) => void;
    };
  }
}
