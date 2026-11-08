param([Parameter(Mandatory=$true)][string]$Family, [Parameter(Mandatory=$true)][string[]]$Files)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$project = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
for ($n = 0; $n -lt $Files.Length; $n++) {
  $source = [System.Drawing.Image]::FromFile($Files[$n])
  $dest = New-Object System.Drawing.Bitmap 256,256
  $graphics = [System.Drawing.Graphics]::FromImage($dest)
  try {
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $scale = [Math]::Min(256 / $source.Width, 256 / $source.Height)
    $width = [int]($source.Width * $scale); $height = [int]($source.Height * $scale)
    $graphics.DrawImage($source, [int]((256 - $width) / 2), [int]((256 - $height) / 2), $width, $height)
  } finally { $graphics.Dispose(); $source.Dispose() }
  $path = Join-Path $project "assets\art\items\item_${Family}_$($n + 1).png"
  try { $dest.Save($path, [System.Drawing.Imaging.ImageFormat]::Png) } finally { $dest.Dispose() }
}
$manifestPath = Join-Path $project 'assets\art\manifest.json'
$manifest = @(Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json)
foreach ($entry in $manifest) {
  if ($entry.id -match "^item_$([regex]::Escape($Family))_(\d+)$" -and [int]$Matches[1] -le $Files.Length) {
    $entry.source = 'Generated for Luma Valley using OpenAI image generation; resized for the game'
    $entry.license = 'OpenAI-generated; not represented as CC0'
  }
}
[System.IO.File]::WriteAllText($manifestPath, (ConvertTo-Json -InputObject $manifest -Depth 10) + "`n", [System.Text.UTF8Encoding]::new($false))
