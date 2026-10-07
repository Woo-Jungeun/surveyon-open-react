import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useSelector } from 'react-redux';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { ChatPanel } from './ChatPanel';
import { chatApi, getChatBaseUrl } from './ChatApi';
import { modalContext } from "@/components/common/Modal.jsx";
import './SurveyonAssistant.css';

export const SurveyonAssistant = ({
  apiBase: propApiBase,
  defaultOpen = false,
  userId: propUserId,
}) => {
  // 공통 모달(Alert) 컨텍스트
  const modal = useContext(modalContext);

  // 1. API_BASE 자동 결정 (chatApi 표준 헬퍼 활용)
  const API_BASE = getChatBaseUrl(propApiBase);
  // tutorial_engine.js 등 외부 스크립트에서도 동일한 API_BASE를 참조할 수 있도록 window 전역 동기화
  if (typeof window !== 'undefined') {
    window.__SURVEYON_API_BASE__ = API_BASE;
  }

  // 1-1. USER_ID 안전 추출 헬퍼 (JSON 문자열 파싱 방어)
  const extractUserFromRaw = (raw) => {
    if (!raw || !raw.trim()) return null;
    const trimmed = raw.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object') {
          const val = parsed.username || parsed.userId || parsed.id || parsed.name || parsed.empNo || parsed.email;
          if (val) return String(val).trim();
        }
      } catch (_) { }
    }
    return trimmed;
  };

  // Redux 전역 상태에서 auth 정보 가져오기 (원래 쓰는 방식)
  const auth = useSelector((store) => store.auth);

  // USER_ID 자동 결정 (Redux -> Props -> localStorage -> sessionStorage -> 익명 사용자)
  const resolveUserId = () => {
    // 1순위: Redux에 저장된 로그인 유저 ID
    const reduxUserId = auth?.user?.userId || auth?.user?.id || auth?.user?.username;
    if (reduxUserId) return String(reduxUserId).trim();

    // 2순위: Props로 명시적으로 전달받은 경우
    if (propUserId && propUserId.trim()) return propUserId.trim();

    // 3순위: localStorage (WebUI 대시보드 로그인 계정)
    try {
      const u = extractUserFromRaw(localStorage.getItem('username'))
        || extractUserFromRaw(localStorage.getItem('userId'))
        || extractUserFromRaw(localStorage.getItem('user'));
      if (u) return u;
    } catch (e) { }

    // 3순위: sessionStorage
    try {
      const u = extractUserFromRaw(sessionStorage.getItem('username'))
        || extractUserFromRaw(sessionStorage.getItem('userId'))
        || extractUserFromRaw(sessionStorage.getItem('user'));
      if (u) return u;
    } catch (e) { }

    // 4순위: 전역 window 변수 (바닐라 JS 및 설문온 사이트 임베딩 호환용)
    if (typeof window !== 'undefined') {
      const win = window;
      const winUser = win.__SURVEYON_USER__ || win.__SURVEYON_USER_ID__ || win.surveyonUser || win.currentUser;
      if (winUser) {
        if (typeof winUser === 'string') {
          const u = extractUserFromRaw(winUser);
          if (u) return u;
        } else if (typeof winUser === 'object') {
          const val = winUser.username || winUser.userId || winUser.id || winUser.name || winUser.empNo;
          if (val) return String(val).trim();
        }
      }
    }

    // 5순위: 브라우저 쿠키 (설문온 등 레거시 도메인 쿠키 파싱)
    try {
      const cookieMatch = document.cookie.match(/(?:^|;\s*)(?:user|userId|loginId|hrc_user|empNo)=([^;]+)/i);
      if (cookieMatch && cookieMatch[1]) {
        const u = extractUserFromRaw(decodeURIComponent(cookieMatch[1]));
        if (u) return u;
      }
    } catch (e) { }

    // 6순위: 미인증/미지정 기본값
    return '익명 사용자';
  };

  // 2. 세션 ID 관리 (새 대화 시작 시 변경 가능하도록 setSessionId 지원)
  const [sessionId, setSessionId] = useState(() => {
    try {
      let s = sessionStorage.getItem('__surveyon_assistant_session_id__');
      if (!s) {
        s = 'so_sess_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
        sessionStorage.setItem('__surveyon_assistant_session_id__', s);
      }
      return s;
    } catch (e) {
      return 'so_sess_' + Date.now();
    }
  });

  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isLoading, setIsLoading] = useState(false);
  const [resumeSession, setResumeSession] = useState(null);

  // 신고 관련 상태
  const [reportMessageId, setReportMessageId] = useState(null);
  const [reportReasonType, setReportReasonType] = useState('부정확한 답변 (할루시네이션)');
  const [reportReasonText, setReportReasonText] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [modalElement, setModalElement] = useState(null);

  // 기본 웰컴 메시지 정의
  const welcomeMessage = {
    id: 'welcome',
    sender: 'ai',
    text: `<div style="font-weight: 700; font-size: 14.5px; color: #1e293b; margin-bottom: 6px;">안녕하세요! 설문온 AI 어시스턴트입니다.</div><div style="font-weight: 400; color: #64748b; font-size: 13px; line-height: 1.55;">설문 중 막히는 부분을 편하게 물어보세요!<br><b style="color: #6E62FF; font-weight: 600;">화면에서 직접 버튼을 짚어가며</b> 쉽게 안내해 드릴게요.</div>`,
    options: [
      { featureId: 'node_1_2_4_1_1_1', title: '척도 문항 요약표 어떻게 만들어?' },
      { featureId: 'node_1_1_1', title: '그리드 복사는 어디에 있어?' },
      { featureId: 'node_1_1_4_1', title: 'AI 조건식 자동생성 어떻게 해?' },
    ],
    timestamp: Date.now(),
  };

  // 초기 메시지 목록
  const [messages, setMessages] = useState([welcomeMessage]);

  // 4. 과거 대화 내역(히스토리) 관리 상태
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [userSessions, setUserSessions] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  const currentUserId = resolveUserId();
  const isLoggedInUser = Boolean(currentUserId && currentUserId !== '익명 사용자' && currentUserId.trim().length > 0);

  const loadUserSessions = useCallback(async () => {
    const u = resolveUserId();
    if (!u || u === '익명 사용자') {
      setUserSessions([]);
      return;
    }
    setIsLoadingSessions(true);
    try {
      const sessions = await chatApi.getSessionList(u, propApiBase);
      setUserSessions(sessions);
    } catch (err) {
      console.warn('[ChatAssistant] 대화 세션 목록 조회 실패:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  }, [propApiBase]);

  const handleDeleteSession = useCallback(async (sessionId, e) => {
    if (e) {
      e.stopPropagation();
    }
    
    try {
      await chatApi.deleteSessions([sessionId], propApiBase);
      // 로컬 상태에서 즉각 제거 (Optimistic Update)
      setUserSessions(prev => prev.filter(s => s.sessionId !== sessionId));
      // 만약 현재 띄워져 있는 세션을 삭제했다면 새 대화로 전환
      if (sessionId === resumeSession) {
        setResumeSession(null);
        setMessages([welcomeMessage]);
        sessionStorage.removeItem('__surveyon_assistant_session_id__');
      }
    } catch (err) {
      modal.showAlert('알림', '대화 삭제 중 오류가 발생했습니다.', { themeClass: 'purple-theme' });
    }
  }, [propApiBase, resumeSession, modal]);

  const handleDeleteAllSessions = useCallback(async () => {
    try {
      const allSessionIds = userSessions.map(s => s.sessionId);
      if (allSessionIds.length === 0) return;
      await chatApi.deleteSessions(allSessionIds, propApiBase);
      
      setUserSessions([]);
      setResumeSession(null);
      setMessages([welcomeMessage]);
      sessionStorage.removeItem('__surveyon_assistant_session_id__');
    } catch (err) {
      modal.showAlert('알림', '전체 대화 삭제 중 오류가 발생했습니다.', { themeClass: 'purple-theme' });
    }
  }, [propApiBase, userSessions, welcomeMessage, modal]);

  const handleToggleHistory = () => {
    const next = !isHistoryOpen;
    setIsHistoryOpen(next);
    if (next) {
      loadUserSessions();
    }
  };

  const handleSelectSession = (targetSessionId) => {
    if (targetSessionId === sessionId) {
      setIsHistoryOpen(false);
      return;
    }
    try {
      sessionStorage.setItem('__surveyon_assistant_session_id__', targetSessionId);
    } catch (e) { }
    setSessionId(targetSessionId);
    setIsHistoryOpen(false);
  };

  // 새 대화 시작 (새로운 세션 발급 및 화면 초기화)
  const startNewChat = () => {
    const newSessId = 'so_sess_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    try {
      sessionStorage.setItem('__surveyon_assistant_session_id__', newSessId);
    } catch (e) { }
    setSessionId(newSessId);
    setMessages([welcomeMessage]);
    setIsHistoryOpen(false);
  };

  // 세션 대화 복원 (새로고침 시 기존 대화 자동 복원)
  useEffect(() => {
    let isCancelled = false;
    const fetchHistory = async () => {
      try {
        const rawList = await chatApi.getMessageList(sessionId, propApiBase);
        if (!isCancelled && Array.isArray(rawList) && rawList.length > 0) {
          const restored = rawList.map((item) => ({
            id: item.id || `msg_${item.messageId}`,
            messageId: item.messageId,
            sender: item.sender === 'user' ? 'user' : 'ai',
            text: item.text,
            detectedTarget: item.detectedTarget,
            options: item.options,
            featureId: item.featureId,
            featureName: item.featureName,
            step: item.step || 1,
            entryUrl: item.entryUrl,
            timestamp: item.timestamp || Date.now(),
          }));
          setMessages([welcomeMessage, ...restored]);
        }
      } catch (e) {
        console.warn('[ChatAssistant] 대화 이력 복원 실패:', e);
      }
    };

    fetchHistory();
    return () => {
      isCancelled = true;
    };
  }, [sessionId, propApiBase]);

  // 튜토리얼 툴팁 내 <b> 태그가 raw text로 노출되는 현상 방지용 옵저버 (안전한 TextNode 치환 방식)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const replaceBtagsInTextNodes = (rootElement) => {
      if (!rootElement) return;
      const walker = document.createTreeWalker(rootElement, NodeFilter.SHOW_TEXT, null, false);
      let node;
      const nodesToReplace = [];
      while ((node = walker.nextNode())) {
        // 이미 치환된 노드이거나 스크립트/스타일 안의 텍스트는 무시
        if (node.parentElement && (node.parentElement.tagName === 'SCRIPT' || node.parentElement.tagName === 'STYLE')) continue;
        if (node.nodeValue.includes('&lt;b&gt;') || node.nodeValue.includes('&lt;/b&gt;') || 
            node.nodeValue.includes('<b>') || node.nodeValue.includes('</b>') ||
            node.nodeValue.includes('🎉')) {
          nodesToReplace.push(node);
        }
      }
      
      nodesToReplace.forEach(textNode => {
        const span = document.createElement('span');
        span.className = 'so-b-parsed';
        // raw 문자열을 HTML 태그로 치환
        let parsed = textNode.nodeValue
          .replace(/&lt;b&gt;/g, '<b>').replace(/&lt;\/b&gt;/g, '</b>')
          .replace(/&lt;br&gt;/g, '<br>').replace(/&lt;\/br&gt;/g, '')
          .replace(/&lt;br\s*\/&gt;/g, '<br>')
          .replace(/&lt;strong&gt;/g, '<strong>').replace(/&lt;\/strong&gt;/g, '</strong>');
          
        if (parsed.includes('🎉')) {
          const premiumCheckIcon = `<div class="premium-check-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></div>`;
          parsed = parsed.replace(/🎉/g, premiumCheckIcon);
        }

        span.innerHTML = parsed;
        textNode.parentNode.replaceChild(span, textNode);
      });
    };

    const observer = new MutationObserver(() => {
      const tooltip = document.getElementById('tutorial-tooltip');
      if (tooltip) {
        replaceBtagsInTextNodes(tooltip);
        
        // 버튼 자동 태깅 (완료/닫기 vs 우측 상단 X버튼 명확히 구분)
        const buttons = tooltip.querySelectorAll('button');
        buttons.forEach(btn => {
          const text = btn.textContent.trim();
          if (text.includes('닫기') || text.includes('완료') || text.includes('다음') || text.includes('이전') || text.includes('시작')) {
            btn.classList.add('so-action-btn');
            btn.classList.remove('so-close-btn');
          } else {
            btn.classList.add('so-close-btn');
            btn.classList.remove('so-action-btn');
          }
        });
        
        // 특정 상황에서 튜토리얼 엔진이 인라인 스타일로 배경색을 강제하는 경우 방어
        tooltip.style.setProperty('background', '#4F46E5', 'important');
        tooltip.style.setProperty('background-color', '#4F46E5', 'important');
      }
    });

    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  // 3. 이전 가이드 진행 세션 복구 검사
  const checkPreviousSession = useCallback(() => {
    try {
      const saved = sessionStorage.getItem('__surveyon_active_tutorial__');
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (!parsed || !parsed.featureId) return;

      // 2시간 이상 지난 세션은 자동 만료
      if (parsed.timestamp && Date.now() - parsed.timestamp > 2 * 60 * 60 * 1000) {
        sessionStorage.removeItem('__surveyon_active_tutorial__');
        return;
      }
      setResumeSession(parsed);
    } catch (e) { }
  }, []);

  useEffect(() => {
    checkPreviousSession();
  }, [checkPreviousSession]);

  // 4. 가이드 엔진 동적 로드 및 실행
  const handleRunGuide = useCallback(
    (featureId, step = 1, featureName) => {
      const startIndex = step > 0 ? step - 1 : 0;
      const fName = featureName || '';

      try {
        sessionStorage.setItem(
          '__surveyon_active_tutorial__',
          JSON.stringify({
            featureId,
            featureName: fName,
            startIndex,
            timestamp: Date.now(),
          })
        );
      } catch (e) { }

      setResumeSession(null);

      const win = window;
      if (win.TutorialEngine) {
        win.TutorialEngine.startByFeatureId(featureId, { startIndex, featureName: fName });
      } else {
        const script = document.createElement('script');
        script.src = `${API_BASE}/tutorial_engine.js?t=${Date.now()}`;
        script.onload = () => {
          if (win.TutorialEngine) {
            win.TutorialEngine.startByFeatureId(featureId, { startIndex, featureName: fName });
          }
        };
        script.onerror = () => {
          console.warn('⚠️ [SurveyonAssistant] 1차 tutorial_engine.js 로드 실패, 대체 경로(/UI/ 및 루트) 시도');
          const fallbackScript = document.createElement('script');
          fallbackScript.src = `${API_BASE}/UI/tutorial_engine.js?t=${Date.now()}`;
          fallbackScript.onload = () => {
            if (win.TutorialEngine) {
              win.TutorialEngine.startByFeatureId(featureId, { startIndex, featureName: fName });
            }
          };
          fallbackScript.onerror = () => {
            const rootScript = document.createElement('script');
            rootScript.src = `/tutorial_engine.js?t=${Date.now()}`;
            rootScript.onload = () => {
              if (win.TutorialEngine) {
                win.TutorialEngine.startByFeatureId(featureId, { startIndex, featureName: fName });
              }
            };
            document.head.appendChild(rootScript);
          };
          document.head.appendChild(fallbackScript);
        };
        document.head.appendChild(script);
      }
    },
    [API_BASE]
  );

  // 5. 이전 가이드 이어하기 승인/취소
  const handleConfirmResume = () => {
    if (resumeSession) {
      handleRunGuide(
        resumeSession.featureId,
        resumeSession.startIndex + 1,
        resumeSession.featureName
      );
    }
  };

  const handleDismissResume = () => {
    try {
      sessionStorage.removeItem('__surveyon_active_tutorial__');
    } catch (e) { }
    setResumeSession(null);
  };

  // 6. 질문 전송 및 VLM 화면 분석
  const handleSend = async (userMsg, shouldCapture) => {
    const userMsgId = 'msg_' + Date.now();
    const newUserMessage = {
      id: userMsgId,
      sender: 'user',
      text: userMsg,
      timestamp: Date.now(),
    };

    const loadingMsgId = 'loading_' + Date.now();
    const loadingMessage = {
      id: loadingMsgId,
      sender: 'ai',
      isLoading: true,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, newUserMessage, loadingMessage]);
    setIsLoading(true);

    let screenshotBase64 = null;

    // VLM 화면 캡처 분석
    if (shouldCapture) {
      try {
        const html2canvas = (await import('html2canvas')).default;
        const canvas = await html2canvas(document.body, {
          scale: 0.8,
          useCORS: true,
          allowTaint: true,
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight,
          scrollX: window.scrollX,
          scrollY: window.scrollY,
          ignoreElements: (el) => {
            return (
              el.id === 'surveyon-assistant-root' ||
              el.closest('#surveyon-assistant-root') !== null ||
              el.id === 'tutorial-spotlight' ||
              el.id === 'tutorial-tooltip' ||
              el.id === 'tutorial-fake-cursor'
            );
          },
          onclone: (clonedDoc) => {
            // 복제된 DOM에서 모든 CSS 애니메이션/트랜지션을 즉시 멈추고 불투명도 100% 강제 (화면 백화 방지)
            try {
              const style = clonedDoc.createElement('style');
              style.innerHTML = `
                *, *::before, *::after {
                  animation: none !important;
                  transition: none !important;
                  opacity: 1 !important;
                }
              `;
              clonedDoc.head.appendChild(style);
            } catch (e) { }
          },
        });
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        screenshotBase64 = dataUrl.split(',')[1];
      } catch (err) {
        console.warn('[설문온 어시스턴트] 화면 캡처 실패:', err);
      }
    }

    try {
      const data = await chatApi.ask(
        {
          sessionId,
          userId: resolveUserId(),
          userMessage: userMsg,
          currentUrl: window.location.href,
          screenshotBase64,
        },
        propApiBase
      );

      setMessages((prev) =>
        prev
          .filter((m) => m.id !== loadingMsgId)
          .concat({
            id: 'ai_' + Date.now(),
            messageId: data.messageId,
            sender: 'ai',
            text: data.answer || '안내를 불러오지 못했습니다.',
            detectedTarget: data.detectedTarget,
            options: data.options,
            featureId: data.featureId,
            featureName: data.featureName,
            step: data.step || 1,
            entryUrl: data.entryUrl,
            timestamp: Date.now(),
          })
      );
    } catch (err) {
      setMessages((prev) =>
        prev
          .filter((m) => m.id !== loadingMsgId)
          .concat({
            id: 'ai_err_' + Date.now(),
            sender: 'ai',
            text: `❌ 서버 통신 오류가 발생했습니다: ${err.message}`,
            timestamp: Date.now(),
          })
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 옵션 선택 시 질문 전송
  const handleSelectOption = (featureId, title) => {
    // 빠른 가이드/추천 칩 클릭 시에도 현재 화면을 백그라운드 캡처하여 VLM 시각 분석 및 기록에 활용합니다.
    handleSend(title, true);
  };

  return (
    <div id="surveyon-assistant-root">
      {/* ── 우측 하단 플로팅 토글 버튼 ── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="so-btn-toggle"
          title="설문온 AI 가이드 어시스턴트 열기"
        >
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 4a3 3 0 0 1 3 3v8a3 3 0 0 1 -3 3h-5l-5 3v-3h-2a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3h12z" />
            <path d="M9.5 9h.01" />
            <path d="M14.5 9h.01" />
            <path d="M9.5 13a3.5 3.5 0 0 0 5 0" />
          </svg>
          {/* 🌟 이전 가이드 이어하기 대기 알림 Dot */}
          {resumeSession && (
            <span
              className="so-toggle-dot"
              title={`이전 가이드 [${resumeSession.featureName || resumeSession.featureId}] 이어하기 대기 중`}
            />
          )}
        </button>
      )}

      {/* ── 사이드 챗봇 패널 ── */}
      <ChatPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        messages={messages}
        resumeSession={resumeSession}
        onSend={handleSend}
        onSelectOption={handleSelectOption}
        onRunGuide={handleRunGuide}
        onConfirmResume={handleConfirmResume}
        onDismissResume={handleDismissResume}
        onReport={(messageId) => setReportMessageId(messageId)}
        isLoading={isLoading}
        onNewChat={startNewChat}
        currentSessionId={sessionId}
        userSessions={userSessions}
        isLoadingSessions={isLoadingSessions}
        isHistoryOpen={isHistoryOpen}
        onToggleHistory={handleToggleHistory}
        onSelectSession={handleSelectSession}
        isLoggedInUser={isLoggedInUser}
        onDeleteSession={handleDeleteSession}
        onDeleteAllSessions={handleDeleteAllSessions}
      />

      {/* ⚠️ 오류 제보 모달 */}
      {reportMessageId && (
        <div className="so-modal-overlay" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }}>
          <div ref={setModalElement} className="so-modal-content" style={{ background: '#fff', padding: '28px', borderRadius: '16px', width: '92%', maxWidth: '420px', pointerEvents: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              챗봇 답변 오류 제보
            </h4>
            <hr style={{ margin: '0 -28px 20px -28px', border: 'none', borderTop: '1px solid #e2e8f0' }} />
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12.5px', fontWeight: '600', color: '#475569' }}>제보 유형</label>
              {modalElement && (
                <DropDownList
                  data={[
                    "부정확한 답변 (할루시네이션)",
                    "엉뚱한 화면 매칭",
                    "불쾌하거나 부적절한 표현",
                    "기타 사유"
                  ]}
                  value={reportReasonType}
                  onChange={(e) => setReportReasonType(e.value)}
                  style={{ width: '100%' }}
                  className="so-kendo-dropdown"
                  popupSettings={{ 
                    className: 'so-kendo-popup-high-z',
                    appendTo: modalElement
                  }}
                />
              )}
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12.5px', fontWeight: '600', color: '#475569' }}>상세 사유 (선택)</label>
              <textarea
                value={reportReasonText}
                onChange={(e) => setReportReasonText(e.target.value)}
                placeholder="답변의 어떤 점이 문제인지 자세히 적어주세요."
                style={{ 
                  width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', 
                  minHeight: '120px', resize: 'vertical', fontSize: '13.5px', color: '#334155', fontFamily: 'inherit',
                  outline: 'none', transition: 'border-color 0.2s', lineHeight: '1.5'
                }}
                onFocus={(e) => e.target.style.borderColor = '#6E62FF'}
                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setReportMessageId(null)}
                style={{ 
                  padding: '9px 16px', borderRadius: '8px', background: '#f1f5f9', color: '#475569',
                  border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.target.style.background = '#e2e8f0'}
                onMouseOut={(e) => e.target.style.background = '#f1f5f9'}
                disabled={isSubmittingReport}
              >
                취소
              </button>
              <button
                onClick={async () => {
                  setIsSubmittingReport(true);
                  try {
                    await chatApi.report(
                      {
                        messageId: reportMessageId,
                        reasonType: reportReasonType,
                        reasonText: reportReasonText,
                      },
                      propApiBase
                    );

                    if (modal && modal.showAlert) {
                      modal.showAlert('알림', '오류 제보가 정상적으로 접수되었습니다.\n소중한 의견 감사합니다.');
                    } else {
                      alert('오류 제보가 정상적으로 접수되었습니다.\n소중한 의견 감사합니다.');
                    }
                    setReportMessageId(null);
                    setReportReasonText('');
                  } catch (e) {
                    if (modal && modal.showErrorAlert) {
                      modal.showErrorAlert('에러', `오류 제보 접수 중 문제가 발생했습니다.\n${e.message || '네트워크 연결을 확인해 주세요.'}`);
                    } else {
                      alert(`오류 제보 접수 중 문제가 발생했습니다: ${e.message || '네트워크 연결을 확인해 주세요.'}`);
                    }
                  } finally {
                    setIsSubmittingReport(false);
                  }
                }}
                style={{ 
                  padding: '9px 16px', borderRadius: '8px', background: '#6E62FF', color: '#fff',
                  border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', transition: 'background 0.2s',
                  boxShadow: '0 2px 8px rgba(110, 98, 255, 0.25)'
                }}
                onMouseOver={(e) => e.target.style.background = '#5A4BFF'}
                onMouseOut={(e) => e.target.style.background = '#6E62FF'}
                disabled={isSubmittingReport}
              >
                {isSubmittingReport ? '제출 중...' : '제보하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SurveyonAssistant;
