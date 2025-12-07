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

  if (viewType === 'backpack') return <VPartyPokemonAndBag/>;
  if (viewType === 'box') return <VPokemonBox />;
  if (viewType === 'shop') return <VShop />;

  return <VBattlePage />;
}

export default App;
