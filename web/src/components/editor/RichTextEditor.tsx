import "katex/dist/katex.min.css";
import { useEffect, useState } from "react";
import { EditorContent, InputRule, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import TextAlign from "@tiptap/extension-text-align";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { useEditorContext } from "./EditorContext";
import { LatexRenderer } from "./LatexRenderer";
import { MathExtension } from "./MathExtension";
import { UnifiedToolbar } from "./UnifiedToolbar";

const CustomSuperscript = Superscript.extend({
  addInputRules() {
    return [
      new InputRule({
        find: /\^(\w+)$/,
        handler: ({ state, range, match }) => {
          const { tr } = state;
          const start = range.from;
          const end = range.to;
          const text = match[1];

          if (text) {
            tr.replaceWith(start, end, state.schema.text(text));
            tr.addMark(start, start + text.length, this.type.create());
            tr.removeMark(start + text.length, start + text.length, this.type);
          }
        }
      }),
      new InputRule({
        find: /(\w+)\^(\d+)$/,
        handler: ({ state, range, match }) => {
          const { tr } = state;
          const start = range.from;
          const end = range.to;
          const base = match[1];
          const sup = match[2];

          tr.insertText(base, start, end);
          const supStart = start + base.length;
          tr.insertText(sup, supStart);
          tr.addMark(supStart, supStart + sup.length, this.type.create());
        }
      })
    ];
  }
});

export function RichTextEditor(props: {
  id: string;
  label: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  enableMath?: boolean;
  showPreviewButton?: boolean;
  required?: boolean;
  minHeightClass?: string;
}): JSX.Element {
  const [showPreview, setShowPreview] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const { setActiveEditor, setActiveFieldId } = useEditorContext();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      CustomSuperscript,
      Subscript,
      MathExtension,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell
    ],
    content: props.value,
    editorProps: {
      attributes: {
        class: `sat-tiptap-surface ${props.minHeightClass ?? "sat-tiptap-surface-default"}`,
        "data-placeholder": props.placeholder ?? ""
      }
    },
    onFocus: ({ editor }) => {
      setIsFocused(true);
      setActiveEditor(editor);
      setActiveFieldId(props.id);
    },
    onBlur: () => {
      setIsFocused(false);
    },
    onUpdate: ({ editor }) => {
      props.onChange(editor.getHTML());
    }
  });

  useEffect(() => {
    if (editor && props.value !== editor.getHTML()) {
      if (!props.value) {
        editor.commands.clearContent();
      } else {
        editor.commands.setContent(props.value, { emitUpdate: false });
      }
    }
  }, [editor, props.value]);

  return (
    <div className="sat-rich-editor">
      <div className="sat-rich-editor-head">
        <label htmlFor={props.id} className={`sat-rich-editor-label ${isFocused ? "sat-rich-editor-label-focused" : ""}`}>
          {props.label}
        </label>
        <div className="sat-rich-editor-head-actions">
          <button
            type="button"
            onClick={() => {
              editor?.commands.clearContent();
              props.onChange("");
            }}
            className="sat-rich-editor-action sat-rich-editor-action-danger"
          >
            Clear
          </button>
          {props.showPreviewButton ? (
            <button
              type="button"
              onClick={() => setShowPreview((current) => !current)}
              className="sat-rich-editor-action sat-rich-editor-action-primary"
            >
              {showPreview ? "Hide Preview" : "Show Preview"}
            </button>
          ) : null}
        </div>
      </div>

      <div className={`sat-rich-editor-shell ${isFocused ? "sat-rich-editor-shell-focused" : ""}`}>
        <UnifiedToolbar editor={editor} showMath={props.enableMath ?? true} />
        <EditorContent editor={editor} />
        <input type="hidden" name={props.id} value={props.value} required={props.required} />
      </div>

      {showPreview ? (
        <div className="sat-rich-editor-preview">
          <p className="sat-rich-editor-preview-label">Preview (Student View)</p>
          <div className="sat-rich-editor-preview-body">
            <LatexRenderer>{props.value}</LatexRenderer>
          </div>
        </div>
      ) : null}
    </div>
  );
}