import React, { useState, useEffect } from 'react';
import { BonusHeroCard } from './BonusHeroCard';
import { QuickActionsBar } from './QuickActionsBar';
import { MarketFrequencyAlerts } from './MarketFrequencyAlerts';
import { BottomNav } from './BottomNav';
import { MarketSelectionModal } from './MarketSelectionModal';
import { MarketDetailModal } from './MarketDetailModal';
import { ProductCalculator } from './ProductCalculator';
import { VorverkaufModal } from './VorverkaufModal';
import { TourPage } from './TourPage';
import { Header } from './Header';
import { ChatBubble } from './ChatBubble';
import { PreorderNotification } from './PreorderNotification';
import { VorbestellerModal } from './VorbestellerModal';
import { StatisticsContent } from './StatisticsContent';
import { AdminPanel } from '../admin/AdminPanel';
import Aurora from './Aurora';
import type { GLDashboard, NavigationTab } from '../../types/gl-types';
import type { TourRoute, Market } from '../../types/market-types';
import { allMarkets } from '../../data/marketsData';
import { useResponsive } from '../../hooks/useResponsive';
import styles from './Dashboard.module.css';

interface DashboardProps {
  data: GLDashboard;
}

export const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [isMarketModalOpen, setIsMarketModalOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isVorverkaufOpen, setIsVorverkaufOpen] = useState(false);
  const [isVorbestellerOpen, setIsVorbestellerOpen] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [activeTour, setActiveTour] = useState<TourRoute | null>(null);
  const [notificationTrigger, setNotificationTrigger] = useState(0);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const { isMobile } = useResponsive();

  // Keyboard shortcut for Admin Panel (Ctrl + Alt + A)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.altKey && (event.key === 'a' || event.key === 'A')) {
        event.preventDefault();
        console.log('Admin panel toggle');
        setIsAdminPanelOpen(prev => {
          console.log('Opening admin panel:', !prev);
          return !prev;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleBonusClick = () => {
    console.log('Navigate to bonus details');
    // TODO: Implement navigation
  };

  const handleStartVisit = () => {
    setIsMarketModalOpen(true);
  };

  const handleStartSingleVisit = (marketId: string) => {
    console.log('Start visit for market:', marketId);
    // TODO: Navigate to visit workflow
  };

  const handleStartTour = (route: TourRoute) => {
    console.log('Start tour with route:', route);
    setActiveTour(route);
  };

  const handleVorverkauf = () => {
    setIsVorverkaufOpen(true);
  };

  const handleVorbestellung = () => {
    console.log('Open Vorbestellung form');
    setIsVorbestellerOpen(true);
  };

  const handleCalculator = () => {
    setIsCalculatorOpen(true);
  };

  const handleViewAllFrequencies = () => {
    console.log('View all market frequencies');
    // TODO: Navigate to markets page with filter
  };

  const handleMarketClick = (marketId: string) => {
    const market = allMarkets.find(m => m.id === marketId);
    if (market) {
      setSelectedMarket(market);
    }
  };

  const handleStartMarketVisit = (marketId: string) => {
    console.log('Start visit for market:', marketId);
    setSelectedMarket(null);
    // TODO: Navigate to visit workflow
  };

  const handleTabChange = (tab: NavigationTab) => {
    setActiveTab(tab);
    console.log('Navigate to:', tab);
    // TODO: Implement routing
  };

  const handleNotificationClick = () => {
    setNotificationTrigger(prev => prev + 1);
  };

  // If there's an active tour, show the TourPage
  if (activeTour) {
    return <TourPage route={activeTour} user={data.user} onBack={() => setActiveTour(null)} />;
  }

  return (
    <div className={styles.dashboardWrapper}>
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
        firstName={data.user.firstName} 
        avatar={data.user.avatar}
        onNotificationClick={activeTab === 'dashboard' ? handleNotificationClick : undefined}
      />

      {/* Main Content */}
      <main className={`${styles.main} ${isMobile ? styles.withBottomNav : ''}`}>
        <div className={styles.container}>
          {activeTab === 'dashboard' && (
            <>
              {/* Bonus Hero Card */}
              <section className={styles.section}>
                <BonusHeroCard bonuses={data.bonuses} onClick={handleBonusClick} />
              </section>

              {/* Quick Actions */}
              <section className={styles.section}>
                <QuickActionsBar
                  openVisitsToday={data.quickActions.openVisitsToday}
                  onStartVisit={handleStartVisit}
                  onVorverkauf={handleVorverkauf}
                  onVorbestellung={handleVorbestellung}
                  onCalculator={handleCalculator}
                />
              </section>

              {/* Market Frequency Alerts */}
              {data.frequencyAlerts.length > 0 && (
                <section className={styles.section}>
                  <MarketFrequencyAlerts
                    alerts={data.frequencyAlerts}
                    onViewAll={handleViewAllFrequencies}
                    onMarketClick={handleMarketClick}
                  />
                </section>
              )}
            </>
          )}

          {activeTab === 'statistics' && (
            <StatisticsContent />
          )}
        </div>
      </main>

      {/* Bottom Navigation - Always mounted, never remounts */}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Preorder Notification - Only on dashboard */}
      {activeTab === 'dashboard' && (
        <PreorderNotification trigger={notificationTrigger} />
      )}

      {/* Market Selection Modal */}
      <MarketSelectionModal
        isOpen={isMarketModalOpen}
        onClose={() => setIsMarketModalOpen(false)}
        markets={allMarkets}
        onStartVisit={handleStartSingleVisit}
        onStartTour={handleStartTour}
      />

      {/* Market Detail Modal */}
      {selectedMarket && (
        <MarketDetailModal
          isOpen={true}
          onClose={() => setSelectedMarket(null)}
          onStartVisit={handleStartMarketVisit}
          market={selectedMarket}
        />
      )}

      {/* Product Calculator */}
      <ProductCalculator
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
      />

      {/* Vorverkauf Modal */}
      <VorverkaufModal
        isOpen={isVorverkaufOpen}
        onClose={() => setIsVorverkaufOpen(false)}
      />

      {/* Vorbesteller Modal */}
      <VorbestellerModal
        isOpen={isVorbestellerOpen}
        onClose={() => setIsVorbestellerOpen(false)}
      />

      {/* Chat Bubble */}
      <ChatBubble />

      {/* Admin Panel */}
      <AdminPanel
        isOpen={isAdminPanelOpen}
        onClose={() => setIsAdminPanelOpen(false)}
      />
    </div>
  );
};

