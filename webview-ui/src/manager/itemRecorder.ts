import { ItemDao } from "../../../src/dataAccessObj/item";
import { MessageType } from "../../../src/dataAccessObj/messageType";
import {  RecordItemActionPayload } from "../../../src/utils/AchievementCritiria";
import { vscode } from "../utilities/vscode";

export const ItemRecorder = ()=>{
    const onItemAction = async (action: 'buy' | 'use', itemDao: ItemDao, count: number, isUseless: boolean)=>{
        const payload: RecordItemActionPayload = {
            action: action,
            item: { name: itemDao.apiName, category: itemDao.category, price: itemDao.price },
            quantity: count,
            isUseless: isUseless
        };
        vscode.postMessage({
            command: MessageType.RecordItemAction,
            ...payload
        });
    }
    return {
        onItemAction
    }
}