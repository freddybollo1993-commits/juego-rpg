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
  });

  it('correctly maps 2.5D grid coordinates to screen pixel positions and back', () => {
    const gx = 10;
    const gy = 12;
    const screen = IsometricGrid.gridToScreen(gx, gy, 0);

    expect(screen.x).toBe((10 - 12) * 32); // -64
    expect(screen.y).toBe((10 + 12) * 16); // 352

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

    // Rest Step (⏳ Wait turn)
    const prevStamina = player.vitals.stamina;
    turnSystem.advanceTurn(player, [], null, [], REGIONS_DATA['beach'], grid, true);

    expect(turnSystem.turnCount).toBe(3);
    expect(player.vitals.stamina).toBeGreaterThan(prevStamina);
  });

  it('synchronously moves alert enemies towards the player and attacks when adjacent', () => {
    grid.generateForRegion(REGIONS_DATA['beach']);
    player.x = 12 * IsometricGrid.TILE_WIDTH;
    player.y = 12 * IsometricGrid.TILE_HEIGHT;
    player.vitals.health = 80;

    // Enemy placed 2 tiles away at (12, 14)
    const wolf = new Enemy('stalking_wolf', 12 * IsometricGrid.TILE_WIDTH, 14 * IsometricGrid.TILE_HEIGHT);
    const enemies = [wolf];

    // Turn 1: Wolf moves 1 step closer to (12, 13)
    turnSystem.advanceTurn(player, enemies, null, [], REGIONS_DATA['beach'], grid, false);
    const wolfGy = Math.round(wolf.y / IsometricGrid.TILE_HEIGHT);
    expect(wolfGy).toBe(13);
    expect(player.vitals.health).toBe(80); // not adjacent yet

    // Turn 2: Wolf is adjacent (12, 13) to player (12, 12), so it attacks!
    turnSystem.advanceTurn(player, enemies, null, [], REGIONS_DATA['beach'], grid, false);
    expect(player.vitals.health).toBeLessThan(80);
    expect(turnSystem.floatingTexts.length).toBeGreaterThan(0);
  });

  it('heats player when adjacent to lit campfire in cold biomes', () => {
    grid.generateForRegion(REGIONS_DATA['frost']);
    player.x = 12 * IsometricGrid.TILE_WIDTH;
    player.y = 12 * IsometricGrid.TILE_HEIGHT;
    player.vitals.bodyTemp = 30;

    const fire = new WorldObject('campfire', 12 * IsometricGrid.TILE_WIDTH, 11 * IsometricGrid.TILE_HEIGHT);
    fire.isLit = true;

    turnSystem.advanceTurn(player, [], null, [fire], REGIONS_DATA['frost'], grid, true);

    // Warmth increases near lit fire
    expect(player.vitals.bodyTemp).toBeGreaterThan(30);
  });
});
