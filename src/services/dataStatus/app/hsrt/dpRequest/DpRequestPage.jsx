import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { Save, ChevronRight, Check, RotateCcw, Info } from 'lucide-react';
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
    const step4Ref = useRef(null);
    const step5Ref = useRef(null);

    // 더티 상태 관리
    const [unsaved, setUnsaved] = useState({ 'table': false, 'banner': false, 'recoded': false, 'summary': false, 'order': false });
    const markUnsaved = useCallback((key, v) => setUnsaved(prev => ({ ...prev, [key]: v })), []);

    // 공용 모달로 확인창 (취소 | 이동 | 저장 후 이동)
    const confirmNavigate = useCallback((message, canSave = true) => {
        return new Promise((resolve) => {
            modal.showConfirm("알림", message, {
                btns: [
                    { title: "취소", click: () => resolve("cancel") },
                    { title: "이동", click: () => resolve("go") },
                    // 저장 가능한 탭에서 노출
                    ...(canSave ? [{ title: "저장 후 이동", click: () => resolve("saveThenGo") }] : [])
                ],
            });
        });
    }, [modal]);

    // 명세서 기반 5단계 워크플로우 정의
    const steps = [
        { key: 'table', label: '표 설정', desc: '공통으로 적용될 프리셋(척도/그룹/순위)과 표 디자인, 가중치를 설정합니다.' },
        { key: 'banner', label: '배너', desc: '교차분석 시 테이블의 가로축(헤더) 기준이 될 배너 문항들을 설정합니다. (자동 배너 포함)' },
        { key: 'recoded', label: '스터브', desc: '문항들이 표에 나타날 순서와 보기의 세부 설정을 관리합니다. (추가된 문항, 배너, 요약표 모두 포함)' },
        { key: 'summary', label: '요약표', desc: '척도 문항이나 오픈 문항의 요약 데이터를 어떻게 보여줄지 설정합니다. (자동 생성 포함)' },
    ];

    // URL 파라미터 (dp_view)를 기준으로 현재 단계 결정
    const viewParam = searchParams.get('dp_view');
    const getInitialStep = () => {
        const idx = steps.findIndex(s => s.key === viewParam);
        return idx !== -1 ? idx : 0; // 명세대로 기본은 table(0)로 시작
    };

    const [activeTooltip, setActiveTooltip] = useState(null);
    const tooltipRefs = useRef([]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (activeTooltip !== null) {
                const activeRef = tooltipRefs.current[activeTooltip];
                if (activeRef && !activeRef.contains(event.target)) {
                    setActiveTooltip(null);
                }
            }
        };
        if (activeTooltip !== null) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [activeTooltip]);

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
                (currentKey === 'table' || currentKey === 'banner' || currentKey === 'recoded' || currentKey === 'summary' || currentKey === 'order')
            );

            if (action === "cancel") return;

            if (action === "saveThenGo") {
                let success = false;
                if (currentKey === 'table') success = await step1Ref.current?.save?.();
                else if (currentKey === 'banner') success = await step2Ref.current?.save?.();
                else if (currentKey === 'recoded') success = await step3Ref.current?.save?.();
                else if (currentKey === 'summary') success = await step4Ref.current?.save?.();
                else if (currentKey === 'order') success = await step5Ref.current?.save?.();

                if (success === false) return; // 저장 실패 시 이동 중단
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

    const fetchContext = useCallback(async () => {
        const pageId = sessionStorage.getItem('pageId');
        if (!pageId || !auth?.user?.userId) return;

        try {
            // 상단 헤더 데이터는 spinner 없이 자연스럽게 로드
            const result = await getDpContext.mutateAsync({ pageid: pageId, user: auth.user?.userId });
            if (result?.resultjson) setContextData(result.resultjson);
        } catch (err) {
            console.error("Context load failed:", err);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [auth?.user?.userId]);

    // --- 컨텍스트 조회 (카운트 및 완료 상태) ---
    useEffect(() => {
        fetchContext();

        const handlePageSelected = () => {
            fetchContext();
            setCurrentStep(0);
            setSearchParams(prev => {
                prev.set('dp_view', 'table');
                return prev;
            });
        };

        window.addEventListener("pageSelected", handlePageSelected);
        return () => window.removeEventListener("pageSelected", handlePageSelected);
    }, [currentStep, fetchContext, setSearchParams]);

    // 단계별 컴포넌트 렌더링
    const renderStepContent = () => {
        switch (currentStep) {
            case 0: return <DpRequestSettingStep ref={step1Ref} onUnsavedChange={(v) => markUnsaved('table', v)} />;
            case 1: return <DpRequestBannerStep ref={step2Ref} onUnsavedChange={(v) => markUnsaved('banner', v)} />;
            case 2: return <DpRequestTableStep ref={step3Ref} onUnsavedChange={(v) => markUnsaved('recoded', v)} onRefresh={fetchContext} />;
            case 3: return <DpRequestSummaryStep ref={step4Ref} onUnsavedChange={(v) => markUnsaved('summary', v)} />;
            case 4: return <DpRequestDetailStep ref={step5Ref} onUnsavedChange={(v) => markUnsaved('order', v)} />;
            default: return <DpRequestSettingStep />;
        }
    };

    // 단계에 따라 컨텐츠 영역 padding 결정
    // Step 0 (표 설정) 은 자체 padding을 포함하므로 별도 패딩 불필요
    const contentPadding = (currentStep === 0 || currentStep === 3) ? '0' : '12px 16px 16px 16px';

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

                        // 요약표 비활성화 조건: 스터브(recoded) 단계가 완료되지 않은 경우
                        const isDisabled = step.key === 'summary' && contextData?.steps?.recoded?.completed !== true;

                        return (
                            <React.Fragment key={idx}>
                                <div
                                    className={`dp-step-compact ${isActive ? 'active' : ''} ${isCompleted ? 'done' : ''}`}
                                    onClick={() => {
                                        if (isDisabled) {
                                            modal.showAlert('알림', '스터브 최초 저장 후 요약표를 설정할 수 있습니다.');
                                            return;
                                        }
                                        handleStepChange(idx);
                                    }}
                                    style={{ cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                                    title={isDisabled ? '스터브 최초 저장 후 이용 가능합니다.' : undefined}
                                >
                                    <div className="dp-step-num-compact" style={{ background: isDisabled ? '#cbd5e1' : undefined }}>
                                        {isCompleted && !isActive ? <Check size={12} strokeWidth={3} /> : idx + 1}
                                    </div>
                                    <div className="dp-step-label-group" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span className="dp-step-text" style={{ color: isDisabled ? '#94a3b8' : undefined }}>{step.label}</span>
                                        <div style={{ position: 'relative', display: 'flex' }} ref={el => tooltipRefs.current[idx] = el}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveTooltip(activeTooltip === idx ? null : idx);
                                                }}
                                                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: isDisabled ? '#94a3b8' : '#64748b', display: 'flex', outline: 'none' }}
                                                title="도움말 보기"
                                            >
                                                <Info size={14} />
                                            </button>
                                            {activeTooltip === idx && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '100%',
                                                    left: '50%',
                                                    transform: 'translateX(-50%)',
                                                    marginTop: '8px',
                                                    backgroundColor: '#ffffff',
                                                    border: '1px solid #cbd5e1',
                                                    borderRadius: '8px',
                                                    padding: '10px 14px',
                                                    width: 'max-content',
                                                    maxWidth: '280px',
                                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                                    zIndex: 1000,
                                                    fontSize: '12px',
                                                    color: '#334155',
                                                    lineHeight: '1.5',
                                                    fontWeight: 400,
                                                    whiteSpace: 'normal',
                                                    wordBreak: 'keep-all',
                                                    letterSpacing: '-0.3px',
                                                    textAlign: 'left',
                                                    cursor: 'default'
                                                }} onClick={(e) => e.stopPropagation()}>
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: '-6px',
                                                        left: '50%',
                                                        marginLeft: '-5px',
                                                        width: '10px',
                                                        height: '10px',
                                                        backgroundColor: '#ffffff',
                                                        borderTop: '1px solid #cbd5e1',
                                                        borderLeft: '1px solid #cbd5e1',
                                                        transform: 'rotate(45deg)'
                                                    }} />
                                                    <div style={{ position: 'relative', zIndex: 2 }}>
                                                        {step.desc}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
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
                        <>
                            {/* 
                            <button
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    background: '#fff', border: '1px solid #f59e0b', color: '#f59e0b',
                                    padding: '0 16px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                                    height: '36px'
                                }}
                                onClick={() => {
                                    modal.showConfirm('기본 재적용', '수정되지 않은 항목들을 최신 프리셋으로 일괄 재적용하시겠습니까?', {
                                        btns: [
                                            { title: '취소', click: () => { } },
                                            {
                                                title: '재적용', click: () => {
                                                    if (step3Ref.current && step3Ref.current.reapplyDefault) {
                                                        step3Ref.current.reapplyDefault();
                                                    }
                                                }
                                            }
                                        ]
                                    });
                                }}
                            >
                                <RotateCcw size={14} />
                                <span>기본 재적용</span>
                            </button>
                            */}
                            <button
                                className="data-header-btn"
                                style={{
                                    borderColor: '#fca5a5',
                                    color: '#ef4444',
                                    background: '#fff'
                                }}
                                title="스터브, 설정, 요약표가 모두 초기화되어 대시보드가 처음 상태로 재구성됩니다."
                                onClick={() => {
                                    modal.showConfirm('알림', 'DP의뢰서를 초기화하시겠습니까?\n"문항추가" 생성 문항 삭제 및 "스터브", "요약표" 설정이\n초기화되어, 대시보드가 처음 상태로 재구성됩니다.', {
                                        btns: [
                                            { title: '취소', click: () => { } },
                                            {
                                                title: '초기화', click: () => {
                                                    if (step3Ref.current && step3Ref.current.reset) {
                                                        step3Ref.current.reset();
                                                    }
                                                }
                                            }
                                        ]
                                    });
                                }}
                            >
                                <RotateCcw size={14} />
                                <span>DP의뢰서 초기화</span>
                            </button>
                        </>
                    )}
                    <button
                        className="data-header-btn data-header-btn-primary"
                        onClick={async () => {
                            const currentRef = currentStep === 0 ? step1Ref : currentStep === 1 ? step2Ref : currentStep === 2 ? step3Ref : currentStep === 3 ? step4Ref : currentStep === 4 ? step5Ref : null;
                            if (currentRef?.current?.save) {
                                const res = await currentRef.current.save();

                                if (res !== false) {
                                    // 저장 성공 시 컨텍스트 데이터 최신화 (완료 상태 및 카운트 갱신)
                                    await fetchContext();
                                }
                            }
                        }}
                    >
                        <Save size={16} />
                        <span>저장</span>
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
