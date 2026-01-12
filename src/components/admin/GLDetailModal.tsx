import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, User, Phone, Envelope, MapPin, TrendUp, TrendDown, Plus } from '@phosphor-icons/react';
import { MarketListItem } from './MarketListItem';
import type { AdminMarket } from '../../types/market-types';
import { actionHistoryService } from '../../services/actionHistoryService';
import styles from './GLDetailModal.module.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface KWDataPoint {
  kw: string;
  displays: number;
  kartonware: number;
}

interface ChainPerformanceData {
  kwData: KWDataPoint[];
  current: { displays: number; kartonware: number };
  goal: { displays: number; kartonware: number };
}

interface GLChainPerformance {
  billa: ChainPerformanceData;
  spar: ChainPerformanceData;
  zoofachhandel: ChainPerformanceData;
  hagebau: ChainPerformanceData;
}

interface GL {
  id: string;
  name: string;
  address: string;
  postalCode?: string;
  postal_code?: string;
  city: string;
  phone: string;
  email: string;
  profilePicture?: string | null;
  profile_picture_url?: string | null;
  password?: string;
  createdAt?: Date;
  created_at?: string;
  updated_at?: string;
}

interface GLDetailModalProps {
  gl: GL;
  onClose: () => void;
  onDelete?: (glId: string) => void;
  allMarkets?: AdminMarket[];
}

type TabType = 'details' | 'billa' | 'spar' | 'zoofachhandel' | 'hagebau' | 'markets' | 'statistics';

// Separate LineChart component to properly use hooks
interface LineChartProps {
  data: KWDataPoint[];
  type: 'displays' | 'kartonware';
}

const LineChart: React.FC<LineChartProps> = ({ data, type }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const visibleCount = 8;

  // Use native wheel event with passive: false to properly prevent default
  useEffect(() => {
    const chartElement = chartRef.current;
    if (!chartElement) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const delta = e.deltaY > 0 ? 1 : -1;
      setScrollOffset(prev => {
        const newOffset = prev + delta;
        return Math.max(0, Math.min(data.length - visibleCount, newOffset));
      });
    };

    // Add event listener with passive: false to allow preventDefault
    chartElement.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      chartElement.removeEventListener('wheel', handleWheel);
    };
  }, [data.length]);

  // Get visible data (last 8 by default, scroll to see older)
  const startIndex = Math.max(0, data.length - visibleCount - scrollOffset);
  const endIndex = data.length - scrollOffset;
  const visibleData = data.slice(startIndex, endIndex);

  // Calculate Y-axis range
  const values = visibleData.map(d => d[type]);
  
  // Different padding for displays vs kartonware (Y-axis)
  const yAxisPadding = type === 'kartonware' ? 5000 : 2;
  const maxVal = Math.max(...values) + yAxisPadding;
  const minVal = Math.max(0, Math.min(...values) - yAxisPadding);
  const range = maxVal - minVal || 1;

  // Generate Y-axis labels (4 steps for compact view)
  const yAxisSteps = 4;
  const yAxisLabels = Array.from({ length: yAxisSteps }, (_, i) => {
    const value = Math.round(minVal + (range / (yAxisSteps - 1)) * i);
    return value;
  }).reverse();
  
  // Format function for Y-axis labels
  const formatYAxisLabel = (value: number) => {
    if (type === 'kartonware') {
      // Format as currency: 45000 -> "45k €"
      if (value >= 1000) {
        return `${Math.round(value / 1000)}k €`;
      }
      return `${value} €`;
    }
    return value.toString();
  };

  // Calculate points with padding (chart edge padding)
  const chartPadding = 5; // percentage padding from edges
  const chartWidth = 100 - (chartPadding * 2);
  const points = visibleData.map((d, i) => {
    const x = chartPadding + (i / Math.max(visibleData.length - 1, 1)) * chartWidth;
    const y = 10 + ((maxVal - d[type]) / range) * 80; // 10-90 range for padding
    return { 
      x, 
      y, 
      value: d[type], 
      kw: d.kw,
      isUp: i > 0 && d[type] > visibleData[i - 1][type],
      isStagnant: i > 0 && d[type] === visibleData[i - 1][type]
    };
  });

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartWrapper}>
        {/* Y-Axis */}
        <div className={styles.yAxis}>
          {yAxisLabels.map((label, i) => (
            <span key={i} className={styles.yAxisLabel}>{formatYAxisLabel(label)}</span>
          ))}
        </div>

        {/* Chart Area */}
        <div 
          className={styles.chartArea}
          ref={chartRef}
        >
          <svg className={styles.chart} viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Subtle Grid Lines */}
            {[25, 50, 75].map(y => (
              <line
                key={y}
                x1="0"
                y1={y}
                x2="100"
                y2={y}
                stroke="#E5E7EB"
                strokeWidth="0.15"
                strokeDasharray="1,1"
              />
            ))}

            {/* Gradient Definitions */}
            <defs>
              {/* Single horizontal gradient with color stops at each point */}
              <linearGradient id={`areaGradH-${type}-${scrollOffset}`} x1="0" y1="0" x2="1" y2="0">
                {points.map((p, i) => {
                  // Determine color at this point
                  const color = (i === 0) ? "#10B981" : (p.isStagnant ? "#EF4444" : "#10B981");
                  
                  // Calculate position as percentage (0-100 mapped to 0-1)
                  const pos = p.x / 100;
                  
                  // Add two stops - one at this point with current color, 
                  // and one slightly before with the transition color for smooth blend
                  const prevPoint = points[i - 1];
                  const blendStart = i > 0 ? ((prevPoint.x + p.x) / 2) / 100 : 0;
                  
                  return (
                    <React.Fragment key={i}>
                      {i > 0 && (
                        <stop offset={`${blendStart * 100}%`} stopColor={color} stopOpacity="0.25" />
                      )}
                      <stop offset={`${pos * 100}%`} stopColor={color} stopOpacity="0.25" />
                    </React.Fragment>
                  );
                })}
              </linearGradient>
              
              {/* Vertical fade mask */}
              <linearGradient id={`fadeGrad-${type}-${scrollOffset}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="white" stopOpacity="1" />
                <stop offset="100%" stopColor="white" stopOpacity="0.1" />
              </linearGradient>
              
              <mask id={`fadeMask-${type}-${scrollOffset}`}>
                <rect x="0" y="0" width="100" height="100" fill={`url(#fadeGrad-${type}-${scrollOffset})`} />
              </mask>
            </defs>

            {/* Single unified area fill with horizontal color gradient and vertical fade */}
            {points.length >= 2 && (() => {
              // Build the full area path
              let areaPath = `M ${points[0].x},${points[0].y}`;
              
              for (let i = 0; i < points.length - 1; i++) {
                const p0 = points[Math.max(0, i - 1)];
                const p1 = points[i];
                const p2 = points[i + 1];
                const p3 = points[Math.min(points.length - 1, i + 2)];
                
                const cp1x = p1.x + (p2.x - p0.x) / 6;
                const cp1y = p1.y + (p2.y - p0.y) / 6;
                const cp2x = p2.x - (p3.x - p1.x) / 6;
                const cp2y = p2.y - (p3.y - p1.y) / 6;
                
                areaPath += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
              }
              
              areaPath += ` L ${points[points.length - 1].x},95 L ${points[0].x},95 Z`;
              
              return (
                <path
                  d={areaPath}
                  fill={`url(#areaGradH-${type}-${scrollOffset})`}
                  mask={`url(#fadeMask-${type}-${scrollOffset})`}
                />
              );
            })()}

            {/* Line Segments - colored based on whether value increases or stagnates */}
            {points.map((p, i) => {
              if (i === 0) return null;
              const prev = points[i - 1];
              
              // Create bezier curve for this segment
              const p0 = points[Math.max(0, i - 2)];
              const p1 = prev;
              const p2 = p;
              const p3 = points[Math.min(points.length - 1, i + 1)];
              
              const cp1x = p1.x + (p2.x - p0.x) / 6;
              const cp1y = p1.y + (p2.y - p0.y) / 6;
              const cp2x = p2.x - (p3.x - p1.x) / 6;
              const cp2y = p2.y - (p3.y - p1.y) / 6;
              
              const segmentPath = `M ${p1.x},${p1.y} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
              const segmentColor = p.isStagnant ? "#EF4444" : "#10B981";
              
              return (
                <path
                  key={i}
                  d={segmentPath}
                  stroke={segmentColor}
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })}
          </svg>

          {/* Data Points (rendered as absolute positioned elements for better control) */}
          <div className={styles.dataPoints}>
            {points.map((p, i) => (
              <div
                key={i}
                className={`${styles.dataPoint} ${p.isUp ? styles.dataPointUp : p.isStagnant ? styles.dataPointStagnant : i === 0 ? styles.dataPointFirst : styles.dataPointDown}`}
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
              >
                <span className={styles.dataPointValue}>{p.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* X-axis labels */}
      <div className={styles.xAxisContainer}>
        <div className={styles.xAxisSpacer} />
        <div className={styles.xAxisLabels}>
          {visibleData.map((d, i) => (
            <span key={i} className={styles.xAxisLabel}>{d.kw}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export const GLDetailModal: React.FC<GLDetailModalProps> = ({ gl, onClose, onDelete, allMarkets = [] }) => {
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [billaTimeframe, setBillaTimeframe] = useState<'current' | '3months' | 'year'>('current');
  const [sparTimeframe, setSparTimeframe] = useState<'current' | '3months' | 'year'>('current');
  const [zoofachhandelTimeframe, setZoofachhandelTimeframe] = useState<'current' | '3months' | 'year'>('current');
  const [hagebauTimeframe, setHagebauTimeframe] = useState<'current' | '3months' | 'year'>('current');
  
  // Delete confirmation state
  const [deleteClickedOnce, setDeleteClickedOnce] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [marketSearchTerm, setMarketSearchTerm] = useState('');
  const [selectedChainFilter, setSelectedChainFilter] = useState<string[]>([]);
  const [isAddMarketsModalOpen, setIsAddMarketsModalOpen] = useState(false);
  const [addMarketsSearchTerm, setAddMarketsSearchTerm] = useState('');
  const [editableData, setEditableData] = useState({
    name: gl.name,
    address: gl.address,
    postalCode: gl.postalCode,
    city: gl.city,
    phone: gl.phone,
    email: gl.email,
  });
  
  // Chain performance data from API
  const [chainPerformance, setChainPerformance] = useState<GLChainPerformance | null>(null);
  const [isLoadingPerformance, setIsLoadingPerformance] = useState(false);

  // Fetch chain performance data
  useEffect(() => {
    const fetchChainPerformance = async () => {
      setIsLoadingPerformance(true);
      try {
        const response = await fetch(`${API_BASE_URL}/wellen/gl/${gl.id}/chain-performance`);
        if (response.ok) {
          const data = await response.json();
          setChainPerformance(data);
        }
      } catch (error) {
        console.error('Error fetching chain performance:', error);
      } finally {
        setIsLoadingPerformance(false);
      }
    };

    fetchChainPerformance();
  }, [gl.id]);

  // Mock markets data for GL (will be replaced with real data)
  const mockGLMarkets: AdminMarket[] = [
    { id: '1', internalId: 'B001', chain: 'Billa+', banner: '', name: 'Hauptstraße', address: 'Hauptstraße 10', postalCode: '1010', city: 'Wien', isActive: true, branch: '', frequency: 12, currentVisits: 5, channel: '', customerType: '', phone: '', email: '', maingroup: '', subgroup: '', gebietsleiter: gl.name, lastVisitDate: '2024-11-15' },
    { id: '2', internalId: 'B002', chain: 'BILLA Plus Privat', banner: '', name: 'Mariahilfer Straße', address: 'Mariahilfer Straße 20', postalCode: '1060', city: 'Wien', isActive: true, branch: '', frequency: 12, currentVisits: 8, channel: '', customerType: '', phone: '', email: '', maingroup: '', subgroup: '', gebietsleiter: gl.name, lastVisitDate: '2024-12-01' },
    { id: '3', internalId: 'S001', chain: 'Spar', banner: '', name: 'Landstraße', address: 'Landstraße 30', postalCode: '1030', city: 'Wien', isActive: true, branch: '', frequency: 12, currentVisits: 6, channel: '', customerType: '', phone: '', email: '', maingroup: '', subgroup: '', gebietsleiter: gl.name, lastVisitDate: '2024-11-28' },
    { id: '4', internalId: 'E001', chain: 'Eurospar', banner: '', name: 'Favoriten', address: 'Favoritenstraße 40', postalCode: '1100', city: 'Wien', isActive: true, branch: '', frequency: 12, currentVisits: 4, channel: '', customerType: '', phone: '', email: '', maingroup: '', subgroup: '', gebietsleiter: gl.name, lastVisitDate: '2024-10-20' },
    { id: '5', internalId: 'H001', chain: 'Hofer', banner: '', name: 'Döbling', address: 'Döblinger Hauptstraße 50', postalCode: '1190', city: 'Wien', isActive: true, branch: '', frequency: 12, currentVisits: 7, channel: '', customerType: '', phone: '', email: '', maingroup: '', subgroup: '', gebietsleiter: gl.name, lastVisitDate: '2024-12-05' },
    { id: '6', internalId: 'M001', chain: 'Merkur', banner: '', name: 'Meidling', address: 'Meidlinger Hauptstraße 60', postalCode: '1120', city: 'Wien', isActive: true, branch: '', frequency: 12, currentVisits: 9, channel: '', customerType: '', phone: '', email: '', maingroup: '', subgroup: '', gebietsleiter: gl.name, lastVisitDate: '2024-11-10' },
    { id: '7', internalId: 'I001', chain: 'Interspar', banner: '', name: 'Hernals', address: 'Hernalser Hauptstraße 70', postalCode: '1170', city: 'Wien', isActive: true, branch: '', frequency: 12, currentVisits: 5, channel: '', customerType: '', phone: '', email: '', maingroup: '', subgroup: '', gebietsleiter: gl.name, lastVisitDate: '2024-11-22' },
    { id: '8', internalId: 'A001', chain: 'Adeg', banner: '', name: 'Ottakring', address: 'Ottakringer Straße 80', postalCode: '1160', city: 'Wien', isActive: true, branch: '', frequency: 12, currentVisits: 10, channel: '', customerType: '', phone: '', email: '', maingroup: '', subgroup: '', gebietsleiter: gl.name, lastVisitDate: '2024-12-08' },
    { id: '9', internalId: 'F001', chain: 'Futterhaus', banner: '', name: 'Leopoldstadt', address: 'Praterstraße 90', postalCode: '1020', city: 'Wien', isActive: true, branch: '', frequency: 12, currentVisits: 6, channel: '', customerType: '', phone: '', email: '', maingroup: '', subgroup: '', gebietsleiter: gl.name, lastVisitDate: '2024-11-18' },
    { id: '10', internalId: 'Z001', chain: 'Zoofachhandel', banner: '', name: 'Brigittenau', address: 'Brigittenauer Lände 100', postalCode: '1200', city: 'Wien', isActive: true, branch: '', frequency: 12, currentVisits: 3, channel: '', customerType: '', phone: '', email: '', maingroup: '', subgroup: '', gebietsleiter: gl.name, lastVisitDate: '2024-10-15' },
  ];

  // Get chain color (matching MarketListItem colors)
  const getChainColor = (chain: string): string => {
    switch (chain) {
      // BILLA Family - Yellow variants
      case 'Billa+':
      case 'BILLA+':
      case 'BILLA Plus':
        return '#FED304'; // Bright Yellow
      case 'BILLA+ Privat':
      case 'BILLA Plus Privat':
        return '#FBBF24'; // Golden Yellow
      case 'BILLA Privat':
        return '#F59E0B'; // Amber
      
      // SPAR Family - Red/Green variants
      case 'Spar':
        return '#EF4444'; // Red
      case 'Eurospar':
        return '#DC2626'; // Darker Red
      case 'Interspar':
        return '#B91C1C'; // Dark Red
      case 'Spar Gourmet':
        return '#059669'; // Emerald Green
      
      // Other Chains
      case 'Hofer':
        return '#3B82F6'; // Blue
      case 'Merkur':
        return '#10B981'; // Green
      case 'Adeg':
        return '#8B5CF6'; // Purple
      case 'Futterhaus':
        return '#F97316'; // Orange
      case 'Hagebau':
        return '#0EA5E9'; // Sky Blue
      case 'Zoofachhandel':
        return '#EC4899'; // Pink
      
      default:
        return '#6B7280'; // Gray
    }
  };

  // Get text color for chain badge (dark text for light backgrounds)
  const getChainTextColor = (chain: string): string => {
    switch (chain) {
      case 'Billa+':
      case 'BILLA+':
      case 'BILLA Plus':
      case 'BILLA+ Privat':
      case 'BILLA Plus Privat':
      case 'BILLA Privat':
        return '#854D0E'; // Dark brown for yellow backgrounds
      case 'Spar':
      case 'Eurospar':
      case 'Interspar':
        return '#FFFFFF'; // White for red backgrounds
      case 'Spar Gourmet':
      case 'Merkur':
        return '#FFFFFF'; // White for green backgrounds
      case 'Hofer':
      case 'Hagebau':
        return '#FFFFFF'; // White for blue backgrounds
      case 'Adeg':
        return '#FFFFFF'; // White for purple
      case 'Futterhaus':
        return '#FFFFFF'; // White for orange
      case 'Zoofachhandel':
        return '#FFFFFF'; // White for pink
      default:
        return '#FFFFFF';
    }
  };

  // Get unique chains from markets
  const uniqueChains = Array.from(new Set(mockGLMarkets.map(m => m.chain)));

  // Filter markets based on search and chain filter
  const filteredMarkets = mockGLMarkets.filter(market => {
    const matchesSearch = marketSearchTerm === '' || 
      market.name.toLowerCase().includes(marketSearchTerm.toLowerCase()) ||
      market.address.toLowerCase().includes(marketSearchTerm.toLowerCase()) ||
      market.city.toLowerCase().includes(marketSearchTerm.toLowerCase()) ||
      market.postalCode.includes(marketSearchTerm);
    
    const matchesChain = selectedChainFilter.length === 0 || selectedChainFilter.includes(market.chain);
    
    return matchesSearch && matchesChain;
  });

  const toggleChainFilter = (chain: string) => {
    setSelectedChainFilter(prev => 
      prev.includes(chain) ? prev.filter(c => c !== chain) : [...prev, chain]
    );
  };

  // Get available markets (markets not assigned to this GL)
  const availableMarkets = allMarkets.filter(market => 
    market.gebietsleiterName !== gl.name
  );

  // Filter available markets based on search
  const filteredAvailableMarkets = availableMarkets.filter(market => {
    if (!addMarketsSearchTerm.trim()) return true;
    
    const searchWords = addMarketsSearchTerm.toLowerCase().trim().split(/\s+/);
    const searchableText = `${market.name} ${market.address} ${market.postalCode} ${market.city} ${market.chain} ${market.internalId}`.toLowerCase();
    
    return searchWords.every(word => searchableText.includes(word));
  });

  // Handle market assignment
  const handleAssignMarket = async (market: AdminMarket) => {
    const previousGL = market.gebietsleiterName || undefined;
    const actionType = previousGL ? 'swap' : 'assign';
    
    // Create action log
    await actionHistoryService.createHistoryEntry({
      action_type: actionType,
      market_id: market.internalId,
      market_chain: market.chain,
      market_address: market.address,
      market_postal_code: market.postalCode,
      market_city: market.city,
      target_gl: gl.name,
      previous_gl: previousGL,
      performed_by: 'Admin', // TODO: Get actual user
      notes: previousGL ? `Swapped from ${previousGL} to ${gl.name}` : `Assigned to ${gl.name}`
    });

    // TODO: Update the actual market in the database/state
    // For now, just close the modal
    setIsAddMarketsModalOpen(false);
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: 'details', label: 'Details' },
    { id: 'billa', label: 'Billa' },
    { id: 'spar', label: 'Spar' },
    { id: 'zoofachhandel', label: 'Zoofachhandel' },
    { id: 'hagebau', label: 'Hagebau' },
    { id: 'markets', label: 'Märkte' },
    { id: 'statistics', label: 'Statistiken' },
  ];

  const handleInputChange = (field: string, value: string) => {
    setEditableData(prev => ({ ...prev, [field]: value }));
  };

  const renderKPICard = (title: string, currentValue: number, goalValue: number, type: 'displays' | 'kartonware') => {
    const percentage = Math.round((currentValue / goalValue) * 100);
    const isGoalMet = percentage >= 80;

    return (
      <div className={styles.kpiCard}>
        <div className={styles.kpiTop}>
          <div>
            <div className={styles.kpiTitle}>{title}</div>
            <div className={styles.kpiSubtitle}>{type === 'displays' ? 'Displays' : 'Kartonware'}</div>
          </div>
          <div className={`${styles.kpiTrend} ${isGoalMet ? styles.kpiTrendUp : styles.kpiTrendDown}`}>
            {isGoalMet ? <TrendUp size={18} weight="bold" /> : <TrendDown size={18} weight="bold" />}
          </div>
        </div>

        <div className={styles.kpiMain}>
          <div className={styles.kpiValue}>
            {currentValue}
          </div>
          <div className={styles.kpiGoal}>/ {goalValue}</div>
        </div>

        <div className={styles.kpiProgress}>
          <div 
            className={`${styles.kpiProgressBar} ${isGoalMet ? styles.kpiProgressSuccess : ''}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>

        <div className={styles.kpiFooter}>
          <span className={styles.kpiPercentage}>{percentage}%</span>
          <span className={`${styles.kpiStatus} ${isGoalMet ? styles.kpiStatusSuccess : styles.kpiStatusWarning}`}>
            {isGoalMet ? 'Ziel erreicht' : `${80 - percentage}% bis Ziel`}
          </span>
        </div>
      </div>
    );
  };

  const renderTimeframeSelector = (timeframe: 'current' | '3months' | 'year', onChange: (tf: 'current' | '3months' | 'year') => void) => {
    return (
      <div className={styles.timeframeSelector}>
        <button
          className={`${styles.timeframeOption} ${timeframe === 'current' ? styles.timeframeActive : ''}`}
          onClick={() => onChange('current')}
        >
          Aktuelle Welle
        </button>
        <button
          className={`${styles.timeframeOption} ${timeframe === '3months' ? styles.timeframeActive : ''}`}
          onClick={() => onChange('3months')}
        >
          ∅ 3 Monate
        </button>
        <button
          className={`${styles.timeframeOption} ${timeframe === 'year' ? styles.timeframeActive : ''}`}
          onClick={() => onChange('year')}
        >
          ∅ 1 Jahr
        </button>
      </div>
    );
  };

  // Handle delete with double-click confirmation
  const handleDeleteClick = async () => {
    if (deleteClickedOnce) {
      // Second click within 2 seconds - perform delete
      if (deleteTimeoutRef.current) {
        clearTimeout(deleteTimeoutRef.current);
      }
      setIsDeleting(true);
      try {
        const response = await fetch(`${API_BASE_URL}/gebietsleiter/${gl.id}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          onDelete?.(gl.id);
          onClose();
        } else {
          alert('Fehler beim Löschen des Gebietsleiters');
        }
      } catch (error) {
        console.error('Error deleting GL:', error);
        alert('Fehler beim Löschen des Gebietsleiters');
      } finally {
        setIsDeleting(false);
        setDeleteClickedOnce(false);
      }
    } else {
      // First click - start 2 second window
      setDeleteClickedOnce(true);
      deleteTimeoutRef.current = setTimeout(() => {
        setDeleteClickedOnce(false);
      }, 2000);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (deleteTimeoutRef.current) {
        clearTimeout(deleteTimeoutRef.current);
      }
    };
  }, []);

  return ReactDOM.createPortal(
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <div className={styles.headerAvatar}>
              {gl.profilePicture ? (
                <img src={gl.profilePicture} alt={gl.name} />
              ) : (
                <User size={24} weight="regular" />
              )}
            </div>
            <div>
              <h2 className={styles.modalTitle}>{gl.name}</h2>
              <span className={styles.modalSubtitle}>{gl.email}</span>
            </div>
          </div>
          <div className={styles.headerActions}>
            <button 
              className={`${styles.deleteButton} ${deleteClickedOnce ? styles.deleteConfirm : ''}`}
              onClick={handleDeleteClick}
              disabled={isDeleting}
            >
              {isDeleting ? 'Löschen...' : deleteClickedOnce ? 'Nochmal klicken!' : 'Löschen'}
            </button>
            <button className={styles.modalClose} onClick={onClose}>
              <X size={24} weight="bold" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className={styles.modalContent}>
          {activeTab === 'details' && (
            <div className={styles.detailsContent}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  <User size={16} weight="regular" />
                  Name
                </label>
                <input
                  type="text"
                  value={editableData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  <MapPin size={16} weight="regular" />
                  Adresse
                </label>
                <input
                  type="text"
                  value={editableData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>PLZ</label>
                  <input
                    type="text"
                    value={editableData.postalCode}
                    onChange={(e) => handleInputChange('postalCode', e.target.value)}
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Ort</label>
                  <input
                    type="text"
                    value={editableData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  <Phone size={16} weight="regular" />
                  Telefon
                </label>
                <input
                  type="tel"
                  value={editableData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  <Envelope size={16} weight="regular" />
                  Email
                </label>
                <input
                  type="email"
                  value={editableData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={styles.input}
                />
              </div>

              <button className={styles.saveButton}>
                Änderungen speichern
              </button>
            </div>
          )}

          {activeTab === 'billa' && (
            <div className={styles.chainContent}>
              {/* Timeframe Selector */}
              <div className={styles.chainHeader}>
                <h3 className={styles.chainTitle}>Billa Performance</h3>
                {renderTimeframeSelector(billaTimeframe, setBillaTimeframe)}
              </div>

              {isLoadingPerformance ? (
                <div className={styles.emptyState}><span>Lade Daten...</span></div>
              ) : (
                <>
                  {/* Displays: KPI left, Chart right */}
                  <div className={styles.chainSection}>
                    <div className={styles.sectionLabel}>Displays</div>
                    <div className={styles.chainRow}>
                      <div className={styles.chainKPI}>
                        {renderKPICard('Billa', chainPerformance?.billa.current.displays || 0, chainPerformance?.billa.goal.displays || 1, 'displays')}
                      </div>
                      <div className={styles.chainChart}>
                        <LineChart data={chainPerformance?.billa.kwData || []} type="displays" />
                      </div>
                    </div>
                  </div>

                  {/* Kartonware: Chart left, KPI right */}
                  <div className={styles.chainSection}>
                    <div className={styles.sectionLabel}>Kartonware</div>
                    <div className={styles.chainRow}>
                      <div className={styles.chainChart}>
                        <LineChart data={chainPerformance?.billa.kwData || []} type="kartonware" />
                      </div>
                      <div className={styles.chainKPI}>
                        {renderKPICard('Billa', chainPerformance?.billa.current.kartonware || 0, chainPerformance?.billa.goal.kartonware || 1, 'kartonware')}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'spar' && (
            <div className={styles.chainContent}>
              {/* Timeframe Selector */}
              <div className={styles.chainHeader}>
                <h3 className={styles.chainTitle}>Spar Performance</h3>
                {renderTimeframeSelector(sparTimeframe, setSparTimeframe)}
              </div>

              {isLoadingPerformance ? (
                <div className={styles.emptyState}><span>Lade Daten...</span></div>
              ) : (
                <>
                  {/* Displays: KPI left, Chart right */}
                  <div className={styles.chainSection}>
                    <div className={styles.sectionLabel}>Displays</div>
                    <div className={styles.chainRow}>
                      <div className={styles.chainKPI}>
                        {renderKPICard('Spar', chainPerformance?.spar.current.displays || 0, chainPerformance?.spar.goal.displays || 1, 'displays')}
                      </div>
                      <div className={styles.chainChart}>
                        <LineChart data={chainPerformance?.spar.kwData || []} type="displays" />
                      </div>
                    </div>
                  </div>

                  {/* Kartonware: Chart left, KPI right */}
                  <div className={styles.chainSection}>
                    <div className={styles.sectionLabel}>Kartonware</div>
                    <div className={styles.chainRow}>
                      <div className={styles.chainChart}>
                        <LineChart data={chainPerformance?.spar.kwData || []} type="kartonware" />
                      </div>
                      <div className={styles.chainKPI}>
                        {renderKPICard('Spar', chainPerformance?.spar.current.kartonware || 0, chainPerformance?.spar.goal.kartonware || 1, 'kartonware')}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'zoofachhandel' && (
            <div className={styles.chainContent}>
              {/* Timeframe Selector */}
              <div className={styles.chainHeader}>
                <h3 className={styles.chainTitle}>Zoofachhandel Performance</h3>
                {renderTimeframeSelector(zoofachhandelTimeframe, setZoofachhandelTimeframe)}
              </div>

              {isLoadingPerformance ? (
                <div className={styles.emptyState}><span>Lade Daten...</span></div>
              ) : (
                <>
                  {/* Displays: KPI left, Chart right */}
                  <div className={styles.chainSection}>
                    <div className={styles.sectionLabel}>Displays</div>
                    <div className={styles.chainRow}>
                      <div className={styles.chainKPI}>
                        {renderKPICard('Zoofachhandel', chainPerformance?.zoofachhandel.current.displays || 0, chainPerformance?.zoofachhandel.goal.displays || 1, 'displays')}
                      </div>
                      <div className={styles.chainChart}>
                        <LineChart data={chainPerformance?.zoofachhandel.kwData || []} type="displays" />
                      </div>
                    </div>
                  </div>

                  {/* Kartonware: Chart left, KPI right */}
                  <div className={styles.chainSection}>
                    <div className={styles.sectionLabel}>Kartonware</div>
                    <div className={styles.chainRow}>
                      <div className={styles.chainChart}>
                        <LineChart data={chainPerformance?.zoofachhandel.kwData || []} type="kartonware" />
                      </div>
                      <div className={styles.chainKPI}>
                        {renderKPICard('Zoofachhandel', chainPerformance?.zoofachhandel.current.kartonware || 0, chainPerformance?.zoofachhandel.goal.kartonware || 1, 'kartonware')}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'hagebau' && (
            <div className={styles.chainContent}>
              {/* Timeframe Selector */}
              <div className={styles.chainHeader}>
                <h3 className={styles.chainTitle}>Hagebau Performance</h3>
                {renderTimeframeSelector(hagebauTimeframe, setHagebauTimeframe)}
              </div>

              {isLoadingPerformance ? (
                <div className={styles.emptyState}><span>Lade Daten...</span></div>
              ) : (
                <>
                  {/* Displays: KPI left, Chart right */}
                  <div className={styles.chainSection}>
                    <div className={styles.sectionLabel}>Displays</div>
                    <div className={styles.chainRow}>
                      <div className={styles.chainKPI}>
                        {renderKPICard('Hagebau', chainPerformance?.hagebau.current.displays || 0, chainPerformance?.hagebau.goal.displays || 1, 'displays')}
                      </div>
                      <div className={styles.chainChart}>
                        <LineChart data={chainPerformance?.hagebau.kwData || []} type="displays" />
                      </div>
                    </div>
                  </div>

                  {/* Kartonware: Chart left, KPI right */}
                  <div className={styles.chainSection}>
                    <div className={styles.sectionLabel}>Kartonware</div>
                    <div className={styles.chainRow}>
                      <div className={styles.chainChart}>
                        <LineChart data={chainPerformance?.hagebau.kwData || []} type="kartonware" />
                      </div>
                      <div className={styles.chainKPI}>
                        {renderKPICard('Hagebau', chainPerformance?.hagebau.current.kartonware || 0, chainPerformance?.hagebau.goal.kartonware || 1, 'kartonware')}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'markets' && (
            <div className={styles.marketsContent}>
              {/* Filters and Add Button */}
              <div className={styles.marketsHeader}>
                <div className={styles.marketsFilters}>
                  {/* Search Input */}
                  <input
                    type="text"
                    placeholder="Suche nach Name, Adresse, PLZ..."
                    className={styles.marketsSearchInput}
                    value={marketSearchTerm}
                    onChange={(e) => setMarketSearchTerm(e.target.value)}
                  />
                  
                  {/* Chain Filter Badges */}
                  <div className={styles.marketsChainFilters}>
                    {uniqueChains.map(chain => (
                      <button
                        key={chain}
                        className={`${styles.chainFilterBadge} ${selectedChainFilter.includes(chain) ? styles.chainFilterActive : ''}`}
                        onClick={() => toggleChainFilter(chain)}
                      >
                        {chain}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Add Markets Button */}
                <button 
                  className={styles.addMarketsButton}
                  onClick={() => setIsAddMarketsModalOpen(true)}
                  title="Märkte hinzufügen"
                >
                  <Plus size={20} weight="bold" />
                </button>
              </div>

              {/* Markets List */}
              <div className={styles.glMarketsList}>
                {filteredMarkets.slice(0, 5).map((market) => (
                  <div key={market.id} className={styles.glMarketItemWrapper}>
                    <MarketListItem
                      market={market}
                      onClick={() => {}}
                    />
                  </div>
                ))}
                {filteredMarkets.length > 5 && (
                  <div className={styles.glMarketsScrollContainer}>
                    {filteredMarkets.slice(5).map((market) => (
                      <div key={market.id} className={styles.glMarketItemWrapper}>
                        <MarketListItem
                          market={market}
                          onClick={() => {}}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {filteredMarkets.length === 0 && (
                <div className={styles.glMarketsEmpty}>
                  <MapPin size={48} weight="regular" />
                  <span>Keine Märkte gefunden</span>
                </div>
              )}
            </div>
          )}

          {activeTab === 'statistics' && (
            <div className={styles.statsContent}>
              {/* Summary Cards */}
              <div className={styles.statsHeroGrid}>
                <div className={styles.statsHeroCard}>
                  <div className={styles.statsHeroIcon}>
                    <MapPin size={24} weight="duotone" />
                  </div>
                  <div className={styles.statsHeroContent}>
                    <div className={styles.statsHeroValue}>
                      142
                    </div>
                    <div className={styles.statsHeroLabel}>Besuchte Märkte</div>
                    <div className={styles.statsHeroSubtext}>in diesem Jahr</div>
                  </div>
                </div>

                <div className={styles.statsHeroCard}>
                  <div className={styles.statsHeroIcon}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M9 11H15M9 15H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L18.7071 8.70711C18.8946 8.89464 19 9.149 19 9.41421V19C19 20.1046 18.1046 21 17 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className={styles.statsHeroContent}>
                    <div className={styles.statsHeroValue}>
                      87
                    </div>
                    <div className={styles.statsHeroLabel}>Fragebögen</div>
                    <div className={styles.statsHeroSubtext}>ausgefüllt</div>
                  </div>
                </div>

                <div className={styles.statsHeroCard}>
                  <div className={styles.statsHeroIcon}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
                      <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div className={styles.statsHeroContent}>
                    <div className={styles.statsHeroValue}>3</div>
                    <div className={styles.statsHeroLabel}>Tage</div>
                    <div className={styles.statsHeroSubtext}>seit letztem Besuch</div>
                  </div>
                </div>
              </div>

              {/* Last Visit Card */}
              <div className={styles.statsLastVisit}>
                <div className={styles.statsLastVisitHeader}>
                  <MapPin size={20} weight="duotone" />
                  <span>Letzter Besuch</span>
                </div>
                <div className={styles.statsLastVisitContent}>
                  <div 
                    className={styles.statsLastVisitChain}
                    style={{
                      backgroundColor: getChainColor('Billa+'),
                      color: getChainTextColor('Billa+')
                    }}
                  >
                    Billa+
                  </div>
                  <div className={styles.statsLastVisitName}>Mariahilf</div>
                  <div className={styles.statsLastVisitAddress}>
                    <MapPin size={14} weight="fill" />
                    Mariahilfer Str. 120, 1070 Wien
                  </div>
                  <div className={styles.statsLastVisitDate}>08.12.2024 · 14:30 Uhr</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Add Markets Modal */}
      {isAddMarketsModalOpen && ReactDOM.createPortal(
        <div className={styles.addMarketsModalOverlay} onClick={() => setIsAddMarketsModalOpen(false)}>
          <div className={styles.addMarketsModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.addMarketsModalHeader}>
              <h3>Märkte hinzufügen</h3>
              <button onClick={() => setIsAddMarketsModalOpen(false)} className={styles.modalClose}>
                <X size={24} />
              </button>
            </div>
            
            <div className={styles.addMarketsModalContent}>
              {/* Search */}
              <input
                type="text"
                placeholder="Suche nach Name, Adresse, PLZ, Kette..."
                className={styles.addMarketsSearchInput}
                value={addMarketsSearchTerm}
                onChange={(e) => setAddMarketsSearchTerm(e.target.value)}
                autoFocus
              />
              
              {/* Markets List */}
              <div className={styles.addMarketsListContainer}>
                {filteredAvailableMarkets.length === 0 ? (
                  <div className={styles.emptyState}>
                    <span>Keine verfügbaren Märkte gefunden</span>
                  </div>
                ) : (
                  <div className={styles.addMarketsList}>
                    {filteredAvailableMarkets.map((market) => (
                      <div 
                        key={market.id} 
                        className={styles.addMarketItem}
                        onClick={() => handleAssignMarket(market)}
                      >
                        <div className={styles.addMarketItemContent}>
                          <div className={styles.addMarketChain}
                            style={{
                              backgroundColor: getChainColor(market.chain),
                              color: getChainTextColor(market.chain)
                            }}
                          >
                            {market.chain}
                          </div>
                          <div className={styles.addMarketInfo}>
                            <div className={styles.addMarketName}>{market.name || market.address}</div>
                            <div className={styles.addMarketAddress}>{market.postalCode} {market.city}</div>
                          </div>
                          {market.gebietsleiterName && (
                            <div className={styles.addMarketCurrentGL}>
                              Aktuell: {market.gebietsleiterName}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>,
    document.body
  );
};

