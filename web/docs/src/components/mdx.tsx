import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";

import { AfterCreatePreview } from "@/components/keweke/after-create-preview";
import { EmptyListsPreview } from "@/components/keweke/empty-lists-preview";
import {
  HeaderNewListPreview,
  NewListHotkeyPreview,
} from "@/components/keweke/header-new-list-preview";
import {
  DeletedItemsPreview,
  ItemHistoryPreview,
  ListAliasIdPreview,
  ListHeaderPreview,
  LiveDroppedPreview,
} from "@/components/keweke/list-details-preview";
import {
  PublishButtonPreview,
  PublishDialogPreview,
  PublishNudgePreview,
  RemoteListPreview,
} from "@/components/keweke/publish-preview";
import {
  HeaderUserButtonPreview,
  SignedBadgePreview,
} from "@/components/keweke/signed-badge-preview";
import { UserDialogPreview } from "@/components/keweke/user-dialog-preview";
import {
  UserSettingsPreview,
  UserStateBadgePreview,
} from "@/components/keweke/user-settings-preview";
import { CanvasPreview, TabsPreview } from "@/components/opengraph/canvas-preview";
import { FontsPreview } from "@/components/opengraph/fonts-preview";
import { ColorPickerPreview, LayersPreview } from "@/components/opengraph/layers-preview";
import { PositionPreview, TextPreview } from "@/components/opengraph/text-preview";
import { ShortcutsPreview, ToolsPreview } from "@/components/opengraph/tools-preview";

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    AfterCreatePreview,
    CanvasPreview,
    ColorPickerPreview,
    FontsPreview,
    DeletedItemsPreview,
    EmptyListsPreview,
    HeaderNewListPreview,
    HeaderUserButtonPreview,
    ItemHistoryPreview,
    LayersPreview,
    ListAliasIdPreview,
    ListHeaderPreview,
    LiveDroppedPreview,
    NewListHotkeyPreview,
    PositionPreview,
    PublishButtonPreview,
    PublishDialogPreview,
    PublishNudgePreview,
    RemoteListPreview,
    ShortcutsPreview,
    SignedBadgePreview,
    TabsPreview,
    TextPreview,
    ToolsPreview,
    UserDialogPreview,
    UserSettingsPreview,
    UserStateBadgePreview,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
