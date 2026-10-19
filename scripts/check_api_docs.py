#!/usr/bin/env python3
"""Verify every NestJS route is documented for Swagger (AGENTS.md rule 8).

Static scan of `apps/api/src` (no server needed): for each controller it checks
that the class is tagged with `@ApiTags(...)` and that every route handler
(`@Get/@Post/@Patch/@Put/@Delete`) is annotated with `@ApiOperation(...)`.

Usage:
  python3 scripts/check_api_docs.py

Exit code 0 when everything is documented, 1 otherwise (suitable for CI).
"""
from __future__ import annotations

import os
import re
import sys

ROOT = os.path.join("apps", "api", "src")
ROUTE = re.compile(r"@(Get|Post|Patch|Put|Delete)\s*\(")
TAGS = re.compile(r"@ApiTags\s*\(")
OP = re.compile(r"@ApiOperation\s*\(")


def controller_files() -> list[str]:
    found: list[str] = []
    for base, _dirs, names in os.walk(ROOT):
        for name in names:
            if not name.endswith(".controller.ts"):
                continue
            path = os.path.join(base, name)
            with open(path, encoding="utf-8") as handle:
                if "@Controller(" in handle.read():
                    found.append(path)
    return sorted(found)


def main() -> int:
    problems: list[str] = []
    routes = 0
    controllers = 0
    for path in controller_files():
        controllers += 1
        with open(path, encoding="utf-8") as handle:
            text = handle.read()
        if not TAGS.search(text):
            problems.append(f"{path}: کنترلر @ApiTags ندارد")

        # Split into handler chunks at each route decorator.
        positions = [m.start() for m in ROUTE.finditer(text)]
        # Skip the class decorator itself (…@Controller) — ROUTE only matches the
        # HTTP verbs, so every match is a real handler.
        for index, start in enumerate(positions):
            end = positions[index + 1] if index + 1 < len(positions) else len(text)
            chunk = text[start:end]
            routes += 1
            if not OP.search(chunk):
                line = text[:start].count("\n") + 1
                problems.append(f"{path}:{line}: مسیر بدون @ApiOperation")

    print(f"کنترلرها: {controllers} | مسیرها: {routes}")
    if problems:
        print("مستندسازی ناقص:")
        for item in problems:
            print(f"  - {item}")
        return 1
    print("همه‌ی مسیرها @ApiOperation و همه‌ی کنترلرها @ApiTags دارند.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
