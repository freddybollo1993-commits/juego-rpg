Add-Type -AssemblyName System.Drawing

$script = @'
using System;
using System.Drawing;
using System.Drawing.Imaging;

public class MasterChromaProcessor {
    public static void ProcessMasterSheet(string inputPath, string outputPath) {
        using (Bitmap src = new Bitmap(inputPath)) {
            Bitmap dst = new Bitmap(src.Width, src.Height, PixelFormat.Format32bppArgb);
            
            BitmapData srcData = src.LockBits(new Rectangle(0, 0, src.Width, src.Height), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
            BitmapData dstData = dst.LockBits(new Rectangle(0, 0, dst.Width, dst.Height), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
            
            int totalBytes = srcData.Stride * src.Height;
            byte[] px = new byte[totalBytes];
            byte[] res = new byte[totalBytes];
            
            System.Runtime.InteropServices.Marshal.Copy(srcData.Scan0, px, 0, totalBytes);
            src.UnlockBits(srcData);
            
            for (int i = 0; i < totalBytes; i += 4) {
                byte b = px[i];
                byte g = px[i + 1];
                byte r = px[i + 2];
                
                int dr = r - 255;
                int dg = g - 0;
                int db = b - 255;
                double dist = Math.Sqrt(dr * dr + dg * dg + db * db);
                
                // Distancia a magenta puro
                if (dist < 110.0) {
                    res[i] = 0;
                    res[i + 1] = 0;
                    res[i + 2] = 0;
                    res[i + 3] = 0;
                } else if (dist < 135.0) {
                    double a = (dist - 110.0) / 25.0;
                    res[i] = b;
                    res[i + 1] = g;
                    res[i + 2] = r;
                    res[i + 3] = (byte)(255 * a);
                } else {
                    // Detección de líneas de cuadrícula magenta/moradas oscuras
                    if (r > 140 && b > 140 && g < 80) {
                        res[i] = 0;
                        res[i + 1] = 0;
                        res[i + 2] = 0;
                        res[i + 3] = 0;
                    } else {
                        res[i] = b;
                        res[i + 1] = g;
                        res[i + 2] = r;
                        res[i + 3] = 255;
                    }
                }
            }
            
            System.Runtime.InteropServices.Marshal.Copy(res, 0, dstData.Scan0, totalBytes);
            dst.UnlockBits(dstData);
            
            dst.Save(outputPath, ImageFormat.Png);
        }
    }
}
'@

Add-Type -TypeDefinition $script -ReferencedAssemblies System.Drawing

[MasterChromaProcessor]::ProcessMasterSheet(
    "public\game_assets\characters\raw_master\hero_locomotion_master.jpg",
    "public\game_assets\characters\hero_locomotion.png"
)
[MasterChromaProcessor]::ProcessMasterSheet(
    "public\game_assets\characters\raw_master\hero_dash_master.jpg",
    "public\game_assets\characters\hero_dash.png"
)
[MasterChromaProcessor]::ProcessMasterSheet(
    "public\game_assets\characters\raw_master\hero_combat_combo_master.jpg",
    "public\game_assets\characters\hero_combat_combo.png"
)

Write-Output "Hojas maestras procesadas a PNG transparentes:"
Get-ChildItem public\game_assets\characters\*.png
