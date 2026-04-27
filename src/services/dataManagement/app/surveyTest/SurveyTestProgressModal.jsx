import React, { useState, useEffect, useRef } from 'react';
import './SurveyTestProgressModal.css';

const SurveyTestProgressModal = ({ isOpen, onClose, percentage = 0, message = '요청을 준비하고 있습니다...', isComplete = false }) => {
    const [displayNum, setDisplayNum] = useState(0);

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

    // Return component UI
    return (
        <div className={`qa-modal-overlay active`}>
            <div className={`qa-modal-card ${isComplete ? 'success-mode' : ''}`}>
                <div className="qa-header-section">
                    <h2>AI 로직 교차 검증</h2>
                    <p className="qa-subtitle">문서와 설문 스크립트의 불일치 여부를 분석합니다.<br/>화면을 닫지 마세요.</p>
                </div>

                <div className="qa-steps-container">
                    <div className="qa-track-line">
                        <div className="qa-track-fill" style={{ width: trackWidth }}></div>
                    </div>

                    <div className={`qa-step-item ${step1Status}`}>
                        <div className="qa-step-icon-box">
                            {step1Status === 'completed' ? checkSvg : docSvg}
                        </div>
                        <span className="qa-step-label">설문 분석</span>
                    </div>

                    <div className={`qa-step-item ${step2Status}`}>
                        <div className="qa-step-icon-box">
                            {step2Status === 'completed' ? checkSvg : codeSvg}
                        </div>
                        <span className="qa-step-label">스크립트 분석</span>
                    </div>

                    <div className={`qa-step-item ${step3Status}`}>
                        <div className="qa-step-icon-box">
                            {step3Status === 'completed' ? checkSvg : mergeSvg}
                        </div>
                        <span className="qa-step-label">교차 분석</span>
                    </div>
                </div>

                <div className="qa-status-header">
                    <span className="qa-status-msg" key={message}>{message}</span>
                    <div className="qa-percentage">
                        <span className="qa-percentage-num">{displayNum}</span>
                        <span className="qa-percentage-sign">%</span>
                    </div>
                </div>

                <div className="qa-progress-container">
                    <div className="qa-progress-bar" style={{ width: `${percentage}%` }}></div>
                </div>

                <button className="qa-close-btn" onClick={onClose}>
                    결과 리포트 확인하기
                </button>
            </div>
        </div>
    );
};

export default SurveyTestProgressModal;
