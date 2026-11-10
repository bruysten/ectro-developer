# Agent Lab

`/#agent-lab` accompanies instructor-led exercises about bounded agents, tools, rules, skills and MCP. It reuses the existing project/object controls, AI providers and group permission union.

## Teaching workflow

- Start with **Geführtes Beispiel · ohne KI**. This is a fixed, explicitly labeled sequence with real reads/calculations, not a simulated LLM. The default four rows produce course sums of 3,600 and 2,400.
- Switch to **Modell entscheidet** to let an existing project-approved OpenAI, Anthropic or Daimon connection select one JSON action at a time. Existing token/call budgets apply. No new model or provider SDK is introduced.
- Every proposed tool call is visible before execution. `report.create` requires an explicit approval and stores a run-local Markdown artifact. It cannot write arbitrary files, send messages, execute SQL or access arbitrary URLs.
- Compare the ordinary report, a synthetic instruction embedded in a source copy, and an explicit first-read failure. The attack example never modifies the original source. The fixed demonstration is illustrative; it is not evidence that an LLM resisted an attack.
- AGENTS.md is assembled from role, context, language, response style, quality rules and custom rules, with a live downloadable preview. Four instruction-only SKILL.md files can be created/imported/exported. Scripts and skill `allowed-tools` metadata are not executed or used to grant access.

Saved runs keep an immutable configuration snapshot separate from editable/importable lab contents. Runs are actor-controlled, project-readable, versioned and idempotent. An action lease prevents duplicate model calls; a late result cannot replace a newer action. Stop can invalidate a running lease. Explicit refresh resolves uncertain client retries. There are at most ten runs per work, twelve decisions per run and 200 KB of workspace reservation per run. Source reads require a complete table of at most 200 rows/32 KB, not a silently truncated aggregate. Missing numeric values remain missing, not zero.

## Personal database MCP

The **MCP · Datenbank** tab is personal and independent of the currently edited agent work. It uses the user's existing `connections` row or an authorized project's existing connection. It never displays or copies database passwords.

1. Load tables, select columns, set a maximum of 1–100 rows per request and save.
2. Test `tools/list`, `db.list_tables`, `db.describe_table` and `db.read_rows` in the internal inspector. These tests also work with external access off.
3. Enable external access explicitly. It starts **off** for every user. Group permissions `agent_lab` and `mcp_external`, plus files/database access, apply on the server. Expired groups do not grant access; active groups contribute permissions additively.
4. Use the same `/mcp/` endpoint in ChatGPT or Claude. Public HTTPS hosting is required for cloud clients. Localhost URLs are only usable in local tests.

The MCP is stateless Streamable HTTP (JSON POST responses, initialized notifications return 202, GET returns 405), negotiates 2025-11-25 and 2025-06-18, and always exposes three read-only tools. `db.read_rows` compiles a fixed SELECT over allowed identifiers; it accepts no SQL. Pagination is bounded and explicitly reports `hasMore`; equal values or concurrent DB edits can affect ordering. Output is capped at 64 KB. Database contents remain untrusted data.

### Optional write access

Write access starts empty, including after upgrading existing profiles. In the table selector, mark the exact writable columns and choose **Anlegen** (insert), **Ändern** (update), or both. Save the publication and reconnect the external client. The additional group capability `mcp_write` must be enabled. A read-only OAuth consent remains read-only even if the profile can write; the client must request `db:read db:write` and the user must explicitly check **Auch Schreibzugriff erlauben**. Refresh can narrow scopes, never enlarge them. Personal keys inherit the current published selection; changing that selection revokes previous keys.

Two additional tools appear only with write permission:

- `db.prepare_change` previews one insert/update using allowed columns and a complete primary key for updates. It does not modify MySQL. Drafts are encrypted, user/profile/connection bound and expire in ten minutes.
- `db.apply_change` accepts the reviewed change ID and `confirm=true`. It locks the target row and rejects an outdated preview before updating. Completed change IDs return the same receipt; executing/uncertain outcomes are never automatically retried.

Only InnoDB base tables with a fully readable primary key are supported. Generated/auto-increment columns cannot be marked writable, and primary keys cannot be updated. SQL runs through native prepared statements, with strict mode and a bounded lock timeout. No deletion, free SQL or bulk changes are exposed. Database constraints and the saved DB account's permissions still apply. Triggers and foreign-key cascades configured in the database retain their normal behavior. MCP annotations and the preview/confirm tool protocol guide clients; they do not guarantee that an external client presents a separate human dialog for every call.

Successful drafts discard their encrypted row snapshots; encrypted receipts and failed/uncertain drafts are pruned after retention. Logs contain only tool/status/time/count metadata. The internal inspector continues to offer read-only probes; writes are exercised through the connected MCP client.

## ChatGPT and Claude authentication

**ChatGPT:** create a custom MCP app in developer mode, paste the endpoint and choose OAuth. Leave client credentials empty; use dynamic client registration (DCR) if asked. Sign in to Academy and approve the exact tables/columns on the consent page. Availability depends on the ChatGPT plan and workspace policy. The implementation also accepts Claude's documented OAuth callback URLs.

OAuth discovery is served at `/.well-known/oauth-protected-resource/mcp` (and the root variant) and `/.well-known/oauth-authorization-server`. Authorization-code flow uses mandatory PKCE S256, exact registered redirect matching, resource binding, state reflection and issuer identification. Registration supports public clients (`none`) and only recognized ChatGPT/Claude HTTPS callbacks. No external metadata URL fetching, identity provider, npm service or external authentication code is required. Codes expire after two minutes and are single-use. Opaque access tokens last one hour; rotating refresh tokens last thirty days, with replay revoking the grant. Token/code values are stored only as hashes. Existing Academy sessions/password policy are reused. Because the session cookie is SameSite=Strict, a cross-site first visit may ask the user to sign in and then continue on the same-origin consent page.

**Claude alternative:** choose fixed request headers and use `Authorization: Bearer PERSONAL_KEY`. The lab generates an expiring key once, stores only its hash and supports rotation. It must not be distributed through a shared organizational connector: everyone using the same credential would reach the same personal data. Rotating this key does not invalidate existing OAuth grants.

Changing MCP configuration invalidates all previous bearer keys and OAuth grants by changing the profile revision. Switching external access off revokes access immediately. Every remote request checks account activity/password version, group access periods/features, project access, profile revision, token expiry and the saved DB connection fingerprint. Responses are reauthorized after reads. Cookies and a forged admin-portal header cannot authenticate MCP requests. Logs retain at most 100 metadata entries per user and never store tokens or database contents.

## Deployment

The MCP runs in PHP on the Academy server; a browser only configures it. External clients use `https://ectro-academy.de/mcp/` and Academy OAuth selects the personal profile. No user/group ID belongs in the URL; authentication, active-group permissions and selected columns are checked on each request. Closing the browser does not revoke a publication.

Set a canonical HTTPS origin in **Administration → Freigaben → Systemeinstellungen → MCP für externe KI-Clients**, or `APP_PUBLIC_URL`/`config.local.php` `public_url` (environment/config takes precedence). Example: `https://academy.example.de`, without a path. The application must actually be reachable there; this field does not provision hosting or a tunnel. Configure HTTPS directly for the PHP host; forwarded headers are not trusted. Apache's public document root ships the `.well-known` and OAuth directories, and forwards Authorization to PHP through the existing rewrite module. Existing global security headers remain in force; OAuth consent forbids framing and external form actions.

The deployment workflow passes `APP_URL` to `scripts/prepare.php` as `public_url`. Preparation also processes this input on upgrades and persists it in `settings.mcp_public_url`, without replacing encryption keys or existing private configuration. HTTPS health checks verify both OAuth discovery documents. Empty config overrides fall back to the admin setting; `Host` or `Forwarded` headers never choose the OAuth issuer.

The interface uses **Freigabe veröffentlichen / Veröffentlichung aktualisieren / Freigabe zurückziehen** according to the saved/draft status, and provides a copyable server URL plus a three-step Claude guide. Unchanged saves preserve profile version, keys and OAuth grants; changed selections/settings still revoke previous access.

Official interoperability references (Claude guidance rechecked 2026-11-10):

- [OpenAI: authenticated MCP apps, discovery, PKCE, DCR and redirect handling](https://developers.openai.com/plugins/build/auth)
- [OpenAI: add a custom MCP server in ChatGPT](https://developers.openai.com/api/docs/guides/custom-mcp-server)
- [Anthropic: custom connectors, request headers and cloud reachability](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp)
- [MCP: Streamable HTTP transport](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
- [AGENTS.md format](https://agents.md/), [Agent Skills specification](https://agentskills.io/specification)

## Verification

`node tests/agent.mjs` covers PHP/JS rule-file parity, skill parsing, model-action validation, duplicate actions, failures, approval, migration, source bounds, access control, MCP restrictions and OAuth lifecycle. It also launches a disposable local PHP server for the complete HTTP discovery/consent/PKCE/token/tools/disable flow; it never contacts ChatGPT, Claude or a real AI provider.

`php tests/table-schema.php` additionally runs `tests/agent-mysql.php` against the existing isolated CI MariaDB service, verifying selected-column isolation, metadata, nulls and bounded pagination. General model, API and security suites remain applicable. Real ChatGPT/Claude cloud linking requires the deployed public HTTPS installation and has not been claimed as locally verified.
