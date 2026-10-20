# Agent Arsenal — Situation Report and Handover

| Field | Value |
| --- | --- |
| Repository | `https://github.com/Stark-work-1001/Agent-arsenal` |
| Commit examined | `70bc993c70476cc60947d18c96caed6e2744a010` (branch `main`) |
| Version at that commit | 1.0.0 |
| Date | 2026-10-19 |
| What this is | Context, evidence, and an open brief. Not a task list. |

---

## 0. What I am handing you, and what I am not

This document exists because I looked at this codebase and found things you should know before you start. It is not a specification. It is not a checklist to work through. Nothing in it is binding.

What it contains:

- **Evidence.** Things I verified by reading the published source and, for the security items, by running the published code against a copy of the database. Each one comes with the command that reproduces it. I expect some of these to be wrong; I expect you to find others that are worse.
- **An assessment** of where the structural weight sits and why, written as reasoning you can argue with.
- **Some instincts** about what matters and what does not. They are opinions with reasons attached, not requirements.

What it deliberately does not contain:

- **A fix for anything.** I describe what I see and why it might matter. What to do about it is your call. Where I sketch a direction, it is one option among many and I have not costed it.
- **An order of work that you must follow.** I suggest one. If you see a better sequence, use yours.
- **Targets you must hit.** Where I name a number, it is a description of a failure mode, not a budget I am imposing.
- **The list of what is actually wrong with this codebase.** I found what one pass finds. The real list is longer and you will write most of it.

One sentence that matters more than the rest:

> **If the best thing to do here is not on this list, do that instead, and explain why. I would rather be corrected than obeyed.**

---

## 1. The situation

Agent Arsenal is a local, cross-host capability hub. It reaches into several AI coding hosts, pulls out skills, MCP server declarations, plugins, prompts and agent cards, normalises them into one SQLite model, and serves that model over MCP and REST. On top of retrieval it does diagnosis, duplicate arbitration, upstream version comparison, and repair — either by applying a small set of safe fixes itself or by writing a work order that an attached agent can pick up.

It is a one-person project at version 1.0.0. It works. It demos well. It has a real corpus behind it: 315 capabilities, 324 installations, 21 sources, 3,057 catalogue rows, and 24 passing tests.

Here is the honest shape of it, as I read it:

**The product's thesis is good and underexploited.** "The hub diagnoses and locates; an agent does the repair" is a genuinely interesting division of labour. But the repair path currently ends at a file write with no verification, no ownership, and no proof that anything improved. The most interesting idea in the codebase is the least finished part of it. I think that is where the value is, and I think it is worth more of your attention than any of the mechanical defects below.

**The breadth is real and the depth is thin.** Six protocols, three retrieval channels, a ten-rule diagnostic engine, a duplicate arbiter, an update checker, an ecosystem sync. Every one of those has a correct skeleton and a shallow implementation. The three retrieval channels are advertised as fused; one of them has never held a single row.

**The architecture is one process doing four jobs.** The Electron main process is also the kernel, the HTTP server, the MCP server and the scheduler. The database driver is synchronous by design. So a scan blocks the window, and every service is only testable by booting Electron. This is survivable at this size and will not be at the next order of magnitude.

**The code is honest about its own uncertainty in a way I want to preserve.** Degradation is surfaced rather than hidden. Backups exist. Deletion is reversible. There is an audit trail. These are harder to add later than to keep, and a rewrite that loses them has lost more than it gained.

What I think this codebase needs is not more features and not a rewrite. It needs the parts that already exist to become trustworthy, and the one idea that is unique to it to become real.

---

## 2. What I verified

Everything in this section was reproduced against the published commit. Appendix A gives the command for each. **Treat these as claims to check, not facts to accept.** If one does not reproduce, that tells you something about me and something about the code, and both are useful.

I have grouped them by what they suggest about the system rather than by severity, because the grouping is the part that is actually informative.

### 2.1 The trust boundary is not where the documentation says it is

The README describes a loopback-only service with a backup before every write and a path boundary around repairs. What I found:

**A repair ticket can write outside its own installation.** `submitPatch` computes its permitted prefix from the *parent* of the installation path, so a fault raised for one skill permits writing any sibling skill under the same source directory. I reproduced this: a fault for `victim-a` overwrote `victim-b`'s entry file with no error. For MCP installations the degradation is worse — the path carries a `#serverName` suffix, so the permitted prefix collapses to the whole configuration directory. This function has no tests at all, which is likely why it survived.

**The HTTP surface has no authentication and answers any origin.** `sendJson` sets `Access-Control-Allow-Origin: *` unconditionally, `OPTIONS` returns 204 for everything, and none of the write endpoints check a credential. I sent a request with a foreign `Host` header to `/api/v1/capabilities` and got the full list back with 200. `POST /capabilities/import` will copy an arbitrary directory into the managed library; `/ecosystem/apply` writes into other applications' config files; `/faults/:id/autofix` rewrites skill files on disk. From a browser on the same machine, this is reachable.

**An environment variable creates a source that cannot be deleted, and is never validated.** This one is new and worth calling out because it arrived with a good fix. The hard-coded extra-library path was correctly replaced with `ARSENAL_EXTRA_LIB` — but every discovered candidate is stamped `builtin: true`, and `sources.remove` refuses to delete builtin sources. Point that variable at a directory and you get a permanent source row, scanned and indexed, with no refusal of system directories, no size cap, and no symlink check.

The pattern across all three: the intent is documented correctly and the enforcement is one level weaker than the intent. That is a specific kind of bug — it means the author knew the rule and implemented a neighbour of it. It also means the fix is usually not "add a check" but "make the check structurally impossible to weaken."

### 2.2 Advertised capability that does not exist

**The trigram retrieval channel has never held a row.** The table is created as a contentless FTS5 index with `tokenize='trigram'`, and `search.js` queries it. Nothing anywhere inserts into it — no trigger, no rebuild path, no maintenance. Measured on the delivery database: `search_docs` 315 rows, `search_trigram` 0 rows. The query sits in a `try/catch` that swallows the failure, so the loss is completely silent.

This is the channel that was supposed to make Chinese substring and path-fragment queries work. The README says it works. The Database view in the app says it works. Neither is true, and nobody could have noticed from the outside.

**A settings toggle is written and never read.** `diagnoseOnScan` appears exactly once in the repository — in the view that writes it. No code reads it. An operator turns it on, nothing happens, and they lose a little trust in every other switch on that page.

**The Codex ecosystem target previews a format it cannot write.** It is registered read-only because `config.toml` is TOML, but `previewMcp` returns a JSON snippet for every host. The UI shows that JSON as "the preview". The preview corresponds to nothing that can happen.

I keep coming back to these three together because they share a cause: capability was declared at the surface and implemented at the core, and no test asserted the two agree. Any design you build should make that class of gap impossible to ship, not just fix these three instances.

### 2.3 Verification is a label, not a check

This is the one I would think hardest about.

`autoFix` and `submitPatch` both mark a fault `resolved`, set health to `healthy`, and set `verify_state='verified'` immediately after writing the file. Neither re-runs the rule that raised the fault. So a patch that changes nothing is recorded as a verified repair.

Meanwhile the repair writes have no compare-and-swap. Between reading the file and writing it, another agent or the user may have changed it. `repairs.before_hash` records what was read; nothing checks the file still matches at write time. Two concurrent patches both apply, the last writer wins, and the log claims two successes.

And the ticket has no owner. There is a dispatch action and a submit action with nothing between them — no claim, no lease, no state machine, no way to tell a stale worker from a live one.

For a product whose entire claim is "the hub can verify and govern repairs," these three together mean the claim is unearned. I do not think this is a bug to patch; I think it is the missing core of the product.

### 2.4 Things that will not scale

Measured at 315 capabilities. These are not wrong at this size; they are wrong at the next one.

| Observation | Measured | Growth |
| --- | --- | --- |
| `dedupe.scan` is an all-pairs loop that re-tokenises both sides per pair and re-reads open groups from SQLite per candidate | 485 ms | quadratic — ~44 s at 3,000, over an hour at 30,000 |
| Every scan calls `reindexSearch`, which deletes and rebuilds all documents in one transaction | 370 ms | linear per scan, on a path where per-document maintenance already happened |
| `countForHost` full-scans the capability table once per agent | 8 scans per `list()` | one scan per known host |
| `upsertCapability` issues ~5 statements per capability with no surrounding transaction | ~1,500 implicit transactions per scan | linear, and a crash leaves the library half-updated |
| Every statement is prepared on each call; the driver caches nothing | thousands of prepares per scan | linear |
| Every search writes an `events` row, and `events` has no retention | one row per query, forever | unbounded |

There is also a correctness problem hiding in the performance one: the scan is not transactional but the reindex is, so a crash mid-scan leaves the library updated and the index empty.

### 2.5 Schema evolution is not implemented

`migrate()` runs a schema made entirely of `CREATE TABLE IF NOT EXISTS`, then records the version number. There is no `ALTER TABLE`, no ordered migration, no down-path, no guard against running older code against a newer database. The first column anyone adds to an existing table will silently not be added, and every query touching it will fail at runtime.

This one is worth naming separately from the performance items because it is the kind of defect that looks fine until the day it is catastrophic, and because it blocks every other schema change you might want to make this round.

### 2.6 Structural drag

**The scanner knows about protocols.** It is a five-branch `if / else if` over `src.kind`, each branch re-implementing directory walking. Adding a sixth protocol means editing the scanner, the source-kind enum, the `KINDS` array, the renderer's kind map, and the filter buttons. Five edit sites for one concept. The `adapters/` directory exists and is called, but from inside the branches rather than as the extension point.

**The IPC contract is maintained in three places by hand.** 52 handler registrations, 52 preload methods, 53 typed wrappers, nothing linking them. A renamed channel fails at runtime as a toast, not at build time. This is the interface between every layer in the app and it is unverified.

**Eleven views each hand-roll their own loading / error / reload state.** There is no shared server-state layer. Two independent polling loops run against `/status` and scan-busy at different intervals.

**Business logic sits in the Electron main process.** Boot scan, schedules, settings reads — all of it lives in `main.js` and none of it can be tested without a window.

### 2.7 Smaller things worth a glance

These are not urgent. They are listed so you are not surprised by them, not because I think they deserve priority.

- A hand-rolled Markdown renderer escapes `&`, `<`, `>` but not quotes, then interpolates captured groups into `href="..."` and feeds the result to `dangerouslySetInnerHTML`. Capability bodies are untrusted input. I did not demonstrate an exploit, but the shape is an attribute-injection seam.
- Two different content "hashes": snapshots record `sha256(String(Date.now()))`, and the ecosystem backup uses a 32-bit rolling hash, while the fault backup uses a real SHA-256. Same table, three semantics.
- `walkFiles` stops silently at 500 files with no report. `depth` means different things to different collectors.
- A dead loop in `agents.scan` whose guard is `ts - 5*60*1000 > ts`, always false.
- `arsenal.list` throws `column index out of range` when a caller passes an empty-string `kind` — reproduced. The bind filter only removes `undefined`.
- The built renderer bundle is committed next to the source, and `main.js` loads it whenever dev mode is off, so a stale bundle silently becomes the running UI.
- `README.md` claims 8 diagnostic rules; there are 9. Small, but it is the front page.
- No linter, no unused-import detection — which is how seven unused imports accumulated across two files.
- The truthy-looking assertion in the oversize-body test accepts `202`, which is the opposite of what the test is for.

### 2.8 What is already fixed — do not re-report

Four hard-coded machine paths that an earlier audit flagged were corrected before this commit. If you find them back, the repository has regressed and you should say so loudly; otherwise they are not open work:

- Upstream catalogue cache path is discovered under the user home rather than hard-coded (`services/updates.js`).
- Extra capability library resolves from the user home plus `ARSENAL_EXTRA_LIB` (`services/discovery.js`).
- Backup directory fallbacks no longer embed an absolute path (`services/faults.js`, `services/ecosystem.js`).
- The seeded example MCP entry uses a relative workspace rather than a drive root (`services/seed.js`).

One of those fixes introduced §2.1's third item. That is worth noticing as a pattern: a fix that widens an input surface without widening the validation around it converts a portability bug into a security bug.

---

## 3. Where the weight actually sits

I want to be explicit that this section is opinion, and that you have better information than I do once you are inside the code.

If I had to name the highest-leverage thing in this repository, it is not any item in §2. It is this:

**The division of labour — hub diagnoses, agent repairs, hub verifies — is the only idea here that I have not seen elsewhere, and it is the least implemented.**

Everything needed to make it real already has a stub: there is a fault table with evidence, a dispatch action that generates a structured work order, an MCP tool that accepts a patch back, a repair log with before and after hashes, and a backup system. What is missing is the part that makes it a protocol instead of a procedure: ownership, a state machine, verification that re-runs the check, and a conflict story when two agents are working.

If you did nothing else this round but make that loop trustworthy end to end, and left every performance number where it is, I would consider the round a success. I am aware that might be the wrong call. That is why it is a paragraph and not a requirement.

Second highest, in my assessment: **the trust boundary**. Not because the individual findings are severe in a single-user desktop app — they are moderate — but because "the hub writes to files it does not own" is the exact claim the product makes, and a boundary that is one level weaker than its description will eventually be load-bearing.

Third: **the process split**. This is the change that makes everything else cheaper and it is also the one most likely to be over-done. See §5.

I rank the performance work and the schema work lower, not because they are unimportant but because they are mechanical and you will get them right. The ranking above is about where judgement is required.

---

## 4. What I think good looks like, and my uncertainty about it

Short list, stated as outcomes rather than implementations. Argue with any of them.

- **The repair loop is a protocol, not a procedure.** A ticket has an owner and a state. A worker that dies is distinguishable from a worker that is slow. A patch that does not fix the fault is recorded as a failure and the fault stays open. Two agents racing on one ticket produce one winner and an honest log.
- **Every advertised capability is asserted.** The retrieval channel exists or it does not. The settings toggle does something or it is not there. Whatever structure makes those two statements cheap to enforce is worth more than the individual fixes.
- **Nothing writes outside a path it can name in advance.** One guard, used everywhere, that a reviewer can check by grep rather than by reasoning.
- **The kernel can be tested without a window.** Not "should be"; can be, today, by someone who has never seen Electron.
- **Adding a protocol, an endpoint, or a channel is a small local change.** If it is five edits in five files, the abstraction is missing, not the discipline.
- **The corpus can grow an order of magnitude without the UI noticing.** I have deliberately not said how; the constraint is the outcome.

Where I am unsure, off the top of my head:

- Whether the process split is worth what it costs. It buys testability and responsiveness, and it costs a supervisor, a control channel, a failure model, and a class of bugs that only appear when two processes disagree about state. In a desktop app, the second process is also a second thing to orphan. I think it is worth it, but I would want to see it argued rather than assumed, and doing it late — after the layering exists — is much cheaper than doing it early.
- Whether the trigram channel is worth maintaining. It is the right tool for Chinese substring matching, and `trigram` in SQLite does not match queries shorter than three characters, which for Chinese is most of them. Keeping it, replacing it with a bigram scheme, or dropping it and documenting the limitation are all defensible. I do not know which is right without measurements I did not take.
- Whether the frontend should get a component framework. 13 views of hand-rolled state is painful, but the current shape is also small, dependency-free and fast. I lean towards "add a server-state layer and a real Markdown parser, keep the rest," but that is a preference, not a finding.

---

## 5. What I would do, offered as one plan among several

You have no obligation to follow this. I include it because a handover with no opinion is less useful than one with a stated opinion you can reject.

My instinct is to sequence by *what makes later work cheaper*, not by severity:

1. **Pin the current behaviour with tests before changing anything.** Four paths have no coverage at all and are the ones I would least want to refactor blind: the patch write, the auto-fix write, the HTTP auth surface, the trigram query. Characterisation tests first means every later change is safe to attempt.
2. **Make the boundary real.** One path guard, one token check, one Host check, used uniformly. This is small, it is independent of everything else, and it removes a class of problem from your mental load for the rest of the round.
3. **Make the loop real.** Ticket ownership, state machine, verification, conflict. This is the round's real work and it wants the tests from step 1.
4. **Make the schema evolvable and the data layer fast enough.** Migrations first, because you cannot add columns without them. Transactions, statement cache, content storage after.
5. **Split the layering, then split the process.** Layering first because it is cheaper and because it makes the split mechanical. The split last because it is a deployment change with its own failure modes, and doing it after everything else means you are debugging one thing at a time.
6. **Then the frontend, then the retrieval quality work.** Both benefit from everything above and neither blocks anything below.

Two things I would deliberately *not* do early: chase the performance numbers before the schema work, and touch the frontend before the kernel boundary exists. Both are rework generators.

Where I could easily be wrong: steps 2 and 3 could run in parallel if you have the appetite for two threads. And if you conclude the process split is not worth it, steps 1–4 stand on their own and lose very little.

---

## 6. The decision space — explicitly yours

This section exists because I do not want to be the person who decided these by omission.

**Not decided by me, and I would rather you decided:**

- Whether to split the process at all, and into how many.
- Whether to adopt any framework or library, and which. I have opinions in §4; they are weak.
- Whether to rewrite or refactor the frontend data layer, the Markdown renderer, the search ranking, or the workflow engine.
- Whether to keep, extend, replace or delete the trigram channel.
- Whether the repair protocol should be a state machine, an event log, a lease table, or something I have not thought of.
- What the schema should look like when you are done.
- Which of my §2 findings you consider real, and which you dismiss.
- Whether the round should be organised by subsystem, by risk, or by user-visible outcome.
- What "done" means, beyond the handful of outcomes in §4.
- Whether anything in §5 is worth following.

**Constraints I would push back on only if you have a reason:**

The four below are genuine constraints, not preferences, because breaking them breaks something a user already has. Everything else is negotiable.

- An existing database keeps its rows through any migration.
- The MCP tool names and REST paths keep working, with their current shapes. Additions are fine; silent changes are not.
- The service stays loopback-only, and no new network call runs without the user starting it.
- A write to a file the hub does not own has a backup that can be restored from the UI.

If you believe one of those should be broken, make the case — say what it buys, what it costs, and how to get back. That is a decision I would be glad to be overruled on, provided it is argued rather than assumed.

**Explicitly not your problem this round** (unless you think otherwise and say so): installers, code signing, release versioning, hosted CI, cloud sync, account systems, telemetry.

---

## 7. What would help me most in your reply

Not a required format. This is what I would find most useful, in rough priority.

1. **Which of my claims are wrong**, with the file and line where you checked. I would rather learn that my §2.1 was overstated than read a confirmation.
2. **What I missed** that is worse than anything I found.
3. **What you decided against me on**, and why. The design judgements in §3–§5 are the parts I most expect to be corrected.
4. **What you actually did**, with the command that shows it working. For anything you chose not to do, one line on why.
5. **What you are still unsure about** when you finish. Honest residual risk is more useful to me than a clean summary.

If you disagree with the shape of this document — that it is too long, too prescriptive, wrong about what matters — say so and work from your own reading. I would rather receive the upgrade you think is right with a paragraph explaining why you ignored me, than a faithful execution of a brief I am not confident in.

---

## Appendix A — Reproduction

Each check reproduces one claim from §2. Run them against a **copy** of the database, never the live one. If a check does not reproduce, record that and move on; the disagreement is more informative than the fix.

**A-1 · repair ticket escapes its installation.** Create two skills that both lack frontmatter, in one source directory. Point a context at it, register the directory as a `skill` source at depth 1, run `scanAll({})`, then `diagnose()`. A `skill-missing-frontmatter` fault will exist for the first skill. Call `submitPatch` with `faultId` set to that fault and `file` pointing at the *other* skill's entry file.

*Observed:* no error; the other skill's file is overwritten. *Expected after a fix:* throws, file unchanged.

**A-2 · no authentication, open CORS.** Start the HTTP server on an ephemeral port against a temporary context.

```
curl -i -H "Host: attacker.example" http://127.0.0.1:<port>/api/v1/capabilities
curl -i -X OPTIONS http://127.0.0.1:<port>/api/v1/status
```

*Observed:* `200` with the full list; `204` for the preflight; header `access-control-allow-origin: *` present on both.

**A-3 · empty retrieval channel.** On a database built by a full scan:

```sql
SELECT COUNT(*) FROM search_docs;      -- observed 315
SELECT COUNT(*) FROM search_trigram;   -- observed 0
```

**A-4 · bind mismatch on empty string.** With one capability present, call the `list` MCP tool with `{ kind: '', status: 'active' }`.

*Observed:* `column index out of range`. `{}`, `{kind: 'skill'}` and `{status: 'active'}` all succeed.

**A-5 · measured baselines.** On a database built by a full scan of the delivery corpus: `dedupe.scan` 485 ms, `reindexSearch` 370 ms, `search` 18 ms. Re-measure whatever you touch.

**A-6 · undeletable unvalidated source.** Set `ARSENAL_EXTRA_LIB` to a temporary directory containing a `.skill/` subtree, start the app, and observe that a `builtin = 1` source row appears, that removing it throws, and that no validation ran on the path before it was scanned.

**A-7 · unwritten setting.** `grep -rn "diagnoseOnScan" .`

*Observed:* one hit, in the view that writes the flag. No reader.

**A-8 · documentation drift.** Compare the claim of 8 diagnostic rules in `README.md` against the number of entries in the rule array.

*Observed:* 9 rules, 8 claimed. The same exercise applies to any number stated in prose.

---

*End of handover. The plan in §5 is a suggestion. The findings in §2 are claims. The judgement is yours.*
