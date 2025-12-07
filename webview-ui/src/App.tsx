import './App.css';
import { VBattlePage } from './view/VBattlePage';
import { VPartyPokemonAndBag } from './view/VPartyPokemonAndBag';
import { VPokemonBox } from './view/VPokemonBox';


const Shop = () => (
    <div style={{ padding: '20px', color: '#cccccc', fontFamily: 'Consolas' }}>
        <h3>🏪 Poke Mart</h3>
        <div style={{ marginTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px', borderBottom: '1px solid #333' }}>
                <span>Poke Ball</span>
                <span></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px', borderBottom: '1px solid #333' }}>
                <span>Potion</span>
                <span></span>
            </div>
        </div>
    </div>
);

function App() {
  // 取得目前的 View Type (由 extension.ts 注入)
  interface WindowWithViewType extends Window {
    viewType?: 'game' | 'backpack' | 'box' | 'shop';
  }
  const viewType = (window as WindowWithViewType).viewType || 'game';

  if (viewType === 'backpack') return <VPartyPokemonAndBag/>;
  if (viewType === 'box') return <VPokemonBox />;
  if (viewType === 'shop') return <Shop />;

  return <VBattlePage />;
}

export default App;
