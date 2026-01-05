import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Package, Storefront, Sparkle } from '@phosphor-icons/react';
import { ChainAverageCard } from './ChainAverageCard';
import { WaveProgressCard } from './WaveProgressCard';
import { DashboardFilters } from './DashboardFilters';
import { WaveProgressDetailModal } from './WaveProgressDetailModal';
import { API_BASE_URL } from '../../config/database';
import styles from './AdminDashboard.module.css';

// Mock live activity data
const liveActivities = [
  { id: 1, gl: 'Max Mader', chain: 'Billa+', market: 'Schöneberg', action: '+1 Display', hasFragebogen: true, time: '2 min' },
  { id: 2, gl: 'Anna Schmidt', chain: 'Spar', market: 'Floridsdorf', action: '+2 Kartonware', hasFragebogen: true, time: '5 min' },
  { id: 3, gl: 'Thomas Weber', chain: 'Billa+', market: 'Meidling', action: '+1 Display', hasFragebogen: false, time: '8 min' },
  { id: 4, gl: 'Sarah Wagner', chain: 'Spar', market: 'Leopoldstadt', action: '+1 Kartonware', hasFragebogen: true, time: '12 min' },
  { id: 5, gl: 'Michael Müller', chain: 'Billa+', market: 'Favoriten', action: '+3 Display', hasFragebogen: true, time: '15 min' },
];

interface ChainAverage {
  chainName: string;
  chainColor: string;
  goalType: 'percentage' | 'value';
  goalPercentage?: number;
  totalMarkets: number;
  marketsWithProgress: number;
  currentPercentage?: number;
  goalValue?: number;
  currentValue?: number;
  totalValue?: number;
}

interface WaveProgress {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'finished';
  goalType: 'percentage' | 'value';
  goalPercentage?: number;
  goalValue?: number;
  currentValue?: number;
  displayCount: number;
  displayTarget: number;
  kartonwareCount: number;
  kartonwareTarget: number;
  assignedMarkets: number;
  participatingGLs: number;
}

interface AdminDashboardProps {
  onEditWave?: (waveId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onEditWave }) => {
  // Data states
  const [chainAverages, setChainAverages] = useState<ChainAverage[]>([]);
  const [activeWaves, setActiveWaves] = useState<WaveProgress[]>([]);
  const [finishedWaves, setFinishedWaves] = useState<WaveProgress[]>([]);
  const [availableGLs, setAvailableGLs] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWave, setSelectedWave] = useState<WaveProgress | null>(null);

  // Filter states
  const [_chainDateRange, setChainDateRange] = useState({ start: '', end: '' });
  const [chainSelectedGLs, setChainSelectedGLs] = useState<string[]>([]);
  const [_chainSelectedType, setChainSelectedType] = useState<'all' | 'displays' | 'kartonware'>('all');
  
  const [waveSelectedGLs, setWaveSelectedGLs] = useState<string[]>([]);
  const [_waveSelectedType, setWaveSelectedType] = useState<'all' | 'displays' | 'kartonware'>('all');
  
  // Suppress unused variable warnings (will be used when filter logic is implemented)
  void _chainDateRange;
  void _chainSelectedType;
  void _waveSelectedType;

  // Fetch GLs
  useEffect(() => {
    const fetchGLs = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/gebietsleiter`);
        if (!response.ok) {
          throw new Error('Failed to fetch GLs');
        }
        const gls = await response.json();
        const formattedGLs = gls.map((gl: any) => {
          // Abbreviate name: "Kilian Sternath" -> "Kilian S."
          const nameParts = gl.name.trim().split(' ');
          const firstName = nameParts[0] || '';
          const lastNameInitial = nameParts.length > 1 ? nameParts[nameParts.length - 1].charAt(0) + '.' : '';
          const abbreviatedName = lastNameInitial ? `${firstName} ${lastNameInitial}` : firstName;
          
          return {
            id: gl.id,
            name: abbreviatedName
          };
        });
        setAvailableGLs(formattedGLs);
      } catch (error) {
        console.error('Error fetching GLs:', error);
      }
    };

    fetchGLs();
  }, []);

  // Fetch chain averages (re-fetch when GL filter changes)
  useEffect(() => {
    const fetchChainAverages = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Build URL with GL filter if selected
        const glParam = chainSelectedGLs.length > 0 ? `?glIds=${chainSelectedGLs.join(',')}` : '';
        const chainRes = await fetch(`${API_BASE_URL}/wellen/dashboard/chain-averages${glParam}`);
        if (!chainRes.ok) {
          throw new Error('Failed to fetch chain averages');
        }
        const chainData = await chainRes.json();
        setChainAverages(chainData);
      } catch (error: any) {
        console.error('Error fetching chain averages:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChainAverages();
  }, [chainSelectedGLs]);

  // Fetch waves (re-fetch when GL filter changes)
  useEffect(() => {
    const fetchWaves = async () => {
      try {
        // Build URL with GL filter if selected
        const glParam = waveSelectedGLs.length > 0 ? `?glIds=${waveSelectedGLs.join(',')}` : '';
        const wavesRes = await fetch(`${API_BASE_URL}/wellen/dashboard/waves${glParam}`);
        if (!wavesRes.ok) {
          throw new Error('Failed to fetch waves');
        }
        const wavesData = await wavesRes.json();
        
        // Separate active and finished
        const active = wavesData.filter((w: WaveProgress) => w.status === 'active');
        const finished = wavesData.filter((w: WaveProgress) => w.status === 'finished');
        
        setActiveWaves(active);
        setFinishedWaves(finished);
      } catch (error: any) {
        console.error('Error fetching waves:', error);
        setError(error.message);
      }
    };

    fetchWaves();
  }, [waveSelectedGLs]);

  return (
    <>
    <div className={styles.dashboard}>
      {/* Chain Averages Section */}
      <div className={styles.averagesSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Ketten-Durchschnitte</h2>
          <DashboardFilters
            onDateRangeChange={(start, end) => setChainDateRange({ start, end })}
            onGLFilterChange={setChainSelectedGLs}
            onTypeFilterChange={setChainSelectedType}
            availableGLs={availableGLs}
          />
        </div>
        {isLoading ? (
          <div className={styles.averagesGrid}>
            <div className={styles.loadingCard}>Lädt...</div>
            <div className={styles.loadingCard}>Lädt...</div>
            <div className={styles.loadingCard}>Lädt...</div>
            <div className={styles.loadingCard}>Lädt...</div>
          </div>
        ) : error ? (
          <div className={styles.errorMessage}>Fehler: {error}</div>
        ) : (
          <div className={styles.averagesGrid}>
            {chainAverages.map(chain => {
              // When no GL filter is active, show the original chain data from backend
              // When filter is active, backend returns filtered data, but we adjust the goal proportionally
              const isFiltered = chainSelectedGLs.length > 0;
              const totalGLs = availableGLs.length || 1;
              
              // Only adjust goal when filtering - backend already filters the currentValue
              const adjustedChain = isFiltered ? {
                ...chain,
                // Goal is proportional: (full goal / total GLs) * selected GLs
                goalPercentage: chain.goalPercentage ? (chain.goalPercentage / totalGLs) * chainSelectedGLs.length : undefined,
                goalValue: chain.goalValue ? (chain.goalValue / totalGLs) * chainSelectedGLs.length : undefined,
              } : chain; // No filter = show original backend values
              
              return <ChainAverageCard key={chain.chainName} data={adjustedChain} />;
            })}
          </div>
        )}
      </div>

      {/* Active Waves Section */}
      <div className={styles.wavesSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Aktive Wellen</h2>
          <DashboardFilters
            onGLFilterChange={setWaveSelectedGLs}
            onTypeFilterChange={setWaveSelectedType}
            availableGLs={availableGLs}
          />
        </div>
        {isLoading ? (
          <div className={styles.wavesGrid}>
            <div className={styles.loadingCard}>Lädt...</div>
            <div className={styles.loadingCard}>Lädt...</div>
          </div>
        ) : error ? (
          <div className={styles.errorMessage}>Fehler: {error}</div>
        ) : activeWaves.length === 0 ? (
          <div className={styles.emptyState}>Keine aktiven Wellen</div>
        ) : (
          <div className={styles.wavesGrid}>
            {activeWaves.map(wave => {
              // When no GL filter is active, show original wave data from backend
              // When filter is active, backend returns filtered data, we adjust goal proportionally
              const isFiltered = waveSelectedGLs.length > 0;
              const totalGLs = availableGLs.length || 1;
              
              // Only adjust goal when filtering - backend already filters the currentValue
              const adjustedWave = isFiltered ? {
                ...wave,
                // Goal is proportional: (full goal / total GLs) * selected GLs
                goalPercentage: wave.goalPercentage ? (wave.goalPercentage / totalGLs) * waveSelectedGLs.length : undefined,
                goalValue: wave.goalValue ? (wave.goalValue / totalGLs) * waveSelectedGLs.length : undefined,
              } : wave; // No filter = show original backend values
              
              return <WaveProgressCard key={wave.id} wave={adjustedWave} onClick={() => setSelectedWave(wave)} onEdit={onEditWave} />;
            })}
          </div>
        )}
      </div>

      {/* Finished Waves Section (last 3 days) */}
      {!isLoading && !error && finishedWaves.length > 0 && (
        <div className={styles.wavesSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Abgeschlossene Wellen</h2>
          </div>
          <div className={styles.wavesGrid}>
            {finishedWaves.map(wave => {
              // Adjust goal if GL filter is active
              const glCount = waveSelectedGLs.length > 0 ? waveSelectedGLs.length : availableGLs.length || 1;
              const adjustedWave = {
                ...wave,
                goalPercentage: wave.goalPercentage ? wave.goalPercentage / glCount : undefined,
                goalValue: wave.goalValue ? wave.goalValue / glCount : undefined,
              };
              return <WaveProgressCard key={wave.id} wave={adjustedWave} isFinished onClick={() => setSelectedWave(wave)} onEdit={onEditWave} />;
            })}
          </div>
        </div>
      )}

      {/* Bottom Row: Activity Feed & AI Todos */}
      <div className={styles.bottomRow}>
        {/* Live Activity Feed */}
        <div className={styles.activityCard}>
        <div className={styles.activityHeader}>
          <div className={styles.activityTitle}>
            <div className={styles.liveIndicator}>
              <div className={styles.liveIndicatorDot} />
              <div className={styles.liveIndicatorPulse} />
            </div>
            <span>Live Aktivitäten</span>
          </div>
          <span className={styles.activityBadge}>{liveActivities.length} neu</span>
        </div>
        
        <div className={styles.activityList}>
          {liveActivities.length === 0 ? (
            <div className={styles.activityEmpty}>
              <span>Keine Aktivitäten</span>
            </div>
          ) : (
            liveActivities.map((activity) => (
              <div key={activity.id} className={styles.activityRow}>
                <div className={styles.activityInfo}>
                  <span className={styles.activityGL}>{activity.gl}</span>
                  <span 
                    className={styles.activityChain}
                    style={{ 
                      background: activity.chain === 'Billa+' 
                        ? 'linear-gradient(135deg, #FED304, #F9C80E)' 
                        : 'linear-gradient(135deg, #EF4444, #DC2626)'
                    }}
                  >
                    {activity.chain}
                  </span>
                  <Storefront size={14} weight="regular" className={styles.activityMarketIcon} />
                  <span className={styles.activityMarket}>{activity.market}</span>
                </div>
                <div className={styles.activityAction}>
                  <Package size={14} weight="fill" />
                  <span>{activity.action}</span>
                </div>
                <div className={styles.activityMeta}>
                  {activity.hasFragebogen ? (
                    <CheckCircle size={18} weight="fill" className={styles.fragebogenYes} />
                  ) : (
                    <XCircle size={18} weight="fill" className={styles.fragebogenNo} />
                  )}
                  <span className={styles.activityTime}>{activity.time}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* AI Todos Card */}
      <div className={styles.todosCard}>
        <div className={styles.todosHeader}>
          <div className={styles.todosTitleWrapper}>
            <Sparkle size={20} weight="fill" className={styles.todosIcon} />
            <span className={styles.todosTitle}>Was gibt's zu tun?</span>
          </div>
        </div>
        <div className={styles.todosList}>
          <div className={styles.todosEmpty}>
            <span>Keine Aufgaben</span>
          </div>
        </div>
      </div>
    </div>

    </div>

    {/* Wave Progress Detail Modal */}
    {selectedWave && (
      <WaveProgressDetailModal
        welle={selectedWave}
        onClose={() => setSelectedWave(null)}
      />
    )}
    </>
  );
};

