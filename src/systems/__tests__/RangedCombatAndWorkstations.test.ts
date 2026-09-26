import { describe, it, expect, beforeEach } from 'vitest';
import { Player } from '../../entities/Player';
import { Enemy } from '../../entities/Enemy';
import { Arrow } from '../../entities/Arrow';
import { particleSystem } from '../ParticleSystem';
import { SpriteAnimator } from '../../core/SpriteAnimator';
import { WorldObject } from '../../entities/WorldObject';
import { CRAFTING_RECIPES } from '../CraftingSystem';

describe('Fases 2.1, 2.2 y 2.3: Combate a Distancia, Partículas, Animaciones y Estaciones de Crafteo', () => {
  let player: Player;

  beforeEach(() => {
    player = new Player();
  });

  describe('Fase 2.1: Combate a Distancia con Arco y Flechas', () => {
    it('el jugador inicia con arco tribal y munición elemental en el inventario', () => {
      expect(player.hasItem('tribal_bow')).toBe(true);
      expect(player.getItemCount('flint_arrow')).toBe(20);
      expect(player.getItemCount('fire_arrow')).toBe(8);
      expect(player.getItemCount('frost_arrow')).toBe(8);
    });

    it('disparar el arco consume 1 flecha, 8 de estamina y genera un proyectil Arrow', () => {
      player.vitals.stamina = 100;
      const initialFire = player.getItemCount('fire_arrow');

      // shootBow prioriza flechas elementales de fuego si están disponibles
      const arrow = player.shootBow(0); // Disparo hacia la derecha (0 rad)

      expect(arrow).not.toBeNull();
      expect(arrow instanceof Arrow).toBe(true);
      expect(arrow!.type).toBe('fire');
      expect(player.getItemCount('fire_arrow')).toBe(initialFire - 1);
      expect(player.vitals.stamina).toBe(92);
      expect(player.bowCooldown).toBeGreaterThan(0);
    });

    it('disparar con solo flechas de sílex consume flint_arrow', () => {
      player.removeItem('fire_arrow', 8);
      player.removeItem('frost_arrow', 8);
      player.vitals.stamina = 100;
      const initialFlint = player.getItemCount('flint_arrow');

      const arrow = player.shootBow(0);
      expect(arrow).not.toBeNull();
      expect(arrow!.type).toBe('flint');
      expect(player.getItemCount('flint_arrow')).toBe(initialFlint - 1);
    });

    it('no debe permitir disparar sin estamina suficiente (< 8)', () => {
      player.vitals.stamina = 5;
      const arrow = player.shootBow(0);
      expect(arrow).toBeNull();
    });

    it('no debe permitir disparar consecutivamente antes de que termine el cooldown', () => {
      player.vitals.stamina = 100;
      const first = player.shootBow(0);
      expect(first).not.toBeNull();

      const second = player.shootBow(0);
      expect(second).toBeNull();
    });

    it('la flecha avanza en el espacio y detecta colisión con enemigos', () => {
      const arrow = new Arrow(100, 100, 0, 'flint'); // moving right
      const enemy = new Enemy('frost_beast', 140, 100);
      const initialEnemyHealth = enemy.health;

      // Update arrow trajectory towards enemy with collision
      arrow.update(0.1, [enemy]);

      expect(enemy.health).toBeLessThan(initialEnemyHealth);
      expect(arrow.isAlive).toBe(false);
    });

    it('las flechas de escarcha congelan y ralentizan al enemigo', () => {
      const frostArrow = new Arrow(100, 100, 0, 'frost');
      const enemy = new Enemy('frost_beast', 105, 100);

      const hit = frostArrow.checkCollisionWithEnemy(enemy);
      expect(hit).toBe(true);
      expect(enemy.isFrozen).toBe(true);
      expect(enemy.freezeTimer).toBeGreaterThan(0);
    });

    it('las flechas de fuego prenden en llamas al enemigo y aplican daño quemante', () => {
      const fireArrow = new Arrow(100, 100, 0, 'fire');
      const enemy = new Enemy('stalking_wolf', 105, 100);

      const hit = fireArrow.checkCollisionWithEnemy(enemy);
      expect(hit).toBe(true);
      expect(enemy.isBurning).toBe(true);
      expect(enemy.burnTimer).toBeGreaterThan(0);
    });
  });

  describe('Fase 2.2: Sistema de Partículas y Animaciones 2D', () => {
    it('el ParticleSystem genera partículas de impacto, sangre, chispas y polvo', () => {
      particleSystem.clear();
      expect(particleSystem.getParticles().length).toBe(0);

      particleSystem.spawnHitBlood(200, 200);
      expect(particleSystem.getParticles().length).toBeGreaterThan(0);

      const countAfterBlood = particleSystem.getParticles().length;
      particleSystem.spawnSparks(200, 200, '#ffaa00');
      expect(particleSystem.getParticles().length).toBeGreaterThan(countAfterBlood);

      particleSystem.spawnDashDust(200, 200);
      particleSystem.spawnElementalBurst(200, 200, 'frost');
      expect(particleSystem.getParticles().length).toBeGreaterThan(15);
    });

    it('las partículas decaen con el paso del tiempo y son eliminadas', () => {
      particleSystem.clear();
      particleSystem.spawnSparks(100, 100, '#ffffff', 5);
      expect(particleSystem.getParticles().length).toBe(5);

      // Simular tiempo suficiente para expiración de vida útil
      particleSystem.update(1.5);
      expect(particleSystem.getParticles().length).toBe(0);
    });

    it('SpriteAnimator cicla cuadros y calcula oscilación orgánica', () => {
      const animator = new SpriteAnimator();
      animator.setState('walk', 4, 0.1);
      expect(animator.getCurrentFrame()).toBe(0);

      animator.update(0.12);
      expect(animator.getCurrentFrame()).toBe(1);

      const offset = animator.getProceduralOffset();
      expect(typeof offset.bobY).toBe('number');
      expect(typeof offset.tiltAngle).toBe('number');
    });
  });

  describe('Fase 2.3: Estaciones de Trabajo y Crafteo Expandido', () => {
    it('WorldObject inicializa correctamente las 5 nuevas estaciones tribales', () => {
      const workbench = new WorldObject('workbench', 100, 200);
      const anvil = new WorldObject('anvil', 150, 250);
      const tanner = new WorldObject('tanner', 200, 300);
      const alchemy = new WorldObject('alchemy_station', 250, 350);
      const trap = new WorldObject('bear_trap', 300, 400);

      expect(workbench.type).toBe('workbench');
      expect(workbench.interactionText).toContain('Mesa de Trabajo');

      expect(anvil.type).toBe('anvil');
      expect(anvil.interactionText).toContain('Yunque Primitivo');

      expect(tanner.type).toBe('tanner');
      expect(tanner.interactionText).toContain('Bastidor de Cuero');

      expect(alchemy.type).toBe('alchemy_station');
      expect(alchemy.interactionText).toContain('Alambique');

      expect(trap.type).toBe('bear_trap');
      expect(trap.interactionText).toContain('Trampa para Osos');
    });

    it('existen recetas de crafteo para arco tribal, flechas, trampa y pociones', () => {
      const recipeIds = CRAFTING_RECIPES.map(r => r.outputItemId);

      expect(recipeIds).toContain('tribal_bow');
      expect(recipeIds).toContain('flint_arrow');
      expect(recipeIds).toContain('fire_arrow');
      expect(recipeIds).toContain('frost_arrow');
      expect(recipeIds).toContain('bear_trap');
      expect(recipeIds).toContain('expanded_backpack');
      expect(recipeIds).toContain('antidote_potion');
      expect(recipeIds).toContain('thermal_tincture');
    });

    it('el uso de la mochila expandida amplía el inventario a 24 ranuras', () => {
      expect(player.maxInventorySlots).toBe(16);

      player.addItem('expanded_backpack', 1);
      const used = player.useItem('expanded_backpack');

      expect(used).toBe(true);
      expect(player.maxInventorySlots).toBe(24);
      expect(player.hasItem('expanded_backpack')).toBe(false);
    });
  });
});
