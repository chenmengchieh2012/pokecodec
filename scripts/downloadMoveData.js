const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '../src/data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'pokemonMoves.json');

async function fetchMove(id) {
    const response = await fetch(`https://pokeapi.co/api/v2/move/${id}`);
    if (!response.ok) {
        throw new Error(`Failed to fetch Move ${id}: ${response.statusText}`);
    }
    return await response.json();
}

function simplifyMoveData(data) {
    return {
        id: data.id,
        name: data.name,
        type: data.type.name.toUpperCase(), // Convert to uppercase to match PokemonType
        power: data.power,
        accuracy: data.accuracy,
        pp: data.pp,
        priority: data.priority,
        maxPP: Math.floor(data.pp * 1.6), // Max PP is usually PP * 1.6 (PP Up x3)
        effect: data.effect_entries.find(e => e.language.name === 'en')?.short_effect || ''
    };
}

async function main() {
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const moves = {};
    // Gen 1 moves are 1-165
    const moveIds = Array.from({ length: 165 }, (_, i) => i + 1);
    
    console.log(`Downloading ${moveIds.length} moves...`);
    
    // Process in chunks to avoid rate limiting
    const CHUNK_SIZE = 20;
    for (let i = 0; i < moveIds.length; i += CHUNK_SIZE) {
        const chunk = moveIds.slice(i, i + CHUNK_SIZE);
        const promises = chunk.map(async (id) => {
            try {
                const data = await fetchMove(id);
                const simplified = simplifyMoveData(data);
                moves[simplified.name] = simplified;
                process.stdout.write('.');
            } catch (error) {
                console.error(`\nError fetching move ${id}:`, error.message);
            }
        });
        await Promise.all(promises);
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(moves, null, 2));
    console.log(`\nSaved ${Object.keys(moves).length} moves to ${OUTPUT_FILE}`);
}

main().catch(console.error);
