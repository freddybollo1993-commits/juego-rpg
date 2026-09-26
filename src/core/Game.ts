// Game.ts - Core 60 FPS Game Loop, World Orchestration, Combat and Autonomous Regions (GDD Sec. 1-10)

import { Player } from '../entities/Player';
import { NPC } from '../entities/NPC';
import { Enemy, EnemyType } from '../entities/Enemy';
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
import { soundManager } from '../audio/SoundManager';

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

  // Active Regional World
  public currentRegion: RegionData;
  public npcs: NPC[] = [];
  public enemies: Enemy[] = [];
  public worldObjects: WorldObject[] = [];
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

    // Default start region: Tutorial Beach (GDD Sec. 10.4)
    this.currentRegion = REGIONS_DATA['beach'];

    // Try load saved state
    this.tryLoadState();

    // Load active region entities
    this.loadRegion(this.currentRegion.id, false);

    // Setup HUD callbacks
    this.setupHudEvents();

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
    this.boss = null;

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
      // Tribal Sacred Totem / Campfire next to Chief
      this.worldObjects.push(new WorldObject('campfire', reg.width / 2 - 20, reg.height / 2 - 50));
    }

    // Spawn Region-specific Objects & Enemies
    if (reg.biomeType === 'beach') {
      // Tutorial beach elements (GDD Sec. 10.4)
      this.worldObjects.push(new WorldObject('shipwreck_debris', 350, 750));
      this.worldObjects.push(new WorldObject('branch_pile', 450, 720));
      this.worldObjects.push(new WorldObject('flint_rock', 520, 800));
      this.worldObjects.push(new WorldObject('forage_bush', 600, 700));
      // First unlit campfire for tutorial survival
      const tutorialFire = new WorldObject('campfire', 480, 850);
      tutorialFire.isLit = false;
      this.worldObjects.push(tutorialFire);
    } else if (reg.biomeType === 'frost') {
      // Frost Plateau enemies & hazards
      this.enemies.push(new Enemy('frost_beast', 600, 500));
      this.enemies.push(new Enemy('frost_beast', 1700, 1200));
      this.enemies.push(new Enemy('frost_beast', 1300, 1600));
      // Campfire outposts
      this.worldObjects.push(new WorldObject('campfire', 1200, 1000));
    } else if (reg.biomeType === 'forest') {
      // Taiga wolves
      this.enemies.push(new Enemy('stalking_wolf', 800, 700));
      this.enemies.push(new Enemy('stalking_wolf', 1600, 800));
      this.enemies.push(new Enemy('stalking_wolf', 1100, 1500));
      this.worldObjects.push(new WorldObject('forage_bush', 900, 1100));
      this.worldObjects.push(new WorldObject('forage_bush', 1500, 600));
    } else if (reg.biomeType === 'swamp') {
      // Swamp Horrors
      this.enemies.push(new Enemy('swamp_horror', 600, 800));
      this.enemies.push(new Enemy('swamp_horror', 1800, 900));
      this.enemies.push(new Enemy('swamp_horror', 1400, 1400));
      this.worldObjects.push(new WorldObject('campfire', 1200, 1000));
    } else if (reg.biomeType === 'canyon') {
      // Volcanic Scorpions
      this.enemies.push(new Enemy('volcanic_scorpion', 700, 700));
      this.enemies.push(new Enemy('volcanic_scorpion', 1600, 700));
      this.enemies.push(new Enemy('volcanic_scorpion', 1200, 1500));
      this.worldObjects.push(new WorldObject('campfire', 1200, 1000));
    } else if (reg.biomeType === 'caverns') {
      // Crystal Stalkers
      this.enemies.push(new Enemy('crystal_stalker', 700, 700));
      this.enemies.push(new Enemy('crystal_stalker', 1700, 800));
      this.enemies.push(new Enemy('crystal_stalker', 1100, 1400));
      this.worldObjects.push(new WorldObject('campfire', 1200, 1000));
    } else if (reg.biomeType === 'alien_core') {
      // Arena del Clímax: Boss "El Heraldo de las Estrellas"
      if (!this.bossDefeated) {
        this.boss = new Boss(reg.width / 2, reg.height / 2 - 120);
        this.enemies.push(new Enemy('alien_drone', reg.width / 2 - 140, reg.height / 2));
        this.enemies.push(new Enemy('alien_drone', reg.width / 2 + 140, reg.height / 2));
      }
      this.worldObjects.push(new WorldObject('campfire', reg.width / 2, reg.height - 180));
    }

    // Spawn exotic material nodes
    for (const node of reg.exoticMaterialSpawns) {
      this.worldObjects.push(new WorldObject('exotic_node', node.x, node.y, node.itemId));
    }

    // Show region arrival notification
    this.showNotification(`Has entrado a: ${reg.name}`);
  }

  private setupHudEvents() {
    this.hud.onSacrificeClick = () => {
      this.triggerSacrificeAction();
    };
    this.hud.onCodexClick = () => {
      this.openCodex();
    };
    this.hud.onInventoryClick = () => {
      this.openInventory();
    };
    this.hud.onRadialToggle = () => {
      this.openRadialMenu();
    };
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

    soundManager.init();

    // 1. Check Modals & UI inputs
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

    // Check modal open states
    if (this.codexModal.isOpen() || this.inventoryModal.isOpen() || this.dialogueModal.isOpen() || this.endingModal.isOpen() || this.radialMenu.isOpen()) {
      return; // Pause world updates during modal interactions
    }

    // 2. Player Movement & Stamina Mechanics
    let speed = this.player.speed;
    let isMoving = this.input.moveX !== 0 || this.input.moveY !== 0;

    // Running / Sprinting
    if (this.input.isRunning && isMoving && this.player.vitals.stamina > 5) {
      speed *= 1.5;
      let staminaCost = 14 * delta;
      // Canopy Stride tribal passive (-30% stamina cost when running)
      if (this.player.hasEquippedAbility('canopy_stride') && this.player.canopyStrideActive) {
        staminaCost *= 0.7;
      }
      this.player.vitals.stamina = Math.max(0, this.player.vitals.stamina - staminaCost);
    }

    this.player.vx = this.input.moveX * speed;
    this.player.vy = this.input.moveY * speed;

    if (isMoving) {
      if (Math.abs(this.input.moveX) > Math.abs(this.input.moveY)) {
        this.player.facing = this.input.moveX > 0 ? 'right' : 'left';
      } else {
        this.player.facing = this.input.moveY > 0 ? 'down' : 'up';
      }
      // Audio footstep
      if (Math.random() < 0.05) {
        soundManager.playFootstep(this.currentRegion.biomeType === 'frost' ? 'snow' : this.currentRegion.biomeType === 'swamp' ? 'mud' : 'dirt');
      }
    }

    this.player.update(delta);

    // Keep player in bounds
    this.player.x = Math.max(20, Math.min(this.currentRegion.width - 20, this.player.x));
    this.player.y = Math.max(20, Math.min(this.currentRegion.height - 20, this.player.y));

    // 3. Proximity Checks & Interaction Prompts
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

    // Check NPCs
    for (const npc of this.npcs) {
      if (npc.isNearPlayer(this.player.x, this.player.y)) {
        this.interactionPrompt = `[E] Hablar con ${npc.name}`;
        this.nearbyInteractable = { type: 'npc', target: npc };
      }
    }

    // Check Chokepoints (Regional Transitions)
    for (const cp of this.currentRegion.chokepoints) {
      if (
        this.player.x >= cp.x - cp.width / 2 &&
        this.player.x <= cp.x + cp.width / 2 &&
        this.player.y >= cp.y - cp.height / 2 &&
        this.player.y <= cp.y + cp.height / 2
      ) {
        // Alien core gate requirement check (GDD Sec. 9.2)
        if (cp.targetRegionId === 'alien_core') {
          if (!this.player.getItemCount('alien_translator_device')) {
            this.interactionPrompt = '⚠️ Barrera Alienígena Impenetrable (Requiere Dispositivo de Traducción)';
            continue;
          }
        }
        this.interactionPrompt = `[E] Viajar a: ${cp.name}`;
        this.nearbyInteractable = { type: 'chokepoint', target: cp };
      }
    }

    // Handle Interaction Keypress
    if (this.input.interactPressed && this.nearbyInteractable) {
      this.input.interactPressed = false;
      this.performInteraction(this.nearbyInteractable);
    }

    // 4. Combat Updates (Player Attack & Enemy AI)
    if (this.input.attackPressed) {
      this.input.attackPressed = false;
      if (this.player.attack()) {
        this.resolveMeleeAttack();
      }
    }

    // Update Enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(this.player, delta);
      if (!enemy.isAlive) {
        // Track trial kill progression if relevant
        if (this.currentRegion.tribeId) {
          const tribe = TRIBES_DATA[this.currentRegion.tribeId];
          if (tribe && !tribe.trial.completed) {
            tribe.trial.currentCount = Math.min(tribe.trial.targetCount, tribe.trial.currentCount + 1);
            this.showNotification(`¡Progreso de Prueba Tribal! (${tribe.trial.currentCount}/${tribe.trial.targetCount})`);
          }
        }
        this.enemies.splice(i, 1);
      }
    }

    // Update Final Boss
    if (this.boss && this.boss.isAlive) {
      this.boss.update(this.player, delta, (newPhase: BossPhase) => {
        // Change weather during boss terraforming phases (GDD Sec. 9.3)
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
        this.endingModal.show((choice) => {
          this.showNotification(`Has elegido: ${choice === 'dismantle' ? 'Desmantelar' : 'Integrar'}. ¡Mundo Pacificado!`);
          this.weatherSystem.setWeather('clear');
        });
      }
    }

    // 5. Survival System Tick
    this.survivalSystem.update(this.player, this.currentRegion, isNearCampfire, false, delta);

    // Check Player Death
    if (this.player.vitals.health <= 0) {
      this.handlePlayerDeath();
    }

    // 6. Camera Follow
    const targetCamX = this.player.x - this.canvas.width / 2;
    const targetCamY = this.player.y - this.canvas.height / 2;
    this.cameraX += (targetCamX - this.cameraX) * 0.1;
    this.cameraY += (targetCamY - this.cameraY) * 0.1;

    // 7. Auto-Save every 20 seconds
    this.autoSaveTimer += delta;
    if (this.autoSaveTimer >= 20) {
      this.autoSaveTimer = 0;
      SaveSystem.save(this.player, this.currentRegion.id, this.bossDefeated);
    }

    // Notification timer
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

    // Damage enemies in range
    for (const enemy of this.enemies) {
      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;
      if (Math.sqrt(dx * dx + dy * dy) <= range) {
        enemy.takeDamage(dmg, this.player);
      }
    }

    // Damage boss in range
    if (this.boss && this.boss.isAlive) {
      const dx = this.boss.x - this.player.x;
      const dy = this.boss.y - this.player.y;
      if (Math.sqrt(dx * dx + dy * dy) <= range + 40) {
        this.boss.takeMeleeDamage(dmg);
      }
    }
  }

  public triggerSacrificeAction() {
    const result = this.player.triggerSacrifice();
    if (result.success) {
      this.showNotification(`💥 ¡SACRIFICIO DETONADO: ${result.effectName}!`);

      // Freeze or damage nearby enemies
      for (const enemy of this.enemies) {
        const dx = enemy.x - this.player.x;
        const dy = enemy.y - this.player.y;
        if (Math.sqrt(dx * dx + dy * dy) <= 240) {
          enemy.takeDamage(75, this.player);
          enemy.freeze(6.0);
        }
      }

      // Interrupt Boss if in range
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
        // Save state after dialogue/reputation change
        SaveSystem.save(this.player, this.currentRegion.id, this.bossDefeated);
      });
    } else if (item.type === 'object') {
      const obj = item.target as WorldObject;
      if (obj.type === 'campfire' && !obj.isLit) {
        // Light campfire with branches & flint
        if (this.player.getItemCount('branches') >= 1 && this.player.getItemCount('flint') >= 1) {
          this.player.removeItem('branches', 1);
          obj.isLit = true;
          soundManager.playCampfire();
          this.showNotification('¡Encendiste la fogata! Ahora puedes calentarte, cocinar y sintonizar el Códice.');
        } else {
          this.showNotification('Necesitas al menos 1 Rama y 1 Pedernal para encender fuego.');
        }
      } else {
        const msg = obj.interact(this.player);
        if (msg) this.showNotification(msg);
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
    // Check if player is near campfire to allow tuning
    let isNearRest = false;
    for (const obj of this.worldObjects) {
      if (obj.type === 'campfire' && obj.isLit && obj.isNear(this.player.x, this.player.y)) {
        isNearRest = true;
        break;
      }
    }
    this.codexModal.show(this.player, isNearRest, () => {
      SaveSystem.save(this.player, this.currentRegion.id, this.bossDefeated);
    });
  }

  public openInventory() {
    this.inventoryModal.show(this.player, () => {
      SaveSystem.save(this.player, this.currentRegion.id, this.bossDefeated);
    });
  }

  public openRadialMenu() {
    const options: RadialOption[] = [
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
        id: 'canopy',
        label: 'Zancada',
        icon: '🍃',
        color: '#22c55e',
        action: () => {
          if (this.player.hasEquippedAbility('canopy_stride')) {
            const active = this.player.toggleCanopyStride();
            this.showNotification(`Zancada de Canopia: ${active ? 'ACTIVADA' : 'DESACTIVADA'}`);
          } else {
            this.showNotification('No tienes la Zancada de Canopia equipada.');
          }
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

  // --- Rendering Orchestration ---

  private render() {
    const width = this.canvas.width;
    const height = this.canvas.height;

    this.ctx.clearRect(0, 0, width, height);

    // 1. Draw Biome Terrain Ground
    this.drawTerrain(this.ctx);

    // 2. Draw World Objects (Campfires, Forage, Exotic Nodes)
    for (const obj of this.worldObjects) {
      obj.draw(this.ctx, this.cameraX, this.cameraY);
    }

    // 3. Draw Chokepoint Portals / Roadways
    this.drawChokepoints(this.ctx);

    // 4. Draw NPCs
    for (const npc of this.npcs) {
      npc.draw(this.ctx, this.cameraX, this.cameraY);
    }

    // 5. Draw Enemies
    for (const enemy of this.enemies) {
      enemy.draw(this.ctx, this.cameraX, this.cameraY);
    }

    // 6. Draw Final Boss
    if (this.boss) {
      this.boss.draw(this.ctx, this.cameraX, this.cameraY);
    }

    // 7. Draw Player
    this.player.draw(this.ctx, this.cameraX, this.cameraY);

    // 8. Darkness Light Mask (Caverns / Night penumbra)
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

    // Base background
    ctx.fillStyle = reg.groundColor;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Subtle Grid / Texture Tiles
    const tileSize = 64;
    const startCol = Math.floor(this.cameraX / tileSize);
    const endCol = startCol + Math.ceil(this.canvas.width / tileSize) + 1;
    const startRow = Math.floor(this.cameraY / tileSize);
    const endRow = startRow + Math.ceil(this.canvas.height / tileSize) + 1;

    ctx.save();
    ctx.strokeStyle = reg.accentColor;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.2;

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
    const lightLevel = this.currentRegion.ambientLight;

    // Has Spectral Vision passive or Spectral Lantern active?
    const hasSpectralVision = this.player.hasEquippedAbility('iron_grip');
    const hasSpectralLantern = this.player.isEphemeralActive('spectral_lantern');

    if (lightLevel >= 0.8 && !hasSpectralLantern) return;

    ctx.save();
    // Dark overlay mask
    const targetAlpha = hasSpectralVision ? 0.3 : hasSpectralLantern ? 0.2 : (1.0 - lightLevel);

    const playerScreenX = this.player.x - this.cameraX;
    const playerScreenY = this.player.y - this.cameraY;

    const lightRadius = hasSpectralLantern ? 280 : hasSpectralVision ? 180 : 90;

    const grad = ctx.createRadialGradient(playerScreenX, playerScreenY, 15, playerScreenX, playerScreenY, lightRadius);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, `rgba(5, 5, 12, ${targetAlpha})`);

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

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
