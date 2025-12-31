import './App.css';
import { VBattlePage } from './view/VBattlePage';
import { VPartyPokemonAndBag } from './view/VPartyPokemonAndBag';
import { VPokemonComputer } from './view/VPokemonComputer';
import { VShop } from './view/VShop';
import { useSessionStatus } from './store/messageStore';



function App() {
  // 取得目前的 View Type (由 extension.ts 注入)
  interface WindowWithViewType extends Window {
    viewType?: 'game' | 'backpack' | 'computer' | 'shop';
  }
  const viewType = (window as WindowWithViewType).viewType || 'game';
  const isSessionActive = useSessionStatus();

  if (!isSessionActive) {
    if (viewType !== 'game') {
      return ( <></> );
    }
    return (
      <div className="game-paused-overlay">
        <div className="mr-mime-container">
          <img 
            src="./sprites/pokemon/normal/122.gif" 
            alt="Mr. Mime" 
            className="mr-mime-wiping"
          />
          <div className="glass-reflection"></div>
        </div>
        <div className="paused-text-content">
          <h2>Mr. Mime used Barrier!</h2>
          <p>He's polishing the invisible wall while you're busy elsewhere.</p>
          <p className="resume-hint">
            Tap the glass to break the barrier!
          </p>
        </div>
      </div>
    );
  }

  return <> 
  {/* 根據 viewType 決定要顯示哪個元件 */}
  {viewType === 'game' && <VBattlePage />}
  {viewType === 'backpack' && <VPartyPokemonAndBag />}
  {viewType === 'computer' && <VPokemonComputer />}
  {viewType === 'shop' && <VShop />}
  </>
}

export default App;
