import {
  deviceRevocationSigningPayload,
  generatePairingCode,
  pairingApprovalSigningPayload,
  userRenameSigningPayload,
} from "@jfa.dev/common/crypto";
import { type UserProfile, usernameSchema } from "@jfa.dev/common/identities";
import { Button, Input } from "@jfa.dev/common/ui";
import { UserRound } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "react-aria-components";

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
  approveDevicePairing,
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

type FeedbackSection = "username" | "pairing" | "approval" | "devices";

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

export function UserDialog() {
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
  const [isAdopting, setIsAdopting] = useState(false);
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

  const adopt = async (): Promise<void> => {
    if (pairingStatus?.status !== "approved") {
      return;
    }
    setIsAdopting(true);
    resetFeedback();
    try {
      const nextIdentity = await adoptLocalIdentity(pairingStatus.profile);
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
      setPairingStatus(result);
      if (result.status === "approved") {
        setProfile(result.profile);
        setMessage("approval", "The device was approved.");
      } else {
        setError("approval", "This device could not be approved.");
      }
    } catch {
      setError("approval", "This device could not be approved.");
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

  return (
    <DialogTrigger
      onOpenChange={(isOpen) => {
        if (isOpen) {
          resetFeedback();
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
        className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-10 sm:pt-16"
        isDismissable
      >
        <Modal className="max-h-[calc(100vh-5rem)] w-full max-w-lg overflow-y-auto outline-none">
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
                      className="mt-1.5 h-10 text-base sm:text-sm"
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
            </div>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  );
}
