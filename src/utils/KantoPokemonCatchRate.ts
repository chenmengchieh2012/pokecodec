import { BiomeType } from "../dataAccessObj/BiomeData";
import { PokeEncounterData } from "../dataAccessObj/pokeEncounterData";
import { PokemonType } from "../dataAccessObj/pokemon";


export const KantoPokemonEncounterData: PokeEncounterData[] = [// --- 妙蛙種子家族 ---
    { id: 1, nameZh: '妙蛙種子', nameEn: 'Bulbasaur', type: ['grass', 'poison'], catchRate: 45, minDepth: 0 },
    { id: 2, nameZh: '妙蛙草', nameEn: 'Ivysaur', type: ['grass', 'poison'], catchRate: 45, minDepth: 3 },
    { id: 3, nameZh: '妙蛙花', nameEn: 'Venusaur', type: ['grass', 'poison'], catchRate: 45, minDepth: 4 },
    // --- 小火龍家族 ---
    { id: 4, nameZh: '小火龍', nameEn: 'Charmander', type: ['fire'], catchRate: 45, minDepth: 0 },
    { id: 5, nameZh: '火恐龍', nameEn: 'Charmeleon', type: ['fire'], catchRate: 45, minDepth: 3 },
    { id: 6, nameZh: '噴火龍', nameEn: 'Charizard', type: ['fire', 'flying'], catchRate: 45, minDepth: 4 },
    // --- 傑尼龜家族 ---
    { id: 7, nameZh: '傑尼龜', nameEn: 'Squirtle', type: ['water'], catchRate: 45, minDepth: 0 },
    { id: 8, nameZh: '卡咪龜', nameEn: 'Wartortle', type: ['water'], catchRate: 45, minDepth: 3 },
    { id: 9, nameZh: '水箭龜', nameEn: 'Blastoise', type: ['water'], catchRate: 45, minDepth: 4 },
    // --- 綠毛蟲家族 ---
    { id: 10, nameZh: '綠毛蟲', nameEn: 'Caterpie', type: ['bug'], catchRate: 255, minDepth: 0 },
    { id: 11, nameZh: '鐵甲蛹', nameEn: 'Metapod', type: ['bug'], catchRate: 120, minDepth: 2 },
    { id: 12, nameZh: '巴大蝶', nameEn: 'Butterfree', type: ['bug', 'flying'], catchRate: 45, minDepth: 4 },
    // --- 獨角蟲家族 ---
    { id: 13, nameZh: '獨角蟲', nameEn: 'Weedle', type: ['bug', 'poison'], catchRate: 255, minDepth: 0 },
    { id: 14, nameZh: '鐵殼蛹', nameEn: 'Kakuna', type: ['bug', 'poison'], catchRate: 120, minDepth: 2 },
    { id: 15, nameZh: '大針蜂', nameEn: 'Beedrill', type: ['bug', 'poison'], catchRate: 45, minDepth: 4 },
    // --- 波波家族 ---
    { id: 16, nameZh: '波波', nameEn: 'Pidgey', type: ['normal', 'flying'], catchRate: 255, minDepth: 0 },
    { id: 17, nameZh: '比比鳥', nameEn: 'Pidgeotto', type: ['normal', 'flying'], catchRate: 120, minDepth: 3 },
    { id: 18, nameZh: '大比鳥', nameEn: 'Pidgeot', type: ['normal', 'flying'], catchRate: 45, minDepth: 4 },
    // --- 小拉達家族 ---
    { id: 19, nameZh: '小拉達', nameEn: 'Rattata', type: ['normal'], catchRate: 255, minDepth: 0 },
    { id: 20, nameZh: '拉達', nameEn: 'Raticate', type: ['normal'], catchRate: 127, minDepth: 3 },
    // --- 烈雀家族 ---
    { id: 21, nameZh: '烈雀', nameEn: 'Spearow', type: ['normal', 'flying'], catchRate: 255, minDepth: 0 },
    { id: 22, nameZh: '大嘴雀', nameEn: 'Fearow', type: ['normal', 'flying'], catchRate: 90, minDepth: 3 },
    // --- 阿柏蛇家族 ---
    { id: 23, nameZh: '阿柏蛇', nameEn: 'Ekans', type: ['poison'], catchRate: 255, minDepth: 0 },
    { id: 24, nameZh: '阿柏怪', nameEn: 'Arbok', type: ['poison'], catchRate: 90, minDepth: 3 },
    // --- 皮卡丘家族 ---
    { id: 25, nameZh: '皮卡丘', nameEn: 'Pikachu', type: ['electric'], catchRate: 190, minDepth: 0 },
    { id: 26, nameZh: '雷丘', nameEn: 'Raichu', type: ['electric'], catchRate: 75, minDepth: 3 },
    // --- 穿山鼠家族 ---
    { id: 27, nameZh: '穿山鼠', nameEn: 'Sandshrew', type: ['ground'], catchRate: 255, minDepth: 0 },
    { id: 28, nameZh: '穿山王', nameEn: 'Sandslash', type: ['ground'], catchRate: 90, minDepth: 3 },
    // --- 尼多蘭家族 ---
    { id: 29, nameZh: '尼多蘭', nameEn: 'Nidoran♀', type: ['poison'], catchRate: 235, minDepth: 0 },
    { id: 30, nameZh: '尼多娜', nameEn: 'Nidorina', type: ['poison'], catchRate: 120, minDepth: 3 },
    { id: 31, nameZh: '尼多后', nameEn: 'Nidoqueen', type: ['poison', 'ground'], catchRate: 45, minDepth: 4 },
    // --- 尼多朗家族 ---
    { id: 32, nameZh: '尼多朗', nameEn: 'Nidoran♂', type: ['poison'], catchRate: 235, minDepth: 0 },
    { id: 33, nameZh: '尼多力諾', nameEn: 'Nidorino', type: ['poison'], catchRate: 120, minDepth: 3 },
    { id: 34, nameZh: '尼多王', nameEn: 'Nidoking', type: ['poison', 'ground'], catchRate: 45, minDepth: 4 },
    // --- 皮皮家族 ---
    { id: 35, nameZh: '皮皮', nameEn: 'Clefairy', type: ['fairy'], catchRate: 150, minDepth: 0 },
    { id: 36, nameZh: '皮可西', nameEn: 'Clefable', type: ['fairy'], catchRate: 25, minDepth: 3 },
    // --- 六尾家族 ---
    { id: 37, nameZh: '六尾', nameEn: 'Vulpix', type: ['fire'], catchRate: 190, minDepth: 0 },
    { id: 38, nameZh: '九尾', nameEn: 'Ninetales', type: ['fire'], catchRate: 75, minDepth: 3 },
    // --- 胖丁家族 ---
    { id: 39, nameZh: '胖丁', nameEn: 'Jigglypuff', type: ['normal', 'fairy'], catchRate: 170, minDepth: 0 },
    { id: 40, nameZh: '胖可丁', nameEn: 'Wigglytuff', type: ['normal', 'fairy'], catchRate: 50, minDepth: 3 },
    // --- 超音蝠家族 ---
    { id: 41, nameZh: '超音蝠', nameEn: 'Zubat', type: ['poison', 'flying'], catchRate: 255, minDepth: 0 },
    { id: 42, nameZh: '大嘴蝠', nameEn: 'Golbat', type: ['poison', 'flying'], catchRate: 90, minDepth: 3 },
    // --- 走路草家族 ---
    { id: 43, nameZh: '走路草', nameEn: 'Oddish', type: ['grass', 'poison'], catchRate: 255, minDepth: 0 },
    { id: 44, nameZh: '臭臭花', nameEn: 'Gloom', type: ['grass', 'poison'], catchRate: 120, minDepth: 3 },
    { id: 45, nameZh: '霸王花', nameEn: 'Vileplume', type: ['grass', 'poison'], catchRate: 45, minDepth: 4 },
    // --- 派拉斯家族 ---
    { id: 46, nameZh: '派拉斯', nameEn: 'Paras', type: ['bug', 'grass'], catchRate: 190, minDepth: 0 },
    { id: 47, nameZh: '派拉斯特', nameEn: 'Parasect', type: ['bug', 'grass'], catchRate: 75, minDepth: 3 },
    // --- 毛球家族 ---
    { id: 48, nameZh: '毛球', nameEn: 'Venonat', type: ['bug', 'poison'], catchRate: 190, minDepth: 0 },
    { id: 49, nameZh: '摩魯蛾', nameEn: 'Venomoth', type: ['bug', 'poison'], catchRate: 75, minDepth: 3 },
    // --- 地鼠家族 ---
    { id: 50, nameZh: '地鼠', nameEn: 'Diglett', type: ['ground'], catchRate: 255, minDepth: 0 },
    { id: 51, nameZh: '三地鼠', nameEn: 'Dugtrio', type: ['ground'], catchRate: 50, minDepth: 3 },
    // --- 喵喵家族 ---
    { id: 52, nameZh: '喵喵', nameEn: 'Meowth', type: ['normal'], catchRate: 255, minDepth: 0 },
    { id: 53, nameZh: '貓老大', nameEn: 'Persian', type: ['normal'], catchRate: 90, minDepth: 3 },
    // --- 可達鴨家族 ---
    { id: 54, nameZh: '可達鴨', nameEn: 'Psyduck', type: ['water'], catchRate: 190, minDepth: 0 },
    { id: 55, nameZh: '哥達鴨', nameEn: 'Golduck', type: ['water'], catchRate: 75, minDepth: 3 },
    // --- 猴怪家族 ---
    { id: 56, nameZh: '猴怪', nameEn: 'Mankey', type: ['fighting'], catchRate: 190, minDepth: 0 },
    { id: 57, nameZh: '火爆猴', nameEn: 'Primeape', type: ['fighting'], catchRate: 75, minDepth: 3 },
    // --- 卡蒂狗家族 ---
    { id: 58, nameZh: '卡蒂狗', nameEn: 'Growlithe', type: ['fire'], catchRate: 190, minDepth: 0 },
    { id: 59, nameZh: '風速狗', nameEn: 'Arcanine', type: ['fire'], catchRate: 75, minDepth: 3 },
    // --- 蚊香蝌蚪家族 ---
    { id: 60, nameZh: '蚊香蝌蚪', nameEn: 'Poliwag', type: ['water'], catchRate: 255, minDepth: 0 },
    { id: 61, nameZh: '蚊香君', nameEn: 'Poliwhirl', type: ['water'], catchRate: 120, minDepth: 3 },
    { id: 62, nameZh: '蚊香泳士', nameEn: 'Poliwrath', type: ['water', 'fighting'], catchRate: 45, minDepth: 4 },
    // --- 凱西家族 ---
    { id: 63, nameZh: '凱西', nameEn: 'Abra', type: ['psychic'], catchRate: 200, minDepth: 0 },
    { id: 64, nameZh: '勇基拉', nameEn: 'Kadabra', type: ['psychic'], catchRate: 100, minDepth: 3 },
    { id: 65, nameZh: '胡地', nameEn: 'Alakazam', type: ['psychic'], catchRate: 50, minDepth: 4 },
    // --- 腕力家族 ---
    { id: 66, nameZh: '腕力', nameEn: 'Machop', type: ['fighting'], catchRate: 180, minDepth: 0 },
    { id: 67, nameZh: '豪力', nameEn: 'Machoke', type: ['fighting'], catchRate: 90, minDepth: 3 },
    { id: 68, nameZh: '怪力', nameEn: 'Machamp', type: ['fighting'], catchRate: 45, minDepth: 4 },
    // --- 喇叭芽家族 ---
    { id: 69, nameZh: '喇叭芽', nameEn: 'Bellsprout', type: ['grass', 'poison'], catchRate: 255, minDepth: 0 },
    { id: 70, nameZh: '口呆花', nameEn: 'Weepinbell', type: ['grass', 'poison'], catchRate: 120, minDepth: 3 },
    { id: 71, nameZh: '大食花', nameEn: 'Victreebel', type: ['grass', 'poison'], catchRate: 45, minDepth: 4 },
    // --- 瑪瑙水母家族 ---
    { id: 72, nameZh: '瑪瑙水母', nameEn: 'Tentacool', type: ['water', 'poison'], catchRate: 190, minDepth: 0 },
    { id: 73, nameZh: '毒刺水母', nameEn: 'Tentacruel', type: ['water', 'poison'], catchRate: 60, minDepth: 3 },
    // --- 小拳石家族 ---
    { id: 74, nameZh: '小拳石', nameEn: 'Geodude', type: ['rock', 'ground'], catchRate: 255, minDepth: 0 },
    { id: 75, nameZh: '隆隆石', nameEn: 'Graveler', type: ['rock', 'ground'], catchRate: 120, minDepth: 3 },
    { id: 76, nameZh: '隆隆岩', nameEn: 'Golem', type: ['rock', 'ground'], catchRate: 45, minDepth: 4 },
    // --- 小火馬家族 ---
    { id: 77, nameZh: '小火馬', nameEn: 'Ponyta', type: ['fire'], catchRate: 190, minDepth: 0 },
    { id: 78, nameZh: '烈焰馬', nameEn: 'Rapidash', type: ['fire'], catchRate: 60, minDepth: 3 },
    // --- 呆呆獸家族 ---
    { id: 79, nameZh: '呆呆獸', nameEn: 'Slowpoke', type: ['water', 'psychic'], catchRate: 190, minDepth: 0 },
    { id: 80, nameZh: '呆殼獸', nameEn: 'Slowbro', type: ['water', 'psychic'], catchRate: 75, minDepth: 3 },
    // --- 小磁怪家族 ---
    { id: 81, nameZh: '小磁怪', nameEn: 'Magnemite', type: ['electric', 'steel'], catchRate: 190, minDepth: 0 },
    { id: 82, nameZh: '三合一磁怪', nameEn: 'Magneton', type: ['electric', 'steel'], catchRate: 60, minDepth: 3 },
    // --- 大蔥鴨 ---
    { id: 83, nameZh: '大蔥鴨', nameEn: "Farfetch'd", type: ['normal', 'flying'], catchRate: 45, minDepth: 2 },
    // --- 嘟嘟家族 ---
    { id: 84, nameZh: '嘟嘟', nameEn: 'Doduo', type: ['normal', 'flying'], catchRate: 190, minDepth: 0 },
    { id: 85, nameZh: '嘟嘟利', nameEn: 'Dodrio', type: ['normal', 'flying'], catchRate: 45, minDepth: 3 },
    // --- 小海獅家族 ---
    { id: 86, nameZh: '小海獅', nameEn: 'Seel', type: ['water'], catchRate: 190, minDepth: 0 },
    { id: 87, nameZh: '白海獅', nameEn: 'Dewgong', type: ['water', 'ice'], catchRate: 75, minDepth: 3 },
    // --- 臭泥家族 ---
    { id: 88, nameZh: '臭泥', nameEn: 'Grimer', type: ['poison'], catchRate: 190, minDepth: 0 },
    { id: 89, nameZh: '臭臭泥', nameEn: 'Muk', type: ['poison'], catchRate: 75, minDepth: 3 },
    // --- 大舌貝家族 ---
    { id: 90, nameZh: '大舌貝', nameEn: 'Shellder', type: ['water'], catchRate: 190, minDepth: 0 },
    { id: 91, nameZh: '刺甲貝', nameEn: 'Cloyster', type: ['water', 'ice'], catchRate: 60, minDepth: 3 },
    // --- 鬼斯家族 ---
    { id: 92, nameZh: '鬼斯', nameEn: 'Gastly', type: ['ghost', 'poison'], catchRate: 190, minDepth: 0 },
    { id: 93, nameZh: '鬼斯通', nameEn: 'Haunter', type: ['ghost', 'poison'], catchRate: 90, minDepth: 3 },
    { id: 94, nameZh: '耿鬼', nameEn: 'Gengar', type: ['ghost', 'poison'], catchRate: 45, minDepth: 4 },
    // --- 大岩蛇 ---
    { id: 95, nameZh: '大岩蛇', nameEn: 'Onix', type: ['rock', 'ground'], catchRate: 45, minDepth: 2 },
    // --- 素利普家族 ---
    { id: 96, nameZh: '素利普', nameEn: 'Drowzee', type: ['psychic'], catchRate: 190, minDepth: 0 },
    { id: 97, nameZh: '素利拍', nameEn: 'Hypno', type: ['psychic'], catchRate: 75, minDepth: 3 },
    // --- 大鉗蟹家族 ---
    { id: 98, nameZh: '大鉗蟹', nameEn: 'Krabby', type: ['water'], catchRate: 225, minDepth: 0 },
    { id: 99, nameZh: '巨鉗蟹', nameEn: 'Kingler', type: ['water'], catchRate: 60, minDepth: 3 },
    // --- 霹靂電球家族 ---
    { id: 100, nameZh: '霹靂電球', nameEn: 'Voltorb', type: ['electric'], catchRate: 190, minDepth: 0 },
    { id: 101, nameZh: '頑皮雷彈', nameEn: 'Electrode', type: ['electric'], catchRate: 60, minDepth: 3 },
    // --- 蛋蛋家族 ---
    { id: 102, nameZh: '蛋蛋', nameEn: 'Exeggcute', type: ['grass', 'psychic'], catchRate: 90, minDepth: 0 },
    { id: 103, nameZh: '椰蛋樹', nameEn: 'Exeggutor', type: ['grass', 'psychic'], catchRate: 45, minDepth: 3 },
    // --- 卡拉卡拉家族 ---
    { id: 104, nameZh: '卡拉卡拉', nameEn: 'Cubone', type: ['ground'], catchRate: 190, minDepth: 0 },
    { id: 105, nameZh: '嘎啦嘎啦', nameEn: 'Marowak', type: ['ground'], catchRate: 75, minDepth: 3 },
    // --- 飛腿郎/快拳郎/大舌頭 ---
    { id: 106, nameZh: '飛腿郎', nameEn: 'Hitmonlee', type: ['fighting'], catchRate: 45, minDepth: 3 },
    { id: 107, nameZh: '快拳郎', nameEn: 'Hitmonchan', type: ['fighting'], catchRate: 45, minDepth: 3 },
    { id: 108, nameZh: '大舌頭', nameEn: 'Lickitung', type: ['normal'], catchRate: 45, minDepth: 2 },
    // --- 瓦斯彈家族 ---
    { id: 109, nameZh: '瓦斯彈', nameEn: 'Koffing', type: ['poison'], catchRate: 190, minDepth: 0 },
    { id: 110, nameZh: '雙彈瓦斯', nameEn: 'Weezing', type: ['poison'], catchRate: 60, minDepth: 3 },
    // --- 獨角犀牛家族 ---
    { id: 111, nameZh: '獨角犀牛', nameEn: 'Rhyhorn', type: ['ground', 'rock'], catchRate: 120, minDepth: 0 },
    { id: 112, nameZh: '鑽角犀獸', nameEn: 'Rhydon', type: ['ground', 'rock'], catchRate: 60, minDepth: 3 },
    // --- 吉利蛋/蔓藤怪/袋獸 ---
    { id: 113, nameZh: '吉利蛋', nameEn: 'Chansey', type: ['normal'], catchRate: 30, minDepth: 3 },
    { id: 114, nameZh: '蔓藤怪', nameEn: 'Tangela', type: ['grass'], catchRate: 45, minDepth: 2 },
    { id: 115, nameZh: '袋獸', nameEn: 'Kangaskhan', type: ['normal'], catchRate: 45, minDepth: 3 },
    // --- 墨海馬家族 ---
    { id: 116, nameZh: '墨海馬', nameEn: 'Horsea', type: ['water'], catchRate: 225, minDepth: 0 },
    { id: 117, nameZh: '海刺龍', nameEn: 'Seadra', type: ['water'], catchRate: 75, minDepth: 3 },
    // --- 角金魚家族 ---
    { id: 118, nameZh: '角金魚', nameEn: 'Goldeen', type: ['water'], catchRate: 225, minDepth: 0 },
    { id: 119, nameZh: '金魚王', nameEn: 'Seaking', type: ['water'], catchRate: 60, minDepth: 3 },
    // --- 海星星家族 ---
    { id: 120, nameZh: '海星星', nameEn: 'Staryu', type: ['water'], catchRate: 225, minDepth: 0 },
    { id: 121, nameZh: '寶石海星', nameEn: 'Starmie', type: ['water', 'psychic'], catchRate: 60, minDepth: 3 },
    // --- 吸盤魔偶/飛天螳螂/迷唇姐/電擊獸/鴨嘴火獸 ---
    { id: 122, nameZh: '吸盤魔偶', nameEn: 'Mr. Mime', type: ['psychic', 'fairy'], catchRate: 45, minDepth: 3 },
    { id: 123, nameZh: '飛天螳螂', nameEn: 'Scyther', type: ['bug', 'flying'], catchRate: 45, minDepth: 3 },
    { id: 124, nameZh: '迷唇姐', nameEn: 'Jynx', type: ['ice', 'psychic'], catchRate: 45, minDepth: 3 },
    { id: 125, nameZh: '電擊獸', nameEn: 'Electabuzz', type: ['electric'], catchRate: 45, minDepth: 3 },
    { id: 126, nameZh: '鴨嘴火獸', nameEn: 'Magmar', type: ['fire'], catchRate: 45, minDepth: 3 },
    { id: 127, nameZh: '凱羅斯', nameEn: 'Pinsir', type: ['bug'], catchRate: 45, minDepth: 3 },
    { id: 128, nameZh: '肯泰羅', nameEn: 'Tauros', type: ['normal'], catchRate: 45, minDepth: 3 },
    // --- 鯉魚王家族 ---
    { id: 129, nameZh: '鯉魚王', nameEn: 'Magikarp', type: ['water'], catchRate: 255, minDepth: 0 },
    { id: 130, nameZh: '暴鯉龍', nameEn: 'Gyarados', type: ['water', 'flying'], catchRate: 45, minDepth: 4 },
    // --- 拉普拉斯/百變怪/伊布 ---
    { id: 131, nameZh: '拉普拉斯', nameEn: 'Lapras', type: ['water', 'ice'], catchRate: 45, minDepth: 3 },
    { id: 132, nameZh: '百變怪', nameEn: 'Ditto', type: ['normal'], catchRate: 35, minDepth: 2 },
    { id: 133, nameZh: '伊布', nameEn: 'Eevee', type: ['normal'], catchRate: 45, minDepth: 0 },
    // --- 伊布進化 ---
    { id: 134, nameZh: '水伊布', nameEn: 'Vaporeon', type: ['water'], catchRate: 45, minDepth: 3 },
    { id: 135, nameZh: '雷伊布', nameEn: 'Jolteon', type: ['electric'], catchRate: 45, minDepth: 3 },
    { id: 136, nameZh: '火伊布', nameEn: 'Flareon', type: ['fire'], catchRate: 45, minDepth: 3 },
    // --- 3D龍/菊石獸/化石盔/化石翼龍 ---
    { id: 137, nameZh: '多邊獸', nameEn: 'Porygon', type: ['normal'], catchRate: 45, minDepth: 3 },
    { id: 138, nameZh: '菊石獸', nameEn: 'Omanyte', type: ['rock', 'water'], catchRate: 45, minDepth: 2 },
    { id: 139, nameZh: '多刺菊石獸', nameEn: 'Omastar', type: ['rock', 'water'], catchRate: 45, minDepth: 4 },
    { id: 140, nameZh: '化石盔', nameEn: 'Kabuto', type: ['rock', 'water'], catchRate: 45, minDepth: 2 },
    { id: 141, nameZh: '鐮刀盔', nameEn: 'Kabutops', type: ['rock', 'water'], catchRate: 45, minDepth: 4 },
    { id: 142, nameZh: '化石翼龍', nameEn: 'Aerodactyl', type: ['rock', 'flying'], catchRate: 45, minDepth: 4 },
    // --- 卡比獸 ---
    { id: 143, nameZh: '卡比獸', nameEn: 'Snorlax', type: ['normal'], catchRate: 25, minDepth: 4 },
    // --- 傳說三鳥 ---
    { id: 144, nameZh: '急凍鳥', nameEn: 'Articuno', type: ['ice', 'flying'], catchRate: 3, minDepth: 5 },
    { id: 145, nameZh: '閃電鳥', nameEn: 'Zapdos', type: ['electric', 'flying'], catchRate: 3, minDepth: 5 },
    { id: 146, nameZh: '火焰鳥', nameEn: 'Moltres', type: ['fire', 'flying'], catchRate: 3, minDepth: 5 },
    // --- 迷你龍家族 ---
    { id: 147, nameZh: '迷你龍', nameEn: 'Dratini', type: ['dragon'], catchRate: 45, minDepth: 2 },
    { id: 148, nameZh: '哈克龍', nameEn: 'Dragonair', type: ['dragon'], catchRate: 45, minDepth: 3 },
    { id: 149, nameZh: '快龍', nameEn: 'Dragonite', type: ['dragon', 'flying'], catchRate: 45, minDepth: 5 },
    // --- 超夢/夢幻 ---
    { id: 150, nameZh: '超夢', nameEn: 'Mewtwo', type: ['psychic'], catchRate: 3, minDepth: 6 }, // 極難
    { id: 151, nameZh: '夢幻', nameEn: 'Mew', type: ['psychic'], catchRate: 45, minDepth: 6 }  // 極難
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
export const TOXIC_POOL_IDS = [19, 41, 88, 109, 129]; // 小拉達, 超音蝠, 臭泥, 瓦斯彈, 鯉魚王