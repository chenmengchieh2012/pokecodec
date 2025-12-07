import * as vscode from 'vscode';
import { PokemonBox } from './manager/pokeBox';
import { JoinPokemon } from './manager/joinPokemon';
import { BagManager } from './manager/bags';
import { UserInfoManager } from './manager/userInfo';

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
        vscode.window.registerWebviewViewProvider('pokemonShop', shopProvider)
    );

    // (選用) 保留一個指令來強制開啟側邊欄
    context.subscriptions.push(
        vscode.commands.registerCommand('pokemon.openReactPanel', () => {
            vscode.commands.executeCommand('workbench.view.extension.pokemon-container');
        })
    );

    // 🔥 新增指令：手動觸發遭遇
    context.subscriptions.push(
        vscode.commands.registerCommand('pokemon.triggerEncounter', () => {
            gameProvider.triggerEncounter();
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

    public updateViews() {
        if (this._view) {
            this._pokemonBox.reload();
            this._party.reload();
            this._bag.reload();
            this._userInfo.reload();
            this._view.webview.postMessage({ type: 'partyData', data: this._party.getAll() });
            this._view.webview.postMessage({ type: 'boxData', data: this._pokemonBox.getAll() });
            this._view.webview.postMessage({ type: 'bagData', data: this._bag.getAll() });
            this._view.webview.postMessage({ type: 'userData', data: this._userInfo.getUserInfo() });
        }
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

        // 處理來自 React 的訊息
        webviewView.webview.onDidReceiveMessage(async message => {
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
            if (message.command === 'useItem') {
                const success = await this._bag.useItem(message.itemId, message.count);
                if (success) {
                    PokemonViewProvider.providers.forEach(p => p.updateViews());
                }
            }
            if (message.command === 'addItem') {
                if (message.item) {
                    await this._bag.add(message.item);
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
                
                <base href="http://localhost:5173/">

                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src 'unsafe-inline' http://localhost:5173; script-src 'unsafe-inline' 'unsafe-eval' http://localhost:5173; connect-src http://localhost:5173 ws://localhost:5173 https://pokeapi.co;">

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
            <body>
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
            <body>
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