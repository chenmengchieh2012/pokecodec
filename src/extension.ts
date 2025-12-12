import * as vscode from 'vscode';
import { PokemonBox } from './manager/pokeBox';
import { JoinPokemon } from './manager/joinPokemon';
import { BagManager } from './manager/bags';
import { UserInfoManager } from './manager/userInfo';
import { PokemonDao } from './dataAccessObj/pokemon';
import { EncounterHandler } from './core/EncounterHandler';


export function activate(context: vscode.ExtensionContext) {

    // 🔥 修改點 1: 改成註冊 "WebviewViewProvider" (這是給側邊欄用的)
    // 'pokemonReact' 必須跟 package.json 裡的 view id 一樣
    const gameProvider = new PokemonViewProvider(context.extensionUri, 'game', context);
    const backpackProvider = new PokemonViewProvider(context.extensionUri, 'backpack', context);
    const boxProvider = new PokemonViewProvider(context.extensionUri, 'box', context);
    const shopProvider = new PokemonViewProvider(context.extensionUri, 'shop', context);
    
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
                gameProvider.updateGameState(filePath);
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



// 🔥 修改點 2: 建立一個 Provider 類別來管理側邊欄
class PokemonViewProvider implements vscode.WebviewViewProvider {

    private static providers: PokemonViewProvider[] = [];
    private _view?: vscode.WebviewView;
    private _pokemonBox: PokemonBox;
    private _party: JoinPokemon;
    private _bag: BagManager;
    private _userInfo: UserInfoManager;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _viewType: string,
        private readonly _context: vscode.ExtensionContext
    ) { 
        this._pokemonBox = new PokemonBox(_context);
        this._party = new JoinPokemon(_context);
        this._bag = new BagManager(_context);
        this._userInfo = new UserInfoManager(_context);
        PokemonViewProvider.providers.push(this);
    }

    public updateGameState(filePath: string) {
        if (!this._view) return;
        // 1. 呼叫你的演算法
        const {index: biomeIndex, types: biomeTypes} = EncounterHandler().getBiome(filePath);
        // 3. 發送訊息給 React Webview
        
        this._view.webview.postMessage({
            type: 'UPDATE_BIOME',
            data: {
                biomeIndex: biomeIndex, // 這裡應該填入 result.biomeIndex
                biomeTypes: biomeTypes,
            }
        });
    }

    public updateViews() {
        if (this._view) {
            this._pokemonBox.reload();
            this._party.reload();
            this._bag.reload();
            this._userInfo.reload();
            const inBattle = this._context.globalState.get<boolean>('pokemon-battle-state') || false;
            this._view.webview.postMessage({ type: 'partyData', data: this._party.getAll() });
            this._view.webview.postMessage({ type: 'boxData', data: this._pokemonBox.getAll() });
            this._view.webview.postMessage({ type: 'bagData', data: this._bag.getAll() });
            this._view.webview.postMessage({ type: 'userData', data: this._userInfo.getUserInfo() });
            this._view.webview.postMessage({ type: 'battleState', inBattle });
        }
    }

    public async resetStorage() {
        await this._context.globalState.update('pokemon-bag-data', undefined);
        await this._context.globalState.update('pokemon-user-info', undefined);
        await this._context.globalState.update('pokemon-party-data', undefined);
        await this._context.globalState.update('pokemon-box-data', undefined);
        await this._context.globalState.update('pokemon-battle-state', false);
        
        // Add default pokemon
        const starter = { ...defaultPokemon };
        starter.uid = 'starter-' + Date.now();
        starter.caughtDate = Date.now();
        await this._party.add(starter);

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
        setTimeout(() => {
            this.updateViews();
            const editor = vscode.window.activeTextEditor || vscode.window.visibleTextEditors[0];
            if (editor) {
                console.log("[Extension] Updating game state for file:", editor.document.fileName);
                this.updateGameState(editor.document.fileName);
            }
        }, 100);

        // 當 Webview 變為可見時自動刷新
        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                this.updateViews();
                setTimeout(() => {
                    const editor = vscode.window.activeTextEditor || vscode.window.visibleTextEditors[0];
                    if (editor) {
                        this.updateGameState(editor.document.fileName);
                    }
                }, 500);
            }
        });

        // 處理來自 React 的訊息
        webviewView.webview.onDidReceiveMessage(async message => {
            console.log('[Extension] Received message:', message);
            if (message.command === 'resetStorage') {
                await this.resetStorage();
            }
            if (message.command === 'catch') {
                vscode.window.showInformationMessage(message.text);
                if (message.pokemon) {
                    await this._pokemonBox.add(message.pokemon);
                    PokemonViewProvider.providers.forEach(p => p.updateViews());
                }
            }
            if (message.command === 'getBox') {
                const pokemons = this._pokemonBox.getAll();
                webviewView.webview.postMessage({ type: 'boxData', data: pokemons });
            }
            if (message.command === 'deletePokemon') {
                if (message.pokemonUids && Array.isArray(message.pokemonUids)) {
                    await this._pokemonBox.batchRemove(message.pokemonUids);
                    PokemonViewProvider.providers.forEach(p => p.updateViews());
                }
            }
            if (message.command === 'reorderBox') {
                if (message.pokemonUids && Array.isArray(message.pokemonUids)) {
                    await this._pokemonBox.reorder(message.pokemonUids);
                    PokemonViewProvider.providers.forEach(p => p.updateViews());
                }
            }
            if (message.command === 'getParty') {
                const party = this._party.getAll();
                webviewView.webview.postMessage({ type: 'partyData', data: party });
            }
            if (message.command === 'addToParty') {
                const uid = message.pokemonUid;
                if (uid) {
                    const pokemon = this._pokemonBox.get(uid);
                    if (pokemon) {
                        const success = await this._party.add(pokemon);
                        if (success) {
                            await this._pokemonBox.remove(uid);
                            // Update both views
                            PokemonViewProvider.providers.forEach(p => p.updateViews());
                            vscode.window.showInformationMessage(`Added ${pokemon.name} to party!`);
                        } else {
                            vscode.window.showErrorMessage('Party is full!');
                        }
                    }
                }
            }
            if (message.command === 'removeFromParty') {
                const uid = message.uid;
                if (uid) {
                    const pokemon = this._party.getAll().find(p => p.uid === uid);
                    if (pokemon) {
                        await this._pokemonBox.add(pokemon);
                        await this._party.remove(uid);
                        // Update both views
                        PokemonViewProvider.providers.forEach(p => p.updateViews());
                        vscode.window.showInformationMessage(`Moved ${pokemon.name} to Box!`);
                    }
                }
            }
            if (message.command === 'updatePartyPokemon') {
                if (message.pokemon) {
                    console.log('Received updatePartyPokemon:', message.pokemon.name, message.pokemon.currentHp);
                    await this._party.update(message.pokemon);
                    // Update views to reflect HP changes etc.
                    PokemonViewProvider.providers.forEach(p => p.updateViews());
                }
            }
            if (message.command === 'getBag') {
                const items = this._bag.getAll();
                webviewView.webview.postMessage({ type: 'bagData', data: items });
            }
            if (message.command === 'useItemInBag') {
                const itemId = message.itemId || (message.item && (message.item.apiName || message.item.id));
                console.log(`[Extension] useItemInBag: itemId=${itemId}, pokemonUid=${message.pokemonUid}`);

                if (message.pokemonUid) {
                    const party = this._party.getAll();
                    const pokemon = party.find(p => p.uid === message.pokemonUid);
                    
                    if (!pokemon) {
                        console.error('[Extension] Pokemon not found');
                        return;
                    }

                    if (!message.item) {
                        console.error('[Extension] Item not provided');
                        return;
                    }

                    const effect = message.item.effect;
                    console.log('[Extension] Item effect:', effect);

                    let itemUsed = false;
                    let usedMessage = '';

                    if (effect) {
                        const oldHp = pokemon.currentHp;
                        
                        // 1. Heal HP (Fixed)
                        if (effect.healHp) {
                            if (pokemon.currentHp < pokemon.maxHp) {
                                const healAmount = effect.healHp;
                                pokemon.currentHp = Math.min(pokemon.maxHp, pokemon.currentHp + healAmount);
                                itemUsed = true;
                                usedMessage = `Restored ${pokemon.currentHp - oldHp} HP.`;
                            } else {
                                vscode.window.showInformationMessage('HP is already full!');
                            }
                        }
                        // 2. Heal HP (Percent)
                        else if (effect.healHpPercent) {
                            if (pokemon.currentHp < pokemon.maxHp) {
                                const healAmount = Math.floor(pokemon.maxHp * (effect.healHpPercent / 100));
                                pokemon.currentHp = Math.min(pokemon.maxHp, pokemon.currentHp + healAmount);
                                itemUsed = true;
                                usedMessage = `Restored ${pokemon.currentHp - oldHp} HP.`;
                            } else {
                                vscode.window.showInformationMessage('HP is already full!');
                            }
                        }
                        // 3. Revive
                        else if (effect.revive) {
                            if (pokemon.currentHp === 0) {
                                const healPercent = effect.reviveHpPercent || 50;
                                pokemon.currentHp = Math.floor(pokemon.maxHp * (healPercent / 100));
                                itemUsed = true;
                                usedMessage = `Revived with ${pokemon.currentHp} HP.`;
                            } else {
                                vscode.window.showInformationMessage('Pokemon is not fainted!');
                            }
                        }
                        // 4. PP Recovery
                        else if (effect.restorePp || effect.restorePpAll) {
                            let ppRestored = false;
                            if (effect.restorePpAll) {
                                // Restore all PP for all moves
                                pokemon.pokemonMoves = pokemon.pokemonMoves.map(move => ({
                                    ...move,
                                    pp: move.maxPP
                                }));
                                ppRestored = true;
                                usedMessage = 'Restored all PP for all moves!';
                            } else if (effect.restorePp) {
                                // Restore PP for moves that are not at max
                                const restoreAmount = effect.restorePp;
                                pokemon.pokemonMoves = pokemon.pokemonMoves.map(move => {
                                    if (move.pp < move.maxPP) {
                                        ppRestored = true;
                                        return {
                                            ...move,
                                            pp: Math.min(move.maxPP, move.pp + restoreAmount)
                                        };
                                    }
                                    return move;
                                });
                                if (ppRestored) {
                                    usedMessage = `Restored ${restoreAmount} PP!`;
                                } else {
                                    vscode.window.showInformationMessage('All moves already have full PP!');
                                }
                            }
                            itemUsed = ppRestored;
                        }
                        // 5. Status Heal (Placeholder)
                        else if (effect.healStatus) {
                             // TODO: Implement status healing
                             vscode.window.showInformationMessage('Status healing not implemented yet.');
                        }
                    } else {
                        console.warn('[Extension] Item has no effect defined.');
                        vscode.window.showWarningMessage('This item has no effect defined.');
                    }

                    if (itemUsed) {
                        // 更新寶可夢狀態
                        await this._party.update(pokemon);
                        
                        // 扣除道具
                        await this._bag.useItem(itemId, 1);
                        
                        vscode.window.showInformationMessage(`Used ${message.item.name} on ${pokemon.name}. ${usedMessage}`);
                        
                        PokemonViewProvider.providers.forEach(p => p.updateViews());
                    }
                }
            }

            if (message.command === 'useItem') {
                // 1. 取得 Item ID
                const itemId = message.itemId || (message.item && (message.item.apiName || message.item.id));
                
                // 2. 單純消耗道具 (既有邏輯)
                const success = await this._bag.useItem(itemId, message.count || 1);
                if (success) {
                    PokemonViewProvider.providers.forEach(p => p.updateViews());
                }
            }
            if (message.command === 'addItem') {
                if (message.item) {
                    console.log("Adding item:", message.item, "Count:", message.count);
                    await this._bag.add(message.item,message.count);
                    PokemonViewProvider.providers.forEach(p => p.updateViews());
                }
            }
            if (message.command === 'removeItem') {
                // Support both direct itemId or item object
                const itemId = message.itemId || (message.item && (message.item.apiName || message.item.id));
                if (itemId) {
                    await this._bag.useItem(itemId, message.count || 1);
                    PokemonViewProvider.providers.forEach(p => p.updateViews());
                }
            }
            if (message.command === 'getUserInfo') {
                const userInfo = this._userInfo.getUserInfo();
                webviewView.webview.postMessage({ type: 'userData', data: userInfo });
            }
            if (message.command === 'updateMoney') {
                if (typeof message.amount === 'number') {
                    await this._userInfo.updateMoney(message.amount);
                    PokemonViewProvider.providers.forEach(p => p.updateViews());
                }
            }
            if (message.command === 'setBattleState') {
                await this._context.globalState.update('pokemon-battle-state', message.inBattle);
                PokemonViewProvider.providers.forEach(p => p.updateViews());
            }
            if (message.command === 'getBattleState') {
                const inBattle = this._context.globalState.get<boolean>('pokemon-battle-state') || false;
                webviewView.webview.postMessage({ type: 'battleState', inBattle });
            }
        });

        // 模擬遭遇 (放在這裡會在側邊欄開啟時觸發)
        if (this._viewType === 'game') {
            setTimeout(() => {
                this.triggerEncounter();
            }, 1000);
        }
    }

    public triggerEncounter() {
        if (this._view) {
            const randomId = Math.floor(Math.random() * 151) + 1;
            this._view.webview.postMessage({ type: 'encounter', id: randomId });
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
    level: 5,
    currentHp: 20,
    maxHp: 20,
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