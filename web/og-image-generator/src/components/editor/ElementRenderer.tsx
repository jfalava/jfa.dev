import { useEditorStore } from "@/stores/editor-store";
import type { EditorElement } from "@/types/editor";

interface ElementRendererProps {
  element: EditorElement;
}

function interpolateVariables(text: string, values: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] || `{{${key}}}`);
}

export function ElementRenderer({ element }: ElementRendererProps) {
  const variableValues = useEditorStore((s) => s.variableValues);
  const { content, tailwindClasses } = element;

  switch (content.type) {
    case "text": {
      const interpolated = interpolateVariables(content.text, variableValues);
      return (
        <div
          className={tailwindClasses}
          style={{
            width: "100%",
            height: "100%",
            fontFamily: content.fontFamily,
            fontSize: content.fontSize,
            fontWeight: content.fontWeight,
            lineHeight: content.lineHeight,
            textAlign: content.textAlign,
            color: content.color,
            overflow: "hidden",
            wordWrap: "break-word",
          }}
        >
          {interpolated}
        </div>
      );
    }

    case "image": {
      if (!content.src) {
        return (
          <div
            className={`flex items-center justify-center border border-dashed border-muted-foreground/30 bg-muted/50 ${tailwindClasses}`}
            style={{
              width: "100%",
              height: "100%",
              borderRadius: content.borderRadius,
            }}
          >
            <span className="text-sm text-muted-foreground">No image</span>
          </div>
        );
      }
      return (
        <img
          src={content.src}
          alt=""
          className={tailwindClasses}
          style={{
            width: "100%",
            height: "100%",
            objectFit: content.objectFit,
            borderRadius: content.borderRadius,
          }}
        />
      );
    }

    case "badge": {
      const interpolated = interpolateVariables(content.text, variableValues);
      return (
        <div
          className={tailwindClasses}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            fontFamily: content.fontFamily,
            fontSize: content.fontSize,
            fontWeight: content.fontWeight,
            backgroundColor: content.backgroundColor,
            color: content.textColor,
            borderColor: content.borderColor,
            borderWidth: 1,
            borderStyle: "solid",
            borderRadius: content.borderRadius,
            paddingLeft: content.paddingX,
            paddingRight: content.paddingX,
            paddingTop: content.paddingY,
            paddingBottom: content.paddingY,
          }}
        >
          {interpolated}
        </div>
      );
    }

    case "container": {
      return (
        <div
          className={tailwindClasses}
          style={{
            width: "100%",
            height: "100%",
            backgroundColor: content.backgroundColor,
            borderColor: content.borderColor,
            borderWidth: content.borderWidth,
            borderStyle: "solid",
            borderRadius: content.borderRadius,
            opacity: content.opacity,
          }}
        />
      );
    }

    default:
      return null;
  }
}
