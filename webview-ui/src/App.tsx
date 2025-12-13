import './App.css';
import { VBattlePage } from './view/VBattlePage';
import { VPartyPokemonAndBag } from './view/VPartyPokemonAndBag';
import { VPokemonBox } from './view/VPokemonBox';
import { VShop } from './view/VShop';



function App() {
  // 取得目前的 View Type (由 extension.ts 注入)
  interface WindowWithViewType extends Window {
    viewType?: 'game' | 'backpack' | 'box' | 'shop';
  }
  const viewType = (window as WindowWithViewType).viewType || 'game';

  return <>
  {/* 根據 viewType 決定要顯示哪個元件 */}
  {viewType === 'game' && <VBattlePage />}
  {viewType === 'backpack' && <VPartyPokemonAndBag />}
  {viewType === 'box' && <VPokemonBox />}
  {viewType === 'shop' && <VShop />}
  </>
}

export default App;
