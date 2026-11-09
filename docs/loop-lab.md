# Loop Lab · Chatbot Lab extension

The Loop Lab is a second working mode inside `/#chat-lab`, alongside **Gespräch**. It deliberately has no separate sidebar item or project tool kind. Existing conversation work can receive an optional `content.loop` configuration; ordinary chat history remains independent.

## Course workflow

1. Open **Chatbot Lab → Loop Lab → Loop anlegen**. A three-agent example starts with Entwurf → Kritik → Überarbeitung. Its critique prompt explicitly carries the complete draft forward, so the revision agent receives both the draft and the suggestions.
2. Supply a start text, select a standard approved text model and set one to four rounds.
3. Add up to six agents, each with a name, prompt and optional model override. Move agents with the two reorder buttons. Empty agent drafts can be saved, but a run requires a start text and a nonempty name/prompt/model for every agent.
4. **Schrittweise starten** creates a saved run without invoking a model. **Ein Schritt** executes exactly one agent. **Loop starten** creates a run and automatically executes its bounded sequence. **Fortsetzen** resumes an existing run.
5. Inspect the exact input, agent prompt and actual output of every step. Navigate earlier results while new ones arrive. Copy outputs, use an output as a new start text, or export the learning protocol/complete run.

Each agent receives only its own configured working instruction and the **complete, unchanged output of the preceding agent**. The first agent of round one receives the start text. At every further round boundary the last agent's output goes back to the first agent. There is no hidden cumulative conversation, assistant knowledge, MCP access, arbitrary code or tool execution in these text loops. The interface shows the transfer explicitly.

## Execution and persistence

`loop_runs` stores immutable configuration snapshots and authoritative results separately from editable/importable lab contents. Editing or reordering the draft never rewrites an earlier run. A run can be controlled by its initiating user; other authorized project members can inspect it. Private and shared project authorization follows the existing project/group rules.

Every step uses the existing provider-neutral `aiRun` path (OpenAI, Anthropic or Daimon), including project/group approvals, call/token budgets and usage accounting. A run has at most 24 successful steps, 32 explicit attempts and five stored runs per conversation. A 1 MB reservation per run counts toward the workspace quota. Each start text/output is bounded to 8,000 Unicode characters; prompts are bounded to 3,000 per agent. Oversized or empty model replies are not silently truncated and forwarded.

Only one model call may own a run lease. Mutation requests are actor-bound and idempotent. A completed provider response can be recovered after a process failure using its original AI request identifier, avoiding another charge. Stale leases cannot overwrite newer steps. Provider failures pause the loop, retain earlier results and require an explicit retry; no automatic retry consumes another call. The bounded attempt count includes failed attempts. An unclear upstream request may still incur provider usage.

**Pause** prevents the following step; an already running response is still recorded. **Beenden** permanently closes continuation for that run while retaining its results. Automatic playback is browser-driven and stops when leaving the Loop Lab; a currently requested model response may still finish. Reopening a work never silently resumes paid calls. Status polling synchronizes an open, unfinished run without resending its full history when unchanged.

The existing conversation import/export supports the optional configuration. Run histories cannot be forged through lab imports. Omitting the optional loop field preserves an existing loop, including a previously redacted draft saved after permissions change. To remove a run, use its explicit version-checked removal action. Deleting its parent conversation or project cascades the run data.

## Group release

**Loop Lab · Chatbot Lab** is a separate `loop_lab` group feature, with UI dependencies on `chat_lab`, `files` and `ai`. Disabling the extension hides its configuration and blocks run APIs server-side; ordinary chat edits preserve the hidden loop. Existing active-group union rules apply. Closed groups cannot supply permissions or project access.

The optional extension does not widen a project's allowed lab tool catalog: a project must already allow `conversation`/Chatbot Lab. Text-model selection reuses the available personal and shared AI connections. Changing connection access, account status or group permissions is checked again after an upstream request, before releasing its result.

## Verification

- `node tests/loop.mjs`: JS/PHP configuration contract, exact input handoff and round boundaries, per-agent providers, idempotency, leases, pause/resume/stop, explicit failure retry, completed-call recovery, immutable snapshots, chat coexistence, run quotas, private/shared access, permission expiry and lossless redaction.
- `tests/loop-http.py`: temporary local server, real login/CSRF/method guards, the actual save/start/step/status APIs and synthetic provider responses. No external AI calls.
- `tests/loop-ui-router.php`: test-only transport injector, gated by a disposable development-data directory, explicit test environment flag and synthetic account suffix. It is not in the production document root or deployment paths. The application itself has no test-provider bypass.
- Existing model, API/security, migration and 25-session suites remain applicable. Responsive browser review includes the builder, step results, automatic playback and control navigation.
