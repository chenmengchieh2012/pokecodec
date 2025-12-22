import { PokemonAilment } from "../../../src/dataAccessObj/pokemon";

export const CatchCalculator = {
    /**
     * 計算捕獲成功率
     * @param baseCatchRate 基礎捕獲率 (0-255)
     * @param hpPercentage 目標寶可夢當前 HP 百分比 (0-1)
     * @param ballModifier 捕捉球修正值 (例如：精靈球 1.0，高級球 1.5 等)
     * @param ailmentCondition 狀態異常修正值 (例如：睡眠/麻痺 2.0，中毒/灼傷/冰凍 1.5 等)
     * @returns 捕獲成功率 (0-1)
     */
    calculateCatchRate: (
        baseCatchRate: number,
        hpPercentage: number,
        ballModifier: number,
        ailmentCondition: PokemonAilment
    ): number => {
        // 根據遊戲機制計算捕獲率
        console.log("[CatchCalculator] Calculating catch rate with:", {
            baseCatchRate,
            hpPercentage,
            ballModifier,
            ailmentCondition
        });

        // 公式: ((3 * MaxHP - 2 * CurrentHP) * Rate * Ball) / (3 * MaxHP) * Status
        // 簡化後: (3 - 2 * hpPercentage) * Rate * Ball / 3
        // 注意：原本的 (3 * (1 - hpPercentage)) 會導致滿血時捕獲率為 0，這是錯誤的
        let a = ((3 - 2 * hpPercentage) * baseCatchRate * ballModifier) / (3 * 255);
        console.log("[CatchCalculator] Initial catch rate (a):", a);

        // 狀態異常修正 (Gen 3-4 標準)
        // 睡眠 (Sleep) 和 冰凍 (Freeze) 為 2.0 (Gen 5+ 為 2.5)
        // 麻痺 (Paralysis)、中毒 (Poison)、灼傷 (Burn) 為 1.5
        if (ailmentCondition === 'sleep' || ailmentCondition === 'freeze') {
            a *= 2.0;
        } else if (
            ailmentCondition === 'poison' ||
            ailmentCondition === 'burn' ||
            ailmentCondition === 'paralysis'
        ) {
            a *= 1.5;
        }

        const catchRate = a;

        // 將捕獲率限制在 0 到 1 之間
        // 捕獲率越高越接近 1
        return Math.min(Math.max(catchRate, 0), 1);
    }
};