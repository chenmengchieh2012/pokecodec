import { PokemonType } from "./pokemon";

export interface PokeEncounterData {
    pokemonId: number;
    nameZh: string;
    nameEn: string;
    type: PokemonType[];    // 支援雙屬性
    catchRate: number;      // 捕獲率: 3 (難) ~ 255 (易)
    encounterRate: number;  // 遭遇率: 1 (極稀有) ~ 255 (極常見)
    minDepth: number;       // 0:初始, 3:一階進化, 4:二階進化, 5:傳說
}
