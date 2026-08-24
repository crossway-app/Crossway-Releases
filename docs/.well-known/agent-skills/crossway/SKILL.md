---
name: crossway
description: Install, update, diagnose, repair, or launch the latest official Crossway macOS app. Use when a user wants a local agent to manage Crossway end to end on their Mac.
compatibility: Requires a local Mac running macOS 14 or later, outbound HTTPS access to GitHub Releases, and permission to inspect applications, run macOS security checks, write the selected Applications directory, and launch apps. Remote or container-only agents cannot use this skill to change the user's Mac.
---

# Crossway

Use the bundled helper for every Crossway operation. It owns target selection,
release verification, process control, installation, health checks, and rollback.
Do not reconstruct its commands or replace them with improvised shell steps.

## Choose the mode

- For status, troubleshooting, or “why will Crossway not open?”, run `diagnose`.
- For install, update, repair, or “make sure the latest Crossway is running”, run
  `plan`, obtain confirmation, then run `apply` with the returned plan ID.
- If the helper reports a target choice or user action, explain it and stop. Do
  not choose, weaken a security gate, or change macOS policy on the user's behalf.

Resolve the directory containing this file as `<skill-root>`, then invoke only:

```text
/bin/bash <skill-root>/scripts/crossway.sh diagnose [--target <canonical-path>]
/bin/bash <skill-root>/scripts/crossway.sh plan [--target <canonical-path>]
/bin/bash <skill-root>/scripts/crossway.sh apply --expected-plan-id <sha256> --confirmed [--target <canonical-path>]
```

Do not source the helper. Preserve each argument as one argument; never assemble a
shell command string from user or helper output.

## Confirmation boundary

`diagnose` is read-only. `plan` may use a private temporary directory to download
and verify a candidate, but it must not write an Applications directory, quit an
app, or launch an app. A successful plan returns `confirmation_required`, prints
one complete `Crossway verified plan` block, and supplies its lowercase SHA-256
plan ID only after every release and candidate gate passes.

Before `apply`, show the helper's complete checklist to the user, including:

- requested action and exact destination;
- the diagnosed reason when the action is a repair;
- installed marketing version and signing identity, or that no app is installed;
- candidate marketing version, release source, and SHA-256;
- the exact running process that will quit, if any;
- rollback behavior; and
- that Accessibility and Screen Recording remain controlled by macOS.

Ask for an explicit confirmation after showing that checklist. Pass exactly the
returned plan ID to `apply`, together with `--confirmed`; neither input is
optional. The helper immediately re-resolves the target and running process,
refetches and revalidates the latest release, rehashes the installed app, repeats
the complete candidate gate, and recomputes the plan ID before any installation
mutation. A changed target, installed bytes/version/identity, process impact, or
latest release returns `replan_required` and requires a new checklist and
confirmation. Never treat the user's initial request as this final mutation
confirmation.

## Manual installation coexistence

Manual installation and this skill are equally supported workflows. The helper
does not enroll Crossway, write an installation receipt, add a daemon, or retain
ownership state after a completed operation. Each invocation must inspect the
canonical app and exact running process as they exist at that moment, regardless
of whether the current app arrived through Finder, a browser download, or an
earlier skill operation.

If the user manually replaces, moves, launches, or quits Crossway after `plan`,
`apply` must re-observe the change and return `replan_required`; show a new plan
and obtain a new confirmation. Tell the user not to perform a manual replacement
while a confirmed `apply` is active. If transaction artifacts exist or the app
changes after staging, preserve the manual app and transaction evidence and
follow the helper's recovery outcome—never assume the manual or skill copy wins.
If the change is detected only after the old-app rename, restore the exact changed
bytes to the canonical target when it remains empty; otherwise preserve both
objects without installing the candidate. After a completed operation, the user
may return to normal manual replacement at any time.

## Interpret results

The helper writes human diagnostics to stderr and exactly one
`CROSSWAY_RESULT_V1` record to stdout. Read
[references/outcomes.md](references/outcomes.md) when interpreting a non-success,
requesting confirmation, or reporting recovery instructions.

On success, report the marketing version and exact installed path. Do not expose
internal build numbers in human-facing output. “Running” means the verified build
is alive from that exact path; it does not prove hotkeys or thumbnails work before
the user grants macOS privacy permissions. After a fresh install or repair, tell
the user to complete Crossway's in-app onboarding only if Crossway presents it.
Do not infer that a prompt appeared and do not claim a permission was preserved or
granted.

## Non-negotiable boundaries

- Never run `curl | unzip`, select the first Spotlight result, or use a mutable
  “latest download” URL outside the helper.
- Never bypass checksum, archive, code-signing, Developer ID, Gatekeeper, version,
  architecture, or OS checks.
- Never use `sudo`, silently create a second install, downgrade a newer app, launch
  by bundle ID, or terminate by app name.
- Never clear quarantine from an unverified app, change global Gatekeeper policy,
  run `tccutil reset`, edit TCC, automate System Settings, or modify Crossway's
  preferences.
- Never delete a rollback or recovery journal unless the helper proves that its
  exact transaction state makes the deletion safe.
- If the helper is missing, malformed, denied required host access, or returns an
  unknown result version, stop. Do not improvise the operation.
