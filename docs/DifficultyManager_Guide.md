# DifficultyManager 操作手冊

`DifficultyManager` 是一個單例 (Singleton) 類別，負責集中管理遊戲的動態難度調整 (DDA) 邏輯與遭遇歷史記錄。

## 1. 初始化與取得實例

在使用任何功能之前，必須先在擴充功能啟動時進行初始化。

### 初始化 (Extension Activation)

在 `src/extension.ts` 的 `activate` 函式中：

```typescript
import { DifficultyManager } from './manager/DifficultyManager';

export function activate(context: vscode.ExtensionContext) {
    // ... 其他初始化
    
    // 初始化 DifficultyManager
    const difficultyManager = DifficultyManager.initialize(context);
    
    // ...
}
```

### 取得實例 (Usage)

在其他 Manager 或 Handler 中需要使用時：

```typescript
import { DifficultyManager } from '../manager/DifficultyManager';

const difficultyManager = DifficultyManager.getInstance();
```

---

## 2. 核心功能

### A. 取得難度修正 (DDA)

這是最核心的功能，用於根據玩家表現動態調整遊戲參數。

```typescript
// 1. 準備當前的表現指標 (可選，若不提供則使用預設值)
const metrics: DifficultyMetrics = {
    recentWinRate: 0.6,           // 最近勝率
    avgRemainingHpPercent: 0.4,   // 平均剩餘血量
    catchSuccessRate: 0.8,        // 捕獲率
    faintRate: 0.1,               // 瀕死率
    avgEncounterRate: 150,        // 平均遭遇率 (運氣指標)
    weightedCatchPerformance: 0.7 // 加權捕獲表現
};

// 2. 取得修正值
const modifiers = difficultyManager.getModifiers(metrics);

// 3. 應用修正值
console.log(modifiers.levelOffset);             // 等級偏移 (例如: +2)
console.log(modifiers.encounterRateMultiplier); // 遭遇率倍率 (例如: 0.8)
console.log(modifiers.catchBonus);              // 捕獲率加成 (例如: -5)
```

**應用場景：**
*   **生成野生寶可夢時**：`baseLevel + modifiers.levelOffset`
*   **計算捕獲率時**：`finalCatchRate + modifiers.catchBonus`
*   **計算經驗值時**：`baseExp * modifiers.expMultiplier`

### B. 遭遇推薦 (Encounter Recommendation)

根據玩家的歷史表現，推薦下一次遭遇的寶可夢稀有度範圍。

```typescript
const { min, max } = difficultyManager.recommendNextEncounterRange();

// min: 最低遭遇率 (例如 50)
// max: 最高遭遇率 (例如 200)

// 在 EncounterHandler 中使用：
const candidates = allPokemon.filter(p => 
    p.encounterRate >= min && p.encounterRate <= max
);
```

### C. 記錄遭遇 (Recording Encounters)

為了讓 DDA 系統能學習，必須在每次遭遇結束後記錄結果。

```typescript
difficultyManager.recordEncounter({
    pokemonId: 25,
    pokemonName: 'pikachu',
    pokemonCatchRate: 190,      // 捕獲難度
    pokemonEncounterRate: 50,   // 遭遇稀有度
    biomeType: 'forest',
    depth: 1,
    wasAttempted: true,         // 是否丟球
    wasCaught: true,            // 是否抓到
    catchAttempts: 2,           // 用了幾顆球
    battleResult: 'win',        // 戰鬥結果
    timestamp: Date.now()
});
```

### D. 設定難度等級 (Manual Difficulty Setting)

允許玩家手動調整基礎難度。

```typescript
// 設定為等級 2 (Great Ball ★★)
await difficultyManager.setDifficultyLevel(2);

// 取得當前等級資訊
const config = difficultyManager.getLevelConfig(2);
console.log(config.name); // "Great Ball ★★"
```

### E. 取得 AI 設定

用於戰鬥系統中設定敵人的 AI 行為。

```typescript
const aiLevel = difficultyManager.getEnemyAILevel(); 
// 回傳: 20 (簡單), 60 (普通), 95 (困難)

const moveSetQuality = difficultyManager.getMoveSetQuality();
// 回傳: 'basic', 'balanced', 'competitive'
```

---

## 3. 資料結構說明

### DifficultyModifiers (難度修正值)

| 屬性 | 範圍 | 說明 |
|------|------|------|
| `levelOffset` | -5 ~ +5 | 敵人等級偏移量。正值變難，負值變簡單。 |
| `encounterRateMultiplier` | 0.5 ~ 2.0 | 遭遇率權重倍率。`>1` 容易遇到常見怪 (簡單)，`<1` 容易遇到稀有怪 (困難)。 |
| `catchBonus` | -25 ~ +30 | 捕獲率加成 (百分比)。 |
| `expMultiplier` | 0.8 ~ 1.5 | 經驗值倍率。 |
| `minEncounterRate` | 1 ~ 255 | 遭遇過濾門檻。只會遇到 `encounterRate >= min` 的怪。 |
| `maxEncounterRate` | 1 ~ 255 | 遭遇過濾門檻。只會遇到 `encounterRate <= max` 的怪。 |

### DifficultyMetrics (表現指標)

| 屬性 | 範圍 | 說明 |
|------|------|------|
| `recentWinRate` | 0.0 ~ 1.0 | 最近 10 場戰鬥勝率。 |
| `avgRemainingHpPercent` | 0.0 ~ 1.0 | 戰鬥結束後的平均剩餘血量。 |
| `avgEncounterRate` | 1 ~ 255 | 平均遭遇率。數值越高代表一直遇到常見怪 (運氣差/體驗單調)。 |
| `weightedCatchPerformance` | 0.0 ~ 1.0 | 加權捕獲表現。抓到難抓的怪 (低 catchRate) 分數較高。 |

---

## 4. 難度等級詳細說明與範例

以下列出 9 個難度等級的詳細設定、數值影響與實戰範例。

### 🟢 基礎階級 (Poke Ball Tier)
**特色**：AI 較為單純，配招基礎，適合新手或想輕鬆體驗劇情的玩家。

#### Level 1: Poke Ball ★ (新手入門)
*   **總 DDA 偏移**: -30 (極低)
*   **AI 智能**: 20 (低) - 隨機出招，偶爾使用輔助招。
*   **配招品質**: Basic (基礎) - 只有升級學到的基本招式。
*   **範例情境**:
    > 玩家 (Lv.10 小火龍) 遭遇野生綠毛蟲。
    > *   **等級**: 綠毛蟲等級會被壓低 (約 Lv.7)。
    > *   **戰鬥**: 綠毛蟲只會用「撞擊」或「吐絲」，不會針對屬性弱點。
    > *   **捕獲**: 捕獲率大幅提升 (+30%)，丟球幾乎必中。

#### Level 2: Poke Ball ★★ (休閒玩家)
*   **總 DDA 偏移**: -20 (低)
*   **AI 智能**: 20 (低)
*   **配招品質**: Basic
*   **範例情境**:
    > 玩家 (Lv.20 皮卡丘) 遭遇野生小拳石。
    > *   **等級**: 小拳石等級略低 (約 Lv.18)。
    > *   **戰鬥**: 雖然屬性不利，但小拳石可能一直用「變圓」而不攻擊，給玩家機會。

#### Level 3: Poke Ball ★★★ (進階休閒)
*   **總 DDA 偏移**: -10 (稍低)
*   **AI 智能**: 20 (低)
*   **配招品質**: Basic
*   **範例情境**:
    > 玩家 (Lv.30 妙蛙草) 遭遇野生拉達。
    > *   **等級**: 拉達等級與玩家相近 (約 Lv.29)。
    > *   **戰鬥**: 拉達會正常攻擊，但不會使用強力連招 (如：必殺門牙)。

---

### 🔵 標準階級 (Great Ball Tier)
**特色**：AI 懂得屬性相剋，配招平衡，適合大多數 RPG 玩家。

#### Level 4: Great Ball ★ (標準體驗 - 輕量)
*   **總 DDA 偏移**: -10 (稍低)
*   **AI 智能**: 60 (中) - 懂得選擇效果絕佳 (Super Effective) 的招式。
*   **配招品質**: Balanced (平衡) - 包含一些強力招式或屬性修正招 (STAB)。
*   **範例情境**:
    > 玩家 (Lv.40 噴火龍) 遭遇野生水箭龜。
    > *   **等級**: 水箭龜等級略低 (約 Lv.39)。
    > *   **戰鬥**: 水箭龜會優先使用「水槍」或「水柏」攻擊噴火龍 (效果絕佳)。

#### Level 5: Great Ball ★★ (標準體驗 - 預設)
*   **總 DDA 偏移**: 0 (標準)
*   **AI 智能**: 60 (中)
*   **配招品質**: Balanced
*   **範例情境**:
    > 玩家 (Lv.50 耿鬼) 遭遇野生胡地。
    > *   **等級**: 胡地等級與玩家持平 (Lv.50)。
    > *   **戰鬥**: 雙方互有往來，胡地會使用「精神強念」造成可觀傷害，是一場勢均力敵的戰鬥。

#### Level 6: Great Ball ★★★ (挑戰者)
*   **總 DDA 偏移**: +10 (稍高)
*   **AI 智能**: 60 (中)
*   **配招品質**: Balanced
*   **範例情境**:
    > 玩家 (Lv.55 快龍) 遭遇野生拉普拉斯。
    > *   **等級**: 拉普拉斯等級略高 (約 Lv.56)。
    > *   **戰鬥**: 拉普拉斯血量厚，且會使用冰系招式反制快龍，玩家若不換角可能會輸。

---

### 🟡 困難階級 (Ultra Ball Tier)
**特色**：AI 極高，會預判、集火、使用戰術連招，配招為競技取向。

#### Level 7: Ultra Ball ★ (戰術大師)
*   **總 DDA 偏移**: +10 (稍高)
*   **AI 智能**: 95 (高) - 會預判玩家換角，使用異常狀態，計算斬殺線。
*   **配招品質**: Competitive (競技) - 完美配招 (如：地震/劍舞/替身)。
*   **範例情境**:
    > 玩家 (Lv.60 巨鉗螳螂) 遭遇野生火爆獸。
    > *   **等級**: 火爆獸等級略高 (約 Lv.61)。
    > *   **戰鬥**: 火爆獸可能會先用「鬼火」降低螳螂攻擊，再用火系大招一擊必殺。

#### Level 8: Ultra Ball ★★ (硬核玩家)
*   **總 DDA 偏移**: +20 (高)
*   **AI 智能**: 95 (高)
*   **配招品質**: Competitive
*   **範例情境**:
    > 玩家 (Lv.70 班基拉斯) 遭遇野生路卡利歐。
    > *   **等級**: 路卡利歐等級明顯較高 (約 Lv.72)。
    > *   **戰鬥**: 路卡利歐配有「近身戰」，且速度可能比玩家快，玩家必須計算傷害量與先制度才能獲勝。

#### Level 9: Ultra Ball ★★★ (極限挑戰)
*   **總 DDA 偏移**: +30 (極高)
*   **AI 智能**: 95 (高)
*   **配招品質**: Competitive
*   **範例情境**:
    > 玩家 (Lv.100 滿等隊伍) 挑戰四大天王。
    > *   **等級**: 敵人等級可能突破上限 (如 Lv.103) 或數值有額外加成。
    > *   **戰鬥**: 敵人會使用道具 (全滿藥)，會聯防 (換角擋招)，且招式必定是針對玩家隊伍弱點配置。捕獲率極低，遭遇率極低 (只出稀有怪)。

