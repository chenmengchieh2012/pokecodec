
export const SHOP_ITEMS_PP_MEDICINE_NAMES = [
    'ether', 'max-ether', 'elixir', 'max-elixir'
];

export const SHOP_ITEMS_BALL_NAMES = [
    'poke-ball', 'great-ball', 'ultra-ball'
];

export const SHOP_ITEMS_HP_MEDICINE_NAMES = [
    'potion', 'super-potion', 'hyper-potion', 'max-potion',
];

export const SHOP_ITEMS_REVIVE_NAMES = [
    'revive'
];

export const SHOP_ITEMS_STATUS_MEDICINE_NAMES = [
    'antidote', 'burn-heal', 'ice-heal', 'awakening', 'paralyze-heal', 'full-heal'
];

export const SHOP_ITEM_FULL_MEDICINE_NAMES = [
    'full-restore'
];

export const SHOP_ITEM_EVOLUTION_NAMES = [
    'fire-stone', 'water-stone', 'thunder-stone', 'leaf-stone',
    'moon-stone', 'sun-stone', 'shiny-stone', 'dusk-stone', 'dawn-stone'
];

export const SHOP_ITEM_TM_NAMES = [
    ...Array.from({length: 50}, (_, i) => {
        const num = (i + 1).toString().padStart(2, '0');
        return `tm${num}`;
    })
]

export const SHOP_ITEM_HM_NAMES = [
    ...Array.from({length: 8}, (_, i) => {
        const num = (i + 1).toString().padStart(2, '0');
        return `hm${num}`;
    })
]


export const ItemUITag = {
    Medicine: "MEDICINE",
    Balls: "BALLS",
    Evolution: "EVOLUTION",
    Machine: "MACHINE",
} as const;
export type ItemUITag = typeof ItemUITag[keyof typeof ItemUITag];


export const ItemUiTagItemsMap: Record<ItemUITag, string[]> = {
    [ItemUITag.Medicine]: [
        ...SHOP_ITEMS_HP_MEDICINE_NAMES,
        ...SHOP_ITEMS_PP_MEDICINE_NAMES,
        ...SHOP_ITEM_FULL_MEDICINE_NAMES,
        ...SHOP_ITEMS_STATUS_MEDICINE_NAMES,
        ...SHOP_ITEMS_REVIVE_NAMES
    ],
    [ItemUITag.Balls]: [
        ...SHOP_ITEMS_BALL_NAMES
    ],
    [ItemUITag.Evolution]: [
        ...SHOP_ITEM_EVOLUTION_NAMES
    ],
    [ItemUITag.Machine]: [
        ...SHOP_ITEM_TM_NAMES,
        ...SHOP_ITEM_HM_NAMES
    ]
};  

