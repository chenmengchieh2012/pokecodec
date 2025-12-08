

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
        return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${mappedName}.png`;
    } else {
        return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png`;
    }
};