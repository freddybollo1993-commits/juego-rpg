// abilities.ts - Specification of the 5 Distinctive Tribal Abilities (GDD Sec. 3 & 4)

export interface TribalAbility {
  id: string;
  name: string;
  tribeId: string;
  type: 'passive' | 'active_toggle';
  runeIcon: string;
  shortDesc: string;
  fullDesc: string;
  cooldownSeconds?: number;
  isActiveToggle?: boolean;
}

export const ABILITIES_DATA: Record<string, TribalAbility> = {
  frost_heart: {
    id: 'frost_heart',
    name: 'Corazón de Escarcha',
    tribeId: 'frost',
    type: 'passive',
    runeIcon: '❄️',
    shortDesc: '-40% acumulación de frío. Inmunidad a hipotermia bajo 25% HP.',
    fullDesc: 'Reduce la acumulación de frío ambiental en un 40%. Si la salud cae por debajo del 25% durante una ventisca, previene el daño por hipotermia severa durante 90 segundos.'
  },
  canopy_stride: {
    id: 'canopy_stride',
    name: 'Zancada de Canopia',
    tribeId: 'forest',
    type: 'active_toggle',
    runeIcon: '🍃',
    shortDesc: 'Alternable: -30% gasto de estamina al correr, +50% forrajeo, pasos silentes.',
    fullDesc: 'Reduce el consumo de estamina al correr y saltar en un 30%. Acelera la velocidad de recolección en un 50% y silencia los pasos frente a bestias depredadoras.'
  },
  toxin_adaptation: {
    id: 'toxin_adaptation',
    name: 'Adaptación a Toxinas',
    tribeId: 'swamp',
    type: 'passive',
    runeIcon: '🧪',
    shortDesc: 'Inmunidad total al veneno y sanguijuelas. Alimentos crudos/putrefactos seguros.',
    fullDesc: 'Concede inmunidad completa al veneno ambiental y a la infestación por sanguijuelas de agua estancada. Permite consumir alimentos crudos o descompuestos sin contraer enfermedades.'
  },
  camelid_resistance: {
    id: 'camelid_resistance',
    name: 'Resistencia de Camélido',
    tribeId: 'canyon',
    type: 'passive',
    runeIcon: '☀️',
    shortDesc: '-50% pérdida de hidratación. Regeneración continua de estamina en calor.',
    fullDesc: 'Reduce la tasa de pérdida de agua e hidratación en un 50%. Permite regenerar estamina de manera continua incluso bajo condiciones de sobrepeso moderado en horas de calor extremo.'
  },
  iron_grip: {
    id: 'iron_grip',
    name: 'Agarre Férreo y Visión Espectral',
    tribeId: 'caverns',
    type: 'passive',
    runeIcon: '👁️',
    shortDesc: '-50% gasto de energía al escalar. Visión clara en penumbra absoluta.',
    fullDesc: 'Reduce a la mitad el gasto de energía al escalar riscos o muros de piedra y proporciona visión adaptada a la penumbra absoluta sin requerir antorchas ni fuentes de luz artificial.'
  }
};
