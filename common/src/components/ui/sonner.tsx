import { CircleCheck, Info, LoaderCircle, OctagonX, TriangleAlert } from "lucide-react";
import type { CSSProperties } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

type ToasterStyle = CSSProperties & {
  "--error-border"?: string;
  "--error-bg"?: string;
  "--error-text"?: string;
  "--normal-border"?: string;
  "--normal-bg"?: string;
  "--normal-text"?: string;
  "--border-radius"?: string;
};

const toastThemeStyle: ToasterStyle = {
  "--normal-bg": "var(--popover)",
  "--normal-text": "var(--popover-foreground)",
  "--normal-border": "var(--border)",
  "--error-bg": "var(--popover)",
  "--error-text": "var(--destructive)",
  "--error-border": "var(--destructive)",
  "--border-radius": "var(--radius)",
};

function Toaster({ theme = "system", ...props }: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      icons={{
        success: <CircleCheck className="size-4" />,
        info: <Info className="size-4" />,
        warning: <TriangleAlert className="size-4" />,
        error: <OctagonX className="size-4" />,
        loading: <LoaderCircle className="size-4 animate-spin" />,
      }}
      style={toastThemeStyle}
      theme={theme}
      {...props}
    />
  );
}

export { Toaster };
