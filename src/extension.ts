import * as vscode from 'vscode';
import { PokemonBoxManager } from './manager/pokeBoxManager';
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
    AddToPartyPayload,
    RemoveFromPartyPayload,
    UpdatePartyPokemonPayload,
    UseItemPayload,
    AddItemPayload,
    RemoveItemPayload,
    UpdateMoneyPayload,
    SetGameStatePayload,
    UseMedicineInBagPayload
} from './handler';
import GlobalStateKey from './utils/GlobalStateKey';
import { GameState } from './dataAccessObj/GameState';
import { BiomeDataManager } from './manager/BiomeManager';
import { BiomeData } from './dataAccessObj/BiomeData';



export function activate(context: vscode.ExtensionContext) {
    // 在 activate 函式一開始執行

    // 🔥 清除所有全域儲存 (測試用)
    // context.globalState.keys().forEach(key => {
    //     context.globalState.update(key, undefined);
    // });

    // 🔥 修改點 1: 改成註冊 "WebviewViewProvider" (這是給側邊欄用的)
    // 'pokemonReact' 必須跟 package.json 裡的 view id 一樣

    const biomeManager = new BiomeDataManager(context);

    const gameProvider = new PokemonViewProvider({ extensionUri: context.extensionUri, viewType: 'game', context, biomeManager });
    const backpackProvider = new PokemonViewProvider({ extensionUri: context.extensionUri, viewType: 'backpack', context, biomeManager });
    const boxProvider = new PokemonViewProvider({ extensionUri: context.extensionUri, viewType: 'box', context, biomeManager });
    const shopProvider = new PokemonViewProvider({ extensionUri: context.extensionUri, viewType: 'shop', context, biomeManager });
    
    
    var BiomeIndex = -1;

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('pokemonReact', gameProvider),
        vscode.window.registerWebviewViewProvider('pokemonBackpack', backpackProvider),
        vscode.window.registerWebviewViewProvider('pokemonBox', boxProvider),
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
    private commandHandler: CommandHandler;
    private gameStateManager: GameStateManager;
    private biomeManager: BiomeDataManager;
    private _context: vscode.ExtensionContext;
    private _extensionUri: vscode.Uri;
    private _viewType: string;

    constructor(
        private readonly options: PokemonViewProviderOptions,
    ) { 
        const { extensionUri, viewType, context: _context, biomeManager } = options;
        this.pokemonBoxManager = new PokemonBoxManager(_context);
        this.partyManager = new JoinPokemonManager(_context);
        this.bagManager = new BagManager(_context);
        this.userDaoManager = new UserDaoManager(_context);
        this.gameStateManager = new GameStateManager(_context);
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
            this.pokemonBoxManager.reload();
            this.partyManager.reload();
            this.bagManager.reload();
            this.userDaoManager.reload();
            this.gameStateManager.reload();
            this._view.webview.postMessage({ type: MessageType.PartyData, data: this.partyManager.getAll() });
            this._view.webview.postMessage({ type: MessageType.BoxData, data: this.pokemonBoxManager.getAll() });
            this._view.webview.postMessage({ type: MessageType.BagData, data: this.bagManager.getAll() });
            this._view.webview.postMessage({ type: MessageType.UserData, data: this.userDaoManager.getUserInfo() });
            this._view.webview.postMessage({ type: MessageType.GameState, data: this.gameStateManager.getGameState() });   
        }
        this.updateBiomeState();
    }

    public async resetStorage() {
        await this._context.globalState.update(GlobalStateKey.BAG_DATA, []);
        await this._context.globalState.update(GlobalStateKey.USER_DATA, { money: 50000 });
        await this._context.globalState.update(GlobalStateKey.PARTY_DATA, [ ]);
        await this._context.globalState.update(GlobalStateKey.BOX_DATA, []);
        await this._context.globalState.update(GlobalStateKey.GAME_STATE, GameState.Searching);
        
        // Add default pokemon
        const starter = { ...defaultPokemon };
        starter.uid = 'starter-' + Date.now();
        starter.caughtDate = Date.now();
        await this.partyManager.add(starter);

        vscode.window.showInformationMessage('Global storage 已重置！');
        PokemonViewProvider.providers.forEach(p => p.updateViews());
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

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
            // 建立 Handler Context
            const handlerContext: HandlerContext = {
                postMessage: (msg: unknown) => webviewView.webview.postMessage(msg),
                updateAllViews: () => PokemonViewProvider.providers.forEach(p => p.updateViews()),
            };
            // 設定 Handler Context
            this.commandHandler.setHandlerContext(handlerContext);

            if (message.command === MessageType.ResetStorage) {
                await this.commandHandler.handleResetStorage(() => this.resetStorage());
            }
            if (message.command === MessageType.Catch) {
                await this.commandHandler.handleCatch(message as CatchPayload);
            }
            if (message.command === MessageType.GetBox) {
                this.commandHandler.handleGetBox();
            }
            if (message.command === MessageType.DeletePokemon) {
                await this.commandHandler.handleDeletePokemon(message as DeletePokemonPayload);
            }
            if (message.command === MessageType.ReorderBox) {
                await this.commandHandler.handleReorderBox(message as ReorderBoxPayload);
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
            if (message.command === MessageType.TriggerEncounter) {
                this.triggerEncounter();
            }
            if (message.command === MessageType.GetBiome) {
                const filePath = message.filePath as string;
                this.handleGetBiomeData();
            }
        });

    }

    public triggerEncounter() {
        if (this._view) {
            const encounterEvent = this.biomeManager.getEncountered();
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

                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src 'unsafe-inline' http://localhost:5174; script-src 'unsafe-inline' 'unsafe-eval' http://localhost:5174; connect-src http://localhost:5174 ws://localhost:5174 https://pokeapi.co;">

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
            <body style="min-width: 360px; margin: 0; padding: 0;">
                <div id="root"></div>
                <script type="module" src="/src/main.tsx"></script>
            </body>
            </html>`;
        } else {
            // [生產模式]
            const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "webview-ui", "build", "assets", "index.css"));
            const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "webview-ui", "build", "assets", "index.js"));

            return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: data:; style-src ${webview.cspSource}; script-src 'nonce-${getNonce()}' ${webview.cspSource}; connect-src https://pokeapi.co;">
                
                <link rel="stylesheet" href="${styleUri}">
                <title>Pokemon React Prod</title>
                <script nonce="${getNonce()}">
                    window.viewType = "${this._viewType}";
                </script>
            </head>
            <body style="min-width: 360px; margin: 0; padding: 0;">
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
    name: 'PIKACHU',
    level: 40,
    currentHp: 200,
    maxHp: 200,
    stats: { hp: 20, attack: 12, defense: 10, specialAttack: 11, specialDefense: 11, speed: 15 },
    iv: { hp: 31, attack: 31, defense: 31, specialAttack: 31, specialDefense: 31, speed: 31 },
    ev: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
    types: ['electric'],
    gender: 'Male',
    nature: 'Hardy',
    ability: 'Static',
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
                name: 'THUNDER SHOCK',
                power: 40,
                type: 'Electric',
                accuracy: 100,
                pp: 30,
                maxPP: 30,
                effect: ''
            },
            {
                id: 2,
                name: 'QUICK ATTACK',
                power: 40,
                type: 'Normal',
                accuracy: 100,
                pp: 30,
                maxPP: 30,
                effect: ''
            },
            {
                id: 3,
                name: 'ELECTRO BALL',
                power: 60,
                type: 'Electric',
                accuracy: 100,
                pp: 10,
                maxPP: 10,
                effect: ''
            },
            {
                id: 4,
                name: 'DOUBLE TEAM',
                power: 0,
                type: 'Normal',
                accuracy: 0,
                pp: 15,
                maxPP: 15,
                effect: 'Raises evasion.'
            }
        ]
};