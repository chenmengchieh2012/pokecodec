
export interface UserDao {
    money: number;
    autoEncounter: boolean;
    name?: string;
    starter?: 'pikachu' | 'eevee';
    playtime?: number;
}
