import React, { useEffect, useRef } from 'react';

/**
 * XSS 공격 방지를 위한 경량 HTML 소독기 (DOMParser 기반)
 * 안전한 태그(b, br, strong 등)만 허용하고 악성 스크립트 및 인라인 핸들러를 차단합니다.
 */
const sanitizeHtml = (rawHtml) => {
  if (!rawHtml || typeof window === 'undefined') return rawHtml || '';

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, 'text/html');

    // 위험 태그 완전 제거
    const dangerousTags = ['SCRIPT', 'IFRAME', 'OBJECT', 'EMBED', 'STYLE', 'META', 'LINK'];
    dangerousTags.forEach((tag) => {
      const elements = doc.querySelectorAll(tag);
      elements.forEach((el) => el.remove());
    });

    const allowedTags = new Set([
      'B', 'STRONG', 'I', 'EM', 'BR', 'SPAN', 'P', 'DIV', 'U', 'UL', 'OL', 'LI', 'A', 'CODE', 'PRE'
    ]);

    const sanitizeElement = (element) => {
      const children = Array.from(element.children);
      children.forEach((child) => sanitizeElement(child));

      const tagName = element.tagName.toUpperCase();

      if (!allowedTags.has(tagName)) {
        element.replaceWith(doc.createTextNode(element.textContent || ''));
        return;
      }

      const attrs = Array.from(element.attributes);
      for (const attr of attrs) {
        const attrName = attr.name.toLowerCase();
        const attrVal = attr.value.trim().toLowerCase();

        // 1. 모든 인라인 이벤트 핸들러(onclick, onerror 등) 제거
        if (attrName.startsWith('on')) {
          element.removeAttribute(attr.name);
          continue;
        }

        // 2. javascript: 또는 data: URI 차단
        if (attrVal.includes('javascript:') || attrVal.startsWith('data:text/html')) {
          element.removeAttribute(attr.name);
          continue;
        }

        // 3. 링크 태그 보안 강화 (외부 새 창 및 noopener 강제)
        if (tagName === 'A' && attrName === 'href') {
          if (!/^https?:\/\//i.test(attr.value) && !attr.value.startsWith('/') && !attr.value.startsWith('#')) {
            element.removeAttribute(attr.name);
          } else {
            element.setAttribute('target', '_blank');
            element.setAttribute('rel', 'noopener noreferrer');
          }
          continue;
        }

        // 4. 안전한 기본 속성 외 제거
        if (!['class', 'style', 'title', 'id'].includes(attrName)) {
          element.removeAttribute(attr.name);
        }
      }
    };

    Array.from(doc.body.children).forEach((child) => sanitizeElement(child));
    return doc.body.innerHTML;
  } catch {
    return rawHtml.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
};

/**
 * 기능명 추출 헬퍼 (시스템 내부 ID 노출 차단 및 주 기능명-버튼 텍스트 일치화)
 * 1) API에서 명시적으로 전달받은 msg.featureName 최우선 사용
 * 2) 없는 경우에만 본문(text) 첫 줄에서 기능명을 파싱하여 백업으로 사용
 */
const resolveFeatureTitle = (msg) => {
  // 1순위: 백엔드 API에서 명시적으로 기능명(featureName)을 내려주는 경우 최우선 적용
  if (msg.featureName && typeof msg.featureName === 'string' && !msg.featureName.startsWith('node_') && msg.featureName.trim().length > 0) {
    return msg.featureName.trim();
  }

  // 2순위: (구버전 호환용) 본문의 첫 머리에서 실제 주 기능명 파싱 추출 (예: "<b>AI 조건식 자동생성</b> 기능 안내입니다")
  if (msg.text) {
    const match = msg.text.match(/(?:<b>)?\s*([^<\n\r]+?)\s*(?:<\/b>)?\s*(?:기능\s*안내|가이드)/i);
    if (match && match[1]) {
      const extracted = match[1].replace(/^[#\s*]+/, '').replace(/<\/?[^>]+(>|$)/g, '').trim();
      if (extracted && !extracted.startsWith('node_')) {
        return extracted;
      }
    }
  }

  return '';
};

export const ChatMessages = ({
  messages,
  resumeSession,
  onSelectOption,
  onRunGuide,
  onConfirmResume,
  onDismissResume,
  onReport,
}) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleContextMenu = (e, msg) => {
    if (msg.messageId && onReport) {
      e.preventDefault();
      onReport(msg.messageId);
    }
  };

  return (
    <div
      ref={scrollRef}
      className="so-chat-body"
      id="so-messages"
    >

      {/* 대화 메시지 목록 */}
      {messages.map((msg, index) => {
        const isWelcome = msg.id === 'welcome' || (index === 0 && msg.sender === 'ai');
        const featureTitle = resolveFeatureTitle(msg);
        const actionLabel = featureTitle ? `${featureTitle} 따라하기` : '가이드 따라하기';

        let formattedText = msg.text || '';
        if (formattedText) {
          // 본문 내 [화면에서 따라하기] 문구를 실제 기능명이 명시된 [${actionLabel}]로 100% 일치 치환
          formattedText = formattedText
            .replace(/\[?👉?\s*화면에서\s*(직접\s*)?따라하기\]?/g, `[${actionLabel}]`)
            .replace(/화면에서\s*(직접\s*)?따라하기\s*버튼/g, `[${actionLabel}] 버튼`);
          // 잔여 👉 이모지 정돈
          formattedText = formattedText.replace(/👉\s*/g, '');
        }

        return (
          <React.Fragment key={msg.id}>
            {msg.sender === 'user' ? (
              <div className="so-bubble user">
                <div>{msg.text}</div>
              </div>
            ) : (
              <div
                className={`so-bubble ai ${isWelcome ? 'welcome' : ''} ${msg.id.startsWith('ai_err_') ? 'error' : ''}`}
              >
                {msg.isLoading ? (
                  <div className="so-typing-indicator">
                    <span className="so-typing-text">답변을 준비하고 있습니다</span>
                    <span className="so-typing-dots">
                      <span className="so-dot"></span>
                      <span className="so-dot"></span>
                      <span className="so-dot"></span>
                    </span>
                  </div>
                ) : (
                  <>
                    {/* 웰컴 메시지 전용 커스텀 아이콘 */}
                    {isWelcome && (
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px', marginTop: '4px' }}>
                        <div style={{
                          width: '50px', height: '50px', borderRadius: '50%',
                          background: 'linear-gradient(135deg, #8b5cf6, #6E62FF)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: '0 6px 16px rgba(110, 98, 255, 0.28)'
                        }}>
                          <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M4.5 10.5C4.5 7.186 7.186 4.5 10.5 4.5H15.5C18.814 4.5 21.5 7.186 21.5 10.5V14.5C21.5 17.814 18.814 20.5 15.5 20.5H12L6.5 23V19.2C5.2 18 4.5 16.4 4.5 14.5V10.5Z" stroke="white" strokeWidth="2.4" strokeLinejoin="round"/>
                            <circle cx="10" cy="12" r="1.6" fill="white"/>
                            <circle cx="16" cy="12" r="1.6" fill="white"/>
                            <path d="M10.5 16C11.5 17.2 14.5 17.2 15.5 16" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
                          </svg>
                        </div>
                      </div>
                    )}
                    {/* AI 본문 답변 */}
                    {formattedText && (
                      <div
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(formattedText) }}
                      />
                    )}

                    {/* 대상 버튼 뱃지 */}
                    {msg.detectedTarget && (
                      <div>
                        <span className="so-target-badge">
                          안내 위치: {msg.detectedTarget}
                        </span>
                      </div>
                    )}

                    {/* 추천 선택지 (Options) */}
                    {msg.options && msg.options.length > 0 && (
                      <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {msg.options.map((opt, idx) => (
                          <button
                            key={idx}
                            onClick={() => onSelectOption(opt.featureId, opt.title)}
                            className="so-quick-btn"
                          >
                            {opt.title}
                            {opt.description && (
                              <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>
                                {opt.description}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* [기능명] 따라하기 버튼 및 해당 메뉴로 이동 버튼 (시스템 ID 노출 원천 차단) */}
                    {(msg.featureId || msg.entryUrl) && (
                      <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {msg.featureId && (
                          <button
                            onClick={() => onRunGuide(msg.featureId, msg.step, featureTitle || msg.featureName)}
                            className="so-exec-btn"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                            {actionLabel}{msg.step && msg.step > 1 ? ` (${msg.step}단계)` : ''}
                          </button>
                        )}
                        {msg.entryUrl && (
                          <button
                            onClick={() => { window.location.href = msg.entryUrl; }}
                            className="so-nav-btn"
                          >
                            해당 메뉴로 이동
                          </button>
                        )}
                      </div>
                    )}
                    
                    {/* 답변 오류 제보 버튼 (명시적 UI) */}
                    {msg.messageId && !isWelcome && (
                      <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => onReport && onReport(msg.messageId)}
                          className="so-report-btn"
                          title="AI 답변이 이상하거나 오류가 있다면 제보해 주세요."
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                          </svg>
                          오류 제보
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
