const fs = require('fs');
const path = require('path');
const https = require('https');

const BASE_DIR = path.join(__dirname, '../webview-ui/public/sprites');
const POKEMON_COUNT = 151;

const DIRS = {
    normal: path.join(BASE_DIR, 'pokemon/normal'),
    back: path.join(BASE_DIR, 'pokemon/back'),
    shiny: path.join(BASE_DIR, 'pokemon/shiny'),
    backShiny: path.join(BASE_DIR, 'pokemon/back-shiny'),
    icon: path.join(BASE_DIR, 'pokemon/icon'),
    items: path.join(BASE_DIR, 'items'),
};

// Ensure directories exist
Object.values(DIRS).forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

const downloadFile = (url, dest) => {
    return new Promise((resolve, reject) => {
        if (fs.existsSync(dest)) {
            // console.log(`Skipping ${path.basename(dest)} (already exists)`);
            resolve();
            return;
        }

        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                fs.unlink(dest, () => {}); // Delete partial file
                // Some sprites might be missing (e.g. some back sprites), just warn
                // console.warn(`Failed to download ${url}: ${response.statusCode}`);
                resolve(); // Resolve anyway to continue
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            console.error(`Error downloading ${url}: ${err.message}`);
            reject(err);
        });
    });
};

async function main() {
    console.log(`Starting download of sprites for ${POKEMON_COUNT} Pokemon...`);

    const downloads = [];

    // 1. Pokemon Sprites
    for (let i = 1; i <= POKEMON_COUNT; i++) {
        // Animated Front (Gen 5 Black/White)
        downloads.push(downloadFile(
            `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${i}.gif`,
            path.join(DIRS.normal, `${i}.gif`)
        ));

        // Animated Back
        downloads.push(downloadFile(
            `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/back/${i}.gif`,
            path.join(DIRS.back, `${i}.gif`)
        ));

        // Animated Shiny Front
        downloads.push(downloadFile(
            `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/shiny/${i}.gif`,
            path.join(DIRS.shiny, `${i}.gif`)
        ));

        // Animated Shiny Back
        downloads.push(downloadFile(
            `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/back/shiny/${i}.gif`,
            path.join(DIRS.backShiny, `${i}.gif`)
        ));

        // Static Front
        downloads.push(downloadFile(
            `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${i}.png`,
            path.join(DIRS.normal, `${i}.png`)
        ));

        // Static Back
        downloads.push(downloadFile(
            `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${i}.png`,
            path.join(DIRS.back, `${i}.png`)
        ));

        // Static Shiny Front
        downloads.push(downloadFile(
            `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${i}.png`,
            path.join(DIRS.shiny, `${i}.png`)
        ));

        // Static Shiny Back
        downloads.push(downloadFile(
            `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/shiny/${i}.png`,
            path.join(DIRS.backShiny, `${i}.png`)
        ));

        // Icons (Gen 8)
        downloads.push(downloadFile(
            `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-viii/icons/${i}.png`,
            path.join(DIRS.icon, `${i}.png`)
        ));
        
        // Batch processing to avoid too many open connections
        if (downloads.length >= 20) {
            await Promise.all(downloads);
            downloads.length = 0;
            process.stdout.write(`\rProcessed ${i}/${POKEMON_COUNT} Pokemon...`);
        }
    }

    // 2. Items
    const items = [
        'poke-ball', 'great-ball', 'ultra-ball', 'master-ball',
        'potion', 'super-potion', 'hyper-potion', 'max-potion', 'full-restore',
        'antidote', 'paralyze-heal', 'awakening', 'burn-heal', 'ice-heal', 'full-heal',
        'revive', 'max-revive',
        'ether', 'max-ether', 'elixir', 'max-elixir',
        'oran-berry', 'sitrus-berry', 'lum-berry',
        'fire-stone', 'water-stone', 'thunder-stone', 'leaf-stone', 'moon-stone', 'sun-stone',
        'shiny-stone', 'dusk-stone', 'dawn-stone',
        'protein', 'iron', 'calcium', 'zinc', 'carbos',
        // TMs (Gen 1)
        'tm01', 'tm02', 'tm03', 'tm04', 'tm05', 'tm06', 'tm07', 'tm08', 'tm09', 'tm10',
        'tm11', 'tm12', 'tm13', 'tm14', 'tm15', 'tm16', 'tm17', 'tm18', 'tm19', 'tm20',
        'tm21', 'tm22', 'tm23', 'tm24', 'tm25', 'tm26', 'tm27', 'tm28', 'tm29', 'tm30',
        'tm31', 'tm32', 'tm33', 'tm34', 'tm35', 'tm36', 'tm37', 'tm38', 'tm39', 'tm40',
        'tm41', 'tm42', 'tm43', 'tm44', 'tm45', 'tm46', 'tm47', 'tm48', 'tm49', 'tm50',
        // HMs (Gen 1)
        'hm01', 'hm02', 'hm03', 'hm04', 'hm05'
    ];

    console.log('\nDownloading items...');
    for (const item of items) {
        let url = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${item}.png`;
        
        // Special handling for TMs/HMs (fetch correct sprite URL from API)
        if (item.startsWith('tm') || item.startsWith('hm')) {
            try {
                const fetchedUrl = await new Promise((resolve) => {
                    https.get(`https://pokeapi.co/api/v2/item/${item}`, (res) => {
                        if (res.statusCode !== 200) {
                            resolve(null);
                            return;
                        }
                        let data = '';
                        res.on('data', chunk => data += chunk);
                        res.on('end', () => {
                            try {
                                const json = JSON.parse(data);
                                resolve(json.sprites.default);
                            } catch (e) {
                                resolve(null);
                            }
                        });
                    }).on('error', () => resolve(null));
                });
                
                if (fetchedUrl) {
                    url = fetchedUrl;
                }
            } catch (e) {
                console.warn(`Failed to fetch info for ${item}, using default URL.`);
            }
        }

        downloads.push(downloadFile(
            url,
            path.join(DIRS.items, `${item}.png`)
        ));
        
        // Throttle TMs slightly to avoid API rate limits
        if (item.startsWith('tm') || item.startsWith('hm')) {
            if (downloads.length >= 5) {
                await Promise.all(downloads);
                downloads.length = 0;
                process.stdout.write('.');
            }
        }
    }

    await Promise.all(downloads);
    console.log('\nAll downloads complete!');
}

main();
