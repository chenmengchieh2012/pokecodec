import { PokemonType } from "./pokemon";

export const BiomeType = {
    None: 'None',
    Grassland: 'Grassland',
    WaterBeach: 'Water/Beach',
    UrbanPowerPlant: 'Urban/Power Plant',
    MountainCave: 'Mountain/Cave',
    GhostMystic: 'Ghost/Mystic',
    ToxicWaste: 'Toxic Waste',
};
export type BiomeType = typeof BiomeType[keyof typeof BiomeType];

export interface BiomeData {
    biomeType: BiomeType;
    pokemonTypes: PokemonType[];
}