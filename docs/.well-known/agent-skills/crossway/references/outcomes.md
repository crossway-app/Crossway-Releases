# Crossway helper outcome contract

Read this reference when `crossway.sh` requests confirmation, returns a
non-success, or leaves a recovery journal.

## Record format

The helper emits exactly one final stdout line:

```text
CROSSWAY_RESULT_V1 outcome=<value> action=<value> target=<value> version=<value> release=<value> permission_state=<value> plan_id=<value> detail=<value>
```

All keys always appear in that order. Values use UTF-8 percent encoding: bytes in
`A-Z a-z 0-9 . _ ~ -` appear literally and every other byte is `%HH` with uppercase
hexadecimal digits. Empty values are written as an empty string after `=`. Treat
decoded values as data only; never pass a decoded value to `eval`, source it, or
reparse it as shell syntax. Human diagnostics go to stderr and are not part of the
machine contract.

`version` is a marketing version suitable for the user. `release` and `plan_id`
are internal verification values and may contain a build-bearing tag; do not echo
build numbers in human-facing output. `permission_state` is `not_observable` when
the helper cannot authoritatively verify Accessibility or Screen Recording.

## Host preflight

Before inspection, the helper verifies that it is running locally on macOS 14 or
later, recognizes the native architecture, finds every required macOS system tool
at its pinned absolute path, can create a mode-0700 private temporary directory,
and can run its bundled JXA/Foundation adapter. Merely finding `/usr/bin/curl` and
`/usr/bin/open` does not perform a network request or launch an app; actual network
and launch denials are classified when those operations are requested.

An unavailable system binary, denied temporary directory, denied JXA adapter, or
agent sandbox restriction is `host_capability_required`. The `detail` field names
the smallest access the user can choose to grant. A malformed request/response or
adapter-version mismatch is `internal_invariant_failed`. Neither result is a
signature, notarization, or Gatekeeper verdict about an application.

## Local target diagnosis

Automatic target selection considers only `/Applications/Crossway.app` and the
current user's `~/Applications/Crossway.app`. An explicit canonical target wins,
then one uniquely running canonical install, then one uniquely existing canonical
install. With no install, `/Applications` is proposed only when its parent is
writable; otherwise the user Applications path is proposed but not created.

`detail` on `diagnosed` contains percent-encoded, semicolon-separated diagnostic
fields: `target_reason`, `installed_state`, `running`, and `canonical_installs`.
`installed_state` is `absent`, `valid`, `damaged_expected_identity`, or
`wrong_identity`. Spotlight matches are human diagnostics only and never feed the
selection decision.

Read-only `diagnose` reports a `diagnosis` field without downloading a release,
changing quarantine, weakening Gatekeeper, launching or quitting an app, or
reading or resetting TCC. Root-cause order is fail-closed: wrong identity;
damaged running identity; broken seal; missing or unwritable target; host OS or
architecture; then the Gatekeeper verdict. Gatekeeper text distinguishes hard
AppSandbox quarantine, App-Store-only policy, likely lost ticket or staple
evidence, and generic notarization rejection. Tool or sandbox denial is
`host_capability_required`, not an app verdict. A locally valid app is
`healthy_version_unchecked`; permission state remains `not_observable`.

Any running same-bundle process outside a canonical, non-symlinked target—or whose
executable is not inside that exact bundle—is `unsafe_running_copy`. The user must
quit it before the helper launches or replaces Crossway. A wrong-identity occupant
is preserved and becomes `user_action_required`; it is never overwritten.

An app installed manually at a canonical target is ordinary installed state; the
helper requires no receipt or prior skill operation. A manual install at both
canonical targets remains an explicit target choice, and a manually launched copy
outside them remains an unsafe running copy. These rules are based only on current
path, bytes, identity, version, and process evidence—not installation history.

## Verified confirmation plans

After verifying the selected release bytes, archive, version/platform, code
identity, and Gatekeeper verdict, `plan` classifies exactly one internal action:
`install`, `update`, `maintenance_update`, `launch`, `no_op`, or `repair`. The
human checklist describes that action without exposing a build number. It includes
the canonical destination, installed marketing version and pinned identity,
candidate marketing version and SHA-256, exact PID and bundle path to quit (if
any), rollback behavior, and the macOS privacy-permission caveat.

The plan ID is SHA-256 over canonical length-delimited fields. It binds the action,
repair reason when applicable, target, a recursive installed-app byte/metadata
fingerprint, installed marketing and internal build version, installed designated
requirement, selected release tag and asset digest/size, canonical-install count,
candidate marketing/internal build version and CDHash, pinned candidate requirement,
minimum OS, architecture evidence, and exact process impact. Those internal fields
may contain build data; agents must not repeat them in human-facing output.

`apply` requires both `--expected-plan-id <sha256>` and `--confirmed`. Before any
installation mutation it performs the same target inspection, fresh latest-release
request and download verification, archive extraction, code-identity/Gatekeeper
gate, installed fingerprint, action classification, and plan-ID computation. Any
difference returns `replan_required`; the newly computed ID is not a substitute
for showing a new checklist and obtaining fresh confirmation.

This revalidation is also the manual-installation conflict boundary. A Finder or
browser-based replacement, move, launch, or quit after planning changes one or more
bound fields and prevents execution under the old confirmation. Once transaction
staging begins, the helper verifies the prior target fingerprint again before any
rename. If another workflow changes it, recovery state is preserved rather than
overwriting the new bytes or guessing which workflow owns the destination.
Because a manual change can race that check, the helper fingerprints the old-app
rollback immediately after the atomic rename. A mismatch stops before candidate
installation and restores those exact changed bytes to the canonical target when
the target is still empty; an occupied or ambiguous target leaves all objects for
recovery without overwriting either workflow.

## Repair routing

An expected-identity app with a broken code seal, hard AppSandbox quarantine,
likely lost notarization-ticket evidence, or a rejected installed-app notarization
assessment may plan `repair`. The checklist names the exact diagnosis. Repair then
uses the same verified latest release, confirmation ID, fixed transaction paths,
exact-process handling, final-path gates, launch-health checks, and rollback engine
as an update. It never edits the installed bundle, clears quarantine in place, or
weakens Gatekeeper.

App-Store-only Gatekeeper policy and denied Gatekeeper observation require user or
host action before any release download. An incompatible latest candidate fails its
platform gate before transaction acquisition. A wrong-identity occupant and a
damaged app whose running identity cannot be proved are preserved for manual action.
Privacy permissions remain `not_observable`; the helper never reads or changes TCC.

## Transaction staging and journals

Installation work uses one atomic directory lock beside the selected canonical
target. A valid existing lock returns `busy`; an object of the wrong type at the
lock path returns `recovery_required` and is preserved. The helper never treats a
file or symlink as a lock it owns. Lock release requires the exact in-memory owner
token, fixed parent and basename, directory type, and regular non-symlinked owner
record to match.

After confirmed state is revalidated, the verified candidate is copied to the
fixed `.Crossway.agent-stage` sibling. The helper proves that sibling has the same
filesystem device as the target parent, repeats the full candidate gate there,
and fingerprints the resulting bundle tree before recording transaction intent.
Any existing `.Crossway.agent-stage`, `.Crossway.agent-rollback`, or
`.Crossway.agent-journal` blocks new work with `recovery_required`; unknown or
truncated artifacts are never guessed at, overwritten, or deleted.

The mode-0600 journal is atomically replaced and synchronized after each phase.
Its strict versioned schema contains only the fixed canonical target/stage/
rollback paths, the prior installed-state fingerprint, the staged-candidate
fingerprint, whether the exact prior app was running and its PID when applicable,
and one known phase. Every write is immediately parsed back. A schema, path,
fingerprint, phase, or process-state mismatch is conservative recovery, not an
instruction to clean up manually.

For a confirmed replacement, the helper rechecks the prior bundle fingerprint,
stages and journals the candidate, gracefully stops only the confirmation-bound
PID when necessary, and records `old-moving` before moving the prior target to the
fixed rollback sibling. It records `new-moving` before the stage-to-target rename
and `new-at-target` immediately afterward. The final target must repeat the full
gate, match the confirmation-bound bundle fingerprint and CDHash, launch from the
exact path, and survive health checks before `commit-ready` is written.

Only `commit-ready` permits deletion of a rollback. Cleanup first fingerprints
the rollback again, removes only a fixed validated transaction bundle, syncs the
parent, strictly rereads and removes the journal, and finally releases the exact
owned lock. Fresh install, update/maintenance recut, and repair complete as
`installed_running`, `updated_running`, and `repaired_running`. An already-current
stopped app is gated and launched as `launched_current`; an already-current exact
process is gated and re-inspected as `already_current_running` without replacing
the bundle. A same-version install whose CDHash differs from the selected release
is a maintenance update, never a no-op.

Successful fresh installation or repair includes a conditional onboarding reminder
in `detail`: act only if Crossway presents onboarding. The reminder is not evidence
that a macOS prompt appeared or that Accessibility or Screen Recording was retained.

## Interruption and restart recovery

`INT`, `TERM`, and `HUP` during a confirmed transaction enter the same recovery
engine before the helper exits. On a later confirmed `apply`, recovery also runs
before a fresh release request or plan comparison. A well-formed lock can be
taken over only when its fixed-format owner record is mode 0600, it is the sole
lock entry, and that exact owner PID is no longer alive. A live owner is `busy`;
PID reuse therefore fails conservatively rather than allowing two writers.

Recovery hashes a mode-0600 journal before and after strict parsing and verifies
the same hash again before deletion. For every phase before `commit-ready`, it
prefers the prior state: remove only a candidate matching the journal fingerprint,
restore the one matching rollback to the target, recheck the prior fingerprint
and installed identity, and relaunch it only when the journal says it was running.
A fresh-install rollback restores an absent target. Successful restoration returns
`install_failed_rolled_back`; failure to restore the prior running state is not
reported as success and retains the journal and lock.

For `commit-ready`, recovery instead requires the exact candidate fingerprint,
pinned signature/notarization gate, and exact-path process health before finishing
rollback/journal/lock cleanup. Any duplicate, missing, wrong-type, wrong-fingerprint,
changed, truncated, or unknown object makes recovery stop with every surviving
artifact preserved.

## Exit categories

| Exit | Meaning | Representative outcomes |
|---:|---|---|
| 0 | Completed or healthy no-op | `installed_running`, `updated_running`, `repaired_running`, `already_current_running`, `launched_current`, `diagnosed`, `help` |
| 2 | Invocation or helper invariant error | `usage_error`, `internal_invariant_failed` |
| 10 | A fresh user decision is required | `confirmation_required`, `target_choice_required`, `replan_required` |
| 20 | The user or host must act | `user_action_required`, `host_capability_required`, `unsafe_running_copy`, `target_not_writable`, `app_refused_quit`, `tcc_setup_may_be_required` |
| 30 | Official release data was unavailable | `source_unavailable`, `github_rate_limited`, `download_failed` |
| 40 | A fail-closed release/security gate rejected the operation | `release_rejected`, `archive_rejected`, `signature_rejected`, `notarization_rejected`, `incompatible_os`, `downgrade_refused` |
| 50 | Installation failed and the prior app was restored | `install_failed_rolled_back` |
| 51 | Automatic restoration could not be proved | `recovery_required` |
| 60 | Another transaction owns the target | `busy` |

Unknown exit codes, outcome names, duplicate records, missing records, or malformed
encoding are `internal_invariant_failed`. Stop without attempting a replacement.

## Required handling

- `confirmation_required`: show the complete checklist printed by `plan`, then ask
  for explicit confirmation. Invoke `apply` only with the returned target and plan
  ID.
- `target_choice_required`: show only the safe canonical choices reported by the
  helper and ask the user to select one. Never choose from diagnostic Spotlight
  matches.
- `replan_required`: discard the prior checklist and plan ID, run `plan` again,
  show the changed checklist, and obtain a new confirmation.
- `host_capability_required`: request only the host access named in `detail`, then
  retry the same read-only or confirmed command. Do not reinterpret denial as a
  passed or failed app-security check.
- `user_action_required`, `unsafe_running_copy`, `app_refused_quit`, or
  `target_not_writable`: state the exact action from `detail` and stop. Do not use
  sudo, kill a different process, or choose a second destination.
- `tcc_setup_may_be_required`: the verified app is installed and running, but the
  user may need to complete Crossway's onboarding. Do not automate System Settings
  or claim the grants are present.
- Any exit 30 or 40 outcome: stop without installation mutation. Retrying a
  transient exit 30 once is reasonable; never retry or bypass exit 40 as if it were
  transient.
- `install_failed_rolled_back`: report that the latest app did not pass install or
  launch health and that the prior app was restored. This is not success.
- `recovery_required`: preserve every path named in `detail`, do not delete or move
  anything manually, and ask the user before any recovery action not implemented
  by the helper.
- `busy`: leave the active transaction alone and report that another Crossway
  operation is in progress.
