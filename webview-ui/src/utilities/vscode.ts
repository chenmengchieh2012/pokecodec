// 1. 刪除原本的 import，直接在這裡定義介面
interface WebviewApi<StateType = unknown> {
  postMessage(message: unknown): void;
  getState(): StateType | undefined;
  setState(newState: StateType): void;
}

// 宣告全域函式 acquireVsCodeApi (避免 TypeScript 報錯說找不到這個函式)
declare function acquireVsCodeApi(): WebviewApi;

class VSCodeAPIWrapper {
  private readonly vsCodeApi: WebviewApi | undefined;

  constructor() {
    // 檢查是否在 VS Code Webview 環境中 (因為在瀏覽器直接開 localhost 會沒有這個函式)
    if (typeof acquireVsCodeApi === "function") {
      this.vsCodeApi = acquireVsCodeApi();
    }
  }

  /**
   * 傳送訊息給 Extension (後端)
   */
  public postMessage(message: unknown) {
    if (this.vsCodeApi) {
      this.vsCodeApi.postMessage(message);
    } else {
      console.log("Dev Only (Not in VS Code): Message sent", message);
    }
  }

  /**
   * 取得暫存狀態
   */
  public getState(): unknown | undefined {
    if (this.vsCodeApi) {
      return this.vsCodeApi.getState();
    } else {
      const state = localStorage.getItem("vscodeState");
      return state ? JSON.parse(state) : undefined;
    }
  }

  /**
   * 設定暫存狀態
   */
  public setState(newState: unknown): void {
    if (this.vsCodeApi) {
      this.vsCodeApi.setState(newState);
    } else {
      localStorage.setItem("vscodeState", JSON.stringify(newState));
    }
  }
}


// 匯出單例模式 (Singleton)
export const vscode = new VSCodeAPIWrapper();