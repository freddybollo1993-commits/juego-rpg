Add-Type -AssemblyName System.Drawing

# Crear directorios de destino
New-Item -ItemType Directory -Force public\assets\props
New-Item -ItemType Directory -Force public\assets\tiles
New-Item -ItemType Directory -Force public\assets\characters
New-Item -ItemType Directory -Force public\assets\creatures

# 1. RECORTAR PROPS: Árbol y Roca de tree_and_rock.png
$treeRockBmp = [System.Drawing.Bitmap]::FromFile("public\assets_extracted\tree_and_rock.png")

# Árbol (izq): X: 48 a 470, Y: 30 a 515 (ancho: 422, alto: 485)
$treeRect = New-Object System.Drawing.Rectangle(48, 30, 422, 485)
$treeBmp = $treeRockBmp.Clone($treeRect, $treeRockBmp.PixelFormat)
$treeBmp.Save("public\assets\props\ancient_tree.png", [System.Drawing.Imaging.ImageFormat]::Png)
$treeBmp.Dispose()

# Roca (der): X: 520 a 970, Y: 140 a 500 (ancho: 450, alto: 360)
$rockRect = New-Object System.Drawing.Rectangle(520, 140, 450, 360)
$rockBmp = $treeRockBmp.Clone($rockRect, $treeRockBmp.PixelFormat)
$rockBmp.Save("public\assets\props\mossy_rock.png", [System.Drawing.Imaging.ImageFormat]::Png)
$rockBmp.Dispose()
$treeRockBmp.Dispose()
Write-Output "Props recortados: ancient_tree.png y mossy_rock.png"

# 2. RECORTAR MONOLITO de runic_monolith.png: X: 245 a 835, Y: 40 a 530 (ancho: 590, alto: 490)
$monolithSrc = [System.Drawing.Bitmap]::FromFile("public\assets_extracted\runic_monolith.png")
$monolithRect = New-Object System.Drawing.Rectangle(245, 40, 590, 490)
$monolithBmp = $monolithSrc.Clone($monolithRect, $monolithSrc.PixelFormat)
$monolithBmp.Save("public\assets\props\runic_monolith.png", [System.Drawing.Imaging.ImageFormat]::Png)
$monolithBmp.Dispose()
$monolithSrc.Dispose()
Write-Output "Landmark recortado: runic_monolith.png"

# 3. RECORTAR BLOQUES DE TERRENO de terrain_blocks.png
$terrainSrc = [System.Drawing.Bitmap]::FromFile("public\assets_extracted\terrain_blocks.png")
# Bloque 1: Césped (X: 42 a 340, Y: 115 a 420, ancho: 298, alto: 305)
$grassRect = New-Object System.Drawing.Rectangle(42, 115, 298, 305)
$grassBmp = $terrainSrc.Clone($grassRect, $terrainSrc.PixelFormat)
$grassBmp.Save("public\assets\tiles\tile_grass.png", [System.Drawing.Imaging.ImageFormat]::Png)
$grassBmp.Dispose()

# Bloque 2: Adoquín (X: 350 a 655, Y: 115 a 420, ancho: 305, alto: 305)
$cobbleRect = New-Object System.Drawing.Rectangle(350, 115, 305, 305)
$cobbleBmp = $terrainSrc.Clone($cobbleRect, $terrainSrc.PixelFormat)
$cobbleBmp.Save("public\assets\tiles\tile_cobblestone.png", [System.Drawing.Imaging.ImageFormat]::Png)
$cobbleBmp.Dispose()

# Bloque 3: Transición Tierra/Senda (X: 660 a 965, Y: 115 a 420, ancho: 305, alto: 305)
$dirtRect = New-Object System.Drawing.Rectangle(660, 115, 305, 305)
$dirtBmp = $terrainSrc.Clone($dirtRect, $terrainSrc.PixelFormat)
$dirtBmp.Save("public\assets\tiles\tile_dirt_edge.png", [System.Drawing.Imaging.ImageFormat]::Png)
$dirtBmp.Dispose()
$terrainSrc.Dispose()
Write-Output "Tiles recortados: tile_grass.png, tile_cobblestone.png, tile_dirt_edge.png"

# 4. COPIAR Y OPTIMIZAR SPRITESHEETS DE PERSONAJES Y CRIATURAS
Copy-Item "public\assets_extracted\hero_idle_walk.png" "public\assets\characters\hero_idle_walk.png"
Copy-Item "public\assets_extracted\hero_run_dash.png" "public\assets\characters\hero_run_dash.png"
Copy-Item "public\assets_extracted\hero_attack.png" "public\assets\characters\hero_attack.png"
Copy-Item "public\assets_extracted\shadow_wolf.png" "public\assets\creatures\shadow_wolf.png"
Copy-Item "public\assets_extracted\golem_creature.png" "public\assets\creatures\golem_creature.png"

Write-Output "Spritesheets organizados con éxito."
