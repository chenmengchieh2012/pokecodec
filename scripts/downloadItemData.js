const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '../src/data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'items.json');

// List of items to download
const ITEM_NAMES = [
    // Balls
    'poke-ball', 'great-ball', 'ultra-ball', 'master-ball',
    // HP Recovery
    'potion', 'super-potion', 'hyper-potion', 'max-potion', 'full-restore',
    'fresh-water', 'soda-pop', 'lemonade', 'moomoo-milk',
    // Status Cures
    'antidote', 'burn-heal', 'ice-heal', 'awakening', 'paralyze-heal', 'full-heal', 'lava-cookie',
    // Revive
    'revive', 'max-revive',
    // PP Recovery
    'ether', 'max-ether', 'elixir', 'max-elixir',
    // Battle Items
    'x-attack', 'x-defense', 'x-speed', 'x-sp-atk', 'x-sp-def', 'x-accuracy', 'dire-hit', 'guard-spec',
    // Vitamins
    'hp-up', 'protein', 'iron', 'calcium', 'zinc', 'carbos',
    // Evolution Stones
    'fire-stone', 'water-stone', 'thunder-stone', 'leaf-stone', 'moon-stone', 'sun-stone',
    'shiny-stone', 'dusk-stone', 'dawn-stone'
];

// Hardcoded effects map (copied from src/dataAccessObj/item.ts)
const HARDCODED_EFFECTS = {
    // HP Recovery
    'potion': { healHp: 20 },
    'super-potion': { healHp: 50 },
    'hyper-potion': { healHp: 200 },
    'max-potion': { healHpPercent: 100 },
    'full-restore': { healHpPercent: 100, healStatus: ['all'] },
    'fresh-water': { healHp: 50 },
    'soda-pop': { healHp: 60 },
    'lemonade': { healHp: 80 },
    'moomoo-milk': { healHp: 100 },

    // Status Cures
    'antidote': { healStatus: ['poison'] },
    'burn-heal': { healStatus: ['burn'] },
    'ice-heal': { healStatus: ['freeze'] },
    'awakening': { healStatus: ['sleep'] },
    'paralyze-heal': { healStatus: ['paralysis'] },
    'full-heal': { healStatus: ['all'] },
    'lava-cookie': { healStatus: ['all'] },

    // Revive
    'revive': { revive: true, reviveHpPercent: 50 },
    'max-revive': { revive: true, reviveHpPercent: 100 },

    // PP Recovery
    'ether': { restorePp: 10 },
    'max-ether': { restorePp: 10 },
    'elixir': { restorePp: 10 },
    'max-elixir': { restorePpAll: true },

    // Balls
    'poke-ball': { catchRateMultiplier: 1.0 },
    'great-ball': { catchRateMultiplier: 1.5 },
    'ultra-ball': { catchRateMultiplier: 2.0 },
    'master-ball': { catchRateMultiplier: 255 },

    // Battle Items
    'x-attack': { statBoosts: [{ stat: 'attack', stages: 2 }] },
    'x-defense': { statBoosts: [{ stat: 'defense', stages: 2 }] },
    'x-speed': { statBoosts: [{ stat: 'speed', stages: 2 }] },
    'x-sp-atk': { statBoosts: [{ stat: 'special-attack', stages: 2 }] },
    'x-sp-def': { statBoosts: [{ stat: 'special-defense', stages: 2 }] },
    'x-accuracy': { statBoosts: [{ stat: 'accuracy', stages: 2 }] },
    'dire-hit': { statBoosts: [] },
    'guard-spec': { statBoosts: [] },

    // Vitamins
    'hp-up': { statBoosts: [{ stat: 'hp', evYield: 10 }] },
    'protein': { statBoosts: [{ stat: 'attack', evYield: 10 }] },
    'iron': { statBoosts: [{ stat: 'defense', evYield: 10 }] },
    'calcium': { statBoosts: [{ stat: 'special-attack', evYield: 10 }] },
    'zinc': { statBoosts: [{ stat: 'special-defense', evYield: 10 }] },
    'carbos': { statBoosts: [{ stat: 'speed', evYield: 10 }] },
    
    // Evolution Stones
    'fire-stone': { evolutionCriteria: { type: 'stone', targetPokemon: ['vulpix', 'growlithe', 'eevee', 'pansear'] } },
    'water-stone': { evolutionCriteria: { type: 'stone', targetPokemon: ['poliwhirl', 'shellder', 'staryu', 'eevee', 'lombre', 'panpour'] } },
    'thunder-stone': { evolutionCriteria: { type: 'stone', targetPokemon: ['pikachu', 'eevee', 'eelektrik'] } },
    'leaf-stone': { evolutionCriteria: { type: 'stone', targetPokemon: ['gloom', 'weepinbell', 'exeggcute', 'nuzleaf', 'pansage'] } },
    'moon-stone': { evolutionCriteria: { type: 'stone', targetPokemon: ['nidorina', 'nidorino', 'clefairy', 'jigglypuff', 'skitty', 'munna'] } },
    'sun-stone': { evolutionCriteria: { type: 'stone', targetPokemon: ['gloom', 'sunkern', 'cottonee', 'petilil', 'helioptile'] } },
    'shiny-stone': { evolutionCriteria: { type: 'stone', targetPokemon: ['togetic', 'roselia', 'minccino', 'floette'] } },
    'dusk-stone': { evolutionCriteria: { type: 'stone', targetPokemon: ['murkrow', 'misdreavus', 'lampent', 'doublade'] } },
    'dawn-stone': { evolutionCriteria: { type: 'stone', targetPokemon: ['kirlia', 'snorunt'] } },
};

async function fetchItem(name) {
    const response = await fetch(`https://pokeapi.co/api/v2/item/${name}`);
    if (!response.ok) {
        throw new Error(`Failed to fetch Item ${name}: ${response.statusText}`);
    }
    return await response.json();
}

function determineCategoryAndPocket(apiCategory) {
    // Map API categories to our ItemCategory and ItemPocket
    // API categories: standard-balls, healing, status-cures, revive, pp-recovery, stat-boosts, vitamins, evolution, etc.
    
    switch (apiCategory) {
        case 'standard-balls':
        case 'special-balls':
        case 'apricorn-balls':
            return { category: 'PokeBalls', pocket: 'balls' };
        
        case 'healing':
        case 'status-cures':
        case 'revival':
        case 'pp-recovery':
            return { category: 'Medicine', pocket: 'medicine' };
            
        case 'stat-boosts':
        case 'flutes': // sometimes used in battle
            return { category: 'BattleItems', pocket: 'items' };
            
        case 'vitamins':
            return { category: 'Medicine', pocket: 'medicine' }; // Or items? Usually medicine pocket in newer gens
            
        case 'evolution':
            return { category: 'Evolution', pocket: 'items' };
            
        case 'berries':
        case 'mulch':
            return { category: 'Berries', pocket: 'berries' };
            
        case 'tm':
        case 'hm':
            return { category: 'Machines', pocket: 'tmhm' };
            
        default:
            return { category: 'Treasures', pocket: 'items' };
    }
}

function adaptItemData(data) {
    const { category, pocket } = determineCategoryAndPocket(data.category.name);
    
    // Find English name
    const nameEntry = data.names.find(n => n.language.name === 'en');
    const name = nameEntry ? nameEntry.name : data.name;
    
    // Find English description (flavor text)
    // Prefer 'emerald' or 'firered-leafgreen' or latest
    const flavorEntry = data.flavor_text_entries.find(f => f.language.name === 'en' && f.version_group.name === 'emerald') 
                     || data.flavor_text_entries.find(f => f.language.name === 'en');
    const description = flavorEntry ? flavorEntry.text.replace(/\n|\f/g, ' ') : '';

    // Attributes
    const attributes = data.attributes.map(a => a.name);
    const isConsumable = attributes.includes('consumable');
    const isUsableInBattle = attributes.includes('usable-in-battle');
    const isUsableOverworld = attributes.includes('usable-overworld');
    const isHoldable = attributes.includes('holdable');

    return {
        id: data.id,
        name: name,
        apiName: data.name,
        category: category,
        pocket: pocket,
        description: description,
        price: data.cost,
        sellPrice: Math.floor(data.cost / 2),
        isConsumable: isConsumable,
        isUsableInBattle: isUsableInBattle,
        isUsableOverworld: isUsableOverworld,
        isHoldable: isHoldable,
        effect: HARDCODED_EFFECTS[data.name],
        spriteUrl: data.sprites.default,
        totalSize: 1 // Default
    };
}

async function main() {
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const items = {};
    
    console.log(`Downloading ${ITEM_NAMES.length} items...`);
    
    // Process in chunks
    const CHUNK_SIZE = 10;
    for (let i = 0; i < ITEM_NAMES.length; i += CHUNK_SIZE) {
        const chunk = ITEM_NAMES.slice(i, i + CHUNK_SIZE);
        const promises = chunk.map(async (name) => {
            try {
                const data = await fetchItem(name);
                const adapted = adaptItemData(data);
                items[adapted.apiName] = adapted;
                process.stdout.write('.');
            } catch (error) {
                console.error(`\nError fetching item ${name}:`, error.message);
            }
        });
        
        await Promise.all(promises);
    }
    
    console.log('\nWriting to file...');
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(items, null, 2));
    console.log(`Done! Saved to ${OUTPUT_FILE}`);
}

main().catch(console.error);
