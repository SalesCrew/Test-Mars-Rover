import React, { useState, useEffect, useMemo } from 'react';
import { BonusHeroCard } from './BonusHeroCard';
import { QuickActionsBar } from './QuickActionsBar';
import { MarketFrequencyAlerts } from './MarketFrequencyAlerts';
import { BottomNav } from './BottomNav';
import { MarketSelectionModal } from './MarketSelectionModal';
import { MarketDetailModal } from './MarketDetailModal';
import { ProductCalculator } from './ProductCalculator';
import { VorverkaufModal } from './VorverkaufModal';
import { TourPage } from './TourPage';
import { MarketVisitPage } from './MarketVisitPage';
import { Header } from './Header';
import { ChatBubble } from './ChatBubble';
import { PreorderNotification } from './PreorderNotification';
import { VorbestellerModal } from './VorbestellerModal';
import { ZusatzZeiterfassungModal } from './ZusatzZeiterfassungModal';
import { ZeiterfassungVerlaufModal } from './ZeiterfassungVerlaufModal';
import { DayTrackingButton } from './DayTrackingButton';
import { DayTrackingModal } from './DayTrackingModal';
import { dayTrackingService, type DayTrackingStatus } from '../../services/dayTrackingService';
import { StatisticsContent } from './StatisticsContent';
import { ProfilePage } from './ProfilePage';
import { AdminPanel } from '../admin/AdminPanel';
import { BugReportModal } from './BugReportModal';
import { VorgemerktModal } from './VorgemerktModal';
import { OnboardingModal } from './OnboardingModal';
import { MarketsVisitedModal } from './MarketsVisitedModal';
import Aurora from './Aurora';
import { produktersatzService } from '../../services/produktersatzService';
import fragebogenService from '../../services/fragebogenService';
import type { GLDashboard, NavigationTab, GLProfile, Bonuses, MarketFrequencyAlert } from '../../types/gl-types';
import type { TourRoute, Market } from '../../types/market-types';
import { allMarkets as mockMarkets } from '../../data/marketsData';
import { mockProfileData } from '../../data/mockData';
import { useResponsive } from '../../hooks/useResponsive';
import { useAuth } from '../../contexts/AuthContext';
import { gebietsleiterService } from '../../services/gebietsleiterService';
import { marketService } from '../../services/marketService';
import { API_BASE_URL } from '../../config/database';
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
  const [isBugReportOpen, setIsBugReportOpen] = useState(false);
  const [isVorgemerktOpen, setIsVorgemerktOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isZusatzZeiterfassungOpen, setIsZusatzZeiterfassungOpen] = useState(false);
  const [isZeiterfassungVerlaufOpen, setIsZeiterfassungVerlaufOpen] = useState(false);
  const [isMarketsVisitedOpen, setIsMarketsVisitedOpen] = useState(false);
  const [pendingProdukttauschCount, setPendingProdukttauschCount] = useState(0);
  
  // Day tracking state
  const [isDayTrackingModalOpen, setIsDayTrackingModalOpen] = useState(false);
  const [dayTrackingStatus, setDayTrackingStatus] = useState<DayTrackingStatus>('not_started');
  const [dayTrackingModalMode, setDayTrackingModalMode] = useState<'start' | 'end' | 'force_close'>('start');
  const [daySummary, setDaySummary] = useState<{
    totalFahrzeit: string;
    totalBesuchszeit: string;
    marketsVisited: number;
  } | undefined>(undefined);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [activeTour, setActiveTour] = useState<TourRoute | null>(null);
  const [activeVisit, setActiveVisit] = useState<{
    market: Market;
    modules: any[];
    zeiterfassungActive: boolean;
  } | null>(null);
  const [notificationTrigger, setNotificationTrigger] = useState(0);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [glProfileData, setGlProfileData] = useState<any>(null);
  const [realMarkets, setRealMarkets] = useState<Market[]>([]);
  const [realBonuses, setRealBonuses] = useState<Bonuses | null>(null);
  const [realAlerts, setRealAlerts] = useState<MarketFrequencyAlert[]>([]);
  const { isMobile } = useResponsive();
  const { logout, user } = useAuth();

  // Fetch GL profile data on mount
  useEffect(() => {
    const fetchGLProfile = async () => {
      if (user?.id) {
        try {
          const glData = await gebietsleiterService.getGebietsleiterById(user.id);
          setGlProfileData(glData);
        } catch (error) {
          console.error('Error fetching GL profile:', error);
        }
      }
    };
    fetchGLProfile();
  }, [user?.id]);

  // Fetch pending Produkttausch count
  const fetchPendingCount = async () => {
    if (user?.id) {
      try {
        const entries = await produktersatzService.getPendingEntries(user.id);
        setPendingProdukttauschCount(entries.length);
      } catch (error) {
        console.error('Error fetching pending count:', error);
      }
    }
  };

  useEffect(() => {
    fetchPendingCount();
  }, [user?.id]);

  // Check onboarding status on mount
  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user?.id) return;
      
      try {
        const response = await fetch(`${API_BASE_URL}/gebietsleiter/${user.id}/onboarding/produkttausch-v1`);
        if (response.ok) {
          const data = await response.json();
          if (!data.hasRead) {
            setIsOnboardingOpen(true);
          }
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      }
    };
    
    checkOnboarding();
  }, [user?.id]);

  // Handle onboarding completion
  const handleOnboardingComplete = async () => {
    if (!user?.id) return;
    
    try {
      await fetch(`${API_BASE_URL}/gebietsleiter/${user.id}/onboarding/produkttausch-v1`, {
        method: 'POST'
      });
    } catch (error) {
      console.error('Error marking onboarding as read:', error);
    }
    
    setIsOnboardingOpen(false);
  };

  // Load day tracking status on mount
  useEffect(() => {
    const loadDayTrackingStatus = async () => {
      if (!user?.id) return;
      
      try {
        const status = await dayTrackingService.getStatus(user.id);
        if (status) {
          setDayTrackingStatus(status.status as DayTrackingStatus);
          // If day is active, prepare summary for end modal
          if (status.status === 'active') {
            const summary = await dayTrackingService.getDaySummary(user.id);
            setDaySummary({
              totalFahrzeit: dayTrackingService.formatInterval(summary.totalFahrzeit),
              totalBesuchszeit: dayTrackingService.formatInterval(summary.totalBesuchszeit),
              marketsVisited: summary.marketsVisited
            });
          }
        } else {
          setDayTrackingStatus('not_started');
        }
      } catch (error) {
        console.error('Error loading day tracking status:', error);
        setDayTrackingStatus('not_started');
      }
    };
    
    loadDayTrackingStatus();
  }, [user?.id]);

  // Check for 9 PM force close
  useEffect(() => {
    const checkForceClose = () => {
      const now = new Date();
      if (now.getHours() >= 21 && dayTrackingStatus === 'active') {
        setDayTrackingModalMode('force_close');
        setIsDayTrackingModalOpen(true);
      }
    };
    
    // Check every minute
    const interval = setInterval(checkForceClose, 60000);
    // Initial check
    checkForceClose();
    
    return () => clearInterval(interval);
  }, [dayTrackingStatus]);

  const handleDayTrackingClick = async () => {
    if (dayTrackingStatus === 'active') {
      // Show end modal
      if (user?.id) {
        try {
          const summary = await dayTrackingService.getDaySummary(user.id);
          setDaySummary({
            totalFahrzeit: dayTrackingService.formatInterval(summary.totalFahrzeit),
            totalBesuchszeit: dayTrackingService.formatInterval(summary.totalBesuchszeit),
            marketsVisited: summary.marketsVisited
          });
        } catch (error) {
          console.error('Error loading summary:', error);
        }
      }
      setDayTrackingModalMode('end');
    } else {
      // Show start modal
      setDayTrackingModalMode('start');
    }
    setIsDayTrackingModalOpen(true);
  };

  // Handle start day
  const handleStartDay = async (skipFahrzeit: boolean) => {
    if (!user?.id) return;
    
    try {
      await dayTrackingService.startDay(user.id, { skipFahrzeit });
      setDayTrackingStatus('active');
      setIsDayTrackingModalOpen(false);
    } catch (error) {
      console.error('Error starting day:', error);
      alert('Fehler beim Starten des Tages');
    }
  };

  // Handle end day
  const handleEndDay = async (endTime: string) => {
    if (!user?.id) return;
    
    try {
      await dayTrackingService.endDay(user.id, { 
        endTime, 
        forceClose: dayTrackingModalMode === 'force_close' 
      });
      setDayTrackingStatus('completed');
      setIsDayTrackingModalOpen(false);
    } catch (error) {
      console.error('Error ending day:', error);
      alert('Fehler beim Beenden des Tages');
    }
  };

  // Fetch real markets from database (only for current GL)
  useEffect(() => {
    const fetchMarkets = async () => {
      if (!user?.id) return;
      
      try {
        const dbMarkets = await marketService.getAllMarkets();
        // Filter to only markets assigned to this GL
        const glMarkets = dbMarkets.filter(m => m.gebietsleiter === user.id);
        const markets: Market[] = glMarkets.map(m => ({
          id: m.id,
          name: m.name,
          address: m.address,
          city: m.city,
          postalCode: m.postalCode,
          chain: m.chain || '',
          frequency: m.frequency || 12,
          currentVisits: m.currentVisits || 0,
          lastVisitDate: m.lastVisitDate || '',
          isCompleted: m.isCompleted || false,
          gebietsleiter: m.gebietsleiter,
        }));
        setRealMarkets(markets);
      } catch (error) {
        console.error('Error fetching markets:', error);
        setRealMarkets([]); // Empty array on error
      }
    };
    fetchMarkets();
  }, [user?.id]);

  // Fetch real dashboard stats
  useEffect(() => {
    const fetchDashboardStats = async () => {
      if (!user?.id) return;
      
      try {
        const response = await fetch(`${API_BASE_URL}/gebietsleiter/${user.id}/dashboard-stats`);
        if (response.ok) {
          const stats = await response.json();
          setRealBonuses({
            yearTotal: stats.yearTotal || 0,
            percentageChange: stats.percentageChange || 0,
            sellIns: stats.vorverkaufCount || 0,
            preOrders: stats.vorbestellungCount || 0,
            marketsVisited: {
              current: stats.marketsVisited || 0,
              target: stats.totalMarkets || 0
            }
          });
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      }
    };
    fetchDashboardStats();
  }, [user?.id]);

  // Fetch suggested markets with smart priority scoring
  useEffect(() => {
    const fetchSuggestedMarkets = async () => {
      if (!user?.id) return;
      
      try {
        const response = await fetch(`${API_BASE_URL}/gebietsleiter/${user.id}/suggested-markets`);
        if (response.ok) {
          const suggestions = await response.json();
          setRealAlerts(suggestions.map((s: any) => ({
            marketId: s.marketId,
            name: s.name,
            address: s.address,
            visits: s.visits,
            status: s.status,
            lastVisitWeeks: s.lastVisitWeeks,
            priorityReason: s.priorityReason || 'Regelmäßiger Besuch',
            priorityScore: s.priorityScore || 0
          })));
        }
      } catch (error) {
        console.error('Error fetching suggested markets:', error);
      }
    };
    fetchSuggestedMarkets();
  }, [user?.id]);

  // Fetch real profile stats
  const [profileStats, setProfileStats] = useState<any>(null);
  
  useEffect(() => {
    const fetchProfileStats = async () => {
      if (!user?.id) return;
      try {
        const response = await fetch(`${API_BASE_URL}/gebietsleiter/${user.id}/profile-stats`);
        if (response.ok) {
          const stats = await response.json();
          setProfileStats(stats);
        }
      } catch (error) {
        console.error('Error fetching profile stats:', error);
      }
    };
    fetchProfileStats();
  }, [user?.id]);

  // Build profile data from GL data or use mock as fallback
  const profileData: GLProfile = useMemo(() => {
    if (glProfileData) {
      return {
        ...mockProfileData, // Keep some mock fields (mostVisitedMarket, topMarkets)
        id: glProfileData.id,
        name: glProfileData.name,
        address: glProfileData.address,
        postalCode: glProfileData.postal_code,
        city: glProfileData.city,
        phone: glProfileData.phone,
        email: glProfileData.email,
        profilePictureUrl: glProfileData.profile_picture_url,
        createdAt: glProfileData.created_at,
        // Real stats from backend
        monthlyVisits: profileStats?.monthlyVisits ?? mockProfileData.monthlyVisits,
        totalMarkets: profileStats?.totalMarkets ?? mockProfileData.totalMarkets,
        sellInSuccessRate: profileStats?.sellInSuccessRate ?? mockProfileData.sellInSuccessRate,
        monthChangePercent: profileStats?.monthChangePercent,
        sellInChangePercent: profileStats?.sellInChangePercent,
        mostVisitedMarket: profileStats?.mostVisitedMarket ?? mockProfileData.mostVisitedMarket,
        vorverkaufeCount: profileStats?.vorverkaufeCount ?? 0,
        vorbestellerCount: profileStats?.vorbestellerCount ?? 0,
        produkttauschCount: profileStats?.produkttauschCount ?? 0,
        topMarkets: profileStats?.topMarkets ?? mockProfileData.topMarkets,
      };
    }
    return mockProfileData;
  }, [glProfileData, profileStats]);

  const handleLogout = () => {
    logout();
  };

  // Admin Panel keyboard shortcut DISABLED - admin access via separate login only
  // useEffect(() => {
  //   const handleKeyDown = (event: KeyboardEvent) => {
  //     if (event.ctrlKey && event.altKey && (event.key === 'a' || event.key === 'A')) {
  //       event.preventDefault();
  //       console.log('Admin panel toggle');
  //       setIsAdminPanelOpen(prev => {
  //         console.log('Opening admin panel:', !prev);
  //         return !prev;
  //       });
  //     }
  //   };
  //   window.addEventListener('keydown', handleKeyDown);
  //   return () => {
  //     window.removeEventListener('keydown', handleKeyDown);
  //   };
  // }, []);

  const handleBonusClick = () => {
    console.log('Navigate to bonus details');
    // TODO: Implement navigation
  };

  const handleStartVisit = () => {
    setIsMarketModalOpen(true);
  };

  const handleStartSingleVisit = async (marketId: string) => {
    console.log('Start visit for market:', marketId);
    
    // Find the market
    const markets = realMarkets.length > 0 ? realMarkets : mockMarkets;
    const market = markets.find((m: Market) => m.id === marketId);
    if (!market) {
      console.error('Market not found:', marketId);
      return;
    }
    
    // Record visit to update market frequency
    if (user?.id) {
      try {
        await marketService.recordVisit(marketId, user.id);
      } catch (visitError) {
        console.warn('Could not record market visit:', visitError);
      }
    }
    
    // Fetch active fragebogen for this market
    try {
      const allFragebogen = await fragebogenService.fragebogen.getAll({ status: 'active' });
      
      // Find fragebogen assigned to this market
      const marketFragebogen = allFragebogen.find((f: any) => 
        f.market_ids && f.market_ids.includes(marketId)
      );
      
      if (marketFragebogen) {
        // Fetch full fragebogen with modules and questions
        const fullFragebogen = await fragebogenService.fragebogen.getById(marketFragebogen.id);
        
        // Transform modules to the format MarketVisitPage expects
        const modules = (fullFragebogen.modules || []).map((fm: any) => ({
          id: fm.module?.id || fm.id,
          name: fm.module?.name || 'Modul',
          questions: (fm.module?.questions || []).map((q: any) => ({
            id: q.question?.id || q.id,
            type: q.question?.type || 'open_text',
            questionText: q.question?.question_text || '',
            instruction: q.question?.instruction,
            required: q.required || false,
            options: q.question?.options,
            likertScale: q.question?.likert_scale,
            matrixRows: q.question?.matrix_config?.rows,
            matrixColumns: q.question?.matrix_config?.columns,
            numericConstraints: q.question?.numeric_constraints,
            sliderConfig: q.question?.slider_config
          }))
        }));
        
        console.log('Starting visit with fragebogen:', fullFragebogen.name, 'modules:', modules.length);
        
        setActiveVisit({
          market,
          modules,
          zeiterfassungActive: true // Always enable zeiterfassung
        });
        setIsMarketModalOpen(false);
      } else {
        console.log('No active fragebogen found for this market');
        // Still start the visit but without a fragebogen
        setActiveVisit({
          market,
          modules: [],
          zeiterfassungActive: true
        });
        setIsMarketModalOpen(false);
      }
    } catch (error) {
      console.error('Error fetching fragebogen:', error);
      // Still start the visit but without a fragebogen
      setActiveVisit({
        market,
        modules: [],
        zeiterfassungActive: true
      });
      setIsMarketModalOpen(false);
    }
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
    const markets = realMarkets.length > 0 ? realMarkets : mockMarkets;
    const market = markets.find((m: Market) => m.id === marketId);
    if (market) {
      setSelectedMarket(market);
    }
  };

  const handleStartMarketVisit = async (marketId: string) => {
    setSelectedMarket(null);
    await handleStartSingleVisit(marketId);
  };

  const handleTabChange = (tab: NavigationTab) => {
    setActiveTab(tab);
    console.log('Navigate to:', tab);
  };

  const handleProfileClick = () => {
    setActiveTab('profile');
  };

  const _handleNotificationClick = () => {
    setNotificationTrigger(prev => prev + 1);
  };
  void _handleNotificationClick; // Reserved for future use

  // If there's an active market visit, show the MarketVisitPage
  if (activeVisit) {
    return (
      <>
        <MarketVisitPage
          market={activeVisit.market}
          modules={activeVisit.modules}
          zeiterfassungActive={activeVisit.zeiterfassungActive}
          onClose={() => setActiveVisit(null)}
          onComplete={async (answers: Record<string, string>) => {
            console.log('Visit completed with answers:', answers);
            
            // Save zeiterfassung data if it exists
            if (answers.zeiterfassung && user?.id) {
              try {
                const zeitData = answers.zeiterfassung as any;
                await fragebogenService.zeiterfassung.submit({
                  gebietsleiter_id: user.id,
                  market_id: activeVisit.market.id,
                  fahrzeit_von: zeitData.fahrzeitVon,
                  fahrzeit_bis: zeitData.fahrzeitBis,
                  besuchszeit_von: zeitData.besuchszeitVon,
                  besuchszeit_bis: zeitData.besuchszeitBis,
                  distanz_km: zeitData.distanzKm,
                  kommentar: zeitData.kommentar,
                  food_prozent: zeitData.foodProzent
                });
                console.log('✅ Zeiterfassung saved successfully');
              } catch (error) {
                console.error('Error saving zeiterfassung:', error);
                // Don't block the flow if zeiterfassung fails
              }
            }
            
            setActiveVisit(null);
          }}
          onOpenVorbesteller={() => setIsVorbestellerOpen(true)}
          onOpenVorverkauf={() => setIsVorverkaufOpen(true)}
          onOpenProduktrechner={() => setIsCalculatorOpen(true)}
        />
        
        {/* Modals need to be rendered alongside MarketVisitPage */}
        <ProductCalculator
          isOpen={isCalculatorOpen}
          onClose={() => setIsCalculatorOpen(false)}
        />
        <VorverkaufModal
          isOpen={isVorverkaufOpen}
          onClose={() => setIsVorverkaufOpen(false)}
        />
        <VorbestellerModal
          isOpen={isVorbestellerOpen}
          onClose={() => setIsVorbestellerOpen(false)}
        />
      </>
    );
  }

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
        firstName={user?.firstName || data.user.firstName} 
        avatar={glProfileData?.profile_picture_url || data.user.avatar}
        onLogout={handleLogout}
        onProfileClick={handleProfileClick}
        onLogoClick={() => setActiveTab('dashboard')}
        onBugReport={() => setIsBugReportOpen(true)}
      />

      {/* Main Content */}
      <main className={`${styles.main} ${isMobile ? styles.withBottomNav : ''}`}>
        <div className={styles.container}>
          {activeTab === 'dashboard' && (
            <>
              {/* Bonus Hero Card */}
              <section className={styles.section}>
                <BonusHeroCard 
                  bonuses={realBonuses} 
                  isLoading={!realBonuses} 
                  onClick={handleBonusClick}
                  onMarketsClick={() => setIsMarketsVisitedOpen(true)}
                />
              </section>

              {/* Quick Actions */}
              <section className={styles.section}>
                <QuickActionsBar
                  openVisitsToday={data.quickActions.openVisitsToday}
                  pendingProdukttauschCount={pendingProdukttauschCount}
                  onStartVisit={handleStartVisit}
                  onVorverkauf={handleVorverkauf}
                  onVorbestellung={handleVorbestellung}
                  onCalculator={handleCalculator}
                  onPendingClick={() => setIsVorgemerktOpen(true)}
                  onZusatzZeiterfassung={() => setIsZusatzZeiterfassungOpen(true)}
                  onZeiterfassungVerlauf={() => setIsZeiterfassungVerlaufOpen(true)}
                />
              </section>

              {/* Market Frequency Alerts - Vorschläge für heute */}
              {(realAlerts.length > 0 || data.frequencyAlerts.length > 0) && (
                <section className={styles.section}>
                  <MarketFrequencyAlerts
                    alerts={realAlerts.length > 0 ? realAlerts : data.frequencyAlerts}
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

          {activeTab === 'profile' && (
            <ProfilePage profile={profileData} />
          )}
        </div>
      </main>

      {/* Bottom Navigation - Always mounted, never remounts */}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Preorder Notification - Only on dashboard */}
      {activeTab === 'dashboard' && (
        <PreorderNotification 
          trigger={notificationTrigger} 
          onOpenVorbesteller={() => setIsVorbestellerOpen(true)}
        />
      )}

      {/* Market Selection Modal */}
      <MarketSelectionModal
        isOpen={isMarketModalOpen}
        onClose={() => setIsMarketModalOpen(false)}
        markets={realMarkets.length > 0 ? realMarkets : mockMarkets}
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

      <ZusatzZeiterfassungModal
        isOpen={isZusatzZeiterfassungOpen}
        onClose={() => setIsZusatzZeiterfassungOpen(false)}
        onSubmit={async (entries) => {
          if (!user?.id) return;
          try {
            const response = await fetch(`${API_BASE_URL}/fragebogen/zusatz-zeiterfassung`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                gebietsleiter_id: user.id,
                entries: entries
              })
            });
            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || 'Failed to save');
            }
            console.log('✅ Zusatz Zeiterfassung entries saved');
          } catch (error) {
            console.error('Error saving zusatz zeiterfassung:', error);
            alert('Fehler beim Speichern der Zeiteinträge');
          }
          setIsZusatzZeiterfassungOpen(false);
        }}
      />

      <ZeiterfassungVerlaufModal
        isOpen={isZeiterfassungVerlaufOpen}
        onClose={() => setIsZeiterfassungVerlaufOpen(false)}
      />

      {/* Bug Report Modal */}
      <BugReportModal
        isOpen={isBugReportOpen}
        onClose={() => setIsBugReportOpen(false)}
      />

      {/* Vorgemerkte Produkttausch Modal */}
      <VorgemerktModal
        isOpen={isVorgemerktOpen}
        glId={user?.id || ''}
        onClose={() => setIsVorgemerktOpen(false)}
        onFulfill={() => {
          fetchPendingCount();
        }}
      />

      {/* Chat Bubble */}
      <ChatBubble />

      <DayTrackingButton
        isActive={dayTrackingStatus === 'active'}
        onClick={handleDayTrackingClick}
      />

      {/* Day Tracking Modal */}
      <DayTrackingModal
        isOpen={isDayTrackingModalOpen}
        onClose={() => {
          // Only allow closing if not force close mode
          if (dayTrackingModalMode !== 'force_close') {
            setIsDayTrackingModalOpen(false);
          }
        }}
        mode={dayTrackingModalMode}
        onStartDay={handleStartDay}
        onEndDay={handleEndDay}
        summary={daySummary}
      />

      {/* Admin Panel */}
      <AdminPanel
        isOpen={isAdminPanelOpen}
        onClose={() => setIsAdminPanelOpen(false)}
      />

      {/* Onboarding Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onComplete={handleOnboardingComplete}
      />

      {/* Markets Visited Modal */}
      <MarketsVisitedModal
        isOpen={isMarketsVisitedOpen}
        markets={realMarkets}
        onClose={() => setIsMarketsVisitedOpen(false)}
      />
    </div>
  );
};

