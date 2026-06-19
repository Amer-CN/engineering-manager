# PartnerForm refactor script - v1.1.0 Sprint A S0.1 (UTF-8 safe)
$ErrorActionPreference = 'Stop'

$srcPath = 'src\components\features\partners\PartnerForm.tsx'
[byte[]]$rawBytes = [System.IO.File]::ReadAllBytes($srcPath)
$content = [System.Text.Encoding]::UTF8.GetString($rawBytes)
$lines = $content -split "`n"

# 移除可能的尾随空行（CRLF 末尾的）
if ($lines.Count -gt 0 -and $lines[-1] -eq '') {
    $lines = $lines[0..($lines.Count - 2)]
}

Write-Host "Original lines: $($lines.Count)"

# 1. New imports
$newImports = @(
    "import React, { useState, useEffect, useRef } from 'react'"
    "import { Partner, Project } from '../../../types/electron'"
    "import { partnerCategories } from '../../../data/regions'"
    "import { FileDropZone } from './FileDropZone'"
    "import { useToastStore } from '@/store/toastStore'"
    "import { BusinessLicenseOCRBlock } from './BusinessLicenseOCRBlock'"
)

# 2. Delete dead code (0-indexed)
# Dead state 50-53 (1-indexed) = 49-52 (0-indexed): businessLicenseLoading + 3 ocr useState
# Dead comment+useEffect 58-60 (1-indexed) = 57-59 (0-indexed)
# Dead function 117-149 (1-indexed) = 116-148 (0-indexed): handleBusinessLicenseOCR + blank
$deleteIndices = @(49, 50, 51, 52) + @(57, 58, 59) + @(116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148)

$filtered = @()
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($deleteIndices -notcontains $i) {
        $filtered += $lines[$i]
    }
}
Write-Host "After delete: $($filtered.Count) lines"

# 3. Find OCR inline block in filtered
$ocrStartNew = -1
$ocrEndNew = -1
for ($i = 0; $i -lt $filtered.Count; $i++) {
    if ($filtered[$i] -match 'OCR 识别按钮') { $ocrStartNew = $i }
    if ($ocrStartNew -ge 0 -and $filtered[$i] -match 'onDismiss=.*setOcrStatus') {
        $j = $i
        while ($j -lt $filtered.Count -and $filtered[$j] -notmatch '^\s*\/>') { $j++ }
        $ocrEndNew = $j
        break
    }
}

if ($ocrStartNew -lt 0 -or $ocrEndNew -lt 0) {
    Write-Host "ERROR: OCR block not found in filtered"
    exit 1
}
Write-Host "OCR block: filtered line $($ocrStartNew + 1) to $($ocrEndNew + 1)"

# 4. Replace imports + filter lines
$result = @()
$result += $newImports
$result += $filtered[9..($filtered.Count - 1)]

# 5. Find OCR block in result and replace
$ocrStartR = -1
$ocrEndR = -1
for ($i = 0; $i -lt $result.Count; $i++) {
    if ($result[$i] -match 'OCR 识别按钮') { $ocrStartR = $i }
    if ($ocrStartR -ge 0 -and $result[$i] -match 'onDismiss=.*setOcrStatus') {
        $j = $i
        while ($j -lt $result.Count -and $result[$j] -notmatch '^\s*\/>') { $j++ }
        $ocrEndR = $j
        break
    }
}

$beforeOcr = $result[0..($ocrStartR - 1)]
$afterOcr = $result[($ocrEndR + 1)..($result.Count - 1)]

$replacement = @(
    '        { /* BusinessLicenseOCR (v1.1.0 extracted) */ }'
    '        <BusinessLicenseOCRBlock'
    '          licenseFile={formData.licenseFile}'
    '          licenseFileType={formData.licenseFileType}'
    '          onResult={fields => setFormData(prev => ({'
    '            ...prev,'
    '            name: fields.name || prev.name,'
    '            creditCode: fields.creditCode || prev.creditCode,'
    '            registeredAddress: fields.registeredAddress || prev.registeredAddress,'
    '            businessScope: fields.businessScope || prev.businessScope'
    '          }))}'
    '        />'
)

$final = @($beforeOcr) + @($replacement) + @($afterOcr)

# 6. Write with UTF-8 no BOM
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$finalContent = ($final -join "`n")
[System.IO.File]::WriteAllText($srcPath, $finalContent, $utf8NoBom)

# 7. Verify with node
$verify = node -e "const fs=require('fs'); const c=fs.readFileSync('src/components/features/partners/PartnerForm.tsx','utf8'); console.log(c.split(/\r?\n/).length);" 2>&1
Write-Host "Final lines (node verify): $verify"