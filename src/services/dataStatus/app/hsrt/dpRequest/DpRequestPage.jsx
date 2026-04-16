import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { Save, ChevronRight, Check, RotateCcw } from 'lucide-react';
import DataHeader from "@/services/dataStatus/components/DataHeader";
import { DpRequestPageApi } from './DpRequestPageApi';
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import { modalContext } from "@/components/common/Modal.jsx"; // 모달 컨텍스트 추가

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

    const modal = useContext(modalContext);
    const step1Ref = useRef(null);
    const step2Ref = useRef(null);
    const step3Ref = useRef(null);

    // 더티 상태 관리
    const [unsaved, setUnsaved] = useState({ 'table': false, 'banner': false, 'recoded': false });
    const markUnsaved = useCallback((key, v) => setUnsaved(prev => ({ ...prev, [key]: v })), []);

    // 공용 모달로 확인창 (취소 | 이동 | 저장 후 이동)
    const confirmNavigate = useCallback((message, canSave = true) => {
        return new Promise((resolve) => {
            modal.showConfirm("알림", message, {
                btns: [
                    { title: "취소", click: () => resolve("cancel") },
                    { title: "이동", click: () => resolve("go") },
                    // 저장 가능한 탭(1,2)에서만 노출
                    ...(canSave ? [{ title: "저장 후 이동", click: () => resolve("saveThenGo") }] : [])
                ],
            });
        });
    }, [modal]);

    // 명세서 기반 5단계 워크플로우 정의
    const steps = [
        { key: 'table', label: '설정', desc: '[표 설정] 가중치 변수, 숫자 표시 정책, 테마 색상과 프리셋을 구성하고 저장합니다.' },
        { key: 'banner', label: '배너', desc: '[배너 설정] 분석 테이블 상단에 기준이 되는 배너를 설정합니다.' },
        { key: 'recoded', label: '스터브', desc: '[스터브 설정] DP 표 생성을 위한 recoded 메타데이터 설정. 이 화면에서 설정한 내용이 저장 시 실제 recoded 변수 및 필터로 생성됩니다.' },
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
    const handleStepChange = async (idx) => {
        if (idx === currentStep) return;

        const currentKey = steps[currentStep].key;
        const isDirty = unsaved[currentKey];

        if (isDirty) {
            const action = await confirmNavigate(
                "저장하지 않은 변경 사항이 있습니다.\n이동하시겠습니까?",
                (currentKey === 'table' || currentKey === 'banner' || currentKey === 'recoded')
            );

            if (action === "cancel") return;

            if (action === "saveThenGo") {
                // 현재 스텝의 저장 함수 호출
                let success = false;
                if (currentKey === 'table') success = await step1Ref.current?.save?.();
                else if (currentKey === 'banner') success = await step2Ref.current?.save?.();
                else if (currentKey === 'recoded') success = await step3Ref.current?.save?.();

                if (!success) return; // 저장 실패 시 이동 중단
                setUnsaved(prev => ({ ...prev, [currentKey]: false }));
            } else if (action === "go") {
                // 변경 사항 무시하고 이동
                setUnsaved(prev => ({ ...prev, [currentKey]: false }));
            }
        }

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
            case 0: return <DpRequestSettingStep ref={step1Ref} onUnsavedChange={(v) => markUnsaved('table', v)} />;
            case 1: return <DpRequestBannerStep ref={step2Ref} onUnsavedChange={(v) => markUnsaved('banner', v)} />;
            case 2: return <DpRequestTableStep ref={step3Ref} onUnsavedChange={(v) => markUnsaved('recoded', v)} />;
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
                <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                    {currentStep === 2 && (
                        <button
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                background: '#fff', border: '1px solid #ef4444', color: '#ef4444',
                                padding: '0 16px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                                height: '36px'
                            }}
                            onClick={() => {
                                modal.showConfirm('초기화', '설정을 초기화하시겠습니까?', () => {
                                    if (step3Ref.current && step3Ref.current.reset) {
                                        step3Ref.current.reset();
                                    }
                                });
                            }}
                        >
                            <RotateCcw size={14} />
                            <span>초기화</span>
                        </button>
                    )}
                    <button
                        className="dp-primary-btn"
                        onClick={() => {
                            if (currentStep < steps.length - 1) handleStepChange(currentStep + 1);
                        }}
                        style={{ height: '36px' }}
                    >
                        <Save size={16} />
                        <span>저장 및 다음 단계로</span>
                        <ChevronRight size={16} />
                    </button>
                </div>
            </DataHeader>

            {/* 단계별 컨텐츠 영역 */}
            <div style={{ flex: 1, overflow: 'auto', padding: contentPadding, boxSizing: 'border-box' }}>
                {renderStepContent()}
            </div>
        </div>
    );
};

export default DpRequestPage;
