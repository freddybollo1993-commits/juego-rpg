import { describe, it, expect, beforeEach } from 'vitest';
import { Player } from '../../entities/Player';
import { Enemy } from '../../entities/Enemy';
import { QuestSystem } from '../QuestSystem';

describe('Paso 1: Combate Táctico, Esquiva (I-Frames), Telegrafiado y Sistema de Misiones', () => {
  let player: Player;
  let questSys: QuestSystem;

  beforeEach(() => {
    player = new Player();
    questSys = new QuestSystem();
  });

  describe('Dodge / Roll con I-Frames en Player', () => {
    it('debe activar el estado de esquiva y consumir 18 de estamina', () => {
      player.vitals.stamina = 100;
      const success = player.dodge(1, 0);

      expect(success).toBe(true);
      expect(player.vitals.stamina).toBe(82);
      expect(player.isDashing).toBe(true);
      expect(player.isInvulnerable).toBe(true);
      expect(player.dashTimer).toBeGreaterThan(0);
      expect(player.dashCooldown).toBeGreaterThan(0);
      expect(player.dashVx).toBeGreaterThan(0);
    });

    it('no debe permitir esquivar si no tiene suficiente estamina (< 18)', () => {
      player.vitals.stamina = 10;
      const success = player.dodge(0, 1);

      expect(success).toBe(false);
      expect(player.isDashing).toBe(false);
      expect(player.isInvulnerable).toBe(false);
    });

    it('no debe permitir esquivar consecutivamente durante el cooldown', () => {
      player.vitals.stamina = 100;
      const firstDodge = player.dodge(1, 0);
      expect(firstDodge).toBe(true);

      const secondDodge = player.dodge(1, 0);
      expect(secondDodge).toBe(false);
    });

    it('debe restaurar la vulnerabilidad una vez expira el temporizador del dash', () => {
      player.vitals.stamina = 100;
      player.dodge(1, 0);
      expect(player.isInvulnerable).toBe(true);

      // Simular paso del tiempo mayor al dashTimer (0.24s)
      player.update(0.3);

      expect(player.isDashing).toBe(false);
      expect(player.isInvulnerable).toBe(false);
    });
  });

  describe('Ataques Telegrafiados e Inmunidad I-Frames', () => {
    it('el enemigo inicia telegrafiado al estar cerca antes de golpear', () => {
      const enemy = new Enemy('stalking_wolf', 400, 800);
      player.x = 420;
      player.y = 800;

      // Un tick de actualización
      enemy.update(player, 0.016);

      expect(enemy.isTelegraphing).toBe(true);
      expect(enemy.telegraphTarget).not.toBeNull();
      expect(enemy.telegraphTimer).toBeGreaterThan(0);
    });

    it('el jugador esquiva el daño si está en i-frame cuando termina el telegrafiado', () => {
      const enemy = new Enemy('stalking_wolf', 400, 800);
      player.x = 405;
      player.y = 800;
      player.vitals.health = 90;

      // Iniciar esquiva
      player.dodge(1, 0);
      expect(player.isInvulnerable).toBe(true);

      // Forzar que el enemigo esté en telegrafiado por detonar
      enemy.isTelegraphing = true;
      enemy.telegraphTarget = { x: player.x, y: player.y, radius: 46 };
      enemy.telegraphTimer = 0.01;

      // Actualizar tick que concluye el telegrafiado
      enemy.update(player, 0.02);

      // El jugador no recibió daño gracias a sus i-frames
      expect(player.vitals.health).toBe(90);
      expect(enemy.justDodgedFeedbackTimer).toBeGreaterThan(0);
    });

    it('el jugador recibe daño si NO está en esquiva cuando concluye el telegrafiado', () => {
      const enemy = new Enemy('stalking_wolf', 400, 800);
      player.x = 405;
      player.y = 800;
      player.vitals.health = 90;
      player.isInvulnerable = false;

      enemy.isTelegraphing = true;
      enemy.telegraphTarget = { x: player.x, y: player.y, radius: 46 };
      enemy.telegraphTimer = 0.01;

      enemy.update(player, 0.02);

      expect(player.vitals.health).toBeLessThan(90);
    });
  });

  describe('QuestSystem & Rastreador de Misiones', () => {
    it('debe inicializar con la misión del prólogo activa', () => {
      const active = questSys.getActiveQuest();
      expect(active).not.toBeNull();
      expect(active?.id).toBe('prologue_survival');
      expect(active?.isCompleted).toBe(false);
    });

    it('debe registrar el progreso de objetivos y completar misiones progresivamente', () => {
      // Recolectar 3 ramas
      questSys.updateObjective('prologue_survival', 'gather_branches', 3);
      const quest = questSys.quests.find(q => q.id === 'prologue_survival')!;
      const objBranches = quest.objectives.find(o => o.id === 'gather_branches')!;
      expect(objBranches.isCompleted).toBe(true);
      expect(quest.isCompleted).toBe(false);

      // Encender fogata e inspeccionar monolito
      questSys.updateObjective('prologue_survival', 'light_campfire', 1);
      questSys.updateObjective('prologue_survival', 'examine_monolith', 1);

      expect(quest.isCompleted).toBe(true);

      // La siguiente misión activa debe ser la tribal
      const nextActive = questSys.getActiveQuest();
      expect(nextActive?.id).toBe('tribal_initiation');
    });

    it('debe serializar y deserializar el progreso correctamente', () => {
      questSys.updateObjective('prologue_survival', 'gather_branches', 2);
      const serialized = questSys.serialize();

      const newSys = new QuestSystem();
      newSys.deserialize(serialized);

      const active = newSys.getActiveQuest();
      const objBranches = active?.objectives.find(o => o.id === 'gather_branches');
      expect(objBranches?.current).toBe(2);
    });
  });
});
