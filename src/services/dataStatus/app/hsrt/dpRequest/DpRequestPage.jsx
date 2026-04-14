import React, { useState, useEffect, useContext } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { Save, ChevronRight, Check } from 'lucide-react';
import DataHeader from "@/services/dataStatus/components/DataHeader";
import { DpRequestPageApi } from './DpRequestPageApi';
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";

// 단계별 컴포넌트 임포트
import DpRequestSettingStep from './steps/DpRequestSettingStep';   // Step 1: table
import DpRequestBannerStep from './steps/DpRequestBannerStep';     // Step 2: banner
import DpRequestTableStep from './steps/DpRequestTableStep';       // Step 3: recoded
import DpRequestSummaryStep from './steps/DpRequestSummaryStep';   // Step 4: summary
import DpRequestDetailStep from './steps/DpRequestDetailStep';     // Step 5: order

import '@/services/dataStatus/app/additional/AdditionalAnalysisPage.css';
import './DpRequestPage.css';

const DpRequestPage = () => {
    const auth = useSelector((store) => store.auth);
    const [searchParams, setSearchParams] = useSearchParams();
    const loadingSpinner = useContext(loadingSpinnerContext);
    const { getDpContext } = DpRequestPageApi();

    // 명세서 기반 5단계 워크플로우 정의
    const steps = [
        { key: 'table', label: '설정', desc: '' },
        { key: 'banner', label: '배너', desc: '분석 테이블 상단에 기준이 되는 배너를 설정합니다.' },
        { key: 'recoded', label: '스터브', desc: '' },
        { key: 'summary', label: '요약표', desc: '' },
        { key: 'order', label: '표 순서', desc: '' },
    ];

    // URL 파라미터 (dp_view)를 기준으로 현재 단계 결정
    const viewParam = searchParams.get('dp_view');
    const getInitialStep = () => {
        const idx = steps.findIndex(s => s.key === viewParam);
        return idx !== -1 ? idx : 0; // 명세대로 기본은 table(0)로 시작
    };

    const [currentStep, setCurrentStep] = useState(getInitialStep());
    const [contextData, setContextData] = useState(null);

    // URL 파라미터 변경 감지 및 동기화
    useEffect(() => {
        const idx = steps.findIndex(s => s.key === viewParam);
        if (idx !== -1 && idx !== currentStep) {
            setCurrentStep(idx);
        }
    }, [viewParam]);

    // 단계 변경 핸들러 (파라미터 업데이트 포함)
    const handleStepChange = (idx) => {
        const step = steps[idx];
        if (step) {
            setSearchParams(prev => {
                prev.set('dp_view', step.key);
                return prev;
            });
            setCurrentStep(idx);
        }
    };

    // --- 컨텍스트 조회 (카운트 및 완료 상태) ---
    useEffect(() => {
        const fetchContext = async () => {
            const pageId = sessionStorage.getItem('pageId');
            if (!pageId || !auth?.user?.userId) return;

            try {
                // 상단 헤더 데이터는 spinner 없이 자연스럽게 로드 (선택 사항)
                const result = await getDpContext.mutateAsync({ pageid: pageId, user: auth.user?.userId });
                if (result?.resultjson) setContextData(result.resultjson);
            } catch (err) {
                console.error("Context load failed:", err);
            }
        };

        fetchContext();
    }, [currentStep, auth?.user?.userId]);

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
                    {steps.map((step, idx) => {
                        const stepInfo = contextData?.steps?.[step.key];
                        const isCompleted = stepInfo?.completed;
                        const count = stepInfo?.count || 0;
                        const isActive = idx === currentStep;

                        return (
                            <React.Fragment key={idx}>
                                <div
                                    className={`dp-step-compact ${isActive ? 'active' : ''} ${isCompleted ? 'done' : ''}`}
                                    onClick={() => handleStepChange(idx)}
                                    style={{ cursor: 'pointer' }}
                                    title={step.desc}
                                >
                                    <div className="dp-step-num-compact">
                                        {isCompleted && !isActive ? <Check size={12} strokeWidth={3} /> : idx + 1}
                                    </div>
                                    <div className="dp-step-label-group">
                                        <span className="dp-step-text">{step.label}</span>
                                        {count > 0 && <span className="dp-step-count">{count}</span>}
                                    </div>
                                </div>
                                {idx < steps.length - 1 && (
                                    <div className={`dp-step-line-compact ${isCompleted || idx < currentStep ? 'done' : ''}`} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* 우측 액션 버튼 */}
                <button
                    className="dp-primary-btn"
                    onClick={() => {
                        if (currentStep < steps.length - 1) handleStepChange(currentStep + 1);
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
