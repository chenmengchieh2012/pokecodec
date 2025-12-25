import { BiomeType } from "../dataAccessObj/BiomeData";
import { PokeEncounterData } from "../dataAccessObj/pokeEncounterData";
import { PokemonType } from "../dataAccessObj/pokemon";


export const KantoPokemonEncounterData: PokeEncounterData[] = [// --- 妙蛙種子家族 ---
    { pokemonId: 1, nameZh: '妙蛙種子', nameEn: 'Bulbasaur', encounterRate: 60, minDepth: 0 },
    { pokemonId: 2, nameZh: '妙蛙草', nameEn: 'Ivysaur', encounterRate: 30, minDepth: 3 },
    { pokemonId: 3, nameZh: '妙蛙花', nameEn: 'Venusaur', encounterRate: 15, minDepth: 4 },
    // --- 小火龍家族 ---
    { pokemonId: 4, nameZh: '小火龍', nameEn: 'Charmander', encounterRate: 60, minDepth: 0 },
    { pokemonId: 5, nameZh: '火恐龍', nameEn: 'Charmeleon', encounterRate: 30, minDepth: 3 },
    { pokemonId: 6, nameZh: '噴火龍', nameEn: 'Charizard', encounterRate: 15, minDepth: 4 },
    // --- 傑尼龜家族 ---
    { pokemonId: 7, nameZh: '傑尼龜', nameEn: 'Squirtle', encounterRate: 60, minDepth: 0 },
    { pokemonId: 8, nameZh: '卡咪龜', nameEn: 'Wartortle', encounterRate: 30, minDepth: 3 },
    { pokemonId: 9, nameZh: '水箭龜', nameEn: 'Blastoise', encounterRate: 15, minDepth: 4 },
    // --- 綠毛蟲家族 ---
    { pokemonId: 10, nameZh: '綠毛蟲', nameEn: 'Caterpie', encounterRate: 200, minDepth: 0 },
    { pokemonId: 11, nameZh: '鐵甲蛹', nameEn: 'Metapod', encounterRate: 100, minDepth: 2 },
    { pokemonId: 12, nameZh: '巴大蝶', nameEn: 'Butterfree', encounterRate: 40, minDepth: 4 },
    // --- 獨角蟲家族 ---
    { pokemonId: 13, nameZh: '獨角蟲', nameEn: 'Weedle', encounterRate: 200, minDepth: 0 },
    { pokemonId: 14, nameZh: '鐵殼蛹', nameEn: 'Kakuna', encounterRate: 100, minDepth: 2 },
    { pokemonId: 15, nameZh: '大針蜂', nameEn: 'Beedrill', encounterRate: 40, minDepth: 4 },
    // --- 波波家族 ---
    { pokemonId: 16, nameZh: '波波', nameEn: 'PpokemonIdgey', encounterRate: 200, minDepth: 0 },
    { pokemonId: 17, nameZh: '比比鳥', nameEn: 'PpokemonIdgeotto', encounterRate: 100, minDepth: 3 },
    { pokemonId: 18, nameZh: '大比鳥', nameEn: 'PpokemonIdgeot', encounterRate: 40, minDepth: 4 },
    // --- 小拉達家族 ---
    { pokemonId: 19, nameZh: '小拉達', nameEn: 'Rattata', encounterRate: 200, minDepth: 0 },
    { pokemonId: 20, nameZh: '拉達', nameEn: 'Raticate', encounterRate: 90, minDepth: 3 },
    // --- 烈雀家族 ---
    { pokemonId: 21, nameZh: '烈雀', nameEn: 'Spearow', encounterRate: 200, minDepth: 0 },
    { pokemonId: 22, nameZh: '大嘴雀', nameEn: 'Fearow', encounterRate: 70, minDepth: 3 },
    // --- 阿柏蛇家族 ---
    { pokemonId: 23, nameZh: '阿柏蛇', nameEn: 'Ekans', encounterRate: 200, minDepth: 0 },
    { pokemonId: 24, nameZh: '阿柏怪', nameEn: 'Arbok', encounterRate: 70, minDepth: 3 },
    // --- 皮卡丘家族 ---
    { pokemonId: 25, nameZh: '皮卡丘', nameEn: 'Pikachu', encounterRate: 80, minDepth: 0 },
    { pokemonId: 26, nameZh: '雷丘', nameEn: 'Raichu', encounterRate: 50, minDepth: 3 },
    // --- 穿山鼠家族 ---
    { pokemonId: 27, nameZh: '穿山鼠', nameEn: 'Sandshrew', encounterRate: 200, minDepth: 0 },
    { pokemonId: 28, nameZh: '穿山王', nameEn: 'Sandslash', encounterRate: 70, minDepth: 3 },
    // --- 尼多蘭家族 ---
    { pokemonId: 29, nameZh: '尼多蘭', nameEn: 'NpokemonIdoran♀', encounterRate: 180, minDepth: 0 },
    { pokemonId: 30, nameZh: '尼多娜', nameEn: 'NpokemonIdorina', encounterRate: 90, minDepth: 3 },
    { pokemonId: 31, nameZh: '尼多后', nameEn: 'NpokemonIdoqueen', encounterRate: 40, minDepth: 4 },
    // --- 尼多朗家族 ---
    { pokemonId: 32, nameZh: '尼多朗', nameEn: 'NpokemonIdoran♂', encounterRate: 180, minDepth: 0 },
    { pokemonId: 33, nameZh: '尼多力諾', nameEn: 'NpokemonIdorino', encounterRate: 90, minDepth: 3 },
    { pokemonId: 34, nameZh: '尼多王', nameEn: 'NpokemonIdoking', encounterRate: 40, minDepth: 4 },
    // --- 皮皮家族 ---
    { pokemonId: 35, nameZh: '皮皮', nameEn: 'Clefairy', encounterRate: 150, minDepth: 0 },
    { pokemonId: 36, nameZh: '皮可西', nameEn: 'Clefable', encounterRate: 50, minDepth: 3 },
    // --- 六尾家族 ---
    { pokemonId: 37, nameZh: '六尾', nameEn: 'Vulpix', encounterRate: 160, minDepth: 0 },
    { pokemonId: 38, nameZh: '九尾', nameEn: 'Ninetales', encounterRate: 70, minDepth: 3 },
    // --- 胖丁家族 ---
    { pokemonId: 39, nameZh: '胖丁', nameEn: 'Jigglypuff', encounterRate: 150, minDepth: 0 },
    { pokemonId: 40, nameZh: '胖可丁', nameEn: 'Wigglytuff', encounterRate: 60, minDepth: 3 },
    // --- 超音蝠家族 ---
    { pokemonId: 41, nameZh: '超音蝠', nameEn: 'Zubat', encounterRate: 200, minDepth: 0 },
    { pokemonId: 42, nameZh: '大嘴蝠', nameEn: 'Golbat', encounterRate: 90, minDepth: 3 },
    // --- 走路草家族 ---
    { pokemonId: 43, nameZh: '走路草', nameEn: 'Oddish', encounterRate: 200, minDepth: 0 },
    { pokemonId: 44, nameZh: '臭臭花', nameEn: 'Gloom', encounterRate: 100, minDepth: 3 },
    { pokemonId: 45, nameZh: '霸王花', nameEn: 'Vileplume', encounterRate: 40, minDepth: 4 },
    // --- 派拉斯家族 ---
    { pokemonId: 46, nameZh: '派拉斯', nameEn: 'Paras', encounterRate: 160, minDepth: 0 },
    { pokemonId: 47, nameZh: '派拉斯特', nameEn: 'Parasect', encounterRate: 70, minDepth: 3 },
    // --- 毛球家族 ---
    { pokemonId: 48, nameZh: '毛球', nameEn: 'Venonat', encounterRate: 150, minDepth: 0 },
    { pokemonId: 49, nameZh: '摩魯蛾', nameEn: 'Venomoth', encounterRate: 60, minDepth: 3 },
    // --- 地鼠家族 ---
    { pokemonId: 50, nameZh: '地鼠', nameEn: 'Diglett', encounterRate: 200, minDepth: 0 },
    { pokemonId: 51, nameZh: '三地鼠', nameEn: 'Dugtrio', encounterRate: 80, minDepth: 3 },
    // --- 喵喵家族 ---
    { pokemonId: 52, nameZh: '喵喵', nameEn: 'Meowth', encounterRate: 200, minDepth: 0 },
    { pokemonId: 53, nameZh: '貓老大', nameEn: 'Persian', encounterRate: 90, minDepth: 3 },
    // --- 可達鴨家族 ---
    { pokemonId: 54, nameZh: '可達鴨', nameEn: 'Psyduck', encounterRate: 160, minDepth: 0 },
    { pokemonId: 55, nameZh: '哥達鴨', nameEn: 'Golduck', encounterRate: 70, minDepth: 3 },
    // --- 猴怪家族 ---
    { pokemonId: 56, nameZh: '猴怪', nameEn: 'Mankey', encounterRate: 150, minDepth: 0 },
    { pokemonId: 57, nameZh: '火爆猴', nameEn: 'Primeape', encounterRate: 60, minDepth: 3 },
    // --- 卡蒂狗家族 ---
    { pokemonId: 58, nameZh: '卡蒂狗', nameEn: 'Growlithe', encounterRate: 200, minDepth: 0 },
    { pokemonId: 59, nameZh: '風速狗', nameEn: 'Arcanine', encounterRate: 90, minDepth: 3 },
    // --- 蚊香蝌蚪家族 ---
    { pokemonId: 60, nameZh: '蚊香蝌蚪', nameEn: 'Poliwag', encounterRate: 200, minDepth: 0 },
    { pokemonId: 61, nameZh: '蚊香君', nameEn: 'Poliwhirl', encounterRate: 100, minDepth: 3 },
    { pokemonId: 62, nameZh: '蚊香泳士', nameEn: 'Poliwrath', encounterRate: 40, minDepth: 4 },
    // --- 凱西家族 ---
    { pokemonId: 63, nameZh: '凱西', nameEn: 'Abra', encounterRate: 120, minDepth: 0 },
    { pokemonId: 64, nameZh: '勇基拉', nameEn: 'Kadabra', encounterRate: 80, minDepth: 3 },
    { pokemonId: 65, nameZh: '胡地', nameEn: 'Alakazam', encounterRate: 40, minDepth: 4 },
    // --- 腕力家族 ---
    { pokemonId: 66, nameZh: '腕力', nameEn: 'Machop', encounterRate: 140, minDepth: 0 },
    { pokemonId: 67, nameZh: '豪力', nameEn: 'Machoke', encounterRate: 80, minDepth: 3 },
    { pokemonId: 68, nameZh: '怪力', nameEn: 'Machamp', encounterRate: 40, minDepth: 4 },
    // --- 喇叭芽家族 ---
    { pokemonId: 69, nameZh: '喇叭芽', nameEn: 'Bellsprout', encounterRate: 200, minDepth: 0 },
    { pokemonId: 70, nameZh: '口呆花', nameEn: 'Weepinbell', encounterRate: 100, minDepth: 3 },
    { pokemonId: 71, nameZh: '大食花', nameEn: 'Victreebel', encounterRate: 40, minDepth: 4 },
    // --- 瑪瑙水母家族 ---
    { pokemonId: 72, nameZh: '瑪瑙水母', nameEn: 'Tentacool', encounterRate: 160, minDepth: 0 },
    { pokemonId: 73, nameZh: '毒刺水母', nameEn: 'Tentacruel', encounterRate: 70, minDepth: 3 },
    // --- 小拳石家族 ---
    { pokemonId: 74, nameZh: '小拳石', nameEn: 'Geodude', encounterRate: 200, minDepth: 0 },
    { pokemonId: 75, nameZh: '隆隆石', nameEn: 'Graveler', encounterRate: 100, minDepth: 3 },
    { pokemonId: 76, nameZh: '隆隆岩', nameEn: 'Golem', encounterRate: 40, minDepth: 4 },
    // --- 小火馬家族 ---
    { pokemonId: 77, nameZh: '小火馬', nameEn: 'Ponyta', encounterRate: 160, minDepth: 0 },
    { pokemonId: 78, nameZh: '烈焰馬', nameEn: 'RappokemonIdash', encounterRate: 70, minDepth: 3 },
    // --- 呆呆獸家族 ---
    { pokemonId: 79, nameZh: '呆呆獸', nameEn: 'Slowpoke', encounterRate: 160, minDepth: 0 },
    { pokemonId: 80, nameZh: '呆殼獸', nameEn: 'Slowbro', encounterRate: 70, minDepth: 3 },
    // --- 小磁怪家族 ---
    { pokemonId: 81, nameZh: '小磁怪', nameEn: 'Magnemite', encounterRate: 150, minDepth: 0 },
    { pokemonId: 82, nameZh: '三合一磁怪', nameEn: 'Magneton', encounterRate: 60, minDepth: 3 },
    // --- 大蔥鴨 ---
    { pokemonId: 83, nameZh: '大蔥鴨', nameEn: "Farfetch'd", encounterRate: 50, minDepth: 2 },
    // --- 嘟嘟家族 ---
    { pokemonId: 84, nameZh: '嘟嘟', nameEn: 'Doduo', encounterRate: 160, minDepth: 0 },
    { pokemonId: 85, nameZh: '嘟嘟利', nameEn: 'Dodrio', encounterRate: 70, minDepth: 3 },
    // --- 小海獅家族 ---
    { pokemonId: 86, nameZh: '小海獅', nameEn: 'Seel', encounterRate: 160, minDepth: 0 },
    { pokemonId: 87, nameZh: '白海獅', nameEn: 'Dewgong', encounterRate: 70, minDepth: 3 },
    // --- 臭泥家族 ---
    { pokemonId: 88, nameZh: '臭泥', nameEn: 'Grimer', encounterRate: 150, minDepth: 0 },
    { pokemonId: 89, nameZh: '臭臭泥', nameEn: 'Muk', encounterRate: 60, minDepth: 3 },
    // --- 大舌貝家族 ---
    { pokemonId: 90, nameZh: '大舌貝', nameEn: 'Shellder', encounterRate: 160, minDepth: 0 },
    { pokemonId: 91, nameZh: '刺甲貝', nameEn: 'Cloyster', encounterRate: 70, minDepth: 3 },
    // --- 鬼斯家族 ---
    { pokemonId: 92, nameZh: '鬼斯', nameEn: 'Gastly', encounterRate: 150, minDepth: 0 },
    { pokemonId: 93, nameZh: '鬼斯通', nameEn: 'Haunter', encounterRate: 80, minDepth: 3 },
    { pokemonId: 94, nameZh: '耿鬼', nameEn: 'Gengar', encounterRate: 40, minDepth: 4 },
    // --- 大岩蛇 ---
    { pokemonId: 95, nameZh: '大岩蛇', nameEn: 'Onix', encounterRate: 40, minDepth: 2 },
    // --- 素利普家族 ---
    { pokemonId: 96, nameZh: '素利普', nameEn: 'Drowzee', encounterRate: 140, minDepth: 0 },
    { pokemonId: 97, nameZh: '素利拍', nameEn: 'Hypno', encounterRate: 60, minDepth: 3 },
    // --- 大鉗蟹家族 ---
    { pokemonId: 98, nameZh: '大鉗蟹', nameEn: 'Krabby', encounterRate: 180, minDepth: 0 },
    { pokemonId: 99, nameZh: '巨鉗蟹', nameEn: 'Kingler', encounterRate: 70, minDepth: 3 },
    // --- 霹靂電球家族 ---
    { pokemonId: 100, nameZh: '霹靂電球', nameEn: 'Voltorb', encounterRate: 140, minDepth: 0 },
    { pokemonId: 101, nameZh: '頑皮雷彈', nameEn: 'Electrode', encounterRate: 50, minDepth: 3 },
    // --- 蛋蛋家族 ---
    { pokemonId: 102, nameZh: '蛋蛋', nameEn: 'Exeggcute', encounterRate: 120, minDepth: 0 },
    { pokemonId: 103, nameZh: '椰蛋樹', nameEn: 'Exeggutor', encounterRate: 80, minDepth: 3 },
    // --- 卡拉卡拉家族 ---
    { pokemonId: 104, nameZh: '卡拉卡拉', nameEn: 'Cubone', encounterRate: 40, minDepth: 0 },
    { pokemonId: 105, nameZh: '嘎啦嘎啦', nameEn: 'Marowak', encounterRate: 100, minDepth: 3 },
    // --- 飛腿郎/快拳郎/大舌頭 ---
    { pokemonId: 106, nameZh: '飛腿郎', nameEn: 'Hitmonlee', encounterRate: 50, minDepth: 3 },
    { pokemonId: 107, nameZh: '快拳郎', nameEn: 'Hitmonchan', encounterRate: 120, minDepth: 3 },
    { pokemonId: 108, nameZh: '大舌頭', nameEn: 'Lickitung', encounterRate: 80, minDepth: 2 },
    // --- 瓦斯彈家族 ---
    { pokemonId: 109, nameZh: '瓦斯彈', nameEn: 'Koffing', encounterRate: 140, minDepth: 0 },
    { pokemonId: 110, nameZh: '雙彈瓦斯', nameEn: 'Weezing', encounterRate: 70, minDepth: 3 },
    // --- 獨角犀牛家族 ---
    { pokemonId: 111, nameZh: '獨角犀牛', nameEn: 'Rhyhorn', encounterRate: 120, minDepth: 0 },
    { pokemonId: 112, nameZh: '鑽角犀獸', nameEn: 'Rhydon', encounterRate: 60, minDepth: 3 },
    // --- 吉利蛋/蔓藤怪/袋獸 ---
    { pokemonId: 113, nameZh: '吉利蛋', nameEn: 'Chansey', encounterRate: 50, minDepth: 3 },
    { pokemonId: 114, nameZh: '蔓藤怪', nameEn: 'Tangela', encounterRate: 80, minDepth: 2 },
    { pokemonId: 115, nameZh: '袋獸', nameEn: 'Kangaskhan', encounterRate: 60, minDepth: 3 },
    // --- 墨海馬家族 ---
    { pokemonId: 116, nameZh: '墨海馬', nameEn: 'Horsea', encounterRate: 140, minDepth: 0 },
    { pokemonId: 117, nameZh: '海刺龍', nameEn: 'Seadra', encounterRate: 70, minDepth: 3 },
    // --- 角金魚家族 ---
    { pokemonId: 118, nameZh: '角金魚', nameEn: 'Goldeen', encounterRate: 130, minDepth: 0 },
    { pokemonId: 119, nameZh: '金魚王', nameEn: 'Seaking', encounterRate: 60, minDepth: 3 },
    // --- 海星星家族 ---
    { pokemonId: 120, nameZh: '海星星', nameEn: 'Staryu', encounterRate: 140, minDepth: 0 },
    { pokemonId: 121, nameZh: '寶石海星', nameEn: 'Starmie', encounterRate: 80, minDepth: 3 },
    // --- 吸盤魔偶/飛天螳螂/迷唇姐/電擊獸/鴨嘴火獸 ---
    { pokemonId: 122, nameZh: '吸盤魔偶', nameEn: 'Mr. Mime', encounterRate: 60, minDepth: 3 },
    { pokemonId: 123, nameZh: '飛天螳螂', nameEn: 'Scyther', encounterRate: 40, minDepth: 3 },
    { pokemonId: 124, nameZh: '迷唇姐', nameEn: 'Jynx', encounterRate: 50, minDepth: 3 },
    { pokemonId: 125, nameZh: '電擊獸', nameEn: 'Electabuzz', encounterRate: 50, minDepth: 3 },
    { pokemonId: 126, nameZh: '鴨嘴火獸', nameEn: 'Magmar', encounterRate: 50, minDepth: 3 },
    { pokemonId: 127, nameZh: '凱羅斯', nameEn: 'Pinsir', encounterRate: 45, minDepth: 3 },
    { pokemonId: 128, nameZh: '肯泰羅', nameEn: 'Tauros', encounterRate: 80, minDepth: 3 },
    // --- 鯉魚王家族 ---
    { pokemonId: 129, nameZh: '鯉魚王', nameEn: 'Magikarp', encounterRate: 200, minDepth: 0 },
    { pokemonId: 130, nameZh: '暴鯉龍', nameEn: 'Gyarados', encounterRate: 50, minDepth: 4 },
    // --- 拉普拉斯/百變怪/伊布 ---
    { pokemonId: 131, nameZh: '拉普拉斯', nameEn: 'Lapras', encounterRate: 15, minDepth: 3 },
    { pokemonId: 132, nameZh: '百變怪', nameEn: 'Ditto', encounterRate: 20, minDepth: 2 },
    { pokemonId: 133, nameZh: '伊布', nameEn: 'Eevee', encounterRate: 35, minDepth: 0 },
    // --- 伊布進化 ---
    { pokemonId: 134, nameZh: '水伊布', nameEn: 'Vaporeon', encounterRate: 20, minDepth: 3 },
    { pokemonId: 135, nameZh: '雷伊布', nameEn: 'Jolteon', encounterRate: 20, minDepth: 3 },
    { pokemonId: 136, nameZh: '火伊布', nameEn: 'Flareon', encounterRate: 20, minDepth: 3 },
    // --- 3D龍/菊石獸/化石盔/化石翼龍 ---
    { pokemonId: 137, nameZh: '多邊獸', nameEn: 'Porygon', encounterRate: 25, minDepth: 3 },
    { pokemonId: 138, nameZh: '菊石獸', nameEn: 'Omanyte', encounterRate: 30, minDepth: 2 },
    { pokemonId: 139, nameZh: '多刺菊石獸', nameEn: 'Omastar', encounterRate: 20, minDepth: 4 },
    { pokemonId: 140, nameZh: '化石盔', nameEn: 'Kabuto', encounterRate: 30, minDepth: 2 },
    { pokemonId: 141, nameZh: '鐮刀盔', nameEn: 'Kabutops', encounterRate: 20, minDepth: 4 },
    { pokemonId: 142, nameZh: '化石翼龍', nameEn: 'Aerodactyl', encounterRate: 5, minDepth: 4 },
    // --- 卡比獸 ---
    { pokemonId: 143, nameZh: '卡比獸', nameEn: 'Snorlax', encounterRate: 1, minDepth: 4 },
    // --- 傳說三鳥 ---
    { pokemonId: 144, nameZh: '急凍鳥', nameEn: 'Articuno', encounterRate: 1, minDepth: 5 },
    { pokemonId: 145, nameZh: '閃電鳥', nameEn: 'Zapdos', encounterRate: 1, minDepth: 5 },
    { pokemonId: 146, nameZh: '火焰鳥', nameEn: 'Moltres', encounterRate: 1, minDepth: 5 },
    // --- 迷你龍家族 ---
    { pokemonId: 147, nameZh: '迷你龍', nameEn: 'Dratini', encounterRate: 40, minDepth: 2 },
    { pokemonId: 148, nameZh: '哈克龍', nameEn: 'Dragonair', encounterRate: 20, minDepth: 3 },
    { pokemonId: 149, nameZh: '快龍', nameEn: 'Dragonite', encounterRate: 5, minDepth: 5 },
    // --- 超夢/夢幻 ---
    { pokemonId: 150, nameZh: '超夢', nameEn: 'Mewtwo', encounterRate: 1, minDepth: 6 }, // 極難
    { pokemonId: 151, nameZh: '夢幻', nameEn: 'Mew', encounterRate: 1, minDepth: 6 }  // 極難
];


// ==========================================
// 3. Biome Configuration
// ==========================================

// 定義不同「生態系 (Biome)」包含哪些屬性
export const BIOME_GROUPS: { [key in BiomeType]: PokemonType[] } = {
    // Biome 0: 森林/草原 (Grassland)
    [BiomeType.Grassland]: ['grass', 'bug', 'normal', 'poison', 'flying'],

    // Biome 1: 水域/海灘 (Water/Beach)
    [BiomeType.WaterBeach]: ['water', 'ice', 'psychic'],

    // Biome 2: 城市/發電廠 (Urban/Power Plant)
    [BiomeType.UrbanPowerPlant]: ['electric', 'steel', 'normal', 'fighting'],

    // Biome 3: 山地/洞穴 (Mountain/Cave)
    [BiomeType.MountainCave]: ['rock', 'ground', 'fire', 'fighting', 'dragon'],

    // Biome 4: 靈骨塔/廢墟 (Ghost/Mystic)
    [BiomeType.GhostMystic]: ['ghost', 'psychic', 'poison', 'fairy'],

};

// 深淵垃圾池 (Toxic Pool): 當深度過深時，只能遇到這些
export const TOXIC_POOL_POKEMONIDS = [19, 41, 88, 109, 129]; // 小拉達, 超音蝠, 臭泥, 瓦斯彈, 鯉魚王