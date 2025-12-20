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
    variant?: 'circle' | 'text-badge';
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

// Custom SVG Paths for "Classic" look
const TypePaths: Record<string, React.ReactNode> = {
    normal: (
        <circle cx="12" cy="12" r="7" fill="currentColor" />
    ),
    fire: (
        <path d="M12 23C7.03 23 3 18.97 3 14C3 9 12 1 12 1C12 1 21 9 21 14C21 18.97 16.97 23 12 23ZM12 18C13.1 18 14 17.1 14 16C14 14.9 13.1 14 12 14C10.9 14 10 14.9 10 16C10 17.1 10.9 18 12 18Z" fill="currentColor"/>
    ),
    water: (
        <path d="M12 2C12 2 5 8 5 13C5 17 8 20 12 20C16 20 19 17 19 13C19 8 12 2 12 2Z" fill="currentColor"/>
    ),
    grass: (
        <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22L6.66 19.7C7.14 19.87 7.64 20 8 20C19 20 22 3 22 3C21 5 14 5.25 9 6.25C4 7.25 2 11.5 2 13.5C2 15.5 3.75 17.25 3.75 17.25C7 8 17 8 17 8Z" fill="currentColor"/>
    ),
    electric: (
        <path d="M7 2V11H3L13 22V13H17L7 2Z" fill="currentColor"/>
    ),
    ice: (
        <path d="M12 2L14 6L18 4L16 8L20 10L16 12L20 14L16 16L18 20L14 18L12 22L10 18L6 20L8 16L4 14L8 12L4 10L8 8L6 4L10 6L12 2Z" fill="currentColor"/>
    ),
    fighting: (
        <path d="M20 11H13V7H20M20 15H13V19H20M20 3H13V7H20M7 3H2V21H7V3Z" fill="currentColor"/>
    ),
    poison: (
        <path d="M12 2C8 2 5 5 5 9C5 11.38 6.19 13.47 8 14.74V17A1 1 0 0 0 9 18H15A1 1 0 0 0 16 17V14.74C17.81 13.47 19 11.38 19 9C19 5 16 2 12 2M10 19H14V21H10V19Z" fill="currentColor"/>
    ),
    ground: (
        <path d="M14 6L10.25 11L13.1 14.8L11.5 16C9.81 13.75 7 10 7 10L1 18H23L14 6Z" fill="currentColor"/>
    ),
    flying: (
        <path d="M22 16V4C22 4 10 2 5 10C5 10 15 12 15 16C15 16 8 16 8 16C8 16 14 18 14 20C14 20 10 20 10 20C10 20 15 22 15 22L22 16Z" fill="currentColor"/>
    ),
    psychic: (
        <path d="M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5M12 17A5 5 0 0 1 7 12A5 5 0 0 1 12 7A5 5 0 0 1 17 12A5 5 0 0 1 12 17M12 9A3 3 0 0 0 9 12A3 3 0 0 0 12 15A3 3 0 0 0 15 12A3 3 0 0 0 12 9Z" fill="currentColor"/>
    ),
    bug: (
        <path d="M12 2C9 2 7 4 7 7C7 8 7.2 9 7.5 10H5V12H8.2C8.6 13.5 9.6 14.7 11 15.4V19H6V21H11V23H13V21H18V19H13V15.4C14.4 14.7 15.4 13.5 15.8 12H19V10H16.5C16.8 9 17 8 17 7C17 4 15 2 12 2M12 4C13.7 4 15 5.3 15 7C15 8.7 13.7 10 12 10C10.3 10 9 8.7 9 7C9 5.3 10.3 4 12 4Z" fill="currentColor"/>
    ),
    rock: (
        <path d="M5 19H19V17H5V19M5 15H19V13H5V15M5 11H19V9H5V11M5 7H19V5H5V7Z" fill="currentColor"/>
    ),
    ghost: (
        <path d="M12 2A9 9 0 0 0 3 11C3 14.03 4.53 16.74 6.9 18.35L6 22L9 21L12 22L15 21L18 22L17.1 18.35C19.47 16.74 21 14.03 21 11A9 9 0 0 0 12 2M12 15C10.5 15 9.25 14 9.25 14C9.25 14 10.5 13 12 13C13.5 13 14.75 14 14.75 14C14.75 14 13.5 15 12 15M9 10A1.5 1.5 0 1 1 10.5 8.5A1.5 1.5 0 0 1 9 10M15 10A1.5 1.5 0 1 1 16.5 8.5A1.5 1.5 0 0 1 15 10Z" fill="currentColor"/>
    ),
    dragon: (
        <path d="M12 2C12 2 16 6 16 10C16 14 12 18 12 18C12 18 8 14 8 10C8 6 12 2 12 2M12 22C12 22 18 18 18 14C18 10 12 6 12 6C12 6 6 10 6 14C6 18 12 22 12 22Z" fill="currentColor"/>
    ),
    steel: (
        <path d="M12 2L20.66 7V17L12 22L3.34 17V7L12 2M12 7A5 5 0 1 0 17 12A5 5 0 0 0 12 7Z" fill="currentColor"/>
    ),
    dark: (
        <path d="M12 2A10 10 0 1 0 22 12A10 10 0 0 1 12 2Z" fill="currentColor"/>
    ),
    fairy: (
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/>
    ),
};

export const PokemonTypeIcon: React.FC<PokemonTypeIconProps> = ({ 
    type, 
    size = 14, 
    className,
    variant = 'circle' 
}) => {
    const t = type.toLowerCase();
    const color = typeColors[t] || '#777';
    const iconPath = TypePaths[t] || TypePaths['normal'];

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
                width: size,
                height: size,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                color: 'white'
            } as React.CSSProperties}
            title={t}
        >
            <svg 
                width="60%" 
                height="60%" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
            >
                {iconPath}
            </svg>
        </div>
    );
};
