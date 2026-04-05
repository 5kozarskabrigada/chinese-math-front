import { createContext, useContext, useState, type ReactNode } from "react";
import type { Editor } from "@tiptap/react";

type EditorContextValue = {
  activeEditor: Editor | null;
  setActiveEditor: (editor: Editor | null) => void;
  activeFieldId: string | null;
  setActiveFieldId: (fieldId: string | null) => void;
  activeMathField: { cmd: (latex: string) => void; focus: () => void } | null;
  setActiveMathField: (field: { cmd: (latex: string) => void; focus: () => void } | null) => void;
};

const EditorContext = createContext<EditorContextValue | undefined>(undefined);

export function EditorProvider(props: { children: ReactNode }): JSX.Element {
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [activeMathField, setActiveMathField] = useState<{ cmd: (latex: string) => void; focus: () => void } | null>(null);

  return (
    <EditorContext.Provider
      value={{
        activeEditor,
        setActiveEditor,
        activeFieldId,
        setActiveFieldId,
        activeMathField,
        setActiveMathField
      }}
    >
      {props.children}
    </EditorContext.Provider>
  );
}

export function useEditorContext(): EditorContextValue {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error("useEditorContext must be used within an EditorProvider");
  }
  return context;
}