# 動態難度調整 (DDA) 與 Flow Theory 應用指南

## 📋 目錄

1. [理論基礎](#理論基礎)
2. [專案現況分析](#專案現況分析)
3. [DDA 實作建議](#dda-實作建議)
4. [Flow Theory 設計方針](#flow-theory-設計方針)
5. [具體實作方案](#具體實作方案)
6. [監控與調整機制](#監控與調整機制)

---

## 理論基礎

### 🎯 什麼是 Flow Theory（心流理論）

Flow Theory 由心理學家 Mihaly Csikszentmihalyi 提出，描述人在從事活動時進入的最佳體驗狀態。

```
        高 ┃           焦慮區
           ┃        ╱ (Anxiety)
        挑 ┃      ╱
        戰 ┃    ╱   ★ 心流區
        難 ┃  ╱     (Flow Zone)
        度 ┃╱
           ┃ 無聊區
        低 ┃ (Boredom)
           ┗━━━━━━━━━━━━━━━━━━
             低    技能等級    高
```

**心流區特徵：**
- 挑戰與技能相匹配
- 玩家感到專注且投入
- 時間感知扭曲（感覺時間過得很快）
- 產生內在滿足感

### 🔧 什麼是動態難度調整 (DDA)

Dynamic Difficulty Adjustment 是一種遊戲設計技術，透過即時監控玩家表現，自動調整遊戲難度，讓玩家持續處於心流區。

**DDA 核心原則：**
| 玩家狀態 | 表現指標 | DDA 反應 |
|---------|---------|---------|
| 焦慮 (太難) | 連續失敗、HP 經常低迷 | 降低難度 |
| 心流 (剛好) | 勝率適中、有挑戰感 | 維持現狀 |
| 無聊 (太簡單) | 連勝、無傷擊敗 | 提升難度 |

---

## 專案現況分析

### 📊 PokeCodec 現有難度機制

經過分析您的專案，目前已有以下影響難度的系統：

#### 1. **深度系統 (Depth System)**
```typescript
// EncounterHandler.ts
const { depth, fileName, folderPath } = getfilePattern(filePath);

// 深度決定遇到的寶可夢種類
// 深度 0-2: 基礎寶可夢 (綠毛蟲, 波波)
// 深度 3-4: 進化型寶可夢 (巴大蝶, 比比鳥)  
// 深度 5:   傳說寶可夢 (三神鳥)
// 深度 6+:  深淵區 (臭泥, 鯉魚王)
```

#### 2. **遊玩時間加權 (Playtime Bonus)**
```typescript
// EncounterHandler.ts - pickWeightedPokemon
const maxBonusWeight = 10; 
const progress = Math.min(1, playingTime / (90 * 24 * 60 * 60 * 1000)); // 90天滿
const bonusWeight = maxBonusWeight * progress;

// CreatePokemonHandler.ts
const timeBonus = Math.floor(playingTime / (2 * 24 * 60 * 60 * 1000)); // 每2天+1級
```

#### 3. **生態系統 (Biome System)**
```typescript
// KantoPokemonCatchRate.ts
export const BIOME_GROUPS = {
    [BiomeType.Grassland]: ['grass', 'bug', 'normal', 'poison', 'flying'],
    [BiomeType.WaterBeach]: ['water', 'ice', 'psychic'],
    [BiomeType.UrbanPowerPlant]: ['electric', 'steel', 'normal', 'fighting'],
    // ...
};
```

#### 4. **戰鬥系統**
- 屬性相剋 (Type Effectiveness)
- STAB 加成
- 爆擊機制
- 閃避計算

### ⚠️ 現有系統的限制

| 問題 | 說明 |
|------|------|
| 缺乏即時反饋 | 難度主要由靜態因素決定（深度、時間），不會根據玩家表現調整 |
| 無挫折保護 | 玩家連續失敗時，沒有機制緩解難度 |
| 線性成長曲線 | 難度隨時間增長，但未考慮個別玩家技能差異 |
| 成就系統未連動 | Achievement 數據未被用於調整遊戲平衡 |

---

## DDA 實作建議

### 🏗️ 架構設計

建議新增 `DifficultyManager` 類別來管理動態難度：

```
┌─────────────────────────────────────────────────────────────┐
│                     DifficultyManager                        │
├─────────────────────────────────────────────────────────────┤
│  輸入資料 (Inputs)                                           │
│  ├── AchievementManager.getStatistics()                     │
│  ├── GameStateManager.getBattleHistory()                    │
│  ├── UserDaoManager.getPlayTime()                           │
│  └── EncounterHistory (遭遇歷史記錄)                         │
├─────────────────────────────────────────────────────────────┤
│  核心指標 (Metrics)                                          │
│  ├── 最近 N 場勝率 (Win Rate)                                │
│  ├── 平均剩餘 HP% (Avg HP After Battle)                     │
│  ├── 捕獲成功率 (Catch Success Rate)                         │
│  ├── 寶可夢淘汰率 (Faint Rate)                               │
│  ├── 遭遇運氣指數 (Encounter Luck Index) ★ 修改              │
│  └── 加權捕獲表現 (Weighted Catch Performance)               │
├─────────────────────────────────────────────────────────────┤
│  輸出調整 (Outputs)                                          │
│  ├── 敵方等級修正 (Level Modifier)                           │
│  ├── 遭遇率權重調整 (Encounter Rate Modifier) ★ 修改         │
│  ├── 捕獲加成 (Catch Bonus)                                  │
│  ├── 遭遇 EncounterRate 門檻 (Encounter Rate Threshold) ★ 修改│
│  └── 戰鬥獎勵倍率 (Reward Multiplier)                        │
└─────────────────────────────────────────────────────────────┘
```

### 📈 難度指數計算

```typescript
// 建議新增: src/manager/DifficultyManager.ts

interface EncounterRecord {
    pokemonId: number;
    pokemonCatchRate: number;     // 捕獲難度 (3-255)
    pokemonEncounterRate: number; // 遭遇稀有度 (1-255) ★ 新增
    wasAttempted: boolean;        // 是否嘗試捕獲
    wasCaught: boolean;           // 是否成功捕獲
    catchAttempts: number;        // 使用了幾顆球
    timestamp: number;
}

interface DifficultyMetrics {
    recentWinRate: number;              // 0.0 - 1.0
    avgRemainingHpPercent: number;      // 0.0 - 1.0
    catchSuccessRate: number;           // 0.0 - 1.0 (單純成功率)
    faintRate: number;                  // 0.0 - 1.0
    avgEncounterRate: number;           // 最近遭遇的平均遭遇率 (1-255) ★ 修改
    weightedCatchPerformance: number;   // 加權捕獲表現 (考慮捕獲難度)
}

interface DifficultyModifiers {
    levelOffset: number;              // -5 to +5
    encounterRateMultiplier: number;  // 0.5 to 2.0 ★ 修改
    catchBonus: number;               // 0 to 50
    expMultiplier: number;            // 0.8 to 1.5
    minEncounterRate: number;         // 最低遭遇率門檻 (1-255) ★ 修改
    maxEncounterRate: number;         // 最高遭遇率門檻 (1-255) ★ 修改
}

// 計算加權捕獲表現：考慮寶可夢本身的 catchRate (技術指標)
// catchRate 越低的寶可夢抓到，表現分數越高
function calculateWeightedCatchPerformance(encounters: EncounterRecord[]): number {
    const attemptedEncounters = encounters.filter(e => e.wasAttempted);
    if (attemptedEncounters.length === 0) return 0.5;
    
    let totalWeight = 0;
    let weightedSuccess = 0;
    
    for (const encounter of attemptedEncounters) {
        // 難度權重：catchRate 越低，權重越高
        // catchRate 3 (傳說) -> 權重 ~85
        const difficultyWeight = 255 / encounter.pokemonCatchRate;
        
        totalWeight += difficultyWeight;
        if (encounter.wasCaught) {
            weightedSuccess += difficultyWeight;
        }
    }
    
    return weightedSuccess / totalWeight;
}

// 計算遭遇運氣指數 (運氣指標)
function calculateEncounterLuckIndex(encounters: EncounterRecord[]): number {
    if (encounters.length === 0) return 50;
    
    const recentEncounters = encounters.slice(-20);
    // 計算平均遭遇率 (encounterRate)
    const avgRate = recentEncounters.reduce((sum, e) => sum + e.pokemonEncounterRate, 0) 
                         / recentEncounters.length;
    
    // encounterRate 200 (常見) -> 運氣指數 0 (很普通)
    // encounterRate 100 (中等) -> 運氣指數 50
    // encounterRate 1   (傳說) -> 運氣指數 100 (超幸運)
    return Math.round((1 - avgRate / 200) * 100);
}

function calculateDifficultyIndex(metrics: DifficultyMetrics): number {
    // 綜合難度指數 (0 = 太難, 50 = 剛好, 100 = 太簡單)
    const winScore = metrics.recentWinRate * 25;
    const hpScore = metrics.avgRemainingHpPercent * 20;
    const survivalScore = (1 - metrics.faintRate) * 15;
    
    // 加權捕獲表現 (技術分數)
    const weightedCatchScore = metrics.weightedCatchPerformance * 25;
    
    // ★ 修改：遭遇運氣補償
    // 如果最近一直遇到常見怪 (avgEncounterRate 高)，運氣分數低，總分會降低 -> 系統會判定為"太難/無聊"而進行調整
    // 這裡邏輯反轉：一直遇到爛怪 = 體驗差 = 需要補償
    const luckScore = (1 - metrics.avgEncounterRate / 255) * 15;
    
    return winScore + hpScore + survivalScore + weightedCatchScore + luckScore;
}
```

### 🎚️ 調整閾值設定

```typescript
const FLOW_THRESHOLDS = {
    ANXIETY_ZONE: 30,      // 指數 < 30: 太難，需要降低難度
    FLOW_LOWER: 40,        // 指數 40-60: 心流區下界
    FLOW_UPPER: 60,        // 指數 40-60: 心流區上界  
    BOREDOM_ZONE: 70,      // 指數 > 70: 太簡單，需要提高難度
};

// EncounterRate 參考值 (遭遇稀有度)
const ENCOUNTER_RATE_TIERS = {
    LEGENDARY: 1,      // 傳說寶可夢
    VERY_RARE: 20,     // 極稀有 (伊布、迷你龍)
    RARE: 50,          // 稀有 (皮卡丘)
    UNCOMMON: 100,     // 不常見
    COMMON: 200,       // 常見 (波波)
};

function getModifiers(difficultyIndex: number): DifficultyModifiers {
    if (difficultyIndex < FLOW_THRESHOLDS.ANXIETY_ZONE) {
        // 焦慮區：大幅降低難度
        return {
            levelOffset: -3,
            encounterRateMultiplier: 2.0,   // 大幅增加遇到常見怪的機率 (降低稀有怪權重)
            catchBonus: 30,                 // 捕獲加成
            expMultiplier: 1.3,             // 經驗值加成
            minEncounterRate: 100,          // ★ 只遇到 encounterRate >= 100 的常見寶可夢
            maxEncounterRate: 255,
        };
    } else if (difficultyIndex < FLOW_THRESHOLDS.FLOW_LOWER) {
        // 接近心流區下界：小幅降低
        return {
            levelOffset: -1,
            encounterRateMultiplier: 1.5,
            catchBonus: 15,
            expMultiplier: 1.15,
            minEncounterRate: 50,           // ★ encounterRate >= 50
            maxEncounterRate: 255,
        };
    } else if (difficultyIndex <= FLOW_THRESHOLDS.FLOW_UPPER) {
        // 心流區：維持現狀，全範圍遭遇
        return {
            levelOffset: 0,
            encounterRateMultiplier: 1.0,
            catchBonus: 0,
            expMultiplier: 1.0,
            minEncounterRate: 1,            // ★ 完整範圍
            maxEncounterRate: 255,
        };
    } else if (difficultyIndex < FLOW_THRESHOLDS.BOREDOM_ZONE) {
        // 接近無聊區：小幅提高，排除太簡單的
        return {
            levelOffset: 1,
            encounterRateMultiplier: 0.8,   // 降低常見怪權重 (相對提升稀有怪)
            catchBonus: -10,
            expMultiplier: 0.95,
            minEncounterRate: 1,
            maxEncounterRate: 180,          // ★ 排除 encounterRate > 180 的極常見寶可夢
        };
    } else {
        // 無聊區：大幅提高難度，只遇到稀有的
        return {
            levelOffset: 3,
            encounterRateMultiplier: 0.5,   // 大幅降低常見怪權重
            catchBonus: -25,
            expMultiplier: 0.85,
            minEncounterRate: 1,
            maxEncounterRate: 100,          // ★ 只遇到 encounterRate <= 100 的稀有寶可夢
        };
    }
}
```

### 📊 CatchRate 與 EncounterRate 對照表

| 類型 | CatchRate (捕獲難度) | EncounterRate (遭遇機率) | 代表寶可夢 |
|------|-------------------|------------------------|-----------|
| 傳說 | 3 (極難) | 1 (極罕見) | 超夢、三神鳥 |
| 極稀有 | 25-45 (困難) | 1-30 (極稀有) | 卡比獸、伊布、迷你龍 |
| 稀有 | 45-90 (中等) | 30-80 (稀有) | 皮卡丘、御三家 |
| 不常見 | 90-150 (簡單) | 80-150 (不常見) | 進化型寶可夢 |
| 常見 | 150-255 (極易) | 150-255 (常見) | 波波、綠毛蟲 |

### 🎛️ 難度系統：球種與星級 (Ball & Star System)

為了解決單一難度選項的侷限，建議採用 **「球種 (Ball Type)」** 決定戰術深度，並搭配 **「星級 (Star Rating)」** 決定數值強度。

#### 1. 雙維度難度矩陣

*   **球種 (Ball Type)**：決定敵人的 **AI 智能** 與 **配招品質**。
*   **星級 (Star Rating)**：決定 **DDA 基準偏移** (影響等級、遭遇率、捕獲率)。

| 球種 (戰術深度) | 星級 | 強度 | DDA 偏移 | AI 智商 | 配招品質 | 體驗描述 |
|:---:|:---:|:---:|:---:|:---:|:---:|:---|
| **精靈球**<br>(Poke Ball)<br>基礎戰術 | ★ | 低 | -30 | 20 (低) | Basic | 新手入門，隨便打都能贏 |
| | ★★ | 中 | -20 | 20 (低) | Basic | 輕鬆休閒，享受劇情 |
| | ★★★ | 高 | -10 | 20 (低) | Basic | 稍微認真的休閒玩家 |
| **超級球**<br>(Great Ball)<br>標準戰術 | ★ | 低 | -10 | 60 (中) | Balanced | 剛接觸 RPG 的玩家 |
| | ★★ | 中 | 0 | 60 (中) | Balanced | **標準體驗 (預設)** |
| | ★★★ | 高 | +10 | 60 (中) | Balanced | 喜歡一點挑戰的玩家 |
| **高級球**<br>(Ultra Ball)<br>極限戰術 | ★ | 低 | +10 | 95 (高) | Competitive | 戰術大師，但不想數值崩壞 |
| | ★★ | 中 | +20 | 95 (高) | Competitive | 硬核玩家，追求極限 |
| | ★★★ | 高 | +30 | 95 (高) | Competitive | 受苦遊戲愛好者 (Dark Souls) |

#### 2. 實作邏輯整合

修改 `DifficultyManager`，支援雙維度設定。

```typescript
enum DifficultyBall {
    PokeBall = 'poke_ball',     // 基礎 (Easy AI)
    GreatBall = 'great_ball',   // 標準 (Normal AI)
    UltraBall = 'ultra_ball'    // 極限 (Hard AI)
}

enum DifficultyStar {
    One = 1,    // 低強度
    Two = 2,    // 中強度
    Three = 3   // 高強度
}

class DifficultyManager {
    private ballSetting: DifficultyBall = DifficultyBall.GreatBall;
    private starSetting: DifficultyStar = DifficultyStar.Two;

    public setDifficulty(ball: DifficultyBall, star: DifficultyStar) {
        this.ballSetting = ball;
        this.starSetting = star;
    }

    // 1. 取得 DDA 基準偏移 (由球種與星級共同決定)
    public getBaseOffset(): number {
        let base = 0;
        // 球種基準
        switch (this.ballSetting) {
            case DifficultyBall.PokeBall: base = -20; break;
            case DifficultyBall.GreatBall: base = 0; break;
            case DifficultyBall.UltraBall: base = +20; break;
        }
        // 星級微調
        switch (this.starSetting) {
            case DifficultyStar.One: base -= 10; break;
            case DifficultyStar.Two: base += 0; break;
            case DifficultyStar.Three: base += 10; break;
        }
        return base;
    }

    // 2. 取得敵人 AI 等級 (只由球種決定)
    public getEnemyAILevel(): number {
        switch (this.ballSetting) {
            case DifficultyBall.PokeBall: return 20;   // 隨機/單純
            case DifficultyBall.GreatBall: return 60;  // 標準/屬性相剋
            case DifficultyBall.UltraBall: return 95;  // 預判/集火/斬殺
        }
    }

    // 3. 取得敵人配招品質 (只由球種決定)
    public getMoveSetQuality(): 'basic' | 'balanced' | 'competitive' {
        switch (this.ballSetting) {
            case DifficultyBall.PokeBall: return 'basic';
            case DifficultyBall.GreatBall: return 'balanced';
            case DifficultyBall.UltraBall: return 'competitive';
        }
    }

    // 取得最終難度指數
    public getFinalDifficultyIndex(metrics: DifficultyMetrics): number {
        const calculatedIndex = this.calculateDifficultyIndex(metrics);
        const baseOffset = this.getBaseOffset();
        return Math.min(100, Math.max(0, calculatedIndex + baseOffset));
    }
}
```

---

## Flow Theory 設計方針

### 🌊 心流維持策略

#### 1. **漸進式挑戰 (Progressive Challenge)**

```typescript
// 根據隊伍平均等級動態調整遇到的野生寶可夢等級
function calculateWildPokemonLevel(
    partyAvgLevel: number, 
    baseDepthLevel: number,
    difficultyModifiers: DifficultyModifiers
): number {
    const variance = gaussianRandom(0, 2); // 隨機浮動
    const targetLevel = partyAvgLevel * 0.9 + baseDepthLevel * 0.1;
    
    return Math.round(
        targetLevel + difficultyModifiers.levelOffset + variance
    );
}
```

#### 2. **即時回饋循環 (Feedback Loop)**

```
遊戲事件 ──► 數據收集 ──► 分析指標 ──► 調整參數
    ▲                                      │
    └──────────────────────────────────────┘
```

**建議追蹤的事件：**
| 事件類型 | 追蹤資料 | 用途 |
|---------|---------|------|
| 戰鬥結束 | 勝/敗、剩餘HP、回合數 | 戰鬥難度評估 |
| 捕獲嘗試 | 成功/失敗、使用球種 | 捕獲難度評估 |
| 寶可夢倒下 | 哪隻倒下、敵方資訊 | 隊伍強度評估 |
| 物品使用 | 使用頻率、使用時機 | 資源壓力評估 |

#### 3. **情緒曲線設計 (Emotional Curve)**

心流體驗需要有節奏的高低起伏，而非持續平穩：

```
情緒強度
    ▲
    │     ╭─╮        ╭─╮         ╭─╮
    │   ╭╯  ╰╮     ╭╯  ╰╮      ╭╯  ╰──  (高潮時刻)
    │ ╭╯     ╰───╮╯     ╰────╮╯
    │╯                                  (恢復/探索)
    └────────────────────────────────► 時間
        遭遇  戰鬥  捕獲  探索  遭遇...
```

**實作建議：**
```typescript
// 連續戰鬥後，延長下一次遭遇的間隔
function getNextEncounterDelay(recentBattleCount: number): number {
    const baseDelay = 3; // 基礎間隔（檔案切換次數）
    const fatigueBonus = Math.floor(recentBattleCount / 3) * 2;
    
    return baseDelay + fatigueBonus;
}
```

---

## 具體實作方案

### 📦 方案一：戰鬥平衡調整

修改 `CreatePokemonHandler.ts` 中的等級計算：

```typescript
// 修改前
const adjustedBaseLevel = Math.min(60, Math.max(2, baseLevel + timeBonus + 2));

// 修改後 - 加入 DDA 調整
async function calculateWildLevel(
    depth: number, 
    playingTime: number,
    partyPokemon: PokemonDao[]
): Promise<number> {
    const baseLevel = depth * 1.5; // 基礎環境等級
    
    // 新增：取得動態難度修正值
    const difficultyManager = DifficultyManager.getInstance();
    const modifiers = difficultyManager.getModifiers();
    
    // ★ 修改：改以「總遊玩時間」作為核心參考，移除隊伍等級依賴
    // 原因：避免玩家刻意攜帶低等寶可夢降低難度，並確保難度隨遊玩歷程穩定成長
    
    // 時間等級曲線：假設玩家每遊玩 1 小時約能提升 0.5 等級的實力 (可調整參數)
    // 例如：遊玩 20 小時 -> 預期等級 10
    const hoursPlayed = playingTime / (60 * 60 * 1000);
    const timeExpectedLevel = Math.min(100, Math.floor(hoursPlayed * 0.5));
    
    // ★ 優化公式：時間與環境權重 (Time-Depth Scaling)
    // 1. 環境 (Depth) 佔 60%: 深度仍然是決定強度的主要因素
    // 2. 時間 (Time) 佔 40%: 反映玩家資歷，確保老玩家在淺層區域遇到的怪也會稍微強一點
    const targetLevel = (baseLevel * 0.6) + (timeExpectedLevel * 0.4);
    
    // 套用 DDA 修正
    // 最終等級由「深度」與「遊玩時間」決定，並受 DDA 動態調整 (手動難度/表現修正)
    const finalLevel = Math.round(targetLevel + modifiers.levelOffset);
    
    return Math.min(100, Math.max(1, finalLevel));
}
```

### 📦 方案二：遭遇率智慧調整（含 EncounterRate 過濾）

修改 `EncounterHandler.ts` 中的加權選擇：

```typescript
function pickWeightedPokemon(
    candidates: PokeEncounterData[],
    playingTime: number,
    difficultyModifiers: DifficultyModifiers  // 新增參數
): PokeEncounterData | null {
    if (candidates.length === 0) return null;

    // ★ 步驟 1: 根據 EncounterRate 門檻過濾候選名單
    // 焦慮時只給常見怪 (minEncounterRate 高)，無聊時只給稀有怪 (maxEncounterRate 低)
    const filteredByDifficulty = candidates.filter(p => 
        p.encounterRate >= difficultyModifiers.minEncounterRate &&
        p.encounterRate <= difficultyModifiers.maxEncounterRate
    );
    
    // 如果過濾後沒有候選者，使用原始名單（保底機制）
    const finalCandidates = filteredByDifficulty.length > 0 
        ? filteredByDifficulty 
        : candidates;

    // ★ 步驟 2: 根據 DDA 調整遭遇權重
    const adjustedCandidates = finalCandidates.map(p => {
        // 原始 encounterRate 越高 = 越常見
        // encounterRateMultiplier > 1 = 放大常見怪權重 (更容易遇到常見)
        // encounterRateMultiplier < 1 = 縮小常見怪權重 (相對更容易遇到稀有)
        let adjustedRate = p.encounterRate;
        
        if (p.encounterRate > 100) {
            // 常見寶可夢：權重 * 倍率
            adjustedRate = p.encounterRate * difficultyModifiers.encounterRateMultiplier;
        } else {
            // 稀有寶可夢：權重 / 倍率 (倍率>1時降低，倍率<1時提高)
            adjustedRate = p.encounterRate / difficultyModifiers.encounterRateMultiplier;
        }
        
        return { ...p, encounterRate: Math.max(1, adjustedRate) }; // 確保最低權重為 1
    });

    // ★ 步驟 3: 加權隨機抽取
    const totalWeight = adjustedCandidates.reduce((sum, p) => sum + p.encounterRate, 0);
    let random = Math.random() * totalWeight;
    
    for (const pokemon of adjustedCandidates) {
        if (random < pokemon.encounterRate) {
            return pokemon;
        }
        random -= pokemon.encounterRate;
    }
    
    return adjustedCandidates[0]; // Fallback
}
```

### 📦 方案二補充：遭遇記錄追蹤

新增遭遇歷史記錄功能，用於計算加權捕獲表現與運氣指數：

```typescript
// src/manager/EncounterHistoryManager.ts

interface EncounterRecord {
    pokemonId: number;
    pokemonName: string;
    pokemonCatchRate: number;     // 捕獲難度
    pokemonEncounterRate: number; // 遭遇稀有度 ★ 新增
    biomeType: string;
    depth: number;
    wasAttempted: boolean;      // 是否嘗試捕獲
    wasCaught: boolean;         // 是否成功
    catchAttempts: number;      // 用了幾顆球
    battleResult: 'win' | 'lose' | 'flee';
    timestamp: number;
}

class EncounterHistoryManager {
    private static instance: EncounterHistoryManager;
    private history: EncounterRecord[] = [];
    private readonly MAX_HISTORY = 100;  // 保留最近 100 筆
    
    // 記錄新遭遇
    public recordEncounter(record: EncounterRecord): void {
        this.history.push(record);
        if (this.history.length > this.MAX_HISTORY) {
            this.history.shift(); // 移除最舊的記錄
        }
        this.save();
    }
    
    // 取得最近 N 筆遭遇
    public getRecentEncounters(n: number = 20): EncounterRecord[] {
        return this.history.slice(-n);
    }
    
    // 計算平均遭遇 EncounterRate (運氣指標)
    public getAvgEncounterRate(n: number = 20): number {
        const recent = this.getRecentEncounters(n);
        if (recent.length === 0) return 100; // 預設中等
        
        return recent.reduce((sum, e) => sum + e.pokemonEncounterRate, 0) / recent.length;
    }
    
    // 計算加權捕獲表現 (技術指標)
    public getWeightedCatchPerformance(n: number = 20): number {
        const recent = this.getRecentEncounters(n).filter(e => e.wasAttempted);
        if (recent.length === 0) return 0.5;
        
        let totalWeight = 0;
        let weightedSuccess = 0;
        
        for (const encounter of recent) {
            // 難度權重：catchRate 越低，成功抓到的價值越高
            const difficultyWeight = 255 / encounter.pokemonCatchRate;
            
            // 嘗試次數懲罰：用越多球，表現越差
            const attemptPenalty = Math.max(0.5, 1 - (encounter.catchAttempts - 1) * 0.1);
            
            totalWeight += difficultyWeight;
            if (encounter.wasCaught) {
                weightedSuccess += difficultyWeight * attemptPenalty;
            }
        }
        
        return weightedSuccess / totalWeight;
    }
    
    // 取得特定 CatchRate 範圍的成功率
    public getCatchRateByTier(minRate: number, maxRate: number): number {
        const filtered = this.history.filter(
            e => e.wasAttempted && 
                 e.pokemonCatchRate >= minRate && 
                 e.pokemonCatchRate <= maxRate
        );
        if (filtered.length === 0) return 0.5;
        
        const caught = filtered.filter(e => e.wasCaught).length;
        return caught / filtered.length;
    }
}
```

### 📦 方案三：捕獲率動態調整

修改捕獲計算邏輯：

```typescript
function calculateCatchRate(
    pokemon: PokemonDao,
    pokeball: PokeBall,
    difficultyModifiers: DifficultyModifiers
): number {
    // 標準捕獲公式
    const baseRate = pokemon.catchRate;
    const hpFactor = (pokemon.maxHp * 3 - pokemon.currentHp * 2) / (pokemon.maxHp * 3);
    const ballBonus = pokeball.catchRateModifier;
    
    let catchChance = (baseRate * hpFactor * ballBonus) / 255;
    
    // 套用 DDA 加成
    catchChance += difficultyModifiers.catchBonus / 100;
    
    // 連續失敗保護機制
    const consecutiveFails = getConsecutiveCatchFails();
    if (consecutiveFails >= 3) {
        catchChance += 0.1 * (consecutiveFails - 2); // 每多失敗一次 +10%
    }
    
    return Math.min(0.95, Math.max(0.05, catchChance));
}
```

### 📦 方案四：成就系統連動（含 CatchRate 分析）

利用現有的 `AchievementManager` 數據，並整合遭遇歷史：

```typescript
// DifficultyManager.ts
class DifficultyManager {
    private achievementManager: AchievementManager;
    private encounterHistoryManager: EncounterHistoryManager;
    
    private calculateMetricsFromAchievements(): DifficultyMetrics {
        const stats = this.achievementManager.getStatistics();
        const encounterHistory = this.encounterHistoryManager;
        
        return {
            recentWinRate: this.getRecentWinRate(stats.battleHistory),
            avgRemainingHpPercent: stats.avgPostBattleHp || 0.5,
            catchSuccessRate: stats.totalCatches / Math.max(1, stats.totalCatchAttempts),
            faintRate: stats.totalFaints / Math.max(1, stats.totalBattles),
            
            // ★ 新增：CatchRate 相關指標
            avgEncounterRate: encounterHistory.getAvgEncounterRate(20),
            weightedCatchPerformance: encounterHistory.getWeightedCatchPerformance(20),
        };
    }
    
    private getRecentWinRate(battleHistory: BattleRecord[]): number {
        const recentBattles = battleHistory.slice(-10);
        if (recentBattles.length === 0) return 0.5;
        
        const wins = recentBattles.filter(b => b.result === 'win').length;
        return wins / recentBattles.length;
    }
    
    // ★ 新增：分析玩家對不同難度寶可夢的掌握程度
    public analyzeCatchSkillByTier(): CatchSkillAnalysis {
        const history = this.encounterHistoryManager;
        
        return {
            legendary: {  // catchRate 3-25
                successRate: history.getCatchRateByTier(3, 25),
                sampleSize: history.getRecentEncounters(100)
                    .filter(e => e.pokemonCatchRate >= 3 && e.pokemonCatchRate <= 25).length,
            },
            rare: {  // catchRate 26-75
                successRate: history.getCatchRateByTier(26, 75),
                sampleSize: history.getRecentEncounters(100)
                    .filter(e => e.pokemonCatchRate >= 26 && e.pokemonCatchRate <= 75).length,
            },
            uncommon: {  // catchRate 76-150
                successRate: history.getCatchRateByTier(76, 150),
                sampleSize: history.getRecentEncounters(100)
                    .filter(e => e.pokemonCatchRate >= 76 && e.pokemonCatchRate <= 150).length,
            },
            common: {  // catchRate 151-255
                successRate: history.getCatchRateByTier(151, 255),
                sampleSize: history.getRecentEncounters(100)
                    .filter(e => e.pokemonCatchRate >= 151 && e.pokemonCatchRate <= 255).length,
            },
        };
    }
    
    // ★ 新增：智慧推薦下一次遭遇的 EncounterRate 範圍
    public recommendNextEncounterRange(): { min: number; max: number } {
        const analysis = this.analyzeCatchSkillByTier();
        const metrics = this.calculateMetricsFromAchievements();
        
        // 如果玩家在某個難度等級表現不佳，優先給予該等級的練習機會
        // 這裡可以根據設計決定：是給更簡單的練習，還是給更難的挑戰？
        // Flow Theory: 技能低 -> 降低挑戰
        
        // 根據整體表現決定
        const modifiers = this.getModifiers(this.calculateDifficultyIndex(metrics));
        return {
            min: modifiers.minEncounterRate,
            max: modifiers.maxEncounterRate,
        };
    }
}

interface CatchSkillAnalysis {
    legendary: { successRate: number; sampleSize: number };
    rare: { successRate: number; sampleSize: number };
    uncommon: { successRate: number; sampleSize: number };
    common: { successRate: number; sampleSize: number };
}
```

---

## 監控與調整機制

### 📊 數據儀表板

建議在成就頁面或開發者模式中顯示 DDA 狀態：

```typescript
interface DDADebugInfo {
    currentDifficultyIndex: number;
    currentZone: 'anxiety' | 'flow' | 'boredom';
    activeModifiers: DifficultyModifiers;
    recentMetrics: DifficultyMetrics;
    adjustmentHistory: Array<{
        timestamp: Date;
        oldIndex: number;
        newIndex: number;
        trigger: string;
    }>;
}
```

### 🔄 A/B 測試框架

```typescript
// 允許在不同玩家群體測試不同的 DDA 參數
const DDA_CONFIGS = {
    'control': {
        // 無 DDA，使用原始系統
        enabled: false,
    },
    'conservative': {
        // 保守調整
        enabled: true,
        anxietyThreshold: 25,
        boredThreshold: 75,
        maxLevelOffset: 2,
    },
    'aggressive': {
        // 積極調整
        enabled: true,
        anxietyThreshold: 35,
        boredThreshold: 65,
        maxLevelOffset: 5,
    },
};
```

### 📈 成功指標 (KPIs)

| 指標 | 計算方式 | 目標 |
|------|---------|------|
| 遊戲時長 | 每日/每週平均遊玩時間 | 增加 20%+ |
| 留存率 | 7 日/30 日回歸率 | 維持 60%+ |
| 心流時間比 | 處於心流區的時間佔比 | 達到 70%+ |
| 挫折中斷率 | 因連敗而停止遊玩的頻率 | 降低 50%+ |
| 圖鑑完成度 | 平均捕獲寶可夢數量 | 增加 30%+ |

---

## 🎯 總結與實施路線圖

### Phase 1: 數據基礎建設 (1-2 週)
- [ ] 在 `AchievementManager` 中增加戰鬥詳細數據追蹤
- [ ] 建立 `DifficultyManager` 基礎架構
- [ ] 實作指標計算邏輯

### Phase 2: 核心 DDA 實作 (2-3 週)
- [ ] 實作野生寶可夢等級調整
- [ ] 實作遭遇率權重調整
- [ ] 實作捕獲率動態加成

### Phase 3: 心流優化 (2 週)
- [ ] 實作遭遇節奏控制
- [ ] 加入連敗/連勝保護機制
- [ ] 優化獎勵曲線

### Phase 4: 監控與迭代 (持續)
- [ ] 建立數據監控儀表板
- [ ] 收集玩家反饋
- [ ] 根據數據持續調整閾值參數

---

## 📚 參考資源

1. **Flow: The Psychology of Optimal Experience** - Mihaly Csikszentmihalyi
2. **Game Feel: A Game Designer's Guide to Virtual Sensation** - Steve Swink
3. **Difficulty Adjustment in Computer Games** - Robin Hunicke, 2005
4. **Dynamic Difficulty Adjustment in Games** - GDC Vault

---

*此文件為 PokeCodec 專案的 DDA 與 Flow Theory 應用指南，最後更新：2025/12/25*
