export enum PokeDexEntryStatus {
    Unknown = 'Unknown',
    Seen = 'Seen',
    Caught = 'Caught'
}

export const PokeDex__GEN1 = 'GEN 1';


export interface PokeDexEntry {
    id: number;
    status: PokeDexEntryStatus;
}
