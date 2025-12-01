import React, { useState } from 'react';
import { ChatWindow } from './ChatWindow';
import styles from './ChatBubble.module.css';

export const ChatBubble: React.FC = () => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleClick = () => {
    setIsSpinning(true);
    setIsChatOpen(!isChatOpen);
    
    // Reset spinning state after animation completes
    setTimeout(() => {
      setIsSpinning(false);
    }, 600);
  };

  return (
    <>
      <button 
        className={styles.chatBubble}
        onClick={handleClick}
        aria-label="Chat öffnen"
      >
        <div className={styles.pulse}></div>
        <div className={styles.pulse} style={{ animationDelay: '1s' }}></div>
        <img 
          src="/docs/6b424554-6aa3-4c67-a7d9-5b797ef17f24-removebg-preview.png" 
          alt="Chat"
          className={`${styles.chatIcon} ${isSpinning ? styles.spinning : ''}`}
        />
      </button>

      <ChatWindow isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </>
  );
};

