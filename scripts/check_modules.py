#!/usr/bin/env python3
"""Convention checks for API feature modules (AGENTS.md modularity rules).

Static checks, no server needed:

  1. every feature folder under `apps/api/src/` owns exactly one `*.module.ts`
     file that defines a `@Module()` class,
  2. that module is imported by the root `apps/api/src/app.module.ts`,
  3. the `FEATURE_FLAGS` registry has unique `key`s (rule 9).

Infrastructure folders (`config`) are exempt from rule 1: they are not feature
modules. See `docs/ARCHITECTURE.md` for the full convention.

Usage:
  python3 scripts/check_modules.py   # exit 0 when consistent, 1 otherwise
"""
from __future__ import annotations

import os
import re
import sys

SRC = os.path.join("apps", "api", "src")
APP_MODULE = os.path.join(SRC, "app.module.ts")
SETTINGS = os.path.join(SRC, "settings", "settings.service.ts")

# Folders that are infrastructure, not a feature module (see ARCHITECTURE.md).
EXEMPT_DIRS = {"config"}

MODULE_DECORATOR = re.compile(r"@Module\s*\(")
MODULE_CLASS = re.compile(r"export\s+class\s+(\w+Module)\b")
FLAG_KEY = re.compile(r"^\s*key:\s*([^,\n]+?),?\s*$", re.MULTILINE)


def feature_dirs() -> list[str]:
    return sorted(
        name for name in os.listdir(SRC) if os.path.isdir(os.path.join(SRC, name))
    )


def check_modules(problems: list[str]) -> int:
    with open(APP_MODULE, encoding="utf-8") as handle:
        app_module = handle.read()

    checked = 0
    for name in feature_dirs():
        if name in EXEMPT_DIRS:
            continue
        checked += 1
        folder = os.path.join(SRC, name)
        module_files = sorted(f for f in os.listdir(folder) if f.endswith(".module.ts"))
        if len(module_files) != 1:
            problems.append(
                f"apps/api/src/{name}: باید دقیقاً یک فایل *.module.ts داشته باشد "
                f"(یافت‌شده: {len(module_files)})"
            )
            continue
        module_path = os.path.join(folder, module_files[0])
        with open(module_path, encoding="utf-8") as handle:
            text = handle.read()
        if not MODULE_DECORATOR.search(text):
            problems.append(f"{module_path}: دکوراتور @Module() ندارد")
        if not MODULE_CLASS.search(text):
            problems.append(f"{module_path}: کلاس export‌شده‌ی *Module ندارد")
        if f"'./{name}/" not in app_module:
            problems.append(f"apps/api/src/{name}: ماژول در app.module.ts ثبت نشده است")
    return checked


def check_feature_flags(problems: list[str]) -> int:
    with open(SETTINGS, encoding="utf-8") as handle:
        text = handle.read()
    start = text.find("export const FEATURE_FLAGS")
    if start == -1:
        problems.append(f"{SETTINGS}: آرایه‌ی FEATURE_FLAGS پیدا نشد")
        return 0
    end = text.find("\n];", start)
    block = text[start : end if end != -1 else len(text)]
    keys = [match.strip() for match in FLAG_KEY.findall(block)]
    seen: set[str] = set()
    for key in keys:
        if key in seen:
            problems.append(f"{SETTINGS}: کلید تکراری در FEATURE_FLAGS: {key}")
        seen.add(key)
    return len(keys)


def main() -> int:
    problems: list[str] = []
    dirs = check_modules(problems)
    flags = check_feature_flags(problems)

    if problems:
        print("مشکلات ساختار ماژولار:")
        for item in problems:
            print(f"  - {item}")
        return 1

    print(f"پوشه‌های ویژگی بررسی‌شده: {dirs}")
    print(f"کلیدهای FEATURE_FLAGS بررسی‌شده: {flags}")
    print("ساختار ماژولار و رجیستری ویژگی‌ها درست است.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
