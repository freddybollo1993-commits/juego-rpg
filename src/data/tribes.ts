// tribes.ts - Specifications for the 5 Autonomous Native Tribes (GDD Sec. 2 & 9)

export type ReputationRank = 'neutral' | 'friendly' | 'revered';

export interface TribeTrial {
  id: string;
  title: string;
  description: string;
  targetCount: number;
  currentCount: number;
  completed: boolean;
  rewardReputation: number;
}

export interface TribeData {
  id: string;
  name: string;
  biomeId: string;
  leaderName: string;
  leaderTitle: string;
  description: string;
  abilityId: string;
  resonatorMaterialId: string;
  resonatorName: string;
  reputation: number; // 0-100 (0-29: neutral, 30-74: friendly, 75-100: revered)
  dialogueNeutral: string[];
  dialogueFriendly: string[];
  dialogueRevered: string[];
  trial: TribeTrial;
  tributeRequirement: {
    itemId: string;
    itemName: string;
    amount: number;
  };
  tributeDelivered: boolean;
  resonatorDelivered: boolean;
}

export const TRIBES_DATA: Record<string, TribeData> = {
  frost: {
    id: 'frost',
    name: 'Clanes de la Escarcha',
    biomeId: 'frost',
    leaderName: 'Völund El Blanco',
    leaderTitle: 'Patriarca del Glaciar',
    description: 'Guerreros curtidos en la nieve perpetua que veneran la resistencia al hielo y desprecian la debilidad del fuego fácil.',
    abilityId: 'frost_heart',
    resonatorMaterialId: 'frost_core',
    resonatorName: 'Núcleo Criogénico Ancestral',
    reputation: 10,
    dialogueNeutral: [
      'El viento no tiene piedad de los extranjeros empapados. Si quieres comerciar, suelta tu trueque y no molestes al consejo.',
      'Nuestras pieles abrigan solo a quienes respetan la ventisca. Demuestra tu valía antes de pedir audiencia.'
    ],
    dialogueFriendly: [
      'Has sobrevivido a las heladas cumbres, forastero. Quizás tu sangre no sea tan débil como pensábamos.',
      'Supera la Prueba del Frío y entrega tributo a nuestros curtidores si deseas conocer el secreto del Corazón de Escarcha.'
    ],
    dialogueRevered: [
      '¡Hermano de Sangre y Escarcha! Tu espíritu es más frío y duro que el pico de la montaña.',
      'Toma este fragmento de roca resonante caída del cielo en tiempos de nuestros ancestros. Únelo a tu extraña tablilla.'
    ],
    trial: {
      id: 'frost_trial',
      title: 'Prueba de la Ventisca',
      description: 'Sobrevive a la exposición del frío extremo cazando 2 Bestias de Escarcha sin morir congelado.',
      targetCount: 2,
      currentCount: 0,
      completed: false,
      rewardReputation: 40
    },
    tributeRequirement: {
      itemId: 'eternal_frost_flower',
      itemName: 'Flor de Escarcha Eterna',
      amount: 2
    },
    tributeDelivered: false,
    resonatorDelivered: false
  },
  forest: {
    id: 'forest',
    name: 'Nómadas del Bosque',
    biomeId: 'forest',
    leaderName: 'Silas Sombrasilente',
    leaderTitle: 'Vigía de las Copas',
    description: 'Rastreadores ágiles que habitan las copas de coníferas milenarias. Saben correr sin agitar una sola rama y comunicarse con la fauna.',
    abilityId: 'canopy_stride',
    resonatorMaterialId: 'forest_core',
    resonatorName: 'Resonador de Clorofila Fósil',
    reputation: 10,
    dialogueNeutral: [
      'Tus pasos quiebran la hojarasca como un jabalí ciego. Quédate en el sendero marcado si no quieres ser blanco de flechas silbantes.',
      'El bosque escucha todo. ¿Qué traes para trueque?'
    ],
    dialogueFriendly: [
      'Empiezas a moverte con el viento, viajero. Las ramas no te delatan tanto como el primer día.',
      'Si quieres dominar la Zancada de Canopia, limpia a la manada de lobos que asedia nuestro claro sagrado.'
    ],
    dialogueRevered: [
      'La canopia te reconoce como uno de sus guardianes veloces. El bosque corre en tus venas.',
      'Los antiguos guardaron esta gema orgánica extraterrestre en el tronco del Gran Olmo. Te pertenece, hermano.'
    ],
    trial: {
      id: 'forest_trial',
      title: 'Cacería Silente',
      description: 'Derrota a 3 Lobos Alfa Acechantes en la Taiga Ancestral.',
      targetCount: 3,
      currentCount: 0,
      completed: false,
      rewardReputation: 40
    },
    tributeRequirement: {
      itemId: 'ancient_resin',
      itemName: 'Resina de Árbol Milenario',
      amount: 2
    },
    tributeDelivered: false,
    resonatorDelivered: false
  },
  swamp: {
    id: 'swamp',
    name: 'Moradores del Fango',
    biomeId: 'swamp',
    leaderName: 'Morgath la Fétida',
    leaderTitle: 'Matriarca de las Ciénagas',
    description: 'Chamanes adaptados a las aguas negras y miasmas tóxicos. Inmunes al veneno natural y devoradores de la podredumbre vital.',
    abilityId: 'toxin_adaptation',
    resonatorMaterialId: 'swamp_core',
    resonatorName: 'Glándula Bio-Sintética Quimérica',
    reputation: 10,
    dialogueNeutral: [
      'Uf... hueles a carne fresca y vulnerable a las sanguijuelas. Si caes al pantano, nadie recogerá tus huesos.',
      'Cambia tus baratijas por ungüentos o sal de mi ciénaga antes de que el miasma te llene los pulmones de pus.'
    ],
    dialogueFriendly: [
      '¿Todavía no te has ahogado en el fango? Impresionante. El pantano suele digerir a los débiles en pocas horas.',
      'Purga los nidos de alimañas fétidas y ofrécenos glándulas abisales si quieres aprender a tragar toxinas sin perecer.'
    ],
    dialogueRevered: [
      '¡Hijo del Fango y la Peste! Las toxinas del mundo ahora respetan tu sangre putrefacta.',
      'Esta entraña pulsante cayó de la estrella que pudrió el cielo. Los chamanes la cuidamos por siglos; úsala para poner fin a la aberración.'
    ],
    trial: {
      id: 'swamp_trial',
      title: 'Inmersión en el Miasma',
      description: 'Extermina 3 Alimañas del Fango en las pozas venenosas de la ciénaga.',
      targetCount: 3,
      currentCount: 0,
      completed: false,
      rewardReputation: 40
    },
    tributeRequirement: {
      itemId: 'abyssal_gland',
      itemName: 'Glándula de Anfibio Abisal',
      amount: 2
    },
    tributeDelivered: false,
    resonatorDelivered: false
  },
  canyon: {
    id: 'canyon',
    name: 'Caminantes del Sol',
    biomeId: 'canyon',
    leaderName: 'Tarek Ojo de Arena',
    leaderTitle: 'Emir de las Dunas',
    description: 'Guerreros nómadas que dominan el calor extremo y las tormentas de arena. Capaces de marchar días enteros con una sola gota de agua.',
    abilityId: 'camelid_resistance',
    resonatorMaterialId: 'canyon_core',
    resonatorName: 'Catalizador Térmico de Pirita Alien',
    reputation: 10,
    dialogueNeutral: [
      'El sol castiga sin sombra a los forasteros imprudentes. Llena tu pellejo de agua o serás carroña para los buitres del cañón.',
      'Nuestras tiendas son para los resistentes. Para comerciar, paga en metales y no agotes nuestra sombra.'
    ],
    dialogueFriendly: [
      'Tus labios están agrietados pero tus ojos siguen firmes. Conoces el precio de la sed en los yermos.',
      'Caza a los Escorpiones Volcánicos de las grietas calientes para ganarte el respeto de los Caminantes.'
    ],
    dialogueRevered: [
      '¡Sangre del Sol! Ni el fuego de mediodía ni las dunas infinitas pueden doblegar tus pasos.',
      'En las grietas de azufre encontramos esta roca que vibra con calor antinatural. Es la pieza del enigma cósmico que buscas.'
    ],
    trial: {
      id: 'canyon_trial',
      title: 'Crisol de Cenizas',
      description: 'Caza 3 Escorpiones Volcánicos en las grietas calientes del cañón.',
      targetCount: 3,
      currentCount: 0,
      completed: false,
      rewardReputation: 40
    },
    tributeRequirement: {
      itemId: 'volcanic_pyrite',
      itemName: 'Pirita Volcánica',
      amount: 2
    },
    tributeDelivered: false,
    resonatorDelivered: false
  },
  caverns: {
    id: 'caverns',
    name: 'Hijos de la Piedra',
    biomeId: 'caverns',
    leaderName: 'Kragor Mano de Hierro',
    leaderTitle: 'Guardián del Abismo',
    description: 'Mineros y místicos subterráneos que habitan en la oscuridad absoluta. Escalan riscos verticales y ven a través de la penumbra sin luz.',
    abilityId: 'iron_grip',
    resonatorMaterialId: 'cavern_core',
    resonatorName: 'Matriz Resonante de Hiper-Cristal',
    reputation: 10,
    dialogueNeutral: [
      'Apaga esa antorcha ruidosa si entras al santuario. Quien no sabe escuchar la roca termina aplastado por el techo.',
      'El abismo solo premia a quienes traen hierro y minerales puros. ¿Qué tienes para ofrecer?'
    ],
    dialogueFriendly: [
      'No temes a las simas sin fondo, humano de la superficie. Tus manos aprenden a palpar el granito.',
      'Derrota a las Sombras del Micelio en los túneles profundos y entréganos cristales resonantes para aprender nuestro secreto.'
    ],
    dialogueRevered: [
      '¡Hermano de la Roca! Tus ojos ven en la negrura y tus dedos se aferran al risco más empinado como hierro forjado.',
      'En la fosa más profunda yació este fragmento alienígena reluciente desde que el mundo tembló. Tómalo y desentraña la bóveda estelar.'
    ],
    trial: {
      id: 'caverns_trial',
      title: 'Eco en la Oscuridad',
      description: 'Elimina 3 Acechadores de Cristal en las cavernas subterráneas.',
      targetCount: 3,
      currentCount: 0,
      completed: false,
      rewardReputation: 40
    },
    tributeRequirement: {
      itemId: 'resonant_crystal',
      itemName: 'Cristal Resonante',
      amount: 2
    },
    tributeDelivered: false,
    resonatorDelivered: false
  }
};
