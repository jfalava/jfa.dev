import { CircleCheck, Info, LoaderCircle, OctagonX, TriangleAlert } from "lucide-react";
import type { CSSProperties } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

type ToasterStyle = CSSProperties & {
  "--error-border"?: string;
  "--error-bg"?: string;
  "--error-text"?: string;
  "--info-border"?: string;
  "--info-bg"?: string;
  "--info-text"?: string;
  "--normal-border"?: string;
  "--normal-bg"?: string;
  "--normal-text"?: string;
  "--success-border"?: string;
  "--success-bg"?: string;
  "--success-text"?: string;
  "--border-radius"?: string;
};

const toastThemeStyle: ToasterStyle = {
  "--normal-bg": "var(--popover)",
  "--normal-text": "var(--popover-foreground)",
  "--normal-border": "var(--border)",
  "--error-bg": "var(--destructive)",
  "--error-text": "var(--destructive-foreground)",
  "--error-border": "var(--destructive)",
  "--success-bg": "var(--success)",
  "--success-text": "var(--success-foreground)",
  "--success-border": "var(--success)",
  "--info-bg": "var(--primary)",
  "--info-text": "var(--primary-foreground)",
  "--info-border": "var(--primary)",
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
      position="top-center"
      richColors
      style={toastThemeStyle}
      theme={theme}
      {...props}
    />
  );
}

export { Toaster };
