param([Parameter(Mandatory=$true)][string[]]$Names, [Parameter(Mandatory=$true)][string]$File, [string]$Prefix = 'tree_')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$project = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$manifestPath = Join-Path $project 'assets\art\manifest.json'
$registryPath = Join-Path $project 'src\art\registry.generated.ts'
$manifest = @(Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json)
$registry = Get-Content -Raw -LiteralPath $registryPath
foreach ($name in $Names) {
  $id = "prop_$Prefix$name"
  $entry = $manifest | Where-Object { $_.id -ceq $id }
  if (@($entry).Count -ne 1) { throw "Unknown tree: $name" }
  $unit = [Math]::Round($entry.pxPerUnit * 256 / $entry.size[1], 2)
  $source = [System.Drawing.Image]::FromFile($File)
  $dest = New-Object System.Drawing.Bitmap 256,256
  $graphics = [System.Drawing.Graphics]::FromImage($dest)
  try {
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $scale = [Math]::Min(256 / $source.Width, 256 / $source.Height)
    $width = [int]($source.Width * $scale); $height = [int]($source.Height * $scale)
    $graphics.DrawImage($source, [int]((256 - $width) / 2), 256 - $height, $width, $height)
  } finally { $graphics.Dispose(); $source.Dispose() }
  try { $dest.Save((Join-Path $project "assets\art\props\$id.png"), [System.Drawing.Imaging.ImageFormat]::Png) } finally { $dest.Dispose() }
  $entry.size = @(256, 256); $entry.anchor = @(128, 240); $entry.pxPerUnit = $unit
  $entry.source = 'Generated for Luma Valley using OpenAI image generation; resized for the game'
  $entry.license = 'OpenAI-generated; not represented as CC0'
  $pattern = "(?m)^  '$id': .*,\r?`$"
  $line = "  '$id': { src: require('../../assets/art/props/$id.png'), w: 256, h: 256, ax: 128, ay: 240, unit: $($unit.ToString([System.Globalization.CultureInfo]::InvariantCulture)) },"
  if (-not [regex]::IsMatch($registry, $pattern)) { throw "Missing registry entry: $id" }
  $registry = [regex]::Replace($registry, $pattern, [System.Text.RegularExpressions.MatchEvaluator]{ param($match) $line })
}
[System.IO.File]::WriteAllText($manifestPath, (ConvertTo-Json -InputObject $manifest -Depth 10) + "`n", [System.Text.UTF8Encoding]::new($false))
[System.IO.File]::WriteAllText($registryPath, $registry, [System.Text.UTF8Encoding]::new($false))
