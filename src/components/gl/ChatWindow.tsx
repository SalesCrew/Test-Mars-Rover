import React, { useState, useRef, useEffect } from 'react';
import { X, PaperPlaneRight } from '@phosphor-icons/react';
import roverIcon from '../../assets/rover-icon.png';
import styles from './ChatWindow.module.css';
import { API_BASE_URL } from '../../config/database';
import { useAuth } from '../../contexts/AuthContext';

interface ChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'rover';
  timestamp: Date;
}

interface ApiMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hallo! Ich bin Mars Rover, dein digitaler Assistent. Wie kann ich dir heute helfen?',
      sender: 'rover',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const conversationHistory = useRef<ApiMessage[]>([]);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chatWindowRef.current && !chatWindowRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userText = inputValue.trim();

    const userMessage: Message = {
      id: Date.now().toString(),
      text: userText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    conversationHistory.current.push({ role: 'user', content: userText });

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: conversationHistory.current,
          authUserId: user?.id,
          glId: user?.gebietsleiter_id,
        }),
      });

      const data = await response.json();
      const replyText: string = response.ok
        ? (data.reply ?? 'Keine Antwort erhalten.')
        : (data.error ?? 'Ein Fehler ist aufgetreten.');

      conversationHistory.current.push({ role: 'assistant', content: replyText });

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: replyText,
          sender: 'rover',
          timestamp: new Date(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: 'Verbindungsfehler. Bitte versuche es erneut.',
          sender: 'rover',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div ref={chatWindowRef} className={`${styles.chatWindow} ${isAnimating ? styles.chatWindowAnimated : ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.avatarContainer}>
            <img 
              src={roverIcon}
              alt="Mars Rover"
              className={styles.avatar}
            />
            <div className={styles.statusDot}></div>
          </div>
          <div className={styles.headerInfo}>
            <div className={styles.headerTitle}>Frag den Rover!</div>
            <div className={styles.headerStatus}>Mars Rover • Online</div>
          </div>
        </div>
        <button className={styles.closeButton} onClick={onClose} aria-label="Schließen">
          <X size={20} weight="bold" />
        </button>
      </div>

      {/* Messages */}
      <div className={styles.messagesContainer}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`${styles.messageWrapper} ${
              message.sender === 'user' ? styles.userMessage : styles.roverMessage
            }`}
          >
            {message.sender === 'rover' && (
              <img 
                src={roverIcon}
                alt="Rover"
                className={styles.messageAvatar}
              />
            )}
            <div className={styles.messageBubble}>
              <div className={styles.messageText}>{message.text}</div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className={`${styles.messageWrapper} ${styles.roverMessage}`}>
            <img src={roverIcon} alt="Rover" className={styles.messageAvatar} />
            <div className={styles.messageBubble}>
              <div className={styles.typingDots}>
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className={styles.inputContainer}>
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          placeholder="Schreibe eine Nachricht..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
        />
        <button
          className={styles.sendButton}
          onClick={handleSend}
          disabled={!inputValue.trim() || isLoading}
          aria-label="Senden"
        >
          <PaperPlaneRight size={20} weight="fill" />
        </button>
      </div>
    </div>
  );
};

