Add-Type -AssemblyName System.Drawing

# 1. PURIFICAR hero_attack.png: Borrar textos y bordes de Gemini
$srcAtk = [System.Drawing.Bitmap]::FromFile("public\game_assets\characters\hero_attack.png")
$cleanAtk = New-Object System.Drawing.Bitmap($srcAtk.Width, $srcAtk.Height)
$g = [System.Drawing.Graphics]::FromImage($cleanAtk)
$g.DrawImage($srcAtk, 0, 0)
$g.Dispose()
$srcAtk.Dispose()

# Borrar franja de texto superior (Y: 0 a 60) y franja central (Y: 260 a 375)
for ($y = 0; $y -lt 60; $y++) {
    for ($x = 0; $x -lt $cleanAtk.Width; $x++) {
        $cleanAtk.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
    }
}
for ($y = 260; $y -lt 375; $y++) {
    for ($x = 0; $x -lt $cleanAtk.Width; $x++) {
        $cleanAtk.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
    }
}

# Borrar artefactos magenta residuales
for ($y = 0; $y -lt $cleanAtk.Height; $y++) {
    for ($x = 0; $x -lt $cleanAtk.Width; $x++) {
        $c = $cleanAtk.GetPixel($x, $y)
        if ($c.A -gt 0 -and $c.R -gt 150 -and $c.B -gt 150 -and $c.G -lt 85) {
            $cleanAtk.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        }
    }
}

$cleanAtk.Save("public\game_assets\characters\hero_attack.png", [System.Drawing.Imaging.ImageFormat]::Png)
$cleanAtk.Dispose()
Write-Output "hero_attack.png purificado sin textos ni artefactos"

# 2. PURIFICAR shadow_wolf.png: Eliminar manchas magentas bajo las patas
$srcWolf = [System.Drawing.Bitmap]::FromFile("public\game_assets\creatures\shadow_wolf.png")
$cleanWolf = New-Object System.Drawing.Bitmap($srcWolf.Width, $srcWolf.Height)
for ($y = 0; $y -lt $srcWolf.Height; $y++) {
    for ($x = 0; $x -lt $srcWolf.Width; $x++) {
        $c = $srcWolf.GetPixel($x, $y)
        if ($c.A -gt 0 -and $c.R -gt 130 -and $c.B -gt 130 -and $c.G -lt 95) {
            $cleanWolf.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        } else {
            $cleanWolf.SetPixel($x, $y, $c)
        }
    }
}
$srcWolf.Dispose()
$cleanWolf.Save("public\game_assets\creatures\shadow_wolf.png", [System.Drawing.Imaging.ImageFormat]::Png)
$cleanWolf.Dispose()
Write-Output "shadow_wolf.png purificado sin manchas magentas"

# 3. CREAR TILE DE CÉSPED ORGÁNICO CONTINUO (Rombo 2:1 sin bordes negros internos)
$W = 64
$H = 32
$flatGrass = New-Object System.Drawing.Bitmap($W, $H)
$gGrass = [System.Drawing.Graphics]::FromImage($flatGrass)
$gGrass.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
$gGrass.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor

$cBase = [System.Drawing.ColorTranslator]::FromHtml("#4e9134")
$cLight = [System.Drawing.ColorTranslator]::FromHtml("#67ab46")
$cDark = [System.Drawing.ColorTranslator]::FromHtml("#3c7826")

$diamond = @(
    (New-Object System.Drawing.Point(32, 0)),
    (New-Object System.Drawing.Point(64, 16)),
    (New-Object System.Drawing.Point(32, 32)),
    (New-Object System.Drawing.Point(0, 16))
)
$brushBase = New-Object System.Drawing.SolidBrush($cBase)
$gGrass.FillPolygon($brushBase, $diamond)
$brushBase.Dispose()

# Texturizado suave con clusters sin bordes negros
$brushLight = New-Object System.Drawing.SolidBrush($cLight)
$brushDark = New-Object System.Drawing.SolidBrush($cDark)
$gGrass.FillRectangle($brushLight, 26, 8, 3, 2)
$gGrass.FillRectangle($brushLight, 34, 12, 2, 2)
$gGrass.FillRectangle($brushLight, 18, 14, 2, 2)
$gGrass.FillRectangle($brushLight, 42, 10, 3, 2)
$gGrass.FillRectangle($brushDark, 30, 20, 3, 2)
$gGrass.FillRectangle($brushDark, 38, 22, 2, 2)
$gGrass.FillRectangle($brushDark, 22, 18, 2, 2)

$brushLight.Dispose()
$brushDark.Dispose()
$gGrass.Dispose()

$flatGrass.Save("public\game_assets\tiles\tile_grass_seamless.png", [System.Drawing.Imaging.ImageFormat]::Png)
$flatGrass.Dispose()
Write-Output "tile_grass_seamless.png generado con éxito"
