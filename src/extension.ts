import * as vscode from 'vscode';
import { PokemonBoxManager } from './manager/pokeBoxManager';
import { PokeDexManager } from './manager/pokeDexManager';
import { JoinPokemonManager } from './manager/joinPokemonManager';
import { BagManager } from './manager/bagsManager';
import { UserDaoManager } from './manager/userDaoManager';
import { PokemonDao } from './dataAccessObj/pokemon';
import { EncounterHandler } from './core/EncounterHandler';
import { GameStateManager } from './manager/gameStateManager';
import { MessageType } from './dataAccessObj/messageType';
import {
    HandlerContext,
    CommandHandler,
    CatchPayload,
    DeletePokemonPayload,
    ReorderBoxPayload,
    ReorderPartyPayload,
    BatchMoveToBoxPayload,
    AddToPartyPayload,
    RemoveFromPartyPayload,
    UpdatePartyPokemonPayload,
    UseItemPayload,
    AddItemPayload,
    RemoveItemPayload,
    UpdateMoneyPayload,
    SetGameStatePayload,
    UseMedicineInBagPayload,
    GetPokeDexPayload,
    UpdatePokeDexPayload,
    EvolvePokemonPayload
} from './handler';
import GlobalStateKey from './utils/GlobalStateKey';
import { GameState } from './dataAccessObj/GameState';
import { BiomeDataManager } from './manager/BiomeManager';
import { BiomeData } from './dataAccessObj/BiomeData';
import { GitActivityHandler } from './core/GitActivityHandler';
import { ExperienceCalculator } from './utils/ExperienceCalculator';
import { randomUUID } from 'crypto';
import { PokemonFactory } from './core/CreatePokemonHandler';
import { AchievementManager } from './manager/AchievementManager';
import { RecordBattleActionPayload, RecordItemActionPayload, RecordBattleCatchPayload, RecordBattleFinishedPayload } from './utils/AchievementCritiria';



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
    const biomeManager = BiomeDataManager.initialize(context);
    const achievementManager = AchievementManager.initialize(context);

    const gameProvider = new PokemonViewProvider({ extensionUri: context.extensionUri, viewType: 'game', context, biomeManager });
    const backpackProvider = new PokemonViewProvider({ extensionUri: context.extensionUri, viewType: 'backpack', context, biomeManager });
    const computerProvider = new PokemonViewProvider({ extensionUri: context.extensionUri, viewType: 'computer', context, biomeManager });
    const shopProvider = new PokemonViewProvider({ extensionUri: context.extensionUri, viewType: 'shop', context, biomeManager });
    
    
    var BiomeIndex = -1;

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('pokemonReact', gameProvider),
        vscode.window.registerWebviewViewProvider('pokemonBackpack', backpackProvider),
        vscode.window.registerWebviewViewProvider('pokemonComputer', computerProvider),
        vscode.window.registerWebviewViewProvider('pokemonShop', shopProvider),
        
    );

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor) {
                const filePath = editor.document.fileName;
                const biomeData = biomeManager.handleOnChangeBiome(filePath);
                gameProvider.updateBiomeState(biomeData);
            }
        })
    );

    // (選用) 保留一個指令來強制開啟遊戲面板
    context.subscriptions.push(
        vscode.commands.registerCommand('pokemon.openReactPanel', () => {
            vscode.commands.executeCommand('workbench.view.extension.pokemon-panel');
        })
    );

    // 🔥 新增指令：手動觸發遭遇
    context.subscriptions.push(
        vscode.commands.registerCommand('pokemon.triggerEncounter', () => {
            gameProvider.triggerEncounter();
        })
    );

    // 🔥 新增指令：重置儲存
    context.subscriptions.push(
        vscode.commands.registerCommand('pokemon.resetStorage', () => {
            gameProvider.resetStorage();
        })
    );
}


interface PokemonViewProviderOptions {
    extensionUri: vscode.Uri;
    viewType: string;
    context: vscode.ExtensionContext;
    biomeManager: BiomeDataManager;
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
    private biomeManager: BiomeDataManager;
    private achievementManager: AchievementManager;
    private _context: vscode.ExtensionContext;
    private _extensionUri: vscode.Uri;
    private _viewType: string;

    constructor(
        private readonly options: PokemonViewProviderOptions,
    ) { 
        const { extensionUri, viewType, context: _context, biomeManager } = options;
        this.pokemonBoxManager = PokemonBoxManager.getInstance();
        this.partyManager = JoinPokemonManager.getInstance();
        this.bagManager = BagManager.getInstance();
        this.userDaoManager = UserDaoManager.getInstance();
        this.gameStateManager = GameStateManager.getInstance();
        this.pokeDexManager = PokeDexManager.getInstance();
        this.achievementManager = AchievementManager.getInstance();
        this.biomeManager = biomeManager;
        this._extensionUri = extensionUri;
        this._viewType = viewType;
        this._context = _context;
        this.commandHandler = new CommandHandler(
            this.pokemonBoxManager,
            this.partyManager,
            this.bagManager,
            this.userDaoManager,
            this.gameStateManager,
            this.biomeManager,
            this.pokeDexManager,
            this.achievementManager,
            _context
        );
        PokemonViewProvider.providers.push(this);
    }

    public handleGetBiomeData() {
        if (!this._view) {
            return;
        }
        const biomeData = this.biomeManager.getBiomeData();
        this._view.webview.postMessage({
            type: MessageType.BiomeData,
            data: biomeData
        });
    }

    public updateBiomeState(biomeData?: BiomeData) {
        if (this._view) {
            this._view?.webview.postMessage({
                type: MessageType.BiomeData,
                data: biomeData ?? this.biomeManager.getBiomeData()
            });
        }
    }

    public updateViews() {
        if (this._view) {
            this.commandHandler.handleGetParty();
            this.commandHandler.handleGetCurrentBox();
            this.commandHandler.handleGetBag();
            this.commandHandler.handleGetUserInfo();
            this.commandHandler.handleGetGameState();
            this.commandHandler.handleGetCurrentPokeDex();
            this.commandHandler.handleGetAchievements();
        }
        this.updateBiomeState();
    }

    public async resetStorage() {
        await this.bagManager.clear();
        await this.userDaoManager.clear();
        await this.partyManager.clear();
        await this.pokemonBoxManager.clear();
        await this.gameStateManager.clear();
        await this.pokeDexManager.clear();
        await this.achievementManager.clear();
        
        // Add default pokemon
        const starter = { ...defaultPokemon };
        starter.uid = 'starter-' + Date.now();
        starter.caughtDate = Date.now();
        starter.currentExp = 0;
        starter.toNextLevelExp = ExperienceCalculator.calculateRequiredExp(starter.level);
        starter.stats.hp = ExperienceCalculator.calculateHp(starter.baseStats.hp, starter.iv.hp, starter.ev.hp, starter.level);
        starter.stats.attack = ExperienceCalculator.calculateStat(starter.baseStats.attack, starter.iv.attack, starter.ev.attack, starter.level);
        starter.stats.defense = ExperienceCalculator.calculateStat(starter.baseStats.defense, starter.iv.defense, starter.ev.defense, starter.level);
        starter.stats.specialAttack = ExperienceCalculator.calculateStat(starter.baseStats.specialAttack, starter.iv.specialAttack, starter.ev.specialAttack, starter.level);
        starter.stats.specialDefense = ExperienceCalculator.calculateStat(starter.baseStats.specialDefense, starter.iv.specialDefense, starter.ev.specialDefense, starter.level);
        starter.stats.speed = ExperienceCalculator.calculateStat(starter.baseStats.speed, starter.iv.speed, starter.ev.speed, starter.level);
        starter.currentHp = starter.stats.hp;
        starter.maxHp = starter.stats.hp;
        
        await this.partyManager.add(starter);

        // full two box starter to party
        for (let i = 0; i < PokemonBoxManager.getMaxBoxCapacity() * 2; i++) {
            let debugPokemon = await PokemonFactory.createWildPokemonInstance({
                pokemonId: Math.floor(Math.random() * 150) + 1,
                nameZh: '',
                nameEn: '',
                type: [],
                catchRate: 0,
                minDepth: 0
            },'test/file/path');
            await this.pokemonBoxManager.add(debugPokemon);
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

        // Initialize HandlerContext immediately
        const handlerContext: HandlerContext = {
            postMessage: (msg: unknown) => webviewView.webview.postMessage(msg),
            updateAllViews: () => PokemonViewProvider.providers.forEach(p => p.updateViews()),
            updateAchievementsView: () => {
                this.commandHandler.handleGetAchievements();
            }
        };
        this.commandHandler.setHandlerContext(handlerContext);

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

        // 每次打開都強制刷新資料
        // setTimeout(() => {
        //     this.updateViews();
        //     const editor = vscode.window.activeTextEditor || vscode.window.visibleTextEditors[0];
        //     if (editor) {
        //         console.log("[Extension] Updating game state for file:", editor.document.fileName);
        //         this.updateBiomeState(editor.document.fileName);
        //     }
        // }, 100);

        // 當 Webview 變為可見時自動刷新
        // webviewView.onDidChangeVisibility(() => {
        //     if (webviewView.visible) {
        //         this.updateViews();
        //         setTimeout(() => {
        //             const editor = vscode.window.activeTextEditor || vscode.window.visibleTextEditors[0];
        //             if (editor) {
        //                 this.updateBiomeState(editor.document.fileName);
        //             }
        //         }, 500);
        //     }
        // });

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
            if (message.command === MessageType.SetGameState) {
                await this.commandHandler.handleSetGameState(message as SetGameStatePayload);
            }
            if (message.command === MessageType.GetGameState) {
                this.commandHandler.handleGetGameState();
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

            if (message.command === MessageType.TriggerEncounter) {
                this.triggerEncounter();
            }

            if (message.command === MessageType.GetBiome) {
                const filePath = message.filePath as string;
                this.handleGetBiomeData();
            }

            if (message.command === MessageType.GetAchievements) {
                await this.commandHandler.handleGetAchievements();
            }

            if (message.command === MessageType.RecordBattleAction) {
                await this.commandHandler.handleRecordBattleAction(message as  RecordBattleActionPayload);
            }

            if (message.command === MessageType.RecordItemAction) {
                await this.commandHandler.handleRecordItemAction(message as  RecordItemActionPayload);
            }

            if (message.command === MessageType.RecordBattleCatch) {
                await this.commandHandler.handleRecordCatchInBattle(message as  RecordBattleCatchPayload);
            }

            if (message.command === MessageType.RecordBattleFinished) {
                await this.commandHandler.handleRecordBattleFinished(message as  RecordBattleFinishedPayload);
            }
            

        });

    }

    public async triggerEncounter() {
        if (this._view) {
            const encounterEvent = await this.biomeManager.getEncountered();
            this._view.webview.postMessage({ type: MessageType.TriggerEncounter, data: encounterEvent });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        // ⚠️ 開發模式開關 (請依據需求切換)
        const isProduction = false; 

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

            return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${getNonce()}' ${webview.cspSource}; connect-src https://pokeapi.co;">
                
                <link rel="stylesheet" href="${styleUri}">
                <title>Pokemon React Prod</title>
                <script nonce="${getNonce()}">
                    window.viewType = "${this._viewType}";
                    window.baseUri = "${baseUri}";
                </script>
            </head>
            <body style="min-width: 280px; margin: 0; padding: 0;">
                <div id="root"></div>
                <script nonce="${getNonce()}" type="module" src="${scriptUri}"></script>
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