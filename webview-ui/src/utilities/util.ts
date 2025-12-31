

import { resolveAssetUrl } from "./vscode";


export const getBallUrl = (ballName: string = 'poke-ball') => {
    const nameMap: { [key: string]: string } = {
        'poke-ball': 'poke-ball',
        'great-ball': 'great-ball',
        'ultra-ball': 'ultra-ball',
        'master-ball': 'master-ball',
        'safari-ball': 'safari-ball',
        'net-ball': 'net-ball',
        'dive-ball': 'dive-ball',
        'nest-ball': 'nest-ball',
        'repeat-ball': 'repeat-ball',
        'timer-ball': 'timer-ball',
        'luxury-ball': 'luxury-ball',
        'premier-ball': 'premier-ball'
    };

    const mappedName = nameMap[ballName];
    if (mappedName) {
        return resolveAssetUrl(`./sprites/items/${mappedName}.png`);
    } else {
        return resolveAssetUrl(`./sprites/items/poke-ball.png`);
    }
};

export const CapitalizeFirstLetter = (str: string) => {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
};