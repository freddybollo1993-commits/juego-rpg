// Boss.ts - Final Boss: "El Heraldo de las Estrellas" (GDD Sec. 9)
// Multi-phase atmospheric terraforming, adaptive deflector shields, and artifact sacrifice vulnerability.

import { Player } from './Player';
import { soundManager } from '../audio/SoundManager';

export type BossPhase = 'cryogenic' | 'toxic_miasma' | 'volcanic_thermal' | 'gravitational_void';

export class Boss {
  public x: number;
  public y: number;
  public width: number = 72;
  public height: number = 96;
  public health: number = 400;
  public maxHealth: number = 400;
  public isAlive: boolean = true;
  public currentPhase: BossPhase = 'cryogenic';
  public phaseTimer: number = 0;

  // Deflector Shield
  public shieldActive: boolean = true;
  public shieldHealth: number = 100;
  public isDowned: boolean = false;
  public downedTimer: number = 0;

  // Wipe attack charging
  public isChargingWipeAttack: boolean = false;
  public wipeChargeTimer: number = 0;

  // Projectiles
  public projectiles: { x: number; y: number; vx: number; vy: number; radius: number; color: string }[] = [];
  public attackCooldown: number = 2.0;

  // Telegraphed Orbital Celestial Beams
  public telegraphedBeams: {
    x: number;
    y: number;
    radius: number;
    timer: number;
    maxTimer: number;
    color: string;
    damage: number;
  }[] = [];
  public orbitalStrikeCooldown: number = 4.0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  public update(player: Player, delta: number, onPhaseChange: (phase: BossPhase) => void) {
    if (!this.isAlive) return;

    // Downed state recovery
    if (this.isDowned) {
      this.downedTimer -= delta;
      if (this.downedTimer <= 0) {
        this.isDowned = false;
        this.shieldActive = true;
        this.shieldHealth = 100;
      }
      return; // Immobilized while downed
    }

    // Hovering levitation oscillation
    const time = Date.now() * 0.002;
    this.y += Math.sin(time) * 0.6;

    // Phase progression based on health
    let nextPhase: BossPhase = 'cryogenic';
    if (this.health < 100) {
      nextPhase = 'gravitational_void';
    } else if (this.health < 200) {
      nextPhase = 'volcanic_thermal';
    } else if (this.health < 300) {
      nextPhase = 'toxic_miasma';
    }

    if (this.currentPhase !== nextPhase) {
      this.currentPhase = nextPhase;
      soundManager.playBossPhaseChange();
      onPhaseChange(this.currentPhase);
    }

    // Attack timer
    this.attackCooldown -= delta;
    if (this.attackCooldown <= 0) {
      this.launchPhaseAttack(player);
      this.attackCooldown = 2.5 + Math.random() * 1.5;
    }

    // Periodically initiate Wipe Attack Channeling (GDD Sec. 9.4)
    if (!this.isChargingWipeAttack && Math.random() < 0.005) {
      this.isChargingWipeAttack = true;
      this.wipeChargeTimer = 9.0; // 9 second window to detonate artifact
      soundManager.playAlienBeam();
    }

    if (this.isChargingWipeAttack) {
      this.wipeChargeTimer -= delta;
      if (this.wipeChargeTimer <= 0) {
        // Unleash deadly wipe wave if not interrupted
        this.isChargingWipeAttack = false;
        player.vitals.health = Math.max(0, player.vitals.health - 60);
        soundManager.playHit();
      }
    }

    // Orbital Celestial Beam Strike (Telegraphed Hazard)
    this.orbitalStrikeCooldown -= delta;
    if (this.orbitalStrikeCooldown <= 0) {
      this.orbitalStrikeCooldown = 4.2 + Math.random() * 2.5;
      const beamColor = this.currentPhase === 'cryogenic' ? '#38bdf8' :
                        this.currentPhase === 'toxic_miasma' ? '#70e000' :
                        this.currentPhase === 'volcanic_thermal' ? '#f97316' : '#c084fc';
      this.telegraphedBeams.push({
        x: player.x,
        y: player.y,
        radius: 58,
        timer: 1.1,
        maxTimer: 1.1,
        color: beamColor,
        damage: 28
      });
      soundManager.playTelegraph();
    }

    // Update active orbital beams
    for (let i = this.telegraphedBeams.length - 1; i >= 0; i--) {
      const beam = this.telegraphedBeams[i];
      beam.timer -= delta;
      if (beam.timer <= 0) {
        // Detonate beam!
        soundManager.playOrbitalBeam();
        const dist = Math.hypot(player.x - beam.x, player.y - beam.y);
        if (dist <= beam.radius + 12) {
          if (!player.isInvulnerable) {
            player.vitals.health = Math.max(0, player.vitals.health - beam.damage);
            soundManager.playHit();
          } else {
            soundManager.playDodge();
          }
        }
        this.telegraphedBeams.splice(i, 1);
      }
    }

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx * delta * 60;
      p.y += p.vy * delta * 60;

      // Hit player check (respects dodge i-frames)
      const dx = player.x - p.x;
      const dy = player.y - p.y;
      if (Math.sqrt(dx * dx + dy * dy) <= p.radius + 16) {
        if (!player.isInvulnerable) {
          player.vitals.health = Math.max(0, player.vitals.health - 18);
          soundManager.playHit();
        } else {
          soundManager.playDodge();
        }
        this.projectiles.splice(i, 1);
      }
    }
  }

  private launchPhaseAttack(player: Player) {
    soundManager.playAlienBeam();
    const angle = Math.atan2(player.y - this.y, player.x - this.x);
    const speed = 4.5;

    let color = '#00f5d4';
    if (this.currentPhase === 'cryogenic') color = '#bde0fe';
    else if (this.currentPhase === 'toxic_miasma') color = '#70e000';
    else if (this.currentPhase === 'volcanic_thermal') color = '#ff5400';
    else if (this.currentPhase === 'gravitational_void') color = '#9d4edd';

    // Spread of 3 plasma orbs
    [-0.25, 0, 0.25].forEach(offset => {
      this.projectiles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle + offset) * speed,
        vy: Math.sin(angle + offset) * speed,
        radius: 8,
        color
      });
    });
  }

  // Called when player activates an Ephemeral Item Sacrifice detonation!
  public interruptWithSacrifice(effectName: string, damage: number = 85) {
    this.isChargingWipeAttack = false;
    this.shieldActive = false;
    this.isDowned = true;
    this.downedTimer = 7.0; // Downed for 7 seconds!
    this.health = Math.max(0, this.health - damage);
    this.projectiles = []; // Clear current hazards
    soundManager.playHit();

    if (this.health <= 0) {
      this.isAlive = false;
    }
  }

  public takeMeleeDamage(amount: number): boolean {
    if (this.shieldActive) {
      // Deflector shield absorbs standard hits
      soundManager.playRunicLock();
      return false;
    }

    this.health = Math.max(0, this.health - amount);
    soundManager.playHit();

    if (this.health <= 0) {
      this.isAlive = false;
      return true;
    }
    return false;
  }

  public draw(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    if (!this.isAlive) return;

    // Draw Telegraphed Orbital Celestial Beams
    for (const beam of this.telegraphedBeams) {
      const bx = beam.x - cameraX;
      const by = beam.y - cameraY;
      const progress = Math.min(1, Math.max(0, 1 - beam.timer / beam.maxTimer));

      ctx.save();
      // Outer warning ring
      ctx.strokeStyle = beam.color;
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(bx, by, beam.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner charging energy disk
      ctx.fillStyle = beam.color;
      ctx.globalAlpha = 0.22 + progress * 0.38;
      ctx.beginPath();
      ctx.arc(bx, by, beam.radius * progress, 0, Math.PI * 2);
      ctx.fill();

      // Vertical targeting laser column from sky
      ctx.strokeStyle = beam.color;
      ctx.lineWidth = 2 + progress * 4;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(bx, -100);
      ctx.lineTo(bx, by);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ IMPACTO CELESTIAL', bx, by - beam.radius - 6);
      ctx.restore();
    }

    const screenX = this.x - cameraX;
    const screenY = this.y - cameraY;

    ctx.save();

    // Shadow on ground
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(screenX, screenY + 55, 34, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Shield Dome
    if (this.shieldActive) {
      const shieldTime = Date.now() * 0.005;
      ctx.strokeStyle = `rgba(0, 245, 212, ${0.4 + Math.sin(shieldTime) * 0.2})`;
      ctx.fillStyle = 'rgba(0, 245, 212, 0.1)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(screenX, screenY, 52, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fill();
    }

    // Warning Crimson Ring if charging wipe attack
    if (this.isChargingWipeAttack) {
      ctx.strokeStyle = '#e63946';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(screenX, screenY, 65, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#ffbe0b';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`¡CANALIZANDO ANIQUILACIÓN! (${this.wipeChargeTimer.toFixed(1)}s)`, screenX, screenY - 65);
      ctx.fillText('¡DETONA UN ARTEFACTO EFÍMERO PARA DERRIBARLO!', screenX, screenY - 50);
    }

    // Alien Colossus Body (Bioluminescent biomechanical design)
    ctx.fillStyle = this.isDowned ? '#3a0ca3' : '#4361ee';
    ctx.beginPath();
    ctx.moveTo(screenX, screenY - 45);
    ctx.lineTo(screenX + 30, screenY - 10);
    ctx.lineTo(screenX + 20, screenY + 35);
    ctx.lineTo(screenX - 20, screenY + 35);
    ctx.lineTo(screenX - 30, screenY - 10);
    ctx.closePath();
    ctx.fill();

    // Floating Levitation Rings
    ctx.strokeStyle = '#f72585';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(screenX, screenY + 15, 36, 12, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Alien Central Core Eye
    const corePulse = Math.sin(Date.now() * 0.008);
    ctx.fillStyle = this.currentPhase === 'cryogenic' ? '#bde0fe' :
                    this.currentPhase === 'toxic_miasma' ? '#70e000' :
                    this.currentPhase === 'volcanic_thermal' ? '#ff5400' : '#f72585';
    ctx.beginPath();
    ctx.arc(screenX, screenY - 10, 10 + corePulse * 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw Projectiles
    for (const p of this.projectiles) {
      const px = p.x - cameraX;
      const py = p.y - cameraY;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(px, py, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Boss Name & Massive HP Bar
    const barW = 140;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(screenX - barW / 2, screenY - 75, barW, 8);
    ctx.fillStyle = '#f72585';
    ctx.fillRect(screenX - barW / 2, screenY - 75, (this.health / this.maxHealth) * barW, 8);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EL HERALDO DE LAS ESTRELLAS', screenX, screenY - 82);

    ctx.restore();
  }
}
