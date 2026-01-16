import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Plus, Trash, Key, CheckCircle, Copy, User, At, Calendar } from '@phosphor-icons/react';
import { authService } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';
import styles from './AdminAccountsModal.module.css';

interface AdminAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AdminAccount {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
}

// Generate secure random password
const generatePassword = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map(x => chars[x % chars.length])
    .join('');
};

export const AdminAccountsModal: React.FC<AdminAccountsModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  
  // Data states
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // View states
  const [view, setView] = useState<'list' | 'create' | 'password'>('list');
  
  // Create admin states
  const [createFirstName, setCreateFirstName] = useState('');
  const [createLastName, setCreateLastName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);
  
  // Change password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);
  
  // Delete states
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteClickCount, setDeleteClickCount] = useState<Map<string, number>>(new Map());

  // Load admins
  const loadAdmins = async () => {
    try {
      setIsLoading(true);
      const adminList = await authService.getAllAdmins();
      setAdmins(adminList);
    } catch (error) {
      console.error('Error loading admins:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAdmins();
    }
  }, [isOpen]);

  const handleCreateClick = () => {
    const password = generatePassword();
    setGeneratedPassword(password);
    setPasswordCopied(false);
    setCreateFirstName('');
    setCreateLastName('');
    setCreateEmail('');
    setCreateSuccess(false);
    setView('create');
  };

  const handleCreateSubmit = async () => {
    if (!createFirstName || !createLastName || !createEmail || !generatedPassword) return;
    
    setIsCreating(true);
    try {
      await authService.createAdmin({
        firstName: createFirstName,
        lastName: createLastName,
        email: createEmail,
        password: generatedPassword
      });
      
      // Reload list and mark as success
      await loadAdmins();
      setCreateSuccess(true);
    } catch (error) {
      console.error('Error creating admin:', error);
      alert(error instanceof Error ? error.message : 'Failed to create admin');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(generatedPassword);
    setPasswordCopied(true);
    setTimeout(() => setPasswordCopied(false), 2000);
  };

  const handlePasswordClick = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordChangeError(null);
    setView('password');
  };

  const handlePasswordSubmit = async () => {
    if (!user || !currentPassword || !newPassword || !confirmPassword) return;
    
    if (newPassword !== confirmPassword) {
      setPasswordChangeError('Neue Passwörter stimmen nicht überein');
      return;
    }
    
    if (newPassword.length < 8) {
      setPasswordChangeError('Passwort muss mindestens 8 Zeichen lang sein');
      return;
    }
    
    setIsChangingPassword(true);
    setPasswordChangeError(null);
    
    try {
      await authService.changePassword(user.id, currentPassword, newPassword);
      // Success
      setView('list');
      alert('Passwort erfolgreich geändert');
    } catch (error) {
      setPasswordChangeError(error instanceof Error ? error.message : 'Fehler beim Ändern des Passworts');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteClick = async (adminId: string) => {
    if (!user) return;
    
    const currentCount = deleteClickCount.get(adminId) || 0;
    
    if (currentCount === 0) {
      // First click
      const newMap = new Map(deleteClickCount);
      newMap.set(adminId, 1);
      setDeleteClickCount(newMap);
      
      // Reset after 2 seconds
      setTimeout(() => {
        const resetMap = new Map(deleteClickCount);
        resetMap.delete(adminId);
        setDeleteClickCount(resetMap);
      }, 2000);
    } else {
      // Second click - actually delete
      const newMap = new Map(deleteClickCount);
      newMap.delete(adminId);
      setDeleteClickCount(newMap);
      
      setDeletingId(adminId);
      try {
        await authService.deleteAdmin(adminId, user.id);
        await loadAdmins();
      } catch (error) {
        console.error('Error deleting admin:', error);
        alert(error instanceof Error ? error.message : 'Failed to delete admin');
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleBack = () => {
    setView('list');
    setCreateFirstName('');
    setCreateLastName('');
    setCreateEmail('');
    setGeneratedPassword('');
    setPasswordCopied(false);
    setCreateSuccess(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordChangeError(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>
            {view === 'create' ? 'Neuen Admin erstellen' : view === 'password' ? 'Passwort ändern' : 'Admin Accounts'}
          </h2>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {view === 'list' ? (
            <>
              {/* Admin List - scrollable */}
              {isLoading ? (
                <div className={styles.loadingState}>
                  <div className={styles.spinner} />
                  <span>Lade Accounts...</span>
                </div>
              ) : (
                <div className={styles.adminsList}>
                  {admins.map(admin => {
                    const isCurrentUser = admin.id === user?.id;
                    const isDeleting = deletingId === admin.id;
                    const isConfirming = (deleteClickCount.get(admin.id) || 0) > 0;
                    
                    return (
                      <div key={admin.id} className={`${styles.adminCard} ${isCurrentUser ? styles.currentUser : ''}`}>
                        <div className={styles.adminInfo}>
                          <div className={styles.adminIcon}>
                            <User size={24} weight="bold" />
                          </div>
                          <div className={styles.adminDetails}>
                            <div className={styles.adminName}>
                              {admin.firstName} {admin.lastName}
                              {isCurrentUser && <span className={styles.youBadge}>Du</span>}
                            </div>
                            <div className={styles.adminEmail}>
                              <At size={12} />
                              {admin.email}
                            </div>
                            <div className={styles.adminDate}>
                              <Calendar size={12} />
                              Erstellt: {formatDate(admin.createdAt)}
                            </div>
                          </div>
                        </div>
                        
                        <div className={styles.adminActions}>
                          {isCurrentUser ? (
                            <button 
                              className={styles.passwordButton}
                              onClick={handlePasswordClick}
                            >
                              <Key size={16} weight="bold" />
                              Passwort ändern
                            </button>
                          ) : (
                            <button 
                              className={`${styles.deleteButton} ${isConfirming ? styles.deleteConfirm : ''}`}
                              onClick={() => handleDeleteClick(admin.id)}
                              disabled={isDeleting}
                            >
                              <Trash size={16} weight="bold" />
                              {isDeleting ? 'Löschen...' : isConfirming ? 'Nochmal!' : 'Löschen'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : null}

          {view === 'create' && (
            <div className={styles.createForm}>
              {!isCreating && !generatedPassword && (
                <div className={styles.errorMessage} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                  <CheckCircle size={18} weight="fill" />
                  <span>Ein sicheres Passwort wurde automatisch generiert</span>
                </div>
              )}
              
              <div className={styles.formField}>
                <label className={styles.label}>Vorname</label>
                <input
                  type="text"
                  className={styles.input}
                  value={createFirstName}
                  onChange={(e) => setCreateFirstName(e.target.value)}
                  placeholder="Max"
                  disabled={isCreating}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>Nachname</label>
                <input
                  type="text"
                  className={styles.input}
                  value={createLastName}
                  onChange={(e) => setCreateLastName(e.target.value)}
                  placeholder="Mustermann"
                  disabled={isCreating}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>Email</label>
                <input
                  type="email"
                  className={styles.input}
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="max@example.com"
                  disabled={isCreating}
                />
              </div>

              {generatedPassword && !isCreating && (
                <div className={styles.passwordDisplay}>
                  <label className={styles.label}>Generiertes Passwort</label>
                  <div className={styles.passwordBox}>
                    <input
                      type="text"
                      className={styles.passwordInput}
                      value={generatedPassword}
                      readOnly
                    />
                    <button 
                      className={`${styles.copyButton} ${passwordCopied ? styles.copied : ''}`}
                      onClick={handleCopyPassword}
                    >
                      {passwordCopied ? (
                        <>
                          <CheckCircle size={16} weight="fill" />
                          Kopiert!
                        </>
                      ) : (
                        <>
                          <Copy size={16} weight="bold" />
                          Kopieren
                        </>
                      )}
                    </button>
                  </div>
                  <p className={styles.passwordHint}>
                    Kopiere dieses Passwort - es wird nur einmal angezeigt!
                  </p>
                </div>
              )}

              <div className={styles.formActions}>
                {!createSuccess ? (
                  <>
                    <button className={styles.cancelButton} onClick={handleBack} disabled={isCreating}>
                      Abbrechen
                    </button>
                    <button 
                      className={styles.submitButton}
                      onClick={handleCreateSubmit}
                      disabled={!createFirstName || !createLastName || !createEmail || isCreating}
                    >
                      {isCreating ? (
                        <>
                          <div className={styles.spinner} />
                          Erstellen...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={18} weight="bold" />
                          Admin erstellen
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <button 
                    className={styles.submitButton}
                    onClick={handleBack}
                    style={{ width: '100%' }}
                  >
                    <CheckCircle size={18} weight="bold" />
                    Zurück zur Liste
                  </button>
                )}
              </div>
            </div>
          )}

          {view === 'password' && (
            <div className={styles.passwordForm}>
              {passwordChangeError && (
                <div className={styles.errorMessage}>
                  {passwordChangeError}
                </div>
              )}

              <div className={styles.formField}>
                <label className={styles.label}>Aktuelles Passwort</label>
                <input
                  type="password"
                  className={styles.input}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isChangingPassword}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>Neues Passwort</label>
                <input
                  type="password"
                  className={styles.input}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isChangingPassword}
                />
                <p className={styles.fieldHint}>Mindestens 8 Zeichen</p>
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>Passwort bestätigen</label>
                <input
                  type="password"
                  className={styles.input}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isChangingPassword}
                />
              </div>

              <div className={styles.formActions}>
                <button className={styles.cancelButton} onClick={handleBack} disabled={isChangingPassword}>
                  Abbrechen
                </button>
                <button 
                  className={styles.submitButton}
                  onClick={handlePasswordSubmit}
                  disabled={!currentPassword || !newPassword || !confirmPassword || isChangingPassword}
                >
                  {isChangingPassword ? (
                    <>
                      <div className={styles.spinner} />
                      Ändern...
                    </>
                  ) : (
                    <>
                      <Key size={18} weight="bold" />
                      Passwort ändern
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer - only show in list view */}
        {view === 'list' && !isLoading && (
          <div className={styles.footer}>
            <button className={styles.createButton} onClick={handleCreateClick}>
              <Plus size={18} weight="bold" />
              <span>Neuen Admin erstellen</span>
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
