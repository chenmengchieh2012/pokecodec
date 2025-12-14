# 🐛 Bug Report - Pokecodec Project

## � 中等等級: Warning (可能導致非預期行為)

### 1. VPartyBox.module.css - 空的 CSS 規則集
**檔案**: [webview-ui/src/frame/VPartyBox.module.css](webview-ui/src/frame/VPartyBox.module.css#L130-L132)
```css
.hpRed {}
.hpYellow {}
.hpGreen {}
```
**問題**: 這些 CSS 類別是空的，但被 JavaScript 用來判斷狀態。雖然功能上可行，但不是最佳實踐。
**建議**: 如果只是用來做狀態判斷，考慮使用 data attributes 或其他方式。

---

## 🟡 低等級: Enhancement (程式碼品質)

### 2. package.json - 缺少 view icon
**檔案**: [package.json](package.json#L50-L67)
**問題**: Views 的設定缺少 `icon` 屬性。
**修復**: 為每個 view 添加 icon 設定。

---

### 3. messageStore.ts - 初始化輪詢間隔過短
**檔案**: [webview-ui/src/store/messageStore.ts](webview-ui/src/store/messageStore.ts#L218)
```typescript
}, 500); // 每 0.5 秒請求一次
```
**問題**: 500ms 的輪詢間隔可能過於頻繁，增加不必要的負載。
**建議**: 考慮增加間隔或使用更智能的請求策略。

---

### 4. 大量的 console.log 殘留
**影響檔案**: 多個檔案
- `src/extension.ts`
- `src/handler/CommandHandler.ts`
- `webview-ui/src/manager/battleManager.ts`
- `webview-ui/src/store/messageStore.ts`
- `webview-ui/src/hook/usePokemonState.ts`
- `webview-ui/src/frame/VPartyBox.tsx`
- 等...

**問題**: 生產環境不應該有大量的 console.log。
**建議**: 
- 移除或註解掉 debug 用的 console.log
- 或實作一個 DEBUG flag 來控制 log 輸出

---

## 📋 建議修復順序

1. **儘快修復** (Warning):
   - [ ] 處理空的 CSS 規則集

2. **之後修復** (Enhancement):
   - [ ] 清理 console.log
   - [ ] 添加 view icons
   - [ ] 調整輪詢間隔

---

*報告產生時間: 2025-12-14*
*最後更新: 2025-12-14 (已修復 9 項問題)*
