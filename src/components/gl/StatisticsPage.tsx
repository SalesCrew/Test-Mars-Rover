import React from 'react';
import { Header } from './Header';
import { ChatBubble } from './ChatBubble';
import { BottomNav } from './BottomNav';
import Aurora from './Aurora';
import type { NavigationTab } from '../../types/gl-types';
import styles from './StatisticsPage.module.css';

interface StatisticsPageProps {
  firstName?: string;
  avatar?: string;
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
}

export const StatisticsPage: React.FC<StatisticsPageProps> = ({
  firstName,
  avatar,
  activeTab,
  onTabChange,
}) => {
  return (
    <div className={styles.pageWrapper}>
      {/* Aurora Background */}
      <div className={styles.auroraBackground}>
        <Aurora
          colorStops={["#60A5FA", "#3B82F6", "#1E40AF"]}
          blend={0.6}
          amplitude={0.8}
          speed={0.3}
        />
      </div>

      {/* Header */}
      <Header 
        firstName={firstName} 
        avatar={avatar}
      />

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.container}>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={onTabChange} />

      {/* Chat Bubble */}
      <ChatBubble />
    </div>
  );
};

