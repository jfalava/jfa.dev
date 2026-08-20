import type { UserManager } from "@/features/auth/hooks/use-user-manager";

import type { SettingsSectionRow } from "./settings-table";
import {
  createAccountDeletionSection,
  createLocalDataSection,
  createLogoutSection,
} from "./user-account-sections";
import {
  createApprovalSection,
  createPairingSection,
  createPasskeyAdoptionSection,
  createRemoteAccountSection,
  createUsernameSection,
} from "./user-identity-sections";
import { createDevicesSection, createPasskeysSection } from "./user-security-sections";

export function createUserSettingsRows(manager: UserManager): SettingsSectionRow[] {
  const sections = [createUsernameSection(manager)];

  if (manager.identity && !manager.identity.remoteUsername) {
    sections.push(createRemoteAccountSection(manager));
  }

  if (manager.identity && !manager.identity.remoteUsername && manager.passkeyAvailable) {
    sections.push(createPasskeyAdoptionSection(manager));
  }

  if (manager.identity && !manager.identity.remoteUsername) {
    sections.push(createPairingSection(manager));
  }

  if (manager.identity?.remoteUsername) {
    sections.push(createApprovalSection(manager));
  }

  if (manager.profile) {
    sections.push(createDevicesSection(manager));
  }

  if (manager.canManagePasskeys) {
    sections.push(createPasskeysSection(manager));
  }

  if (manager.identity?.remoteUsername || manager.identity?.username) {
    sections.push(createLogoutSection(manager));
  }

  if (manager.identity?.remoteUsername) {
    sections.push(createAccountDeletionSection(manager));
  }

  sections.push(createLocalDataSection(manager));
  return sections;
}
