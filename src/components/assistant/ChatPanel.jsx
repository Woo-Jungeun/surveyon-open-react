import React, { useState, useRef } from 'react';
import { X, History, Plus, MessageSquare, Clock } from 'lucide-react';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';

export const ChatPanel = ({
    isOpen,
    onClose,
    messages,
    resumeSession,
    onSend,
    onSelectOption,
    onRunGuide,
    onConfirmResume,
    onDismissResume,
    onReport,
    isLoading,
    onNewChat,
    currentSessionId,
    userSessions = [],
    isLoadingSessions = false,
    isHistoryOpen = false,
    onToggleHistory,
    onSelectSession,
    isLoggedInUser = false,
}) => {
    const panelRef = useRef(null);
    const [isMoving, setIsMoving] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [customStyle, setCustomStyle] = useState(null);

    const handleHeaderMouseDown = (e) => {
        if (e.target.closest('button')) return;
        e.preventDefault();

        if (!panelRef.current) return;
        const rect = panelRef.current.getBoundingClientRect();
        const shiftX = e.clientX - rect.left;
        const shiftY = e.clientY - rect.top;

        setIsMoving(true);

        const onMouseMove = (moveEvent) => {
            const pW = rect.width;
            const pH = rect.height;
            const maxLeft = Math.max(0, window.innerWidth - pW);
            const maxTop = Math.max(0, window.innerHeight - pH);

            let newLeft = moveEvent.clientX - shiftX;
            let newTop = moveEvent.clientY - shiftY;

            newLeft = Math.max(0, Math.min(newLeft, maxLeft));
            newTop = Math.max(0, Math.min(newTop, maxTop));

            setCustomStyle((prev) => ({
                ...prev,
                left: newLeft,
                top: newTop,
                width: pW,
                height: pH,
            }));
        };

        const onMouseUp = () => {
            setIsMoving(false);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const handleResizeMouseDown = (e, direction) => {
        e.preventDefault();
        e.stopPropagation();

        if (!panelRef.current) return;
        const startRect = panelRef.current.getBoundingClientRect();
        const startX = e.clientX;
        const startY = e.clientY;

        setIsResizing(true);

        const onMouseMove = (moveEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;

            const minW = 320;
            const maxW = Math.max(900, Math.floor(window.innerWidth * 0.85));
            const minH = 350;
            const maxH = window.innerHeight - 30;

            let newW = startRect.width;
            let newH = startRect.height;
            let newLeft = startRect.left;
            let newTop = startRect.top;

            if (direction === 'left' || direction === 'corner') {
                const potentialW = startRect.width - deltaX;
                newW = Math.max(minW, Math.min(maxW, potentialW));
                newLeft = startRect.right - newW;
            }

            if (direction === 'top' || direction === 'corner') {
                const potentialH = startRect.height - deltaY;
                newH = Math.max(minH, Math.min(maxH, potentialH));
                newTop = startRect.bottom - newH;
            }

            setCustomStyle({
                left: newLeft,
                top: newTop,
                width: newW,
                height: newH,
            });
        };

        const onMouseUp = () => {
            setIsResizing(false);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const formatSessionTime = (ts) => {
        if (!ts) return '';
        const date = new Date(ts);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        if (isToday) {
            return `오늘 ${hours}:${minutes}`;
        }
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${month}월 ${day}일 ${hours}:${minutes}`;
    };

    if (!isOpen) return null;

    const inlineStyle = customStyle
        ? {
            position: 'fixed',
            left: `${customStyle.left}px`,
            top: `${customStyle.top}px`,
            width: `${customStyle.width}px`,
            height: `${customStyle.height}px`,
            maxWidth: 'none',
            right: 'auto',
            bottom: 'auto',
        }
        : {
            position: undefined,
            left: undefined,
            top: undefined,
            width: undefined,
            height: undefined,
            right: undefined,
            bottom: undefined,
        };

    return (
        <div
            ref={panelRef}
            style={inlineStyle}
            className={`so-chat-panel ${isMoving ? 'moving' : ''} ${isResizing ? 'resizing' : ''}`}
        >
            {/* ── 리사이즈 핸들 ── */}
            <div
                onMouseDown={(e) => handleResizeMouseDown(e, 'left')}
                className="so-resize-handle-left"
                title="가로 크기 조절"
            />
            <div
                onMouseDown={(e) => handleResizeMouseDown(e, 'top')}
                className="so-resize-handle-top"
                title="세로 크기 조절"
            />
            <div
                onMouseDown={(e) => handleResizeMouseDown(e, 'corner')}
                className="so-resize-handle-corner"
                title="대각선 크기 동시 조절"
            />

            {/* ── 상단 헤더 ── */}
            <div
                onMouseDown={handleHeaderMouseDown}
                className="so-chat-header"
            >
                <h3>
                    설문온 가이드 AI
                </h3>

                <div className="so-header-actions">
                    {onToggleHistory && (
                        <button
                            onClick={onToggleHistory}
                            className={`so-header-btn ${isHistoryOpen ? 'active' : ''}`}
                            title="과거 대화 내역 조회 및 이어하기"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 8px',
                                fontSize: '11px',
                                background: isHistoryOpen ? '#e0e7ff' : '#f1f5f9',
                                color: isHistoryOpen ? '#4338ca' : '#475569',
                                borderRadius: '6px',
                                border: '1px solid #e2e8f0',
                                fontWeight: 600,
                            }}
                        >
                            <History size={12} />
                            <span>대화 기록</span>
                        </button>
                    )}
                    {onNewChat && (
                        <button
                            onClick={onNewChat}
                            className="so-header-btn"
                            title="새 대화 시작 (상담 이력 분리 및 화면 초기화)"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '4px 8px',
                                fontSize: '11px',
                                background: '#f1f5f9',
                                color: '#475569',
                                borderRadius: '6px',
                                border: '1px solid #e2e8f0',
                                fontWeight: 600,
                            }}
                        >
                            <span style={{ fontSize: '12px', lineHeight: 1 }}>+</span>
                            <span>새 대화</span>
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="so-header-btn close"
                        style={{ fontSize: '16px', color: '#64748b', background: 'transparent', border: 'none', padding: '4px 6px' }}
                        title="대화창 닫기"
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* ── 과거 대화 기록 서랍 (Drawer Overlay) ── */}
            {isHistoryOpen && (
                <div className="so-history-drawer">
                    <div className="so-history-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>
                            <History size={15} style={{ color: '#4f46e5' }} />
                            <span>대화 기록 목록</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {onNewChat && (
                                <button
                                    onClick={() => {
                                        onNewChat();
                                        if (onToggleHistory) onToggleHistory();
                                    }}
                                    className="so-history-btn-new"
                                    title="새 대화 시작"
                                >
                                    <Plus size={13} />
                                    <span>새 대화</span>
                                </button>
                            )}
                            <button
                                onClick={onToggleHistory}
                                className="so-history-close"
                                title="목록 닫기"
                            >
                                <X size={15} />
                            </button>
                        </div>
                    </div>

                    <div className="so-history-list">
                        {!isLoggedInUser ? (
                            <div className="so-history-empty">
                                <div style={{ fontSize: '26px', marginBottom: '8px' }}>🔒</div>
                                <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '4px', fontSize: '13px' }}>로그인이 필요합니다</div>
                                <div style={{ fontSize: '11.5px', color: '#64748b', lineHeight: 1.5 }}>
                                    로그인하시면 과거에 나눈 대화 기록이 계정에 안전하게 보관되어 언제든 다시 이어서 대화할 수 있습니다.
                                </div>
                            </div>
                        ) : isLoadingSessions ? (
                            <div className="so-history-empty">
                                <div className="so-history-spinner" />
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '10px' }}>대화 목록을 불러오는 중...</div>
                            </div>
                        ) : userSessions.length === 0 ? (
                            <div className="so-history-empty">
                                <div style={{ fontSize: '26px', marginBottom: '8px' }}>💬</div>
                                <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '4px', fontSize: '13px' }}>저장된 과거 대화가 없습니다</div>
                                <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                                    설문온 AI에게 궁금한 점을 질문해 보세요!
                                </div>
                            </div>
                        ) : (
                            userSessions.map((sess) => {
                                const isCurrent = sess.sessionId === currentSessionId;
                                return (
                                    <div
                                        key={sess.sessionId}
                                        onClick={() => onSelectSession && onSelectSession(sess.sessionId)}
                                        className={`so-history-item ${isCurrent ? 'active' : ''}`}
                                    >
                                        <div className="so-history-item-top">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Clock size={11} />
                                                <span>{formatSessionTime(sess.lastMessageTime || sess.startTime)}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                {isCurrent && <span className="so-history-badge-active">대화 중</span>}
                                                <span className="so-history-badge-count">{sess.messageCount}개</span>
                                            </div>
                                        </div>
                                        <div className="so-history-item-title" title={sess.title}>
                                            <MessageSquare size={13} style={{ flexShrink: 0, opacity: 0.6 }} />
                                            <span>{sess.title || '대화 세션'}</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* ── 메시지 본문 영역 ── */}
            <ChatMessages
                messages={messages}
                resumeSession={resumeSession}
                onSelectOption={onSelectOption}
                onRunGuide={onRunGuide}
                onConfirmResume={onConfirmResume}
                onDismissResume={onDismissResume}
                onReport={onReport}
            />

            {/* ── 하단 입력창 ── */}
            <ChatInput onSend={onSend} isLoading={isLoading} />
        </div>
    );
};
