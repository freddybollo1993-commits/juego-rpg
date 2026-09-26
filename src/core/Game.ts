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
import { assetManager } from './AssetManager';
import { soundManager } from '../audio/SoundManager';
import { questSystem } from '../systems/QuestSystem';
import { Arrow } from '../entities/Arrow';
import { particleSystem } from '../systems/ParticleSystem';
import { dayNightCycle } from '../systems/DayNightCycle';
import { talentModal } from '../ui/TalentModal';

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lastTime: number = 0;
  private isRunning: boolean = true;

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

    // Initial position
    if (resetPosition) {
      this.player.x = reg.width / 2;
      this.player.y = reg.height / 2;
    }

    // Spawn Tribe Chief if region has one
    if (reg.tribeId && TRIBES_DATA[reg.tribeId]) {
      this.npcs.push(new NPC(reg.tribeId, reg.width / 2 - 80, reg.height / 2 - 60));
      this.worldObjects.push(new WorldObject('campfire', reg.width / 2 - 20, reg.height / 2 - 50));
    }

    // Spawn Region-specific Objects & Enemies
    if (reg.biomeType === 'beach') {
      // Primary Landing Site (Surrounding Player Spawn at 1000, 800)
      const tutorialFire = new WorldObject('campfire', 960, 860);
      tutorialFire.isLit = false;
      this.worldObjects.push(tutorialFire);

      // Starter Workbench for Early Crafting
      this.worldObjects.push(new WorldObject('workbench', 1010, 920));

      this.worldObjects.push(new WorldObject('shipwreck_debris', 920, 760));
      this.worldObjects.push(new WorldObject('shipwreck_debris', 1080, 840));
      this.worldObjects.push(new WorldObject('shipwreck_debris', 850, 890));

      this.worldObjects.push(new WorldObject('coastal_palm', 900, 720));
      this.worldObjects.push(new WorldObject('coastal_palm', 1120, 740));
      this.worldObjects.push(new WorldObject('coastal_palm', 1040, 920));
      this.worldObjects.push(new WorldObject('coastal_palm', 780, 840));

      this.worldObjects.push(new WorldObject('branch_pile', 980, 750));
      this.worldObjects.push(new WorldObject('branch_pile', 1050, 880));

      this.worldObjects.push(new WorldObject('flint_rock', 1020, 820));
      this.worldObjects.push(new WorldObject('flint_rock', 930, 880));

      this.worldObjects.push(new WorldObject('forage_bush', 1100, 790));
      this.worldObjects.push(new WorldObject('forage_bush', 870, 800));

      // Additional Wreckage & Vegetation Spread Across Beach
      this.worldObjects.push(new WorldObject('shipwreck_debris', 350, 750));
      this.worldObjects.push(new WorldObject('shipwreck_debris', 1450, 650));
      this.worldObjects.push(new WorldObject('coastal_palm', 450, 600));
      this.worldObjects.push(new WorldObject('coastal_palm', 1350, 950));
      this.worldObjects.push(new WorldObject('forage_bush', 600, 700));
      this.worldObjects.push(new WorldObject('forage_bush', 1500, 800));
    } else if (reg.biomeType === 'frost') {
      this.enemies.push(new Enemy('frost_beast', 600, 500));
      this.enemies.push(new Enemy('frost_beast', 1700, 1200));
      this.enemies.push(new Enemy('frost_beast', 1300, 1600));
      this.worldObjects.push(new WorldObject('campfire', 1200, 1000));
      // Frost Clan Anvil Workstation
      this.worldObjects.push(new WorldObject('anvil', reg.width / 2 - 90, reg.height / 2 - 20));
    } else if (reg.biomeType === 'forest') {
      this.enemies.push(new Enemy('stalking_wolf', 800, 700));
      this.enemies.push(new Enemy('stalking_wolf', 1600, 800));
      this.enemies.push(new Enemy('stalking_wolf', 1100, 1500));
      this.worldObjects.push(new WorldObject('forage_bush', 900, 1100));
      this.worldObjects.push(new WorldObject('forage_bush', 1500, 600));
      this.worldObjects.push(new WorldObject('night_orchid_plant', 1350, 1100));
      // Nomad Woodcarving Workbench
      this.worldObjects.push(new WorldObject('workbench', reg.width / 2 - 90, reg.height / 2 - 20));
    } else if (reg.biomeType === 'swamp') {
      this.enemies.push(new Enemy('swamp_horror', 600, 800));
      this.enemies.push(new Enemy('swamp_horror', 1800, 900));
      this.enemies.push(new Enemy('swamp_horror', 1400, 1400));
      this.worldObjects.push(new WorldObject('campfire', 1200, 1000));
      this.worldObjects.push(new WorldObject('night_orchid_plant', 900, 650));
      // Morgath Alchemical Cauldron
      this.worldObjects.push(new WorldObject('alchemy_station', reg.width / 2 - 90, reg.height / 2 - 20));
    } else if (reg.biomeType === 'canyon') {
      this.enemies.push(new Enemy('volcanic_scorpion', 700, 700));
      this.enemies.push(new Enemy('volcanic_scorpion', 1600, 700));
      this.enemies.push(new Enemy('volcanic_scorpion', 1200, 1500));
      this.worldObjects.push(new WorldObject('campfire', 1200, 1000));
      // Sun-Walkers Leather Tanning Station
      this.worldObjects.push(new WorldObject('tanner', reg.width / 2 - 90, reg.height / 2 - 20));
    } else if (reg.biomeType === 'caverns') {
      this.enemies.push(new Enemy('crystal_stalker', 700, 700));
      this.enemies.push(new Enemy('crystal_stalker', 1700, 800));
      this.enemies.push(new Enemy('crystal_stalker', 1100, 1400));
      this.worldObjects.push(new WorldObject('campfire', 1200, 1000));
      this.worldObjects.push(new WorldObject('anvil', reg.width / 2 - 90, reg.height / 2 - 20));

      // --- Ruinas Precursoras (Fase 3.3 Dungeon Chamber) ---
      // 3 Glyph Pedestals surrounding the Ancestral Chest
      this.worldObjects.push(new WorldObject('precursor_pedestal', 1400, 600));
      this.worldObjects.push(new WorldObject('precursor_pedestal', 1600, 600));
      this.worldObjects.push(new WorldObject('precursor_pedestal', 1500, 480));
      this.worldObjects.push(new WorldObject('precursor_chest', 1500, 560));

      // Elite Precursor Golem guarding the chamber!
      this.enemies.push(new Enemy('precursor_golem', 1500, 640));
    } else if (reg.biomeType === 'alien_core') {
      questSystem.updateObjective('celestial_reckoning', 'enter_core', 1);
      if (!this.bossDefeated) {
        this.boss = new Boss(reg.width / 2, reg.height / 2 - 120);
        this.enemies.push(new Enemy('alien_drone', reg.width / 2 - 140, reg.height / 2));
        this.enemies.push(new Enemy('alien_drone', reg.width / 2 + 140, reg.height / 2));
      }
      this.worldObjects.push(new WorldObject('campfire', reg.width / 2, reg.height - 180));
    }

    for (const node of reg.exoticMaterialSpawns) {
      this.worldObjects.push(new WorldObject('exotic_node', node.x, node.y, node.itemId));
    }

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

    // Player Movement
    let speed = this.player.speed;
    let isMoving = this.input.moveX !== 0 || this.input.moveY !== 0;

    if (this.input.isRunning && isMoving && (this.player.vitals.stamina > 5 || this.testWorldModal.infiniteStamina)) {
      speed *= 1.5;
      if (!this.testWorldModal.infiniteStamina) {
        let staminaCost = 14 * delta;
        if (this.player.hasEquippedAbility('canopy_stride') && this.player.canopyStrideActive) {
          staminaCost *= 0.7;
        }
        this.player.vitals.stamina = Math.max(0, this.player.vitals.stamina - staminaCost);
      }
    }

    this.player.vx = this.input.moveX * speed;
    this.player.vy = this.input.moveY * speed;

    if (isMoving) {
      if (Math.abs(this.input.moveX) > Math.abs(this.input.moveY)) {
        this.player.facing = this.input.moveX > 0 ? 'right' : 'left';
      } else {
        this.player.facing = this.input.moveY > 0 ? 'down' : 'up';
      }
      if (Math.random() < 0.05) {
        soundManager.playFootstep(this.currentRegion.biomeType === 'frost' ? 'snow' : this.currentRegion.biomeType === 'swamp' ? 'mud' : 'dirt');
      }
    }

    this.player.update(delta);
    this.player.x = Math.max(20, Math.min(this.currentRegion.width - 20, this.player.x));
    this.player.y = Math.max(20, Math.min(this.currentRegion.height - 20, this.player.y));

    // Proximity Checks & Prompts
    this.interactionPrompt = null;
    this.nearbyInteractable = null;

    let isNearCampfire = false;
    for (const obj of this.worldObjects) {
      if (obj.isNear(this.player.x, this.player.y)) {
        if (obj.type === 'campfire' && obj.isLit) {
          isNearCampfire = true;
          this.interactionPrompt = '[E] Descansar y Cocinar en Fogata';
          this.nearbyInteractable = { type: 'object', target: obj };
        } else if (obj.type === 'campfire' && !obj.isLit) {
          this.interactionPrompt = '[E] Encender Fogata de Supervivencia';
          this.nearbyInteractable = { type: 'object', target: obj };
        } else if (!obj.isDepleted) {
          this.interactionPrompt = `[E] Recolectar ${obj.type === 'forage_bush' ? 'Bayas' : 'Recursos'}`;
          this.nearbyInteractable = { type: 'object', target: obj };
        }
      }
    }

    for (const npc of this.npcs) {
      if (npc.isNearPlayer(this.player.x, this.player.y)) {
        this.interactionPrompt = `[E] Hablar con ${npc.name}`;
        this.nearbyInteractable = { type: 'npc', target: npc };
      }
    }

    for (const cp of this.currentRegion.chokepoints) {
      if (
        this.player.x >= cp.x - cp.width / 2 &&
        this.player.x <= cp.x + cp.width / 2 &&
        this.player.y >= cp.y - cp.height / 2 &&
        this.player.y <= cp.y + cp.height / 2
      ) {
        if (cp.targetRegionId === 'alien_core' && !this.player.getItemCount('alien_translator_device')) {
          this.interactionPrompt = '⚠️ Barrera Alienígena Impenetrable (Requiere Dispositivo de Traducción)';
          continue;
        }
        this.interactionPrompt = `[E] Viajar a: ${cp.name}`;
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

    // Update Combat & Dash Particle Engine (Fase 2.2)
    particleSystem.update(delta);
    if (this.player.isDashing) {
      particleSystem.spawnDashDust(this.player.x, this.player.y, 1);
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

    // Camera Smooth Follow
    const targetCamX = this.player.x - this.canvas.width / 2;
    const targetCamY = this.player.y - this.canvas.height / 2;
    this.cameraX += (targetCamX - this.cameraX) * 0.1;
    this.cameraY += (targetCamY - this.cameraY) * 0.1;

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
    const arrow = this.player.shootBow();
    if (arrow) {
      this.arrows.push(arrow);
      particleSystem.spawnSparks(this.player.x, this.player.y - 6, '#ffd700', 5);
      const typeName = arrow.type === 'fire' ? 'Fuego' : arrow.type === 'frost' ? 'Escarcha' : 'Sílex';
      this.showNotification(`¡Flecha de ${typeName} disparada!`);
      return true;
    } else if (this.player.vitals.stamina < 8) {
      this.showNotification('¡Estamina insuficiente para tensar el arco!');
    } else {
      this.showNotification('¡Sin flechas disponibles! Fabrica más en el Banco de Trabajo.');
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

    // 1. Draw Biome Terrain Ground
    this.drawTerrain(this.ctx);

    // 2. Draw Chokepoints (Floor level)
    this.drawChokepoints(this.ctx);

    // 3. Unified Y-Sorted Entity Render Layer (2.5D Depth Occlusion)
    const renderables: { y: number; draw: () => void }[] = [];

    for (const obj of this.worldObjects) {
      if (obj.x >= minX && obj.x <= maxX && obj.y >= minY && obj.y <= maxY) {
        renderables.push({
          y: obj.y + (obj.type === 'coastal_palm' ? 18 : obj.height / 2),
          draw: () => obj.draw(this.ctx, this.cameraX, this.cameraY)
        });
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
      if (enemy.x >= minX && enemy.x <= maxX && enemy.y >= minY && enemy.y <= maxY) {
        renderables.push({
          y: enemy.y + enemy.height / 2,
          draw: () => enemy.draw(this.ctx, this.cameraX, this.cameraY)
        });
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

    // 6. Darkness Light Mask
    this.drawLightingMask(this.ctx, width, height);

    // 9. Weather Particle & Atmospheric Effects
    this.weatherSystem.updateAndDraw(this.ctx, width, height, this.cameraX, this.cameraY, 0.016);

    // 10. HUD & Vitals
    let isNearCampfire = false;
    for (const obj of this.worldObjects) {
      if (obj.type === 'campfire' && obj.isLit && obj.isNear(this.player.x, this.player.y)) {
        isNearCampfire = true;
        break;
      }
    }
    this.hud.draw(this.ctx, width, height, this.player, this.currentRegion, isNearCampfire, this.interactionPrompt);

    // 11. Touch Virtual Joystick
    this.input.drawTouchOverlay(this.ctx);

    // 12. In-game Notification Banner
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
