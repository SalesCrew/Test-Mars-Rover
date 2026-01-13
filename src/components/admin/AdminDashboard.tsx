import React, { useState, useEffect } from 'react';
import { Package, Storefront, Sparkle, ClockCounterClockwise, X, ShoppingCart, ArrowsLeftRight, Clock } from '@phosphor-icons/react';
import { ChainAverageCard } from './ChainAverageCard';
import { WaveProgressCard } from './WaveProgressCard';
import { DashboardFilters } from './DashboardFilters';
import { WaveProgressDetailModal } from './WaveProgressDetailModal';
import { API_BASE_URL } from '../../config/database';
import styles from './AdminDashboard.module.css';

interface Activity {
  id: string;
  type: 'vorbestellung' | 'vorverkauf' | 'produkttausch_pending';
  glId: string;
  glName: string;
  marketId: string;
  marketChain: string;
  marketAddress: string;
  marketCity: string;
  action: string;
  details: any;
  createdAt: string;
  status?: 'pending' | 'completed';
}

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

  // Activity states
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [editForm, setEditForm] = useState<{
    quantity: number;
    reason: string;
    notes: string;
    isReasonDropdownOpen: boolean;
    products: Array<{ submissionId: string; productName: string; quantity: number; valuePerUnit: number }>;
  }>({
    quantity: 0,
    reason: '',
    notes: '',
    isReasonDropdownOpen: false,
    products: []
  });

  // Filter states
  const [chainDateRange, setChainDateRange] = useState({ start: '', end: '' });
  const [chainSelectedGLs, setChainSelectedGLs] = useState<string[]>([]);
  const [chainSelectedType, setChainSelectedType] = useState<'all' | 'displays' | 'kartonware'>('all');
  
  const [waveSelectedGLs, setWaveSelectedGLs] = useState<string[]>([]);
  const [waveSelectedType, setWaveSelectedType] = useState<'all' | 'displays' | 'kartonware'>('all');

  // Fetch activities
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/activities?limit=100`);
        if (!response.ok) throw new Error('Failed to fetch activities');
        const data = await response.json();
        setActivities(data);
      } catch (error) {
        console.error('Error fetching activities:', error);
      }
    };

    fetchActivities();
    // Refresh every 30 seconds
    const interval = setInterval(fetchActivities, 30000);
    return () => clearInterval(interval);
  }, []);

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'jetzt';
    if (diffMins < 60) return `${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} Std`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} Tag${diffDays > 1 ? 'e' : ''}`;
  };

  // Get chain color
  const getChainColor = (chain: string) => {
    const chainLower = chain.toLowerCase();
    if (chainLower.includes('billa') || chainLower.includes('adeg')) {
      return 'linear-gradient(135deg, #FED304, #F9C80E)';
    }
    if (chainLower.includes('spar') || chainLower.includes('interspar') || chainLower.includes('eurospar')) {
      return 'linear-gradient(135deg, #EF4444, #DC2626)';
    }
    if (chainLower.includes('hagebau')) {
      return 'linear-gradient(135deg, #06B6D4, #0891B2)';
    }
    return 'linear-gradient(135deg, #6B7280, #4B5563)';
  };

  // Handle activity edit
  const handleActivityEdit = async () => {
    if (!editingActivity) return;
    
    try {
      // Check if this is a grouped palette/schuette activity
      const isGroupedItem = (editingActivity.details?.itemType === 'palette' || editingActivity.details?.itemType === 'schuette') 
        && editForm.products.length > 0;
      
      if (isGroupedItem) {
        // Update each product individually
        for (const product of editForm.products) {
          const response = await fetch(`${API_BASE_URL}/activities/vorbestellung/product/${product.submissionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity: product.quantity })
          });
          if (!response.ok) {
            console.error('Failed to update product:', product.submissionId);
          }
        }
      } else {
        // Standard update for display/kartonware
        const url = editingActivity.type === 'vorbestellung'
          ? `${API_BASE_URL}/activities/vorbestellung/${editingActivity.id}`
          : `${API_BASE_URL}/activities/vorverkauf/${editingActivity.id}`;
        
        const body = editingActivity.type === 'vorbestellung'
          ? { current_number: editForm.quantity }
          : { reason: editForm.reason, notes: editForm.notes };
        
        const response = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        
        if (!response.ok) throw new Error('Failed to update');
      }
      
      // Refresh activities
      const refreshRes = await fetch(`${API_BASE_URL}/activities?limit=100`);
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        setActivities(data);
      }
      
      setEditingActivity(null);
      resetEditForm();
    } catch (error) {
      console.error('Error updating activity:', error);
    }
  };

  const resetEditForm = () => {
    setEditForm({ quantity: 0, reason: '', notes: '', isReasonDropdownOpen: false, products: [] });
  };

  // Update product quantity in edit form
  const updateProductQuantity = (submissionId: string, newQuantity: number) => {
    setEditForm(f => ({
      ...f,
      products: f.products.map(p => 
        p.submissionId === submissionId 
          ? { ...p, quantity: Math.max(0, newQuantity) }
          : p
      )
    }));
  };

  // Calculate total value for grouped items
  const calculateTotalValue = () => {
    return editForm.products.reduce((sum, p) => sum + (p.quantity * p.valuePerUnit), 0);
  };

  // Initialize edit form when activity is selected
  const openEditModal = (activity: Activity) => {
    setEditingActivity(activity);
    
    // Check if this is a grouped palette/schuette activity with products
    const isGroupedItem = (activity.details?.itemType === 'palette' || activity.details?.itemType === 'schuette') 
      && activity.details?.products;
    
    setEditForm({
      quantity: activity.details?.quantity || 0,
      reason: activity.details?.reason || 'OOS',
      notes: activity.details?.notes || '',
      isReasonDropdownOpen: false,
      products: isGroupedItem 
        ? activity.details.products.map((p: any) => ({
            submissionId: p.submissionId,
            productName: p.productName,
            quantity: p.quantity,
            valuePerUnit: p.valuePerUnit
          }))
        : []
    });
  };

  // Handle activity delete
  const handleActivityDelete = async (activity: Activity) => {
    if (!confirm('Aktivität wirklich löschen?')) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/activities/${activity.type}/${activity.id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete');
      
      // Refresh activities
      const refreshRes = await fetch(`${API_BASE_URL}/activities?limit=100`);
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        setActivities(data);
      }
    } catch (error) {
      console.error('Error deleting activity:', error);
    }
  };

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

  // Fetch chain averages (re-fetch when filters change)
  useEffect(() => {
    const fetchChainAverages = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Build URL with filters
        const params = new URLSearchParams();
        
        // Handle GL filter
        if (chainSelectedGLs.length > 0) {
          if (chainSelectedGLs.includes('__none__')) {
            params.set('glIds', '__none__');
          } else {
            params.set('glIds', chainSelectedGLs.join(','));
          }
        }
        
        // Date range filter
        if (chainDateRange.start) {
          params.set('startDate', chainDateRange.start);
        }
        if (chainDateRange.end) {
          params.set('endDate', chainDateRange.end);
        }
        
        // Type filter
        if (chainSelectedType !== 'all') {
          params.set('itemType', chainSelectedType);
        }
        
        const queryString = params.toString();
        const chainRes = await fetch(`${API_BASE_URL}/wellen/dashboard/chain-averages${queryString ? `?${queryString}` : ''}`);
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
  }, [chainSelectedGLs, chainDateRange, chainSelectedType]);

  // Fetch waves (re-fetch when filters change)
  useEffect(() => {
    const fetchWaves = async () => {
      try {
        // Build URL with filters
        const params = new URLSearchParams();
        
        // Handle GL filter
        if (waveSelectedGLs.length > 0) {
          if (waveSelectedGLs.includes('__none__')) {
            params.set('glIds', '__none__');
          } else {
            params.set('glIds', waveSelectedGLs.join(','));
          }
        }
        
        // Type filter
        if (waveSelectedType !== 'all') {
          params.set('itemType', waveSelectedType);
        }
        
        const queryString = params.toString();
        const wavesRes = await fetch(`${API_BASE_URL}/wellen/dashboard/waves${queryString ? `?${queryString}` : ''}`);
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
  }, [waveSelectedGLs, waveSelectedType]);

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
              // Check if specific GLs are selected (not "Alle" and not "none")
              const hasSpecificGLFilter = chainSelectedGLs.length > 0 && !chainSelectedGLs.includes('__none__');
              const totalGLs = availableGLs.length || 1;
              
              // Only adjust goal when specific GLs are selected
              const adjustedChain = hasSpecificGLFilter ? {
                ...chain,
                // Goal is proportional: (full goal / total GLs) * selected GLs
                goalPercentage: chain.goalPercentage ? (chain.goalPercentage / totalGLs) * chainSelectedGLs.length : undefined,
                goalValue: chain.goalValue ? (chain.goalValue / totalGLs) * chainSelectedGLs.length : undefined,
              } : chain; // No filter or "none" = show original backend values
              
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
              // Backend already returns proportional targets (displayTarget, kartonwareTarget, goalValue)
              // when GL filter is applied via query params. No frontend adjustment needed.
              // goalPercentage stays the same (e.g., 80% is always 80%)
              return <WaveProgressCard key={wave.id} wave={wave} onClick={() => setSelectedWave(wave)} onEdit={onEditWave} />;
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
              // Backend already returns proportional targets when GL filter is applied.
              // goalPercentage stays the same (e.g., 80% is always 80%)
              return <WaveProgressCard key={wave.id} wave={wave} isFinished onClick={() => setSelectedWave(wave)} onEdit={onEditWave} />;
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
          <div className={styles.activityHeaderActions}>
            <span className={styles.activityBadge}>{activities.length} neu</span>
            <button 
              className={styles.historyButton}
              onClick={() => setIsHistoryOpen(true)}
              title="Verlauf anzeigen"
            >
              <ClockCounterClockwise size={16} weight="bold" />
            </button>
          </div>
        </div>
        
        <div className={styles.activityList}>
          {activities.length === 0 ? (
            <div className={styles.activityEmpty}>
              <span>Keine Aktivitäten</span>
            </div>
          ) : (
            activities.slice(0, 5).map((activity) => (
              <div 
                key={activity.id} 
                className={styles.activityRow}
                onClick={() => openEditModal(activity)}
              >
                <div className={styles.activityInfo}>
                  <span className={styles.activityGL}>{activity.glName}</span>
                  <span 
                    className={styles.activityChain}
                    style={{ background: getChainColor(activity.marketChain) }}
                  >
                    {activity.marketChain}
                  </span>
                  <Storefront size={14} weight="regular" className={styles.activityMarketIcon} />
                  <span className={styles.activityMarket}>{activity.details?.marketName || activity.marketCity || activity.marketAddress}</span>
                </div>
                <div className={styles.activityAction}>
                  {activity.type === 'vorbestellung' ? (
                    <Package size={14} weight="fill" />
                  ) : activity.type === 'produkttausch_pending' ? (
                    <Clock size={14} weight="fill" />
                  ) : (
                    <ArrowsLeftRight size={14} weight="fill" />
                  )}
                  <span>{activity.action}</span>
                  {activity.type === 'produkttausch_pending' && (
                    <span className={styles.pendingBadge}>Vorgemerkt</span>
                  )}
                </div>
                <div className={styles.activityMeta}>
                  {activity.type === 'vorbestellung' ? (
                    <ShoppingCart size={16} weight="fill" className={styles.typeIconVorbestellung} />
                  ) : activity.type === 'produkttausch_pending' ? (
                    <Clock size={16} weight="fill" className={styles.typeIconPending} />
                  ) : (
                    <ArrowsLeftRight size={16} weight="fill" className={styles.typeIconVorverkauf} />
                  )}
                  <span className={styles.activityTime}>{formatTimeAgo(activity.createdAt)}</span>
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

    {/* Activity History Modal */}
    {isHistoryOpen && (
      <div className={styles.modalOverlay} onClick={() => setIsHistoryOpen(false)}>
        <div className={styles.historyModal} onClick={e => e.stopPropagation()}>
          <div className={styles.historyHeader}>
            <h3>Aktivitäten-Verlauf</h3>
            <button className={styles.closeButton} onClick={() => setIsHistoryOpen(false)}>
              <X size={20} weight="bold" />
            </button>
          </div>
          <div className={styles.historyList}>
            {activities.map((activity) => (
              <div 
                key={activity.id} 
                className={styles.historyRow}
                onClick={() => {
                  setIsHistoryOpen(false);
                  openEditModal(activity);
                }}
              >
                <div className={styles.historyRowMain}>
                  <div className={styles.historyRowInfo}>
                    <span className={styles.historyGL}>{activity.glName}</span>
                    <span 
                      className={styles.historyChain}
                      style={{ background: getChainColor(activity.marketChain) }}
                    >
                      {activity.marketChain}
                    </span>
                  </div>
                  <div className={styles.historyAction}>
                    {activity.type === 'vorbestellung' ? (
                      <Package size={14} weight="fill" />
                    ) : activity.type === 'produkttausch_pending' ? (
                      <Clock size={14} weight="fill" />
                    ) : (
                      <ArrowsLeftRight size={14} weight="fill" />
                    )}
                    <span>{activity.action}</span>
                    {activity.type === 'produkttausch_pending' && (
                      <span className={styles.pendingBadge}>Vorgemerkt</span>
                    )}
                  </div>
                </div>
                <div className={styles.historyRowMeta}>
                  <span className={styles.historyMarket}>
                    <Storefront size={12} weight="regular" />
                    {activity.details?.marketName || activity.marketCity || activity.marketAddress}
                  </span>
                  <span className={styles.historyTime}>{formatTimeAgo(activity.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}

    {/* Edit Activity Modal */}
    {editingActivity && (
      <div className={styles.modalOverlay} onClick={() => setEditingActivity(null)}>
        <div className={styles.editModal} onClick={e => e.stopPropagation()}>
          <div className={styles.editHeader}>
            <h3>Aktivität bearbeiten</h3>
            <button className={styles.closeButton} onClick={() => setEditingActivity(null)}>
              <X size={20} weight="bold" />
            </button>
          </div>
          <div className={styles.editContent}>
            {/* Info Section */}
            <div className={styles.editInfoSection}>
              <div className={styles.editInfoRow}>
                <span className={styles.editInfoLabel}>GL</span>
                <span className={styles.editInfoValue}>{editingActivity.glName}</span>
              </div>
              <div className={styles.editInfoRow}>
                <span className={styles.editInfoLabel}>Markt</span>
                <span className={styles.editInfoValue}>
                  <span className={styles.chainBadgeSmall} style={{ background: getChainColor(editingActivity.marketChain) }}>
                    {editingActivity.marketChain}
                  </span>
                  {editingActivity.details?.marketName || editingActivity.marketCity || editingActivity.marketAddress}
                </span>
              </div>
              <div className={styles.editInfoRow}>
                <span className={styles.editInfoLabel}>Typ</span>
                <span className={`${styles.typeBadge} ${editingActivity.type === 'vorbestellung' ? styles.typeBadgeBlue : editingActivity.type === 'produkttausch_pending' ? styles.typeBadgePending : styles.typeBadgeOrange}`}>
                  {editingActivity.type === 'vorbestellung' ? 'Vorbestellung' : editingActivity.type === 'produkttausch_pending' ? 'Vorgemerkt' : 'Vorverkauf'}
                </span>
              </div>
            </div>

            {/* Editable Fields */}
            <div className={styles.editFieldsSection}>
              {editingActivity.type === 'vorbestellung' ? (
                <>
                  {/* Check if this is a grouped palette/schuette with products */}
                  {editForm.products.length > 0 ? (
                    <>
                      {/* Parent Name Header */}
                      <div className={styles.editFieldGroup}>
                        <div className={styles.parentHeader}>
                          <Package size={18} weight="fill" className={styles.itemIcon} />
                          <span className={styles.parentTitle}>{editingActivity.details?.parentName || 'Palette/Schütte'}</span>
                          <span className={styles.itemTypeBadge}>
                            {editingActivity.details?.itemTypeLabel || 'Palette'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Products List */}
                      <div className={styles.editFieldGroup}>
                        <label className={styles.editFieldLabel}>Produkte</label>
                        <div className={styles.productsList}>
                          {editForm.products.map((product) => (
                            <div key={product.submissionId} className={styles.productRow}>
                              <span className={styles.productName}>{product.productName}</span>
                              <div className={styles.productControls}>
                                <div className={styles.quantityControlSmall}>
                                  <button 
                                    className={styles.quantityBtnSmall}
                                    onClick={() => updateProductQuantity(product.submissionId, product.quantity - 1)}
                                  >
                                    −
                                  </button>
                                  <input 
                                    type="number" 
                                    className={styles.quantityInputSmall}
                                    value={product.quantity}
                                    onChange={(e) => updateProductQuantity(product.submissionId, parseInt(e.target.value) || 0)}
                                    min="0"
                                  />
                                  <button 
                                    className={styles.quantityBtnSmall}
                                    onClick={() => updateProductQuantity(product.submissionId, product.quantity + 1)}
                                  >
                                    +
                                  </button>
                                </div>
                                <span className={styles.productValue}>
                                  €{(product.quantity * product.valuePerUnit).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Total Value */}
                      <div className={styles.editFieldGroup}>
                        <div className={styles.totalValueRow}>
                          <span className={styles.totalLabel}>Gesamtwert</span>
                          <span className={styles.totalValue}>€{calculateTotalValue().toFixed(2)}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Standard display for display/kartonware */}
                      <div className={styles.editFieldGroup}>
                        <label className={styles.editFieldLabel}>Artikel</label>
                        <div className={styles.itemDisplay}>
                          <Package size={16} weight="fill" className={styles.itemIcon} />
                          <span>{editingActivity.details?.itemName || 'Artikel'}</span>
                          <span className={styles.itemTypeBadge}>
                            {editingActivity.details?.itemTypeLabel || (
                              editingActivity.details?.itemType === 'display' ? 'Display' : 
                              editingActivity.details?.itemType === 'kartonware' ? 'Kartonware' : 'Artikel'
                            )}
                          </span>
                        </div>
                      </div>
                      
                      {/* Quantity */}
                      <div className={styles.editFieldGroup}>
                        <label className={styles.editFieldLabel}>Anzahl</label>
                        <div className={styles.quantityControl}>
                          <button 
                            className={styles.quantityBtn}
                            onClick={() => setEditForm(f => ({ ...f, quantity: Math.max(0, f.quantity - 1) }))}
                          >
                            −
                          </button>
                          <input 
                            type="number" 
                            className={styles.quantityInput}
                            value={editForm.quantity}
                            onChange={(e) => setEditForm(f => ({ ...f, quantity: Math.max(0, parseInt(e.target.value) || 0) }))}
                            min="0"
                          />
                          <button 
                            className={styles.quantityBtn}
                            onClick={() => setEditForm(f => ({ ...f, quantity: f.quantity + 1 }))}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Welle Info */}
                  {editingActivity.details?.welleName && (
                    <div className={styles.editFieldGroup}>
                      <label className={styles.editFieldLabel}>Welle</label>
                      <div className={styles.welleDisplay}>
                        {editingActivity.details.welleName}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Product Display for Produkttausch */}
                  {editingActivity.details?.replaceProducts && editingActivity.details?.replaceProducts.length > 0 && (
                    <>
                      <div className={styles.editFieldGroup}>
                        <label className={styles.editFieldLabel}>Ersetzt durch</label>
                        <div className={styles.productExchangeList}>
                          {editingActivity.details.replaceProducts.map((p: any) => (
                            <div key={p.id} className={styles.productExchangeItem}>
                              <span className={styles.productQuantity}>{p.quantity}×</span>
                              <span className={styles.productName}>{p.name}</span>
                              <span className={styles.productPrice}>€{(p.price * p.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        <div className={styles.exchangeTotalReplace}>
                          Gesamt: <span className={styles.totalValueGreen}>€{(editingActivity.details.replaceValue || 0).toFixed(2)}</span>
                        </div>
                      </div>

                      <div className={styles.editFieldGroup}>
                        <label className={styles.editFieldLabel}>Entnommen</label>
                        <div className={`${styles.productExchangeList} ${styles.productListDimmed}`}>
                          {editingActivity.details.takeOutProducts.map((p: any) => (
                            <div key={p.id} className={styles.productExchangeItem}>
                              <span className={styles.productQuantity}>{p.quantity}×</span>
                              <span className={styles.productName}>{p.name}</span>
                              <span className={styles.productPrice}>€{(p.price * p.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        <div className={styles.exchangeTotal}>
                          Gesamt: €{(editingActivity.details.takeOutValue || 0).toFixed(2)}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Reason Dropdown */}
                  <div className={styles.editFieldGroup}>
                    <label className={styles.editFieldLabel}>Grund</label>
                    <div className={styles.customDropdown}>
                      <button 
                        className={styles.dropdownTrigger}
                        onClick={() => setEditForm(f => ({ ...f, isReasonDropdownOpen: !f.isReasonDropdownOpen }))}
                      >
                        <span>{editForm.reason || 'Grund auswählen'}</span>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      {editForm.isReasonDropdownOpen && (
                        <div className={styles.dropdownMenu}>
                          {['OOS', 'Listungslücke', 'Platzierung'].map(reason => (
                            <button
                              key={reason}
                              className={`${styles.dropdownOption} ${editForm.reason === reason ? styles.dropdownOptionSelected : ''}`}
                              onClick={() => setEditForm(f => ({ ...f, reason, isReasonDropdownOpen: false }))}
                            >
                              {reason}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className={styles.editFieldGroup}>
                    <label className={styles.editFieldLabel}>Notizen</label>
                    <textarea 
                      className={styles.notesInput}
                      value={editForm.notes}
                      onChange={(e) => setEditForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="Optionale Notizen..."
                      rows={3}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div className={styles.editFooter}>
            <button 
              className={styles.deleteButton}
              onClick={() => {
                handleActivityDelete(editingActivity);
                setEditingActivity(null);
              }}
            >
              Löschen
            </button>
            <div className={styles.editActions}>
              <button 
                className={styles.cancelButton}
                onClick={() => setEditingActivity(null)}
              >
                Abbrechen
              </button>
              <button 
                className={styles.saveButton}
                onClick={handleActivityEdit}
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

