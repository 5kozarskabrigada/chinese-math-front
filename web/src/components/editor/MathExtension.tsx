import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { InlineMath } from "react-katex";
import { useEffect, useRef, useState } from "react";
import { useEditorContext } from "./EditorContext";
import { MathInput } from "./MathInput";
import { MathToolbar } from "./MathToolbar";

function MathComponent(props: any): JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  const [latex, setLatex] = useState(props.node.attrs.latex || "");
  const mathFieldRef = useRef<any>(null);
  const { setActiveMathField } = useEditorContext();

  function handleUpdate(nextLatex: string) {
    setLatex(nextLatex);
    props.updateAttributes({ latex: nextLatex });
  }

  function handleToolbarInsert(symbol: string) {
    if (mathFieldRef.current) {
      mathFieldRef.current.cmd(symbol);
      mathFieldRef.current.focus();
    }
  }

  function toggleAlign() {
    const newAlign = props.node.attrs.align === "center" ? "left" : "center";
    props.updateAttributes({ align: newAlign, display: newAlign === "center" ? "block" : "inline" });
  }

  useEffect(() => {
    if (!isEditing) {
      setActiveMathField(null);
    }
  }, [isEditing, setActiveMathField]);

  return (
    <NodeViewWrapper className={`inline-block mx-1 align-middle ${props.node.attrs.align === "center" ? "sat-math-node-block" : ""}`}>
      {isEditing ? (
        <div className={`sat-math-node-editor ${props.node.attrs.align === "center" ? "sat-math-node-editor-centered" : ""}`}>
          <div className="sat-math-node-topbar">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                toggleAlign();
              }}
              className={`sat-math-node-align ${props.node.attrs.align === "center" ? "sat-math-node-align-active" : ""}`}
            >
              {props.node.attrs.align === "center" ? "Center" : "Left"}
            </button>
          </div>

          <div className="sat-math-node-toolbar">
            <MathToolbar onInsert={handleToolbarInsert} />
          </div>

          <MathInput
            value={latex}
            onChange={handleUpdate}
            className={props.node.attrs.align === "center" ? "sat-math-node-input-centered" : ""}
            onInit={(mathField) => {
              mathFieldRef.current = mathField;
              window.setTimeout(() => {
                mathField.focus();
                setActiveMathField(mathField);
              }, 50);
            }}
          />

          <div
            className="sat-math-node-overlay"
            onClick={(event) => {
              event.stopPropagation();
              setIsEditing(false);
              setActiveMathField(null);
            }}
          />
        </div>
      ) : (
        <span
          className="sat-math-node-display"
          onClick={() => setIsEditing(true)}
          title="Click to edit formula"
        >
          {latex ? <InlineMath math={latex} /> : <span className="sat-math-node-placeholder">[Formula]</span>}
        </span>
      )}
    </NodeViewWrapper>
  );
}

export const MathExtension = Node.create({
  name: "mathComponent",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      latex: { default: "" },
      display: { default: "inline" },
      align: { default: "left" }
    };
  },

  parseHTML() {
    return [{ tag: "math-component" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["math-component", mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathComponent);
  }
});