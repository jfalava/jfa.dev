import {
  Button,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@jfa.dev/common/ui";
import { CreditCard, LogOut, Plus, Settings, User, UserPlus } from "lucide-react";

import { Card, Preview } from "@/components/preview";
import { Section } from "@/components/section";

export function DropdownMenuSection() {
  return (
    <Section
      description="Aria Menu + Popover. Composition: DropdownMenuTrigger wraps a Button and a DropdownMenu (popover + menu)."
      id="dropdown-menu"
      title="Dropdown Menu"
    >
      <Card>
        <Preview label="basic">
          <DropdownMenuTrigger>
            <Button variant="outline">Open menu</Button>
            <DropdownMenu>
              <DropdownMenuLabel>My account</DropdownMenuLabel>
              <DropdownMenuItem textValue="Profile">
                <User />
                Profile
                <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem textValue="Billing">
                <CreditCard />
                Billing
                <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem textValue="Settings">
                <Settings />
                Settings
                <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem textValue="Log out" variant="destructive">
                <LogOut />
                Log out
                <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenu>
          </DropdownMenuTrigger>
        </Preview>
        <Preview label="with sub-menu">
          <DropdownMenuTrigger>
            <Button variant="outline">With sub-menu</Button>
            <DropdownMenu>
              <DropdownMenuItem textValue="New project">
                <Plus />
                New project
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger textValue="Invite">
                  <UserPlus />
                  Invite people
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem textValue="Email">Email</DropdownMenuItem>
                  <DropdownMenuItem textValue="Copy link">Copy link</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem textValue="More">More…</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem textValue="Archive" variant="destructive">
                Archive
              </DropdownMenuItem>
            </DropdownMenu>
          </DropdownMenuTrigger>
        </Preview>
      </Card>
    </Section>
  );
}
