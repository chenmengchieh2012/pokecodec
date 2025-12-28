// src/constants/biomeAssets.ts

import { BiomeType } from "../../../src/dataAccessObj/BiomeData";

import  grasslandSence from '../assets/grassland-scene.png';
import  waterbeachSence from '../assets/water-beach-scene.png';
import  urbanPowerSence from '../assets/urban-power-plant-scene.png';
import  mountainCaveSence from '../assets/mountain-cave-scene.png';
import  ghostMysticSence from '../assets/ghost-mystic-scene.png';
import toxicWasteSence from '../assets/toxic-waste-scene.png';


// 使用 SVG Data URI 來產生輕量級的背景圖
// 這些圖案都是無縫拼接 (Seamless pattern) 的設計

export const BIOME_CHINESE_NAMES = [
    "森林/草原",
    "水域/海灘",
    "城市/發電廠",
    "山地/洞穴",
    "靈骨塔/廢墟",
    "有毒廢棄物"
];

// 根據 pokemonEncounter.ts 的 Biome Index 對應
export const BIOME_BACKGROUNDS = {
    [BiomeType.None]: null,  // 預設不使用背景
    [BiomeType.Grassland]: grasslandSence,  // 0
    [BiomeType.WaterBeach]: waterbeachSence,   // 1
    [BiomeType.UrbanPowerPlant]: urbanPowerSence,   // 2
    [BiomeType.MountainCave]: mountainCaveSence,    // 3
    [BiomeType.GhostMystic]: ghostMysticSence,  // 4
    [BiomeType.ToxicWaste]: toxicWasteSence  // 5
};