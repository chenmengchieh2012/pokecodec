import * as vscode from 'vscode';
import { BiomeDataHandler } from './core/BiomeHandler';
import { PokemonFactory } from './core/CreatePokemonHandler';
import { GitActivityHandler } from './core/GitActivityHandler';
import { SessionHandler } from './core/SessionHandler';
import itemData from './data/items.json';
import { GameState } from './dataAccessObj/GameState';
import { ItemDao } from './dataAccessObj/item';
import { MessageType } from './dataAccessObj/messageType';
import { PokemonDao } from './dataAccessObj/pokemon';
import {
    AddItemPayload,
    AddToPartyPayload,
    BatchMoveToBoxPayload,
    CatchPayload,
    CommandHandler,
    DeletePokemonPayload,
    EvolvePokemonPayload,
    GetPokeDexPayload,
    HandlerContext,
    RemoveFromPartyPayload,
    RemoveItemPayload,
    ReorderBoxPayload,
    ReorderPartyPayload,
    SetAutoEncounterPayload,
    SetGameStateDataPayload,
    UpdateDefenderPokemonUidPayload,
    UpdateOpponentsInPartyPayload,
    UpdateMoneyPayload,
    UpdatePartyPokemonPayload,
    UpdatePokeDexPayload,
    UseItemPayload,
    UseMedicineInBagPayload,
    GoTriggerEncounterPayload,
    UpdateOpponentPokemonUidPayload,
    SetDDAEnabledPayload,
    SetDifficultyLevelPayload,
    RecordEncounterPayload,
    SetDeviceLockPayload,
    VerifyTwoFactorPayload
} from './handler';
import { AchievementManager } from './manager/AchievementManager';
import { BagManager } from './manager/bagsManager';
import { GameStateManager } from './manager/gameStateManager';
import { JoinPokemonManager } from './manager/joinPokemonManager';
import { PokemonBoxManager } from './manager/pokeBoxManager';
import { PokeDexManager } from './manager/pokeDexManager';
import { UserDaoManager } from './manager/userDaoManager';
import { RecordBattleActionPayload, RecordBattleCatchPayload, RecordBattleFinishedPayload, RecordItemActionPayload } from './utils/AchievementCritiria';
import { DifficultyManager } from './manager/DifficultyManager';
import { SessionLockManager } from './manager/SessionLockManager';
import { TwoFACertificate } from './utils/TwoFACertificate';
import { DeviceBindState } from './dataAccessObj/DeviceBindState';
import { setGlobalStateEnvPrefix } from './utils/GlobalStateKey';

const itemDataMap = itemData as unknown as Record<string, ItemDao>;

export async function activate(context: vscode.ExtensionContext) {
    // 在 activate 函式一開始執行
    setGlobalStateEnvPrefix(context.extensionMode === vscode.ExtensionMode.Production);

    // 🔥 清除所有全域儲存 (測試用)
    // context.globalState.keys().forEach(key => {
    //     context.globalState.update(key, undefined);
    // });

    // 🔥 修改點 1: 改成註冊 "WebviewViewProvider" (這是給側邊欄用的)
    // 'pokemonReact' 必須跟 package.json 裡的 view id 一樣

    // 明確初始化所有 Manager (Singletons)
    const pokemonBoxManager = PokemonBoxManager.initialize(context);
    const pokeDexManager = PokeDexManager.initialize(context);
    const partyManager = JoinPokemonManager.initialize(context);
    const bagManager = BagManager.initialize(context);
    const userDaoManager = UserDaoManager.initialize(context);
    const gameStateManager = GameStateManager.initialize(context);
    const achievementManager = AchievementManager.initialize(context);
    const difficultyManager = DifficultyManager.initialize(context);
    context.subscriptions.push(difficultyManager);
    
    const gameStateData = gameStateManager.getGameStateData();
    if (gameStateData.state !== GameState.Searching) {
        console.log("[Activate] Non-searching game state detected on activation:", gameStateData.state);
        // 強制重設遊戲狀態為 Searching，避免因為開發中斷而卡在其他狀態
        // 但可能切換畫面時會有問題，所以先註解掉
        // 所以要做deep check
        if(gameStateData.state === GameState.Battle){
            let isVaild = true
            // 進行戰鬥狀態資料合法性檢查
            const party = partyManager.getAll();
            // 1. 檢查隊伍ID 是否存在
            const defenderPokemonUid = gameStateData.defenderPokemonUid;
            const opponentPokemonUid = gameStateData.opponentPokemonUid;
            if(!defenderPokemonUid || !opponentPokemonUid){
                console.log("[Activate] Invalid battle state detected: Missing defender or opponent Pokemon UID. Resetting to Searching state.");
                isVaild = false;
            }
            // 2. 檢查隊伍中是否有對應的寶可夢
            const defenderPokemon = party.find(p => p.uid === defenderPokemonUid);
            if(!defenderPokemon){
                console.log("[Activate] Invalid battle state detected: Defender Pokemon not found in party. Resetting to Searching state.");
                isVaild = false;
            }
            const opponentPokemon = gameStateData.opponentParty?.find(p => p.uid === opponentPokemonUid);
            if(!opponentPokemon){
                console.log("[Activate] Invalid battle state detected: Opponent Pokemon not found in opponent party. Resetting to Searching state.");
                isVaild = false;
            }
            // 3. 檢查雙方寶可夢是否有血量
            if(defenderPokemon && defenderPokemon.currentHp <= 0){
                console.log("[Activate] Invalid battle state detected: Defender Pokemon has 0 HP. Resetting to Searching state.");
                await partyManager.update([{...defenderPokemon, ailment:'fainted'}])
                isVaild = false;
            }
            if(opponentPokemon && opponentPokemon.currentHp <= 0){
                console.log("[Activate] Invalid battle state detected: Opponent Pokemon has 0 HP. Resetting to Searching state.");
                isVaild = false;
            }

            // 根據檢查結果決定是否重設狀態
            if(!isVaild){
                await gameStateManager.updateGameState(GameState.Searching, {});
            }
        }
    }

    // Initialize Biome Data Handler
    const biomeHandler = BiomeDataHandler.initialize(context, userDaoManager, difficultyManager);
    context.subscriptions.push(biomeHandler);

    // Initialize Session Handler
    const sessionHandler = SessionHandler.initialize(context);
    context.subscriptions.push(sessionHandler);

    // Initialize Git Activity Handler
    const gitHandler = GitActivityHandler.getInstance();
    gitHandler.initialize();
    context.subscriptions.push(gitHandler);

    // Initialize Session Lock Manager
    const sessionLockManager = SessionLockManager.getInstance(context);
    await sessionLockManager.start();
    context.subscriptions.push(sessionLockManager);

    const gameProvider = new PokemonViewProvider({ extensionUri: context.extensionUri, viewType: 'game', context });
    const backpackProvider = new PokemonViewProvider({ extensionUri: context.extensionUri, viewType: 'backpack', context });
    const computerProvider = new PokemonViewProvider({ extensionUri: context.extensionUri, viewType: 'computer', context });
    const shopProvider = new PokemonViewProvider({ extensionUri: context.extensionUri, viewType: 'shop', context });

    // 🔥 首次安裝時執行重置
    const isFirstRun = context.globalState.get('isFirstRun', true);
    if (isFirstRun) {
        await context.globalState.update('isFirstRun', false);
        if(await achievementManager.checkDbEmpty()){
            console.log('[Activate] First run detected: Achievement database is empty. Initializing achievement statistics.');
            await achievementManager.clear();
        }
        if(await difficultyManager.checkDbEmpty()){
            await difficultyManager.clear();
        }
        if(await pokeDexManager.checkDbEmpty()){
            await pokeDexManager.clear();
        }
        if(await userDaoManager.checkDbEmpty()){
            await userDaoManager.clear();
        }
    }

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('pokemonReact', gameProvider),
        vscode.window.registerWebviewViewProvider('pokemonBackpack', backpackProvider),
        vscode.window.registerWebviewViewProvider('pokemonComputer', computerProvider),
        vscode.window.registerWebviewViewProvider('pokemonShop', shopProvider),

    );

    // 🔥 新增指令：重置儲存
    context.subscriptions.push(
        vscode.commands.registerCommand('pokemon.resetStorage', () => {
            gameProvider.resetStorage();
        })
    );


    // 🔥 新增指令：解鎖裝置
    context.subscriptions.push(
        vscode.commands.registerCommand('pokemon.unlockDevice', async () => {
            await gameProvider.unlockDevice();
            vscode.window.showInformationMessage('Device has been unlocked.');
        })
    );

    // 🔥 新增指令：綁定裝置
    context.subscriptions.push(
        vscode.commands.registerCommand('pokemon.bindDevice', async () => {
            await gameProvider.bindDevice();
        })
    );

    // 🔥 新增指令：匯入綁定碼
    context.subscriptions.push(
        vscode.commands.registerCommand('pokemon.importBindCode', async () => {
            await gameProvider.importBindCode();
        })
    );

    // 🔥 新增指令：下載並匯入 Party
    context.subscriptions.push(
        vscode.commands.registerCommand('pokemon.downloadAndImportParty', async () => {
            const filename = await vscode.window.showInputBox({
                placeHolder: 'Enter filename (e.g. party.txt)',
                prompt: 'Download and Import Party from Gist'
            });
            if (filename) {
                await gameProvider.downloadAndImportParty(filename);
            }
        })
    );

    // 🔥 新增指令：列印難度歷史
    context.subscriptions.push(
        vscode.commands.registerCommand('pokemon.printDifficultyHistory', () => {
            const history = DifficultyManager.getInstance().getHistory();
            const channel = vscode.window.createOutputChannel("Pokemon Difficulty History");
            channel.clear();
            channel.appendLine(JSON.stringify(history, null, 2));
            channel.show();
        })
    );


    // 🔥 新增指令：列印成就
    context.subscriptions.push(
        vscode.commands.registerCommand('pokecodec.printAchievementStats', () => {
            const stats = achievementManager.getStatistics();
            console.log('Achievement Statistics:', JSON.stringify(stats, null, 2));
            vscode.window.showInformationMessage(`Achievement Stats printed to console.`);
        })
    );

}


interface PokemonViewProviderOptions {
    extensionUri: vscode.Uri;
    viewType: string;
    context: vscode.ExtensionContext;
}

// 🔥 修改點 2: 建立一個 Provider 類別來管理側邊欄
class PokemonViewProvider implements vscode.WebviewViewProvider {

    private static providers: PokemonViewProvider[] = [];
    private _view?: vscode.WebviewView;
    private pokemonBoxManager: PokemonBoxManager;
    private partyManager: JoinPokemonManager;
    private bagManager: BagManager;
    private userDaoManager: UserDaoManager;
    private pokeDexManager: PokeDexManager;
    private commandHandler: CommandHandler;
    private gameStateManager: GameStateManager;
    private achievementManager: AchievementManager;
    private difficultyManager: DifficultyManager;
    private sessionLockManager: SessionLockManager;
    private biomeHandler: BiomeDataHandler;

    private gitHandler: GitActivityHandler;
    private sessionHandler: SessionHandler;

    private _context: vscode.ExtensionContext;
    private _extensionUri: vscode.Uri;
    private _viewType: string;

    constructor(
        private readonly options: PokemonViewProviderOptions,
    ) {
        const { extensionUri, viewType, context: _context } = options;
        this.pokemonBoxManager = PokemonBoxManager.getInstance();
        this.partyManager = JoinPokemonManager.getInstance();
        this.bagManager = BagManager.getInstance();
        this.userDaoManager = UserDaoManager.getInstance();
        this.gameStateManager = GameStateManager.getInstance();
        this.pokeDexManager = PokeDexManager.getInstance();
        this.achievementManager = AchievementManager.getInstance();
        this.biomeHandler = BiomeDataHandler.getInstance();
        this.gitHandler = GitActivityHandler.getInstance();
        this.sessionHandler = SessionHandler.getInstance();
        this.difficultyManager = DifficultyManager.getInstance();
        this.sessionLockManager = SessionLockManager.getInstance();
        this._extensionUri = extensionUri;
        this._viewType = viewType;
        this._context = _context;
        this.commandHandler = new CommandHandler(
            this.pokemonBoxManager,
            this.bagManager,
            this.userDaoManager,
            this.gameStateManager,
            this.partyManager,
            this.biomeHandler,
            this.pokeDexManager,
            this.achievementManager,
            this.difficultyManager,
            this.sessionLockManager,
            this._context
        );
        PokemonViewProvider.providers.push(this);

        // Initialize HandlerContext immediately
        const handlerContext: HandlerContext = {
            postMessage: (msg: unknown) => this._view?.webview.postMessage(msg),
            updateAllViews: () => PokemonViewProvider.providers.forEach(p => p.updateViews()),
            updateAchievementsView: () => {
                this.commandHandler.achievementCommandHandler.handleGetAchievements();
            },
            isViewVisible: () => this._view?.visible ?? false
        };
        this.commandHandler.setHandlerContext(handlerContext);

        // 使用新的事件監聽方式
        this.gitHandler.onDidProcessCommit(() => {
            // 只有當 View 可見時才更新，避免不必要的資源浪費
            if (this._view?.visible && this.gameStateManager.getGameStateData()?.state === GameState.Searching) {
                this.updateViews();
            }
        });

        this.biomeHandler.onDidChangeBiome(() => {
            if (this._viewType !== 'game') {
                return;
            }
            if (this.gameStateManager.getGameStateData()?.state === GameState.Searching) {
                this.commandHandler.battleCommandHandler.handleGetBiomeData();
            }
        });

        this.userDaoManager.onDidAddingPlayingTime(() => {
            this.commandHandler.handleGetUserInfo();

            if (this._viewType !== 'game') {
                return;
            }

            if (this.userDaoManager.getUserInfo().autoEncounter === true &&
                this.gameStateManager.getGameStateData().state === GameState.Searching &&
                this.partyManager.getAll().length > 0 &&
                this.partyManager.getAll().some(p => p.currentHp > 0)) {
                    if(this.sessionLockManager.isLockedByMe() === false){
                        console.log('[Extension] Auto Encounter skipped: Session is locked by another instance.');
                        return;
                    }

                    if(this.partyManager.isDeviceLocked()){
                        console.log('[Extension] Auto Encounter skipped: Device is locked.');
                        return;
                    }

                    const randomEncounterChance = Math.random();
                    // MARK: TEST 100% 機率觸發隨機遭遇

                    const isProduction = this._context.extensionMode === vscode.ExtensionMode.Production;
                    const chanceThreshold = isProduction ? 0.2 : 1.0;
                    if (randomEncounterChance < chanceThreshold) { // 20% 機率觸發隨機遭遇
                        this.commandHandler.battleCommandHandler.handleWildTriggerEncounter();
                    }
            }
        });

        this.difficultyManager.onDidRecordEncounter(() => {
            if (this._view?.visible) {
                this.commandHandler.difficultyCommandHandler.handleGetDifficultyModifiers();
            }
        });
    }

    public updateViews() {
        if (this._view) {
            this.commandHandler.pokemonCommandHandler.handleGetParty();
            this.commandHandler.pokemonCommandHandler.handleGetCurrentBox();
            this.commandHandler.itemCommandHandler.handleGetBag();
            this.commandHandler.handleGetUserInfo();
            this.commandHandler.battleCommandHandler.handleGetGameStateData();
            this.commandHandler.achievementCommandHandler.handleGetCurrentPokeDex();
            this.commandHandler.achievementCommandHandler.handleGetAchievements();
            this.commandHandler.battleCommandHandler.handleGetBiomeData();
            this.commandHandler.difficultyCommandHandler.handleGetDifficultyLevel();
            this.commandHandler.deviceBindCommandHandler.handleGetDeviceBindState();
        }
    }

    public async resetStorage() {
        this.sessionHandler.clear();
        await this.bagManager.clear();
        await this.userDaoManager.clear();
        await this.partyManager.clear();
        await this.pokemonBoxManager.clear();
        await this.gameStateManager.clear();
        await this.pokeDexManager.clear();
        await this.achievementManager.clear();
        await this.difficultyManager.clear();
        const isProduction = this._context.extensionMode === vscode.ExtensionMode.Production;
        if (!isProduction) {

            // full two box starter to party
            // 避免一次 await 太多次，改用 Promise.all 或分批處理
            const promises = [];
            for (let i = 0; i < PokemonBoxManager.getMaxBoxCapacity() * 2; i++) {
                promises.push((async () => {
                    let debugPokemon = await PokemonFactory.createWildPokemonInstance({
                        pokemonId: Math.floor(Math.random() * 150) + 1,
                        nameZh: '',
                        nameEn: '',
                        minDepth: 0,
                        encounterRate: 0
                    }, this.difficultyManager, 'test/file/path', undefined);
                    await this.pokemonBoxManager.add(debugPokemon);
                })());
            }
            await Promise.all(promises);

            // MARK: TEST all TM
            const allTMItems = Object.values(itemDataMap).filter(item => item.apiName.startsWith('tm'));
            console.log('[ResetStorage] Adding all TM items:', allTMItems.map(i => i.apiName));
            // 使用 Promise.all 等待所有 TM 加入完成
            await Promise.all(allTMItems.map(async (tmItem) => {
                await this.bagManager.add(tmItem, 1);
            }));

            // MARK: TEST difficult
            // const maxLevel = 8;
            // for (let level = 1; level <= maxLevel; level++) {
            //     await this.difficultyManager.unlockNextLevel();
            // }
        }

        vscode.window.showInformationMessage('Global storage 已重置！');
        PokemonViewProvider.providers.forEach(p => {
            p.updateViews();
            p._view?.webview.postMessage({
                type: MessageType.Reset
            });
        });
         
    }

    public async unlockDevice() {
        const currentLockId = this.partyManager.getDeviceBindState().lockId;
        await this.partyManager.unlock(currentLockId);
        PokemonViewProvider.providers.forEach(p => p.updateViews());
    }

    public async bindDevice() {
        await this.commandHandler.deviceBindCommandHandler.handleGetBindCode();
    }

    public async importBindCode() {
        await this.commandHandler.deviceBindCommandHandler.handleImportBindCode();
    }

    public async downloadAndImportParty(filename: string) {
        await this.commandHandler.deviceBindCommandHandler.handleDownloadAndImportParty(filename);
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        // 畫面開啟時，檢查當前編輯器的 Biome
        this.biomeHandler.checkActiveEditor();



        // 當 View 變為可見時，立即更新資料
        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                this.updateViews();
                this.commandHandler.handleSessionStatus();
            }
        });

        // 監聽 Session Lock 狀態變化
        this.sessionLockManager.onDidLockStatusChange((isLocked) => {
            if (webviewView.visible) {
                this.commandHandler.handleSessionStatus();
            }
        });

        // 設定 Webview 選項
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this._extensionUri, "out"),
                vscode.Uri.joinPath(this._extensionUri, "webview-ui/build")
            ]
        };

        // 設定 HTML 內容
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // 處理來自 React 的訊息
        webviewView.webview.onDidReceiveMessage(async message => {
            console.log("[Extension] Received message:", message);

            if (message.command === MessageType.ResetStorage) {
                await this.commandHandler.handleResetStorage(() => this.resetStorage());
            }
            if (message.command === MessageType.Catch) {
                await this.commandHandler.pokemonCommandHandler.handleCatch(message as CatchPayload);
            }
            if (message.command === MessageType.GetBox) {
                this.commandHandler.pokemonCommandHandler.handleGetBox((message as any).boxIndex);
            }
            if (message.command === MessageType.DeletePokemon) {
                await this.commandHandler.pokemonCommandHandler.handleDeletePokemon(message as DeletePokemonPayload);
            }
            if (message.command === MessageType.ReorderBox) {
                await this.commandHandler.pokemonCommandHandler.handleReorderBox(message as ReorderBoxPayload);
            }
            if (message.command === MessageType.ReorderParty) {
                await this.commandHandler.pokemonCommandHandler.handleReorderParty(message as ReorderPartyPayload);
            }
            if (message.command === MessageType.BatchMoveToBox) {
                await this.commandHandler.pokemonCommandHandler.handleBatchMoveToBox(message as BatchMoveToBoxPayload);
            }
            if (message.command === MessageType.GetParty) {
                this.commandHandler.pokemonCommandHandler.handleGetParty();
            }
            if (message.command === MessageType.AddToParty) {
                await this.commandHandler.pokemonCommandHandler.handleAddToParty(message as AddToPartyPayload);
            }
            if (message.command === MessageType.RemoveFromParty) {
                await this.commandHandler.pokemonCommandHandler.handleRemoveFromParty(message as RemoveFromPartyPayload);
            }
            if (message.command === MessageType.UpdatePartyPokemon) {
                await this.commandHandler.pokemonCommandHandler .handleUpdatePartyPokemon(message as UpdatePartyPokemonPayload);
            }

            if (message.command === MessageType.EvolvePokemon) {
                await this.commandHandler.pokemonCommandHandler.handleEvolvePokemon(message as EvolvePokemonPayload);
            }

            if (message.command === MessageType.SelectStarter) {
                await this.commandHandler.pokemonCommandHandler.handleSelectStarter(message as any);
            }

            if (message.command === MessageType.GetDeviceBindState) {
                this.commandHandler.deviceBindCommandHandler.handleGetDeviceBindState();
            }
            if (message.command === MessageType.SetDeviceLock) {
                await this.commandHandler.deviceBindCommandHandler.handleSetDeviceLock(message as SetDeviceLockPayload);
            }

            if (message.command === MessageType.GetBag) {
                this.commandHandler.itemCommandHandler.handleGetBag();
            }
            if (message.command === MessageType.UseMedicineInBag) {
                await this.commandHandler.itemCommandHandler.handleUseMedicineInBag(message as UseMedicineInBagPayload);
            }
            if (message.command === MessageType.UseItem) {
                await this.commandHandler.itemCommandHandler.handleUseItem(message as UseItemPayload);
            }
            if (message.command === MessageType.AddItem) {
                await this.commandHandler.itemCommandHandler.handleAddItem(message as AddItemPayload);
            }
            if (message.command === MessageType.RemoveItem) {
                await this.commandHandler.itemCommandHandler.handleRemoveItem(message as RemoveItemPayload);
            }
            if (message.command === MessageType.GetUserInfo) {
                this.commandHandler.handleGetUserInfo();
            }
            if (message.command === MessageType.UpdateMoney) {
                await this.commandHandler.handleUpdateMoney(message as UpdateMoneyPayload);
            }
            if (message.command === MessageType.SetAutoEncounter) {
                await this.commandHandler.battleCommandHandler.handleSetAutoEncounter(message as SetAutoEncounterPayload);
            }
            if (message.command === MessageType.SetGameStateData) {
                await this.commandHandler.battleCommandHandler.handleSetGameStateData(message as SetGameStateDataPayload);
            }
            if (message.command === MessageType.GetGameStateData) {
                this.commandHandler.battleCommandHandler.handleGetGameStateData();
            }
            if (message.command === MessageType.UpdateOpponentsInParty) {
                await this.commandHandler.battleCommandHandler.handleUpdateOpponentsInParty(message as UpdateOpponentsInPartyPayload);
            }
            if (message.command === MessageType.UpdateDefenderPokemonUid) {
                await this.commandHandler.battleCommandHandler.handleUpdateDefenderPokemonUid(message as UpdateDefenderPokemonUidPayload);
            }

            if (message.command === MessageType.UpdateOpponentPokemonUid) {
                await this.commandHandler.battleCommandHandler.handleUpdateOpponentPokemonUid(message as UpdateOpponentPokemonUidPayload);
            }

            if (message.command === MessageType.GetPokeDex) {
                this.commandHandler.achievementCommandHandler.handleGetPokeDex(message as GetPokeDexPayload);
            }

            if (message.command === MessageType.UpdatePokeDex) {
                await this.commandHandler.achievementCommandHandler.handleUpdatePokeDex(message as UpdatePokeDexPayload);
            }


            if (message.command === MessageType.GoTriggerEncounter) {
                if (this.gameStateManager.getGameStateData()?.state === GameState.Searching) {
                    if (message.triggerType === 'wild') {
                        await this.commandHandler.battleCommandHandler.handleWildTriggerEncounter();
                    } else if (message.triggerType === 'npc') {
                        await this.commandHandler.battleCommandHandler.handleNPCTriggerEncounter();
                    }
                }
            }

            // Difficulty
            if (message.command === MessageType.GetDifficultyModifiers) {
                await this.commandHandler.difficultyCommandHandler.handleGetDifficultyModifiers();
            }
            if (message.command === MessageType.GetDifficultyLevel) {
                await this.commandHandler.difficultyCommandHandler.handleGetDifficultyLevel();
            }
            if (message.command === MessageType.SetDifficultyLevel) {
                await this.commandHandler.difficultyCommandHandler.handleSetDifficultyLevel(message as SetDifficultyLevelPayload);
            }
            if (message.command === MessageType.SetDDAEnabled) {
                await this.commandHandler.difficultyCommandHandler.handleSetDDAEnabled(message as SetDDAEnabledPayload);
            }

            if (message.command === MessageType.GetBiome) {
                const filePath = message.filePath as string;
                await this.commandHandler.battleCommandHandler.handleGetBiomeData();
            }

            if (message.command === MessageType.GetAchievements) {
                await this.commandHandler.achievementCommandHandler.handleGetAchievements();
            }

            if (message.command === MessageType.RecordEncounter) {
                await this.commandHandler.achievementCommandHandler.handleRecordEncounter(message as RecordEncounterPayload);
            }

            if (message.command === MessageType.RecordBattleAction) {
                await this.commandHandler.achievementCommandHandler.handleRecordBattleAction(message as RecordBattleActionPayload);
            }

            if (message.command === MessageType.RecordItemAction) {
                await this.commandHandler.achievementCommandHandler.handleRecordItemAction(message as RecordItemActionPayload);
            }

            if (message.command === MessageType.RecordBattleCatch) {
                await this.commandHandler.achievementCommandHandler.handleRecordCatchInBattle(message as RecordBattleCatchPayload);
            }

            if (message.command === MessageType.RecordBattleFinished) {
                await this.commandHandler.achievementCommandHandler.handleRecordBattleFinished(message as RecordBattleFinishedPayload);
            }

            if (message.command === MessageType.UnlockNextLevel) {
                await this.commandHandler.difficultyCommandHandler.handleUnlockNextLevel();
            }

        });

    }


    private _getHtmlForWebview(webview: vscode.Webview) {
        // 自動偵測是否為生產模式
        const isProduction = this._context.extensionMode === vscode.ExtensionMode.Production;

        if (!isProduction) {
            // [開發模式]
            return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Pokemon React Dev</title>
                
                <base href="http://localhost:5174/">

                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data: http://localhost:5174; style-src 'unsafe-inline' http://localhost:5174; script-src 'unsafe-inline' 'unsafe-eval' http://localhost:5174; connect-src http://localhost:5174 ws://localhost:5174 https://pokeapi.co;">

                <script type="module" src="/@vite/client"></script>

                <script type="module">
                    import RefreshRuntime from '/@react-refresh'
                    RefreshRuntime.injectIntoGlobalHook(window)
                    window.$RefreshReg$ = () => {}
                    window.$RefreshSig$ = () => (type) => type
                    window.__vite_plugin_react_preamble_installed__ = true
                    window.viewType = "${this._viewType}";
                </script>
            </head>
            <body style="min-width: 280px; margin: 0; padding: 0;">
                <div id="root"></div>
                <script type="module" src="/src/main.tsx"></script>
            </body>
            </html>`;
        } else {
            // [生產模式]
            const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "webview-ui", "build", "assets", "index.css"));
            const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "webview-ui", "build", "assets", "index.js"));
            const baseUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "webview-ui", "build"));
            const nonce = getNonce();

            return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' ${webview.cspSource}; connect-src https://pokeapi.co;">
                
                <base href="${baseUri}/">
                <link rel="stylesheet" href="${styleUri}">
                <title>Pokemon React Prod</title>
                <script nonce="${nonce}">
                    window.viewType = "${this._viewType}";
                    window.baseUri = "${baseUri}";
                </script>
            </head>
            <body style="min-width: 280px; margin: 0; padding: 0;">
                <div id="root"></div>
                <script nonce="${nonce}" type="module" src="${scriptUri}"></script>
            </body>
            </html>`;
        }
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
