import { BiomeType } from "../dataAccessObj/BiomeData";
import { PokeEncounterData } from "../dataAccessObj/pokeEncounterData";
import { PokemonType } from "../dataAccessObj/pokemon";


export const KantoPokemonEncounterData: PokeEncounterData[] = [// --- 妙蛙種子家族 ---
    { pokemonId: 1, nameZh: '妙蛙種子', nameEn: 'Bulbasaur', type: ['grass', 'poison'], catchRate: 45, minDepth: 0 },
    { pokemonId: 2, nameZh: '妙蛙草', nameEn: 'Ivysaur', type: ['grass', 'poison'], catchRate: 45, minDepth: 3 },
    { pokemonId: 3, nameZh: '妙蛙花', nameEn: 'Venusaur', type: ['grass', 'poison'], catchRate: 45, minDepth: 4 },
    // --- 小火龍家族 ---
    { pokemonId: 4, nameZh: '小火龍', nameEn: 'Charmander', type: ['fire'], catchRate: 45, minDepth: 0 },
    { pokemonId: 5, nameZh: '火恐龍', nameEn: 'Charmeleon', type: ['fire'], catchRate: 45, minDepth: 3 },
    { pokemonId: 6, nameZh: '噴火龍', nameEn: 'Charizard', type: ['fire', 'flying'], catchRate: 45, minDepth: 4 },
    // --- 傑尼龜家族 ---
    { pokemonId: 7, nameZh: '傑尼龜', nameEn: 'Squirtle', type: ['water'], catchRate: 45, minDepth: 0 },
    { pokemonId: 8, nameZh: '卡咪龜', nameEn: 'Wartortle', type: ['water'], catchRate: 45, minDepth: 3 },
    { pokemonId: 9, nameZh: '水箭龜', nameEn: 'Blastoise', type: ['water'], catchRate: 45, minDepth: 4 },
    // --- 綠毛蟲家族 ---
    { pokemonId: 10, nameZh: '綠毛蟲', nameEn: 'Caterpie', type: ['bug'], catchRate: 255, minDepth: 0 },
    { pokemonId: 11, nameZh: '鐵甲蛹', nameEn: 'Metapod', type: ['bug'], catchRate: 120, minDepth: 2 },
    { pokemonId: 12, nameZh: '巴大蝶', nameEn: 'Butterfree', type: ['bug', 'flying'], catchRate: 45, minDepth: 4 },
    // --- 獨角蟲家族 ---
    { pokemonId: 13, nameZh: '獨角蟲', nameEn: 'Weedle', type: ['bug', 'poison'], catchRate: 255, minDepth: 0 },
    { pokemonId: 14, nameZh: '鐵殼蛹', nameEn: 'Kakuna', type: ['bug', 'poison'], catchRate: 120, minDepth: 2 },
    { pokemonId: 15, nameZh: '大針蜂', nameEn: 'Beedrill', type: ['bug', 'poison'], catchRate: 45, minDepth: 4 },
    // --- 波波家族 ---
    { pokemonId: 16, nameZh: '波波', nameEn: 'PpokemonIdgey', type: ['normal', 'flying'], catchRate: 255, minDepth: 0 },
    { pokemonId: 17, nameZh: '比比鳥', nameEn: 'PpokemonIdgeotto', type: ['normal', 'flying'], catchRate: 120, minDepth: 3 },
    { pokemonId: 18, nameZh: '大比鳥', nameEn: 'PpokemonIdgeot', type: ['normal', 'flying'], catchRate: 45, minDepth: 4 },
    // --- 小拉達家族 ---
    { pokemonId: 19, nameZh: '小拉達', nameEn: 'Rattata', type: ['normal'], catchRate: 255, minDepth: 0 },
    { pokemonId: 20, nameZh: '拉達', nameEn: 'Raticate', type: ['normal'], catchRate: 127, minDepth: 3 },
    // --- 烈雀家族 ---
    { pokemonId: 21, nameZh: '烈雀', nameEn: 'Spearow', type: ['normal', 'flying'], catchRate: 255, minDepth: 0 },
    { pokemonId: 22, nameZh: '大嘴雀', nameEn: 'Fearow', type: ['normal', 'flying'], catchRate: 90, minDepth: 3 },
    // --- 阿柏蛇家族 ---
    { pokemonId: 23, nameZh: '阿柏蛇', nameEn: 'Ekans', type: ['poison'], catchRate: 255, minDepth: 0 },
    { pokemonId: 24, nameZh: '阿柏怪', nameEn: 'Arbok', type: ['poison'], catchRate: 90, minDepth: 3 },
    // --- 皮卡丘家族 ---
    { pokemonId: 25, nameZh: '皮卡丘', nameEn: 'Pikachu', type: ['electric'], catchRate: 190, minDepth: 0 },
    { pokemonId: 26, nameZh: '雷丘', nameEn: 'Raichu', type: ['electric'], catchRate: 75, minDepth: 3 },
    // --- 穿山鼠家族 ---
    { pokemonId: 27, nameZh: '穿山鼠', nameEn: 'Sandshrew', type: ['ground'], catchRate: 255, minDepth: 0 },
    { pokemonId: 28, nameZh: '穿山王', nameEn: 'Sandslash', type: ['ground'], catchRate: 90, minDepth: 3 },
    // --- 尼多蘭家族 ---
    { pokemonId: 29, nameZh: '尼多蘭', nameEn: 'NpokemonIdoran♀', type: ['poison'], catchRate: 235, minDepth: 0 },
    { pokemonId: 30, nameZh: '尼多娜', nameEn: 'NpokemonIdorina', type: ['poison'], catchRate: 120, minDepth: 3 },
    { pokemonId: 31, nameZh: '尼多后', nameEn: 'NpokemonIdoqueen', type: ['poison', 'ground'], catchRate: 45, minDepth: 4 },
    // --- 尼多朗家族 ---
    { pokemonId: 32, nameZh: '尼多朗', nameEn: 'NpokemonIdoran♂', type: ['poison'], catchRate: 235, minDepth: 0 },
    { pokemonId: 33, nameZh: '尼多力諾', nameEn: 'NpokemonIdorino', type: ['poison'], catchRate: 120, minDepth: 3 },
    { pokemonId: 34, nameZh: '尼多王', nameEn: 'NpokemonIdoking', type: ['poison', 'ground'], catchRate: 45, minDepth: 4 },
    // --- 皮皮家族 ---
    { pokemonId: 35, nameZh: '皮皮', nameEn: 'Clefairy', type: ['fairy'], catchRate: 150, minDepth: 0 },
    { pokemonId: 36, nameZh: '皮可西', nameEn: 'Clefable', type: ['fairy'], catchRate: 25, minDepth: 3 },
    // --- 六尾家族 ---
    { pokemonId: 37, nameZh: '六尾', nameEn: 'Vulpix', type: ['fire'], catchRate: 190, minDepth: 0 },
    { pokemonId: 38, nameZh: '九尾', nameEn: 'Ninetales', type: ['fire'], catchRate: 75, minDepth: 3 },
    // --- 胖丁家族 ---
    { pokemonId: 39, nameZh: '胖丁', nameEn: 'Jigglypuff', type: ['normal', 'fairy'], catchRate: 170, minDepth: 0 },
    { pokemonId: 40, nameZh: '胖可丁', nameEn: 'Wigglytuff', type: ['normal', 'fairy'], catchRate: 50, minDepth: 3 },
    // --- 超音蝠家族 ---
    { pokemonId: 41, nameZh: '超音蝠', nameEn: 'Zubat', type: ['poison', 'flying'], catchRate: 255, minDepth: 0 },
    { pokemonId: 42, nameZh: '大嘴蝠', nameEn: 'Golbat', type: ['poison', 'flying'], catchRate: 90, minDepth: 3 },
    // --- 走路草家族 ---
    { pokemonId: 43, nameZh: '走路草', nameEn: 'Oddish', type: ['grass', 'poison'], catchRate: 255, minDepth: 0 },
    { pokemonId: 44, nameZh: '臭臭花', nameEn: 'Gloom', type: ['grass', 'poison'], catchRate: 120, minDepth: 3 },
    { pokemonId: 45, nameZh: '霸王花', nameEn: 'Vileplume', type: ['grass', 'poison'], catchRate: 45, minDepth: 4 },
    // --- 派拉斯家族 ---
    { pokemonId: 46, nameZh: '派拉斯', nameEn: 'Paras', type: ['bug', 'grass'], catchRate: 190, minDepth: 0 },
    { pokemonId: 47, nameZh: '派拉斯特', nameEn: 'Parasect', type: ['bug', 'grass'], catchRate: 75, minDepth: 3 },
    // --- 毛球家族 ---
    { pokemonId: 48, nameZh: '毛球', nameEn: 'Venonat', type: ['bug', 'poison'], catchRate: 190, minDepth: 0 },
    { pokemonId: 49, nameZh: '摩魯蛾', nameEn: 'Venomoth', type: ['bug', 'poison'], catchRate: 75, minDepth: 3 },
    // --- 地鼠家族 ---
    { pokemonId: 50, nameZh: '地鼠', nameEn: 'Diglett', type: ['ground'], catchRate: 255, minDepth: 0 },
    { pokemonId: 51, nameZh: '三地鼠', nameEn: 'Dugtrio', type: ['ground'], catchRate: 50, minDepth: 3 },
    // --- 喵喵家族 ---
    { pokemonId: 52, nameZh: '喵喵', nameEn: 'Meowth', type: ['normal'], catchRate: 255, minDepth: 0 },
    { pokemonId: 53, nameZh: '貓老大', nameEn: 'Persian', type: ['normal'], catchRate: 90, minDepth: 3 },
    // --- 可達鴨家族 ---
    { pokemonId: 54, nameZh: '可達鴨', nameEn: 'Psyduck', type: ['water'], catchRate: 190, minDepth: 0 },
    { pokemonId: 55, nameZh: '哥達鴨', nameEn: 'Golduck', type: ['water'], catchRate: 75, minDepth: 3 },
    // --- 猴怪家族 ---
    { pokemonId: 56, nameZh: '猴怪', nameEn: 'Mankey', type: ['fighting'], catchRate: 190, minDepth: 0 },
    { pokemonId: 57, nameZh: '火爆猴', nameEn: 'Primeape', type: ['fighting'], catchRate: 75, minDepth: 3 },
    // --- 卡蒂狗家族 ---
    { pokemonId: 58, nameZh: '卡蒂狗', nameEn: 'Growlithe', type: ['fire'], catchRate: 190, minDepth: 0 },
    { pokemonId: 59, nameZh: '風速狗', nameEn: 'Arcanine', type: ['fire'], catchRate: 75, minDepth: 3 },
    // --- 蚊香蝌蚪家族 ---
    { pokemonId: 60, nameZh: '蚊香蝌蚪', nameEn: 'Poliwag', type: ['water'], catchRate: 255, minDepth: 0 },
    { pokemonId: 61, nameZh: '蚊香君', nameEn: 'Poliwhirl', type: ['water'], catchRate: 120, minDepth: 3 },
    { pokemonId: 62, nameZh: '蚊香泳士', nameEn: 'Poliwrath', type: ['water', 'fighting'], catchRate: 45, minDepth: 4 },
    // --- 凱西家族 ---
    { pokemonId: 63, nameZh: '凱西', nameEn: 'Abra', type: ['psychic'], catchRate: 200, minDepth: 0 },
    { pokemonId: 64, nameZh: '勇基拉', nameEn: 'Kadabra', type: ['psychic'], catchRate: 100, minDepth: 3 },
    { pokemonId: 65, nameZh: '胡地', nameEn: 'Alakazam', type: ['psychic'], catchRate: 50, minDepth: 4 },
    // --- 腕力家族 ---
    { pokemonId: 66, nameZh: '腕力', nameEn: 'Machop', type: ['fighting'], catchRate: 180, minDepth: 0 },
    { pokemonId: 67, nameZh: '豪力', nameEn: 'Machoke', type: ['fighting'], catchRate: 90, minDepth: 3 },
    { pokemonId: 68, nameZh: '怪力', nameEn: 'Machamp', type: ['fighting'], catchRate: 45, minDepth: 4 },
    // --- 喇叭芽家族 ---
    { pokemonId: 69, nameZh: '喇叭芽', nameEn: 'Bellsprout', type: ['grass', 'poison'], catchRate: 255, minDepth: 0 },
    { pokemonId: 70, nameZh: '口呆花', nameEn: 'Weepinbell', type: ['grass', 'poison'], catchRate: 120, minDepth: 3 },
    { pokemonId: 71, nameZh: '大食花', nameEn: 'Victreebel', type: ['grass', 'poison'], catchRate: 45, minDepth: 4 },
    // --- 瑪瑙水母家族 ---
    { pokemonId: 72, nameZh: '瑪瑙水母', nameEn: 'Tentacool', type: ['water', 'poison'], catchRate: 190, minDepth: 0 },
    { pokemonId: 73, nameZh: '毒刺水母', nameEn: 'Tentacruel', type: ['water', 'poison'], catchRate: 60, minDepth: 3 },
    // --- 小拳石家族 ---
    { pokemonId: 74, nameZh: '小拳石', nameEn: 'Geodude', type: ['rock', 'ground'], catchRate: 255, minDepth: 0 },
    { pokemonId: 75, nameZh: '隆隆石', nameEn: 'Graveler', type: ['rock', 'ground'], catchRate: 120, minDepth: 3 },
    { pokemonId: 76, nameZh: '隆隆岩', nameEn: 'Golem', type: ['rock', 'ground'], catchRate: 45, minDepth: 4 },
    // --- 小火馬家族 ---
    { pokemonId: 77, nameZh: '小火馬', nameEn: 'Ponyta', type: ['fire'], catchRate: 190, minDepth: 0 },
    { pokemonId: 78, nameZh: '烈焰馬', nameEn: 'RappokemonIdash', type: ['fire'], catchRate: 60, minDepth: 3 },
    // --- 呆呆獸家族 ---
    { pokemonId: 79, nameZh: '呆呆獸', nameEn: 'Slowpoke', type: ['water', 'psychic'], catchRate: 190, minDepth: 0 },
    { pokemonId: 80, nameZh: '呆殼獸', nameEn: 'Slowbro', type: ['water', 'psychic'], catchRate: 75, minDepth: 3 },
    // --- 小磁怪家族 ---
    { pokemonId: 81, nameZh: '小磁怪', nameEn: 'Magnemite', type: ['electric', 'steel'], catchRate: 190, minDepth: 0 },
    { pokemonId: 82, nameZh: '三合一磁怪', nameEn: 'Magneton', type: ['electric', 'steel'], catchRate: 60, minDepth: 3 },
    // --- 大蔥鴨 ---
    { pokemonId: 83, nameZh: '大蔥鴨', nameEn: "Farfetch'd", type: ['normal', 'flying'], catchRate: 45, minDepth: 2 },
    // --- 嘟嘟家族 ---
    { pokemonId: 84, nameZh: '嘟嘟', nameEn: 'Doduo', type: ['normal', 'flying'], catchRate: 190, minDepth: 0 },
    { pokemonId: 85, nameZh: '嘟嘟利', nameEn: 'Dodrio', type: ['normal', 'flying'], catchRate: 45, minDepth: 3 },
    // --- 小海獅家族 ---
    { pokemonId: 86, nameZh: '小海獅', nameEn: 'Seel', type: ['water'], catchRate: 190, minDepth: 0 },
    { pokemonId: 87, nameZh: '白海獅', nameEn: 'Dewgong', type: ['water', 'ice'], catchRate: 75, minDepth: 3 },
    // --- 臭泥家族 ---
    { pokemonId: 88, nameZh: '臭泥', nameEn: 'Grimer', type: ['poison'], catchRate: 190, minDepth: 0 },
    { pokemonId: 89, nameZh: '臭臭泥', nameEn: 'Muk', type: ['poison'], catchRate: 75, minDepth: 3 },
    // --- 大舌貝家族 ---
    { pokemonId: 90, nameZh: '大舌貝', nameEn: 'Shellder', type: ['water'], catchRate: 190, minDepth: 0 },
    { pokemonId: 91, nameZh: '刺甲貝', nameEn: 'Cloyster', type: ['water', 'ice'], catchRate: 60, minDepth: 3 },
    // --- 鬼斯家族 ---
    { pokemonId: 92, nameZh: '鬼斯', nameEn: 'Gastly', type: ['ghost', 'poison'], catchRate: 190, minDepth: 0 },
    { pokemonId: 93, nameZh: '鬼斯通', nameEn: 'Haunter', type: ['ghost', 'poison'], catchRate: 90, minDepth: 3 },
    { pokemonId: 94, nameZh: '耿鬼', nameEn: 'Gengar', type: ['ghost', 'poison'], catchRate: 45, minDepth: 4 },
    // --- 大岩蛇 ---
    { pokemonId: 95, nameZh: '大岩蛇', nameEn: 'Onix', type: ['rock', 'ground'], catchRate: 45, minDepth: 2 },
    // --- 素利普家族 ---
    { pokemonId: 96, nameZh: '素利普', nameEn: 'Drowzee', type: ['psychic'], catchRate: 190, minDepth: 0 },
    { pokemonId: 97, nameZh: '素利拍', nameEn: 'Hypno', type: ['psychic'], catchRate: 75, minDepth: 3 },
    // --- 大鉗蟹家族 ---
    { pokemonId: 98, nameZh: '大鉗蟹', nameEn: 'Krabby', type: ['water'], catchRate: 225, minDepth: 0 },
    { pokemonId: 99, nameZh: '巨鉗蟹', nameEn: 'Kingler', type: ['water'], catchRate: 60, minDepth: 3 },
    // --- 霹靂電球家族 ---
    { pokemonId: 100, nameZh: '霹靂電球', nameEn: 'Voltorb', type: ['electric'], catchRate: 190, minDepth: 0 },
    { pokemonId: 101, nameZh: '頑皮雷彈', nameEn: 'Electrode', type: ['electric'], catchRate: 60, minDepth: 3 },
    // --- 蛋蛋家族 ---
    { pokemonId: 102, nameZh: '蛋蛋', nameEn: 'Exeggcute', type: ['grass', 'psychic'], catchRate: 90, minDepth: 0 },
    { pokemonId: 103, nameZh: '椰蛋樹', nameEn: 'Exeggutor', type: ['grass', 'psychic'], catchRate: 45, minDepth: 3 },
    // --- 卡拉卡拉家族 ---
    { pokemonId: 104, nameZh: '卡拉卡拉', nameEn: 'Cubone', type: ['ground'], catchRate: 190, minDepth: 0 },
    { pokemonId: 105, nameZh: '嘎啦嘎啦', nameEn: 'Marowak', type: ['ground'], catchRate: 75, minDepth: 3 },
    // --- 飛腿郎/快拳郎/大舌頭 ---
    { pokemonId: 106, nameZh: '飛腿郎', nameEn: 'Hitmonlee', type: ['fighting'], catchRate: 45, minDepth: 3 },
    { pokemonId: 107, nameZh: '快拳郎', nameEn: 'Hitmonchan', type: ['fighting'], catchRate: 45, minDepth: 3 },
    { pokemonId: 108, nameZh: '大舌頭', nameEn: 'Lickitung', type: ['normal'], catchRate: 45, minDepth: 2 },
    // --- 瓦斯彈家族 ---
    { pokemonId: 109, nameZh: '瓦斯彈', nameEn: 'Koffing', type: ['poison'], catchRate: 190, minDepth: 0 },
    { pokemonId: 110, nameZh: '雙彈瓦斯', nameEn: 'Weezing', type: ['poison'], catchRate: 60, minDepth: 3 },
    // --- 獨角犀牛家族 ---
    { pokemonId: 111, nameZh: '獨角犀牛', nameEn: 'Rhyhorn', type: ['ground', 'rock'], catchRate: 120, minDepth: 0 },
    { pokemonId: 112, nameZh: '鑽角犀獸', nameEn: 'Rhydon', type: ['ground', 'rock'], catchRate: 60, minDepth: 3 },
    // --- 吉利蛋/蔓藤怪/袋獸 ---
    { pokemonId: 113, nameZh: '吉利蛋', nameEn: 'Chansey', type: ['normal'], catchRate: 30, minDepth: 3 },
    { pokemonId: 114, nameZh: '蔓藤怪', nameEn: 'Tangela', type: ['grass'], catchRate: 45, minDepth: 2 },
    { pokemonId: 115, nameZh: '袋獸', nameEn: 'Kangaskhan', type: ['normal'], catchRate: 45, minDepth: 3 },
    // --- 墨海馬家族 ---
    { pokemonId: 116, nameZh: '墨海馬', nameEn: 'Horsea', type: ['water'], catchRate: 225, minDepth: 0 },
    { pokemonId: 117, nameZh: '海刺龍', nameEn: 'Seadra', type: ['water'], catchRate: 75, minDepth: 3 },
    // --- 角金魚家族 ---
    { pokemonId: 118, nameZh: '角金魚', nameEn: 'Goldeen', type: ['water'], catchRate: 225, minDepth: 0 },
    { pokemonId: 119, nameZh: '金魚王', nameEn: 'Seaking', type: ['water'], catchRate: 60, minDepth: 3 },
    // --- 海星星家族 ---
    { pokemonId: 120, nameZh: '海星星', nameEn: 'Staryu', type: ['water'], catchRate: 225, minDepth: 0 },
    { pokemonId: 121, nameZh: '寶石海星', nameEn: 'Starmie', type: ['water', 'psychic'], catchRate: 60, minDepth: 3 },
    // --- 吸盤魔偶/飛天螳螂/迷唇姐/電擊獸/鴨嘴火獸 ---
    { pokemonId: 122, nameZh: '吸盤魔偶', nameEn: 'Mr. Mime', type: ['psychic', 'fairy'], catchRate: 45, minDepth: 3 },
    { pokemonId: 123, nameZh: '飛天螳螂', nameEn: 'Scyther', type: ['bug', 'flying'], catchRate: 45, minDepth: 3 },
    { pokemonId: 124, nameZh: '迷唇姐', nameEn: 'Jynx', type: ['ice', 'psychic'], catchRate: 45, minDepth: 3 },
    { pokemonId: 125, nameZh: '電擊獸', nameEn: 'Electabuzz', type: ['electric'], catchRate: 45, minDepth: 3 },
    { pokemonId: 126, nameZh: '鴨嘴火獸', nameEn: 'Magmar', type: ['fire'], catchRate: 45, minDepth: 3 },
    { pokemonId: 127, nameZh: '凱羅斯', nameEn: 'Pinsir', type: ['bug'], catchRate: 45, minDepth: 3 },
    { pokemonId: 128, nameZh: '肯泰羅', nameEn: 'Tauros', type: ['normal'], catchRate: 45, minDepth: 3 },
    // --- 鯉魚王家族 ---
    { pokemonId: 129, nameZh: '鯉魚王', nameEn: 'Magikarp', type: ['water'], catchRate: 255, minDepth: 0 },
    { pokemonId: 130, nameZh: '暴鯉龍', nameEn: 'Gyarados', type: ['water', 'flying'], catchRate: 45, minDepth: 4 },
    // --- 拉普拉斯/百變怪/伊布 ---
    { pokemonId: 131, nameZh: '拉普拉斯', nameEn: 'Lapras', type: ['water', 'ice'], catchRate: 45, minDepth: 3 },
    { pokemonId: 132, nameZh: '百變怪', nameEn: 'Ditto', type: ['normal'], catchRate: 35, minDepth: 2 },
    { pokemonId: 133, nameZh: '伊布', nameEn: 'Eevee', type: ['normal'], catchRate: 45, minDepth: 0 },
    // --- 伊布進化 ---
    { pokemonId: 134, nameZh: '水伊布', nameEn: 'Vaporeon', type: ['water'], catchRate: 45, minDepth: 3 },
    { pokemonId: 135, nameZh: '雷伊布', nameEn: 'Jolteon', type: ['electric'], catchRate: 45, minDepth: 3 },
    { pokemonId: 136, nameZh: '火伊布', nameEn: 'Flareon', type: ['fire'], catchRate: 45, minDepth: 3 },
    // --- 3D龍/菊石獸/化石盔/化石翼龍 ---
    { pokemonId: 137, nameZh: '多邊獸', nameEn: 'Porygon', type: ['normal'], catchRate: 45, minDepth: 3 },
    { pokemonId: 138, nameZh: '菊石獸', nameEn: 'Omanyte', type: ['rock', 'water'], catchRate: 45, minDepth: 2 },
    { pokemonId: 139, nameZh: '多刺菊石獸', nameEn: 'Omastar', type: ['rock', 'water'], catchRate: 45, minDepth: 4 },
    { pokemonId: 140, nameZh: '化石盔', nameEn: 'Kabuto', type: ['rock', 'water'], catchRate: 45, minDepth: 2 },
    { pokemonId: 141, nameZh: '鐮刀盔', nameEn: 'Kabutops', type: ['rock', 'water'], catchRate: 45, minDepth: 4 },
    { pokemonId: 142, nameZh: '化石翼龍', nameEn: 'Aerodactyl', type: ['rock', 'flying'], catchRate: 45, minDepth: 4 },
    // --- 卡比獸 ---
    { pokemonId: 143, nameZh: '卡比獸', nameEn: 'Snorlax', type: ['normal'], catchRate: 25, minDepth: 4 },
    // --- 傳說三鳥 ---
    { pokemonId: 144, nameZh: '急凍鳥', nameEn: 'Articuno', type: ['ice', 'flying'], catchRate: 3, minDepth: 5 },
    { pokemonId: 145, nameZh: '閃電鳥', nameEn: 'Zapdos', type: ['electric', 'flying'], catchRate: 3, minDepth: 5 },
    { pokemonId: 146, nameZh: '火焰鳥', nameEn: 'Moltres', type: ['fire', 'flying'], catchRate: 3, minDepth: 5 },
    // --- 迷你龍家族 ---
    { pokemonId: 147, nameZh: '迷你龍', nameEn: 'Dratini', type: ['dragon'], catchRate: 45, minDepth: 2 },
    { pokemonId: 148, nameZh: '哈克龍', nameEn: 'Dragonair', type: ['dragon'], catchRate: 45, minDepth: 3 },
    { pokemonId: 149, nameZh: '快龍', nameEn: 'Dragonite', type: ['dragon', 'flying'], catchRate: 45, minDepth: 5 },
    // --- 超夢/夢幻 ---
    { pokemonId: 150, nameZh: '超夢', nameEn: 'Mewtwo', type: ['psychic'], catchRate: 3, minDepth: 6 }, // 極難
    { pokemonId: 151, nameZh: '夢幻', nameEn: 'Mew', type: ['psychic'], catchRate: 45, minDepth: 6 }  // 極難
];


// ==========================================
// 3. Biome Configuration
// ==========================================

// 定義不同「生態系 (Biome)」包含哪些屬性
export  const BIOME_GROUPS: { [key in BiomeType]: PokemonType[] } = {
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