#!/usr/bin/env python3
"""Sync real project files into their `write_file` blocks inside install.sh.

`install.sh` is the canonical project generator: every file under `apps/` (plus
a handful of root files) is embedded as a `write_file <path> <<'MARKER'` block
and re-emitted when someone runs the installer.

This helper keeps those blocks in sync with the working tree after edits, so the
generator never drifts from the real project:

  * patches existing blocks from the real file contents,
  * adds a block for any listed file that has none yet,
  * removes blocks whose target file was deleted,
  * leaves the rest of install.sh untouched.

Usage:
  python3 scripts/sync_install.py          # sync and report
  python3 scripts/sync_install.py --check  # verify only (CI/pre-commit), no write
"""
from __future__ import annotations

import os
import re
import sys

INSTALL = "install.sh"
SKIP_DIRS = ("/node_modules/", "/.next/", "/dist/")
BINARY_EXT = (".woff2", ".woff", ".ttf", ".otf", ".eot", ".png", ".jpg", ".jpeg",
              ".ico", ".pdf", ".gz", ".zip")
# Build/editor artifacts that must never be baked into the installer.
SKIP_SUFFIXES = (".tsbuildinfo",)
# Lockfiles are local `npm install` artifacts; they are gitignored and must not
# be embedded in the installer.
SKIP_NAMES = ("package-lock.json", "npm-shrinkwrap.json", "yarn.lock", "pnpm-lock.yaml")


def marker_for(path: str) -> str:
    return "EOF_" + re.sub(r"[^A-Za-z0-9]", "_", path).upper()


def unescape(path: str) -> str:
    return path.replace("\\(", "(").replace("\\)", ")").replace("\\[", "[").replace("\\]", "]")


def escape(path: str) -> str:
    return path.replace("(", "\\(").replace(")", "\\)").replace("[", "\\[").replace("]", "\\]")


def tracked_files() -> list[str]:
    files: list[str] = []
    for base in ("apps", "scripts", "docs"):
        for root, dirs, names in os.walk(base):
            dirs[:] = [d for d in dirs if d != "node_modules" and d != ".next"]
            for name in names:
                path = os.path.join(root, name)
                if any(part in path for part in SKIP_DIRS):
                    continue
                if name.lower().endswith(BINARY_EXT):
                    continue
                if name.endswith(SKIP_SUFFIXES):
                    continue
                if name in SKIP_NAMES:
                    continue
                files.append(path)
    # Root-level files that the generator also emits.
    for extra in (".gitignore", ".env.example", ".dockerignore", ".editorconfig",
                  "package.json", "tsconfig.base.json", "README.md",
                  "docker-compose.yml", "docker-compose.dev.yml"):
        if os.path.isfile(extra):
            files.append(extra)
    return sorted(set(files))


def main() -> int:
    with open(INSTALL, encoding="utf-8") as handle:
        lines = handle.read().split("\n")

    tracked = tracked_files()
    rendered: dict[str, list[str]] = {}
    for path in tracked:
        with open(path, encoding="utf-8") as handle:
            rendered[path] = handle.read().rstrip("\n").split("\n")

    out: list[str] = []
    seen: set[str] = set()
    missing_from_tree: list[str] = []
    changed: list[str] = []
    added: list[str] = []
    inserted_after = len(out)
    i = 0
    while i < len(lines):
        match = re.match(r"^write_file (\S+) <<'?(\w+)'?\s*$", lines[i])
        if not match:
            out.append(lines[i])
            i += 1
            continue

        marker = match.group(2)
        path = unescape(match.group(1))
        j = i + 1
        while j < len(lines) and lines[j].strip() != marker:
            j += 1
        body_end = j  # index of the closing marker line

        if path not in rendered:
            missing_from_tree.append(path)
            i = body_end + 1
            continue

        body = rendered[path]
        if lines[i + 1:body_end] != body:
            changed.append(path)
        out.append(lines[i])
        for line in body:
            out.append(line)
        out.append(marker)
        seen.add(path)
        inserted_after = len(out)
        i = body_end + 1

    unwritten = [p for p in tracked if p not in seen]
    if unwritten:
        block: list[str] = ["", "# ---- Files synced after later changes ----", ""]
        for path in unwritten:
            added.append(path)
            block.append(f"write_file {escape(path)} <<'{marker_for(path)}'")
            block.extend(rendered[path])
            block.append(marker_for(path))
            block.append("")
        out = out[:inserted_after] + block + out[inserted_after:]

    check_only = "--check" in sys.argv
    if not check_only:
        with open(INSTALL, "w", encoding="utf-8") as handle:
            handle.write("\n".join(out) + "\n")

    print(f"patched: {len(changed)}")
    for path in changed:
        print(f"  ~ {path}")
    print(f"added: {len(added)}")
    for path in added:
        print(f"  + {path}")
    if missing_from_tree:
        print(f"removed (file gone from tree): {len(missing_from_tree)}")
        for path in missing_from_tree:
            print(f"  - {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
