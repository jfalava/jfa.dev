import {
  deviceRevocationSigningPayload,
  generatePairingCode,
  pairingApprovalSigningPayload,
  userDeleteSigningPayload,
  userRenameSigningPayload,
} from "@jfa.dev/common/crypto";
import {
  type PasskeyProfile,
  type UserProfile,
  usernameSchema,
} from "@jfa.dev/common/identities";
import { Button, Input } from "@jfa.dev/common/ui";
import { useNavigate } from "@tanstack/react-router";
import { KeyRound, UserRound } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "react-aria-components";

import { clearLocalData, clearRemoteUserData } from "@/lib/local-data";
import {
  adoptLocalIdentity,
  confirmRemoteUsername,
  ensureLocalIdentity,
  LOCAL_IDENTITY_PLACEHOLDER,
  saveLocalIdentity,
  signLocalPayload,
  subscribeToLocalIdentity,
  type LocalIdentity,
} from "@/lib/local-identity";
import {
  adoptLocalIdentityWithPasskey,
  isPasskeyAvailable,
  listLocalPasskeys,
  registerLocalPasskey,
} from "@/lib/passkeys";
import { syncRemoteLists } from "@/lib/remote-list-sync";
import {
  approveDevicePairing,
  deleteRemoteUser,
  getDevicePairingStatus,
  getUserProfile,
  revokeUserDevice,
  startDevicePairing,
  updateUserProfile,
} from "@/server/users";

type PairingStatusView =
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

const UNSIGNED_SIGNATURE = "unsigned-signature-placeholder";

type FeedbackSection =
  | "username"
  | "pairing"
  | "passkey-adoption"
  | "approval"
  | "devices"
  | "passkeys"
  | "account"
  | "data";

type DialogFeedback = {
  section: FeedbackSection;
  tone: "error" | "message";
  text: string;
};

function FeedbackMessage({
  feedback,
  section,
}: {
  feedback?: DialogFeedback;
  section: FeedbackSection;
}) {
  if (feedback?.section !== section) {
    return null;
  }

  return (
    <p className={feedback.tone === "error" ? "text-sm text-destructive" : "text-sm text-primary"}>
      {feedback.text}
    </p>
  );
}

function formatPasskeyDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

interface UserDialogProps {
  isOpen?: boolean;
  message?: string;
  onOpenChange?: (isOpen: boolean) => void;
}

export function UserDialog({
  isOpen: controlledIsOpen,
  message,
  onOpenChange,
}: UserDialogProps = {}) {
  const navigate = useNavigate();
  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(false);
  const isDialogOpen = controlledIsOpen ?? uncontrolledIsOpen;
  const [identity, setIdentity] = useState<LocalIdentity>();
  const [profile, setProfile] = useState<UserProfile>();
  const [value, setValue] = useState("");
  const [approvalCode, setApprovalCode] = useState("");
  const [pairingCode, setPairingCode] = useState("");
  const [pairingStatus, setPairingStatus] = useState<PairingStatusView>();
  const [feedback, setFeedback] = useState<DialogFeedback>();
  const [isSaving, setIsSaving] = useState(false);
  const [isStartingPairing, setIsStartingPairing] = useState(false);
  const [isFindingDevice, setIsFindingDevice] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [passkeys, setPasskeys] = useState<PasskeyProfile[]>([]);
  const [isLoadingPasskeys, setIsLoadingPasskeys] = useState(false);
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);
  const [isAdoptingPasskey, setIsAdoptingPasskey] = useState(false);
  const [isAdopting, setIsAdopting] = useState(false);
  const [isClearingData, setIsClearingData] = useState(false);
  const [isConfirmingClearData, setIsConfirmingClearData] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isConfirmingDeleteAccount, setIsConfirmingDeleteAccount] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [confirmingDeviceId, setConfirmingDeviceId] = useState<string>();

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

  const resetFeedback = (): void => {
    setFeedback(undefined);
  };

  const setError = (section: FeedbackSection, text: string): void => {
    setFeedback({ section, tone: "error", text });
  };

  const setMessage = (section: FeedbackSection, text: string): void => {
    setFeedback({ section, tone: "message", text });
  };

  const setDialogOpen = (isOpen: boolean): void => {
    if (controlledIsOpen === undefined) {
      setUncontrolledIsOpen(isOpen);
    }
    onOpenChange?.(isOpen);
  };

  useEffect(() => {
    if (isDialogOpen && message) {
      setMessage("username", message);
    }
  }, [isDialogOpen, message]);

  const canManagePasskeys = Boolean(
    identity?.remoteUsername &&
      profile?.devices.some(
        (device) => device.deviceId === identity.deviceId && device.revokedAt === null,
      ),
  );
  const passkeyAvailable = isPasskeyAvailable();

  useEffect(() => {
    if (!isDialogOpen || !canManagePasskeys) {
      setPasskeys([]);
      setIsLoadingPasskeys(false);
      return undefined;
    }

    let cancelled = false;
    setIsLoadingPasskeys(true);
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
          setIsLoadingPasskeys(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canManagePasskeys, identity?.deviceId, identity?.userId, isDialogOpen]);

  const save = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
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
    } catch {
      setError("username", "Could not save this user right now.");
    } finally {
      setIsSaving(false);
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
      setMessage(
        "pairing",
        currentIdentity.remoteUsername
          ? "Pairing code created below. Enter it on an approved device."
          : "Pairing code created below. Publish a list before another device can approve it.",
      );
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
      setMessage("pairing", "Username added.");
      setPairingCode("");
    } catch {
      setError("pairing", "This browser could not adopt that user.");
    } finally {
      setIsAdopting(false);
    }
  };

  const findDevice = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
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

  const clearData = async (): Promise<void> => {
    setIsClearingData(true);
    resetFeedback();
    try {
      await clearLocalData();
      setIsClearingData(false);
      setIsConfirmingClearData(false);
      setDialogOpen(false);
      await navigate({ replace: true, to: "/" });
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
      setDialogOpen(false);
      await navigate({ replace: true, to: "/" });
    } catch {
      setError("account", "Could not delete the remote user right now.");
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <DialogTrigger
      isOpen={isDialogOpen}
      onOpenChange={(isOpen) => {
        setDialogOpen(isOpen);
        if (isOpen) {
          resetFeedback();
          setIsConfirmingClearData(false);
          setIsConfirmingDeleteAccount(false);
          setDeleteConfirmation("");
          setValue(identity?.username ?? "");
          if (identity) {
            void getUserProfile({ data: identity.userId })
              .then((nextProfile) => {
                setProfile(nextProfile ?? undefined);
                return nextProfile;
              })
              .catch(() => undefined);
          }
        } else {
          resetFeedback();
          setIsConfirmingClearData(false);
          setIsConfirmingDeleteAccount(false);
          setDeleteConfirmation("");
          setConfirmingDeviceId(undefined);
        }
      }}
    >
      <Button
        aria-label="User"
        className="inline-flex w-7 sm:w-auto sm:gap-1 sm:px-2"
        size="icon"
        variant="outline"
      >
        <UserRound aria-hidden="true" className="size-3.5" />
        <span className="hidden sm:inline">User</span>
      </Button>
      <ModalOverlay
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 pt-6 pb-6 sm:pt-16 sm:pb-0"
        isDismissable
      >
        <Modal className="max-h-[calc(100svh-6rem)] w-full max-w-lg overflow-y-auto overscroll-contain outline-none sm:max-h-[calc(100vh-5rem)]">
          <Dialog
            aria-label="Set your username"
            className="overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl outline-none"
          >
            <div className="border-b border-border px-4 py-4">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="font-mono text-[10px] tracking-[0.12em] text-primary uppercase">
                  device identity
                </p>
                <span aria-hidden="true" className="text-[11px] text-muted-foreground/75">
                  /
                </span>
                <h2 className="text-[11px] font-normal text-muted-foreground/75">
                  Set your username
                </h2>
              </div>
            </div>

            <div className="space-y-5 p-4">
              <form className="space-y-3" onSubmit={(event) => void save(event)}>
                <div className="flex items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <label className="text-xs font-medium" htmlFor="user-username">
                      Username
                    </label>
                    <Input
                      autoComplete="nickname"
                      className="mt-1.5 h-10 font-serif text-base sm:text-sm"
                      disabled={!identity || isSaving}
                      id="user-username"
                      maxLength={48}
                      onChange={(event) => {
                        setValue(event.target.value);
                        resetFeedback();
                      }}
                      placeholder={LOCAL_IDENTITY_PLACEHOLDER}
                      value={value}
                    />
                  </div>
                  <Button
                    className="h-10 min-w-24 px-5 text-sm"
                    isDisabled={!identity || isSaving}
                    type="submit"
                  >
                    {isSaving ? "Saving…" : "Save"}
                  </Button>
                </div>
                <FeedbackMessage feedback={feedback} section="username" />
              </form>

              {identity && !identity.remoteUsername && passkeyAvailable ? (
                <section
                  className="space-y-3 border-t border-border pt-4"
                  aria-labelledby="passkey-adoption-heading"
                >
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <p className="font-mono text-[10px] tracking-[0.1em] text-primary uppercase">
                      pair with a passkey
                    </p>
                    <span aria-hidden="true" className="text-[11px] text-muted-foreground/75">
                      /
                    </span>
                    <h3
                      className="text-[11px] font-normal text-muted-foreground/75"
                      id="passkey-adoption-heading"
                    >
                      Connect this browser without a code
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Use a saved passkey to connect this browser to your remote user.
                  </p>
                  <Button
                    className="h-10 gap-1.5 px-5 text-sm"
                    isDisabled={isAdoptingPasskey}
                    onPress={() => void adoptWithPasskey()}
                  >
                    <KeyRound aria-hidden="true" className="size-3.5" />
                    {isAdoptingPasskey ? "Waiting…" : "Pair with passkey"}
                  </Button>
                  <FeedbackMessage feedback={feedback} section="passkey-adoption" />
                </section>
              ) : null}

              <section
                className="space-y-3 border-t border-border pt-4"
                aria-labelledby="pairing-heading"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="font-mono text-[10px] tracking-[0.1em] text-primary uppercase">
                    pair a browser
                  </p>
                  <span aria-hidden="true" className="text-[11px] text-muted-foreground/75">
                    /
                  </span>
                  <h3
                    className="text-[11px] font-normal text-muted-foreground/75"
                    id="pairing-heading"
                  >
                    Use on another device
                  </h3>
                </div>
                <Button
                  className="h-10 min-w-24 px-5 text-sm"
                  isDisabled={!identity || isStartingPairing}
                  onPress={() => void startPairing()}
                >
                  {isStartingPairing ? "Creating…" : "Show code"}
                </Button>
                <FeedbackMessage feedback={feedback} section="pairing" />
                {pairingCode ? (
                  <div className="border border-border bg-muted/40 p-3">
                    <p className="font-mono text-[10px] tracking-[0.1em] text-muted-foreground uppercase">
                      pairing code
                    </p>
                    <p className="mt-1 font-mono text-xl tracking-[0.18em] break-all text-primary">
                      {pairingCode}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {pairingStatus?.status === "pending"
                        ? "Waiting…"
                        : pairingStatus?.status === "approved"
                          ? "Ready."
                          : pairingStatus?.status === "expired"
                            ? "Expired."
                            : pairingStatus?.status === "missing"
                              ? "Unavailable."
                              : "Checking status…"}
                    </p>
                    {pairingStatus?.status === "approved" ? (
                      <Button className="mt-3" isDisabled={isAdopting} onPress={() => void adopt()}>
                        {isAdopting ? "Saving…" : "Use this username"}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </section>

              <section
                className="space-y-3 border-t border-border pt-4"
                aria-labelledby="approve-heading"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="font-mono text-[10px] tracking-[0.1em] text-primary uppercase">
                    approve a browser
                  </p>
                  <span aria-hidden="true" className="text-[11px] text-muted-foreground/75">
                    /
                  </span>
                  <h3
                    className="text-[11px] font-normal text-muted-foreground/75"
                    id="approve-heading"
                  >
                    Add another device
                  </h3>
                </div>
                <form className="flex gap-2" onSubmit={(event) => void findDevice(event)}>
                  <Input
                    aria-label="Pairing code"
                    className="h-10 font-mono tracking-[0.1em]"
                    maxLength={10}
                    onChange={(event) => setApprovalCode(event.target.value)}
                    placeholder="CODE"
                    spellCheck={false}
                    value={approvalCode}
                  />
                  <Button
                    className="h-10 min-w-24 px-5 text-sm"
                    isDisabled={isFindingDevice || !identity}
                    type="submit"
                  >
                    {isFindingDevice ? "Finding…" : "Find"}
                  </Button>
                </form>
                <FeedbackMessage feedback={feedback} section="approval" />
                {pairingStatus?.status === "pending" && pairingStatus.code === approvalCode ? (
                  <div className="border border-border p-3">
                    <p className="text-sm">A new device is waiting.</p>
                    <Button
                      className="mt-3"
                      isDisabled={isApproving}
                      onPress={() => void approve()}
                    >
                      {isApproving ? "Approving…" : "Approve device"}
                    </Button>
                  </div>
                ) : null}
              </section>

              {profile ? (
                <section
                  className="space-y-3 border-t border-border pt-4"
                  aria-labelledby="devices-heading"
                >
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <p className="font-mono text-[10px] tracking-[0.1em] text-primary uppercase">
                      accepted devices
                    </p>
                    <span aria-hidden="true" className="text-[11px] text-muted-foreground/75">
                      /
                    </span>
                    <h3
                      className="text-[11px] font-normal text-muted-foreground/75"
                      id="devices-heading"
                    >
                      Manage devices
                    </h3>
                  </div>
                  <div className="divide-y divide-border border border-border">
                    {profile.devices.map((device) => (
                      <div
                        className="flex items-center justify-between gap-3 p-3"
                        key={device.deviceId}
                      >
                        <div className="min-w-0">
                          <p className="text-sm">
                            {device.deviceId === identity?.deviceId
                              ? "This device"
                              : "Other device"}
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {device.revokedAt ? "Revoked" : "Active"}
                          </p>
                        </div>
                        {device.revokedAt === null ? (
                          confirmingDeviceId === device.deviceId ? (
                            <div className="flex shrink-0 gap-1">
                              <Button
                                onPress={() => void revoke(device.deviceId)}
                                size="sm"
                                variant="destructive"
                              >
                                Confirm
                              </Button>
                              <Button
                                onPress={() => setConfirmingDeviceId(undefined)}
                                size="sm"
                                variant="ghost"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              onPress={() => setConfirmingDeviceId(device.deviceId)}
                              size="sm"
                              variant="ghost"
                            >
                              Revoke
                            </Button>
                          )
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <FeedbackMessage feedback={feedback} section="devices" />
                </section>
              ) : null}

              {canManagePasskeys ? (
                <section
                  aria-labelledby="passkeys-heading"
                  className="space-y-3 border-t border-border pt-4"
                >
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <p className="font-mono text-[10px] tracking-[0.1em] text-primary uppercase">
                      passkeys
                    </p>
                    <span aria-hidden="true" className="text-[11px] text-muted-foreground/75">
                      /
                    </span>
                    <h3
                      className="text-[11px] font-normal text-muted-foreground/75"
                      id="passkeys-heading"
                    >
                      Sign in without pairing codes
                    </h3>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 text-sm text-muted-foreground">
                      Add as many passkeys as your password manager supports. Each one can adopt a
                      new browser without a pairing code.
                    </p>
                    {passkeyAvailable ? (
                      <Button
                        className="h-9 shrink-0 gap-1.5 px-3 text-sm"
                        isDisabled={isRegisteringPasskey}
                        onPress={() => void addPasskey()}
                      >
                        <KeyRound aria-hidden="true" className="size-3.5" />
                        {isRegisteringPasskey ? "Waiting…" : "Add passkey"}
                      </Button>
                    ) : null}
                  </div>
                  {!passkeyAvailable ? (
                    <p className="text-sm text-muted-foreground">
                      Passkeys are not available in this browser.
                    </p>
                  ) : null}
                  <FeedbackMessage feedback={feedback} section="passkeys" />
                  {isLoadingPasskeys ? (
                    <p className="text-sm text-muted-foreground">Loading passkeys…</p>
                  ) : passkeys.length > 0 ? (
                    <div className="divide-y divide-border border border-border">
                      {passkeys.map((passkey, index) => (
                        <div className="flex items-center gap-3 p-3" key={passkey.id}>
                          <div className="flex size-8 shrink-0 items-center justify-center border border-border bg-muted/40 text-primary">
                            <KeyRound aria-hidden="true" className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm">Passkey {index + 1}</p>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              Added {formatPasskeyDate(passkey.createdAt)} ·{" "}
                              {passkey.synced ? "Available to sync" : "Device-bound"}
                              {passkey.transports.length > 0
                                ? ` · ${passkey.transports.join(", ")}`
                                : ""}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No passkeys added yet.</p>
                  )}
                </section>
              ) : null}

              {identity?.remoteUsername ? (
                <section
                  className="space-y-3 border-t border-border pt-4"
                  aria-labelledby="account-heading"
                >
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <p className="font-mono text-[10px] tracking-[0.1em] text-destructive uppercase">
                      remote account
                    </p>
                    <span aria-hidden="true" className="text-[11px] text-muted-foreground/75">
                      /
                    </span>
                    <h3
                      className="text-[11px] font-normal text-muted-foreground/75"
                      id="account-heading"
                    >
                      Delete user and created lists
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete{" "}
                    <span className="font-serif font-medium">{identity.remoteUsername}</span> and
                    every remote list created by this user. Lists only shared with this user are
                    kept for their owners.
                  </p>
                  {isConfirmingDeleteAccount ? (
                    <div className="space-y-2">
                      <label
                        className="text-xs font-medium"
                        htmlFor="delete-remote-user-confirmation"
                      >
                        Type <span className="font-serif">{identity.remoteUsername}</span> to
                        confirm
                      </label>
                      <Input
                        autoComplete="off"
                        className="h-10 font-serif text-base sm:text-sm"
                        disabled={isDeletingAccount}
                        id="delete-remote-user-confirmation"
                        onChange={(event) => {
                          setDeleteConfirmation(event.target.value);
                          resetFeedback();
                        }}
                        spellCheck={false}
                        value={deleteConfirmation}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          className="h-8 px-4 text-sm"
                          isDisabled={
                            isDeletingAccount || deleteConfirmation !== identity.remoteUsername
                          }
                          onPress={() => void deleteAccount()}
                          variant="destructive"
                        >
                          {isDeletingAccount ? "Deleting…" : "Delete remote user"}
                        </Button>
                        <Button
                          className="h-8 px-4 text-sm"
                          isDisabled={isDeletingAccount}
                          onPress={() => {
                            setIsConfirmingDeleteAccount(false);
                            setDeleteConfirmation("");
                          }}
                          variant="ghost"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      className="h-10 min-w-24 px-5 text-sm"
                      onPress={() => setIsConfirmingDeleteAccount(true)}
                      variant="destructive"
                    >
                      Delete remote user
                    </Button>
                  )}
                  <FeedbackMessage feedback={feedback} section="account" />
                </section>
              ) : null}

              <section
                className="space-y-3 border-t border-border pt-4"
                aria-labelledby="data-heading"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="font-mono text-[10px] tracking-[0.1em] text-primary uppercase">
                    local data
                  </p>
                  <span aria-hidden="true" className="text-[11px] text-muted-foreground/75">
                    /
                  </span>
                  <h3
                    className="text-[11px] font-normal text-muted-foreground/75"
                    id="data-heading"
                  >
                    Clear this browser
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Remove local lists, this browser&apos;s identity, and Keweke&apos;s stored browser
                  data. Remote lists are not deleted.
                </p>
                {isConfirmingClearData ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] tracking-[0.08em] text-destructive uppercase">
                      clear all local data?
                    </span>
                    <Button
                      className="h-8 px-4 text-sm"
                      isDisabled={isClearingData}
                      onPress={() => void clearData()}
                      variant="destructive"
                    >
                      {isClearingData ? "Clearing…" : "Yes, clear"}
                    </Button>
                    <Button
                      className="h-8 px-4 text-sm"
                      isDisabled={isClearingData}
                      onPress={() => setIsConfirmingClearData(false)}
                      variant="ghost"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="h-10 min-w-24 px-5 text-sm"
                    onPress={() => setIsConfirmingClearData(true)}
                    variant="destructive"
                  >
                    Clear data
                  </Button>
                )}
                <FeedbackMessage feedback={feedback} section="data" />
              </section>
            </div>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  );
}
