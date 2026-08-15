import { userListsSigningPayload } from "@jfa.dev/common/crypto";

import {
  ensureLocalIdentity,
  signLocalPayload,
  type LocalIdentity,
} from "@/lib/local-identity";
import { saveRemoteLists } from "@/lib/local-list-store";
import { getUserLists } from "@/server/users";

const UNSIGNED_SIGNATURE = "unsigned-signature-placeholder";

export async function syncRemoteLists(identity?: LocalIdentity): Promise<boolean> {
  const currentIdentity = identity ?? (await ensureLocalIdentity());
  if (!currentIdentity?.remoteUsername) {
    return false;
  }

  try {
    const auth = {
      userId: currentIdentity.userId,
      deviceId: currentIdentity.deviceId,
      signature: UNSIGNED_SIGNATURE,
    };
    const signature = await signLocalPayload(
      userListsSigningPayload({ userId: auth.userId, deviceId: auth.deviceId }),
    );
    const result = await getUserLists({ data: { auth: { ...auth, signature } } });
    if (result.status !== "ok") {
      return false;
    }

    await saveRemoteLists(result.snapshots);
    return true;
  } catch {
    return false;
  }
}
