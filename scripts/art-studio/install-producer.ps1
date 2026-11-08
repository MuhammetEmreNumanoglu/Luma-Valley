param([Parameter(Mandatory=$true)][string]$Name, [Parameter(Mandatory=$true)][string]$File)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$project = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$manifestPath = Join-Path $project 'assets\art\manifest.json'
$manifest = @(Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json)
$entry = $manifest | Where-Object { $_.id -ceq "producer_$Name" }
if (@($entry).Count -ne 1) { throw "Unknown producer: $Name" }
$source = [System.Drawing.Image]::FromFile($File)
$dest = New-Object System.Drawing.Bitmap 256,256
$graphics = [System.Drawing.Graphics]::FromImage($dest)
try {
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $scale = [Math]::Min(256 / $source.Width, 256 / $source.Height)
  $width = [int]($source.Width * $scale); $height = [int]($source.Height * $scale)
  $graphics.DrawImage($source, [int]((256 - $width) / 2), [int]((256 - $height) / 2), $width, $height)
} finally { $graphics.Dispose(); $source.Dispose() }
try { $dest.Save((Join-Path $project "assets\art\producers\producer_$Name.png"), [System.Drawing.Imaging.ImageFormat]::Png) } finally { $dest.Dispose() }
$entry.source = 'Generated for Luma Valley using OpenAI image generation; resized for the game'
$entry.license = 'OpenAI-generated; not represented as CC0'
[System.IO.File]::WriteAllText($manifestPath, (ConvertTo-Json -InputObject $manifest -Depth 10) + "`n", [System.Text.UTF8Encoding]::new($false))
