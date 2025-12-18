import React from 'react';
import './pokemonTypeIcon.css';

export type PokemonType = 
    | 'normal' | 'fire' | 'water' | 'grass' | 'electric' | 'ice' 
    | 'fighting' | 'poison' | 'ground' | 'flying' | 'psychic' 
    | 'bug' | 'rock' | 'ghost' | 'dragon' | 'steel' | 'fairy' 
    | 'dark';

interface PokemonTypeIconProps {
    type: PokemonType | string;
    size?: number;
    className?: string;
    variant?: 'circle' | 'text-badge'; // Option for different styles
}

const typeColors: Record<string, string> = {
    normal: '#A8A77A',
    fire: '#EE8130',
    water: '#6390F0',
    grass: '#7AC74C',
    electric: '#F7D02C',
    ice: '#96D9D6',
    fighting: '#C22E28',
    poison: '#A33EA1',
    ground: '#E2BF65',
    flying: '#A98FF3',
    psychic: '#F95587',
    bug: '#A6B91A',
    rock: '#B6A136',
    ghost: '#735797',
    dragon: '#6F35FC',
    steel: '#B7B7CE',
    dark: '#705746',
    fairy: '#D685AD',
};

const TypePaths: Record<string, React.ReactNode> = {
    normal: (
        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 18C8.69 18 6 15.31 6 12C6 8.69 8.69 6 12 6C15.31 6 18 8.69 18 12C18 15.31 15.31 18 12 18Z" fill="white"/>
    ),
    fire: (
        <path d="M12 23C7.03 23 3 18.97 3 14C3 9 12 1 12 1C12 1 21 9 21 14C21 18.97 16.97 23 12 23ZM12 18C13.1 18 14 17.1 14 16C14 14.9 13.1 14 12 14C10.9 14 10 14.9 10 16C10 17.1 10.9 18 12 18Z" fill="white"/>
    ),
    water: (
        <path d="M12 2C12 2 4 10 4 15C4 19.42 7.58 23 12 23C16.42 23 20 19.42 20 15C20 10 12 2 12 2ZM12 19C9.79 19 8 17.21 8 15C8 13.5 9 11 12 7C15 11 16 13.5 16 15C16 17.21 14.21 19 12 19Z" fill="white"/>
    ),
    grass: (
        <path d="M12 22C12 22 18 17 18 11C18 6 12 2 12 2C12 2 6 6 6 11C6 17 12 22 12 22ZM12 22V11" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    ),
    electric: (
        <path d="M7 14L13 2V11H18L11 23V14H7Z" fill="white"/>
    ),
    ice: (
        <path d="M12 2V22M2 12H22M5 5L19 19M5 19L19 5" stroke="white" strokeWidth="3" strokeLinecap="round"/>
    ),
    fighting: (
        <path d="M18 4H6C3.8 4 2 5.8 2 8V16C2 18.2 3.8 20 6 20H18C20.2 20 22 18.2 22 16V8C22 5.8 20.2 4 18 4ZM8 16C6.9 16 6 15.1 6 14C6 12.9 6.9 12 8 12C9.1 12 10 12.9 10 14C10 15.1 9.1 16 8 16ZM16 16C14.9 16 14 15.1 14 14C14 12.9 14.9 12 16 12C17.1 12 18 12.9 18 14C18 15.1 17.1 16 16 16Z" fill="white"/>
    ),
    poison: (
        <path d="M12 2C8 2 5 4 5 8C5 10.5 6.5 12.5 8.5 13.5C8.2 14.5 8 15.5 8 16.5V18H16V16.5C16 15.5 15.8 14.5 15.5 13.5C17.5 12.5 19 10.5 19 8C19 4 16 2 12 2ZM10 9C9.4 9 9 8.6 9 8C9 7.4 9.4 7 10 7C10.6 7 11 7.4 11 8C11 8.6 10.6 9 10 9ZM14 9C13.4 9 13 8.6 13 8C13 7.4 13.4 7 14 7C14.6 7 15 7.4 15 8C15 8.6 14.6 9 14 9Z" fill="white"/>
    ),
    ground: (
        <path d="M2 18H22M4 13H20M6 8H18" stroke="white" strokeWidth="3" strokeLinecap="round"/>
    ),
    flying: (
        <path d="M22 12C22 17.5 17.5 22 12 22C6.5 22 2 17.5 2 12C2 6.5 12 2 12 2C12 2 14 8 14 12C14 16 17 18 22 12Z" fill="white"/>
    ),
    psychic: (
        <path d="M12 4C7.6 4 4 7.6 4 12C4 16.4 7.6 20 12 20C16.4 20 20 16.4 20 12C20 7.6 16.4 4 12 4ZM12 17C9.2 17 7 14.8 7 12C7 9.2 9.2 7 12 7C14.8 7 17 9.2 17 12C17 14.8 14.8 17 12 17Z" fill="white"/>
    ),
    bug: (
        <path d="M12 3C9 3 7 5 7 8V10H5V12H7V14H5V16H7C7 19 9 21 12 21C15 21 17 19 17 16H19V14H17V12H19V10H17V8C17 5 15 3 12 3ZM10 14C9.4 14 9 13.6 9 13C9 12.4 9.4 12 10 12C10.6 12 11 12.4 11 13C11 13.6 10.6 14 10 14ZM14 14C13.4 14 13 13.6 13 13C13 12.4 13.4 12 14 12C14.6 12 15 12.4 15 13C15 13.6 14.6 14 14 14Z" fill="white"/>
    ),
    rock: (
        <path d="M12 2L4 8V16L12 22L20 16V8L12 2ZM12 18L7 14L12 10L17 14L12 18Z" fill="white"/>
    ),
    ghost: (
        <path d="M12 2C8 2 5 5 5 9V20L8 17L12 21L16 17L19 20V9C19 5 16 2 12 2ZM9 10C8.4 10 8 9.6 8 9C8 8.4 8.4 8 9 8C9.6 8 10 8.4 10 9C10 9.6 9.6 10 9 10ZM15 10C14.4 10 14 9.6 14 9C14 8.4 14.4 8 15 8C15.6 8 16 8.4 16 9C16 9.6 15.6 10 15 10Z" fill="white"/>
    ),
    dragon: (
        <path d="M12 2C5 4 2 9 2 9C2 14 6 22 12 22C18 22 22 14 22 9C22 9 19 4 12 2ZM12 16C9.8 16 8 14.2 8 12C8 9.8 9.8 8 12 8C14.2 8 16 9.8 16 12C16 14.2 14.2 16 12 16Z" fill="white"/>
    ),
    steel: (
        <path d="M12 2L19 6V18L12 22L5 18V6L12 2ZM12 8C9.8 8 8 9.8 8 12C8 14.2 9.8 16 12 16C14.2 16 16 14.2 16 12C16 9.8 14.2 8 12 8Z" fill="white"/>
    ),
    dark: (
        <path d="M12 2C11.2 2 10.5 2.1 9.7 2.3C11.7 3.6 13 5.8 13 8.5C13 12.6 9.6 16 5.5 16C4.8 16 4.1 15.9 3.4 15.7C4.9 19.4 8.6 22 12.9 22C17.9 22 22 17.9 22 12.9C22 6.9 17.5 2 12 2Z" fill="white"/>
    ),
    fairy: (
        <path d="M12 6C14 2 18 2 20 4C22 6 21 10 18 12C21 14 22 18 20 20C18 22 14 22 12 18C10 22 6 22 4 20C2 18 3 14 6 12C3 10 2 6 4 4C6 2 10 2 12 6Z" fill="white"/>
    ),
};

export const PokemonTypeIcon: React.FC<PokemonTypeIconProps> = ({ type, size = 24, className, variant = 'circle' }) => {
    const t = (type || 'normal');
    const color = typeColors[t] || '#A8A77A';
    const icon = TypePaths[t] || TypePaths['normal'];

    if (variant === 'text-badge') {
        return (
            <div 
                className={`pokemon-type-badge ${className || ''}`}
                style={{
                    backgroundColor: color,
                    '--icon-size': `${size}px`
                } as React.CSSProperties}
            >
                {t}
            </div>
        );
    }

    return (
        <div 
            className={`pokemon-type-icon ${className || ''}`}
            style={{
                backgroundColor: color,
                '--icon-size': `${size}px`
            } as React.CSSProperties}
            title={t}
        >
            <svg 
                width="75%" 
                height="75%" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
            >
                {icon}
            </svg>
        </div>
    );
};
