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
    'shiny-stone', 'dusk-stone', 'dawn-stone',
    // TMs (Gen 1)
    'tm01', 'tm02', 'tm03', 'tm04', 'tm05', 'tm06', 'tm07', 'tm08', 'tm09', 'tm10',
    'tm11', 'tm12', 'tm13', 'tm14', 'tm15', 'tm16', 'tm17', 'tm18', 'tm19', 'tm20',
    'tm21', 'tm22', 'tm23', 'tm24', 'tm25', 'tm26', 'tm27', 'tm28', 'tm29', 'tm30',
    'tm31', 'tm32', 'tm33', 'tm34', 'tm35', 'tm36', 'tm37', 'tm38', 'tm39', 'tm40',
    'tm41', 'tm42', 'tm43', 'tm44', 'tm45', 'tm46', 'tm47', 'tm48', 'tm49', 'tm50',
    // HMs (Gen 1)
    'hm01', 'hm02', 'hm03', 'hm04', 'hm05'
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

    // TMs (Gen 1 Moves)
    'tm01': { teachMove: 'mega-punch' },
    'tm02': { teachMove: 'razor-wind' },
    'tm03': { teachMove: 'swords-dance' },
    'tm04': { teachMove: 'whirlwind' },
    'tm05': { teachMove: 'mega-kick' },
    'tm06': { teachMove: 'toxic' },
    'tm07': { teachMove: 'horn-drill' },
    'tm08': { teachMove: 'body-slam' },
    'tm09': { teachMove: 'take-down' },
    'tm10': { teachMove: 'double-edge' },
    'tm11': { teachMove: 'bubble-beam' },
    'tm12': { teachMove: 'water-gun' },
    'tm13': { teachMove: 'ice-beam' },
    'tm14': { teachMove: 'blizzard' },
    'tm15': { teachMove: 'hyper-beam' },
    'tm16': { teachMove: 'pay-day' },
    'tm17': { teachMove: 'submission' },
    'tm18': { teachMove: 'counter' },
    'tm19': { teachMove: 'seismic-toss' },
    'tm20': { teachMove: 'rage' },
    'tm21': { teachMove: 'mega-drain' },
    'tm22': { teachMove: 'solar-beam' },
    'tm23': { teachMove: 'dragon-rage' },
    'tm24': { teachMove: 'thunderbolt' },
    'tm25': { teachMove: 'thunder' },
    'tm26': { teachMove: 'earthquake' },
    'tm27': { teachMove: 'fissure' },
    'tm28': { teachMove: 'dig' },
    'tm29': { teachMove: 'psychic' },
    'tm30': { teachMove: 'teleport' },
    'tm31': { teachMove: 'mimic' },
    'tm32': { teachMove: 'double-team' },
    'tm33': { teachMove: 'reflect' },
    'tm34': { teachMove: 'bide' },
    'tm35': { teachMove: 'metronome' },
    'tm36': { teachMove: 'self-destruct' },
    'tm37': { teachMove: 'egg-bomb' },
    'tm38': { teachMove: 'fire-blast' },
    'tm39': { teachMove: 'swift' },
    'tm40': { teachMove: 'skull-bash' },
    'tm41': { teachMove: 'soft-boiled' },
    'tm42': { teachMove: 'dream-eater' },
    'tm43': { teachMove: 'sky-attack' },
    'tm44': { teachMove: 'rest' },
    'tm45': { teachMove: 'thunder-wave' },
    'tm46': { teachMove: 'psywave' },
    'tm47': { teachMove: 'explosion' },
    'tm48': { teachMove: 'rock-slide' },
    'tm49': { teachMove: 'tri-attack' },
    'tm50': { teachMove: 'substitute' },

    // HMs (Gen 1 Moves)
    'hm01': { teachMove: 'cut' },
    'hm02': { teachMove: 'fly' },
    'hm03': { teachMove: 'surf' },
    'hm04': { teachMove: 'strength' },
    'hm05': { teachMove: 'flash' },
};

const RARITY_TABLE = {
    // Tier 5 (Legendary)
    'master-ball': 5,
    'hm01': 5, 'hm02': 5, 'hm03': 5, 'hm04': 5, 'hm05': 5,
    
    // Tier 4 (Epic)
    'max-potion': 4, 'full-restore': 4, 'max-revive': 4, 'max-elixir': 4,
    'tm15': 4, // Hyper Beam
    'tm22': 4, // Solar Beam
    'tm25': 4, // Thunder
    'tm26': 4, // Earthquake
    'tm29': 4, // Psychic
    'tm38': 4, // Fire Blast
    'tm14': 4, // Blizzard
    'tm47': 4, // Explosion
    
    // Tier 3 (Rare)
    'ultra-ball': 3, 'hyper-potion': 3, 'full-heal': 3, 'revive': 3, 'max-ether': 3,
    'fire-stone': 3, 'water-stone': 3, 'thunder-stone': 3, 'leaf-stone': 3, 'moon-stone': 3,
    'sun-stone': 3, 'shiny-stone': 3, 'dusk-stone': 3, 'dawn-stone': 3,
    'tm03': 3, // Swords Dance
    'tm06': 3, // Toxic
    'tm13': 3, // Ice Beam
    'tm24': 3, // Thunderbolt
    'tm28': 3, // Dig
    'tm36': 3, // Self-Destruct
    'tm41': 3, // Soft-Boiled
    'tm42': 3, // Dream Eater
    'tm43': 3, // Sky Attack
    'tm45': 3, // Thunder Wave
    'tm48': 3, // Rock Slide
    'tm50': 3, // Substitute
    'hp-up': 3, 'protein': 3, 'iron': 3, 'calcium': 3, 'zinc': 3, 'carbos': 3,

    // Tier 2 (Uncommon)
    'great-ball': 2, 'super-potion': 2, 'fresh-water': 2, 'soda-pop': 2, 'lemonade': 2, 'moomoo-milk': 2,
    'ether': 2, 'elixir': 2,
    'tm08': 2, // Body Slam
    'tm10': 2, // Double-Edge
    'tm11': 2, // Bubble Beam
    'tm19': 2, // Seismic Toss
    'tm21': 2, // Mega Drain
    'tm27': 2, // Fissure
    'tm31': 2, // Mimic
    'tm32': 2, // Double Team
    'tm33': 2, // Reflect
    'tm44': 2, // Rest
    'tm49': 2, // Tri Attack
    'x-attack': 2, 'x-defense': 2, 'x-speed': 2, 'x-sp-atk': 2, 'x-sp-def': 2, 'x-accuracy': 2,

    // Tier 1 (Common) - Default
    // Potion, Poke Ball, Antidote, etc.
    // Weak TMs: TM01 (Mega Punch), TM02 (Razor Wind), TM04 (Whirlwind), TM05 (Mega Kick), TM12 (Water Gun), etc.
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

    // Determine Rarity
    const rarity = RARITY_TABLE[data.name] || 1;

    return {
        id: data.id,
        name: name,
        apiName: data.name,
        category: category,
        pocket: pocket,
        description: description,
        price: data.cost,
        sellPrice: Math.floor(data.cost / 2),
        rarity: rarity,
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
