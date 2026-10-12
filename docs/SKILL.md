---
name: crossway
description: Install, update, diagnose, repair, or launch the latest official Crossway macOS app. Use when a user wants a local agent to manage Crossway end to end on their Mac.
---

# Crossway skill bootstrap

This bootstrap is not the Crossway management skill and cannot update an app by itself. It identifies the immutable archive containing the canonical `SKILL.md`, helper scripts, and reference contract.

With the user's approval to install the skill:

1. Download `https://crosswayapp.com/.well-known/agent-skills/artifacts/crossway-fc2a4a3d30da9df095d92c14dba126e1268751393b0160777ac33760d3bdbffc.zip`.
2. Compute SHA-256 over the raw archive bytes and require exactly `fc2a4a3d30da9df095d92c14dba126e1268751393b0160777ac33760d3bdbffc`.
3. Before extraction, reject absolute paths, `..`, links, special files, duplicate or case-colliding names, and unexpectedly large content.
4. Require `SKILL.md` at the archive root and install the extracted directory as the local `crossway` skill using the current client's documented skill-installation workflow.
5. Load the installed canonical `SKILL.md`; do not improvise app-management commands from this bootstrap.

Compatible discovery clients can instead begin at `https://crosswayapp.com/.well-known/agent-skills/index.json` and must verify the same archive digest before use.
