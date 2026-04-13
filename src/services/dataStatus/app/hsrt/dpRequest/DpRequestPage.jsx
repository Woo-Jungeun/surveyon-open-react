import React, { useState } from 'react';
import { Save } from 'lucide-react';
import DataHeader from "@/services/dataStatus/components/DataHeader";

// 단계별 컴포넌트 임포트 (DpRequest 접두어로 변경)
import DpRequestBannerStep from './steps/DpRequestBannerStep';
import DpRequestTableStep from './steps/DpRequestTableStep';
import DpRequestSummaryStep from './steps/DpRequestSummaryStep';
import DpRequestDetailStep from './steps/DpRequestDetailStep';
import DpRequestSettingStep from './steps/DpRequestSettingStep';

import '@/services/dataStatus/app/additional/AdditionalAnalysisPage.css';
import './DpRequestPage.css';

const DpRequestPage = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const steps = ['설정', '배너', '스터브', '요약표', '표 순서'];

    // 단계별 렌더링 매핑
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

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <DataHeader title="DP의뢰서">
                <div className="dp-stepper-compact">
                    {steps.map((step, idx) => (
                        <React.Fragment key={idx}>
                            <div 
                                className={`dp-step-compact ${idx === currentStep ? 'active' : ''}`}
                                onClick={() => setCurrentStep(idx)}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="dp-step-num-compact">{idx + 1}</div>
                                <span>{step}</span>
                            </div>
                            {idx < steps.length - 1 && <div className="dp-step-line-compact" />}
                        </React.Fragment>
                    ))}
                </div>
                <button className="dp-primary-btn" onClick={() => {
                    if (currentStep < steps.length - 1) setCurrentStep(prev => prev + 1);
                }}>
                    <Save size={16} /> 저장 및 다음 단계로
                </button>
            </DataHeader>

            <div style={{ flex: 1, overflow: 'auto' }}>
                {renderStepContent()}
            </div>
        </div>
    );
};

export default DpRequestPage;
