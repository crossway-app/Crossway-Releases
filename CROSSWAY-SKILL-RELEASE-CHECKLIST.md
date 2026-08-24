# Crossway skill release acceptance

Use this checklist only on disposable macOS users or virtual machines. It is a
human-run release gate for signed public artifacts, not an instruction for the
helper to inspect or change privacy databases, preferences, login items, or global
security policy. Never run it against a daily-driver installation.

## Acceptance record

- Date:
- Operator:
- Crossway skill package SHA-256:
- Source release tag and asset SHA-256:
- macOS version and build:
- Architecture:
- Disposable user or VM identifier:
- Canonical target: `/Applications/Crossway.app` or
  `~/Applications/Crossway.app`

Attach the helper's complete plan checklist and final `CROSSWAY_RESULT_V1` record
for every skill operation. Keep internal build-bearing values in the private test
record; do not copy them into user-facing release notes.

## Published package and client recognition

Record the exact public package before any app-management scenario:

| Evidence | Result |
|---|---|
| Discovery index URL and schema version | |
| Immutable archive URL | |
| Advertised SHA-256 | |
| Downloaded archive SHA-256 | |
| Archive-root `SKILL.md`, `scripts/`, and `references/` present | |
| Root bootstrap names the same archive and SHA-256 | |
| `verify-crossway-skill-site.sh` live output attached | |

The discovery protocol is draft. Do not count automatic `.well-known` discovery
as installation proof. Start from a clean disposable client profile and explicitly
install the digest-verified archive using each client's documented personal-skill
workflow.

Run `scripts/verify-crossway-skill-site.sh` only after explicit approval and the
normal docs publication workflow. Ensure `CROSSWAY_SKILL_SITE_TESTING` and
`CROSSWAY_SKILL_SITE_CURL` are unset; fixture-mode output is never live evidence.

### Claude Code

- [ ] Record the client version and link the current official skill documentation.
- [ ] Begin from `https://crosswayapp.com/SKILL.md`, not a copied prompt or mutable
      archive URL.
- [ ] Verify the immutable archive's raw SHA-256 before safe extraction.
- [ ] Install the archive root at `~/.claude/skills/crossway` and prove the client
      recognizes `/crossway`.
- [ ] Invoke `/crossway diagnose` and record one valid read-only result before any
      `plan` or confirmed `apply`.

### Second compatible local client

- [ ] Record the client name, version, official skill-workflow link, and personal
      skill location. For GitHub Copilot CLI or app, the documented cross-client
      location is `~/.agents/skills/crossway`.
- [ ] Independently download and verify the same immutable archive SHA-256.
- [ ] Prove the client recognizes `crossway` with all bundled scripts and references
      available; fetching only the root bootstrap is a failure.
- [ ] Invoke read-only diagnosis and record one valid result before any mutation.

Official documentation reviewed for this release:

- Claude Code skills: <https://code.claude.com/docs/en/slash-commands>
- GitHub Copilot agent skills: <https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills>
- Agent Skills format: <https://agentskills.io/specification>
- Draft discovery protocol: <https://github.com/cloudflare/agent-skills-discovery-rfc>

## Safety gates

- [ ] The environment is disposable and contains no only-copy user data.
- [ ] Only one canonical target is selected; checkout, DerivedData, build, temporary,
      translocated, and disk-image copies are not running.
- [ ] No command uses `sudo`, edits or resets TCC, changes global Gatekeeper policy,
      clears quarantine in place, writes Crossway preferences, or automates System
      Settings.
- [ ] `plan` completes before confirmation and leaves the target, its process state,
      preferences, permissions, and Launch at Login state unchanged.
- [ ] The human operator reviews the exact target, action, repair reason when
      applicable, candidate version and digest, process impact, rollback statement,
      and plan ID before explicitly confirming `apply`.

## Manual-installation coexistence

Run these crossover cases on separate disposable snapshots. Manual replacement
means the ordinary browser/Finder workflow using an official signed release.

- [ ] Manually install an older official release at one canonical target, then run
      skill `diagnose`, `plan`, and confirmed `apply`; it must update that target
      without requiring prior enrollment or creating a second installation.
- [ ] Manually install the exact current official release, then run the skill; a
      running copy must be a healthy no-op and a stopped copy an exact-path launch,
      with no bundle replacement.
- [ ] Complete a skill install/update, then manually replace it with another
      official release. The next skill invocation must treat the manual bytes as
      current state, not as tampering with managed state.
- [ ] Manually replace, move, launch, or quit Crossway after `plan` but before
      `apply`; the old plan must return `replan_required` before mutation.
- [ ] Change the target on a fixture after transaction staging but before the old
      app rename; the helper must preserve the changed target, stage, journal, and
      lock under `recovery_required`, with no guessed winner.
- [ ] Inject a target change after the last pre-rename fingerprint check. The
      helper must detect it on the moved rollback, restore the exact changed bytes
      to an empty canonical target, preserve stage/journal/lock evidence, and
      launch no candidate.
- [ ] A completed skill operation leaves no enrollment, receipt, daemon, manager
      preference, transaction sibling, or other durable ownership marker.
- [ ] Two manual canonical installs still require an explicit target choice, and a
      manually launched noncanonical copy still blocks mutation.

Never run the manual replacement step concurrently with a confirmed live apply on
a real installation. The after-staging race is a fixture-only safety test.

## Older signed release to latest

Install an older official signed release at the selected canonical path. Before
updating, configure at least three non-default Crossway settings, grant
Accessibility and Screen Recording through System Settings, enable Launch at Login,
and prove the installed app works.

Record before `plan`:

| Evidence | Before |
|---|---|
| Marketing version | |
| Internal build | |
| Exact bundle path | |
| Exact running PID | |
| Code identifier and Team ID | |
| Designated requirement | |
| Three or more non-default setting names and values | |
| Accessibility behavioral proof | |
| Screen Recording behavioral proof | |
| Launch at Login enabled | |

Run `plan`, review and explicitly confirm its checklist, then run `apply` with the
returned plan ID. Record after `updated_running`:

| Evidence | After |
|---|---|
| API-selected marketing version | |
| Exact bundle path, unchanged | |
| Exact healthy running PID | |
| Code identifier and Team ID | |
| Designated requirement | |
| The same non-default setting names and values | |
| Accessibility hotkey behavior still works | |
| Screen Recording previews still render | |
| Launch at Login remains enabled and works after a login cycle | |
| Any macOS prompt, with exact wording and operator action | |

Pass only if the latest verified release runs from the same canonical path, the
recorded settings remain intact, both permission-dependent behaviors work, and
Launch at Login still works. A macOS prompt is a user-controlled outcome: record it
and let the operator respond. Do not treat a prompt as permission for the helper to
interact with System Settings.

## Repair and rollback

On separate disposable snapshots, exercise each supported diagnosis: broken code
seal, hard quarantine received through a sandboxed transfer, likely lost
notarization-ticket evidence, and installed-app notarization rejection. For each:

- [ ] `diagnose` names the expected root cause without mutation.
- [ ] `plan` proposes `repair`, names the same cause, and reports the exact target.
- [ ] `apply` ends at `repaired_running` only after the staged and final candidate
      gates pass and the exact-path process survives health checks.
- [ ] Preferences and permission-dependent behaviors are recorded before and after.
- [ ] Any onboarding or macOS permission prompt is recorded as user-controlled; the
      helper does not claim it preserved or granted permission.

Inject one post-swap verification or launch-health failure in a disposable fixture.
Pass only if the operation returns `install_failed_rolled_back`, restores the exact
prior app bytes at the exact target, restores the prior running state when recorded,
and preserves the user's settings. If restoration cannot be proved, require
`recovery_required` and retain every named artifact.

## Fresh install

Use a new disposable macOS user with neither canonical target present. Do not reset
TCC to manufacture this state.

- [ ] `plan` proposes the intended canonical target and performs no installation.
- [ ] Confirmed `apply` returns `installed_running` at the API-selected version and
      exact path.
- [ ] If Crossway presents onboarding, the human operator completes it in the app.
- [ ] Accessibility and Screen Recording are granted only through the macOS UI.
- [ ] If Crossway presents no onboarding, the result is recorded without claiming
      permission state.
- [ ] Launch at Login behavior is tested only after the user enables it.

## Interpretation

Settings, permission, and Launch at Login continuity are empirical observations for
the exact signed releases and macOS builds recorded above. They are not guarantees
made by the installer. The helper preserves the bundle path and official signing
identity and does not touch preferences or TCC, but macOS remains authoritative and
may prompt again after an update or repair.

Release acceptance fails if any successful result lacks the API-selected version,
exact canonical path, pinned identity, or one healthy exact-path process; if a
refusal mutates the app or host policy; if rollback loses the prior bytes; or if the
record claims unobserved permission continuity as fact.
