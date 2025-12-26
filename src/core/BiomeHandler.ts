import * as vscode from 'vscode';
import { SequentialExecutor } from '../utils/SequentialExecutor';
import { UserDao } from '../dataAccessObj/userData';
import GlobalStateKey from '../utils/GlobalStateKey';
import { BiomeData, BiomeType } from '../dataAccessObj/BiomeData';
import { BIOME_GROUPS } from '../utils/KantoPokemonCatchRate';
import { EncounterHandler, EncounterHandlerMethods, EncounterResult } from './EncounterHandler';
import { UserDaoManager } from '../manager/userDaoManager';
import { DifficultyManager } from '../manager/DifficultyManager';

export class BiomeDataHandler {
    private static instance: BiomeDataHandler;
    // 記憶體快取 (只供讀取與 UI 顯示)
    private biomeData: BiomeData = { biomeType: BiomeType.Grassland, pokemonTypes: BIOME_GROUPS[BiomeType.Grassland] };
    private currentFilePath: string = "";
    private encounterHandler: EncounterHandlerMethods = EncounterHandler((path) => vscode.workspace.asRelativePath(path));
    private context: vscode.ExtensionContext;
    private userDaoManager: UserDaoManager | undefined;
    private difficultyManager: DifficultyManager | undefined;


    // 使用 EventEmitter 來支援多個監聽者
    private _onDidChangeBiome = new vscode.EventEmitter<void>();
    public readonly onDidChangeBiome = this._onDidChangeBiome.event;

    private saveQueue = new SequentialExecutor();

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public static getInstance(): BiomeDataHandler {
        if (!BiomeDataHandler.instance) {
            throw new Error("BiomeDataHandler not initialized. Call initialize() first.");
        }
        return BiomeDataHandler.instance;
    }

    public static initialize(context: vscode.ExtensionContext, userDaoManager: UserDaoManager, difficultyManager: DifficultyManager): BiomeDataHandler {
        BiomeDataHandler.instance = new BiomeDataHandler(context);
        BiomeDataHandler.instance.userDaoManager = userDaoManager;
        BiomeDataHandler.instance.difficultyManager = difficultyManager;
        // 註冊事件監聽器
        context.subscriptions.push(
            vscode.window.onDidChangeActiveTextEditor(async (editor) => {
                if (editor) {
                    const filePath = editor.document.fileName;
                    await BiomeDataHandler.instance.handleOnChangeBiome(filePath);
                }
            })
        );

        return BiomeDataHandler.instance;
    }

    public async checkActiveEditor() {
        console.log("[BiomeDataHandler] Checking active editor for biome", vscode.window.activeTextEditor);
        if (vscode.window.activeTextEditor) {
            console.log("[BiomeDataHandler] Checking active editor for biome");
            const filePath = vscode.window.activeTextEditor.document.fileName;
            await this.handleOnChangeBiome(filePath);
        }
    }


    public getBiomeData(): BiomeData {
        return { ...this.biomeData }; // 回傳複製品以防外部修改
    }

    public async handleOnChangeBiome(filePath: string): Promise<BiomeData> {
        const biomeData = this.encounterHandler.getBiome(filePath);
        await this.performTransaction(() => {
            const currentFilePath = filePath;
            return { biomeData: biomeData, currentFilePath: currentFilePath };
        });
        return biomeData;
    }

    public async getEncountered(): Promise<EncounterResult | undefined> {
        const playingTime = this.userDaoManager?.getUserInfo().playtime || 0;
        if (!this.difficultyManager) {
            throw new Error("DifficultyManager not initialized in BiomeDataHandler.");
        }
        return await this.encounterHandler.calculateEncounter(this.difficultyManager,this.currentFilePath, playingTime);
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
            const lastBiomeType = this.biomeData.biomeType;
            this.biomeData = newData.biomeData;
            this.currentFilePath = newData.currentFilePath;

            if (newData.biomeData.biomeType !== lastBiomeType) {
                this._onDidChangeBiome.fire();
            }
            // console.log(`[BiomeDataManager] setting finish ${this.biomeData.biomeType}`);

        });
    }

    public dispose() {
        this._onDidChangeBiome.dispose();
    }
}