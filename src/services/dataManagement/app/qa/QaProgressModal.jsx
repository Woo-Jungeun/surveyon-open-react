import React, { useState, useEffect } from 'react';
import './QaProgressModal.css';

const QaProgressModal = ({ isOpen, onClose, percentage = 0, message = '요청을 준비하고 있습니다...', isComplete = false, mode = 'analyze', questionsCount = 0 }) => {
    const [displayNum, setDisplayNum] = useState(0);

    const isValidate = mode === 'validate';

    // calculate step states based on percentage
    const trackWidth = percentage === 100 ? '100%' :
                       percentage >= 70 ? '100%' :
                       percentage >= 40 ? '50%' : '0%';

    const step1Status = percentage >= 40 ? 'completed' : 'active';
    const step2Status = percentage >= 70 ? 'completed' : (percentage >= 40 ? 'active' : '');
    const step3Status = percentage >= 100 ? 'completed' : (percentage >= 70 ? 'active' : '');

    const checkSvg = (
        <svg fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7"></path>
        </svg>
    );

    const docSvg = (
        <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 12h62M9 16h62M9 8h62m-7-5v20a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2H8a2 2 0 00-2 2z" stroke="none"></path>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
    );

    const codeSvg = (
        <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6"></polyline>
            <polyline points="8 6 2 12 8 18"></polyline>
        </svg>
    );

    const shieldSvg = (
        <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
    );

    const mergeSvg = (
        <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="18" r="3"></circle>
            <circle cx="6" cy="6" r="3"></circle>
            <path d="M13 6h3a2 2 0 0 1 2 2v7"></path>
            <line x1="6" y1="9" x2="6" y2="21"></line>
        </svg>
    );

    // Number animation
    useEffect(() => {
        let startTimestamp = null;
        const duration = 400;
        const start = displayNum;
        const end = percentage;
        
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            setDisplayNum(Math.floor(progress * (end - start) + start));
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                setDisplayNum(end);
            }
        };
        window.requestAnimationFrame(step);
    }, [percentage]);

    if (!isOpen) return null;

    const title = isValidate ? '설문 스크립트 QA 유효성 검증' : 'AI 설문지 구조화 템플릿 생성';
    const subtitle = isValidate 
        ? '업로드된 설문 템플릿의 문항 구문 오류, 누락, 논리 모순을 정밀 유효성 검증합니다.'
        : (
            <>
                설문지 아래아한글(HWP)/Word 문서를 AI로 정밀 분석하여<br />
                구조화 JSON 템플릿을 생성합니다.
            </>
        );
    const step1Label = isValidate ? '파싱 구문 비교 대조' : '문서 텍스트 정제';
    const step2Label = isValidate ? 'QA 유효성 규칙 검사' : 'AI 문항 영역 분석';
    const step3Label = isValidate ? '불일치 리포트 매핑' : '구조화 JSON 빌드';
    const closeBtnText = isValidate ? 'QA 검증 완료' : '구조화 템플릿 생성 완료';

    const displayMessage = message;

    // Return component UI
    return (
        <div className={`qa-modal-overlay active`}>
            <div className={`qa-modal-card ${isComplete ? 'success-mode' : ''}`}>
                <div className="qa-header-section">
                    <h2>{title}</h2>
                    <p className="qa-subtitle">{subtitle}</p>
                </div>

                <div className="qa-steps-container">
                    <div className="qa-track-line">
                        <div className="qa-track-fill" style={{ width: trackWidth }}></div>
                    </div>

                    <div className={`qa-step-item ${step1Status}`}>
                        <div className="qa-step-icon-box">
                            {step1Status === 'completed' ? checkSvg : docSvg}
                        </div>
                        <span className="qa-step-label">{step1Label}</span>
                    </div>

                    <div className={`qa-step-item ${step2Status}`}>
                        <div className="qa-step-icon-box">
                            {step2Status === 'completed' ? checkSvg : (isValidate ? shieldSvg : codeSvg)}
                        </div>
                        <span className="qa-step-label">{step2Label}</span>
                    </div>

                    <div className={`qa-step-item ${step3Status}`}>
                        <div className="qa-step-icon-box">
                            {step3Status === 'completed' ? checkSvg : mergeSvg}
                        </div>
                        <span className="qa-step-label">{step3Label}</span>
                    </div>
                </div>

                <div className="qa-status-header">
                    <span className="qa-status-msg" key={displayMessage}>{displayMessage}</span>
                    <div className="qa-percentage">
                        <span className="qa-percentage-num">{displayNum}</span>
                        <span className="qa-percentage-sign">%</span>
                    </div>
                </div>

                <div className="qa-progress-container">
                    <div className="qa-progress-bar" style={{ width: `${percentage}%` }}></div>
                </div>

                <button className="qa-close-btn" onClick={onClose}>
                    {closeBtnText}
                </button>
            </div>
        </div>
    );
};

export default QaProgressModal;
