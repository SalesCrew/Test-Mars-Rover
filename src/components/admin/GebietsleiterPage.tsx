import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { User, Phone, Envelope, MapPin, X, Image } from '@phosphor-icons/react';
import { GLDetailModal } from './GLDetailModal';
import { gebietsleiterService } from '../../services/gebietsleiterService';
import type { AdminMarket } from '../../types/market-types';
import styles from './GebietsleiterPage.module.css';

interface GebietsleiterPageProps {
  isCreateModalOpen: boolean;
  onCloseCreateModal: () => void;
  allMarkets?: AdminMarket[];
}

interface GL {
  id: string;
  name: string;
  address: string;
  postal_code: string;
  city: string;
  phone: string;
  email: string;
  profile_picture_url: string | null;
  created_at: string;
  updated_at: string;
}

export const GebietsleiterPage: React.FC<GebietsleiterPageProps> = ({ isCreateModalOpen, onCloseCreateModal, allMarkets = [] }) => {
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [gebietsleiterList, setGebietsleiterList] = useState<GL[]>([]);
  const [selectedGL, setSelectedGL] = useState<GL | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    postalCode: '',
    city: '',
    phone: '',
    email: '',
    profilePicture: null as File | null,
  });
  const [emailText, setEmailText] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);

  // Load gebietsleiter on mount
  useEffect(() => {
    loadGebietsleiter();
  }, []);

  const loadGebietsleiter = async () => {
    try {
      setIsLoading(true);
      const data = await gebietsleiterService.getAllGebietsleiter();
      setGebietsleiterList(data);
    } catch (error) {
      console.error('Failed to load gebietsleiter:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, profilePicture: file }));
      // Create preview URL
      const url = URL.createObjectURL(file);
      setProfilePictureUrl(url);
    }
  };

  const handleCreateSubmit = () => {
    // Generate password and prepare email
    const password = generateRandomPassword();
    setGeneratedPassword(password);
    
    const emailTemplate = `Hallo ${formData.name},

herzlich willkommen bei Mars Rover! Hier sind deine Zugangsdaten für den Mars Rover:

Email: ${formData.email}
Passwort: ${password}

Bitte ändere dein Passwort nach dem ersten Login.

Mit freundlichen Grüßen,
Das Mars Rover Team`;

    setEmailText(emailTemplate);
    onCloseCreateModal();
    setIsEmailModalOpen(true);
  };

  const handleSendEmail = async () => {
    setIsSending(true);
    
    try {
      // Create GL account in database
      await gebietsleiterService.createGebietsleiter({
      name: formData.name,
      address: formData.address,
      postalCode: formData.postalCode,
      city: formData.city,
      phone: formData.phone,
      email: formData.email,
      password: generatedPassword,
        profilePictureUrl: profilePictureUrl,
      });
      
      // TODO: Wire up Outlook API to send email
      console.log('Sending email:', emailText);
      
      // Reload list
      await loadGebietsleiter();
    
    setIsSending(false);
    setIsEmailModalOpen(false);
      
    // Reset form
    setFormData({
      name: '',
      address: '',
      postalCode: '',
      city: '',
      phone: '',
      email: '',
      profilePicture: null,
    });
    setProfilePictureUrl(null);
    } catch (error) {
      console.error('Error creating gebietsleiter:', error);
      alert('Fehler beim Erstellen des Gebietsleiters: ' + (error instanceof Error ? error.message : 'Unbekannter Fehler'));
      setIsSending(false);
    }
  };

  return (
    <div className={styles.gebietsleiterPage}>
      {isLoading ? (
        <div className={styles.contentPlaceholder}>
          <div className={styles.spinner}></div>
          <p className={styles.placeholderText}>Lade Gebietsleiter...</p>
        </div>
      ) : gebietsleiterList.length === 0 ? (
        <div className={styles.contentPlaceholder}>
          <User size={64} weight="regular" className={styles.placeholderIcon} />
          <p className={styles.placeholderText}>Gebietsleiter-Verwaltung</p>
          <p className={styles.placeholderSubtext}>Keine Gebietsleiter vorhanden</p>
        </div>
      ) : (
        <div className={styles.glGrid}>
          {gebietsleiterList.map((gl) => (
            <div 
              key={gl.id} 
              className={styles.glCard}
              onClick={() => setSelectedGL(gl)}
            >
              {/* Profile Picture */}
              <div className={styles.glAvatar}>
                {gl.profile_picture_url ? (
                  <img src={gl.profile_picture_url} alt={gl.name} className={styles.glAvatarImage} />
                ) : (
                  <div className={styles.glAvatarPlaceholder}>
                    <User size={32} weight="regular" />
                  </div>
                )}
              </div>

              {/* GL Info */}
              <div className={styles.glInfo}>
                <h3 className={styles.glName}>{gl.name}</h3>
                
                <div className={styles.glDetail}>
                  <MapPin size={14} weight="regular" className={styles.glDetailIcon} />
                  <span>{gl.address}</span>
                </div>
                
                <div className={styles.glDetail}>
                  <MapPin size={14} weight="regular" className={styles.glDetailIcon} />
                  <span>{gl.postal_code} {gl.city}</span>
                </div>
                
                <div className={styles.glDetail}>
                  <Phone size={14} weight="regular" className={styles.glDetailIcon} />
                  <span>{gl.phone}</span>
                </div>
                
                <div className={styles.glDetail}>
                  <Envelope size={14} weight="regular" className={styles.glDetailIcon} />
                  <span>{gl.email}</span>
                </div>
              </div>

              {/* Created Date */}
              <div className={styles.glFooter}>
                <span className={styles.glCreatedDate}>
                  Erstellt: {new Date(gl.created_at).toLocaleDateString('de-DE', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric' 
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* GL Detail Modal */}
      {selectedGL && (
        <GLDetailModal 
          gl={selectedGL} 
          onClose={() => setSelectedGL(null)}
          onDelete={(deletedId) => {
            setGebietsleiterList(prev => prev.filter(gl => gl.id !== deletedId));
            setSelectedGL(null);
          }}
          allMarkets={allMarkets}
        />
      )}

      {/* Create GL Modal */}
      {isCreateModalOpen && ReactDOM.createPortal(
        <div className={styles.modalOverlay} onClick={onCloseCreateModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Neuen Gebietsleiter erstellen</h3>
              <button 
                className={styles.modalClose}
                onClick={onCloseCreateModal}
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            <div className={styles.modalContent}>
              {/* Profile Picture Upload */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Profilbild (optional)</label>
                <div className={styles.imageUpload}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className={styles.imageInput}
                    id="profilePicture"
                  />
                  <label htmlFor="profilePicture" className={styles.imageLabel}>
                    {formData.profilePicture ? (
                      <span>{formData.profilePicture.name}</span>
                    ) : (
                      <>
                        <Image size={24} weight="regular" />
                        <span>Bild auswählen</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Name */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  <User size={16} weight="regular" />
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  placeholder="Max Mustermann"
                  className={styles.input}
                  required
                />
              </div>

              {/* Address */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  <MapPin size={16} weight="regular" />
                  Adresse *
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleFormChange('address', e.target.value)}
                  placeholder="Musterstraße 123"
                  className={styles.input}
                  required
                />
              </div>

              {/* Postal Code & City */}
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>PLZ *</label>
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) => handleFormChange('postalCode', e.target.value)}
                    placeholder="1010"
                    className={styles.input}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Ort *</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleFormChange('city', e.target.value)}
                    placeholder="Wien"
                    className={styles.input}
                    required
                  />
                </div>
              </div>

              {/* Phone */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  <Phone size={16} weight="regular" />
                  Telefon *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleFormChange('phone', e.target.value)}
                  placeholder="+43 123 456789"
                  className={styles.input}
                  required
                />
              </div>

              {/* Email */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  <Envelope size={16} weight="regular" />
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleFormChange('email', e.target.value)}
                  placeholder="max.mustermann@example.com"
                  className={styles.input}
                  required
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.cancelButton}
                onClick={onCloseCreateModal}
              >
                Abbrechen
              </button>
              <button
                className={styles.createButton}
                onClick={handleCreateSubmit}
                disabled={!formData.name || !formData.address || !formData.postalCode || !formData.city || !formData.phone || !formData.email}
              >
                Erstellen
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Email Modal */}
      {isEmailModalOpen && ReactDOM.createPortal(
        <div className={styles.modalOverlay} onClick={() => setIsEmailModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Zugangsdaten per Email versenden</h3>
              <button 
                className={styles.modalClose}
                onClick={() => setIsEmailModalOpen(false)}
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            <div className={styles.modalContent}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Email-Text (editierbar)</label>
                <textarea
                  value={emailText}
                  onChange={(e) => setEmailText(e.target.value)}
                  className={styles.textarea}
                  rows={12}
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.cancelButton}
                onClick={() => setIsEmailModalOpen(false)}
                disabled={isSending}
              >
                Abbrechen
              </button>
              <button
                className={styles.sendButton}
                onClick={handleSendEmail}
                disabled={isSending}
              >
                <Envelope size={18} weight="bold" />
                {isSending ? 'Sendet...' : 'Email senden'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

