---
name: upgrade-version
description: "Trigger: upgrade version, bump version, subir versión, actualizar versión. Upgrade project version, generate changelog, and commit using Makefile."
---

## Activation Contract

Use this skill when the user asks to bump, upgrade, or release a new version of a project. All projects use a standard `Makefile` with an `upgrade-version` target that handles the bump, commit, tag, and push.

## Hard Rules

1. **Verify Branch**: Check that the current branch is `main` or `master`. If it's not, **abort** and tell the user they must be on the main branch to release a new version.
2. **Manage Unsaved Work**: Ensure the working directory is clean. If there are uncommitted changes (excluding `CHANGELOG.md`), DO NOT abort immediately. Instead, ASK the user if they want you to ignore them by temporarily stashing them (`git stash -u`) before upgrading, and restoring them (`git stash pop`) after the version bump is completed.
3. **Determine Version Type**:
   - If the user explicitly specifies the bump type (e.g., "minor", "patch") in their prompt, skip the review and use the specified type.
   - If the user DOES NOT specify the type, review the unreleased commits (commits since the last tag) and determine the semantic version bump (major/minor/patch) automatically based on conventional commits:
     - `fix`, `chore`, `refactor`, `style`, `test`, `docs`, `perf` -> `patch`
     - `feat` -> `minor`
     - `BREAKING CHANGE` or `!` suffix -> `major`
   - **CRITICAL:** If you determine that the bump should be `major`, you MUST ask the user for confirmation before proceeding.
   - Find the previous version tag (e.g., `git describe --tags --abbrev=0`). If no previous tags exist, get all commits from the beginning.
   - Get all commits since that tag (e.g., `git log <tag>..HEAD --oneline` or `git log --oneline` if no tags exist).
   - Read the current version from `package.json` and determine the NEXT version based on the chosen bump type (patch, minor, or major).
   - If `CHANGELOG.md` does **not exist** in the root of the project, **create it** using a standard format in Spanish (e.g., `# Historial de Cambios\n\nTodos los cambios notables de este proyecto se documentarán en este archivo.\n\n`).
   - **Crucial:** To format the new entries in the `CHANGELOG.md`, you MUST read and follow the project's `changelog` skill (typically located at `.agents/skills/changelog/SKILL.md`). Use it as your single source of truth for the changelog structure and language.
   - Prepend the new formatted commits to the `CHANGELOG.md` file under a new version header (e.g., `## [X.Y.Z] - YYYY-MM-DD`).
   - Stage the changelog file: `git add CHANGELOG.md`. **This is critical!** The Makefile performs the commit, but it only stages `package.json` and `package-lock.json`. By staging the changelog beforehand, it gets included in the same release commit.
5. **Run Makefile**: Execute `make upgrade-version v=<type>` (e.g., `make upgrade-version v=minor`). This command is non-interactive and handles everything else: version bumping, npm install, committing, tagging, and pushing to origin. DO NOT run `make upgrade-version` without the `v=` argument to avoid interactive prompts.
6. **Restore Stashed Work**: If you used `git stash -u` in step 2, run `git stash pop` to restore the user's uncommitted changes after the Makefile command completes successfully.
