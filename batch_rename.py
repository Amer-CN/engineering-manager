#!/usr/bin/env python3
"""
Batch File Renamer

Usage:
    python batch_rename.py /path/to/dir --pattern "{name}_{counter:03d}{ext}" --start 1
    python batch_rename.py /path/to/dir --add-prefix "photo_"
    python batch_rename.py /path/to/dir --remove-prefix "IMG_"
    python batch_rename.py /path/to/dir --add-suffix "_copy"
    python batch_rename.py /path/to/dir --ext .jpg  (filter by extension)
    python batch_rename.py /path/to/dir --dry-run   (preview without renaming)
"""

import argparse
import os
import sys
from pathlib import Path


def get_files(directory, ext_filter=None):
    """Get sorted list of files in directory, optionally filtered by extension."""
    files = []
    for p in sorted(Path(directory).iterdir()):
        if not p.is_file():
            continue
        if ext_filter and p.suffix.lower() != ext_filter.lower():
            continue
        files.append(p)
    return files


def rename_with_pattern(files, pattern, start=1, directory=None):
    """Rename files using a format pattern with counter."""
    pairs = []
    for i, f in enumerate(files, start=start):
        new_name = pattern.format(
            name=f.stem,
            ext=f.suffix,
            counter=i,
            dir=directory or "",
        )
        pairs.append((f, f.parent / new_name))
    return pairs


def rename_add_prefix(files, prefix, ext_filter=None):
    """Add prefix to filenames."""
    pairs = []
    for f in files:
        new_name = f"{prefix}{f.name}"
        pairs.append((f, f.parent / new_name))
    return pairs


def rename_remove_prefix(files, prefix):
    """Remove prefix from filenames."""
    pairs = []
    for f in files:
        if f.name.startswith(prefix):
            new_name = f.name[len(prefix):]
            pairs.append((f, f.parent / new_name))
    return pairs


def rename_add_suffix(files, suffix, ext_filter=None):
    """Add suffix to filenames (before extension)."""
    pairs = []
    for f in files:
        new_name = f"{f.stem}{suffix}{f.suffix}"
        pairs.append((f, f.parent / new_name))
    return pairs


def rename_to_lowercase(files):
    """Lowercase all filenames."""
    pairs = []
    for f in files:
        new_name = f.name.lower()
        if new_name != f.name:
            pairs.append((f, f.parent / new_name))
    return pairs


def rename_replace(files, old, new):
    """Replace substring in filenames."""
    pairs = []
    for f in files:
        new_name = f.name.replace(old, new)
        if new_name != f.name:
            pairs.append((f, f.parent / new_name))
    return pairs


def preview_pairs(pairs):
    """Print rename pairs for review."""
    if not pairs:
        print("No files to rename.")
        return
    print(f"{'Current':<50} → {'New':<50}")
    print("-" * 102)
    for old, new in pairs:
        print(f"{old.name:<50} → {new.name:<50}")
    print(f"\n{len(pairs)} file(s) would be renamed.")


def execute_rename(pairs):
    """Actually rename the files."""
    if not pairs:
        print("No files to rename.")
        return 0

    renamed = 0
    errors = 0
    for old, new in pairs:
        try:
            if new.exists():
                print(f"  SKIP (target exists): {old.name} → {new.name}")
                errors += 1
                continue
            old.rename(new)
            renamed += 1
        except OSError as e:
            print(f"  ERROR: {old.name} → {e}")
            errors += 1

    print(f"\nRenamed: {renamed}, Errors: {errors}")
    return renamed


def main():
    parser = argparse.ArgumentParser(description="Batch file renamer")
    parser.add_argument("directory", help="Directory containing files to rename")
    parser.add_argument("--ext", help="Filter by extension (e.g. .jpg)")
    parser.add_argument("--dry-run", action="store_true", help="Preview only")

    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--pattern", help="Rename pattern: {name}, {ext}, {counter}, {dir}")
    group.add_argument("--add-prefix", help="Add prefix to filenames")
    group.add_argument("--remove-prefix", help="Remove prefix from filenames")
    group.add_argument("--add-suffix", help="Add suffix before extension")
    group.add_argument("--lowercase", action="store_true", help="Lowercase all filenames")
    group.add_argument("--replace", nargs=2, metavar=("OLD", "NEW"), help="Replace substring")

    parser.add_argument("--start", type=int, default=1, help="Start counter for --pattern (default: 1)")

    args = parser.parse_args()

    directory = Path(args.directory)
    if not directory.is_dir():
        print(f"Error: '{directory}' is not a directory")
        sys.exit(1)

    files = get_files(directory, args.ext)
    if not files:
        print("No files found matching criteria.")
        sys.exit(0)

    print(f"Found {len(files)} file(s) in {directory}")

    # Build rename pairs
    if args.pattern:
        pairs = rename_with_pattern(files, args.pattern, args.start)
    elif args.add_prefix:
        pairs = rename_add_prefix(files, args.add_prefix)
    elif args.remove_prefix:
        pairs = rename_remove_prefix(files, args.remove_prefix)
    elif args.add_suffix:
        pairs = rename_add_suffix(files, args.add_suffix)
    elif args.lowercase:
        pairs = rename_to_lowercase(files)
    elif args.replace:
        pairs = rename_replace(files, args.replace[0], args.replace[1])
    else:
        print("No rename operation specified.")
        sys.exit(1)

    preview_pairs(pairs)

    if args.dry_run:
        print("\n(dry run — no changes made)")
    else:
        confirm = input("\nProceed? [y/N] ").strip().lower()
        if confirm == "y":
            execute_rename(pairs)
        else:
            print("Aborted.")


if __name__ == "__main__":
    main()
