import * as crypto from 'crypto';
import * as vscode from 'vscode';
import * as zlib from 'zlib';
import * as fs from 'fs';
import * as path from 'path';
import pokemonGen1Data from '../../data/pokemonGen1.json';
import moveData from '../../data/pokemonMoves.json';
import { BiomeDataHandler } from "../../core/BiomeHandler";
import { HandlerContext, SetDeviceLockPayload } from "../../dataAccessObj/MessagePayload";
import { PokemonMove } from "../../dataAccessObj/pokeMove";
import { AchievementManager } from "../../manager/AchievementManager";
import { BagManager } from "../../manager/bagsManager";
import { DifficultyManager } from "../../manager/DifficultyManager";
import { GameStateManager } from "../../manager/gameStateManager";
import { JoinPokemonManager } from "../../manager/joinPokemonManager";
import { PokemonBoxManager } from "../../manager/pokeBoxManager";
import { PokeDexManager } from "../../manager/pokeDexManager";
import { SessionLockManager } from "../../manager/SessionLockManager";
import { UserDaoManager } from "../../manager/userDaoManager";
import { QrcodeGenerator } from "../../utils/QrcodeGenerator";
import { RestoreCodeExtractor } from "../../utils/RestoreCodeExtractor";
import { MessageType } from '../../dataAccessObj/messageType';
import { PokemonDao, RawPokemonData } from '../../dataAccessObj/pokemon';

const pokemonDataMap = pokemonGen1Data as unknown as Record<string, RawPokemonData>;
const pokemonMoveDataMap = moveData as unknown as Record<string, any>;

export class DeviceBindCommandHandler {
    private readonly pokemonBoxManager: PokemonBoxManager;
    private readonly partyManager: JoinPokemonManager;
    private readonly context: vscode.ExtensionContext;

    // Composite Handler 

    private _handlerContext: HandlerContext | null = null;

    constructor(
        pokemonBoxManager: PokemonBoxManager,
        partyManager: JoinPokemonManager,
        context: vscode.ExtensionContext
    ) {
        this.pokemonBoxManager = pokemonBoxManager;
        this.partyManager = partyManager;
        this.context = context;
    }

    public setHandlerContext(handlerContext: HandlerContext): void {
        this._handlerContext = handlerContext;
    }

    private get handlerContext(): HandlerContext {
        if (!this._handlerContext) {
            throw new Error('HandlerContext not set. Call setHandlerContext first.');
        }
        return this._handlerContext;
    }
    


    // ==================== Device Bind & 2FA ====================
    public async handleGetDeviceBindState(): Promise<void> {
        try {
            const deviceBindState = await this.partyManager.getDeviceBindState();
            if(deviceBindState.twoFactorSecret === undefined || deviceBindState.twoFactorSecret === '' || deviceBindState.twoFactorSecret === null) {
                vscode.window.showWarningMessage('Device is not bound. Genearte new 2FA secret.');
                const newSecret = await this.partyManager.getOrGenerateTwoFactorSecret();
                deviceBindState.twoFactorSecret = newSecret;
            }
            this.handlerContext.postMessage({
                type: MessageType.DeviceBindStateData,
                data: deviceBindState
            });
        } catch (error) {
            console.error('[CommandHandler] Error getting 2FA secret:', error);
            vscode.window.showErrorMessage('Failed to get 2FA secret: ' + (error as Error).message);
        }
    }


    public async handleSetDeviceLock(payload: SetDeviceLockPayload): Promise<void> {
        try {
            if (payload.isLocked && payload.newLockId) {
                await this.partyManager.lock(payload.newLockId);
            } else {
                await this.partyManager.unlock(payload.newLockId!);
            }
            this.handlerContext.updateAllViews();
        } catch (error) {
            console.error('[CommandHandler] Error setting device lock:', error);
            vscode.window.showErrorMessage('Failed to set device lock: ' + (error as Error).message);
        }
    }

    public async handleGetBindCode(): Promise<void> {
        try {
            // 1. Get necessary data
            const bindState = this.partyManager.getDeviceBindState();
            const secret = await this.partyManager.getOrGenerateTwoFactorSecret();
            const party = this.partyManager.getAll();
            
            // Minimize party data to reduce size
            const minimizedParty = party.map(p => {
                return {
                    ...p,
                    stats: {},
                    pokemonMoves: p.pokemonMoves.map(m => ({
                        name: m.name,
                        pp: m.pp,
                        maxPP: m.maxPP
                    }))
                };
            });

            // 2. Construct payload object
            // 無論是首次設定 (Setup Mode) 還是重新同步 (Re-sync)
            // 初始 QR Code 都只包含 Secret，不包含 Party 資料
            // 必須通過 2FA 驗證後，才會產生包含 Party 資料的 QR Code
            const payload = {
                secret: secret,
                party: [], 
                lockId: -1,
                timestamp: Date.now()
            };
            
            // 3. Calculate Hash (CRC)
            const payloadString = JSON.stringify(payload);
            const hash = crypto.createHash('sha256').update(payloadString).digest('hex');
            
            const finalData = {
                ...payload,
                hash: hash
            };

            // 4. Compress and Generate QR Code
            const finalJson = JSON.stringify(finalData);
            const compressed = zlib.gzipSync(finalJson);
            const base64Data = compressed.toString('base64');
            
            // Use the compressed base64 string for QR code
            // Prefix with "GZIP:" to let the scanner know it's compressed
            const qrContent = `GZIP:${base64Data}`;
            
            // QR Code Capacity Check (Version 40, Byte Mode, Level M ~= 2331 chars)
            const maxCapacity = 2331; 
            console.log(`[CommandHandler] Payload Size: ${qrContent.length} chars. Usage: ~${((qrContent.length / maxCapacity) * 100).toFixed(1)}% of max limit (Level M).`);

            const qrCodeDataUrl = await QrcodeGenerator.generate(qrContent);
            console.log('[CommandHandler] Generated Bind QR Code Data URL. Length:', qrCodeDataUrl.length);

            // 5. Open in new Webview Panel
            const panel = vscode.window.createWebviewPanel(
                'bindDevice',
                'Bind Device QR Code',
                vscode.ViewColumn.Beside,
                { enableScripts: true }
            );

            // Handle messages from the webview
            const messageListener = panel.webview.onDidReceiveMessage(
                async message => {
                    switch (message.command) {
                        case 'verify':
                            try {
                                const isValid = await this.partyManager.verifyTwoFactor(message.token);
                                if (isValid) {
                                    await this.partyManager.lock(bindState.lockId+1);
                                    this.handlerContext.updateAllViews();
                                    vscode.window.showInformationMessage('2FA Verification Successful!');
                                    panel.webview.postMessage({ command: 'verifyResult', success: true });
                                    
                                    // 驗證成功後，無論是 Setup Mode 還是 Re-sync，都重新產生包含完整資料的 QR Code
                                    // Regenerate QR with full data
                                    const fullPayload = {
                                        secret: secret,
                                        party: minimizedParty,
                                        lockId: bindState.lockId+1,
                                        timestamp: Date.now()
                                    };
                                    const fullPayloadString = JSON.stringify(fullPayload);
                                    const fullHash = crypto.createHash('sha256').update(fullPayloadString).digest('hex');
                                    const fullFinalData = { ...fullPayload, hash: fullHash };
                                    const fullCompressed = zlib.gzipSync(JSON.stringify(fullFinalData));
                                    const fullBase64Data = fullCompressed.toString('base64');
                                    const fullQrContent = `GZIP:${fullBase64Data}`;
                                    const fullQrCodeDataUrl = await QrcodeGenerator.generate(fullQrContent);
                                    
                                    panel.webview.postMessage({ 
                                        command: 'updateQR', 
                                        qrCodeDataUrl: fullQrCodeDataUrl,
                                        message: '2FA 驗證成功！請掃描此 QR Code 以同步資料。'
                                    });
                                } else {
                                    vscode.window.showErrorMessage('驗證碼無效。');
                                    panel.webview.postMessage({ command: 'verifyResult', success: false });
                                }
                            } catch (error) {
                                vscode.window.showErrorMessage('驗證 2FA 時發生錯誤: ' + (error as Error).message);
                            }
                            return;
                    }
                }
            );

            panel.onDidDispose(() => {
                messageListener.dispose();
            });

            const htmlPath = path.join(this.context.extensionPath, 'resources', 'bindDevice.html');
            let htmlContent = fs.readFileSync(htmlPath, 'utf8');
            htmlContent = htmlContent.replace('${qrCodeDataUrl}', qrCodeDataUrl);
            panel.webview.html = htmlContent;
        } catch (error) {
            console.error('[CommandHandler] Error generating bind code:', error);
            vscode.window.showErrorMessage('Failed to generate bind code: ' + (error as Error).message);
        }
    }

    public async handleImportBindCode(): Promise<void> {
        const input = await vscode.window.showInputBox({
            placeHolder: 'Paste the Bind Code here (starts with GZIP:)',
            prompt: 'Import Bind Code to sync data'
        });

        if (!input) {
            return;
        }

        try {
            const data = RestoreCodeExtractor.extract(input);
            console.log('[CommandHandler] Imported Bind Code Data:', data);

            // Force Update Check
            const currentBindState = this.partyManager.getDeviceBindState();
            if (!currentBindState.isLock) {
                const selection = await vscode.window.showWarningMessage(
                    'Device is currently UNLOCKED. Importing will overwrite your local changes. This is a FORCE UPDATE.',
                    'Proceed',
                    'Cancel'
                );
                if (selection !== 'Proceed') {
                    return;
                }
            } else {
                // Check version if locked
                const currentVer = currentBindState.lockId || 0;
                const newVer = data.lockId || 0;
                if (newVer <= currentVer) {
                    const selection = await vscode.window.showWarningMessage(
                        `Imported version (${data.lockId}) is older or equal to current version (${currentBindState.lockId}). Import anyway?`,
                        'Yes',
                        'Cancel'
                    );
                    if (selection !== 'Yes') {
                        return;
                    }
                }
            }

            // Restore full move data from minimized party
            const restoredParty = data.party.map((p: PokemonDao) => {
                const restoredMoves: PokemonMove[] = p.pokemonMoves.map((m: any) => {
                    const moveDetails = pokemonMoveDataMap[m.name];
                    console.log(`[CommandHandler] Restoring move for Pokemon ${p.name}:`, m, moveDetails);
                    if(m.name === moveDetails?.name){
                        // If both id and name match, no need to restore
                        return {
                            ...moveDetails,
                            pp: moveDetails.pp,
                            maxPP: moveDetails.pp
                        };
                    }
                    return m;
                });
                if(restoredMoves.length !== p.pokemonMoves.length){
                    console.warn(`[CommandHandler] Move restoration mismatch for Pokemon ${p.name}. Expected ${p.pokemonMoves.length}, got ${restoredMoves.length}`);
                    const rawPokemonData = pokemonDataMap[p.id];
                    const allMoves: PokemonMove[] = rawPokemonData.moves.map((moveInfo) => {
                        const moveDetails = pokemonMoveDataMap[moveInfo.name];
                        if (moveDetails !== undefined && moveInfo.level_learned_at <= p.level && moveInfo.learn_method === 'level-up') {
                            return moveDetails as PokemonMove;
                        }
                        return null;
                    }).filter((move): move is PokemonMove => move !== null);
                    const remainCanLearnMove = allMoves.filter(am => !restoredMoves.find((rm: any) => rm.name === am.name));
                    console.log(`[CommandHandler] Attempting to restore missing moves for ${p.name}. Can learn: ${remainCanLearnMove.map(m => m.name).join(', ')}`);
                    for (const missingMove of remainCanLearnMove) {
                        if (restoredMoves.length >= 4) break;
                        restoredMoves.push({
                            ...missingMove,
                            pp: missingMove.pp,
                            maxPP: missingMove.pp
                        });
                        console.log(`[CommandHandler] Restored missing move ${missingMove.name} for ${p.name}`);
                    }
                }
                return {
                    ...p,
                    stats: p.baseStats,
                    pokemonMoves: restoredMoves
                };
            });

            // Logic: Sync Party
            // 1. Identify Extras (Local Party - Imported Party) -> Move to Box
            const localParty = this.partyManager.getAll();
            const importedUids = new Set(restoredParty.map((p: any) => p.uid));
            const extras = localParty.filter(p => !importedUids.has(p.uid));

            if (extras.length > 0) {
                for (const extra of extras) {
                    try {
                        await this.pokemonBoxManager.add(extra);
                    } catch (e) {
                        throw new Error(`Box is full, cannot move ${extra.name} to box. Import aborted.`);
                    }
                }
            }

            // 2. Remove Imported Pokemon from Box (if they exist there) -> They are now in Party
            const importedUidList = restoredParty.map((p: any) => p.uid);
            await this.pokemonBoxManager.batchRemove(importedUidList);

            // 3. Import Data (Overwrite Party)
            // payload has: secret, party, lockId, timestamp
            const secretToUse = currentBindState.twoFactorSecret;

            await this.partyManager.importData(restoredParty, secretToUse, data.lockId);

            // 4. unlock if locked
            const isCurrentlyLocked = this.partyManager.isDeviceLocked();
            if (isCurrentlyLocked) {
                await this.partyManager.unlock(data.lockId);
            }

            // 5. Notify Success
            vscode.window.showInformationMessage('Data imported successfully!');
            this.handlerContext.updateAllViews();

        } catch (error) {
            console.error('[CommandHandler] Import failed:', error);
            vscode.window.showErrorMessage('Failed to import data: ' + (error as Error).message);
        }
    }
}