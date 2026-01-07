import React, { useState, useEffect } from 'react';
import { ChartLine, CalendarBlank, Spinner } from '@phosphor-icons/react';
import { GLChainCard } from './GLChainCard';
import { GLWaveCard } from './GLWaveCard';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../config/database';
import styles from './StatisticsContent.module.css';

interface ChainAverage {
  chainName: string;
  chainColor: string;
  goalType: 'percentage' | 'value';
  goalPercentage?: number;
  goalValue?: number;
  totalValue?: number;
  currentValue?: number;
  totalMarkets: number;
  marketsWithProgress: number;
  currentPercentage?: number;
}

interface WaveProgress {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'finished';
  displayCount: number;
  displayTarget: number;
  kartonwareCount: number;
  kartonwareTarget: number;
}

const TOTAL_GLS = 8; // Total number of GLs for goal division

export const StatisticsContent: React.FC = () => {
  const { user } = useAuth();
  const [chainAverages, setChainAverages] = useState<ChainAverage[]>([]);
  const [activeWaves, setActiveWaves] = useState<WaveProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch chain averages for current GL
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      try {
        setIsLoading(true);
        setError(null);

        // Fetch chain averages with GL filter
        const chainRes = await fetch(`${API_BASE_URL}/wellen/dashboard/chain-averages?glIds=${user.id}`);
        if (!chainRes.ok) throw new Error('Fehler beim Laden der Ketten-Daten');
        const chainData = await chainRes.json();
        
        // Goal percentages (80%, 60%) stay the same - only target numbers/values get divided
        // For value-based goals (Zoofachhandel, Hagebau), divide goalValue AND totalValue by 8
        const adjustedChainData = chainData.map((chain: any) => {
          const isValueBased = chain.goalType === 'value';
          return {
            ...chain,
            // goalPercentage stays the same (80% for Billa, 60% for Spar, etc.)
            // For value-based goals, divide the goalValue and totalValue by 8
            goalValue: isValueBased && chain.goalValue 
              ? Math.ceil(chain.goalValue / TOTAL_GLS) 
              : chain.goalValue,
            totalValue: isValueBased && chain.totalValue 
              ? Math.ceil(chain.totalValue / TOTAL_GLS) 
              : chain.totalValue,
            // Divide totalMarkets by 8 to show GL's share
            totalMarkets: Math.ceil((chain.totalMarkets || 0) / TOTAL_GLS),
            marketsWithProgress: chain.marketsWithProgress || 0,
          };
        });
        setChainAverages(adjustedChainData);

        // Fetch waves progress with GL filter
        const wavesRes = await fetch(`${API_BASE_URL}/wellen/dashboard/waves?glIds=${user.id}`);
        if (!wavesRes.ok) throw new Error('Fehler beim Laden der Wellen-Daten');
        const wavesData = await wavesRes.json();
        
        // Filter for active waves and adjust targets
        const active = wavesData
          .filter((w: WaveProgress) => w.status === 'active')
          .map((wave: WaveProgress) => ({
            ...wave,
            displayTarget: Math.ceil(wave.displayTarget / TOTAL_GLS),
            kartonwareTarget: Math.ceil(wave.kartonwareTarget / TOTAL_GLS),
          }));
        setActiveWaves(active);

      } catch (err: any) {
        console.error('Error fetching statistics:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  if (isLoading) {
    return (
      <div className={styles.loadingState}>
        <Spinner size={32} weight="bold" className={styles.spinner} />
        <span>Lade Statistiken...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorState}>
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className={styles.statisticsContent}>
      {/* Chain Averages Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <ChartLine size={20} weight="duotone" className={styles.sectionIcon} />
          <h2 className={styles.sectionTitle}>Meine Ketten-Ziele</h2>
        </div>
        <div className={styles.chainsGrid}>
          {chainAverages.length > 0 ? (
            chainAverages.map((chain: any) => (
              <GLChainCard
                key={chain.chainName}
                chainName={chain.chainName}
                chainColor={chain.chainColor}
                goalType={chain.goalType}
                currentPercentage={chain.currentPercentage}
                goalPercentage={chain.goalPercentage}
                currentValue={chain.currentValue}
                goalValue={chain.goalValue}
                totalValue={chain.totalValue}
                totalMarkets={chain.totalMarkets}
                marketsWithProgress={chain.marketsWithProgress}
              />
            ))
          ) : (
            <div className={styles.emptyState}>
              <span>Keine Ketten-Daten verfügbar</span>
            </div>
          )}
        </div>
      </section>

      {/* Active Waves Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <CalendarBlank size={20} weight="duotone" className={styles.sectionIcon} />
          <h2 className={styles.sectionTitle}>Aktive Wellen</h2>
        </div>
        <div className={styles.wavesGrid}>
          {activeWaves.length > 0 ? (
            activeWaves.map((wave) => (
              <GLWaveCard
                key={wave.id}
                name={wave.name}
                startDate={wave.startDate}
                endDate={wave.endDate}
                displayCount={wave.displayCount}
                displayTarget={wave.displayTarget}
                kartonwareCount={wave.kartonwareCount}
                kartonwareTarget={wave.kartonwareTarget}
              />
            ))
          ) : (
            <div className={styles.emptyState}>
              <span>Keine aktiven Wellen</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
