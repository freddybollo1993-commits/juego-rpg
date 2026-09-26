// InventoryModal.ts - Backpack, Reliquary and Crafting Interface (GDD Sec. 7.1-7.6)

import { Player } from '../entities/Player';
import { ITEMS_CATALOG, EphemeralArtifact } from '../data/items';
import { CRAFTING_RECIPES, CraftingSystem } from '../systems/CraftingSystem';
import { soundManager } from '../audio/SoundManager';

export class InventoryModal {
  private overlay: HTMLElement | null = null;
  private isVisible: boolean = false;
  private currentTab: 'backpack' | 'crafting' = 'backpack';
  private onActionCallback?: () => void;

  constructor() {
    this.createDom();
  }

  private createDom() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay hidden';
    this.overlay.innerHTML = `
      <div class="modal-card inventory-card">
        <div class="modal-header">
          <div class="modal-title">🎒 INVENTARIO Y ALMACÉN</div>
          <button class="modal-close-btn" id="close-inv-btn">✖</button>
        </div>
        <div class="modal-tabs">
          <button class="tab-btn active" id="tab-backpack">Mochila y Relicario</button>
          <button class="tab-btn" id="tab-crafting">Mesa de Fabricación</button>
        </div>
        <div class="modal-body" id="inv-body">
          <!-- Dynamically populated -->
        </div>
      </div>
    `;
    document.body.appendChild(this.overlay);

    this.overlay.querySelector('#close-inv-btn')?.addEventListener('click', () => this.hide());
    this.overlay.querySelector('#tab-backpack')?.addEventListener('click', () => {
      this.currentTab = 'backpack';
      this.overlay?.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      this.overlay?.querySelector('#tab-backpack')?.classList.add('active');
      this.renderContent();
    });
    this.overlay.querySelector('#tab-crafting')?.addEventListener('click', () => {
      this.currentTab = 'crafting';
      this.overlay?.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      this.overlay?.querySelector('#tab-crafting')?.classList.add('active');
      this.renderContent();
    });
  }

  private currentPlayer?: Player;

  public show(player: Player, onAction?: () => void) {
    this.currentPlayer = player;
    this.onActionCallback = onAction;
    this.isVisible = true;
    this.overlay?.classList.remove('hidden');
    this.renderContent();
  }

  public hide() {
    this.isVisible = false;
    this.overlay?.classList.add('hidden');
  }

  public isOpen(): boolean {
    return this.isVisible;
  }

  public renderContent() {
    if (!this.overlay || !this.currentPlayer) return;
    const body = this.overlay.querySelector('#inv-body') as HTMLElement;
    body.innerHTML = '';

    const player = this.currentPlayer;

    if (this.currentTab === 'backpack') {
      // 1. Relicario Section (Exclusive compartment for inert ephemeral items - Sec. 7.6)
      const reliquaryHtml = `
        <div class="reliquary-section">
          <div class="section-title-badge">🏺 Relicario de Campamento (Compartimento Exclusivo: ${player.reliquary.length}/${player.reliquaryCapacity})</div>
          <p class="reliquary-hint">Los objetos especiales efímeros se conservan inertes aquí sin degradarse. Al equiparlos en la ranura activa del HUD se inicia su temporizador.</p>
          <div class="reliquary-slots">
            ${Array.from({ length: player.reliquaryCapacity }).map((_, i) => {
              const itemId = player.reliquary[i];
              const item = itemId ? (ITEMS_CATALOG[itemId] as EphemeralArtifact) : null;
              return `
                <div class="relic-item-box ${item ? 'has-item' : 'empty'}">
                  ${item ? `
                    <div class="relic-icon">${item.icon}</div>
                    <div class="relic-details">
                      <strong>${item.name}</strong>
                      <span class="relic-dur">⏱️ Duración: ${(item.totalDurationSeconds / 60)} min</span>
                      <p>${item.passiveEffectDesc}</p>
                      <button class="equip-relic-btn" data-id="${item.id}">⚡ Equipar en Ranura Activa</button>
                    </div>
                  ` : `
                    <div class="empty-relic-slot">Ranura de Relicario Vacía</div>
                  `}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;

      // 2. Standard Backpack Inventory Grid
      const backpackHtml = `
        <div class="backpack-section">
          <div class="section-title-badge">🎒 Mochila de Supervivencia (${player.inventory.length}/${player.maxInventorySlots})</div>
          <div class="inventory-grid">
            ${player.inventory.map(slot => {
              const item = ITEMS_CATALOG[slot.itemId];
              const isUsable = ['berries', 'cooked_meat', 'raw_meat', 'clean_water', 'herbal_salve'].includes(slot.itemId);
              return `
                <div class="inv-slot">
                  <div class="inv-icon">${item.icon}</div>
                  <div class="inv-count">${slot.count}</div>
                  <div class="inv-name">${item.name}</div>
                  ${isUsable ? `<button class="use-item-btn" data-id="${slot.itemId}">Usar</button>` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;

      body.innerHTML = reliquaryHtml + backpackHtml;

      // Event handlers
      body.querySelectorAll('.equip-relic-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
          if (id) {
            player.equipEphemeralItem(id);
            this.renderContent();
            this.onActionCallback?.();
          }
        });
      });

      body.querySelectorAll('.use-item-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
          if (id) {
            player.useItem(id);
            this.renderContent();
            this.onActionCallback?.();
          }
        });
      });

    } else {
      // Crafting Tab
      const craftingHtml = `
        <div class="crafting-section">
          <div class="section-title-badge">🔨 Recetas y Forja de Reliquias</div>
          <div class="recipes-list">
            ${CRAFTING_RECIPES.map(recipe => {
              const outItem = ITEMS_CATALOG[recipe.outputItemId];
              const canCraft = CraftingSystem.canCraft(recipe, player);
              return `
                <div class="recipe-card ${canCraft ? 'craftable' : 'locked'}">
                  <div class="recipe-header">
                    <span class="recipe-icon">${outItem.icon}</span>
                    <span class="recipe-title">${outItem.name}</span>
                    <span class="recipe-tag ${recipe.category}">${recipe.category === 'ephemeral_artifact' ? 'Artefacto Efímero' : recipe.category === 'alien_device' ? 'Reliquia Legendaria' : 'Supervivencia'}</span>
                  </div>
                  <p class="recipe-desc">${recipe.description}</p>
                  <div class="recipe-ingredients">
                    ${recipe.ingredients.map(ing => {
                      const ingItem = ITEMS_CATALOG[ing.itemId];
                      const currentHave = player.getItemCount(ing.itemId);
                      const hasEnough = currentHave >= ing.amount;
                      return `
                        <span class="ingredient-badge ${hasEnough ? 'ok' : 'missing'}">
                          ${ingItem?.icon || '📦'} ${ingItem?.name || ing.itemId}: ${currentHave}/${ing.amount}
                        </span>
                      `;
                    }).join(' ')}
                  </div>
                  <div class="recipe-actions">
                    <button class="craft-btn ${canCraft ? '' : 'disabled'}" data-id="${recipe.id}" ${canCraft ? '' : 'disabled'}>
                      Fabricar ${recipe.outputAmount > 1 ? `x${recipe.outputAmount}` : ''}
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
      body.innerHTML = craftingHtml;

      body.querySelectorAll('.craft-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
          const recipe = CRAFTING_RECIPES.find(r => r.id === id);
          if (recipe) {
            CraftingSystem.craft(recipe, player);
            this.renderContent();
            this.onActionCallback?.();
          }
        });
      });
    }
  }
}
