import * as assert from 'assert';
import { PokemonFactory } from '../core/CreatePokemonHandler';
import { DifficultyManager } from '../manager/DifficultyManager';
import { PokeEncounterData } from '../dataAccessObj/pokeEncounterData';

// Mock DifficultyManager
class MockDifficultyManager {
    private level: number;
    private modifiers: any;

    constructor(level: number, modifiers: any) {
        this.level = level;
        this.modifiers = modifiers;
    }

    getCurrentLevel() {
        return this.level;
    }

    getModifiers() {
        return this.modifiers;
    }
}

suite('CreatePokemonHandler Test Suite', () => {
    const mockEncounterData: PokeEncounterData = {
        pokemonId: 25, // Pikachu
        minDepth: 1,
        encounterRate: 100,
        nameZh: '皮卡丘',
        nameEn: 'Pikachu'
    };

    test('Should generate higher level Pokemon for higher difficulty', async () => {
        // Level 1 Difficulty (Base Level ~5)
        const easyManager = new MockDifficultyManager(1, { levelOffset: -2 });
        const easyPokemon = await PokemonFactory.createWildPokemonInstance(
            mockEncounterData,
            easyManager as unknown as DifficultyManager,
            undefined,
            undefined,
        );

        // Level 9 Difficulty (Base Level ~85)
        const hardManager = new MockDifficultyManager(9, { levelOffset: 5 });
        const hardPokemon = await PokemonFactory.createWildPokemonInstance(
            mockEncounterData,
            hardManager as unknown as DifficultyManager,
            undefined,
            undefined,
        );

        console.log(`Easy Level: ${easyPokemon.level}, Hard Level: ${hardPokemon.level}`);

        assert.ok(easyPokemon.level < hardPokemon.level, 'Hard difficulty should produce higher level Pokemon');
        assert.ok(easyPokemon.level >= 1, 'Level should be at least 1');
        assert.ok(hardPokemon.level <= 100, 'Level should be at most 100');
    });

    test('Should apply level offset from modifiers', async () => {
        // Same difficulty level (5), but different offsets
        const baseManager = new MockDifficultyManager(5, { levelOffset: 0 });
        const buffedManager = new MockDifficultyManager(5, { levelOffset: 10 });

        // Generate multiple samples to average out randomness
        let baseSum = 0;
        let buffedSum = 0;
        const samples = 10;

        for (let i = 0; i < samples; i++) {
            const p1 = await PokemonFactory.createWildPokemonInstance(mockEncounterData, baseManager as unknown as DifficultyManager, undefined, undefined);
            const p2 = await PokemonFactory.createWildPokemonInstance(mockEncounterData, buffedManager as unknown as DifficultyManager, undefined, undefined);
            baseSum += p1.level;
            buffedSum += p2.level;
        }

        const avgBase = baseSum / samples;
        const avgBuffed = buffedSum / samples;

        console.log(`Avg Base Level: ${avgBase}, Avg Buffed Level: ${avgBuffed}`);
        assert.ok(avgBuffed > avgBase, 'Positive level offset should increase average level');
    });
});
