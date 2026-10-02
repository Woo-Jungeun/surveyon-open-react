import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, History, Plus, MessageSquare, Clock, ArrowLeft, Lock } from 'lucide-react';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';

/**
 * 뷰포트 우측 기준 자동 보정 헬퍼 (Right-Anchored Auto-Clamping Engine)
 * - 챗봇 패널이 기본적으로 우측 정렬(Right-docked) 패널이므로,
 *   화면 오른쪽(Right)과 위쪽(Top)을 기준으로 좌표를 관리하여
 *   창을 줄였다가 전체화면으로 최대화해도 항상 우측 자리를 자연스럽게 따라가도록 보장합니다.
 */
const clampPanelRightBounds = (right, top, width, height) => {
    const pad = 12; // 뷰포트 최소 안전 여백 (12px)
    const winW = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const winH = typeof window !== 'undefined' ? window.innerHeight : 1080;

    const clampedW = Math.max(320, Math.min(width, Math.max(320, winW - pad * 2)));
    const clampedH = Math.max(350, Math.min(height, Math.max(350, winH - pad * 2)));

    const maxRight = Math.max(pad, winW - clampedW - pad);
    const maxTop = Math.max(pad, winH - clampedH - pad);
    const clampedRight = Math.max(pad, Math.min(right, maxRight));
    const clampedTop = Math.max(pad, Math.min(top, maxTop));

    return {
        right: clampedRight,
        top: clampedTop,
        width: clampedW,
        height: clampedH,
    };
};

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
    const [, setResizeTick] = useState(0);

    // ── 창 크기 변경 감지: 브라우저 창을 최대화/축소할 때 비례 갱신 트리거 ──
    useEffect(() => {
        const handleWindowResize = () => {
            setResizeTick((t) => t + 1);
        };

        window.addEventListener('resize', handleWindowResize);
        return () => window.removeEventListener('resize', handleWindowResize);
    }, []);

    // ── 헤더 더블클릭 시 기본 위치 및 기본 전체 높이 복귀 ──
    const handleHeaderDoubleClick = (e) => {
        if (e.target.closest('button')) return;
        setCustomStyle(null);
    };

    // ── 헤더 드래그 이동 (창 크기 비례 비율 저장 + 우측 벽 자석 스냅) ──
    const handleHeaderMouseDown = (e) => {
        if (e.target.closest('button')) return;
        e.preventDefault();

        if (!panelRef.current) return;
        const rect = panelRef.current.getBoundingClientRect();
        const shiftX = e.clientX - rect.left;
        const shiftY = e.clientY - rect.top;

        setIsMoving(true);

        const onMouseMove = (moveEvent) => {
            const winW = window.innerWidth;
            const winH = window.innerHeight;
            const pad = 12;
            const pW = rect.width;
            const pH = rect.height;

            const rawLeft = moveEvent.clientX - shiftX;
            const rawTop = moveEvent.clientY - shiftY;

            const maxLeft = Math.max(pad, winW - pW - pad);
            const maxTop = Math.max(pad, winH - pH - pad);
            const clampedLeft = Math.max(pad, Math.min(rawLeft, maxLeft));
            const clampedTop = Math.max(pad, Math.min(rawTop, maxTop));

            const rightOffset = Math.max(pad, winW - (clampedLeft + pW));

            // 우측 벽 자석 스냅: 우측 끝 48px 이내 & 상단 36px 이내로 끌어오면 기본 독(Dock) 위치로 찰칵 복귀
            if (rightOffset <= 48 && clampedTop <= 36) {
                setCustomStyle(null);
                return;
            }

            // 창 크기 대비 비율(Ratio)로 보관하여 창 최대화 시에도 완벽 비례 유지
            setCustomStyle((prev) => ({
                rightRatio: rightOffset / winW,
                topRatio: clampedTop / winH,
                widthRatio: prev?.hasCustomSize ? prev.widthRatio : (pW / winW),
                heightRatio: prev?.hasCustomSize ? prev.heightRatio : (pH / winH),
                hasCustomSize: Boolean(prev?.hasCustomSize),
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

    // ── 패널 리사이즈 (창 크기 비례 비율 저장 + 상/하/좌/대각선 전방향 지원) ──
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

            const winW = window.innerWidth;
            const winH = window.innerHeight;
            const pad = 12;

            const minW = 320;
            const maxW = Math.max(minW, winW - pad * 2);
            const minH = 350;
            const maxH = Math.max(minH, winH - pad * 2);

            let newW = startRect.width;
            let newH = startRect.height;
            let newTop = startRect.top;

            // 좌측 너비 조절
            if (direction === 'left' || direction === 'corner' || direction === 'corner-bottom') {
                const potentialW = startRect.width - deltaX;
                newW = Math.max(minW, Math.min(maxW, potentialW));
            }

            // 상단 높이 조절 (위로 늘리기 / 아래로 줄이기)
            if (direction === 'top' || direction === 'corner') {
                const potentialH = startRect.height - deltaY;
                newH = Math.max(minH, Math.min(maxH, potentialH));
                newTop = Math.max(pad, startRect.bottom - newH);
            }

            // 하단 높이 조절 (아래로 늘리기 / 위로 줄이기)
            if (direction === 'bottom' || direction === 'corner-bottom') {
                const potentialH = startRect.height + deltaY;
                newH = Math.max(minH, Math.min(maxH, potentialH));
            }

            const rightOffset = Math.max(pad, winW - startRect.right);

            // 픽셀(px)이 아니라 창 크기 대비 비율(Ratio)로 저장!
            // 이렇게 해야 창을 최대화했을 때 높이와 너비가 창 크기에 비례하여 자동으로 함께 커집니다.
            setCustomStyle({
                rightRatio: rightOffset / winW,
                topRatio: Math.max(pad, newTop) / winH,
                widthRatio: newW / winW,
                heightRatio: newH / winH,
                hasCustomSize: true, // 사용자가 직접 크기를 조절함
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

    // 창 크기 대비 비율(vh / vw)로 인라인 스타일 적용!
    // 창을 작게 줄였다가 최대화하면, 창의 비율(vh/vw)에 따라 높이와 너비가 100% 정비례하여 자동으로 늘어나고 줄어듭니다!
    const inlineStyle = customStyle
        ? {
            position: 'fixed',
            right: `${(customStyle.rightRatio * 100).toFixed(3)}vw`,
            left: 'auto',
            top: `${(customStyle.topRatio * 100).toFixed(3)}vh`,
            width: customStyle.hasCustomSize ? `${(customStyle.widthRatio * 100).toFixed(3)}vw` : undefined,
            height: customStyle.hasCustomSize ? `${(customStyle.heightRatio * 100).toFixed(3)}vh` : undefined,
            maxWidth: customStyle.hasCustomSize ? 'calc(100vw - 24px)' : undefined,
            maxHeight: customStyle.hasCustomSize ? 'calc(100vh - 24px)' : undefined,
            minWidth: '320px',
            minHeight: '350px',
            bottom: customStyle.hasCustomSize ? 'auto' : undefined,
        }
        : undefined;

    return (
        <div
            ref={panelRef}
            style={inlineStyle}
            className={`so-chat-panel ${isMoving ? 'moving' : ''} ${isResizing ? 'resizing' : ''}`}
        >
            {/* ── 리사이즈 핸들 (상·하·좌·대각선 전방향 지원) ── */}
            <div
                onMouseDown={(e) => handleResizeMouseDown(e, 'left')}
                className="so-resize-handle-left"
                title="가로 크기 조절"
            />
            <div
                onMouseDown={(e) => handleResizeMouseDown(e, 'top')}
                className="so-resize-handle-top"
                title="상단 세로 크기 조절"
            />
            <div
                onMouseDown={(e) => handleResizeMouseDown(e, 'bottom')}
                className="so-resize-handle-bottom"
                title="하단 세로 크기 조절"
            />
            <div
                onMouseDown={(e) => handleResizeMouseDown(e, 'corner')}
                className="so-resize-handle-corner"
                title="좌상단 대각선 크기 조절"
            />
            <div
                onMouseDown={(e) => handleResizeMouseDown(e, 'corner-bottom')}
                className="so-resize-handle-bottom-left"
                title="좌하단 대각선 크기 조절"
            />

            {/* ── 상단 헤더 ── */}
            <div
                onMouseDown={handleHeaderMouseDown}
                onDoubleClick={handleHeaderDoubleClick}
                className="so-chat-header"
                title="드래그하여 이동 / 더블클릭 시 기본 위치 복귀"
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
                            <span>{isHistoryOpen ? '대화기록 닫기' : '대화기록 열기'}</span>
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


                    <div className="so-history-list">
                        {!isLoggedInUser ? (
                            <div className="so-history-empty">
                                <div className="so-history-empty-icon">
                                    <Lock size={32} strokeWidth={1.5} color="#8b5cf6" />
                                </div>
                                <div className="so-history-empty-title">로그인이 필요합니다</div>
                                <div className="so-history-empty-desc">
                                    로그인하면 이전 대화 기록이 보관되어<br />언제든 다시 이어서 질문할 수 있어요.
                                </div>
                            </div>
                        ) : isLoadingSessions ? (
                            <div className="so-history-empty">
                                <div className="so-history-spinner" />
                                <div className="so-history-empty-desc" style={{ marginTop: '14px' }}>대화 목록을 불러오는 중...</div>
                            </div>
                        ) : userSessions.length === 0 ? (
                            <div className="so-history-empty">
                                <div className="so-history-empty-icon">
                                    <MessageSquare size={32} strokeWidth={1.5} color="#8b5cf6" />
                                </div>
                                <div className="so-history-empty-title">저장된 과거 대화가 없습니다</div>
                                <div className="so-history-empty-desc">
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

            {/* 🔄 이전 가이드 이어하기 안내 카드 (스크롤에 밀리지 않게 고정 위치로 이동) */}
            {resumeSession && (
                <div style={{ padding: '0 16px 8px 16px', background: '#ffffff', zIndex: 10, borderTop: '1px solid #f1f5f9' }}>
                    <div className="so-resume-card" id="so-resume-card" style={{ marginBottom: 0, marginTop: '8px' }}>
                        <div className="so-resume-top">
                            <span className="so-resume-badge">
                                이전 가이드 이어하기
                            </span>
                            <button
                                onClick={onDismissResume}
                                className="so-resume-close"
                                title="닫기"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="so-resume-body">
                            이전에 진행 중이던 가이드가 있습니다.
                            <div className="so-resume-feature">
                                [{resumeSession.featureName || resumeSession.featureId}] ({resumeSession.startIndex + 1}단계 진행 중)
                            </div>
                            이어서 화면에서 계속 진행하시겠습니까?
                        </div>
                        <div className="so-resume-actions">
                            <button
                                onClick={onConfirmResume}
                                className="so-resume-btn confirm"
                            >
                                이어서 진행
                            </button>
                            <button
                                onClick={onDismissResume}
                                className="so-resume-btn cancel"
                            >
                                취소
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── 하단 입력창 ── */}
            <ChatInput onSend={onSend} isLoading={isLoading} />
        </div>
    );
};
