import './App.css';
import { VBattlePage } from './view/VBattlePage';
import { VPartyPokemonAndBag } from './view/VPartyPokemonAndBag';
import { VPokemonComputer } from './view/VPokemonComputer';
import { VShop } from './view/VShop';
import { useIsLockParty, useSessionStatus } from './store/messageStore';
import { JSX } from 'react/jsx-dev-runtime';


export const ViewModelType = {
  MimeWashWindow: 'MimeWashWindow',
  Game: 'Game',
  None: 'None',
} as const;
type ViewModelType = keyof typeof ViewModelType;
function App() {
  // 取得目前的 View Type (由 extension.ts 注入)
  interface WindowWithViewType extends Window {
    viewType?: 'game' | 'backpack' | 'computer' | 'shop';
  }
  const viewType = (window as WindowWithViewType).viewType || 'game';
  const isSessionActive = useSessionStatus();
  const isLock = useIsLockParty();
  let viewModel: ViewModelType =  ViewModelType.Game;

  if ( viewType === 'game' ) {
    if( !isSessionActive ) {
      viewModel = ViewModelType.MimeWashWindow;
    }
    if (isLock) {
      viewModel = ViewModelType.None;
    }
  }

  if ( viewType === 'backpack' ) {
    if( !isSessionActive ) {
      viewModel = ViewModelType.None;
    }
  }
  if ( viewType === 'computer' ) {
    if( !isSessionActive ) {
      viewModel = ViewModelType.None;
    }
    if (isLock) {
      viewModel = ViewModelType.None;
    }
  }
  if ( viewType === 'shop' ) {
    if( !isSessionActive ) {
      viewModel = ViewModelType.None;
    }
    if (isLock) {
      viewModel = ViewModelType.None;
    }
  }


  if (viewModel === ViewModelType.None) {
    return ( <></> );
  }
  if (viewModel === ViewModelType.MimeWashWindow) {
    return (
      <>{MimeWashWindow()}</>
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

const MimeWashWindow = (): JSX.Element => {
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
  )
}

export default App;
