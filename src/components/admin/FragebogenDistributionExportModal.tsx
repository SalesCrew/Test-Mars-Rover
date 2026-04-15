import React, { useMemo, useState } from 'react';
import { X, CheckSquare, Square, DownloadSimple } from '@phosphor-icons/react';
import styles from './FragebogenDistributionExportModal.module.css';

export interface DistributionQuestionOption {
  id: string;
  label: string;
}

export interface DistributionFragebogenOption {
  id: string;
  name: string;
  yesnoQuestions: DistributionQuestionOption[];
  availableChains: string[];
}

interface DistributionExportSelection {
  fragebogenIds: string[];
  questionIds: string[];
  chains: string[];
}

interface FragebogenDistributionExportModalProps {
  isOpen: boolean;
  isExporting: boolean;
  fragebogenOptions: DistributionFragebogenOption[];
  onClose: () => void;
  onExport: (selection: DistributionExportSelection) => Promise<void>;
}

export const FragebogenDistributionExportModal: React.FC<FragebogenDistributionExportModalProps> = ({
  isOpen,
  isExporting,
  fragebogenOptions,
  onClose,
  onExport
}) => {
  const [selectedFragebogenIds, setSelectedFragebogenIds] = useState<string[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [selectedChains, setSelectedChains] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const selectedFragebogen = useMemo(
    () => fragebogenOptions.filter(f => selectedFragebogenIds.includes(f.id)),
    [fragebogenOptions, selectedFragebogenIds]
  );

  const availableQuestions = useMemo(() => {
    const map = new Map<string, DistributionQuestionOption>();
    selectedFragebogen.forEach(f => {
      f.yesnoQuestions.forEach(q => {
        if (!map.has(q.id)) map.set(q.id, q);
      });
    });
    return Array.from(map.values());
  }, [selectedFragebogen]);

  const availableChains = useMemo(() => {
    const set = new Set<string>();
    selectedFragebogen.forEach(f => f.availableChains.forEach(c => set.add(c)));
    return Array.from(set.values()).sort((a, b) => a.localeCompare(b, 'de'));
  }, [selectedFragebogen]);

  const allQuestionsSelected = availableQuestions.length > 0
    && availableQuestions.every(q => selectedQuestionIds.includes(q.id));
  const allChainsSelected = availableChains.length > 0
    && availableChains.every(chain => selectedChains.includes(chain));

  const toggleFragebogen = (id: string) => {
    setError(null);
    setSelectedFragebogenIds(prev => {
      const next = prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id];
      return next;
    });
  };

  const toggleQuestion = (id: string) => {
    setError(null);
    setSelectedQuestionIds(prev => (prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]));
  };

  const toggleChain = (chain: string) => {
    setError(null);
    setSelectedChains(prev => (prev.includes(chain) ? prev.filter(v => v !== chain) : [...prev, chain]));
  };

  const handleSelectAllQuestions = () => {
    setError(null);
    if (allQuestionsSelected) {
      setSelectedQuestionIds(prev => prev.filter(id => !availableQuestions.some(q => q.id === id)));
      return;
    }
    setSelectedQuestionIds(prev => {
      const merged = new Set(prev);
      availableQuestions.forEach(q => merged.add(q.id));
      return Array.from(merged.values());
    });
  };

  const handleSelectAllChains = () => {
    setError(null);
    if (allChainsSelected) {
      setSelectedChains(prev => prev.filter(c => !availableChains.includes(c)));
      return;
    }
    setSelectedChains(prev => {
      const merged = new Set(prev);
      availableChains.forEach(c => merged.add(c));
      return Array.from(merged.values());
    });
  };

  const handleExport = async () => {
    if (selectedFragebogenIds.length === 0) {
      setError('Bitte mindestens einen Fragebogen auswählen.');
      return;
    }

    const validQuestionIds = selectedQuestionIds.filter(id => availableQuestions.some(q => q.id === id));
    if (validQuestionIds.length === 0) {
      setError('Bitte mindestens ein Ja/Nein-Item auswählen.');
      return;
    }

    const validChains = selectedChains.filter(chain => availableChains.includes(chain));

    setError(null);
    await onExport({
      fragebogenIds: selectedFragebogenIds,
      questionIds: validQuestionIds,
      chains: validChains
    });
  };

  React.useEffect(() => {
    const availableQuestionSet = new Set(availableQuestions.map(q => q.id));
    setSelectedQuestionIds(prev => prev.filter(id => availableQuestionSet.has(id)));

    const availableChainSet = new Set(availableChains);
    setSelectedChains(prev => prev.filter(c => availableChainSet.has(c)));
  }, [availableQuestions, availableChains]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Fragebogen Distribution Export</h2>
          <button type="button" className={styles.closeButton} onClick={onClose} disabled={isExporting}>
            <X size={20} weight="bold" />
          </button>
        </div>

        <div className={styles.body}>
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3>Fragebögen</h3>
            </div>
            <div className={styles.checkList}>
              {fragebogenOptions.length === 0 ? (
                <div className={styles.emptyState}>Keine Fragebögen verfügbar.</div>
              ) : fragebogenOptions.map(option => (
                <label key={option.id} className={styles.checkItem}>
                  <input
                    type="checkbox"
                    checked={selectedFragebogenIds.includes(option.id)}
                    onChange={() => toggleFragebogen(option.id)}
                    disabled={isExporting}
                  />
                  <span>{option.name}</span>
                </label>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3>Ja/Nein Items</h3>
              <button
                type="button"
                className={styles.toggleAllButton}
                onClick={handleSelectAllQuestions}
                disabled={isExporting || availableQuestions.length === 0}
              >
                {allQuestionsSelected ? <CheckSquare size={16} weight="fill" /> : <Square size={16} weight="regular" />}
                {allQuestionsSelected ? 'Alle abwählen' : 'Alle auswählen'}
              </button>
            </div>
            <div className={styles.checkList}>
              {availableQuestions.length === 0 ? (
                <div className={styles.emptyState}>Bitte zuerst Fragebogen auswählen.</div>
              ) : availableQuestions.map(question => (
                <label key={question.id} className={styles.checkItem}>
                  <input
                    type="checkbox"
                    checked={selectedQuestionIds.includes(question.id)}
                    onChange={() => toggleQuestion(question.id)}
                    disabled={isExporting}
                  />
                  <span>{question.label}</span>
                </label>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3>Handelsketten (optional)</h3>
              <button
                type="button"
                className={styles.toggleAllButton}
                onClick={handleSelectAllChains}
                disabled={isExporting || availableChains.length === 0}
              >
                {allChainsSelected ? <CheckSquare size={16} weight="fill" /> : <Square size={16} weight="regular" />}
                {allChainsSelected ? 'Alle abwählen' : 'Alle auswählen'}
              </button>
            </div>
            <div className={styles.checkList}>
              {availableChains.length === 0 ? (
                <div className={styles.emptyState}>Keine Ketten für die Auswahl gefunden.</div>
              ) : availableChains.map(chain => (
                <label key={chain} className={styles.checkItem}>
                  <input
                    type="checkbox"
                    checked={selectedChains.includes(chain)}
                    onChange={() => toggleChain(chain)}
                    disabled={isExporting}
                  />
                  <span>{chain}</span>
                </label>
              ))}
            </div>
          </section>
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}

        <div className={styles.footer}>
          <button type="button" className={styles.cancelButton} onClick={onClose} disabled={isExporting}>
            Abbrechen
          </button>
          <button type="button" className={styles.exportButton} onClick={handleExport} disabled={isExporting}>
            <DownloadSimple size={16} weight="bold" />
            {isExporting ? 'Exportiere…' : 'Exportieren'}
          </button>
        </div>
      </div>
    </div>
  );
};

