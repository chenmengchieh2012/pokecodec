
## 手機home 開始
1.1 vscode 傳送第一個金鑰+2fa seed+六隻寶可夢(隊伍)資訊到手機 (qrcode)
  - 手機綁定後可後續進行 2FA (手機產生數字，vscode 輸入)
  - 2FA 在vscode 驗證後，在vscode 上鎖
  - qrocde 上 hash 上面所有資訊當成crc (驗證綁定用)
  - 後續若在其他台電腦，也可用這crc 當成綁定


1.2 更改綁定(改了隊伍後想重新綁定)
  - 手機端重新掃描qrcode，生成新的crc
  - 走回1.1


2. 手機資料結構
  - 電腦id: 
    - 綁定增量序號
    - CRC
    - 電腦的2fa金鑰
  - 六隻寶可夢完整資訊
  - 版本號：<電腦ID>-<增量序號>

3. 電腦資料結構
  - 綁定狀態
  - 綁定紀錄序號
  - 上次解除綁定的序號
  

3. vscode同步手機
  - 先觀察目前手機版本迭代資訊
  - VS Code 傳送 新的版本號 => [Base: v8] + [New Data] + [New CRC: v9]
  - 手機檢查： 手機看到 (Base: v8)，比對自己資料庫裡該電腦的最後紀錄。
    - 如果手機紀錄該電腦也是 v8 => 驗證通過，允許更新。
    - 如果手機紀錄是 v7 或 v9 => 拒絕同步，代表該電腦跳過還原或重複同步。
    - 拒絕同步的狀態下，就只能走 4.1 (不能走1.2，因為其他電腦會有問題)
  - 進行2fa確認已經收到收機內


4.1 手機還原至電腦失效(強制還原)
  - 於其他電腦發現與手機隊伍不同的時候 (已綁定也可能發生)
    - vscode 向手機要求所有數據，並將所有資訊同步回其他電腦
      - 若發現手機寶可夢還在vscode box 或隊伍內，就更新
      - 若發現 vscode 不存在(vscode 沒有，手機有)，則新增寶可夢
      - 若發現 vscode 有其他不是手機內的寶可夢(vscode有，手機沒有)，則移轉到box中
  - 於其他電腦發現與手機隊伍相同，卻與之前手機紀錄電腦資訊不符合
    - 手機直接覆蓋現有資訊

5.0 強制解鎖
  - 相當於reset，之後換新手機走回1.1

## 2FA 實作流程 (基於 TwoFACertificate.ts)
1. **綁定階段 (Binding)**
   - 產生 Secret: `TwoFACertificate.generateSecret()`
   - 儲存 Secret: 存入 `deviceBindState.twoFactorSecret`
   - 顯示 QR Code: 使用 `QrcodeGenerator` 顯示 Secret 給使用者掃描

2. **驗證階段 (Verification)**
   - 使用者輸入 6 位數 Token
   - 驗證: `TwoFACertificate.verifyToken(secret, token)`
   - 防重放: 檢查 `verifiedCounter > deviceBindState.twoFactorLastVerified`
   - 更新狀態: 更新 `twoFactorLastVerified`