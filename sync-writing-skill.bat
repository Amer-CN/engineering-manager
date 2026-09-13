@echo off
setlocal
rem ============================================================
rem sync-writing-skill.bat
rem Build-time sync: fetch the latest skill md files from the
rem remote super-official-writer repo (GitHub master) and
rem overwrite the embedded resources used by the Writing Center.
rem Run before release so the shipped build embeds the latest skill.
rem Any download failure exits with code 1 (already-downloaded
rem files are kept, nothing is rolled back).
rem Layout: 6 fixed files -> Resources\WritingSkill\ ,
rem         corpus layer files -> Resources\WritingSkill\corpus\
rem ============================================================

set "BASE=https://raw.githubusercontent.com/Amer-CN/super-official-writer/master"
set "DEST=%~dp0EngineeringManager.Api\Resources\WritingSkill"
set "CORPUS_DIR=%DEST%\corpus"

curl -fsSL --retry 3 -o "%DEST%\SKILL.md" "%BASE%/SKILL.md" || (echo [sync-writing-skill] FAILED: SKILL.md & exit /b 1)
curl -fsSL --retry 3 -o "%DEST%\templates.md" "%BASE%/references/templates.md" || (echo [sync-writing-skill] FAILED: templates.md & exit /b 1)
curl -fsSL --retry 3 -o "%DEST%\phrase-library.md" "%BASE%/references/phrase-library.md" || (echo [sync-writing-skill] FAILED: phrase-library.md & exit /b 1)
curl -fsSL --retry 3 -o "%DEST%\format-spec.md" "%BASE%/references/format-spec.md" || (echo [sync-writing-skill] FAILED: format-spec.md & exit /b 1)
curl -fsSL --retry 3 -o "%DEST%\style-params.md" "%BASE%/references/style-params.md" || (echo [sync-writing-skill] FAILED: style-params.md & exit /b 1)
curl -fsSL --retry 3 -o "%DEST%\corpus-lingyun.md" "%BASE%/references/corpus-lingyun.md" || (echo [sync-writing-skill] FAILED: corpus-lingyun.md & exit /b 1)

rem ── corpus 分层文件：列 GitHub contents API 取全部 .md 逐个下载 ──
if not exist "%CORPUS_DIR%" mkdir "%CORPUS_DIR%"
powershell -NoProfile -Command ^
  "$ErrorActionPreference = 'Stop';" ^
  "$items = Invoke-RestMethod -Uri 'https://api.github.com/repos/Amer-CN/super-official-writer/contents/references/corpus' -Headers @{ 'User-Agent' = 'engineering-manager-sync' };" ^
  "$files = @($items | Where-Object { $_.type -eq 'file' -and $_.name -like '*.md' });" ^
  "if ($files.Count -eq 0) { throw 'corpus listing returned no .md files' };" ^
  "foreach ($f in $files) { Invoke-WebRequest -Uri $f.download_url -OutFile (Join-Path '%CORPUS_DIR%' $f.name) -Headers @{ 'User-Agent' = 'engineering-manager-sync' } };" ^
  "Write-Output ('[sync-writing-skill] corpus files: ' + $files.Count)"
if errorlevel 1 (
  echo [sync-writing-skill] FAILED: corpus download
  exit /b 1
)

echo [sync-writing-skill] All files synced. Version anchors:
findstr "skill-version" "%DEST%\SKILL.md"
echo [sync-writing-skill] corpus md count:
powershell -NoProfile -Command "(Get-ChildItem -LiteralPath '%CORPUS_DIR%' -Filter *.md).Count"
