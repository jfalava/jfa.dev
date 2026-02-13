export type ElementType = "text" | "image" | "badge" | "container";

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface EditorElement {
  id: string;
  type: ElementType;
  position: Position;
  size: Size;
  tailwindClasses: string;
  locked: boolean;
  visible: boolean;
  content: ElementContent;
}

export interface TextContent {
  type: "text";
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  textAlign: "left" | "center" | "right";
  color: string;
}

export interface ImageContent {
  type: "image";
  src: string;
  objectFit: "cover" | "contain" | "fill" | "none";
  borderRadius: number;
}

export interface BadgeContent {
  type: "badge";
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  borderRadius: number;
  paddingX: number;
  paddingY: number;
}

export interface ContainerContent {
  type: "container";
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  opacity: number;
}

export type ElementContent = TextContent | ImageContent | BadgeContent | ContainerContent;

export interface Template {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  elements: EditorElement[];
  canvasBackground: string;
  variables: TemplateVariable[];
}

export interface TemplateVariable {
  key: string;
  label: string;
  defaultValue: string;
  description?: string;
}

export interface Font {
  family: string;
  source: "google" | "external";
  weights: number[];
  loaded: boolean;
  stylesheetUrl?: string;
}

export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 630;

export const DEFAULT_FONTS: Font[] = [];
