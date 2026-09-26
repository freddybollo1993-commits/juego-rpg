// CraftingSystem.ts - Survival and Ephemeral Artifact Recipes (GDD Sec. 7 & 9.2)

import { ITEMS_CATALOG, EphemeralArtifact } from '../data/items';
import { Player } from '../entities/Player';
import { soundManager } from '../audio/SoundManager';

export interface CraftingRecipe {
  id: string;
  outputItemId: string;
  outputAmount: number;
  ingredients: { itemId: string; amount: number }[];
  category: 'survival' | 'ephemeral_artifact' | 'alien_device';
  description: string;
  isUnlocked: boolean;
}

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  // --- Basic Survival Recipes ---
  {
    id: 'craft_campfire',
    outputItemId: 'campfire_kit',
    outputAmount: 1,
    ingredients: [
      { itemId: 'branches', amount: 3 },
      { itemId: 'flint', amount: 1 }
    ],
    category: 'survival',
    description: 'Combina ramas secas y pedernal para montar una fogata.',
    isUnlocked: true
  },
  {
    id: 'craft_salve',
    outputItemId: 'herbal_salve',
    outputAmount: 1,
    ingredients: [
      { itemId: 'berries', amount: 3 },
      { itemId: 'branches', amount: 1 }
    ],
    category: 'survival',
    description: 'Ungüento medicinal triturando bayas silvestres.',
    isUnlocked: true
  },

  // --- Ranged Combat & Tribal Workshop (Fase 2.1 & 2.3) ---
  {
    id: 'craft_tribal_bow',
    outputItemId: 'tribal_bow',
    outputAmount: 1,
    ingredients: [
      { itemId: 'branches', amount: 4 },
      { itemId: 'ancient_resin', amount: 1 }
    ],
    category: 'survival',
    description: 'Arco Compuesto Tribal: Madera elástica reforzada con resina ancestral.',
    isUnlocked: true
  },
  {
    id: 'craft_flint_arrows',
    outputItemId: 'flint_arrow',
    outputAmount: 10,
    ingredients: [
      { itemId: 'branches', amount: 2 },
      { itemId: 'flint', amount: 2 }
    ],
    category: 'survival',
    description: 'Lote de 10 flechas con punta de sílex afilada.',
    isUnlocked: true
  },
  {
    id: 'craft_fire_arrows',
    outputItemId: 'fire_arrow',
    outputAmount: 5,
    ingredients: [
      { itemId: 'flint_arrow', amount: 5 },
      { itemId: 'volcanic_pyrite', amount: 1 }
    ],
    category: 'survival',
    description: '5 flechas ígneas embebidas en pirita volcánica.',
    isUnlocked: true
  },
  {
    id: 'craft_frost_arrows',
    outputItemId: 'frost_arrow',
    outputAmount: 5,
    ingredients: [
      { itemId: 'flint_arrow', amount: 5 },
      { itemId: 'fossil_ice', amount: 1 }
    ],
    category: 'survival',
    description: '5 flechas criogénicas embebidas en hielo fósil.',
    isUnlocked: true
  },
  {
    id: 'craft_bear_trap',
    outputItemId: 'bear_trap',
    outputAmount: 1,
    ingredients: [
      { itemId: 'flint', amount: 2 },
      { itemId: 'branches', amount: 2 }
    ],
    category: 'survival',
    description: 'Trampa de mandíbulas para inmovilizar depredadores.',
    isUnlocked: true
  },
  {
    id: 'craft_expanded_backpack',
    outputItemId: 'expanded_backpack',
    outputAmount: 1,
    ingredients: [
      { itemId: 'alpha_fur', amount: 2 },
      { itemId: 'ancient_resin', amount: 1 }
    ],
    category: 'survival',
    description: 'Mochila de cuero reforzado: Aumenta la capacidad a 24 ranuras.',
    isUnlocked: true
  },
  {
    id: 'craft_antidote_potion',
    outputItemId: 'antidote_potion',
    outputAmount: 1,
    ingredients: [
      { itemId: 'berries', amount: 2 },
      { itemId: 'phosphor_mud', amount: 1 }
    ],
    category: 'survival',
    description: 'Antídoto de Morgath: Purifica toxinas y veneno de inmediato.',
    isUnlocked: true
  },
  {
    id: 'craft_thermal_tincture',
    outputItemId: 'thermal_tincture',
    outputAmount: 1,
    ingredients: [
      { itemId: 'berries', amount: 2 },
      { itemId: 'eternal_frost_flower', amount: 1 }
    ],
    category: 'survival',
    description: 'Tintura Térmica: Aumenta la temperatura +35° y previene hipotermia.',
    isUnlocked: true
  },

  // --- Ephemeral Special Objects (Sec. 7.4) ---
  {
    id: 'craft_spectral_lantern',
    outputItemId: 'spectral_lantern',
    outputAmount: 1,
    ingredients: [
      { itemId: 'resonant_crystal', amount: 1 },
      { itemId: 'phosphor_mud', amount: 1 }
    ],
    category: 'ephemeral_artifact',
    description: 'Linterna de Fuego Espectral: Cristal Resonante + Fango Fosforescente. Ilumina 360° y repele bestias de sombra.',
    isUnlocked: true
  },
  {
    id: 'craft_frost_balm',
    outputItemId: 'frost_thermal_balm',
    outputAmount: 1,
    ingredients: [
      { itemId: 'eternal_frost_flower', amount: 1 },
      { itemId: 'ancient_resin', amount: 1 }
    ],
    category: 'ephemeral_artifact',
    description: 'Bálsamo Térmico de Escarcha: Flor de Escarcha Eterna + Resina Milenaria. Inmunidad total al frío extremo.',
    isUnlocked: true
  },
  {
    id: 'craft_sulfur_blade',
    outputItemId: 'sulfur_imbued_blade',
    outputAmount: 1,
    ingredients: [
      { itemId: 'volcanic_pyrite', amount: 1 },
      { itemId: 'crystallized_saltpeter', amount: 1 }
    ],
    category: 'ephemeral_artifact',
    description: 'Filo Imbuido en Azufre: Pirita Volcánica + Salitre Cristalizado. Daño de quemadura y cocina presas al instante.',
    isUnlocked: true
  },
  {
    id: 'craft_swamp_talisman',
    outputItemId: 'swamp_evasion_talisman',
    outputAmount: 1,
    ingredients: [
      { itemId: 'abyssal_gland', amount: 1 },
      { itemId: 'luminescent_mycelium', amount: 1 }
    ],
    category: 'ephemeral_artifact',
    description: 'Talismán de Evasión: Glándula de Anfibio + Esencia de Micelio. Camuflaje táctico e inmunidad al lodo.',
    isUnlocked: true
  },

  // --- The Alien Translator & Link Device (Sec. 9.2) ---
  {
    id: 'craft_alien_device',
    outputItemId: 'alien_translator_device',
    outputAmount: 1,
    ingredients: [
      { itemId: 'frost_core', amount: 1 },
      { itemId: 'forest_core', amount: 1 },
      { itemId: 'swamp_core', amount: 1 },
      { itemId: 'canyon_core', amount: 1 },
      { itemId: 'cavern_core', amount: 1 }
    ],
    category: 'alien_device',
    description: 'Dispositivo de Traducción y Enlace: Los 5 Resonadores Alienígenas combinados para desafiar al Heraldo de las Estrellas.',
    isUnlocked: true
  }
];

export class CraftingSystem {
  public static canCraft(recipe: CraftingRecipe, player: Player): boolean {
    for (const ing of recipe.ingredients) {
      if (player.getItemCount(ing.itemId) < ing.amount) {
        return false;
      }
    }
    // Check reliquary capacity if crafting ephemeral item
    const outItem = ITEMS_CATALOG[recipe.outputItemId];
    if (outItem && outItem.category === 'ephemeral_artifact') {
      if (player.reliquary.length >= player.reliquaryCapacity) {
        return false; // Reliquary full
      }
    }
    return true;
  }

  public static craft(recipe: CraftingRecipe, player: Player): boolean {
    if (!this.canCraft(recipe, player)) return false;

    // Deduct ingredients
    for (const ing of recipe.ingredients) {
      player.removeItem(ing.itemId, ing.amount);
    }

    const outItem = ITEMS_CATALOG[recipe.outputItemId];
    if (outItem && outItem.category === 'ephemeral_artifact') {
      // Put in Reliquary
      player.addToReliquary(recipe.outputItemId);
      soundManager.playRunicTuning();
    } else if (recipe.category === 'alien_device') {
      player.addItem(recipe.outputItemId, recipe.outputAmount);
      soundManager.playBossPhaseChange();
      // Unlock 4th skill slot! (GDD Sec. 4)
      player.unlockedFourthSkillSlot = true;
    } else {
      player.addItem(recipe.outputItemId, recipe.outputAmount);
      soundManager.playForage();
    }

    return true;
  }
}
