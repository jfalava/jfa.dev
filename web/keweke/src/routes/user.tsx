import { createFileRoute } from "@tanstack/react-router";

import { UserSettingsPage } from "@/features/auth/components/user-settings-page";

export const Route = createFileRoute("/user")({
  component: UserSettingsPage,
});
