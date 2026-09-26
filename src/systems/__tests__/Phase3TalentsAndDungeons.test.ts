import { describe, it, expect, beforeEach } from 'vitest';
import { Player } from '../../entities/Player';
import { Enemy } from '../../entities/Enemy';
import { TalentSystem } from '../TalentSystem';
import { dayNightCycle } from '../DayNightCycle';
import { WorldObject } from '../../entities/WorldObject';
import { CRAFTING_RECIPES } from '../CraftingSystem';
import { ITEMS_CATALOG } from '../../data/items';

describe('Fase 3: Progresión de Personaje, Ciclo Día/Noche y Mazmorra Precursora', () => {
  let player: Player;
  let talentSys: TalentSystem;

  beforeEach(() => {
    player = new Player();
    talentSys = new TalentSystem();
    dayNightCycle.setTimeOfDay(12.0); // Reset to midday
  });

  describe('Fase 3.1: Progresión de Personaje, XP y Árbol de Talentos', () => {
    it('el jugador inicia en nivel 1 y sube de nivel al acumular suficiente XP', () => {
      expect(player.level).toBe(1);
      expect(player.xp).toBe(0);
      expect(player.talentPoints).toBe(0);

      // Ganar 120 XP (umbral inicial es 100)
      const leveledUp = player.gainXP(120);

      expect(leveledUp).toBe(true);
      expect(player.level).toBe(2);
      expect(player.talentPoints).toBe(1);
      expect(player.xp).toBe(20);
      expect(player.xpToNextLevel).toBeGreaterThan(100);
    });

    it('el sistema de talentos respeta prerrequisitos de nivel/tier', () => {
      // Intentar desbloquear tier 2 sin tener tier 1
      const canUnlockTier2 = talentSys.canUnlock('hunter_retrieval', 1);
      expect(canUnlockTier2).toBe(false);

      // Desbloquear tier 1
      const unlockTier1 = talentSys.unlockTalent('hunter_archery', 1);
      expect(unlockTier1).toBe(true);
      expect(talentSys.hasTalent('hunter_archery')).toBe(true);

      // Ahora tier 2 es desbloqueable
      const canUnlockTier2Now = talentSys.canUnlock('hunter_retrieval', 1);
      expect(canUnlockTier2Now).toBe(true);
    });

    it('los talentos de arquero incrementan daño y velocidad de flechas', () => {
      expect(player.talentSystem.getArcheryDamageMultiplier()).toBe(1.0);

      player.talentPoints = 1;
      player.talentSystem.unlockTalent('hunter_archery', player.talentPoints);

      expect(player.talentSystem.getArcheryDamageMultiplier()).toBe(1.25);
      expect(player.talentSystem.getArrowSpeedMultiplier()).toBe(1.15);
    });

    it('los talentos de guerrero aumentan el daño cuerpo a cuerpo y reducen coste de estamina', () => {
      const initialMeleeDmg = player.getMeleeDamage();
      player.talentPoints = 2;

      player.talentSystem.unlockTalent('warrior_strike', 1);
      expect(player.getMeleeDamage()).toBe(initialMeleeDmg + 15);

      player.talentSystem.unlockTalent('warrior_resilience', 1);
      expect(player.talentSystem.getStaminaCostReduction()).toBe(0.25);
    });

    it('la Esquiva Perfecta activa Bullet-Time y regenera estamina al rodar cerca de un enemigo', () => {
      player.talentPoints = 3;
      player.talentSystem.unlockTalent('warrior_strike', 1);
      player.talentSystem.unlockTalent('warrior_resilience', 1);
      player.talentSystem.unlockTalent('warrior_perfect_dodge', 1);

      expect(player.talentSystem.hasPerfectDodge()).toBe(true);

      const attackingEnemy = new Enemy('stalking_wolf', player.x + 30, player.y);
      attackingEnemy.isTelegraphing = true;

      player.vitals.stamina = 50;
      const dodged = player.dodge(1, 0, [attackingEnemy]);

      expect(dodged).toBe(true);
      expect(player.isBulletTime).toBe(true);
      expect(player.bulletTimeTimer).toBeGreaterThan(0);
      expect(player.vitals.stamina).toBeGreaterThan(50); // Regeneró estamina
    });
  });

  describe('Fase 3.2: Ciclo Día / Noche y Supervivencia con Antorcha', () => {
    it('el ciclo identifica correctamente amanecer, mediodía, atardecer y noche', () => {
      dayNightCycle.setTimeOfDay(6.5);
      expect(dayNightCycle.getPhase()).toBe('dawn');
      expect(dayNightCycle.isNight()).toBe(false);

      dayNightCycle.setTimeOfDay(12.0);
      expect(dayNightCycle.getPhase()).toBe('day');
      expect(dayNightCycle.getAmbientDarkness()).toBe(0.0);

      dayNightCycle.setTimeOfDay(19.0);
      expect(dayNightCycle.getPhase()).toBe('dusk');

      dayNightCycle.setTimeOfDay(23.0);
      expect(dayNightCycle.getPhase()).toBe('night');
      expect(dayNightCycle.isNight()).toBe(true);
      expect(dayNightCycle.getAmbientDarkness()).toBeGreaterThan(0.7);
      expect(dayNightCycle.getXPMultiplier()).toBe(1.35); // Bono nocturno
    });

    it('usar una antorcha equipa la fuente de luz y activa el temporizador', () => {
      expect(player.isHoldingTorch).toBe(false);
      expect(player.hasItem('torch')).toBe(true);

      const used = player.useItem('torch');
      expect(used).toBe(true);
      expect(player.isHoldingTorch).toBe(true);
      expect(player.torchTimer).toBe(300);
      expect(player.hasItem('torch')).toBe(false);
    });

    it('consumir una Orquídea de Luna cura salud y estamina', () => {
      player.addItem('night_orchid', 1);
      player.vitals.health = 50;
      player.vitals.stamina = 50;

      const used = player.useItem('night_orchid');
      expect(used).toBe(true);
      expect(player.vitals.health).toBe(90);
      expect(player.vitals.stamina).toBe(80);
    });
  });

  describe('Fase 3.3: Mazmorra de Ruinas Precursoras y Mini-Jefe de Élite', () => {
    it('existen recetas para antorcha y llave precursora', () => {
      const ids = CRAFTING_RECIPES.map(r => r.id);
      expect(ids).toContain('craft_torch');
      expect(ids).toContain('craft_precursor_key');
    });

    it('los pedestales de glifos se activan y otorgan XP', () => {
      const pedestal = new WorldObject('precursor_pedestal', 500, 500);
      expect(pedestal.isActivated).toBe(false);

      const msg = pedestal.interact(player);
      expect(msg).toContain('activado');
      expect(pedestal.isActivated).toBe(true);
      expect(player.xp).toBeGreaterThan(0);
    });

    it('el cofre ancestral requiere la llave de glifos y entrega botín mítico', () => {
      const chest = new WorldObject('precursor_chest', 500, 500);

      // Sin llave
      const msgLocked = chest.interact(player);
      expect(msgLocked).toContain('sellado');
      expect(chest.isDepleted).toBe(false);

      // Con llave precursora
      player.addItem('precursor_key', 1);
      const msgUnlocked = chest.interact(player);
      expect(msgUnlocked).toContain('abierto');
      expect(chest.isDepleted).toBe(true);
      expect(player.hasItem('precursor_core')).toBe(true);
      expect(player.getItemCount('ancient_battery')).toBe(2);
    });

    it('el Gólem Guardián Precursor es un enemigo élite acorazado con alto XP y botín raro', () => {
      const golem = new Enemy('precursor_golem', 600, 600);
      expect(golem.isElite).toBe(true);
      expect(golem.eliteModifier).toBe('armored');
      expect(golem.maxHealth).toBe(180);
      expect(golem.xpReward).toBe(140);

      // Derrotar al golem otorga XP al jugador
      const initialXP = player.xp;
      golem.takeDamage(200, player);

      expect(golem.isAlive).toBe(false);
      expect(player.xp).toBeGreaterThan(initialXP);
      expect(player.hasItem('precursor_core')).toBe(true);
    });
  });
});
