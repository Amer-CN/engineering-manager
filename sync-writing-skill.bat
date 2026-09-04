@echo off
setlocal
rem ============================================================
rem sync-writing-skill.bat
rem Build-time sync: fetch the 4 latest skill md files from the
rem remote super-official-writer repo (GitHub master) and
rem overwrite the embedded resources used by the Writing Center.
rem Run before release so the shipped build embeds the latest skill.
rem Any download failure exits with code 1 (already-downloaded
rem files are kept, nothing is rolled back).
rem ============================================================

set "BASE=https://raw.githubusercontent.com/Amer-CN/super-official-writer/master"
set "DEST=%~dp0EngineeringManager.Api\Resources\WritingSkill"

curl -fsSL --retry 3 -o "%DEST%\SKILL.md" "%BASE%/SKILL.md" || (echo [sync-writing-skill] FAILED: SKILL.md & exit /b 1)
curl -fsSL --retry 3 -o "%DEST%\templates.md" "%BASE%/references/templates.md" || (echo [sync-writing-skill] FAILED: templates.md & exit /b 1)
curl -fsSL --retry 3 -o "%DEST%\phrase-library.md" "%BASE%/references/phrase-library.md" || (echo [sync-writing-skill] FAILED: phrase-library.md & exit /b 1)
curl -fsSL --retry 3 -o "%DEST%\format-spec.md" "%BASE%/references/format-spec.md" || (echo [sync-writing-skill] FAILED: format-spec.md & exit /b 1)

echo [sync-writing-skill] All 4 files synced. Version anchors:
findstr "skill-version" "%DEST%\SKILL.md"
