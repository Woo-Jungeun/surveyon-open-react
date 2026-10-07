import React, { useState, useRef, useEffect } from 'react';

const MIN_HEIGHT = 36;
const MAX_HEIGHT = 120;

export const ChatInput = ({ onSend, isLoading }) => {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const newHeight = Math.min(el.scrollHeight, MAX_HEIGHT);
    el.style.height = `${Math.max(newHeight, MIN_HEIGHT)}px`;
  };

  useEffect(() => {
    adjustHeight();
  }, [text]);

  const handleKeyDown = (e) => {
    // 한글 등 조합 문자(IME) 입력 중 Enter 키 중복 전송 방지
    if (e.nativeEvent && e.nativeEvent.isComposing) return;

    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift+Enter는 줄바꿈 허용 (기본 동작 수행)
        return;
      }
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    // 백그라운드 캡처(true)를 기본 수행하여 전송합니다.
    onSend(trimmed, true);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = `${MIN_HEIGHT}px`;
    }
  };

  return (
    <div className="so-chat-footer">
      {/* 입력창 + 전송 버튼 */}
      <div className="so-input-row">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요. (줄바꿈: Shift+Enter)"
          disabled={isLoading}
          rows={1}
        />
        <button
          onClick={handleSubmit}
          disabled={!text.trim() || isLoading}
          title="메시지 전송"
          aria-label="전송"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="19" x2="12" y2="5"></line>
            <polyline points="5 12 12 5 19 12"></polyline>
          </svg>
        </button>
      </div>
    </div>
  );
};
