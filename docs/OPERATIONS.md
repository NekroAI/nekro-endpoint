# Endpoint maintenance with epctl

`scripts/epctl.py` is a Python 3 command-line client for the existing management API. It does not run inside the Worker and uses only the Python standard library. `pnpm ep` is a convenience wrapper.

## Credentials and access layers

| Credential | Purpose | Transport |
| --- | --- | --- |
| `sec-` plus 64 lowercase hexadecimal characters | Manage the owner's endpoints, permissions and account, subject to existing role/activation checks | `Authorization: Bearer …` on `/api/*` |
| Browser session token | Same management API; expires according to the session table | `Authorization: Bearer …` |
| `ep-` endpoint access key | Read/execute a published protected endpoint | `X-Access-Key` or `access_key` on `/e/:username/*` |

The current schema stores the generated management key in `users.api_key`. The separate `platform_api_key` column and the hashing helpers are not used by this authentication path. Do not assume the current keys are hashed at rest. Hash migration/revocation scopes require a separate design; this change adds support for the existing generated key without changing storage.

Older deployed versions may expose a management key in the UI but only authenticate browser sessions. A 401 with a `sec-` key therefore does not, by itself, mean that the key was copied incorrectly. Deploy the authentication fix before relying on key-based automation.

Initialize once, without putting a secret in a command argument:

```bash
pnpm ep init --base-url https://your-endpoint.example
pnpm ep whoami
pnpm ep list --prefix /proxy
```

The credential is entered without echo and saved to `~/.config/nekro-endpoint/credentials.json` with mode 0600. `EP_BASE_URL` and `EP_TOKEN` can override it. Keep this file out of source control and never use a management key in a client subscription URL.

The client identifies itself as `NekroEndpoint-Admin/0.1`. Cloudflare may reject a generic Python User-Agent before an API request reaches the application. Distinguish such access-denied responses from application 401s; use an explicitly allowed management client or adjust the owner's policy, not repeated requests with random browser identities.

## Download, edit, preview and upload

```bash
pnpm ep snapshot --prefix /proxy
pnpm ep pull /proxy/clash
# Edit ~/.local/share/nekro-endpoint/work/proxy/clash/content.txt
pnpm ep diff /proxy/clash
pnpm ep push /proxy/clash --apply
```

`pull` saves normalized metadata, a baseline hash, and either `content.txt` for static endpoints or `config.json` for other types. Existing workspaces are not overwritten without `--overwrite`. `diff` and `push` without `--apply` never write remotely.

An applied push:

1. Compares the current endpoint with the downloaded baseline.
2. Refuses to overwrite a remote change or a manually edited baseline.
3. Saves a private pre-change backup.
4. Updates only `config`, preserving path, access groups, enabled and publication state.
5. Reads back and verifies the result, then advances the local baseline.

Updating an already published endpoint takes effect immediately. Prefer a new draft path for larger changes. The API has no atomic compare-and-swap: the second preflight narrows but cannot eliminate a concurrent edit between read and write. Avoid editing the same endpoint in the UI and CLI simultaneously.

Diffs redact recognized credentials, proxy URIs and URL paths. Content hashes identify changes that disappear through redaction. Redaction is not a general secret detector; review any output before sharing it. Full private backups are deliberately not printed.

## Create a draft and publish deliberately

```bash
pnpm ep create-static /proxy/clash_next /private/path/clash.yaml \
  --content-type text/yaml --permission-group GROUP_ID
pnpm ep create-static /proxy/clash_next /private/path/clash.yaml \
  --content-type text/yaml --permission-group GROUP_ID --apply
pnpm ep publish /proxy/clash_next
pnpm ep publish /proxy/clash_next --apply
```

New static endpoints are drafts. Authenticated access requires a permission group; public access requires explicit `--public`. Keep node passwords and upstream subscription tokens behind authenticated endpoints. A parent path is not an implicit permission boundary: each endpoint needs its own access configuration.

The tool omits delete and key-rotation commands intentionally. `unpublish` is available with the same preview/`--apply` pattern. Neither creating nor editing an endpoint automatically publishes it.

## Restore

```bash
pnpm ep restore ~/.local/share/nekro-endpoint/backups/BACKUP.json
pnpm ep restore ~/.local/share/nekro-endpoint/backups/BACKUP.json --apply
```

Restore checks endpoint ID, owner and path, backs up the current state and verifies the resulting editable fields. Publication state is not restored implicitly; use `publish`/`unpublish` separately. Backups are not database backups and cannot recreate a deleted endpoint with its original ID.

## Read a published endpoint

```bash
pnpm ep download /proxy/clash --username USER \
  --access-key-file /private/path/endpoint-access-key \
  --out /private/path/clash.yaml
```

This request uses only the endpoint access key, never the management Bearer token. Redirects are refused to avoid credential forwarding. The client never prints the downloaded configuration; it writes a 0600 file and reports its size/hash. The currently implemented client still loads the configured management profile to select the origin, but does not send that profile's token on this request.

## Guard native subscription exports

Some upstreams return only bootstrap nodes unless fetched by an approved client through a designated entry. HTTP 200 is not evidence of a complete subscription.

```bash
python3 -m pip install -r scripts/requirements-ops.txt
python3 scripts/subscription_guard.py /private/path/new-export.yaml \
  --baseline /private/path/last-good.yaml --min-nodes 20 \
  --report /private/path/report.json
```

The guard accepts proxy YAML or supported URI/base64 exports, rejects HTML/errors/empty exports, detects the known bootstrap/V0-only pattern and checks a configurable count drop. It does not fetch upstream URLs, modify the baseline or claim node connectivity. Thresholds depend on the subscription; a genuinely smaller valid subscription may require review and an adjusted threshold.

Use an approved native client for upstream retrieval when required. An EP proxy endpoint performs a new HTTP request from the Worker: preserving `User-Agent` alone does not preserve the original client's TLS session or its chosen network egress. A client routing its request to EP through an airport node does not automatically make the Worker's upstream request follow that node.

Recommended separation:

- Upstream retrieval: native client plus independent bootstrap nodes and the provider's documented request settings.
- Validation: parse, detect incomplete exports, compare with the last-good snapshot, and test representative nodes.
- Distribution: EP authenticated static endpoints serve validated artifacts and client configurations.
- Rollout: draft/new path, validate with real clients, then update the stable endpoint without changing the user's subscription URL.

Do not silently replace a last-good full export with a bootstrap-only response. Do not add automatic refresh timers before the native retrieval path has been proven.

## Release and verification

```bash
pnpm test:ci
pnpm typecheck
pnpm build
```

The root TypeScript configuration already includes frontend and backend. There is no separate `frontend/tsconfig.json`. The package manager is pinned to pnpm 10.11.1, matching the existing Workers Builds image. `pnpm-workspace.yaml` explicitly declares the root package and uses `onlyBuiltDependencies` to allow the required native build scripts; the newer `allowBuilds` format is not supported by that image's pnpm version.

For a Worker connected to GitHub via Workers Builds, follow the configured Git branch release flow; do not separately deploy an untracked local build. Confirm the Worker name, branch, D1 binding and existing deployment before releasing. An environment suffix can otherwise target an unintended Worker. The production configuration explicitly uses `nekro-endpoint`.

After release, verify `whoami`, snapshot the intended subtree, and test a non-production draft endpoint before updating an existing published configuration. Never put account credentials or actual subscription exports in this public repository.
