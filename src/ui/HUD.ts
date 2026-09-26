// HUD.ts - Mobile HUD, Runic Skill Slots, Vitals Bars, and Dedicated Ephemeral Artifact Frame with Sacrifice Ring (GDD Sec. 6 & 7.5-7.7)

import { Player } from '../entities/Player';
import { ABILITIES_DATA } from '../data/abilities';
import { ITEMS_CATALOG, EphemeralArtifact } from '../data/items';
import { RegionData } from '../data/regions';
import { questSystem } from '../systems/QuestSystem';

export class HUD {
  public onSacrificeClick?: () => void;
  public onCodexClick?: () => void;
  public onInventoryClick?: () => void;
  public onAbilityClick?: (abilityId: string) => void;
  public onRadialToggle?: () => void;
  public onTestWorldToggle?: () => void;

  public draw(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    player: Player,
    currentRegion: RegionData,
    _isNearCampfire: boolean,
    interactionPrompt: string | null
  ) {
    ctx.save();

    // 1. Top Bar: Region Name, Title Tag & Chokepoint Compass Arrow
    this.drawTopBar(ctx, width, currentRegion, player);

    // 2. Top Left: Vital Bars & Temperature Gauge
    this.drawVitals(ctx, player);

    // 3. Top Right: Active Quest Tracker (GDD Sec. 1-10)
    this.drawQuestTracker(ctx, width);

    // 4. Bottom Right: Runic Abilities Slots (GDD Sec. 6)
    this.drawRunicAbilitySlots(ctx, width, height, player);

    // 5. Bottom Center-Right: Dedicated Ephemeral Artifact Slot (GDD Sec. 7.6 & 7.7)
    this.drawEphemeralArtifactSlot(ctx, width, height, player);

    // 6. Interaction Prompt in center
    if (interactionPrompt) {
      this.drawInteractionPrompt(ctx, width, height, interactionPrompt);
    }

    ctx.restore();
  }

  private drawTopBar(ctx: CanvasRenderingContext2D, width: number, region: RegionData, player: Player) {
    const boxW = 360;
    const boxX = (width - boxW) / 2;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(boxX, 8, boxW, 40);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX, 8, boxW, 40);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(region.name, width / 2, 24);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px sans-serif';
    ctx.fillText(`${region.titleTag} • ${region.settlementName}`, width / 2, 38);

    // Chokepoint Compass Indicator Arrow
    if (region.chokepoints.length > 0) {
      const closestCp = region.chokepoints[0];
      const dx = closestCp.x - player.x;
      const dy = closestCp.y - player.y;
      const angle = Math.atan2(dy, dx);

      ctx.save();
      ctx.translate(boxX + boxW - 22, 28);
      ctx.rotate(angle);
      ctx.fillStyle = '#d4af37';
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(-4, -5);
      ctx.lineTo(-2, 0);
      ctx.lineTo(-4, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  private drawQuestTracker(ctx: CanvasRenderingContext2D, width: number) {
    const quest = questSystem.getActiveQuest();
    if (!quest) return;

    const panelW = 240;
    const panelX = width - panelW - 14;
    const panelY = 56;

    const pendingObjectives = quest.objectives.filter(o => !o.isCompleted);
    const panelH = 28 + Math.max(1, Math.min(2, pendingObjectives.length)) * 16 + 8;

    ctx.save();
    // Dark glass background with golden runic border
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(panelX, panelY, panelW, panelH);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX, panelY, panelW, panelH);

    // Quest Title Tag
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`📜 ${quest.title}`, panelX + 8, panelY + 16);

    // Objectives list
    let curY = panelY + 34;
    if (pendingObjectives.length === 0) {
      ctx.fillStyle = '#4ade80';
      ctx.font = 'italic 10px sans-serif';
      ctx.fillText('✓ ¡Misión Lista para Completar!', panelX + 10, curY);
    } else {
      for (const obj of pendingObjectives.slice(0, 2)) {
        ctx.fillStyle = '#f1f5f9';
        ctx.font = '10px sans-serif';
        const progressText = obj.target > 1 ? ` (${obj.current}/${obj.target})` : '';
        const fullText = `• ${obj.description}${progressText}`;
        const truncated = fullText.length > 36 ? fullText.substring(0, 34) + '...' : fullText;
        ctx.fillText(truncated, panelX + 8, curY);
        curY += 16;
      }
    }

    ctx.restore();
  }

  private drawVitals(ctx: CanvasRenderingContext2D, player: Player) {
    const startX = 14;
    let startY = 16;
    const barW = 120;
    const barH = 8;
    const spacing = 14;

    const vitals = player.vitals;

    // Background panel
    ctx.fillStyle = 'rgba(10, 15, 25, 0.8)';
    ctx.fillRect(startX - 6, startY - 8, barW + 58, 108);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(startX - 6, startY - 8, barW + 58, 108);

    // Health (Salud)
    this.drawBar(ctx, startX, startY, barW, barH, vitals.health, 100, '#ef4444', '❤️ Vida');
    startY += spacing;

    // Stamina (Energía)
    this.drawBar(ctx, startX, startY, barW, barH, vitals.stamina, 100, '#22c55e', '⚡ Estam.');
    startY += spacing;

    // Hunger (Hambre)
    this.drawBar(ctx, startX, startY, barW, barH, vitals.hunger, 100, '#eab308', '🍖 Hambre');
    startY += spacing;

    // Thirst (Sed / Hidratación)
    this.drawBar(ctx, startX, startY, barW, barH, vitals.thirst, 100, '#06b6d4', '💧 Sed');
    startY += spacing;

    // Toxicity (Toxicidad)
    if (vitals.toxicity > 0) {
      this.drawBar(ctx, startX, startY, barW, barH, vitals.toxicity, 100, '#a855f7', '☣️ Toxina');
      startY += spacing;
    }

    // Body Temperature Gauge
    this.drawTemperatureGauge(ctx, startX, startY, barW, vitals.bodyTemp);

    // Dodge Roll status indicator
    const dodgeReady = player.dashCooldown <= 0 && vitals.stamina >= 18;
    ctx.fillStyle = player.isDashing ? '#38bdf8' : dodgeReady ? '#d4af37' : '#64748b';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'right';
    const dodgeLabel = player.isDashing ? '¡RODANDO! 💨' : dodgeReady ? '💨 Rodar [Space]' : '💨 Recargando...';
    ctx.fillText(dodgeLabel, startX + barW + 48, startY + 16);
  }

  private drawBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, val: number, max: number, color: string, label: string) {
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, x, y + h - 1);

    const barX = x + 48;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(barX, y, w, h);

    const fillW = Math.max(0, Math.min(w, (val / max) * w));
    ctx.fillStyle = color;
    ctx.fillRect(barX, y, fillW, h);
  }

  private drawTemperatureGauge(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, temp: number) {
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🌡️ Temp', x, y + 8);

    const barX = x + 48;
    const grad = ctx.createLinearGradient(barX, y, barX + w, y);
    grad.addColorStop(0, '#38bdf8'); // Cold
    grad.addColorStop(0.5, '#10b981'); // Neutral (50)
    grad.addColorStop(1, '#f97316'); // Heat

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(barX, y, w, 8);
    ctx.fillStyle = grad;
    ctx.fillRect(barX, y, w, 8);

    const needleX = barX + (Math.max(0, Math.min(100, temp)) / 100) * w;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(needleX - 1.5, y - 2, 3, 12);
  }

  private drawRunicAbilitySlots(ctx: CanvasRenderingContext2D, width: number, height: number, player: Player) {
    const maxSlots = player.unlockedFourthSkillSlot ? 4 : player.maxEquippedSlots;
    const slotRadius = 22;
    const spacing = 52;
    const startX = width - (maxSlots * spacing) - 16;
    const startY = height - 42;

    for (let i = 0; i < maxSlots; i++) {
      const x = startX + i * spacing + slotRadius;
      const y = startY;

      const abilityId = player.equippedAbilities[i];
      const ability = abilityId ? ABILITIES_DATA[abilityId] : null;

      ctx.fillStyle = ability ? 'rgba(30, 41, 59, 0.85)' : 'rgba(15, 23, 42, 0.5)';
      ctx.beginPath();
      ctx.arc(x, y, slotRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = ability ? (ability.id === 'canopy_stride' && player.canopyStrideActive ? '#22c55e' : '#d4af37') : '#475569';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, slotRadius, 0, Math.PI * 2);
      ctx.stroke();

      if (ability) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ability.runeIcon, x, y - 1);

        if (ability.id === 'canopy_stride' && player.canopyStrideActive) {
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.arc(x + 14, y - 14, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = '#64748b';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Vacío', x, y);
      }
    }
  }

  private drawEphemeralArtifactSlot(ctx: CanvasRenderingContext2D, width: number, height: number, player: Player) {
    const slotX = width - 48;
    const slotY = height - 105;
    const radius = 28;

    const activeEphem = player.activeEphemeral;

    ctx.fillStyle = activeEphem ? 'rgba(15, 23, 42, 0.9)' : 'rgba(15, 23, 42, 0.4)';
    ctx.beginPath();
    ctx.arc(slotX, slotY, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = activeEphem ? '#d4af37' : '#475569';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(slotX, slotY, radius, 0, Math.PI * 2);
    ctx.stroke();

    if (activeEphem) {
      const item = ITEMS_CATALOG[activeEphem.itemId] as EphemeralArtifact;

      const progress = Math.max(0, activeEphem.timeRemaining / activeEphem.totalDuration);
      ctx.strokeStyle = progress < 0.1 ? '#ef4444' : '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(slotX, slotY, radius - 2, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      ctx.stroke();

      if (!activeEphem.isSacrificeLocked && activeEphem.sacrificeWindowRemaining > 0) {
        const pulse = Math.sin(Date.now() * 0.015) * 3;
        const windowFrac = activeEphem.sacrificeWindowRemaining / 10.0;

        ctx.strokeStyle = `rgba(239, 68, 68, ${0.7 + Math.sin(Date.now() * 0.02) * 0.3})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(slotX, slotY, radius + 6 + pulse, -Math.PI / 2, -Math.PI / 2 + windowFrac * Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`¡SACRIFICIO! ${activeEphem.sacrificeWindowRemaining.toFixed(1)}s`, slotX, slotY - 38);
      } else {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('MODO FIJO', slotX, slotY - 34);
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = '22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.icon, slotX, slotY);

      const mins = Math.floor(activeEphem.timeRemaining / 60);
      const secs = Math.floor(activeEphem.timeRemaining % 60);
      const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(timeStr, slotX, slotY + radius + 4);
    } else {
      ctx.fillStyle = '#64748b';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Reliquia', slotX, slotY - 6);
      ctx.fillText('Inerte', slotX, slotY + 6);
    }
  }

  private drawInteractionPrompt(ctx: CanvasRenderingContext2D, width: number, height: number, text: string) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(width / 2 - 160, height - 75, 320, 32);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1;
    ctx.strokeRect(width / 2 - 160, height - 75, 320, 32);

    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height - 59);
  }
}
