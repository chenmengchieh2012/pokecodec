export interface TrainerPokemon {
    id: number;
    level: number;
    name: string;
}

export interface TrainerDialog {
    intro: string;
    win: string;
    lose: string;
}

export interface TrainerData {
    id: string;
    title: string;
    name: string;
    description: string;
    specialty: string;
    badge: string;
    level: number;
    party: TrainerPokemon[];
    dialog: TrainerDialog;
}
