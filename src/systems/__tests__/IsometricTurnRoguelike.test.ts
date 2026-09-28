import { describe, it, expect, beforeEach } from 'vitest';
import { IsometricGrid } from '../../core/IsometricGrid';
import { TurnSystem } from '../../core/TurnSystem';
import { Player } from '../../entities/Player';
import { Enemy } from '../../entities/Enemy';
import { WorldObject } from '../../entities/WorldObject';
import { REGIONS_DATA } from '../../data/regions';

describe('2.5D Isometric Engine & Turn-Based Roguelike System (The Wild Darkness style)', () => {
  let grid: IsometricGrid;
  let turnSystem: TurnSystem;
  let player: Player;

  beforeEach(() => {
    grid = new IsometricGrid(24, 24);
    turnSystem = new TurnSystem();
    player = new Player();
    player.gx = 12;
    player.gy = 12;
    const iso = IsometricGrid.gridToScreen(12, 12);
    player.x = iso.x;
    player.y = iso.y;
  });

  it('correctly maps 2.5D grid coordinates to screen pixel positions and back with 72x36 ratio', () => {
    const gx = 10;
    const gy = 12;
    const screen = IsometricGrid.gridToScreen(gx, gy, 0);

    expect(screen.x).toBe((10 - 12) * (IsometricGrid.TILE_WIDTH / 2)); // -72
    expect(screen.y).toBe((10 + 12) * (IsometricGrid.TILE_HEIGHT / 2)); // 396

    const back = IsometricGrid.screenToGrid(screen.x, screen.y);
    expect(back.gx).toBe(gx);
    expect(back.gy).toBe(gy);
  });

  it('generates 2.5D biome slabs with valid elevations and boundaries', () => {
    grid.generateForRegion(REGIONS_DATA['beach']);

    expect(grid.tiles.length).toBe(24);
    expect(grid.tiles[0].length).toBe(24);

    // Center tile should be passable
    expect(grid.tiles[12][12].passable).toBe(true);

    // Perimeter boundary tile should be impassable
    expect(grid.tiles[0][0].passable).toBe(false);
  });

  it('updates Fog of War revealing radius around player and lit campfires', () => {
    grid.generateForRegion(REGIONS_DATA['beach']);

    // Initially all unexplored
    expect(grid.tiles[12][12].visibility).toBe(0);

    // Reveal 5 tiles around player at (12, 12)
    grid.updateFogOfWar(12, 12, 5, [{ gx: 18, gy: 18, isLit: true }]);

    // Player tile is visible
    expect(grid.tiles[12][12].visibility).toBe(2);

    // Distant tile without campfire remains unexplored
    expect(grid.tiles[2][2].visibility).toBe(0);

    // Campfire tile at (18, 18) is visible
    expect(grid.tiles[18][18].visibility).toBe(2);
  });

  it('advances turns, depletes hunger/thirst and recovers stamina when resting', () => {
    grid.generateForRegion(REGIONS_DATA['beach']);
    player.vitals.hunger = 50;
    player.vitals.thirst = 50;
    player.vitals.stamina = 40;

    // Normal Step
    turnSystem.advanceTurn(player, [], null, [], REGIONS_DATA['beach'], grid, false);

    expect(turnSystem.turnCount).toBe(2);
    expect(player.vitals.hunger).toBeLessThan(50);
    expect(player.vitals.thirst).toBeLessThan(50);

    // Rest Step (⏳ Wait turn / Guard)
    const prevStamina = player.vitals.stamina;
    turnSystem.advanceTurn(player, [], null, [], REGIONS_DATA['beach'], grid, true);

    expect(turnSystem.turnCount).toBe(3);
    expect(player.vitals.stamina).toBeGreaterThan(prevStamina);
    expect(player.isGuarding).toBe(true);
  });

  it('synchronously moves alert enemies towards player strictly 1 tile at a time and attacks when adjacent', () => {
    grid.generateForRegion(REGIONS_DATA['beach']);
    player.vitals.health = 80;

    // Enemy placed 2 tiles away at (12, 14)
    const wolfIso = IsometricGrid.gridToScreen(12, 14);
    const wolf = new Enemy('stalking_wolf', wolfIso.x, wolfIso.y, 12, 14);
    const enemies = [wolf];

    // Turn 1: Wolf moves 1 tile closer to (12, 13)
    turnSystem.advanceTurn(player, enemies, null, [], REGIONS_DATA['beach'], grid, false);
    expect(wolf.gx).toBe(12);
    expect(wolf.gy).toBe(13);
    expect(player.vitals.health).toBe(80); // not adjacent yet, no attack

    // Turn 2: Wolf is adjacent (12, 13) to player (12, 12), so it attacks!
    turnSystem.advanceTurn(player, enemies, null, [], REGIONS_DATA['beach'], grid, false);
    expect(player.vitals.health).toBeLessThan(80);
    expect(turnSystem.floatingTexts.length).toBeGreaterThan(0);
  });

  it('applies 50% damage reduction when player is in Guard stance', () => {
    grid.generateForRegion(REGIONS_DATA['beach']);
    player.vitals.health = 100;
    player.isGuarding = true;

    // Enemy placed adjacent at (12, 13)
    const wolfIso = IsometricGrid.gridToScreen(12, 13);
    const wolf = new Enemy('stalking_wolf', wolfIso.x, wolfIso.y, 12, 13);
    const baseDamage = wolf.damage;

    // Advance turn while resting/guarding
    turnSystem.advanceTurn(player, [wolf], null, [], REGIONS_DATA['beach'], grid, true);

    const damageTaken = 100 - player.vitals.health;
    expect(damageTaken).toBe(Math.round(baseDamage * 0.5));
  });

  it('prevents enemies from stacking on the same tile (strictly 1 entity per tile)', () => {
    grid.generateForRegion(REGIONS_DATA['beach']);

    // Two wolves trying to approach player at (12, 12)
    const wolf1Iso = IsometricGrid.gridToScreen(12, 13);
    const wolf1 = new Enemy('stalking_wolf', wolf1Iso.x, wolf1Iso.y, 12, 13);

    const wolf2Iso = IsometricGrid.gridToScreen(12, 14);
    const wolf2 = new Enemy('stalking_wolf', wolf2Iso.x, wolf2Iso.y, 12, 14);

    const enemies = [wolf1, wolf2];
    turnSystem.advanceTurn(player, enemies, null, [], REGIONS_DATA['beach'], grid, false);

    // Wolf 1 was at (12, 13) adjacent to player and attacked.
    // Wolf 2 was at (12, 14) and could not step into (12, 13) because wolf 1 occupies it!
    expect(wolf1.gx !== wolf2.gx || wolf1.gy !== wolf2.gy).toBe(true);
  });

  it('freezes enemy actions during freeze status turns', () => {
    grid.generateForRegion(REGIONS_DATA['beach']);
    player.vitals.health = 100;

    const wolfIso = IsometricGrid.gridToScreen(12, 13);
    const wolf = new Enemy('stalking_wolf', wolfIso.x, wolfIso.y, 12, 13);
    wolf.freezeTurns = 2;

    // Turn 1: Wolf is frozen, does not attack
    turnSystem.advanceTurn(player, [wolf], null, [], REGIONS_DATA['beach'], grid, false);
    expect(wolf.freezeTurns).toBe(1);
    expect(player.vitals.health).toBe(100); // No damage taken

    // Turn 2: Still frozen for 1 turn
    turnSystem.advanceTurn(player, [wolf], null, [], REGIONS_DATA['beach'], grid, false);
    expect(wolf.freezeTurns).toBe(0);
    expect(player.vitals.health).toBe(100);

    // Turn 3: Freeze expired, wolf attacks!
    turnSystem.advanceTurn(player, [wolf], null, [], REGIONS_DATA['beach'], grid, false);
    expect(player.vitals.health).toBeLessThan(100);
  });

  it('heats player when adjacent to lit campfire in cold biomes', () => {
    grid.generateForRegion(REGIONS_DATA['frost']);
    player.vitals.bodyTemp = 30;

    const fireIso = IsometricGrid.gridToScreen(12, 11);
    const fire = new WorldObject('campfire', fireIso.x, fireIso.y, undefined, 12, 11);
    fire.isLit = true;

    turnSystem.advanceTurn(player, [], null, [fire], REGIONS_DATA['frost'], grid, true);

    // Warmth increases near lit fire
    expect(player.vitals.bodyTemp).toBeGreaterThan(30);
  });
});
