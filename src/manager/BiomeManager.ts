import * as vscode from 'vscode';
import { SequentialExecutor } from '../utils/SequentialExecutor'; 
import { UserDao } from '../dataAccessObj/userData';
import GlobalStateKey from '../utils/GlobalStateKey';
import { BiomeData, BiomeType } from '../dataAccessObj/BiomeData';
import { BIOME_GROUPS } from '../utils/KantoPokemonCatchRate';
import { EncounterHandler, EncounterHandlerMethods, EncounterResult } from '../core/EncounterHandler';

export class BiomeDataManager {
    private static instance: BiomeDataManager;
    // 記憶體快取 (只供讀取與 UI 顯示)
    private biomeData: BiomeData = { biomeType: BiomeType.Grassland, pokemonTypes: BIOME_GROUPS[ BiomeType.Grassland ] };
    private currentFilePath: string = "";
    private encounterHandler: EncounterHandlerMethods = EncounterHandler((path) => vscode.workspace.asRelativePath(path));
    private context: vscode.ExtensionContext;

    private saveQueue = new SequentialExecutor();

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public static getInstance(): BiomeDataManager {
        if (!BiomeDataManager.instance) {
            throw new Error("BiomeDataManager not initialized. Call initialize() first.");
        }
        return BiomeDataManager.instance;
    }

    public static initialize(context: vscode.ExtensionContext): BiomeDataManager {
        BiomeDataManager.instance = new BiomeDataManager(context);
        return BiomeDataManager.instance;
    }


    public getBiomeData(): BiomeData {
        return { ...this.biomeData }; // 回傳複製品以防外部修改
    }

    public handleOnChangeBiome(filePath: string): BiomeData {
        const biomeData = this.encounterHandler.getBiome(filePath);
        this.performTransaction(() => {
            const currentFilePath = filePath;
            return {biomeData: biomeData, currentFilePath: currentFilePath};
        });
        return biomeData;
    }

    public async getEncountered(): Promise<EncounterResult> {
        return await this.encounterHandler.calculateEncounter(this.currentFilePath);
    }

    /**
     * 通用交易處理器
     */
    private async performTransaction(modifier: () => { biomeData: BiomeData; currentFilePath: string }): Promise<void> {
        await this.saveQueue.execute(async () => {
            // 2. 執行修改
            const newData = modifier();
            // 4. 更新記憶體快取
            // console.log(`[BiomeDataManager] Biome changed to type ${newData.biomeData.biomeType}`);
            this.biomeData = newData.biomeData;
            this.currentFilePath = newData.currentFilePath;
            // console.log(`[BiomeDataManager] setting finish ${this.biomeData.biomeType}`);
            
        });
    }


}