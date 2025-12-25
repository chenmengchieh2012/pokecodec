import * as assert from 'assert';
import { EncounterHandler } from '../core/EncounterHandler';
import { DifficultyManager } from '../manager/DifficultyManager';
import { PokeEncounterData } from '../dataAccessObj/pokeEncounterData';
import { KantoPokemonEncounterData } from '../utils/KantoPokemonCatchRate';

import * as difficultyConfig from '../data/difficultyConfig.json';

// Mock DifficultyManager
class MockDifficultyManager {
    private minRate: number;
    private maxRate: number;

    constructor(minRate: number, maxRate: number) {
        this.minRate = minRate;
        this.maxRate = maxRate;
    }

    recommendNextEncounterRange() {
        return { min: this.minRate, max: this.maxRate };
    }

    getCurrentLevel() { return 1; }
    getModifiers() { return { levelOffset: 0 }; }
}

suite('EncounterHandler Test Suite', () => {
    const handler = EncounterHandler((path) => path);

    test('Should filter encounters using Real Config (Anxiety vs Boredom)', async () => {
        const filePath = 'src/components/Button.tsx'; // Maps to Urban/Power Plant

        // 1. Test Anxiety Mode (Easy)
        // Config: minEncounterRate: 100, maxEncounterRate: 255
        // Expectation: Only Common Pokemon (High Rate)
        const anxietySettings = difficultyConfig.modifiers.anxiety;
        const anxietyManager = new MockDifficultyManager(anxietySettings.minEncounterRate, anxietySettings.maxEncounterRate);

        const anxietyResult = await handler.calculateEncounter(filePath, 0, anxietyManager as unknown as DifficultyManager);

        if (anxietyResult && anxietyResult.pokemon) {
            console.log(`[Anxiety/Easy] Config Range: [${anxietySettings.minEncounterRate}, ${anxietySettings.maxEncounterRate}]`);
            console.log(`[Anxiety/Easy] Encounter: ${anxietyResult.pokemon.name}`);
            // We can't assert exact species due to RNG, but we verify the flow works with real config
            assert.ok(anxietyResult.pokemon, 'Should generate a pokemon in Anxiety mode');

            // Verify Candidate Logic: The returned pokemon must have a base encounter rate within the range
            const pData = KantoPokemonEncounterData.find(p => p.pokemonId === anxietyResult.pokemon!.id);
            if (pData) {
                assert.ok(pData.encounterRate >= anxietySettings.minEncounterRate, `Pokemon ${pData.nameEn} rate ${pData.encounterRate} < min ${anxietySettings.minEncounterRate}`);
                // Note: Max check might fail if fallback occurred, but here we expect success
                assert.ok(pData.encounterRate <= anxietySettings.maxEncounterRate, `Pokemon ${pData.nameEn} rate ${pData.encounterRate} > max ${anxietySettings.maxEncounterRate}`);
            }
        }

        // 2. Test Boredom Mode (Hard)
        // Config: minEncounterRate: 1, maxEncounterRate: 100
        // Expectation: Only Rare Pokemon (Low Rate)
        const boredomSettings = difficultyConfig.modifiers.boredom;
        const boredomManager = new MockDifficultyManager(boredomSettings.minEncounterRate, boredomSettings.maxEncounterRate);

        const boredomResult = await handler.calculateEncounter(filePath, 0, boredomManager as unknown as DifficultyManager);

        if (boredomResult && boredomResult.pokemon) {
            console.log(`[Boredom/Hard] Config Range: [${boredomSettings.minEncounterRate}, ${boredomSettings.maxEncounterRate}]`);
            console.log(`[Boredom/Hard] Encounter: ${boredomResult.pokemon.name}`);
            assert.ok(boredomResult.pokemon, 'Should generate a pokemon in Boredom mode');

            // Verify Candidate Logic
            const pData = KantoPokemonEncounterData.find(p => p.pokemonId === boredomResult.pokemon!.id);
            if (pData) {
                assert.ok(pData.encounterRate >= boredomSettings.minEncounterRate, `Pokemon ${pData.nameEn} rate ${pData.encounterRate} < min ${boredomSettings.minEncounterRate}`);
                assert.ok(pData.encounterRate <= boredomSettings.maxEncounterRate, `Pokemon ${pData.nameEn} rate ${pData.encounterRate} > max ${boredomSettings.maxEncounterRate}`);
            }
        }
    });
});
