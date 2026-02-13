import { Link } from "@tanstack/react-router";
import { FileImage } from "lucide-react";

export default function Header() {
  return (
    <header className="flex h-12 items-center border-b border-border bg-card px-4">
      <Link to="/" className="flex items-center gap-2">
        <FileImage className="size-5" />
        <span className="font-semibold">OG Image Generator</span>
      </Link>
      <div className="flex-1" />
      <span className="text-xs text-muted-foreground">1200 × 630</span>
    </header>
  );
}
