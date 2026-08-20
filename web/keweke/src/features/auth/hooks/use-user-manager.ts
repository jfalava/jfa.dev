import {
  deviceForgetSigningPayload,
  deviceRevocationSigningPayload,
  generatePairingCode,
  pairingApprovalSigningPayload,
  userCreateSigningPayload,
  userDeleteSigningPayload,
  userRenameSigningPayload,
} from "@jfa.dev/common/crypto";
import { type PasskeyProfile, type UserProfile, usernameSchema } from "@jfa.dev/common/identities";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { clearLocalData, clearLocalIdentityData, clearRemoteUserData } from "@/app/lib/local-data";
import {
  adoptLocalIdentity,
  confirmRemoteUsername,
  ensureLocalIdentity,
  saveLocalIdentity,
  signLocalPayload,
  subscribeToLocalIdentity,
  type LocalIdentity,
} from "@/features/auth/lib/local-identity";
import {
  adoptLocalIdentityWithPasskey,
  isPasskeyAvailable,
  listLocalPasskeys,
  registerLocalPasskey,
} from "@/features/auth/lib/passkeys";
import {
  approveDevicePairing,
  createRemoteUser,
  deleteRemoteUser,
  forgetUserDevice,
  getDevicePairingStatus,
  getUserProfile,
  revokeUserDevice,
  startDevicePairing,
  updateUserProfile,
} from "@/features/auth/server/users";
import { syncRemoteLists } from "@/features/sync/lib/remote-list-sync";

export type PairingStatusView =
  | { status: "missing" | "expired"; code: string }
  | {
      status: "pending";
      code: string;
      targetDeviceId: string;
      targetDevicePublicKey: string;
      expiresAt: string;
    }
  | {
      status: "approved";
      code: string;
      targetDeviceId: string;
      targetDevicePublicKey: string;
      expiresAt: string;
      profile: UserProfile;
    };

export const UNSIGNED_SIGNATURE = "unsigned-signature-placeholder";

export type FeedbackSection =
  | "username"
  | "pairing"
  | "passkey-adoption"
  | "approval"
  | "devices"
  | "passkeys"
  | "account"
  | "logout"
  | "data";

export type DialogFeedback = {
  section: FeedbackSection;
  tone: "error" | "message";
  text: string;
};

export interface UseUserManagerOptions {
  initialMessage?: string;
  onSaved?: () => void;
  onNavigateAfterClear?: () => void;
  isActive?: boolean;
}

export function useUserManager({
  initialMessage,
  onNavigateAfterClear,
  onSaved,
  isActive = true,
}: UseUserManagerOptions = {}) {
  const navigate = useNavigate();
  const [identity, setIdentity] = useState<LocalIdentity>();
  const [profile, setProfile] = useState<UserProfile>();
  const [value, setValue] = useState("");
  const [approvalCode, setApprovalCode] = useState("");
  const [pairingCode, setPairingCode] = useState("");
  const [pairingStatus, setPairingStatus] = useState<PairingStatusView>();
  const [feedback, setFeedback] = useState<DialogFeedback | undefined>(() =>
    isActive && initialMessage
      ? { section: "username", tone: "error", text: initialMessage }
      : undefined,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingRemoteUser, setIsCreatingRemoteUser] = useState(false);
  const [isStartingPairing, setIsStartingPairing] = useState(false);
  const [isFindingDevice, setIsFindingDevice] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [passkeys, setPasskeys] = useState<PasskeyProfile[]>([]);
  const [loadedPasskeyRequestKey, setLoadedPasskeyRequestKey] = useState<string>();
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);
  const [isAdoptingPasskey, setIsAdoptingPasskey] = useState(false);
  const [isAdopting, setIsAdopting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isConfirmingLogOut, setIsConfirmingLogOut] = useState(false);
  const [isClearingData, setIsClearingData] = useState(false);
  const [isConfirmingClearData, setIsConfirmingClearData] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isConfirmingDeleteAccount, setIsConfirmingDeleteAccount] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [confirmingDeviceId, setConfirmingDeviceId] = useState<string>();
  const [forgettingDeviceId, setForgettingDeviceId] = useState<string>();

  const resetFeedback = useCallback((): void => {
    setFeedback(undefined);
  }, []);

  const setError = useCallback((section: FeedbackSection, text: string): void => {
    setFeedback({ section, tone: "error", text });
  }, []);

  const setMessage = useCallback((section: FeedbackSection, text: string): void => {
    setFeedback({ section, tone: "message", text });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const refreshIdentity = (): void => {
      void ensureLocalIdentity().then((nextIdentity) => {
        if (!cancelled) {
          setIdentity(nextIdentity);
          setValue(nextIdentity?.username ?? "");
        }
        return nextIdentity;
      });
    };
    refreshIdentity();
    const unsubscribe = subscribeToLocalIdentity(refreshIdentity);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const refreshProfile = (): void => {
      if (!identity?.adopted && !identity?.remoteUsername) {
        setProfile(undefined);
        return undefined;
      }
      void getUserProfile({ data: identity.userId })
        .then(async (nextProfile) => {
          if (nextProfile) {
            const nextIdentity = await confirmRemoteUsername(nextProfile.username);
            setIdentity(nextIdentity);
            setProfile(nextProfile);
          } else {
            setProfile(undefined);
          }
          return nextProfile;
        })
        .catch(() => undefined);
    };
    refreshProfile();
  }, [identity?.adopted, identity?.remoteUsername, identity?.userId]);

  useEffect(() => {
    if (!pairingCode || pairingStatus?.status === "approved") {
      return undefined;
    }

    const poll = (): void => {
      void getDevicePairingStatus({ data: pairingCode })
        .then((nextStatus) => {
          setPairingStatus(nextStatus);
          return nextStatus;
        })
        .catch(() => undefined);
    };
    poll();
    const interval = window.setInterval(poll, 1_000);
    return () => window.clearInterval(interval);
  }, [pairingCode, pairingStatus?.status]);

  const canManagePasskeys = Boolean(
    identity?.remoteUsername &&
    profile?.devices.some(
      (device) => device.deviceId === identity.deviceId && device.revokedAt === null,
    ),
  );
  const passkeyAvailable = isPasskeyAvailable();
  const passkeyRequestKey = `${identity?.deviceId ?? ""}:${identity?.userId ?? ""}:${canManagePasskeys}:${isActive}`;
  const isLoadingPasskeys =
    isActive && canManagePasskeys && loadedPasskeyRequestKey !== passkeyRequestKey;

  useEffect(() => {
    if (!isActive || !canManagePasskeys) {
      return undefined;
    }

    let cancelled = false;
    void listLocalPasskeys()
      .then((nextPasskeys) => {
        if (!cancelled) {
          setPasskeys(nextPasskeys);
        }
        return nextPasskeys;
      })
      .catch(() => {
        if (!cancelled) {
          setPasskeys([]);
          setError("passkeys", "Could not load passkeys right now.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadedPasskeyRequestKey(passkeyRequestKey);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canManagePasskeys, isActive, passkeyRequestKey, setError]);

  const save = async (event?: FormEvent<HTMLFormElement>): Promise<void> => {
    event?.preventDefault();
    resetFeedback();
    const username = value.trim();
    const parsedUsername = usernameSchema.safeParse(username);
    if (!parsedUsername.success) {
      setError("username", "Use a username between 1 and 48 characters.");
      return;
    }

    setIsSaving(true);
    try {
      const nextIdentity = await saveLocalIdentity(parsedUsername.data);
      setIdentity(nextIdentity);
      if (nextIdentity.remoteUsername) {
        const auth = {
          userId: nextIdentity.userId,
          deviceId: nextIdentity.deviceId,
          signature: UNSIGNED_SIGNATURE,
        };
        const signature = await signLocalPayload(
          userRenameSigningPayload({
            userId: auth.userId,
            deviceId: auth.deviceId,
            username: parsedUsername.data,
          }),
        );
        const result = await updateUserProfile({
          data: { auth: { ...auth, signature }, username: parsedUsername.data },
        });
        if (result.status === "updated") {
          const confirmed = await confirmRemoteUsername(result.profile.username);
          setIdentity(confirmed);
          setProfile(result.profile);
          setValue(confirmed.username ?? "");
          setMessage("username", "Username updated.");
        } else {
          setMessage("username", "Username saved.");
        }
      } else {
        setMessage("username", "Username saved.");
      }
      onSaved?.();
    } catch {
      setError("username", "Could not save this user right now.");
    } finally {
      setIsSaving(false);
    }
  };

  const createRemoteAccount = async (): Promise<void> => {
    if (!identity) {
      return;
    }

    resetFeedback();
    const username = value.trim();
    const parsedUsername = usernameSchema.safeParse(username);
    if (!parsedUsername.success) {
      setError("account", "Enter a username between 1 and 48 characters.");
      return;
    }

    setIsCreatingRemoteUser(true);
    try {
      const nextIdentity = await saveLocalIdentity(parsedUsername.data);
      const unsignedAuth = {
        userId: nextIdentity.userId,
        deviceId: nextIdentity.deviceId,
        userPublicKey: nextIdentity.userPublicKey,
        devicePublicKey: nextIdentity.devicePublicKey,
        username: parsedUsername.data,
        signature: UNSIGNED_SIGNATURE,
      };
      const signature = await signLocalPayload(
        userCreateSigningPayload({
          userId: unsignedAuth.userId,
          deviceId: unsignedAuth.deviceId,
          userPublicKey: unsignedAuth.userPublicKey,
          devicePublicKey: unsignedAuth.devicePublicKey,
          username: unsignedAuth.username,
        }),
      );
      const result = await createRemoteUser({
        data: { auth: { ...unsignedAuth, signature } },
      });
      if (result.status === "unauthorized") {
        setError("account", "This browser could not create the remote user.");
        return;
      }
      if (result.status === "conflict") {
        setError("account", "This identity is already linked to a different remote username.");
        return;
      }
      if (!("profile" in result)) {
        return;
      }

      const confirmed = await confirmRemoteUsername(result.profile.username);
      setIdentity(confirmed);
      setProfile(result.profile);
      setValue(confirmed.username ?? "");
      setMessage(
        "account",
        result.status === "created"
          ? "Remote user created."
          : "Remote user already exists; this browser is connected.",
      );
      onSaved?.();
    } catch {
      setError("account", "Could not create the remote user right now.");
    } finally {
      setIsCreatingRemoteUser(false);
    }
  };

  const startPairing = async (): Promise<void> => {
    resetFeedback();
    setIsStartingPairing(true);
    try {
      const currentIdentity = identity ?? (await ensureLocalIdentity());
      if (!currentIdentity) {
        throw new Error("This browser cannot store a user");
      }
      const code = await generatePairingCode();
      const result = await startDevicePairing({
        data: {
          code,
          targetDeviceId: currentIdentity.deviceId,
          targetDevicePublicKey: currentIdentity.devicePublicKey,
        },
      });
      setIdentity(currentIdentity);
      setPairingCode(code);
      setPairingStatus(result);
      setMessage("pairing", "Pairing code created below. Enter it on an approved device.");
    } catch {
      setError("pairing", "Could not create a pairing code.");
    } finally {
      setIsStartingPairing(false);
    }
  };

  const addPasskey = async (): Promise<void> => {
    if (!canManagePasskeys || !passkeyAvailable) {
      return;
    }

    setIsRegisteringPasskey(true);
    resetFeedback();
    try {
      const result = await registerLocalPasskey();
      if (result.status === "unauthorized") {
        setError("passkeys", "This device is not allowed to add a passkey.");
        return;
      }
      if (result.status !== "registered" && result.status !== "existing") {
        setError("passkeys", "The passkey could not be added. Try again.");
        return;
      }

      setPasskeys(await listLocalPasskeys());
      setMessage(
        "passkeys",
        result.status === "registered" ? "Passkey added." : "That passkey is already registered.",
      );
    } catch {
      setError("passkeys", "Passkey creation was cancelled or failed. Try again.");
    } finally {
      setIsRegisteringPasskey(false);
    }
  };

  const adoptWithPasskey = async (): Promise<void> => {
    if (!identity || identity.remoteUsername || !passkeyAvailable) {
      return;
    }

    setIsAdoptingPasskey(true);
    resetFeedback();
    try {
      const nextIdentity = await adoptLocalIdentityWithPasskey();
      const nextProfile = await getUserProfile({ data: nextIdentity.userId });
      if (!nextProfile) {
        throw new Error("The adopted user profile is unavailable");
      }
      setIdentity(nextIdentity);
      setProfile(nextProfile);
      setValue(nextIdentity.username ?? "");
      await syncRemoteLists(nextIdentity);
      setMessage("username", "This browser is connected.");
    } catch {
      setError("passkey-adoption", "Passkey use was cancelled or failed. Try again.");
    } finally {
      setIsAdoptingPasskey(false);
    }
  };

  const adopt = async (): Promise<void> => {
    if (pairingStatus?.status !== "approved") {
      return;
    }
    setIsAdopting(true);
    resetFeedback();
    try {
      const nextIdentity = await adoptLocalIdentity(pairingStatus.profile);
      await syncRemoteLists(nextIdentity);
      setIdentity(nextIdentity);
      setProfile(pairingStatus.profile);
      setValue(nextIdentity.username ?? "");
      setMessage("username", "This browser is connected.");
      setPairingCode("");
    } catch {
      setError("pairing", "This browser could not adopt that user.");
    } finally {
      setIsAdopting(false);
    }
  };

  const findDevice = async (event?: FormEvent<HTMLFormElement>): Promise<void> => {
    event?.preventDefault();
    resetFeedback();
    setIsFindingDevice(true);
    try {
      const result = await getDevicePairingStatus({ data: approvalCode });
      setPairingStatus(result);
      if (result.status === "missing" || result.status === "expired") {
        setError("approval", "That pairing code is no longer active.");
      }
    } catch {
      setError("approval", "Use the ten-character pairing code exactly as shown.");
    } finally {
      setIsFindingDevice(false);
    }
  };

  const approve = async (): Promise<void> => {
    if (!identity || pairingStatus?.status !== "pending") {
      return;
    }
    setIsApproving(true);
    resetFeedback();
    try {
      const auth = {
        userId: identity.userId,
        deviceId: identity.deviceId,
        signature: UNSIGNED_SIGNATURE,
      };
      const signature = await signLocalPayload(
        pairingApprovalSigningPayload({
          code: pairingStatus.code,
          userId: auth.userId,
          approverDeviceId: auth.deviceId,
          targetDeviceId: pairingStatus.targetDeviceId,
          targetDevicePublicKey: pairingStatus.targetDevicePublicKey,
        }),
      );
      const result = await approveDevicePairing({
        data: {
          code: pairingStatus.code,
          auth: { ...auth, signature },
          targetDeviceId: pairingStatus.targetDeviceId,
          targetDevicePublicKey: pairingStatus.targetDevicePublicKey,
        },
      });
      if (result.status === "approved") {
        setPairingStatus(result);
        setProfile(result.profile);
        setMessage("approval", "The device was approved.");
      } else if (result.status === "unauthorized") {
        setError(
          "approval",
          "This browser is not an accepted device for that user. Use a browser already connected to the user to approve it.",
        );
      } else if (result.status === "expired") {
        setPairingStatus(result);
        setError("approval", "That pairing code has expired. Create a new code and try again.");
      } else if (result.status === "missing") {
        setPairingStatus(result);
        setError("approval", "That pairing code is no longer active.");
      } else {
        setPairingStatus(result);
        setError(
          "approval",
          "The pairing code could not be approved. Check the code and try again.",
        );
      }
    } catch (error) {
      console.error("Keweke pairing approval request failed", error);
      setError("approval", "The approval request failed. Check your connection and try again.");
    } finally {
      setIsApproving(false);
    }
  };

  const revoke = async (deviceId: string): Promise<void> => {
    if (!identity) {
      return;
    }
    setConfirmingDeviceId(undefined);
    resetFeedback();
    try {
      const auth = {
        userId: identity.userId,
        deviceId: identity.deviceId,
        signature: UNSIGNED_SIGNATURE,
      };
      const signature = await signLocalPayload(
        deviceRevocationSigningPayload({
          userId: auth.userId,
          approverDeviceId: auth.deviceId,
          targetDeviceId: deviceId,
        }),
      );
      const result = await revokeUserDevice({
        data: { auth: { ...auth, signature }, targetDeviceId: deviceId },
      });
      if (result.status === "revoked") {
        setProfile(result.profile);
        setMessage("devices", "The device was revoked.");
      } else {
        setError("devices", "This device could not be revoked.");
      }
    } catch {
      setError("devices", "This device could not be revoked.");
    }
  };

  const forget = async (deviceId: string): Promise<void> => {
    if (!identity) {
      return;
    }
    setForgettingDeviceId(undefined);
    resetFeedback();
    try {
      const auth = {
        userId: identity.userId,
        deviceId: identity.deviceId,
        signature: UNSIGNED_SIGNATURE,
      };
      const signature = await signLocalPayload(
        deviceForgetSigningPayload({
          userId: auth.userId,
          approverDeviceId: auth.deviceId,
          targetDeviceId: deviceId,
        }),
      );
      const result = await forgetUserDevice({
        data: { auth: { ...auth, signature }, targetDeviceId: deviceId },
      });
      if (result.status === "forgotten") {
        setProfile(result.profile);
        setMessage("devices", "The device was removed.");
      } else {
        setError("devices", "This device could not be removed.");
      }
    } catch {
      setError("devices", "This device could not be removed.");
    }
  };

  const logOut = async (): Promise<void> => {
    setIsLoggingOut(true);
    resetFeedback();
    try {
      await clearLocalIdentityData();
      setIsLoggingOut(false);
      setIsConfirmingLogOut(false);
      setProfile(undefined);
      setPairingCode("");
      setApprovalCode("");
      setPasskeys([]);
      setValue("");
      setMessage("username", "Logged out.");
    } catch {
      setIsLoggingOut(false);
      setIsConfirmingLogOut(false);
      setError("logout", "Could not log out right now.");
    }
  };

  const clearData = async (): Promise<void> => {
    setIsClearingData(true);
    resetFeedback();
    try {
      await clearLocalData();
      setIsClearingData(false);
      setIsConfirmingClearData(false);
      if (onNavigateAfterClear) {
        onNavigateAfterClear();
      } else {
        await navigate({ replace: true, to: "/" });
      }
    } catch {
      setIsClearingData(false);
      setIsConfirmingClearData(false);
      setError("data", "Could not clear this browser's Keweke data.");
    }
  };

  const deleteAccount = async (): Promise<void> => {
    if (!identity?.remoteUsername || deleteConfirmation !== identity.remoteUsername) {
      setError("account", "Type the remote username exactly to confirm deletion.");
      return;
    }

    setIsDeletingAccount(true);
    resetFeedback();
    try {
      const auth = {
        userId: identity.userId,
        deviceId: identity.deviceId,
        signature: UNSIGNED_SIGNATURE,
      };
      const signature = await signLocalPayload(
        userDeleteSigningPayload({ userId: auth.userId, deviceId: auth.deviceId }),
      );
      const result = await deleteRemoteUser({
        data: { auth: { ...auth, signature } },
      });
      if (result.status === "unauthorized") {
        setError("account", "This device is not allowed to delete that remote user.");
        return;
      }
      if (result.status === "failed") {
        setError("account", "The remote user could not be fully deleted. Try again.");
        return;
      }

      await clearRemoteUserData();
      setIsConfirmingDeleteAccount(false);
      setDeleteConfirmation("");
      if (onNavigateAfterClear) {
        onNavigateAfterClear();
      } else {
        await navigate({ replace: true, to: "/" });
      }
    } catch {
      setError("account", "Could not delete the remote user right now.");
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const resetAllConfirmations = useCallback(() => {
    resetFeedback();
    setIsConfirmingClearData(false);
    setIsConfirmingDeleteAccount(false);
    setIsConfirmingLogOut(false);
    setDeleteConfirmation("");
    setConfirmingDeviceId(undefined);
    setForgettingDeviceId(undefined);
  }, [resetFeedback]);

  return {
    identity,
    profile,
    value,
    setValue,
    approvalCode,
    setApprovalCode,
    pairingCode,
    pairingStatus,
    feedback,
    resetFeedback,
    setError,
    setMessage,
    isSaving,
    isCreatingRemoteUser,
    isStartingPairing,
    isFindingDevice,
    isApproving,
    passkeys,
    isLoadingPasskeys,
    isRegisteringPasskey,
    isAdoptingPasskey,
    isAdopting,
    isLoggingOut,
    isConfirmingLogOut,
    setIsConfirmingLogOut,
    isClearingData,
    isConfirmingClearData,
    setIsConfirmingClearData,
    isDeletingAccount,
    isConfirmingDeleteAccount,
    setIsConfirmingDeleteAccount,
    deleteConfirmation,
    setDeleteConfirmation,
    confirmingDeviceId,
    setConfirmingDeviceId,
    forgettingDeviceId,
    setForgettingDeviceId,
    canManagePasskeys,
    passkeyAvailable,
    save,
    createRemoteAccount,
    startPairing,
    addPasskey,
    adoptWithPasskey,
    adopt,
    findDevice,
    approve,
    revoke,
    forget,
    logOut,
    clearData,
    deleteAccount,
    resetAllConfirmations,
  };
}

export type UserManager = ReturnType<typeof useUserManager>;
