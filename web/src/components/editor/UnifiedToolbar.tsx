import type { Editor } from "@tiptap/react";
import { useEditorContext } from "./EditorContext";

type UnifiedToolbarProps = {
  editor: Editor | null;
  showMath?: boolean;
};

export function UnifiedToolbar(props: UnifiedToolbarProps): JSX.Element {
  const isDisabled = !props.editor || !props.editor.isEditable;
  const { activeMathField } = useEditorContext();

  function insertMath(latex: string) {
    if (activeMathField) {
      activeMathField.cmd(latex);
      activeMathField.focus();
      return;
    }

    if (!props.editor || isDisabled) {
      return;
    }

    props.editor.chain().focus().insertContent({
      type: "mathComponent",
      attrs: { latex, display: "inline", align: "left" }
    }).run();
  }

  function insertMathNode() {
    if (!props.editor || isDisabled) {
      return;
    }

    props.editor.chain().focus().insertContent({
      type: "mathComponent",
      attrs: { latex: "", display: "inline", align: "left" }
    }).run();
  }

  function preventFocusLoss(event: React.MouseEvent) {
    event.preventDefault();
  }

  return (
    <div className="sat-unified-toolbar">
      <div className="sat-unified-toolbar-primary">
        <div className="sat-unified-toolbar-group">
          <ToolbarButton onClick={() => props.editor?.chain().focus().toggleBold().run()} isActive={props.editor?.isActive("bold")} disabled={isDisabled} title="Bold (Ctrl+B)"><span className="font-bold">B</span></ToolbarButton>
          <ToolbarButton onClick={() => props.editor?.chain().focus().toggleItalic().run()} isActive={props.editor?.isActive("italic")} disabled={isDisabled} title="Italic (Ctrl+I)"><span className="italic font-serif">I</span></ToolbarButton>
          <ToolbarButton onClick={() => props.editor?.chain().focus().toggleUnderline().run()} isActive={props.editor?.isActive("underline")} disabled={isDisabled} title="Underline (Ctrl+U)"><span className="underline">U</span></ToolbarButton>
        </div>

        <div className="sat-unified-toolbar-group">
          <ToolbarButton onClick={() => props.editor?.chain().focus().toggleBulletList().run()} isActive={props.editor?.isActive("bulletList")} disabled={isDisabled} title="Bullet List">•</ToolbarButton>
          <ToolbarButton onClick={() => props.editor?.chain().focus().toggleOrderedList().run()} isActive={props.editor?.isActive("orderedList")} disabled={isDisabled} title="Numbered List">1.</ToolbarButton>
        </div>

        <div className="sat-unified-toolbar-group">
          <ToolbarButton onClick={() => props.editor?.chain().focus().setTextAlign("left").run()} isActive={props.editor?.isActive({ textAlign: "left" })} disabled={isDisabled} title="Align Left">≡</ToolbarButton>
          <ToolbarButton onClick={() => props.editor?.chain().focus().setTextAlign("center").run()} isActive={props.editor?.isActive({ textAlign: "center" })} disabled={isDisabled} title="Align Center">≣</ToolbarButton>
          <ToolbarButton onClick={() => props.editor?.chain().focus().setTextAlign("right").run()} isActive={props.editor?.isActive({ textAlign: "right" })} disabled={isDisabled} title="Align Right">☰</ToolbarButton>
          <ToolbarButton onClick={() => props.editor?.chain().focus().setTextAlign("justify").run()} isActive={props.editor?.isActive({ textAlign: "justify" })} disabled={isDisabled} title="Justify">☷</ToolbarButton>
        </div>

        <div className="sat-unified-toolbar-group">
          <ToolbarButton onClick={() => (props.editor?.chain().focus() as any)?.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} disabled={isDisabled} title="Insert Table (3x3)">▦</ToolbarButton>
          {props.editor?.isActive("table") ? (
            <>
              <ToolbarButton onClick={() => (props.editor?.chain().focus() as any)?.addColumnBefore().run()} disabled={isDisabled} title="Add Column Before">+C←</ToolbarButton>
              <ToolbarButton onClick={() => (props.editor?.chain().focus() as any)?.addColumnAfter().run()} disabled={isDisabled} title="Add Column After">+C→</ToolbarButton>
              <ToolbarButton onClick={() => (props.editor?.chain().focus() as any)?.deleteColumn().run()} disabled={isDisabled} title="Delete Column">xC</ToolbarButton>
              <ToolbarButton onClick={() => (props.editor?.chain().focus() as any)?.addRowBefore().run()} disabled={isDisabled} title="Add Row Before">+R↑</ToolbarButton>
              <ToolbarButton onClick={() => (props.editor?.chain().focus() as any)?.addRowAfter().run()} disabled={isDisabled} title="Add Row After">+R↓</ToolbarButton>
              <ToolbarButton onClick={() => (props.editor?.chain().focus() as any)?.deleteRow().run()} disabled={isDisabled} title="Delete Row">xR</ToolbarButton>
              <ToolbarButton onClick={() => (props.editor?.chain().focus() as any)?.mergeCells().run()} disabled={isDisabled} title="Merge Cells">Mrg</ToolbarButton>
              <ToolbarButton onClick={() => (props.editor?.chain().focus() as any)?.deleteTable().run()} disabled={isDisabled} title="Delete Table">xTbl</ToolbarButton>
            </>
          ) : null}
        </div>

        {props.showMath ? (
          <>
            <div className="sat-unified-toolbar-group sat-unified-toolbar-group-insert-math">
              <button type="button" onClick={insertMathNode} disabled={isDisabled} className="sat-unified-insert-math-button" title="Insert Interactive Formula Box">
                <span className="font-serif italic">f(x)</span>
                Insert Math
              </button>
            </div>

            <div className="sat-unified-toolbar-group">
              <ToolbarButton onMouseDown={preventFocusLoss} onClick={() => insertMath("\\frac{}{}") } disabled={isDisabled} title="Fraction" isMath>½</ToolbarButton>
              <ToolbarButton onMouseDown={preventFocusLoss} onClick={() => insertMath("\\sqrt{}") } disabled={isDisabled} title="Square Root" isMath>√</ToolbarButton>
              <ToolbarButton onMouseDown={preventFocusLoss} onClick={() => insertMath("\\sqrt[]{}") } disabled={isDisabled} title="N-th Root" isMath>∛</ToolbarButton>
              <ToolbarButton onMouseDown={preventFocusLoss} onClick={() => insertMath("^{}") } disabled={isDisabled} title="Superscript / Power" isMath>xʸ</ToolbarButton>
              <ToolbarButton onMouseDown={preventFocusLoss} onClick={() => insertMath("_{}") } disabled={isDisabled} title="Subscript" isMath>xᵧ</ToolbarButton>
              <ToolbarButton onMouseDown={preventFocusLoss} onClick={() => insertMath("|") } disabled={isDisabled} title="Absolute Value" isMath>|x|</ToolbarButton>
            </div>
          </>
        ) : null}
      </div>

      {props.showMath ? (
        <div className="sat-unified-toolbar-secondary">
          <div className="sat-unified-toolbar-secondary-group"><span className="sat-unified-toolbar-label">Trig</span><ToolbarButton onMouseDown={preventFocusLoss} onClick={() => insertMath("\\sin") } disabled={isDisabled} title="Sine" isMath className="sat-unified-toolbar-wide">sin</ToolbarButton><ToolbarButton onMouseDown={preventFocusLoss} onClick={() => insertMath("\\cos") } disabled={isDisabled} title="Cosine" isMath className="sat-unified-toolbar-wide">cos</ToolbarButton><ToolbarButton onMouseDown={preventFocusLoss} onClick={() => insertMath("\\tan") } disabled={isDisabled} title="Tangent" isMath className="sat-unified-toolbar-wide">tan</ToolbarButton></div>
          <div className="sat-unified-toolbar-separator" />
          <div className="sat-unified-toolbar-secondary-group"><span className="sat-unified-toolbar-label">Rel</span><ToolbarButton onMouseDown={preventFocusLoss} onClick={() => insertMath("\\le") } disabled={isDisabled} title="Less than or equal" isMath>≤</ToolbarButton><ToolbarButton onMouseDown={preventFocusLoss} onClick={() => insertMath("\\ge") } disabled={isDisabled} title="Greater than or equal" isMath>≥</ToolbarButton><ToolbarButton onMouseDown={preventFocusLoss} onClick={() => insertMath("\\ne") } disabled={isDisabled} title="Not equal" isMath>≠</ToolbarButton><ToolbarButton onMouseDown={preventFocusLoss} onClick={() => insertMath("\\approx") } disabled={isDisabled} title="Approximately" isMath>≈</ToolbarButton></div>
          <div className="sat-unified-toolbar-separator" />
          <div className="sat-unified-toolbar-secondary-group"><span className="sat-unified-toolbar-label">Sym</span><ToolbarButton onMouseDown={preventFocusLoss} onClick={() => insertMath("\\pi") } disabled={isDisabled} title="Pi" isMath>π</ToolbarButton><ToolbarButton onMouseDown={preventFocusLoss} onClick={() => insertMath("\\theta") } disabled={isDisabled} title="Theta" isMath>θ</ToolbarButton><ToolbarButton onMouseDown={preventFocusLoss} onClick={() => insertMath("\\infty") } disabled={isDisabled} title="Infinity" isMath>∞</ToolbarButton><ToolbarButton onMouseDown={preventFocusLoss} onClick={() => insertMath("^{\\circ}") } disabled={isDisabled} title="Degree" isMath>°</ToolbarButton><ToolbarButton onMouseDown={preventFocusLoss} onClick={() => insertMath("^{\\circ}C") } disabled={isDisabled} title="Celsius" isMath>°C</ToolbarButton></div>
          <div className="sat-unified-toolbar-separator" />
          <div className="sat-unified-toolbar-secondary-group"><span className="sat-unified-toolbar-label">Geo</span><ToolbarButton onMouseDown={preventFocusLoss} onClick={() => insertMath("\\angle") } disabled={isDisabled} title="Angle" isMath>∠</ToolbarButton><ToolbarButton onMouseDown={preventFocusLoss} onClick={() => insertMath("\\triangle") } disabled={isDisabled} title="Triangle" isMath>△</ToolbarButton><ToolbarButton onMouseDown={preventFocusLoss} onClick={() => insertMath("\\parallel") } disabled={isDisabled} title="Parallel" isMath>∥</ToolbarButton><ToolbarButton onMouseDown={preventFocusLoss} onClick={() => insertMath("\\perp") } disabled={isDisabled} title="Perpendicular" isMath>⊥</ToolbarButton></div>
        </div>
      ) : null}
    </div>
  );
}

function ToolbarButton(props: {
  onClick: () => void;
  onMouseDown?: (event: React.MouseEvent) => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
  isMath?: boolean;
  className?: string;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={props.onClick}
      onMouseDown={props.onMouseDown}
      disabled={props.disabled}
      title={props.title}
      className={[
        "sat-unified-toolbar-button",
        props.isActive ? "sat-unified-toolbar-button-active" : "",
        props.disabled ? "sat-unified-toolbar-button-disabled" : "",
        props.isMath ? "sat-unified-toolbar-button-math" : "",
        props.className ?? ""
      ].filter(Boolean).join(" ")}
    >
      {props.children}
    </button>
  );
}