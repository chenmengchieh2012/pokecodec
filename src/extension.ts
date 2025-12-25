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
    UpdateOpponentInPartyPayload,
    UpdateMoneyPayload,
    UpdatePartyPokemonPayload,
    UpdatePokeDexPayload,
    UseItemPayload,
    UseMedicineInBagPayload,
    GoTriggerEncounterPayload,
    UpdateOpponentPokemonUidPayload
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

const itemDataMap = itemData as unknown as Record<string, ItemDao>;

export function activate(context: vscode.ExtensionContext) {
    // 在 activate 函式一開始執行

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
    context.subscriptions.push({ dispose: () => difficultyManager.dispose() });

    if (gameStateManager.getGameStateData()?.state !== GameState.Searching) {
        gameStateManager.updateGameState(GameState.Searching, {});
    }

    // Initialize Biome Data Handler
    const biomeHandler = BiomeDataHandler.initialize(context, userDaoManager, difficultyManager);
    context.subscriptions.push({ dispose: () => biomeHandler.dispose() });

    // Initialize Session Handler
    const sessionHandler = SessionHandler.initialize(context);
    context.subscriptions.push({ dispose: () => sessionHandler.dispose() });

    // Initialize Git Activity Handler
    const gitHandler = GitActivityHandler.getInstance();
    gitHandler.initialize();
    context.subscriptions.push({ dispose: () => gitHandler.dispose() });

    const gameProvider = new PokemonViewProvider({ extensionUri: context.extensionUri, viewType: 'game', context });
    const backpackProvider = new PokemonViewProvider({ extensionUri: context.extensionUri, viewType: 'backpack', context });
    const computerProvider = new PokemonViewProvider({ extensionUri: context.extensionUri, viewType: 'computer', context });
    const shopProvider = new PokemonViewProvider({ extensionUri: context.extensionUri, viewType: 'shop', context });


    var BiomeIndex = -1;

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
        this._extensionUri = extensionUri;
        this._viewType = viewType;
        this._context = _context;
        this.commandHandler = new CommandHandler(
            this.pokemonBoxManager,
            this.partyManager,
            this.bagManager,
            this.userDaoManager,
            this.gameStateManager,
            this.biomeHandler,
            this.pokeDexManager,
            this.achievementManager,
            this.difficultyManager,
            _context
        );
        PokemonViewProvider.providers.push(this);

        // Initialize HandlerContext immediately
        const handlerContext: HandlerContext = {
            postMessage: (msg: unknown) => this._view?.webview.postMessage(msg),
            updateAllViews: () => PokemonViewProvider.providers.forEach(p => p.updateViews()),
            updateAchievementsView: () => {
                this.commandHandler.handleGetAchievements();
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
                this.commandHandler.handleGetBiomeData();
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
                const randomEncounterChance = Math.random();
                if (randomEncounterChance < 0.2) { // 20% 機率觸發隨機遭遇
                    this.commandHandler.handleWildTriggerEncounter();
                }
            }
        });

        this.difficultyManager.onDidRecordEncounter(() => {
            if (this._view?.visible) {
                this.commandHandler.handleGetDifficultyModifiers();
            }
        });
    }

    public updateViews() {
        if (this._view) {
            this.commandHandler.handleGetParty();
            this.commandHandler.handleGetCurrentBox();
            this.commandHandler.handleGetBag();
            this.commandHandler.handleGetUserInfo();
            this.commandHandler.handleGetGameStateData();
            this.commandHandler.handleGetCurrentPokeDex();
            this.commandHandler.handleGetAchievements();
            this.commandHandler.handleGetBiomeData();
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
            for (let i = 0; i < PokemonBoxManager.getMaxBoxCapacity() * 2; i++) {
                let debugPokemon = await PokemonFactory.createWildPokemonInstance({
                    pokemonId: Math.floor(Math.random() * 150) + 1,
                    nameZh: '',
                    nameEn: '',
                    minDepth: 0,
                    encounterRate: 0
                }, 'test/file/path', undefined, this.difficultyManager);
                await this.pokemonBoxManager.add(debugPokemon);
            }

            // MARK: TEST all TM
            const allTMItems = Object.values(itemDataMap).filter(item => item.apiName.startsWith('tm'));
            console.log('[ResetStorage] Adding all TM items:', allTMItems.map(i => i.apiName));
            allTMItems.map(async (tmItem) => {
                await this.bagManager.add(tmItem, 1);
            });
        }

        vscode.window.showInformationMessage('Global storage 已重置！');
        PokemonViewProvider.providers.forEach(p => p.updateViews());
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
                await this.commandHandler.handleCatch(message as CatchPayload);
            }
            if (message.command === MessageType.GetBox) {
                this.commandHandler.handleGetBox((message as any).boxIndex);
            }
            if (message.command === MessageType.DeletePokemon) {
                await this.commandHandler.handleDeletePokemon(message as DeletePokemonPayload);
            }
            if (message.command === MessageType.ReorderBox) {
                await this.commandHandler.handleReorderBox(message as ReorderBoxPayload);
            }
            if (message.command === MessageType.ReorderParty) {
                await this.commandHandler.handleReorderParty(message as ReorderPartyPayload);
            }
            if (message.command === MessageType.BatchMoveToBox) {
                await this.commandHandler.handleBatchMoveToBox(message as BatchMoveToBoxPayload);
            }
            if (message.command === MessageType.GetParty) {
                this.commandHandler.handleGetParty();
            }
            if (message.command === MessageType.AddToParty) {
                await this.commandHandler.handleAddToParty(message as AddToPartyPayload);
            }
            if (message.command === MessageType.RemoveFromParty) {
                await this.commandHandler.handleRemoveFromParty(message as RemoveFromPartyPayload);
            }
            if (message.command === MessageType.UpdatePartyPokemon) {
                await this.commandHandler.handleUpdatePartyPokemon(message as UpdatePartyPokemonPayload);
            }
            if (message.command === MessageType.GetBag) {
                this.commandHandler.handleGetBag();
            }
            if (message.command === MessageType.UseMedicineInBag) {
                await this.commandHandler.handleUseMedicineInBag(message as UseMedicineInBagPayload);
            }
            if (message.command === MessageType.UseItem) {
                await this.commandHandler.handleUseItem(message as UseItemPayload);
            }
            if (message.command === MessageType.AddItem) {
                await this.commandHandler.handleAddItem(message as AddItemPayload);
            }
            if (message.command === MessageType.RemoveItem) {
                await this.commandHandler.handleRemoveItem(message as RemoveItemPayload);
            }
            if (message.command === MessageType.GetUserInfo) {
                this.commandHandler.handleGetUserInfo();
            }
            if (message.command === MessageType.UpdateMoney) {
                await this.commandHandler.handleUpdateMoney(message as UpdateMoneyPayload);
            }
            if (message.command === MessageType.SetAutoEncounter) {
                await this.commandHandler.handleSetAutoEncounter(message as SetAutoEncounterPayload);
            }
            if (message.command === MessageType.SetGameStateData) {
                await this.commandHandler.handleSetGameStateData(message as SetGameStateDataPayload);
            }
            if (message.command === MessageType.GetGameStateData) {
                this.commandHandler.handleGetGameStateData();
            }
            if (message.command === MessageType.UpdateOpponentInParty) {
                await this.commandHandler.handleUpdateOpponentInParty(message as UpdateOpponentInPartyPayload);
            }
            if (message.command === MessageType.UpdateDefenderPokemonUid) {
                await this.commandHandler.handleUpdateDefenderPokemonUid(message as UpdateDefenderPokemonUidPayload);
            }

            if (message.command === MessageType.UpdateOpponentPokemonUid) {
                await this.commandHandler.handleUpdateOpponentPokemonUid(message as UpdateOpponentPokemonUidPayload);
            }

            if (message.command === MessageType.GetPokeDex) {
                this.commandHandler.handleGetPokeDex(message as GetPokeDexPayload);
            }

            if (message.command === MessageType.UpdatePokeDex) {
                await this.commandHandler.handleUpdatePokeDex(message as UpdatePokeDexPayload);
            }

            if (message.command === MessageType.EvolvePokemon) {
                await this.commandHandler.handleEvolvePokemon(message as EvolvePokemonPayload);
            }

            if (message.command === MessageType.SelectStarter) {
                await this.commandHandler.handleSelectStarter(message as any);
            }

            if (message.command === MessageType.GoTriggerEncounter) {
                if (this.gameStateManager.getGameStateData()?.state === GameState.Searching) {
                    if (message.triggerType === 'wild') {
                        await this.commandHandler.handleWildTriggerEncounter();
                    } else if (message.triggerType === 'npc') {
                        await this.commandHandler.handleNPCTriggerEncounter();
                    }
                }
            }

            // Difficulty
            if (message.command === MessageType.GetDifficultyModifiers) {
                await this.commandHandler.handleGetDifficultyModifiers();
            }
            if (message.command === MessageType.RecordEncounter) {
                await this.commandHandler.handleRecordEncounter(message as any);
            }
            if (message.command === MessageType.GetDifficultyLevel) {
                await this.commandHandler.handleGetDifficultyLevel();
            }
            if (message.command === MessageType.SetDifficultyLevel) {
                await this.commandHandler.handleSetDifficultyLevel(message as any);
            }

            if (message.command === MessageType.GetBiome) {
                const filePath = message.filePath as string;
                await this.commandHandler.handleGetBiomeData();
            }

            if (message.command === MessageType.GetAchievements) {
                await this.commandHandler.handleGetAchievements();
            }

            if (message.command === MessageType.RecordBattleAction) {
                await this.commandHandler.handleRecordBattleAction(message as RecordBattleActionPayload);
            }

            if (message.command === MessageType.RecordItemAction) {
                await this.commandHandler.handleRecordItemAction(message as RecordItemActionPayload);
            }

            if (message.command === MessageType.RecordBattleCatch) {
                await this.commandHandler.handleRecordCatchInBattle(message as RecordBattleCatchPayload);
            }

            if (message.command === MessageType.RecordBattleFinished) {
                await this.commandHandler.handleRecordBattleFinished(message as RecordBattleFinishedPayload);
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

export const defaultPokemon: PokemonDao = {
    uid: 'player-pikachu',
    id: 25,
    name: 'pikachu',
    level: 40,
    currentHp: 200,
    maxHp: 200,
    stats: { hp: 20, attack: 12, defense: 10, specialAttack: 11, specialDefense: 11, speed: 0 },
    iv: { hp: 31, attack: 31, defense: 31, specialAttack: 31, specialDefense: 31, speed: 0 },
    ev: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
    types: ['electric'],
    gender: 'male',
    nature: 'hardy',
    ability: 'static',
    isHiddenAbility: false,
    isLegendary: false,
    isMythical: false,
    height: 4,
    weight: 60,
    baseExp: 112,
    currentExp: 0,
    toNextLevelExp: 100,
    isShiny: false,
    originalTrainer: 'Player',
    caughtDate: Date.now(),
    caughtBall: 'poke-ball',
    ailment: 'healthy',
    pokemonMoves: [
        {
            id: 1,
            name: 'thunder-shock',
            power: 40,
            type: 'electric',
            accuracy: 100,
            pp: 30,
            maxPP: 30,
            effect: '',
            priority: 0,
        },
        {
            id: 2,
            name: 'quick-attack',
            power: 40,
            type: 'normal',
            accuracy: 100,
            pp: 30,
            maxPP: 30,
            effect: '',
            priority: 1,
        },
        {
            id: 3,
            name: 'electro-ball',
            power: 60,
            type: 'electric',
            accuracy: 100,
            pp: 10,
            maxPP: 10,
            effect: '',
            priority: 0,
        },
        {
            id: 4,
            name: 'double-team',
            power: 0,
            type: 'normal',
            accuracy: 0,
            pp: 15,
            maxPP: 15,
            effect: 'Raises evasion.',
            priority: 0,
        }
    ],
    baseStats: { hp: 35, attack: 55, defense: 40, specialAttack: 50, specialDefense: 50, speed: 90 },
    codingStats: {
        caughtRepo: 'example-repo',
        favoriteLanguage: 'TypeScript',
        linesOfCode: 1500,
        bugsFixed: 25,
        commits: 100,
        coffeeConsumed: 50
    }
};