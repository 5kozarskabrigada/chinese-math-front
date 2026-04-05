import { useState } from "react";

type ToolbarButton = {
  label: string;
  latex: string;
};

type ToolbarGroup = {
  group: string;
  items: ToolbarButton[];
};

const toolbarButtons: ToolbarGroup[] = [
  {
    group: "Basic",
    items: [
      { label: "+", latex: "+" },
      { label: "−", latex: "-" },
      { label: "×", latex: "\\times" },
      { label: "÷", latex: "\\div" },
      { label: "=", latex: "=" },
      { label: "±", latex: "\\pm" }
    ]
  },
  {
    group: "Powers",
    items: [
      { label: "x²", latex: "^{2}" },
      { label: "xⁿ", latex: "^{}" },
      { label: "√", latex: "\\sqrt{}" },
      { label: "∛", latex: "\\sqrt[3]{}" }
    ]
  },
  {
    group: "Fractions",
    items: [{ label: "a/b", latex: "\\frac{}{}" }]
  },
  {
    group: "Functions",
    items: [
      { label: "sin", latex: "\\sin" },
      { label: "cos", latex: "\\cos" },
      { label: "tan", latex: "\\tan" },
      { label: "log", latex: "\\log" },
      { label: "ln", latex: "\\ln" }
    ]
  },
  {
    group: "Greek",
    items: [
      { label: "π", latex: "\\pi" },
      { label: "θ", latex: "\\theta" },
      { label: "α", latex: "\\alpha" },
      { label: "β", latex: "\\beta" }
    ]
  },
  {
    group: "Relations",
    items: [
      { label: "<", latex: "<" },
      { label: ">", latex: ">" },
      { label: "≤", latex: "\\le" },
      { label: "≥", latex: "\\ge" },
      { label: "≠", latex: "\\ne" },
      { label: "≈", latex: "\\approx" }
    ]
  }
];

export function MathToolbar(props: { onInsert: (latex: string) => void }): JSX.Element {
  const [activeGroup, setActiveGroup] = useState("Basic");

  return (
    <div className="sat-math-toolbar-panel">
      <div className="sat-math-toolbar-tabs">
        {toolbarButtons.map((group) => (
          <button
            key={group.group}
            type="button"
            onClick={() => setActiveGroup(group.group)}
            className={`sat-math-toolbar-tab ${activeGroup === group.group ? "sat-math-toolbar-tab-active" : ""}`}
          >
            {group.group}
          </button>
        ))}
      </div>

      <div className="sat-math-toolbar-grid">
        {toolbarButtons.map((group) => (
          <div
            key={group.group}
            className={`sat-math-toolbar-group ${activeGroup === group.group ? "sat-math-toolbar-group-active" : ""}`}
          >
            <div className="sat-math-toolbar-group-title">{group.group}</div>
            {group.items.map((button) => (
              <button
                key={`${group.group}-${button.label}`}
                type="button"
                onClick={() => props.onInsert(button.latex)}
                className="sat-math-toolbar-key"
                title={button.label}
              >
                {button.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}