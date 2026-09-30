# Canonical proxy subscription pipeline

`scripts/proxy_sync.py` is a local, manual maintenance tool. It fetches approved upstreams through an isolated native Mihomo process, compiles one canonical EP master, and publishes protected static artifacts. It never installs schedules, changes system proxy settings, reloads a router, or writes legacy endpoints.

## Layout

- `/proxy/source/master`: the only manually maintained business configuration (Mihomo-style YAML).
- `/proxy/source/airport-main`, `/proxy/source/airport-backup`: validated node snapshots.
- `/proxy/client/clash`: fully expanded Mihomo configuration without providers.
- `/proxy/client/nikki`: the same business configuration plus a local device overlay.
- `/proxy/client/shadowrocket/nodes`: Shadowrocket YAML node subscription.
- `/proxy/client/shadowrocket/config`: companion groups, routing and DNS configuration; import after the node subscription.

The master uses `proxy-providers.<name>.x-source` to reference a source ID in the private manifest. Provider filters remain in the master. An optional `x-bootstrap-nodes` list has `{name, source, match}` entries; every selector must match exactly one fresh source node. Self-hosted nodes live in the master, not in separately edited client copies.

## Private manifest

Store `~/.config/nekro-endpoint/proxy-sync.json` with mode 0600. Each source records its display name/site, `url_file`, acquisition `mode` (`direct` or `two-stage`), supported-client `user_agent`, `bootstrap_dns`, optional `bootstrap_filter`, `timeout`, `min_nodes`, `min_ordinary`, `max_drop`, `exclude_filter`, optional initial `baseline_file`, and protected source `endpoint`.

Top-level keys are `master_path`, `state_dir`, `mihomo`, `geo_file` (an existing Country.mmdb for offline checks), `nikki_overlay`, `sources`, and `outputs` (`clash`, `nikki`, `shadowrocket_nodes`, `shadowrocket_config`). Management credentials use the existing epctl profile. Actual URLs, exports and client links stay outside this public repository.

The Nikki overlay is intentionally limited to networking/listener/authentication/hosts/sniffing settings and LAN-specific `rules-prepend`. It cannot replace service groups. Controller secrets remain in Nikki's local UCI; generated profiles bind their otherwise unauthenticated controller to loopback only. Applying a profile to a router requires a separate Mixin review and rollback procedure.

## Run

```sh
python3 -m pip install -r scripts/requirements-ops.txt
python3 scripts/proxy_sync.py --preview
python3 scripts/proxy_sync.py --apply
```

The Python CLI defaults to preview. A personal shell wrapper may deliberately default to `--apply`, but should still support `--preview`. Use the same command for human- and agent-triggered maintenance; do not invoke retired personal scripts that write old endpoints.

Every run keeps private source responses, artifacts, validation logs and a report. An OS file lock prevents overlapping runs. The master and output baselines are checked for drift; unchanged content is not rewritten. Every write is backed up and read back. If a batch fails, the tool attempts compensation only where its own content remains present; concurrently edited or uncertain records are left for review. This is **not** atomic publication or server-side compare-and-swap. Newly created records may remain as unpublished drafts after failure. A durable `publish-journal.json` records partial work; interruption during a request requires inspecting it before retrying.

## Compatibility boundaries

- Source acquisition currently requires YAML exports after native retrieval. URI-only upstream exports need a separately verified parser.
- Text/YAML classical, domain and IP rule providers can be expanded in place. Binary MRS, nested rule sets, provider overrides and include-all semantics are rejected rather than silently changed.
- Names are source-prefixed to avoid collisions. Empty regional groups become REJECT, not DIRECT. Relay and group cycles are rejected.
- All generated YAML strings are quoted: Python and Go YAML parsers disagree on hex IDs that resemble scientific notation.
- Shadowrocket node export preserves transport, Reality, port hopping and relay metadata in YAML. Supported protocols are checked explicitly. Companion config uses explicit node names; import both artifacts. Native iOS import and relay/DNS behavior still require device validation—Mihomo validation is not Shadowrocket validation.
- iOS cannot execute desktop/Android process matching. The private manifest may explicitly set `shadowrocket.omit_rule_types: [PROCESS-NAME]`; omitted rules are listed in each report. All other unknown rule types fail.
- Shadowrocket's native naming/chain and DNS syntax references: [node producer implementation](https://github.com/sub-store-org/Sub-Store/blob/master/backend/src/core/proxy-utils/producers/shadowrocket.js), [configuration manual](https://github.com/LOWERTOP/Shadowrocket). Neither substitutes for device acceptance testing.

Old client addresses remain independent and unchanged until the operator explicitly migrates them. Publishing artifacts does not imply any device has adopted them.

## Shadowrocket daily-use policy

An optional `x-shadowrocket` block in the canonical master defines a **mobile-only** `selective-direct` profile. It contains explicit rules, external rule-provider declarations, DNS choices, visible group order, group replacements and restricted health-test options. The compiler expands these dependencies into the companion config, prunes unreachable maintenance nodes/groups, and marks secondary groups hidden. Desktop and Nikki artifacts continue to use the main rules unchanged.

The daily profile must end with DIRECT. Put LAN/captive-portal rules and narrowly scoped Claude/Taiwan rules before advertising and selected-service lists. An ad group can select REJECT or DIRECT for troubleshooting; switching it to DIRECT permits matching destinations directly, rather than reevaluating later rules. External source failures block publication and preserve the previous batch. The daily renderer accepts Shadowrocket IP-ASN/USER-AGENT rules and avoids emitting the version-sensitive bypass-system override. Domain-level blocking does not imply HTTPS interception or removal of in-stream video ads. Device acceptance remains required.

Nikki overlays merge `dns.fake-ip-filter` exclusions with the canonical master instead of replacing them. This preserves application-specific real-IP exceptions (for example remote-control/STUN domains) while retaining LAN-specific exclusions. Process routing can protect desktop clients, but routers cannot identify a forwarded client application; domain/IP routing must also be verified on the router.

Shadowrocket node subscriptions use a literal `proxies:` marker followed by JSON objects as YAML sequence items. Keep this wire format distinct from the fully quoted generic YAML emitter: client format detection may not accept quoted root keys even when the YAML is valid. JSON retains string-valued Reality IDs, Unicode labels and relay metadata. A successful HTTP/parse test does not replace actual iOS subscription-import verification.
