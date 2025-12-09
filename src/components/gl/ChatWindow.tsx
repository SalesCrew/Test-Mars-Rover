import React, { useState, useRef, useEffect } from 'react';
import { X, PaperPlaneRight } from '@phosphor-icons/react';
import roverIcon from '../../assets/rover-icon.png';
import styles from './ChatWindow.module.css';

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

export const ChatWindow: React.FC<ChatWindowProps> = ({ isOpen, onClose }) => {
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      // Focus input when chat opens
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
      // Add event listener with a slight delay to prevent immediate closing
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages([...messages, newMessage]);
    setInputValue('');

    // Simulate rover response
    setTimeout(() => {
      const roverResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Danke für deine Nachricht! Ich verarbeite deine Anfrage...',
        sender: 'rover',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, roverResponse]);
    }, 1000);
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
        />
        <button
          className={styles.sendButton}
          onClick={handleSend}
          disabled={!inputValue.trim()}
          aria-label="Senden"
        >
          <PaperPlaneRight size={20} weight="fill" />
        </button>
      </div>
    </div>
  );
};

