param([Parameter(Mandatory=$true)][string]$Id, [Parameter(Mandatory=$true)][string]$File)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$project = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$manifestPath = Join-Path $project 'assets\art\manifest.json'
$manifest = @(Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json)
$entry = $manifest | Where-Object { $_.id -ceq $Id -and $_.category -eq 'structures' }
if (@($entry).Count -ne 1) { throw "Unknown structure: $Id" }
$w = [int]$entry.size[0]; $h = [int]$entry.size[1]
$ax = [double]$entry.anchor[0]; $ay = [double]$entry.anchor[1]
$source = [System.Drawing.Image]::FromFile($File)
$dest = New-Object System.Drawing.Bitmap $w,$h
$graphics = [System.Drawing.Graphics]::FromImage($dest)
try {
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $availableW = 2 * [Math]::Min($ax, $w - $ax)
  $availableH = [Math]::Min($h, $ay + 8)
  $scale = [Math]::Min($availableW / $source.Width, $availableH / $source.Height)
  $sw = [int]($source.Width * $scale); $sh = [int]($source.Height * $scale)
  $graphics.DrawImage($source, [int]($ax - $sw / 2), [int]($ay + 8 - $sh), $sw, $sh)
} finally { $graphics.Dispose(); $source.Dispose() }
try { $dest.Save((Join-Path $project $entry.file), [System.Drawing.Imaging.ImageFormat]::Png) } finally { $dest.Dispose() }
$entry.source = 'Generated for Luma Valley using OpenAI image generation; resized and anchored for the game'
$entry.license = 'OpenAI-generated; not represented as CC0'
[System.IO.File]::WriteAllText($manifestPath, (ConvertTo-Json -InputObject $manifest -Depth 10) + "`n", [System.Text.UTF8Encoding]::new($false))
