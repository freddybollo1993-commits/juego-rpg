// Game.ts - Core 60 FPS Game Loop, World Orchestration, Combat and Autonomous Regions (GDD Sec. 1-10)

import { Player } from '../entities/Player';
import { NPC } from '../entities/NPC';
import { Enemy } from '../entities/Enemy';
import { Boss, BossPhase } from '../entities/Boss';
import { WorldObject } from '../entities/WorldObject';
import { REGIONS_DATA, RegionData, ChokepointConnection } from '../data/regions';
import { TRIBES_DATA } from '../data/tribes';
import { SurvivalSystem } from '../systems/SurvivalSystem';
import { WeatherSystem } from '../systems/WeatherSystem';
import { SaveSystem } from '../systems/SaveSystem';
import { Input } from './Input';
import { HUD } from '../ui/HUD';
import { CodexModal } from '../ui/CodexModal';
import { InventoryModal } from '../ui/InventoryModal';
import { DialogueModal } from '../ui/DialogueModal';
import { ChokepointScreen } from '../ui/ChokepointScreen';
import { EndingModal } from '../ui/EndingModal';
import { RadialMenu, RadialOption } from '../ui/RadialMenu';
import { TestWorldModal } from '../ui/TestWorldModal';
import { WorldMapModal } from '../ui/WorldMapModal';
import { IsometricGrid } from './IsometricGrid';
import { TurnSystem } from './TurnSystem';
import { assetManager } from './AssetManager';
import { tileAtlas } from './TileAtlas';
import { soundManager } from '../audio/SoundManager';
import { questSystem } from '../systems/QuestSystem';
import { Arrow } from '../entities/Arrow';
import { particleSystem } from '../systems/ParticleSystem';
import { dayNightCycle } from '../systems/DayNightCycle';
import { talentModal } from '../ui/TalentModal';

export class Game {
  // ─────────────────────────────────────────────────────────────────────────
  // PHASE FLAG — Set to `true` to isolate ONLY the movement system.
  // Enemies, NPC, objects (blocking), combat, bow, survival and boss
  // are all disabled until this is set back to `false`.
  // ─────────────────────────────────────────────────────────────────────────
  public static MOVEMENT_ONLY: boolean = true;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lastTime: number = 0;
  private isRunning: boolean = true;

  // 2.5D Isometric Engine & Turn System (The Wild Darkness style)
  public grid: IsometricGrid;
  public turnSystem: TurnSystem;
  public worldMapModal: WorldMapModal;
  public playerGx: number = 12;
  public playerGy: number = 12;
  public targetPlayerX: number = 0;
  public targetPlayerY: number = 0;

  // Systems & Managers
  public player: Player;
  public input: Input;
  public survivalSystem: SurvivalSystem;
  public weatherSystem: WeatherSystem;
  public hud: HUD;

  // Modals & Screens
  public codexModal: CodexModal;
  public inventoryModal: InventoryModal;
  public dialogueModal: DialogueModal;
  public chokepointScreen: ChokepointScreen;
  public endingModal: EndingModal;
  public radialMenu: RadialMenu;
  public testWorldModal: TestWorldModal;

  // Active Regional World
  public currentRegion: RegionData;
  public npcs: NPC[] = [];
  public enemies: Enemy[] = [];
  public worldObjects: WorldObject[] = [];
  public arrows: Arrow[] = [];
  public boss: Boss | null = null;
  public bossDefeated: boolean = false;

  // Camera
  public cameraX: number = 0;
  public cameraY: number = 0;

  // State
  private interactionPrompt: string | null = null;
  private nearbyInteractable: { type: 'npc' | 'object' | 'chokepoint'; target: NPC | WorldObject | ChokepointConnection } | null = null;
  private autoSaveTimer: number = 0;
  private notificationMessage: string = '';
  private notificationTimer: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    // 2.5D Isometric Engine & Turn-Based Core
    this.grid = new IsometricGrid(24, 24);
    this.turnSystem = new TurnSystem();
    this.worldMapModal = new WorldMapModal();

    this.player = new Player();
    this.input = new Input(canvas);
    this.survivalSystem = new SurvivalSystem();
    this.weatherSystem = new WeatherSystem();
    this.hud = new HUD();

    this.codexModal = new CodexModal();
    this.inventoryModal = new InventoryModal();
    this.dialogueModal = new DialogueModal();
    this.chokepointScreen = new ChokepointScreen();
    this.endingModal = new EndingModal();
    this.radialMenu = new RadialMenu();
    this.testWorldModal = new TestWorldModal(this);

    // Preload concept art assets
    assetManager.preloadAll();
    tileAtlas.preloadAll();

    // Default start region: Tutorial Beach (GDD Sec. 10.4)
    this.currentRegion = REGIONS_DATA['beach'];

    // Try load saved state
    this.tryLoadState();

    // Load active region entities
    this.loadRegion(this.currentRegion.id, false);

    // Setup HUD callbacks
    this.setupHudEvents();

    // Setup Quest System notifications
    questSystem.onQuestUpdated = (quest, obj) => {
      if (obj && obj.isCompleted) {
        this.showNotification(`📜 ¡Objetivo cumplido! ${obj.description}`);
      }
      if (quest.isCompleted) {
        this.showNotification(`🏆 ¡Misión Completada: ${quest.title}!`);
      }
    };

    // Auto-save on page exit
    window.addEventListener('beforeunload', () => {
      SaveSystem.save(this.player, this.currentRegion.id, this.bossDefeated);
    });
  }

  private tryLoadState() {
    const saved = SaveSystem.load();
    if (saved) {
      if (REGIONS_DATA[saved.currentRegionId]) {
        this.currentRegion = REGIONS_DATA[saved.currentRegionId];
      }
      this.player.x = saved.player.x;
      this.player.y = saved.player.y;
      this.player.vitals = saved.player.vitals;
      this.player.inventory = saved.player.inventory;
      this.player.reliquary = saved.player.reliquary;
      this.player.activeEphemeral = saved.player.activeEphemeral;
      this.player.unlockedAbilities = new Set(saved.player.unlockedAbilities);
      this.player.equippedAbilities = saved.player.equippedAbilities;
      this.player.unlockedFourthSkillSlot = saved.player.unlockedFourthSkillSlot;
      this.bossDefeated = saved.bossDefeated;

      // Restore tribe states
      for (const [id, tSaved] of Object.entries(saved.tribes)) {
        if (TRIBES_DATA[id]) {
          TRIBES_DATA[id].reputation = tSaved.reputation;
          TRIBES_DATA[id].trial.currentCount = tSaved.trialCurrent;
          TRIBES_DATA[id].trial.completed = tSaved.trialCompleted;
          TRIBES_DATA[id].tributeDelivered = tSaved.tributeDelivered;
          TRIBES_DATA[id].resonatorDelivered = tSaved.resonatorDelivered;
        }
      }
    }
  }

  public loadRegion(regionId: string, resetPosition: boolean = true) {
    const reg = REGIONS_DATA[regionId];
    if (!reg) return;

    this.currentRegion = reg;
    this.npcs = [];
    this.enemies = [];
    this.worldObjects = [];
    this.arrows = [];
    this.boss = null;
    particleSystem.clear();

    // Set audio and weather
    soundManager.setBiomeMusic(reg.biomeType);
    this.weatherSystem.setWeather(reg.weatherType);

    // 1. Generate 2.5D Isometric Grid Slabs for Region
    this.grid.generateForRegion(reg);

    // 2. Set player grid position & center screen coordinates
    if (resetPosition) {
      this.playerGx = 12;
      this.playerGy = 12;
    }
    const playerIso = IsometricGrid.gridToScreen(this.playerGx, this.playerGy);
    this.player.x = playerIso.x;
    this.player.y = playerIso.y;
    this.player.gx = this.playerGx;
    this.player.gy = this.playerGy;
    this.targetPlayerX = playerIso.x;
    this.targetPlayerY = playerIso.y;

    // Strict 1-Tile Occupancy Registry: guarantees no two entities or objects share a cell
    const occupiedTiles = new Set<string>();
    occupiedTiles.add(`${this.playerGx},${this.playerGy}`);

    const findFreeTile = (preferGx: number, preferGy: number): { gx: number; gy: number } => {
      const key = `${preferGx},${preferGy}`;
      if (!occupiedTiles.has(key) && this.grid.isPassable(preferGx, preferGy)) {
        occupiedTiles.add(key);
        return { gx: preferGx, gy: preferGy };
      }
      // Spiral search for closest passable and unoccupied tile
      for (let r = 1; r <= 6; r++) {
        for (let dx = -r; dx <= r; dx++) {
          for (let dy = -r; dy <= r; dy++) {
            if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
            const testGx = preferGx + dx;
            const testGy = preferGy + dy;
            const testKey = `${testGx},${testGy}`;
            if (this.grid.isPassable(testGx, testGy) && !occupiedTiles.has(testKey)) {
              occupiedTiles.add(testKey);
              return { gx: testGx, gy: testGy };
            }
          }
        }
      }
      occupiedTiles.add(key);
      return { gx: preferGx, gy: preferGy };
    };

    // Entity placement helpers with discrete tile locking
    const addObj = (type: any, preferGx: number, preferGy: number, isLit?: boolean, dropItem?: string) => {
      const { gx, gy } = findFreeTile(preferGx, preferGy);
      const elev = (this.grid.tiles[gx] && this.grid.tiles[gx][gy]) ? this.grid.tiles[gx][gy].elevation : 0;
      const iso = IsometricGrid.gridToScreen(gx, gy, elev);
      const obj = new WorldObject(type, iso.x, iso.y, dropItem, gx, gy);
      if (isLit !== undefined) obj.isLit = isLit;
      this.worldObjects.push(obj);
      return obj;
    };

    const addEnemy = (type: any, preferGx: number, preferGy: number) => {
      const { gx, gy } = findFreeTile(preferGx, preferGy);
      const elev = (this.grid.tiles[gx] && this.grid.tiles[gx][gy]) ? this.grid.tiles[gx][gy].elevation : 0;
      const iso = IsometricGrid.gridToScreen(gx, gy, elev);
      const enemy = new Enemy(type, iso.x, iso.y, gx, gy);
      this.enemies.push(enemy);
      return enemy;
    };

    // Spawn Tribe Chief if region has one (disabled in MOVEMENT_ONLY phase)
    if (!Game.MOVEMENT_ONLY && reg.tribeId && TRIBES_DATA[reg.tribeId]) {
      const chiefPos = findFreeTile(11, 10);
      const chiefIso = IsometricGrid.gridToScreen(chiefPos.gx, chiefPos.gy);
      this.npcs.push(new NPC(reg.tribeId, chiefIso.x, chiefIso.y, chiefPos.gx, chiefPos.gy));
      addObj('campfire', 12, 10, true);
    }

    // Spawn Region-specific Objects & Enemies (disabled in MOVEMENT_ONLY phase)
    if (!Game.MOVEMENT_ONLY) {
      if (reg.biomeType === 'beach') {
        // Primary Landing Site (Surrounding Player Spawn at 12, 12)
        addObj('campfire', 11, 13, false);
        addObj('workbench', 13, 11);
        addObj('shipwreck_debris', 9, 10);
        addObj('shipwreck_debris', 14, 14);
        addObj('shipwreck_debris', 8, 14);

        addObj('coastal_palm', 7, 7);
        addObj('coastal_palm', 16, 7);
        addObj('coastal_palm', 16, 16);
        addObj('coastal_palm', 7, 16);

        addObj('branch_pile', 10, 11);
        addObj('branch_pile', 13, 13);
        addObj('flint_rock', 14, 11);
        addObj('flint_rock', 10, 12);
        addObj('forage_bush', 13, 14);
        addObj('forage_bush', 10, 14);

        addEnemy('stalking_wolf', 5, 5);
        addEnemy('stalking_wolf', 18, 6);
      } else if (reg.biomeType === 'frost') {
        addEnemy('frost_beast', 6, 6);
        addEnemy('frost_beast', 17, 12);
        addEnemy('frost_beast', 13, 16);
        addObj('campfire', 12, 11, true);
        addObj('anvil', 11, 11);
      } else if (reg.biomeType === 'forest') {
        addEnemy('stalking_wolf', 8, 7);
        addEnemy('stalking_wolf', 16, 8);
        addEnemy('stalking_wolf', 11, 15);
        addObj('forage_bush', 9, 11);
        addObj('forage_bush', 15, 6);
        addObj('night_orchid_plant', 13, 11);
        addObj('workbench', 11, 11);
      } else if (reg.biomeType === 'swamp') {
        addEnemy('swamp_horror', 6, 8);
        addEnemy('swamp_horror', 18, 9);
        addEnemy('swamp_horror', 14, 14);
        addObj('campfire', 12, 11, true);
        addObj('night_orchid_plant', 9, 6);
        addObj('alchemy_station', 11, 11);
      } else if (reg.biomeType === 'canyon') {
        addEnemy('volcanic_scorpion', 7, 7);
        addEnemy('volcanic_scorpion', 16, 7);
        addEnemy('volcanic_scorpion', 12, 15);
        addObj('campfire', 12, 11, true);
        addObj('tanner', 11, 11);
      } else if (reg.biomeType === 'caverns') {
        addEnemy('crystal_stalker', 7, 7);
        addEnemy('crystal_stalker', 17, 8);
        addEnemy('crystal_stalker', 11, 14);
        addObj('campfire', 12, 11, true);
        addObj('anvil', 11, 11);

        // Precursor Ruins Chamber
        addObj('precursor_pedestal', 14, 6);
        addObj('precursor_pedestal', 16, 6);
        addObj('precursor_pedestal', 15, 5);
        addObj('precursor_chest', 15, 6);
        addEnemy('precursor_golem', 15, 7);
      } else if (reg.biomeType === 'alien_core') {
        questSystem.updateObjective('celestial_reckoning', 'enter_core', 1);
        if (!this.bossDefeated) {
          const bossIso = IsometricGrid.gridToScreen(12, 7);
          this.boss = new Boss(bossIso.x, bossIso.y);
          addEnemy('alien_drone', 10, 10);
          addEnemy('alien_drone', 14, 10);
        }
        addObj('campfire', 12, 18, true);
      }
    } // end if(!MOVEMENT_ONLY) spawn block

    // Map chokepoints to perimeter tiles
    if (reg.chokepoints.length > 0) {
      const cp1 = reg.chokepoints[0];
      const iso1 = IsometricGrid.gridToScreen(22, 12);
      cp1.x = iso1.x;
      cp1.y = iso1.y;
      (cp1 as any).gx = 22;
      (cp1 as any).gy = 12;
    }
    if (reg.chokepoints.length > 1) {
      const cp2 = reg.chokepoints[1];
      const iso2 = IsometricGrid.gridToScreen(12, 2);
      cp2.x = iso2.x;
      cp2.y = iso2.y;
      (cp2 as any).gx = 12;
      (cp2 as any).gy = 2;
    }

    // Initial Fog of War calculation
    const sight = this.player.isHoldingTorch ? 7 : 5;
    this.grid.updateFogOfWar(this.playerGx, this.playerGy, sight, this.getLitCampfires());

    this.showNotification(`Has entrado a: ${reg.name}`);
  }

  private setupHudEvents() {
    this.hud.onSacrificeClick = () => this.triggerSacrificeAction();
    this.hud.onCodexClick = () => this.openCodex();
    this.hud.onInventoryClick = () => this.openInventory();
    this.hud.onRadialToggle = () => this.openRadialMenu();
    this.hud.onTestWorldToggle = () => this.openTestWorld();
  }

  public start() {
    this.lastTime = performance.now();
    this.isRunning = true;
    requestAnimationFrame(this.loop.bind(this));
  }

  private loop(timestamp: number) {
    if (!this.isRunning) return;

    const delta = Math.min(0.1, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;

    this.update(delta);
    this.render();

    requestAnimationFrame(this.loop.bind(this));
  }

  private update(delta: number) {
    if (this.chokepointScreen.isActive()) return;

    this.input.update();
    soundManager.init();

    // Check Modals & UI inputs
    if (this.input.codexPressed) {
      this.input.codexPressed = false;
      this.openCodex();
    }
    if (this.input.inventoryPressed) {
      this.input.inventoryPressed = false;
      this.openInventory();
    }
    if (this.input.sacrificePressed) {
      this.input.sacrificePressed = false;
      this.triggerSacrificeAction();
    }
    if (this.input.radialPressed) {
      this.input.radialPressed = false;
      this.openRadialMenu();
    }
    if (this.input.talentPressed) {
      this.input.talentPressed = false;
      this.openTalents();
    }

    if (
      this.codexModal.isOpen() ||
      this.inventoryModal.isOpen() ||
      this.dialogueModal.isOpen() ||
      this.endingModal.isOpen() ||
      this.radialMenu.isOpen() ||
      this.testWorldModal.isOpen() ||
      talentModal.isOpen
    ) {
      return; // Pause world updates during modal interactions
    }

    // Planetary Day/Night Cycle Tick (Fase 3.2)
    dayNightCycle.update(delta);
    const effectiveDelta = this.player.isBulletTime ? delta * 0.35 : delta;

    // DevTools / Sandbox overrides
    if (this.testWorldModal.godMode) {
      this.player.vitals.health = 100;
    }
    if (this.testWorldModal.infiniteStamina) {
      this.player.vitals.stamina = 100;
    }

    // 2.5D Smooth visual interpolation towards target isometric position
    this.player.x += (this.targetPlayerX - this.player.x) * 0.25;
    this.player.y += (this.targetPlayerY - this.player.y) * 0.25;
    this.player.update(delta);
    this.turnSystem.updateFloatingTexts(delta);

    // ─────────────────────────────────────────────────────────────────────
    // All combat, enemy AI, survival and interaction logic is disabled
    // while MOVEMENT_ONLY = true. Only player movement & camera are active.
    // ─────────────────────────────────────────────────────────────────────
    if (!Game.MOVEMENT_ONLY) {
      // Proximity Checks & Prompts on Isometric Grid
      this.interactionPrompt = null;
      this.nearbyInteractable = null;

      let isNearCampfire = false;
      for (const obj of this.worldObjects) {
        if (Math.abs(obj.gx - this.playerGx) <= 1 && Math.abs(obj.gy - this.playerGy) <= 1) {
          if (obj.type === 'campfire' && obj.isLit) {
            isNearCampfire = true;
            this.interactionPrompt = '[Espacio / ⏳] Descansar junto a la Fogata (+Calor & Estamina)';
            this.nearbyInteractable = { type: 'object', target: obj };
          } else if (obj.type === 'campfire' && !obj.isLit) {
            this.interactionPrompt = '[Toque / E] Encender Fogata de Supervivencia';
            this.nearbyInteractable = { type: 'object', target: obj };
          } else if (!obj.isDepleted) {
            this.interactionPrompt = `[Toque] Recolectar ${obj.type === 'forage_bush' ? 'Bayas' : 'Recursos'}`;
            this.nearbyInteractable = { type: 'object', target: obj };
          }
        }
      }

      for (const npc of this.npcs) {
        if (Math.abs(npc.gx - this.playerGx) <= 1 && Math.abs(npc.gy - this.playerGy) <= 1) {
          this.interactionPrompt = `[Hablar] ${npc.name}`;
          this.nearbyInteractable = { type: 'npc', target: npc };
        }
      }

      for (const cp of this.currentRegion.chokepoints) {
        const cpgx = (cp as any).gx ?? Math.round(cp.x / IsometricGrid.TILE_WIDTH);
        const cpgy = (cp as any).gy ?? Math.round(cp.y / IsometricGrid.TILE_HEIGHT);
        if (Math.abs(this.playerGx - cpgx) <= 1 && Math.abs(this.playerGy - cpgy) <= 1) {
          if (cp.targetRegionId === 'alien_core' && !this.player.getItemCount('alien_translator_device')) {
            this.interactionPrompt = '⚠️ Barrera Alienígena Impenetrable (Requiere Dispositivo de Traducción)';
            continue;
          }
          this.interactionPrompt = `[Entrar] Viajar a: ${cp.name}`;
          this.nearbyInteractable = { type: 'chokepoint', target: cp };
        }
      }

      if (this.input.interactPressed && this.nearbyInteractable) {
        this.input.interactPressed = false;
        this.performInteraction(this.nearbyInteractable);
      }

      if (this.input.attackPressed) {
        this.input.attackPressed = false;
        if (this.player.attack()) {
          this.resolveMeleeAttack();
        }
      }

      if (this.input.dodgePressed) {
        this.input.dodgePressed = false;
        this.triggerDodgeAction();
      }

      if (this.input.bowPressed) {
        this.input.bowPressed = false;
        this.triggerBowAction();
      }

      // Update Arrows & Arrow Collisions (Fase 2.1)
      for (let i = this.arrows.length - 1; i >= 0; i--) {
        const arrow = this.arrows[i];
        arrow.update(delta, this.enemies, this.boss, (x, y, color) => {
          particleSystem.spawnSparks(x, y, color, 8);
          particleSystem.spawnHitBlood(x, y, '#b91c1c', 6);
        });
        if (!arrow.isAlive) {
          this.arrows.splice(i, 1);
        }
      }

      // Check Bear Trap triggers on enemies (Fase 2.3)
      for (const obj of this.worldObjects) {
        if (obj.type === 'bear_trap' && !obj.isDepleted) {
          for (const enemy of this.enemies) {
            if (enemy.isAlive && Math.hypot(enemy.x - obj.x, enemy.y - obj.y) <= 22) {
              obj.isDepleted = true;
              enemy.takeDamage(35, this.player);
              enemy.freeze(4.5);
              soundManager.playArrowImpact();
              particleSystem.spawnSparks(obj.x, obj.y, '#94a3b8', 12);
              this.showNotification('¡Una bestia cayó en la Trampa de Mandíbulas!');
              break;
            }
          }
        }
      }

      // Update Enemies
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        enemy.update(this.player, effectiveDelta);
        if (!enemy.isAlive) {
          if (this.currentRegion.tribeId) {
            const tribe = TRIBES_DATA[this.currentRegion.tribeId];
            if (tribe && !tribe.trial.completed) {
              tribe.trial.currentCount = Math.min(tribe.trial.targetCount, tribe.trial.currentCount + 1);
              this.showNotification(`¡Progreso de Prueba Tribal! (${tribe.trial.currentCount}/${tribe.trial.targetCount})`);
              if (tribe.trial.currentCount >= tribe.trial.targetCount) {
                tribe.trial.completed = true;
                questSystem.updateObjective('tribal_initiation', 'complete_trial', 1);
              }
            }
          }
          this.enemies.splice(i, 1);
        }
      }

      // Update Final Boss
      if (this.boss && this.boss.isAlive) {
        this.boss.update(this.player, effectiveDelta, (newPhase: BossPhase) => {
          if (newPhase === 'cryogenic') {
            this.weatherSystem.setWeather('blizzard');
            this.showNotification('¡El coloso activa la FASE CRIOGÉNICA! (Ventisca Ártica)');
          } else if (newPhase === 'toxic_miasma') {
            this.weatherSystem.setWeather('toxic_fog');
            this.showNotification('¡El coloso activa la FASE DE MIASMA TÓXICO! (Gases Corrosivos)');
          } else if (newPhase === 'volcanic_thermal') {
            this.weatherSystem.setWeather('sandstorm');
            this.showNotification('¡El coloso activa la FASE TÉRMICA VOLCÁNICA! (Calor Sofocante)');
          } else if (newPhase === 'gravitational_void') {
            this.weatherSystem.setWeather('alien_aurora');
            this.showNotification('¡El coloso activa la FASE DE PENUMBRA GRAVITACIONAL!');
          }
        });

        if (!this.boss.isAlive && !this.bossDefeated) {
          this.bossDefeated = true;
          questSystem.updateObjective('celestial_reckoning', 'defeat_herald', 1);
          this.endingModal.show((choice) => {
            this.showNotification(`Has elegido: ${choice === 'dismantle' ? 'Desmantelar' : 'Integrar'}. ¡Mundo Pacificado!`);
            this.weatherSystem.setWeather('clear');
          });
        }
      }

      // Survival Tick with Night and Torch Protection
      const isColdProtected = isNearCampfire || this.player.isHoldingTorch;
      this.survivalSystem.update(this.player, this.currentRegion, isColdProtected, false, delta);

      if (this.player.vitals.health <= 0 && !this.testWorldModal.godMode) {
        this.handlePlayerDeath();
      }
    } // end if(!MOVEMENT_ONLY) full-game block


    // Camera Smooth Follow (Centered on player's visual torso in 2.5D axonometric projection)
    const targetCamX = this.player.x - this.canvas.width / 2;
    const targetCamY = (this.player.y - 18) - this.canvas.height / 2;
    this.cameraX += (targetCamX - this.cameraX) * 0.18;
    this.cameraY += (targetCamY - this.cameraY) * 0.18;

    // Auto-Save
    this.autoSaveTimer += delta;
    if (this.autoSaveTimer >= 20) {
      this.autoSaveTimer = 0;
      SaveSystem.save(this.player, this.currentRegion.id, this.bossDefeated);
    }

    if (this.notificationTimer > 0) {
      this.notificationTimer -= delta;
      if (this.notificationTimer <= 0) {
        this.notificationMessage = '';
      }
    }
  }

  private resolveMeleeAttack() {
    const range = 52;
    const dmg = this.player.getMeleeDamage();

    for (const enemy of this.enemies) {
      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;
      if (dx * dx + dy * dy <= range * range) {
        enemy.takeDamage(dmg, this.player);
      }
    }

    if (this.boss && this.boss.isAlive) {
      const dx = this.boss.x - this.player.x;
      const dy = this.boss.y - this.player.y;
      if (dx * dx + dy * dy <= (range + 40) * (range + 40)) {
        this.boss.takeMeleeDamage(dmg);
      }
    }
  }

  public triggerSacrificeAction() {
    const result = this.player.triggerSacrifice();
    if (result.success) {
      this.showNotification(`💥 ¡SACRIFICIO DETONADO: ${result.effectName}!`);

      for (const enemy of this.enemies) {
        const dx = enemy.x - this.player.x;
        const dy = enemy.y - this.player.y;
        if (dx * dx + dy * dy <= 240 * 240) {
          enemy.takeDamage(75, this.player);
          enemy.freeze(6.0);
        }
      }

      if (this.boss && this.boss.isAlive) {
        this.boss.interruptWithSacrifice(result.effectName, 90);
        this.showNotification('¡EL COLOSO FUE DERRIBADO Y PIERDE SU ESCUDO DEFLECTOR!');
      }
    } else {
      this.showNotification(result.description);
    }
  }

  // --- 2.5D Isometric Turn-Based Actions (The Wild Darkness style) ---

  public stepPlayer(dx: number, dy: number) {
    if (this.player.vitals.health <= 0) return;

    // Update facing for all 8 possible grid directions
    if      (dx < 0 && dy < 0) this.player.facing = 'up';    // NW diagonal
    else if (dx < 0 && dy === 0) this.player.facing = 'up';  // NW axis
    else if (dx === 0 && dy < 0) this.player.facing = 'right'; // NE axis
    else if (dx > 0 && dy < 0) this.player.facing = 'right'; // NE diagonal
    else if (dx > 0 && dy === 0) this.player.facing = 'down'; // SE axis
    else if (dx > 0 && dy > 0) this.player.facing = 'down';  // SE diagonal
    else if (dx === 0 && dy > 0) this.player.facing = 'left'; // SW axis
    else if (dx < 0 && dy > 0) this.player.facing = 'left';  // SW diagonal

    const targetGx = this.playerGx + dx;
    const targetGy = this.playerGy + dy;

    if (!this.grid.isPassable(targetGx, targetGy)) {
      this.showNotification('⚠️ Terreno infranqueable');
      return;
    }

    // ─── MOVEMENT-ONLY phase: skip all combat and object interaction ───
    if (Game.MOVEMENT_ONLY) {
      this.playerGx = targetGx;
      this.playerGy = targetGy;
      this.player.gx = targetGx;
      this.player.gy = targetGy;
      const targetIso = IsometricGrid.gridToScreen(this.playerGx, this.playerGy);
      this.targetPlayerX = targetIso.x;
      this.targetPlayerY = targetIso.y;
      soundManager.playFootstep('dirt');
      const sight = this.player.isHoldingTorch ? 7 : 5;
      this.grid.updateFogOfWar(this.playerGx, this.playerGy, sight, []);
      return;
    }

    // ─── Full-game mode: Check enemy bump attack ───
    const targetEnemy = this.enemies.find(e => e.isAlive && e.gx === targetGx && e.gy === targetGy);

    if (targetEnemy) {
      const dmg = this.player.getMeleeDamage();
      targetEnemy.takeDamage(dmg, this.player);
      soundManager.playHit();
      const targetScreen = IsometricGrid.gridToScreen(targetGx, targetGy);
      this.turnSystem.addFloatingText(`-${dmg}`, targetScreen.x, targetScreen.y - 20, '#ffd700');
      particleSystem.spawnSparks(targetScreen.x, targetScreen.y, '#ffd700', 8);
      this.turnSystem.advanceTurn(this.player, this.enemies, this.boss, this.worldObjects, this.currentRegion, this.grid, false);
      return;
    }

    // Check if target tile has an interactable object
    const targetObj = this.worldObjects.find(obj => obj.gx === targetGx && obj.gy === targetGy);

    if (targetObj) {
      if (targetObj.type === 'campfire' && !targetObj.isLit) {
        if (this.player.getItemCount('branches') >= 1 && this.player.getItemCount('flint') >= 1) {
          this.player.removeItem('branches', 1);
          targetObj.isLit = true;
          targetObj.fireTimer = 300;
          soundManager.playCampfire();
          this.showNotification('🔥 ¡Hoguera encendida con pedernal y ramas!');
          questSystem.updateObjective('prologue_survival', 'light_campfire', 1);
          this.turnSystem.advanceTurn(this.player, this.enemies, this.boss, this.worldObjects, this.currentRegion, this.grid, false);
          this.grid.updateFogOfWar(this.playerGx, this.playerGy, this.player.isHoldingTorch ? 7 : 5, this.getLitCampfires());
          return;
        } else {
          this.showNotification('Necesitas 1x Rama y 1x Pedernal para encender la hoguera.');
          return;
        }
      } else if (targetObj.type === 'forage_bush' && !targetObj.isDepleted) {
        targetObj.isDepleted = true;
        this.player.addItem('berries', 2);
        soundManager.playForage();
        this.showNotification('🍇 ¡Recolectaste 2x Bayas Silvestres!');
        this.turnSystem.advanceTurn(this.player, this.enemies, this.boss, this.worldObjects, this.currentRegion, this.grid, false);
        return;
      } else if (targetObj.type === 'flint_rock' && !targetObj.isDepleted) {
        targetObj.isDepleted = true;
        this.player.addItem('flint', 2);
        soundManager.playForage();
        this.showNotification('🪨 ¡Recolectaste 2x Pedernal!');
        this.turnSystem.advanceTurn(this.player, this.enemies, this.boss, this.worldObjects, this.currentRegion, this.grid, false);
        return;
      } else if (targetObj.type === 'branch_pile' && !targetObj.isDepleted) {
        targetObj.isDepleted = true;
        this.player.addItem('branches', 3);
        soundManager.playForage();
        this.showNotification('🪵 ¡Recolectaste 3x Ramas!');
        this.turnSystem.advanceTurn(this.player, this.enemies, this.boss, this.worldObjects, this.currentRegion, this.grid, false);
        return;
      } else if (targetObj.type === 'workbench' || targetObj.type === 'anvil' || targetObj.type === 'tanner' || targetObj.type === 'alchemy_station') {
        this.openInventory();
        return;
      } else if (targetObj.type === 'coastal_palm' || (targetObj.type === 'campfire' && targetObj.isLit)) {
        this.showNotification('⚠️ Casilla ocupada por un objeto sólido.');
        return;
      }
    }

    // Step player to target tile
    this.playerGx = targetGx;
    this.playerGy = targetGy;
    this.player.gx = targetGx;
    this.player.gy = targetGy;
    const targetIso = IsometricGrid.gridToScreen(this.playerGx, this.playerGy);
    this.targetPlayerX = targetIso.x;
    this.targetPlayerY = targetIso.y;

    soundManager.playFootstep(this.currentRegion.biomeType === 'frost' ? 'snow' : this.currentRegion.biomeType === 'swamp' ? 'mud' : 'dirt');

    this.turnSystem.advanceTurn(this.player, this.enemies, this.boss, this.worldObjects, this.currentRegion, this.grid, false);

    const sight = this.player.isHoldingTorch ? 7 : 5;
    this.grid.updateFogOfWar(this.playerGx, this.playerGy, sight, this.getLitCampfires());

    this.checkChokepointStep();
  }

  public waitPlayer() {
    if (this.player.vitals.health <= 0) return;
    if (Game.MOVEMENT_ONLY) return; // No turn system in movement-only phase
    this.turnSystem.advanceTurn(this.player, this.enemies, this.boss, this.worldObjects, this.currentRegion, this.grid, true);
    const sight = this.player.isHoldingTorch ? 7 : 5;
    this.grid.updateFogOfWar(this.playerGx, this.playerGy, sight, this.getLitCampfires());
  }

  public interactTile(gx: number, gy: number) {
    if (gx === this.playerGx && gy === this.playerGy) {
      this.waitPlayer();
      return;
    }
    const dx = gx - this.playerGx;
    const dy = gy - this.playerGy;
    // Support all 8 adjacent tiles (including diagonals)
    const stepX = dx !== 0 ? (dx > 0 ? 1 : -1) : 0;
    const stepY = dy !== 0 ? (dy > 0 ? 1 : -1) : 0;
    this.stepPlayer(stepX, stepY);
  }

  public attackNearest() {
    for (const enemy of this.enemies) {
      if (!enemy.isAlive) continue;
      const dx = Math.abs(enemy.gx - this.playerGx);
      const dy = Math.abs(enemy.gy - this.playerGy);
      if (dx <= 1 && dy <= 1 && (dx + dy > 0)) {
        this.stepPlayer(enemy.gx - this.playerGx, enemy.gy - this.playerGy);
        return;
      }
    }
    if (this.boss && this.boss.isAlive) {
      const dx = Math.abs(12 - this.playerGx);
      const dy = Math.abs(7 - this.playerGy);
      if (dx <= 2 && dy <= 2) {
        const dmg = this.player.getMeleeDamage();
        this.boss.takeMeleeDamage(dmg);
        soundManager.playHit();
        const bPos = IsometricGrid.gridToScreen(12, 7);
        this.turnSystem.addFloatingText(`-${dmg}`, bPos.x, bPos.y - 30, '#ffd700');
        this.turnSystem.advanceTurn(this.player, this.enemies, this.boss, this.worldObjects, this.currentRegion, this.grid, false);
        return;
      }
    }
    if (this.player.attack()) {
      this.waitPlayer();
    }
  }

  public openWorldMap() {
    this.worldMapModal.show(this.currentRegion.id, (regionId) => {
      this.loadRegion(regionId, true);
    });
  }

  public isNearAnyLitCampfire(): boolean {
    for (const obj of this.worldObjects) {
      if (obj.type === 'campfire' && obj.isLit) {
        const dx = Math.abs(this.playerGx - obj.gx);
        const dy = Math.abs(this.playerGy - obj.gy);
        if (dx <= 1 && dy <= 1) return true;
      }
    }
    return false;
  }

  public getLitCampfires(): { gx: number; gy: number; isLit: boolean }[] {
    return this.worldObjects
      .filter(o => o.type === 'campfire' && o.isLit)
      .map(o => ({
        gx: o.gx,
        gy: o.gy,
        isLit: o.isLit
      }));
  }

  private checkChokepointStep() {
    for (const cp of this.currentRegion.chokepoints) {
      const cpgx = (cp as any).gx ?? Math.round(cp.x / IsometricGrid.TILE_WIDTH);
      const cpgy = (cp as any).gy ?? Math.round(cp.y / IsometricGrid.TILE_HEIGHT);
      if (Math.abs(this.playerGx - cpgx) <= 1 && Math.abs(this.playerGy - cpgy) <= 1) {
        if (cp.targetRegionId === 'alien_core' && !this.player.getItemCount('alien_translator_device')) {
          this.showNotification('⚠️ Barrera Alienígena Impenetrable (Requiere Dispositivo de Traducción)');
          return;
        }
        this.performInteraction({ type: 'chokepoint', target: cp });
        return;
      }
    }
  }

  private performInteraction(item: { type: 'npc' | 'object' | 'chokepoint'; target: NPC | WorldObject | ChokepointConnection }) {
    if (item.type === 'npc') {
      const npc = item.target as NPC;
      this.dialogueModal.show(npc, this.player, () => {
        SaveSystem.save(this.player, this.currentRegion.id, this.bossDefeated);
      });
    } else if (item.type === 'object') {
      const obj = item.target as WorldObject;
      if (obj.type === 'campfire' && !obj.isLit) {
        if (this.player.getItemCount('branches') >= 1 && this.player.getItemCount('flint') >= 1) {
          this.player.removeItem('branches', 1);
          obj.isLit = true;
          soundManager.playCampfire();
          this.showNotification('¡Encendiste la fogata! Ahora puedes calentarte, cocinar y sintonizar el Códice.');
          questSystem.updateObjective('prologue_survival', 'light_campfire', 1);
        } else {
          this.showNotification('Necesitas al menos 1 Rama y 1 Pedernal para encender fuego.');
        }
      } else {
        const msg = obj.interact(this.player);
        if (msg) this.showNotification(msg);
        if (obj.type === 'shipwreck_debris') {
          questSystem.updateObjective('prologue_survival', 'examine_monolith', 1);
        }
        if (obj.type === 'forage_bush' || obj.type === 'branch_pile') {
          questSystem.updateObjective('prologue_survival', 'gather_branches', 1);
        }
        if (this.player.getItemCount('branches') >= 3) {
          questSystem.updateObjective('prologue_survival', 'gather_branches', 3, true);
        }
      }
    } else if (item.type === 'chokepoint') {
      const cp = item.target as ChokepointConnection;
      const targetReg = REGIONS_DATA[cp.targetRegionId];
      if (targetReg) {
        this.chokepointScreen.startTransition(cp, targetReg, () => {
          this.loadRegion(targetReg.id, true);
          SaveSystem.save(this.player, this.currentRegion.id, this.bossDefeated);
        });
      }
    }
  }

  public triggerDodgeAction(): boolean {
    const success = this.player.dodge(this.input.moveX, this.input.moveY, this.enemies);
    if (success) {
      if (this.player.isBulletTime) {
        particleSystem.spawnSparks(this.player.x, this.player.y, '#ffd700', 18);
        this.showNotification('⚡ ¡ESQUIVA PERFECTA! (Tiempo Ralentizado & +30 Estamina)');
      } else {
        this.showNotification('¡Rodar táctico! (I-Frames de invulnerabilidad)');
      }
    } else if (this.player.vitals.stamina < 14) {
      this.showNotification('¡Estamina insuficiente para esquivar!');
    }
    return success;
  }

  public triggerBowAction(): boolean {
    if (this.player.vitals.stamina < 8) {
      this.showNotification('¡Estamina insuficiente para tensar el arco!');
      return false;
    }
    const arrowCount = this.player.getItemCount('fire_arrow') + this.player.getItemCount('frost_arrow') + this.player.getItemCount('flint_arrow');
    if (arrowCount <= 0) {
      this.showNotification('¡Sin flechas disponibles! Fabrica más en el Banco de Trabajo.');
      return false;
    }

    // Find nearest alive enemy within 5 tiles
    let targetEnemy: Enemy | null = null;
    let closestDist = 999;
    for (const enemy of this.enemies) {
      if (!enemy.isAlive) continue;
      const dist = Math.abs(enemy.gx - this.playerGx) + Math.abs(enemy.gy - this.playerGy);
      if (dist <= 5 && dist < closestDist) {
        closestDist = dist;
        targetEnemy = enemy;
      }
    }

    let targetAngle = 0;
    if (targetEnemy) {
      const ePos = IsometricGrid.gridToScreen(targetEnemy.gx, targetEnemy.gy);
      targetAngle = Math.atan2(ePos.y - this.player.y, ePos.x - this.player.x);
    } else {
      if (this.player.facing === 'right') targetAngle = 0;
      else if (this.player.facing === 'down') targetAngle = Math.PI / 2;
      else if (this.player.facing === 'left') targetAngle = Math.PI;
      else if (this.player.facing === 'up') targetAngle = -Math.PI / 2;
    }

    const arrow = this.player.shootBow(targetAngle);
    if (arrow) {
      this.arrows.push(arrow);
      particleSystem.spawnSparks(this.player.x, this.player.y - 6, '#ffd700', 5);
      const typeName = arrow.type === 'fire' ? 'Fuego' : arrow.type === 'frost' ? 'Escarcha' : 'Sílex';

      if (targetEnemy) {
        const dmg = arrow.damage;
        targetEnemy.takeDamage(dmg, this.player);
        soundManager.playHit();
        const ePos = IsometricGrid.gridToScreen(targetEnemy.gx, targetEnemy.gy);

        if (arrow.type === 'frost') {
          targetEnemy.freezeTurns = 2;
          this.turnSystem.addFloatingText(`-${dmg} HP (❄️ Congelado)`, ePos.x, ePos.y - 24, '#38bdf8');
        } else if (arrow.type === 'fire') {
          targetEnemy.burnTurns = 3;
          this.turnSystem.addFloatingText(`-${dmg} HP (🔥 Quemadura)`, ePos.x, ePos.y - 24, '#f97316');
        } else {
          this.turnSystem.addFloatingText(`-${dmg} HP`, ePos.x, ePos.y - 20, '#ffd700');
        }

        particleSystem.spawnSparks(ePos.x, ePos.y, '#ffd700', 8);
        this.showNotification(`🏹 ¡Flecha de ${typeName} impactó al enemigo!`);
      } else {
        this.showNotification(`🏹 ¡Flecha de ${typeName} disparada!`);
      }

      // Turn advances for tactical bow shot
      this.turnSystem.advanceTurn(this.player, this.enemies, this.boss, this.worldObjects, this.currentRegion, this.grid, false);
      const sight = this.player.isHoldingTorch ? 7 : 5;
      this.grid.updateFogOfWar(this.playerGx, this.playerGy, sight, this.getLitCampfires());
      return true;
    }
    return false;
  }

  private handlePlayerDeath() {
    this.showNotification('💀 Has sucumbido a las inclemencias del mundo. Reviviendo en el campamento...');
    this.player.vitals.health = 80;
    this.player.vitals.stamina = 100;
    this.player.vitals.hunger = 60;
    this.player.vitals.thirst = 60;
    this.player.vitals.bodyTemp = 45;
    this.player.vitals.toxicity = 0;
    this.player.x = this.currentRegion.width / 2;
    this.player.y = this.currentRegion.height / 2;
  }

  public openCodex() {
    let isNearRest = false;
    for (const obj of this.worldObjects) {
      if (obj.type === 'campfire' && obj.isLit && obj.isNear(this.player.x, this.player.y)) {
        isNearRest = true;
        break;
      }
    }
    this.codexModal.show(this.player, isNearRest, () => {
      if (this.player.equippedAbilities.length > 0) {
        questSystem.updateObjective('tribal_initiation', 'attune_rune', 1);
      }
      SaveSystem.save(this.player, this.currentRegion.id, this.bossDefeated);
    });
  }

  public openInventory() {
    this.inventoryModal.show(this.player, () => {
      if (this.player.reliquary.length > 0) {
        questSystem.updateObjective('tribal_initiation', 'obtain_ephemeral', 1);
      }
      if (this.player.getItemCount('alien_translator_device') >= 1) {
        questSystem.updateObjective('celestial_reckoning', 'get_translator', 1);
      }
      SaveSystem.save(this.player, this.currentRegion.id, this.bossDefeated);
    });
  }

  public openTalents() {
    talentModal.open(this.player);
  }

  public openTestWorld() {
    this.testWorldModal.show();
  }

  public openRadialMenu() {
    const options: RadialOption[] = [
      {
        id: 'talents',
        label: 'Maestría Tribal',
        icon: '🧬',
        color: '#a855f7',
        action: () => {
          this.openTalents();
        }
      },
      {
        id: 'attack',
        label: 'Atacar',
        icon: '⚔️',
        color: '#ef4444',
        action: () => {
          if (this.player.attack()) this.resolveMeleeAttack();
        }
      },
      {
        id: 'bow',
        label: 'Disparar Arco',
        icon: '🏹',
        color: '#10b981',
        action: () => {
          this.triggerBowAction();
        }
      },
      {
        id: 'dodge',
        label: 'Rodar / Esquivar',
        icon: '💨',
        color: '#38bdf8',
        action: () => {
          this.triggerDodgeAction();
        }
      },
      {
        id: 'trap',
        label: 'Colocar Trampa',
        icon: '🪤',
        color: '#64748b',
        action: () => {
          if (this.player.getItemCount('bear_trap') >= 1) {
            this.player.removeItem('bear_trap', 1);
            this.worldObjects.push(new WorldObject('bear_trap', this.player.x, this.player.y));
            soundManager.playCampfire();
            this.showNotification('¡Colocaste una Trampa de Mandíbulas en el suelo!');
          } else {
            this.showNotification('Necesitas una Trampa para Bestias (fabrícala en el banco).');
          }
        }
      },
      {
        id: 'sandbox',
        label: 'Mundo Prueba',
        icon: '🧪',
        color: '#a855f7',
        action: () => {
          this.openTestWorld();
        }
      },
      {
        id: 'sacrifice',
        label: 'Sacrificio',
        icon: '💥',
        color: '#f97316',
        action: () => {
          this.triggerSacrificeAction();
        }
      },
      {
        id: 'campfire',
        label: 'Montar Fogata',
        icon: '🔥',
        color: '#eab308',
        action: () => {
          if (this.player.getItemCount('campfire_kit') >= 1) {
            this.player.removeItem('campfire_kit', 1);
            this.worldObjects.push(new WorldObject('campfire', this.player.x + 40, this.player.y));
            soundManager.playCampfire();
            this.showNotification('¡Montaste una fogata en tu ubicación actual!');
          } else if (this.player.getItemCount('branches') >= 3 && this.player.getItemCount('flint') >= 1) {
            this.player.removeItem('branches', 3);
            this.player.removeItem('flint', 1);
            this.worldObjects.push(new WorldObject('campfire', this.player.x + 40, this.player.y));
            soundManager.playCampfire();
            this.showNotification('¡Armaste y encendiste una fogata con tus ramas y pedernal!');
          } else {
            this.showNotification('Necesitas un Kit de Fogata o (3 Ramas + 1 Pedernal).');
          }
        }
      },
      {
        id: 'codex',
        label: 'Códice Tribal',
        icon: '📖',
        color: '#d4af37',
        action: () => {
          this.openCodex();
        }
      },
      {
        id: 'inventory',
        label: 'Inventario',
        icon: '🎒',
        color: '#38bdf8',
        action: () => {
          this.openInventory();
        }
      }
    ];

    this.radialMenu.open(options);
  }

  public showNotification(msg: string) {
    this.notificationMessage = msg;
    this.notificationTimer = 3.5;
  }

  // --- Rendering Orchestration & Frustum Culling ---

  private render() {
    const width = this.canvas.width;
    const height = this.canvas.height;

    this.ctx.clearRect(0, 0, width, height);

    // View Frustum Bounds
    const margin = 80;
    const minX = this.cameraX - margin;
    const maxX = this.cameraX + width + margin;
    const minY = this.cameraY - margin;
    const maxY = this.cameraY + height + margin;

    // 1. Draw Biome Terrain / Concept Art Background
    this.drawTerrain(this.ctx);

    // 2. Draw 2.5D Isometric Diamond Grid & Block Slabs
    this.grid.draw(this.ctx, this.cameraX, this.cameraY, this.currentRegion);

    // 3. Unified 2.5D Depth-Occluded Entity Layer
    const renderables: { y: number; draw: () => void }[] = [];

    for (const obj of this.worldObjects) {
      const gx = Math.round(obj.x / IsometricGrid.TILE_WIDTH);
      const gy = Math.round(obj.y / IsometricGrid.TILE_HEIGHT);
      if (!this.grid.tiles[gx] || !this.grid.tiles[gx][gy] || this.grid.tiles[gx][gy].visibility > 0) {
        if (obj.x >= minX && obj.x <= maxX && obj.y >= minY && obj.y <= maxY) {
          renderables.push({
            y: obj.y + (obj.type === 'coastal_palm' ? 18 : obj.height / 2),
            draw: () => obj.draw(this.ctx, this.cameraX, this.cameraY)
          });
        }
      }
    }

    for (const npc of this.npcs) {
      if (npc.x >= minX && npc.x <= maxX && npc.y >= minY && npc.y <= maxY) {
        renderables.push({
          y: npc.y + npc.height / 2,
          draw: () => npc.draw(this.ctx, this.cameraX, this.cameraY)
        });
      }
    }

    for (const enemy of this.enemies) {
      if (enemy.isAlive && enemy.x >= minX && enemy.x <= maxX && enemy.y >= minY && enemy.y <= maxY) {
        const gx = Math.round(enemy.x / IsometricGrid.TILE_WIDTH);
        const gy = Math.round(enemy.y / IsometricGrid.TILE_HEIGHT);
        if (!this.grid.tiles[gx] || !this.grid.tiles[gx][gy] || this.grid.tiles[gx][gy].visibility > 0) {
          renderables.push({
            y: enemy.y + enemy.height / 2,
            draw: () => enemy.draw(this.ctx, this.cameraX, this.cameraY)
          });
        }
      }
    }

    if (this.boss && this.boss.x >= minX && this.boss.x <= maxX && this.boss.y >= minY && this.boss.y <= maxY) {
      renderables.push({
        y: this.boss.y + 40,
        draw: () => this.boss!.draw(this.ctx, this.cameraX, this.cameraY)
      });
    }

    renderables.push({
      y: this.player.y + this.player.height / 2,
      draw: () => this.player.draw(this.ctx, this.cameraX, this.cameraY)
    });

    renderables.sort((a, b) => a.y - b.y);
    for (const r of renderables) {
      r.draw();
    }

    // 4. Draw Ballistic Arrows
    for (const arrow of this.arrows) {
      arrow.draw(this.ctx, this.cameraX, this.cameraY);
    }

    // 5. Draw Particle System
    particleSystem.draw(this.ctx, this.cameraX, this.cameraY);

    // 6. Draw 2.5D Floating Damage/Healing/Stamina Texts
    this.turnSystem.drawFloatingTexts(this.ctx, this.cameraX, this.cameraY);

    // 7. Darkness Light Mask & Radial Vision Fog
    this.drawLightingMask(this.ctx, width, height);

    // 8. Weather Particle & Atmospheric Effects
    this.weatherSystem.updateAndDraw(this.ctx, width, height, this.cameraX, this.cameraY, 0.016);

    // 9. HUD & Vitals
    let isNearCampfire = this.isNearAnyLitCampfire();
    this.hud.draw(this.ctx, width, height, this.player, this.currentRegion, isNearCampfire, this.interactionPrompt, this.turnSystem.turnCount);

    // 10. In-game Notification Banner
    if (this.notificationMessage) {
      this.drawNotification(this.ctx, width, height);
    }
  }

  private drawTerrain(ctx: CanvasRenderingContext2D) {
    const reg = this.currentRegion;
    const width = this.canvas.width;
    const height = this.canvas.height;

    // 1. Base ground color
    ctx.fillStyle = reg.groundColor;
    ctx.fillRect(0, 0, width, height);

    // 2. Concept Art Environment Illustration Overlay (If loaded)
    const conceptImg = assetManager.getImage(reg.biomeType) || assetManager.getImage('frost');
    if (conceptImg && conceptImg.complete && conceptImg.naturalWidth > 0) {
      ctx.save();
      ctx.globalAlpha = 0.38; // Rich atmospheric landscape blend
      // Parallax-style tiling/scaling
      const imgAspect = conceptImg.naturalWidth / conceptImg.naturalHeight;
      const drawH = height * 1.2;
      const drawW = drawH * imgAspect;
      const offsetX = -(this.cameraX * 0.15) % drawW;
      const offsetY = -(this.cameraY * 0.15) % drawH;

      ctx.drawImage(conceptImg, offsetX, offsetY, drawW, drawH);
      if (offsetX + drawW < width) {
        ctx.drawImage(conceptImg, offsetX + drawW, offsetY, drawW, drawH);
      }
      ctx.restore();
    }

    // 3. Procedural Biome Environmental Details
    ctx.save();
    if (reg.biomeType === 'beach') {
      // Dynamic Coastal Tide Water & Shoreline Foam Waves (Art Director & Biome Lead Specs)
      const waveOffset = Math.sin(Date.now() * 0.002) * 18;

      // Wet Sand Shoreline (Tide line at bottom of map)
      ctx.fillStyle = 'rgba(142, 128, 92, 0.35)';
      ctx.fillRect(0, reg.height - 350 - this.cameraY, width, 350);

      // Shoreline Sea Foam & Tidal Ripples
      ctx.fillStyle = 'rgba(224, 242, 254, 0.22)';
      for (let i = 0; i < 6; i++) {
        const py = reg.height - 320 + i * 50 + waveOffset - this.cameraY;
        if (py >= -50 && py <= height + 50) {
          ctx.beginPath();
          ctx.ellipse(width / 2, py, width * 0.9, 14 + i * 2, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Jagged Basaltic Reef Rocks (Outcrops on the coast)
      ctx.fillStyle = '#2d3748';
      ctx.beginPath();
      ctx.moveTo(150 - this.cameraX, reg.height - 180 - this.cameraY);
      ctx.lineTo(240 - this.cameraX, reg.height - 290 - this.cameraY);
      ctx.lineTo(320 - this.cameraX, reg.height - 160 - this.cameraY);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(1650 - this.cameraX, 400 - this.cameraY);
      ctx.lineTo(1780 - this.cameraX, 260 - this.cameraY);
      ctx.lineTo(1890 - this.cameraX, 450 - this.cameraY);
      ctx.closePath();
      ctx.fill();
    } else if (reg.biomeType === 'swamp') {
      // Bioluminescent phosphor mud pools
      ctx.fillStyle = 'rgba(112, 224, 0, 0.15)';
      ctx.beginPath();
      ctx.arc(600 - this.cameraX, 800 - this.cameraY, 120, 0, Math.PI * 2);
      ctx.arc(1600 - this.cameraX, 1200 - this.cameraY, 150, 0, Math.PI * 2);
      ctx.fill();
    } else if (reg.biomeType === 'caverns') {
      // Subterranean glowing crystal veins
      ctx.strokeStyle = 'rgba(114, 9, 183, 0.35)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(300 - this.cameraX, 200 - this.cameraY);
      ctx.lineTo(800 - this.cameraX, 900 - this.cameraY);
      ctx.lineTo(1800 - this.cameraX, 1500 - this.cameraY);
      ctx.stroke();
    } else if (reg.biomeType === 'alien_core') {
      // Biomechanical energy conduit rings
      ctx.strokeStyle = 'rgba(0, 245, 212, 0.3)';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(reg.width / 2 - this.cameraX, reg.height / 2 - this.cameraY, 320, 0, Math.PI * 2);
      ctx.arc(reg.width / 2 - this.cameraX, reg.height / 2 - this.cameraY, 520, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // 4. Subtle Spatial Reference Grid
    const tileSize = 64;
    const startCol = Math.floor(this.cameraX / tileSize);
    const endCol = startCol + Math.ceil(width / tileSize) + 1;
    const startRow = Math.floor(this.cameraY / tileSize);
    const endRow = startRow + Math.ceil(height / tileSize) + 1;

    ctx.save();
    ctx.strokeStyle = reg.accentColor;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.12;

    for (let c = startCol; c <= endCol; c++) {
      for (let r = startRow; r <= endRow; r++) {
        const x = c * tileSize - this.cameraX;
        const y = r * tileSize - this.cameraY;
        ctx.strokeRect(x, y, tileSize, tileSize);
      }
    }
    ctx.restore();
  }

  private drawChokepoints(ctx: CanvasRenderingContext2D) {
    for (const cp of this.currentRegion.chokepoints) {
      const screenX = cp.x - this.cameraX;
      const screenY = cp.y - this.cameraY;

      ctx.save();
      ctx.fillStyle = 'rgba(212, 175, 55, 0.25)';
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 2;
      ctx.fillRect(screenX - cp.width / 2, screenY - cp.height / 2, cp.width, cp.height);
      ctx.strokeRect(screenX - cp.width / 2, screenY - cp.height / 2, cp.width, cp.height);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`🚪 ${cp.name}`, screenX, screenY);
      ctx.restore();
    }
  }

  private drawLightingMask(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const regionDarkness = 1.0 - this.currentRegion.ambientLight;
    const nightDarkness = dayNightCycle.getAmbientDarkness();
    const totalDarkness = Math.min(0.92, Math.max(regionDarkness, nightDarkness));

    const hasSpectralVision = this.player.hasEquippedAbility('iron_grip');
    const hasSpectralLantern = this.player.isEphemeralActive('spectral_lantern');
    const isHoldingTorch = this.player.isHoldingTorch;

    if (totalDarkness <= 0.08 && !hasSpectralLantern && !isHoldingTorch) return;

    ctx.save();
    let targetAlpha = hasSpectralVision ? 0.35 : hasSpectralLantern ? 0.25 : totalDarkness;

    const playerScreenX = this.player.x - this.cameraX;
    const playerScreenY = this.player.y - this.cameraY;

    // Torch / Lantern light radius
    let lightRadius = 90;
    if (hasSpectralLantern) {
      lightRadius = 300;
    } else if (isHoldingTorch) {
      const flicker = Math.sin(Date.now() * 0.015) * 6;
      lightRadius = 240 + flicker;
      targetAlpha = Math.min(targetAlpha, 0.76);
    } else if (hasSpectralVision) {
      lightRadius = 180;
    }

    const grad = ctx.createRadialGradient(playerScreenX, playerScreenY, 15, playerScreenX, playerScreenY, lightRadius);
    grad.addColorStop(0, isHoldingTorch ? 'rgba(255, 170, 50, 0.08)' : 'rgba(0, 0, 0, 0)');
    grad.addColorStop(0.65, isHoldingTorch ? 'rgba(255, 120, 30, 0.04)' : 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, `rgba(5, 5, 12, ${targetAlpha})`);

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Also illuminate around active campfires
    for (const obj of this.worldObjects) {
      if (obj.type === 'campfire' && obj.isLit) {
        const fireScreenX = obj.x - this.cameraX;
        const fireScreenY = obj.y - this.cameraY;
        if (fireScreenX >= -150 && fireScreenX <= width + 150 && fireScreenY >= -150 && fireScreenY <= height + 150) {
          const fireGrad = ctx.createRadialGradient(fireScreenX, fireScreenY, 10, fireScreenX, fireScreenY, 160);
          fireGrad.addColorStop(0, 'rgba(255, 180, 50, 0.35)');
          fireGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.save();
          ctx.globalCompositeOperation = 'destination-out';
          ctx.fillStyle = fireGrad;
          ctx.beginPath();
          ctx.arc(fireScreenX, fireScreenY, 160, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }

    ctx.restore();
  }

  private drawNotification(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1.5;
    const boxW = Math.min(width - 40, 480);
    const boxX = (width - boxW) / 2;
    const boxY = 60;
    ctx.fillRect(boxX, boxY, boxW, 36);
    ctx.strokeRect(boxX, boxY, boxW, 36);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.notificationMessage, width / 2, boxY + 18);
    ctx.restore();
  }
}
