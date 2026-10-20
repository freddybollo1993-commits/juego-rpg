// Generador procedimental de Spritesheet Pixel Art 2.5D para el Personaje Principal
// Conforme a las directrices de pixel-25d-kinematics-animator y luz superior-izquierda a 45°

export type Direction4 = 'SE' | 'SO' | 'NE' | 'NO';
export type AnimationState = 'IDLE' | 'WALK' | 'RUN' | 'DASH' | 'ATTACK';

export class HeroSpriteSheet {
  public static readonly FRAME_W = 32;
  public static readonly FRAME_H = 48;
  public static readonly ANCHOR_X = 16;
  public static readonly ANCHOR_Y = 44; // anchor (0.5, 0.916)

  // Canvas que contiene todo el spritesheet horneado
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;

  // Mapa de frames: [animState][dir][frameIndex] -> { sx, sy }
  private frameMap: Map<string, { sx: number; sy: number }> = new Map();

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 32 * 6; // 6 frames máx por animación
    this.canvas.height = 48 * 20; // 5 animaciones * 4 direcciones = 20 filas
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo crear el contexto para HeroSpriteSheet');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;

    this.bakeAll();
  }

  public getFrame(anim: AnimationState, dir: Direction4, frameIndex: number): { sx: number; sy: number } {
    const key = `${anim}_${dir}_${frameIndex}`;
    return this.frameMap.get(key) || { sx: 0, sy: 0 };
  }

  private bakeAll(): void {
    const directions: Direction4[] = ['SE', 'SO', 'NE', 'NO'];
    let rowIndex = 0;

    // 1. IDLE (4 frames)
    for (const dir of directions) {
      for (let f = 0; f < 4; f++) {
        const sx = f * HeroSpriteSheet.FRAME_W;
        const sy = rowIndex * HeroSpriteSheet.FRAME_H;
        this.drawHeroFrame(sx, sy, dir, 'IDLE', f, 4);
        this.frameMap.set(`IDLE_${dir}_${f}`, { sx, sy });
      }
      rowIndex++;
    }

    // 2. WALK (6 frames)
    for (const dir of directions) {
      for (let f = 0; f < 6; f++) {
        const sx = f * HeroSpriteSheet.FRAME_W;
        const sy = rowIndex * HeroSpriteSheet.FRAME_H;
        this.drawHeroFrame(sx, sy, dir, 'WALK', f, 6);
        this.frameMap.set(`WALK_${dir}_${f}`, { sx, sy });
      }
      rowIndex++;
    }

    // 3. RUN (6 frames)
    for (const dir of directions) {
      for (let f = 0; f < 6; f++) {
        const sx = f * HeroSpriteSheet.FRAME_W;
        const sy = rowIndex * HeroSpriteSheet.FRAME_H;
        this.drawHeroFrame(sx, sy, dir, 'RUN', f, 6);
        this.frameMap.set(`RUN_${dir}_${f}`, { sx, sy });
      }
      rowIndex++;
    }

    // 4. DASH (2 frames)
    for (const dir of directions) {
      for (let f = 0; f < 2; f++) {
        const sx = f * HeroSpriteSheet.FRAME_W;
        const sy = rowIndex * HeroSpriteSheet.FRAME_H;
        this.drawHeroFrame(sx, sy, dir, 'DASH', f, 2);
        this.frameMap.set(`DASH_${dir}_${f}`, { sx, sy });
      }
      rowIndex++;
    }

    // 5. ATTACK (3 frames)
    for (const dir of directions) {
      for (let f = 0; f < 3; f++) {
        const sx = f * HeroSpriteSheet.FRAME_W;
        const sy = rowIndex * HeroSpriteSheet.FRAME_H;
        this.drawHeroFrame(sx, sy, dir, 'ATTACK', f, 3);
        this.frameMap.set(`ATTACK_${dir}_${f}`, { sx, sy });
      }
      rowIndex++;
    }
  }

  private drawHeroFrame(
    ox: number,
    oy: number,
    dir: Direction4,
    anim: AnimationState,
    frame: number,
    totalFrames: number
  ): void {
    const ctx = this.ctx;
    const isSouth = dir === 'SE' || dir === 'SO';
    const isEast = dir === 'SE' || dir === 'NE';

    // Parámetros de interpolación según animación
    let bobY = 0;
    let legOffsetL = 0;
    let legOffsetR = 0;
    let armSwing = 0;
    let capeWave = 0;
    let swordSlash = 0;

    if (anim === 'IDLE') {
      // Respiración sutil
      bobY = Math.round(Math.sin((frame / totalFrames) * Math.PI * 2) * 1);
      capeWave = Math.round(Math.sin((frame / totalFrames) * Math.PI * 2) * 2);
    } else if (anim === 'WALK') {
      // Ciclo de marcha biomecánico
      const phase = (frame / totalFrames) * Math.PI * 2;
      legOffsetL = Math.round(Math.sin(phase) * 3);
      legOffsetR = Math.round(Math.sin(phase + Math.PI) * 3);
      bobY = Math.abs(Math.round(Math.sin(phase * 2) * 1.5));
      armSwing = Math.round(Math.sin(phase) * 2);
      capeWave = Math.round(Math.sin(phase + 1) * 3);
    } else if (anim === 'RUN') {
      // Zancada extendida con mayor inclinación
      const phase = (frame / totalFrames) * Math.PI * 2;
      legOffsetL = Math.round(Math.sin(phase) * 5);
      legOffsetR = Math.round(Math.sin(phase + Math.PI) * 5);
      bobY = Math.abs(Math.round(Math.sin(phase * 2) * 2.5));
      armSwing = Math.round(Math.sin(phase) * 4);
      capeWave = Math.round(Math.sin(phase) * 5);
    } else if (anim === 'DASH') {
      bobY = 3; // Cuerpo bajo aerodinámico
      legOffsetL = isEast ? -4 : 4;
      legOffsetR = isEast ? 3 : -3;
      capeWave = 6;
    } else if (anim === 'ATTACK') {
      swordSlash = frame + 1;
      bobY = frame === 1 ? 1 : 0;
    }

    const cx = ox + 16;
    const cy = oy + 26 - bobY;

    // Paleta de colores Pixel Art 16-bit
    const cCapeLight = '#e63946';
    const cCapeBase = '#c1121f';
    const cCapeDark = '#6e0d16';

    const cArmorLight = '#48cae4';
    const cArmorBase = '#0077b6';
    const cArmorDark = '#023e8a';

    const cSkinLight = '#ffdfba';
    const cSkinBase = '#f4a261';
    const cSkinShadow = '#c76e38';

    const cHair = '#2b2d42';
    const cBoots = '#3e2723';
    const cBootsLight = '#5d4037';
    const cSwordBlade = '#edf2f4';
    const cSwordGold = '#ffb703';

    // 1. CAPA POSTERIOR (Si mira hacia el Sur, la capa va por detrás)
    if (isSouth) {
      const capeDir = isEast ? -1 : 1;
      ctx.fillStyle = cCapeDark;
      ctx.fillRect(cx - 5 + capeDir * capeWave, cy + 2, 10, 14);
      ctx.fillStyle = cCapeBase;
      ctx.fillRect(cx - 4 + capeDir * capeWave, cy + 4, 8, 12);
      ctx.fillStyle = cCapeLight;
      ctx.fillRect(cx - 3 + capeDir * capeWave, cy + 5, 3, 9);
    }

    // 2. PIERNAS Y BOTAS
    // Pierna Izquierda
    const lx = cx - 4;
    const ly = oy + 36 + legOffsetL;
    ctx.fillStyle = cBoots;
    ctx.fillRect(lx, ly, 3, 8);
    ctx.fillStyle = cBootsLight;
    ctx.fillRect(lx, ly, 1, 8);

    // Pierna Derecha
    const rx = cx + 2;
    const ry = oy + 36 + legOffsetR;
    ctx.fillStyle = cBoots;
    ctx.fillRect(rx, ry, 3, 8);
    ctx.fillStyle = cBootsLight;
    ctx.fillRect(rx + 2, ry, 1, 8);

    // 3. TORSO / ARMADURA RÚNICA
    ctx.fillStyle = cArmorDark;
    ctx.fillRect(cx - 6, cy + 2, 12, 10);
    ctx.fillStyle = cArmorBase;
    ctx.fillRect(cx - 5, cy + 2, 10, 9);

    // Resalte frontal / Runa central
    if (isSouth) {
      ctx.fillStyle = cArmorLight;
      ctx.fillRect(cx - 1, cy + 4, 3, 5); // Runa brillante
      ctx.fillStyle = cSwordBlade;
      ctx.fillRect(cx, cy + 5, 1, 3);
    } else {
      // Espalda de la armadura con refuerzos de placas
      ctx.fillStyle = cArmorDark;
      ctx.fillRect(cx - 3, cy + 4, 6, 4);
    }

    // 4. CABEZA Y ROSTRO
    const headY = cy - 10;
    // Base de piel
    ctx.fillStyle = cSkinBase;
    ctx.fillRect(cx - 5, headY, 10, 10);

    if (isSouth) {
      // Luz en el rostro (superior-izquierda a 45°)
      ctx.fillStyle = cSkinLight;
      ctx.fillRect(cx - 4, headY + 1, 5, 8);

      // Ojos estilo anime/retro táctico
      ctx.fillStyle = '#111827';
      if (isEast) {
        ctx.fillRect(cx - 1, headY + 4, 2, 3);
        ctx.fillRect(cx + 3, headY + 4, 2, 3);
        // Brillo blanco en ojos
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 1, headY + 4, 1, 1);
        ctx.fillRect(cx + 3, headY + 4, 1, 1);
      } else {
        ctx.fillRect(cx - 4, headY + 4, 2, 3);
        ctx.fillRect(cx, headY + 4, 2, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 4, headY + 4, 1, 1);
        ctx.fillRect(cx, headY + 4, 1, 1);
      }
    } else {
      // Sombra occipital en la nuca si mira hacia el Norte
      ctx.fillStyle = cSkinShadow;
      ctx.fillRect(cx - 4, headY + 4, 8, 6);
    }

    // Cabello / Diadema de combate
    ctx.fillStyle = cHair;
    ctx.fillRect(cx - 6, headY - 2, 12, 5); // Corona de pelo
    if (isEast) {
      ctx.fillRect(cx - 6, headY, 3, 7); // Mechón izquierdo
    } else {
      ctx.fillRect(cx + 3, headY, 3, 7); // Mechón derecho
    }

    // Diadema rúnica dorada
    ctx.fillStyle = cSwordGold;
    ctx.fillRect(cx - 5, headY + 2, 10, 2);

    // 5. CAPA FRONTAL (Si mira hacia el Norte, la capa se ve por delante cubriendo la espalda)
    if (!isSouth) {
      const capeDir = isEast ? -1 : 1;
      ctx.fillStyle = cCapeDark;
      ctx.fillRect(cx - 5 + capeDir * capeWave, cy + 2, 10, 13);
      ctx.fillStyle = cCapeBase;
      ctx.fillRect(cx - 4 + capeDir * capeWave, cy + 3, 8, 11);
      ctx.fillStyle = cCapeLight;
      ctx.fillRect(cx - 3 + capeDir * capeWave, cy + 4, 3, 8);
    }

    // 6. BRAZOS Y ARMAS (ESPADA RÚNICA)
    const armY = cy + 4 + armSwing;
    if (anim === 'ATTACK') {
      // Pose de ataque dinámico y estela
      const slashAngle = isEast ? 1 : -1;
      // Empuñadura
      ctx.fillStyle = cSwordGold;
      ctx.fillRect(cx + slashAngle * 8, cy + 2, 3, 3);
      // Hoja de espada extendida
      ctx.fillStyle = cSwordBlade;
      ctx.fillRect(cx + slashAngle * 10, cy - 6 + swordSlash * 3, 14, 3);
      // Estela de golpe de espada
      ctx.fillStyle = 'rgba(147, 197, 253, 0.7)';
      ctx.beginPath();
      ctx.arc(cx + slashAngle * 8, cy, 18, -Math.PI / 3, Math.PI / 3, !isEast);
      ctx.lineWidth = 3;
      ctx.stroke();
    } else {
      // Brazo en reposo / balanceo
      ctx.fillStyle = cArmorDark;
      const armX = isEast ? cx + 6 : cx - 8;
      ctx.fillRect(armX, armY, 3, 6);

      // Empuñadura de espada en vaina lateral
      ctx.fillStyle = cSwordGold;
      ctx.fillRect(isEast ? cx - 7 : cx + 5, cy + 4, 3, 3);
      ctx.fillStyle = cSwordBlade;
      ctx.fillRect(isEast ? cx - 8 : cx + 6, cy + 6, 2, 6);
    }
  }
}
