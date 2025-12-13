// src/constants/biomeAssets.ts

import { BiomeType } from "../dataAccessObj/BiomeData";

// 使用 SVG Data URI 來產生輕量級的背景圖
// 這些圖案都是無縫拼接 (Seamless pattern) 的設計

const svgToDataUri = (svgString: string) => 
    `url("data:image/svg+xml,${encodeURIComponent(svgString.trim().replace(/\s+/g, ' '))}")`;

// Biome 0: 森林/草原 (復古綠色點陣)
const FOREST_BG = svgToDataUri(`
<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
    <rect width="64" height="64" fill="#2d5a42"/>
    <path d="M16 8l8 16h-16z M48 32l8 16h-16z" fill="#1e3c28" opacity="0.4"/>
    <circle cx="32" cy="32" r="4" fill="#3c7856" opacity="0.5"/>
    <circle cx="4" cy="60" r="2" fill="#5ab47e" opacity="0.3"/>
</svg>
`);

// Biome 1: 水域/海灘 (流動波浪感)
const WATER_BG = svgToDataUri(`
<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" fill="#285cc4"/>
    <path d="M0 10 Q10 20 20 10 T40 10" stroke="#3c78d8" fill="none" stroke-width="2" opacity="0.5"/>
    <path d="M0 30 Q10 40 20 30 T40 30" stroke="#1c4587" fill="none" stroke-width="2" opacity="0.5"/>
</svg>
`);

// Biome 2: 城市/發電廠 (科技網格)
const URBAN_BG = svgToDataUri(`
<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" fill="#222"/>
    <path d="M0 0h40v40h-40z" fill="none" stroke="#444" stroke-width="1"/>
    <rect x="18" y="18" width="4" height="4" fill="#00ffcc" opacity="0.2"/>
</svg>
`);

// Biome 3: 山地/洞穴 (岩石紋理)
const CAVE_BG = svgToDataUri(`
<svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
    <rect width="60" height="60" fill="#3e3026"/>
    <path d="M10 10L20 20H0z M40 40L50 50H30z" fill="#2b211a"/>
    <path d="M50 10L40 20H60z" fill="#544236"/>
</svg>
`);

// Biome 4: 靈骨塔/廢墟 (紫色迷霧)
const MYSTIC_BG = svgToDataUri(`
<svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
    <rect width="50" height="50" fill="#2e1a47"/>
    <circle cx="25" cy="25" r="15" fill="#4b2c70" filter="blur(5px)" opacity="0.6"/>
    <circle cx="10" cy="10" r="5" fill="#6d4c9e" filter="blur(2px)" opacity="0.4"/>
</svg>
`);

export const BIOME_CHINESE_NAMES = [
    "森林/草原",
    "水域/海灘",
    "城市/發電廠",
    "山地/洞穴",
    "靈骨塔/廢墟"
];

// 根據 pokemonEncounter.ts 的 Biome Index 對應
export const BIOME_BACKGROUNDS = {
    [BiomeType.Grassland]: FOREST_BG,  // 0
    [BiomeType.WaterBeach]: WATER_BG,   // 1
    [BiomeType.UrbanPowerPlant]: URBAN_BG,   // 2
    [BiomeType.MountainCave]: CAVE_BG,    // 3
    [BiomeType.GhostMystic]: MYSTIC_BG   // 4
};