
export interface PokeEncounterData {
    pokemonId: number;
    nameZh: string;
    nameEn: string;
    encounterRate: number;  // 遭遇率: 1 (極稀有) ~ 255 (極常見)
    minDepth: number;       // 0:初始, 3:一階進化, 4:二階進化, 5:傳說
}
