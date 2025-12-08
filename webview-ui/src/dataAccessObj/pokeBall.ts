import { ItemCategory, ItemDao } from './item';

export interface PokeBallDao extends ItemDao {
    category: ItemCategory;
    catchRateModifier: number;
}
