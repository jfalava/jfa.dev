import {
  Button,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@jfa.dev/common/ui";
import { Copy, Link2, Pencil, Plus, Trash2, UserPlus } from "lucide-react";

import { Row, Specimen } from "@/components/preview";
import { Section } from "@/components/section";

export function DropdownMenuSection() {
  return (
    <Section
      description="Aria Menu + Popover. DropdownMenuTrigger wraps a Button and a DropdownMenu."
      id="dropdown-menu"
      title="Dropdown"
    >
      <Specimen label="List actions">
        <Row>
          <DropdownMenuTrigger>
            <Button variant="outline">List actions</Button>
            <DropdownMenu>
              <DropdownMenuLabel>Weekend groceries</DropdownMenuLabel>
              <DropdownMenuItem textValue="Rename">
                <Pencil />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem textValue="Duplicate">
                <Copy />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem textValue="Copy link">
                <Link2 />
                Copy link
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem textValue="Delete list" variant="destructive">
                <Trash2 />
                Delete list
              </DropdownMenuItem>
            </DropdownMenu>
          </DropdownMenuTrigger>
        </Row>
      </Specimen>
      <Specimen label="With sub-menu">
        <Row>
          <DropdownMenuTrigger>
            <Button variant="outline">Share</Button>
            <DropdownMenu>
              <DropdownMenuItem textValue="New list">
                <Plus />
                New list
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger textValue="Invite">
                  <UserPlus />
                  Invite
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem textValue="Alias">Share alias</DropdownMenuItem>
                  <DropdownMenuItem textValue="Copy link">Copy link</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem textValue="Delete list" variant="destructive">
                Delete list
              </DropdownMenuItem>
            </DropdownMenu>
          </DropdownMenuTrigger>
        </Row>
      </Specimen>
    </Section>
  );
}
