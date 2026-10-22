# Secrets Store bindings

Playlists reads Last.fm credentials exclusively through Secrets Store bindings.
Alchemy deploys references to existing secrets, never their values. Set the
non-secret `JFA_DEV_SECRETS_STORE_ID` in the deployment environment or `iac/.env`.
The store must contain active secrets with the Workers scope:

| Worker binding   | Existing secret name     |
| ---------------- | ------------------------ |
| `LASTFM_API_KEY` | `JFA_DEV_LASTFM_API_KEY` |
| `LASTFM_USER`    | `JFA_DEV_LASTFM_USER`    |

Create and rotate values in Cloudflare Secrets Store outside this deployment.
CI needs permission to bind the secrets (Secrets Store Deployer), not their
values. Cloudflare deployment credentials and Alchemy state authentication are
still needed; these cannot be bootstrapped from a Worker runtime binding.

## One-time migration from Alchemy-managed secrets

**Do not deploy the new bindings until the old state records are detached.**
Removing managed `Secret` declarations otherwise deletes the actual secrets.
The stack refuses to plan or deploy while any of the three old records remains.
Adding `retain()` and removing a declaration in the same deployment does not
protect an existing record: retention must have been persisted previously.

With explicit operator approval, pause concurrent deployments and, from `iac/`:

1. In Cloudflare, verify the store ID, the two secret names above, their active
   status and Workers scope. Set `JFA_DEV_SECRETS_STORE_ID` to that ID.
2. List state using the same Cloudflare account/profile as deployment. Use the
   **actual Alchemy stage**, which defaults to `production` for the deploy script.
   `--backend cloudflare` avoids evaluating the guarded stack during migration:

   ```sh
   bunx --no-install alchemy state list jfa-dev/production --recursive --backend cloudflare
   ```

3. Forget **only** these exact records if present. These commands delete Alchemy
   state, not Cloudflare resources. These are the old Alchemy logical IDs, not
   the new `JFA_DEV_*` secret names. Never delete the stage or Worker records:

   ```sh
   bunx --no-install alchemy state delete jfa-dev/production/PlaylistsLastfmApiKey --backend cloudflare
   bunx --no-install alchemy state delete jfa-dev/production/PlaylistsLastfmUser --backend cloudflare
   bunx --no-install alchemy state delete jfa-dev/production/PlaylistsSecretsStore --backend cloudflare
   ```

   Add `--profile <deployment-profile>` to each command if deployment uses one.
   Repeat for other previously deployed stages before deploying them.

4. List state again to verify those records are absent and verify the Cloudflare
   secrets still exist. Generate a fresh `bun run plan`; it must bind existing
   secrets without creating, updating or deleting store secrets. Deploy only
   this migrated code, then verify Playlists now-playing in the target stage.
5. Remove `JFA_DEV_LASTFM_API_KEY` and `JFA_DEV_LASTFM_USER` from CI. Do not deploy
   the old secret-owning code again after forgetting its state.

## Local development

`bun run dev` uses Alchemy's remote Secrets Store proxy for the configured real
store ID. It requires Cloudflare authentication and access to those secrets;
use a separate development store/account if production credentials must not be
read locally. Alchemy does not create or seed secrets in this mode.

`.dev.vars`, plaintext Worker secrets and `process.env.LASTFM_*` are not fallback
sources. Plain Vite/Node preview without Worker bindings reports Last.fm as
unavailable. Other Playlists features continue to work.
