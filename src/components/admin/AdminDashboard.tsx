import React, { useState } from 'react';
import { TrendUp, TrendDown, CheckCircle, XCircle, Package, Storefront, Sparkle } from '@phosphor-icons/react';
import { AdminCardFilter } from './AdminCardFilter';
import { wellenData } from '../../data/statisticsData';
import CountUp from '../gl/CountUp';
import styles from './AdminDashboard.module.css';

// Mock live activity data
const liveActivities = [
  { id: 1, gl: 'Max Mader', chain: 'Billa+', market: 'Schöneberg', action: '+1 Display', hasFragebogen: true, time: '2 min' },
  { id: 2, gl: 'Anna Schmidt', chain: 'Spar', market: 'Floridsdorf', action: '+2 Kartonware', hasFragebogen: true, time: '5 min' },
  { id: 3, gl: 'Thomas Weber', chain: 'Billa+', market: 'Meidling', action: '+1 Display', hasFragebogen: false, time: '8 min' },
  { id: 4, gl: 'Sarah Wagner', chain: 'Spar', market: 'Leopoldstadt', action: '+1 Kartonware', hasFragebogen: true, time: '12 min' },
  { id: 5, gl: 'Michael Müller', chain: 'Billa+', market: 'Favoriten', action: '+3 Display', hasFragebogen: true, time: '15 min' },
];

type TimeFilter = 'welle' | 'all-time' | 'ytd' | 'mtd' | 'custom';

export const AdminDashboard: React.FC = () => {
  const [billaSearchTerm, setBillaSearchTerm] = useState('');
  const [sparSearchTerm, setSparSearchTerm] = useState('');
  const [billaTimeFilter, setBillaTimeFilter] = useState<TimeFilter>('welle');
  const [sparTimeFilter, setSparTimeFilter] = useState<TimeFilter>('welle');
  const [billaShowCalendar, setBillaShowCalendar] = useState(false);
  const [sparShowCalendar, setSparShowCalendar] = useState(false);
  const [progressAnimated, setProgressAnimated] = useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setProgressAnimated(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const currentData = wellenData[0]; // Using current wave data
  const billaData = currentData.billaPlus;
  const sparData = currentData.spar;

  const billaPercentage = Math.round((billaData.withVorbesteller / billaData.totalMarkets) * 1000) / 10;
  const sparPercentage = Math.round((sparData.withVorbesteller / sparData.totalMarkets) * 1000) / 10;

  const billaGoalMet = billaPercentage >= billaData.goalPercentage;
  const sparGoalMet = sparPercentage >= sparData.goalPercentage;

  // Calculate percentages for Displays and Kartonware separately
  const billaDisplayPercentage = Math.round((billaData.displayCount / billaData.totalMarkets) * 1000) / 10;
  const billaKartonwarePercentage = Math.round((billaData.kartonwareCount / billaData.totalMarkets) * 1000) / 10;
  const sparDisplayPercentage = Math.round((sparData.displayCount / sparData.totalMarkets) * 1000) / 10;
  const sparKartonwarePercentage = Math.round((sparData.kartonwareCount / sparData.totalMarkets) * 1000) / 10;

  const billaDisplayGoalMet = billaDisplayPercentage >= (billaData.goalPercentage * 0.5);
  const billaKartonwareGoalMet = billaKartonwarePercentage >= (billaData.goalPercentage * 0.5);
  const sparDisplayGoalMet = sparDisplayPercentage >= (sparData.goalPercentage * 0.5);
  const sparKartonwareGoalMet = sparKartonwarePercentage >= (sparData.goalPercentage * 0.5);

  return (
    <div className={styles.dashboard}>
      {/* First Row: Billa+ Displays & Kartonware */}
      <div className={styles.statsRow}>
        {/* Billa+ Displays Card */}
        <div className={styles.statCard}>
          <div className={styles.cardHeader}>
            <div className={styles.chainInfo}>
              <span className={styles.chainBadge} style={{ background: 'linear-gradient(135deg, #FED304, #F9C80E)' }}>
                Billa+
              </span>
              <span className={styles.chainLabel}>Displays</span>
            </div>
            <AdminCardFilter
              searchTerm={billaSearchTerm}
              onSearchChange={setBillaSearchTerm}
              timeFilter={billaTimeFilter}
              onTimeFilterChange={setBillaTimeFilter}
              chainName="Billa+"
              renderDropdownsOnly={true}
            />
          </div>

          <AdminCardFilter
            searchTerm={billaSearchTerm}
            onSearchChange={setBillaSearchTerm}
            timeFilter={billaTimeFilter}
            onTimeFilterChange={setBillaTimeFilter}
            chainName="Billa+"
            goalStatus={billaDisplayGoalMet ? (
              <div className={styles.trendGoalMet}>
                <TrendUp size={16} weight="bold" />
                <span>Ziel erreicht</span>
              </div>
            ) : (
              <div className={styles.trend} style={{ color: '#F59E0B' }}>
                <TrendDown size={18} weight="bold" />
                <span>{Math.round((billaData.goalPercentage * 0.5) - billaDisplayPercentage)}% bis Ziel</span>
              </div>
            )}
            renderTimeFiltersOnly={true}
          />

          <div className={styles.percentageDisplay}>
            <span className={`${styles.percentage} ${billaDisplayGoalMet ? styles.percentageSuccess : ''}`}>
              <CountUp from={0} to={billaDisplayPercentage} duration={1.5} delay={0.2} />%
            </span>
            <span className={styles.goal}>von {Math.round(billaData.goalPercentage * 0.5)}%</span>
          </div>

          <div className={styles.progressTrack}>
            <div
              className={`${styles.progressBar} ${billaDisplayGoalMet ? styles.progressSuccess : ''}`}
              style={{ width: progressAnimated ? `${Math.min(billaDisplayPercentage, 100)}%` : '0%' }}
            />
          </div>

          <div className={styles.metrics}>
            <div className={styles.metric}>
              <span className={styles.metricValue}>
                <CountUp from={0} to={billaData.totalMarkets} duration={1.2} delay={0.4} />
              </span>
              <span className={styles.metricLabel}>Gesamt Märkte</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricValue}>
                <CountUp from={0} to={billaData.displayCount} duration={1.2} delay={0.5} />
              </span>
              <span className={styles.metricLabel}>Mit Displays</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricValue}>
                <CountUp from={0} to={Math.max(0, Math.ceil(billaData.totalMarkets * billaData.goalPercentage * 0.5 / 100) - billaData.displayCount)} duration={1.2} delay={0.6} />
              </span>
              <span className={styles.metricLabel}>Fehlen noch</span>
            </div>
          </div>
        </div>

        {/* Billa+ Kartonware Card */}
        <div className={styles.statCard}>
          <div className={styles.cardHeader}>
            <div className={styles.chainInfo}>
              <span className={styles.chainBadge} style={{ background: 'linear-gradient(135deg, #FED304, #F9C80E)' }}>
                Billa+
              </span>
              <span className={styles.chainLabel}>Kartonware</span>
            </div>
            <AdminCardFilter
              searchTerm={billaSearchTerm}
              onSearchChange={setBillaSearchTerm}
              timeFilter={billaTimeFilter}
              onTimeFilterChange={setBillaTimeFilter}
              chainName="Billa+"
              renderDropdownsOnly={true}
            />
          </div>

          <AdminCardFilter
            searchTerm={billaSearchTerm}
            onSearchChange={setBillaSearchTerm}
            timeFilter={billaTimeFilter}
            onTimeFilterChange={setBillaTimeFilter}
            chainName="Billa+"
            goalStatus={billaKartonwareGoalMet ? (
              <div className={styles.trendGoalMet}>
                <TrendUp size={16} weight="bold" />
                <span>Ziel erreicht</span>
              </div>
            ) : (
              <div className={styles.trend} style={{ color: '#F59E0B' }}>
                <TrendDown size={18} weight="bold" />
                <span>{Math.round((billaData.goalPercentage * 0.5) - billaKartonwarePercentage)}% bis Ziel</span>
              </div>
            )}
            renderTimeFiltersOnly={true}
          />

          <div className={styles.percentageDisplay}>
            <span className={`${styles.percentage} ${billaKartonwareGoalMet ? styles.percentageSuccess : ''}`}>
              <CountUp from={0} to={billaKartonwarePercentage} duration={1.5} delay={0.2} />%
            </span>
            <span className={styles.goal}>von {Math.round(billaData.goalPercentage * 0.5)}%</span>
          </div>

          <div className={styles.progressSection}>
            <span className={styles.umsatzzielText}>Umsatzziel: €50.000</span>
            <div className={styles.progressTrack}>
              <div
                className={`${styles.progressBar} ${billaKartonwareGoalMet ? styles.progressSuccess : ''}`}
                style={{ width: progressAnimated ? `${Math.min(billaKartonwarePercentage, 100)}%` : '0%' }}
              />
            </div>
          </div>

          <div className={styles.metrics}>
            <div className={styles.metric}>
              <span className={styles.metricValue}>
                <CountUp from={0} to={billaData.totalMarkets} duration={1.2} delay={0.4} />
              </span>
              <span className={styles.metricLabel}>Gesamt Märkte</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricValue}>
                <CountUp from={0} to={billaData.kartonwareCount} duration={1.2} delay={0.5} />
              </span>
              <span className={styles.metricLabel}>Mit Kartonware</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricValue}>
                <CountUp from={0} to={Math.max(0, Math.ceil(billaData.totalMarkets * billaData.goalPercentage * 0.5 / 100) - billaData.kartonwareCount)} duration={1.2} delay={0.6} />
              </span>
              <span className={styles.metricLabel}>Fehlen noch</span>
            </div>
          </div>
        </div>
      </div>

      {/* Second Row: Spar Displays & Kartonware */}
      <div className={styles.statsRow}>
        {/* Spar Displays Card */}
        <div className={styles.statCard}>
          <div className={styles.cardHeader}>
            <div className={styles.chainInfo}>
              <span className={styles.chainBadge} style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}>
                Spar
              </span>
              <span className={styles.chainLabel}>Displays</span>
            </div>
            <AdminCardFilter
              searchTerm={sparSearchTerm}
              onSearchChange={setSparSearchTerm}
              timeFilter={sparTimeFilter}
              onTimeFilterChange={setSparTimeFilter}
              chainName="Spar"
              renderDropdownsOnly={true}
            />
          </div>

          <AdminCardFilter
            searchTerm={sparSearchTerm}
            onSearchChange={setSparSearchTerm}
            timeFilter={sparTimeFilter}
            onTimeFilterChange={setSparTimeFilter}
            chainName="Spar"
            goalStatus={sparDisplayGoalMet ? (
              <div className={styles.trendGoalMet}>
                <TrendUp size={16} weight="bold" />
                <span>Ziel erreicht</span>
              </div>
            ) : (
              <div className={styles.trend} style={{ color: '#F59E0B' }}>
                <TrendDown size={18} weight="bold" />
                <span>{Math.round((sparData.goalPercentage * 0.5) - sparDisplayPercentage)}% bis Ziel</span>
              </div>
            )}
            renderTimeFiltersOnly={true}
          />

          <div className={styles.percentageDisplay}>
            <span className={`${styles.percentage} ${sparDisplayGoalMet ? styles.percentageSuccess : ''}`}>
              <CountUp from={0} to={sparDisplayPercentage} duration={1.5} delay={0.2} />%
            </span>
            <span className={styles.goal}>von {Math.round(sparData.goalPercentage * 0.5)}%</span>
          </div>

          <div className={styles.progressTrack}>
            <div
              className={`${styles.progressBar} ${sparDisplayGoalMet ? styles.progressSuccess : ''}`}
              style={{ width: progressAnimated ? `${Math.min(sparDisplayPercentage, 100)}%` : '0%' }}
            />
          </div>

          <div className={styles.metrics}>
            <div className={styles.metric}>
              <span className={styles.metricValue}>
                <CountUp from={0} to={sparData.totalMarkets} duration={1.2} delay={0.4} />
              </span>
              <span className={styles.metricLabel}>Gesamt Märkte</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricValue}>
                <CountUp from={0} to={sparData.displayCount} duration={1.2} delay={0.5} />
              </span>
              <span className={styles.metricLabel}>Mit Displays</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricValue}>
                <CountUp from={0} to={Math.max(0, Math.ceil(sparData.totalMarkets * sparData.goalPercentage * 0.5 / 100) - sparData.displayCount)} duration={1.2} delay={0.6} />
              </span>
              <span className={styles.metricLabel}>Fehlen noch</span>
            </div>
          </div>
        </div>

        {/* Spar Kartonware Card */}
        <div className={styles.statCard}>
          <div className={styles.cardHeader}>
            <div className={styles.chainInfo}>
              <span className={styles.chainBadge} style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}>
                Spar
              </span>
              <span className={styles.chainLabel}>Kartonware</span>
            </div>
            <AdminCardFilter
              searchTerm={sparSearchTerm}
              onSearchChange={setSparSearchTerm}
              timeFilter={sparTimeFilter}
              onTimeFilterChange={setSparTimeFilter}
              chainName="Spar"
              renderDropdownsOnly={true}
            />
          </div>

          <AdminCardFilter
            searchTerm={sparSearchTerm}
            onSearchChange={setSparSearchTerm}
            timeFilter={sparTimeFilter}
            onTimeFilterChange={setSparTimeFilter}
            chainName="Spar"
            goalStatus={sparKartonwareGoalMet ? (
              <div className={styles.trendGoalMet}>
                <TrendUp size={16} weight="bold" />
                <span>Ziel erreicht</span>
              </div>
            ) : (
              <div className={styles.trend} style={{ color: '#F59E0B' }}>
                <TrendDown size={18} weight="bold" />
                <span>{Math.round((sparData.goalPercentage * 0.5) - sparKartonwarePercentage)}% bis Ziel</span>
              </div>
            )}
            renderTimeFiltersOnly={true}
          />

          <div className={styles.percentageDisplay}>
            <span className={`${styles.percentage} ${sparKartonwareGoalMet ? styles.percentageSuccess : ''}`}>
              <CountUp from={0} to={sparKartonwarePercentage} duration={1.5} delay={0.2} />%
            </span>
            <span className={styles.goal}>von {Math.round(sparData.goalPercentage * 0.5)}%</span>
          </div>

          <div className={styles.progressSection}>
            <span className={styles.umsatzzielText}>Umsatzziel: €50.000</span>
            <div className={styles.progressTrack}>
              <div
                className={`${styles.progressBar} ${sparKartonwareGoalMet ? styles.progressSuccess : ''}`}
                style={{ width: progressAnimated ? `${Math.min(sparKartonwarePercentage, 100)}%` : '0%' }}
              />
            </div>
          </div>

          <div className={styles.metrics}>
            <div className={styles.metric}>
              <span className={styles.metricValue}>
                <CountUp from={0} to={sparData.totalMarkets} duration={1.2} delay={0.4} />
              </span>
              <span className={styles.metricLabel}>Gesamt Märkte</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricValue}>
                <CountUp from={0} to={sparData.kartonwareCount} duration={1.2} delay={0.5} />
              </span>
              <span className={styles.metricLabel}>Mit Kartonware</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricValue}>
                <CountUp from={0} to={Math.max(0, Math.ceil(sparData.totalMarkets * sparData.goalPercentage * 0.5 / 100) - sparData.kartonwareCount)} duration={1.2} delay={0.6} />
              </span>
              <span className={styles.metricLabel}>Fehlen noch</span>
            </div>
          </div>
        </div>
      </div>

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
  );
};

