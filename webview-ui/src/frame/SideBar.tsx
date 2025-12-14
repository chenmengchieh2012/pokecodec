import { JSX, useState } from 'react';
import styles from './SideBar.module.css';

export interface MenuSideBarItem {
    activeTab: string,
    onActive: (tab: string) => void,
    Icons: JSX.Element,
}

export interface MenuSideBarProps {
    barItems: MenuSideBarItem[],
}

export const MenuSideBar = (props: MenuSideBarProps) => {
    const [tabOnClick, setTabOnClick] = useState<string>('');

    const handleOnCick = (item: MenuSideBarItem) => {
        setTabOnClick(item.activeTab);
        item.onActive(item.activeTab);
    }

    return (
        <div className={styles.sideBar}>
            {/* Sidebar: Icons Only */}
            <div className={styles.tabs}>
                {props.barItems.map((item, index) => (
                    <div
                        key={index}
                        className={`${styles.iconTab} ${tabOnClick === item.activeTab ? styles.active : ''}`}
                        onClick={() => handleOnCick(item)}
                        title={item.activeTab}
                    >
                        {item.Icons}
                    </div>
                ))}
            </div>
        </div>
    );
};