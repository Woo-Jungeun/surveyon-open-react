import React, { useState } from 'react';
import { Save, ChevronRight } from 'lucide-react';
import DataHeader from "@/services/dataStatus/components/DataHeader";

// 단계별 컴포넌트 임포트
import DpRequestSettingStep from './steps/DpRequestSettingStep';   // Step 1: 분석 설정
import DpRequestBannerStep from './steps/DpRequestBannerStep';     // Step 2: 배너 구성
import DpRequestTableStep from './steps/DpRequestTableStep';       // Step 3: 스터브(문항) 설정
import DpRequestSummaryStep from './steps/DpRequestSummaryStep';   // Step 4: 요약표 구성
import DpRequestDetailStep from './steps/DpRequestDetailStep';     // Step 5: 최종 표 순서

import '@/services/dataStatus/app/additional/AdditionalAnalysisPage.css';
import './DpRequestPage.css';

const DpRequestPage = () => {
    const [currentStep, setCurrentStep] = useState(0);

    // 5단계 워크플로우 정의
    const steps = [
        { label: '설정', desc: '분석 설정, 가중치, 디자인' },
        { label: '배너', desc: '배너 변수 및 구성 설정' },
        { label: '스터브', desc: '분석 대상 문항 설정' },
        { label: '요약표', desc: '주요 지표 요약 구성' },
        { label: '표 순서', desc: '최종 산출물 표 순서' },
    ];

    // 단계별 컴포넌트 렌더링
    const renderStepContent = () => {
        switch (currentStep) {
            case 0: return <DpRequestSettingStep />;
            case 1: return <DpRequestBannerStep />;
            case 2: return <DpRequestTableStep />;
            case 3: return <DpRequestSummaryStep />;
            case 4: return <DpRequestDetailStep />;
            default: return <DpRequestSettingStep />;
        }
    };

    // 단계에 따라 컨텐츠 영역 padding 결정
    // Step 0 (설정) 은 자체 padding을 포함하므로 별도 패딩 불필요
    const contentPadding = currentStep === 0 ? '0' : '12px 16px 16px 16px';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <DataHeader title="DP의뢰서">
                {/* 중앙 스텝퍼 */}
                <div className="dp-stepper-compact">
                    {steps.map((step, idx) => (
                        <React.Fragment key={idx}>
                            <div 
                                className={`dp-step-compact ${idx === currentStep ? 'active' : ''} ${idx < currentStep ? 'done' : ''}`}
                                onClick={() => setCurrentStep(idx)}
                                style={{ cursor: 'pointer' }}
                                title={step.desc}
                            >
                                <div className="dp-step-num-compact">{idx + 1}</div>
                                <span>{step.label}</span>
                            </div>
                            {idx < steps.length - 1 && <div className={`dp-step-line-compact ${idx < currentStep ? 'done' : ''}`} />}
                        </React.Fragment>
                    ))}
                </div>

                {/* 우측 액션 버튼 */}
                <button
                    className="dp-primary-btn"
                    onClick={() => {
                        if (currentStep < steps.length - 1) setCurrentStep(prev => prev + 1);
                    }}
                >
                    <Save size={16} />
                    <span>저장 및 다음 단계로</span>
                    <ChevronRight size={16} />
                </button>
            </DataHeader>

            {/* 단계별 컨텐츠 영역 */}
            <div style={{ flex: 1, overflow: 'auto', padding: contentPadding, boxSizing: 'border-box' }}>
                {renderStepContent()}
            </div>
        </div>
    );
};

export default DpRequestPage;
