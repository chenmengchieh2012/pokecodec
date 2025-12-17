const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '../src/data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'pokemonGen1.json');

const evolutionChainCache = {};

async function fetchPokemon(id) {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
    if (!response.ok) {
        throw new Error(`Failed to fetch Pokemon ${id}: ${response.statusText}`);
    }
    return await response.json();
}

async function getEvolutionData(url, currentPokemonName) {
    if (!evolutionChainCache[url]) {
        const res = await fetch(url);
        if (res.ok) {
            evolutionChainCache[url] = await res.json();
        } else {
            return [];
        }
    }
    const chainData = evolutionChainCache[url];
    
    // Traverse chain to find current pokemon
    let currentNode = chainData.chain;
    
    // Helper to find node recursively
    const findNode = (node, name) => {
        if (node.species.name === name) return node;
        for (const child of node.evolves_to) {
            const found = findNode(child, name);
            if (found) return found;
        }
        return null;
    };

    const myNode = findNode(currentNode, currentPokemonName);
    if (!myNode || !myNode.evolves_to.length) return [];

    return myNode.evolves_to.map(evo => {
        // Find the evolution detail relevant to this evolution
        // Sometimes there are multiple ways (e.g. multiple items), we just take the first one or filter
        const details = evo.evolution_details[0]; 
        
        // Extract ID from URL: https://pokeapi.co/api/v2/pokemon-species/2/
        const idMatch = evo.species.url.match(/\/(\d+)\/$/);
        const id = idMatch ? parseInt(idMatch[1]) : 0;
        
        return {
            id: id,
            name: evo.species.name,
            min_level: details ? details.min_level : null,
            trigger: details ? details.trigger.name : null,
            item: details && details.item ? details.item.name : null,
            known_move: details && details.known_move ? details.known_move.name : null
        };
    });
}

function simplifyPokemonData(data, species, evolutions) {
    // Helper to extract Gen 1 info (Red-Blue or Yellow)
    const getGen1Detail = (details) => {
        const redBlue = details.find(d => d.version_group.name === 'red-blue');
        if (redBlue) return redBlue;
        const yellow = details.find(d => d.version_group.name === 'yellow');
        if (yellow) return yellow;
        return null;
    };

    const moves = data.moves
        .map(m => {
            const detail = getGen1Detail(m.version_group_details);
            if (!detail) return null;
            return {
                name: m.move.name,
                learn_method: detail.move_learn_method.name,
                level_learned_at: detail.level_learned_at
            };
        })
        .filter(m => m !== null);

    // Sort moves: level-up moves by level, others after
    moves.sort((a, b) => {
        if (a.learn_method === 'level-up' && b.learn_method === 'level-up') {
            return a.level_learned_at - b.level_learned_at;
        }
        if (a.learn_method === 'level-up') return -1;
        if (b.learn_method === 'level-up') return 1;
        return 0;
    });

    const stats = {};
    data.stats.forEach(s => {
        stats[s.stat.name] = s.base_stat;
    });

    // Extract species info
    const flavorTextEntry = species.flavor_text_entries.find(f => f.language.name === 'en' && f.version.name === 'red') 
                         || species.flavor_text_entries.find(f => f.language.name === 'en');
    const flavorText = flavorTextEntry ? flavorTextEntry.flavor_text.replace(/[\n\f]/g, ' ') : '';

    const genusEntry = species.genera.find(g => g.language.name === 'en');
    const genus = genusEntry ? genusEntry.genus : '';

    return {
        id: data.id,
        name: data.name,
        types: data.types.map(t => t.type.name),
        stats: stats,
        abilities: data.abilities.map(a => ({
            name: a.ability.name,
            isHidden: a.is_hidden
        })),
        height: data.height,
        weight: data.weight,
        base_experience: data.base_experience,
        gender_rate: data.gender_rate,
        moves: moves,
        evolutions: evolutions,
        species: {
            capture_rate: species.capture_rate,
            base_happiness: species.base_happiness,
            growth_rate: species.growth_rate.name,
            flavor_text: flavorText,
            genus: genus,
            evolution_chain_url: species.evolution_chain.url
        }
    };
}

async function main() {
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const allPokemon = {};
    console.log('Starting download of Pokemon 1-151...');

    for (let i = 1; i <= 151; i++) {
        try {
            console.log(`Fetching Pokemon ${i}...`);
            const data = await fetchPokemon(i);
            
            // Fetch species data
            const speciesRes = await fetch(data.species.url);
            if (!speciesRes.ok) throw new Error(`Failed to fetch Species for ${i}`);
            const speciesData = await speciesRes.json();

            // Fetch evolution data
            const evolutions = await getEvolutionData(speciesData.evolution_chain.url, data.name);

            allPokemon[i] = simplifyPokemonData(data, speciesData, evolutions);
            
            // Small delay to be polite to the API
            await new Promise(resolve => setTimeout(resolve, 50));
        } catch (error) {
            console.error(`Error fetching Pokemon ${i}:`, error);
        }
    }

    console.log(`Writing data to ${OUTPUT_FILE}...`);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allPokemon, null, 2));
    console.log('Done!');
}

main();
