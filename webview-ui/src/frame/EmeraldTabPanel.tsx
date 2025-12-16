import React from 'react';
import styles from './EmeraldTabPanel.module.css';

export interface EmeraldTab {
    label: string;
    onClick: () => void;
    isActive: boolean;
    disabled?: boolean;
}

export interface EmeraldAction {
    label: React.ReactNode;
    onClick: () => void;
    isDanger?: boolean;
}

interface EmeraldTabPanelProps {
    tabs: EmeraldTab[];
    actions?: EmeraldAction[];
    children: React.ReactNode;
}

export const EmeraldTabPanel: React.FC<EmeraldTabPanelProps> = ({ tabs, actions, children }) => {
    return (
        <div className={styles.emeraldContainer}>
            {/* Tabs Navigation */}
            <div className={styles.nav}>
                <div className={styles.tabsLeft}>
                    {tabs.map((tab, index) => (
                        <div 
                            key={index}
                            className={`${styles.tab} ${tab.isActive ? styles.active : ''} ${tab.disabled ? styles.disabled : ''}`} 
                            onClick={() => !tab.disabled && tab.onClick()}
                        >
                            {tab.label}
                        </div>
                    ))}
                </div>
                
                <div className={styles.tabsRight}>
                    {actions?.map((action, index) => (
                        <button 
                            key={index}
                            className={`${styles.navBtn} ${action.isDanger ? styles.dangerBtn : ''}`} 
                            onClick={action.onClick}
                        >
                            {action.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className={styles.wallpaper}>
                {children}
            </div>
        </div>
    );
};
