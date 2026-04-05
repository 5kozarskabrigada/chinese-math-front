import { useEffect, useState } from "react";

type MathInputProps = {
  value: string;
  onChange: (latex: string) => void;
  onInit?: (mathField: any) => void;
  className?: string;
};

type EditableMathFieldProps = {
  latex: string;
  onChange: (mathField: any) => void;
  mathquillDidMount?: (mathField: any) => void;
  config?: Record<string, unknown>;
};

export function MathInput(props: MathInputProps): JSX.Element {
  const [MathQuillComponent, setMathQuillComponent] = useState<null | React.ComponentType<EditableMathFieldProps>>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadMathQuill() {
      try {
        const jQueryModule = await import("jquery");
        const jQuery = (jQueryModule as any).default ?? jQueryModule;
        (window as any).jQuery = jQuery;
        (window as any).$ = jQuery;

        const mod = await import("react-mathquill");
        if ((mod as any).addStyles) {
          (mod as any).addStyles();
        }

        if (isMounted) {
          setMathQuillComponent(() => (mod as any).EditableMathField);
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(error instanceof Error ? error.message : "Failed to load math editor");
        }
      }
    }

    void loadMathQuill();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className={`sat-math-input-wrapper ${props.className ?? ""}`.trim()}>
      {!MathQuillComponent ? (
        <div className="sat-math-input-loading">{loadError ? "Error loading editor" : "Loading Math Editor..."}</div>
      ) : (
        <MathQuillComponent
          latex={props.value}
          onChange={(mathField) => props.onChange(mathField.latex())}
          mathquillDidMount={(mathField) => props.onInit?.(mathField)}
          config={{
            spaceBehavesLikeTab: true,
            leftRightIntoCmdGoes: "up",
            restrictMismatchedBrackets: true,
            sumStartsWithNEquals: true,
            supSubsRequireOperand: true,
            charsThatBreakOutOfSupSub: "+=<>",
            autoSubscriptNumerals: true,
            autoCommands: "pi theta sqrt sum int alpha beta gamma infty approx le ge ne angle triangle parallel perp",
            autoOperatorNames: "sin cos tan log ln"
          }}
        />
      )}
    </div>
  );
}