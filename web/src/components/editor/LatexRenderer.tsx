import parse from "html-react-parser";
import { BlockMath, InlineMath } from "react-katex";

function decodeHtml(html: string): string {
  let decoded = html;
  let previous = "";

  while (decoded !== previous && (decoded.includes("&lt;") || decoded.includes("&gt;") || decoded.includes("&amp;"))) {
    previous = decoded;
    decoded = decoded
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&");
  }

  return decoded;
}

export function LatexRenderer(props: { children: string; className?: string }): JSX.Element | null {
  if (!props.children) {
    return null;
  }

  let content = props.children;
  if (content.includes("&lt;") || content.includes("&gt;")) {
    content = decodeHtml(content);
  }

  const options = {
    replace: (domNode: any) => {
      if (domNode.type === "text") {
        const text = domNode.data as string;
        const regex = /(\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g;
        const parts = text.split(regex);

        if (parts.length > 1) {
          return (
            <>
              {parts.map((part, index) => {
                if (part.startsWith("\\[") && part.endsWith("\\]")) {
                  return <BlockMath key={index} math={part.slice(2, -2)} />;
                }

                if (part.startsWith("\\(") && part.endsWith("\\)")) {
                  return <InlineMath key={index} math={part.slice(2, -2)} />;
                }

                return <span key={index}>{part}</span>;
              })}
            </>
          );
        }
      }

      if (domNode.type === "tag" && domNode.name === "math-component") {
        const latex = domNode.attribs?.latex;
        const display = domNode.attribs?.display;
        if (latex) {
          return display === "block" ? <BlockMath math={latex} /> : <InlineMath math={latex} />;
        }
      }

      return undefined;
    }
  };

  return <div className={`latex-content ${props.className ?? ""}`.trim()}>{parse(content, options)}</div>;
}