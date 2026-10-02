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
 * 1) 본문 첫 줄 주 기능명(<b>[주 기능명]</b> 기능 안내입니다)을 최우선 추출하여 "AI 조건식 자동생성 따라하기"처럼 일치화
 * 2) 본문에 패턴이 없는 경우 msg.featureName 활용
 */
const resolveFeatureTitle = (msg) => {
  // 1순위: msg.text 본문의 첫 머리에서 실제 주 기능명 추출 (예: "<b>AI 조건식 자동생성</b> 기능 안내입니다")
  if (msg.text) {
    const match = msg.text.match(/(?:<b>)?\s*([^<\n\r]+?)\s*(?:<\/b>)?\s*(?:기능\s*안내|가이드)/i);
    if (match && match[1]) {
      const extracted = match[1].replace(/^[#\s*]+/, '').replace(/<\/?[^>]+(>|$)/g, '').trim();
      if (extracted && !extracted.startsWith('node_')) {
        return extracted;
      }
    }
  }

  // 2순위: msg.featureName이 있고 node_ 가 아닌 유의미한 이름인 경우 백업 사용
  if (msg.featureName && !msg.featureName.startsWith('node_') && msg.featureName.trim().length > 0) {
    return msg.featureName.trim();
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
  }, [messages, resumeSession]);

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
      {/* 🔄 이전 가이드 이어하기 안내 카드 */}
      {resumeSession && (
        <div className="so-resume-card" id="so-resume-card">
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
      )}

      {/* 대화 메시지 목록 */}
      {messages.map((msg, index) => {
        const isWelcome = msg.id === 'welcome' || (index === 0 && msg.sender === 'ai');
        const featureTitle = resolveFeatureTitle(msg);
        const actionLabel = featureTitle ? `${featureTitle} 따라하기` : '화면에서 따라하기';

        let formattedText = msg.text || '';
        if (formattedText) {
          // 본문 내 [화면에서 따라하기] 문구를 실제 기능명이 명시된 [${actionLabel}]로 100% 일치 치환
          formattedText = formattedText
            .replace(/\[?👉?\s*화면에서\s*따라하기\]?/g, `[${actionLabel}]`)
            .replace(/화면에서\s*따라하기\s*버튼/g, `[${actionLabel}] 버튼`);
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
                className={`so-bubble ai ${isWelcome ? 'welcome' : ''}`}
                onContextMenu={(e) => handleContextMenu(e, msg)}
                title={msg.messageId ? "우클릭하여 오류 제보" : ""}
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
                            <b>{opt.title}</b>
                            {opt.description && (
                              <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>
                                {opt.description}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* [기능명] 따라하기 버튼 (시스템 ID 노출 원천 차단) */}
                    {msg.featureId && (
                      <div style={{ marginTop: '10px' }}>
                        <button
                          onClick={() => onRunGuide(msg.featureId, msg.step, featureTitle || msg.featureName)}
                          className="so-exec-btn"
                        >
                          {actionLabel}{msg.step && msg.step > 1 ? ` (${msg.step}단계)` : ''}
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
