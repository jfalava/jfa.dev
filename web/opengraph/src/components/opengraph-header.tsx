"use client";

import {
  Button,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Kbd,
  SiteHeader,
} from "@jfa.dev/common/ui";
import { webPackages } from "@jfa.dev/common/web-packages";
import { Download, FileDown, FileUp, Keyboard } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import {
  archiveFileName,
  createProjectArchive,
  downloadBlob,
  readProjectArchive,
} from "@/editor/archive";
import { editorCanvasRef } from "@/editor/canvas-ref";
import { registerStoredFont } from "@/editor/fonts";
import type { FontMeta } from "@/editor/model";
import { loadFont as loadStoredFont } from "@/editor/storage";
import { useEditorStore } from "@/editor/store";
import { appPath } from "@/lib/site-paths";

async function registerProjectFonts(fonts: readonly FontMeta[]): Promise<number> {
  let failedCount = 0;
  for (const font of fonts) {
    try {
      const storedFont = await loadStoredFont(font.id);
      if (storedFont === null) {
        failedCount += 1;
      } else {
        await registerStoredFont(storedFont);
      }
    } catch {
      failedCount += 1;
    }
  }
  return failedCount;
}

export function OpengraphHeader() {
  const project = useEditorStore((state) => state.project);
  const busy = useEditorStore((state) => state.busy);
  const setBusy = useEditorStore((state) => state.setBusy);
  const setNotice = useEditorStore((state) => state.setNotice);
  const setHelpOpen = useEditorStore((state) => state.setHelpOpen);
  const projectInputRef = useRef<HTMLInputElement>(null);
  const [localBusy, setLocalBusy] = useState(false);
  const isBusy = busy || localBusy;

  async function handleProjectImport(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file === undefined) {
      return;
    }
    setBusy(true);
    setLocalBusy(true);
    try {
      const importedProject = await readProjectArchive(file);
      const failedFontCount = await registerProjectFonts(importedProject.fonts);
      // Krita-style: import opens as a new tab, does not replace active canvas
      useEditorStore.getState().openProject(importedProject);
      setNotice(
        failedFontCount > 0
          ? `${failedFontCount} local font${failedFontCount === 1 ? "" : "s"} could not be loaded`
          : "Project imported as new tab",
      );
    } catch {
      setNotice("That project file could not be imported");
    } finally {
      setBusy(false);
      setLocalBusy(false);
    }
  }

  async function handleExportZip(): Promise<void> {
    setBusy(true);
    setLocalBusy(true);
    try {
      const archive = await createProjectArchive(project);
      downloadBlob(archive, archiveFileName(project));
      setNotice("Project archive downloaded");
    } catch {
      setNotice("The project archive could not be created");
    } finally {
      setBusy(false);
      setLocalBusy(false);
    }
  }

  async function handleExportPng(): Promise<void> {
    setBusy(true);
    setLocalBusy(true);
    try {
      const blob = await editorCanvasRef.current?.download();
      if (blob === null || blob === undefined) {
        throw new Error("Canvas is not ready");
      }
      downloadBlob(blob, `${project.name || "untitled-canvas"}.png`);
      setNotice("PNG downloaded");
    } catch {
      setNotice("The PNG could not be rendered");
    } finally {
      setBusy(false);
      setLocalBusy(false);
    }
  }

  return (
    <>
      <SiteHeader
        title="OpenGraph"
        titleSmol="OpenGraph"
        subtitle="Create OpenGraph images from scratch"
        titleHref={appPath("/")}
        packages={webPackages}
        activePackagePath="/opengraph"
        navLabel="Editor navigation"
        githubHref="https://github.com/jfalava/jfa.dev/tree/main/web/opengraph"
      >
        <div className="flex items-center gap-1.5">
          <Button
            aria-label="Show keyboard shortcuts (press ?)"
            onPress={() => setHelpOpen(true)}
            size="lg"
            variant="ghost"
            className="max-h-[819px]:hidden hidden gap-1.5 px-2 text-muted-foreground hover:text-foreground max-[1179px]:hidden min-[1180px]:inline-flex"
          >
            <Keyboard />
            <span className="hidden sm:inline">Keybinds</span>
            <Kbd
              aria-hidden="true"
              className="hidden h-4 min-w-4 bg-transparent px-0.5 text-[10px] leading-none sm:inline-flex"
            >
              ?
            </Kbd>
          </Button>

          <Button
            aria-label="Import project"
            isDisabled={isBusy}
            onPress={() => projectInputRef.current?.click()}
            size="lg"
            variant="ghost"
            className="gap-1.5 px-2 text-muted-foreground hover:text-foreground"
          >
            <FileUp />
            <span className="hidden sm:inline">Import</span>
          </Button>

          <DropdownMenuTrigger>
            <Button
              aria-label="Export project"
              isDisabled={isBusy}
              size="lg"
              variant="ghost"
              className="gap-1.5 px-2 text-muted-foreground hover:text-foreground"
            >
              <FileDown />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuItem onAction={() => void handleExportZip()} textValue="Export ZIP">
                <FileDown />
                Export ZIP (.ogproj)
              </DropdownMenuItem>
              <DropdownMenuItem onAction={() => void handleExportPng()} textValue="Export PNG">
                <Download />
                Export PNG
              </DropdownMenuItem>
            </DropdownMenu>
          </DropdownMenuTrigger>
        </div>
        <ThemeToggle />
      </SiteHeader>
      <input
        ref={projectInputRef}
        accept=".ogproj,application/zip"
        className="hidden"
        onChange={(event) => void handleProjectImport(event)}
        type="file"
      />
    </>
  );
}
