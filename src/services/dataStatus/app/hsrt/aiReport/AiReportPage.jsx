import React, { useState, useEffect, useContext } from 'react';
import { Save, Sparkles, Check, RotateCcw, Loader2 } from 'lucide-react';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import DataHeader from "@/services/dataStatus/components/DataHeader";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import { modalContext } from "@/components/common/Modal.jsx";

import './AiReportPage.css';

const AiReportPage = () => {
    const loadingSpinner = useContext(loadingSpinnerContext);
    const modal = useContext(modalContext);

    const [currentStep, setCurrentStep] = useState(0);
    const [selectedModel, setSelectedModel] = useState("hrc-gemma4");

    // LLM Models list
    const models = [
        { text: "hrc-gemma4(무료)", value: "hrc-gemma4" },
        { text: "gpt-4o", value: "gpt-4o" },
        { text: "claude-3-5-sonnet", value: "claude-3-5-sonnet" }
    ];

    // Stepper definitions
    const steps = [
        { key: 'overview', label: '조사개요', desc: '조사의 명칭, 목표 대상, 표본 크기 및 주요 조사 목적을 정의합니다.' },
        { key: 'content', label: '조사내용', desc: '보고서 작성에 포함할 설문 문항 및 분석 변수들을 필터링합니다.' },
        { key: 'analysis', label: '최종분석', desc: '지정된 LLM 모델을 사용하여 종합 AI 요약 보고서를 생성 및 확인합니다.' }
    ];

    // Step 1: Survey Overview State (with Session presets)
    const [overviewData, setOverviewData] = useState({
        projectname: sessionStorage.getItem("projectname") || "신규 모바일 서비스 만족도 및 수요 조사",
        projectnum: sessionStorage.getItem("merge_pn") || sessionStorage.getItem("projectnum") || "P202607-004",
        period: "2026-07-20 ~ 2026-07-27",
        target: "전국 만 19세 ~ 59세 스마트폰 주 사용 고객",
        sampleSize: "1,000명",
        objectives: "신제품 모바일 앱 론칭을 앞두고 주요 기능(알림 피드, 개인화 추천)에 대한 사용자 선호도를 검증하며, 기존 서비스 대비 개선점을 수렴하여 핵심 프로덕트 고도화 전략의 기초 자료로 활용하고자 함."
    });

    // Step 2: Survey Variables Checklist State
    const [variables, setVariables] = useState([
        { id: 'gender', qnum: 'Q1', label: '귀하의 성별은 무엇입니까?', type: 'single', checked: true },
        { id: 'age', qnum: 'Q2', label: '귀하의 연령대는 어떻게 되십니까?', type: 'single', checked: true },
        { id: 'frequency', qnum: 'Q3', label: '평소 모바일 콘텐츠 서비스를 얼마나 자주 이용하십니까?', type: 'single', checked: true },
        { id: 'features', qnum: 'Q4', label: '다음 중 가장 유용하다고 느끼는 모바일 기능은 무엇입니까? (중복선택)', type: 'multi', checked: true },
        { id: 'satisfaction', qnum: 'Q5', label: '제공 예정인 신규 기능들의 전반적 만족도는 어떠십니까?', type: 'scale', checked: true },
        { id: 'recommend', qnum: 'Q6', label: '본 서비스를 주변인들에게 추천할 의향이 있으십니까? (10점 만점)', type: 'scale', checked: false },
        { id: 'improvement', qnum: 'Q7', label: '현재 이용하시는 서비스에서 보완이 필요하다고 느낀 사항을 자유롭게 적어주십시오.', type: 'open-text', checked: false }
    ]);

    // Step 3: AI Summary Generation States
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [reportGenerated, setReportGenerated] = useState(false);

    // Initial load checks
    useEffect(() => {
        // Look for cached data
        const cachedOverview = localStorage.getItem("ai_report_overview");
        if (cachedOverview) {
            try { setOverviewData(JSON.parse(cachedOverview)); } catch (e) { console.error(e); }
        }
        const cachedVars = localStorage.getItem("ai_report_variables");
        if (cachedVars) {
            try { setVariables(JSON.parse(cachedVars)); } catch (e) { console.error(e); }
        }
        const cachedReport = localStorage.getItem("ai_report_generated");
        if (cachedReport === "true") {
            setReportGenerated(true);
        }
    }, []);

    // Toggle variable selection
    const handleToggleVariable = (id) => {
        const updated = variables.map(v => v.id === id ? { ...v, checked: !v.checked } : v);
        setVariables(updated);
        localStorage.setItem("ai_report_variables", JSON.stringify(updated));
    };

    // Simulated Report Generation
    const handleGenerateReport = () => {
        setIsGenerating(true);
        setGenerationProgress(0);
        
        const interval = setInterval(() => {
            setGenerationProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setIsGenerating(false);
                    setReportGenerated(true);
                    localStorage.setItem("ai_report_generated", "true");
                    return 100;
                }
                return prev + 10;
            });
        }, 150);
    };

    // Save Page Data
    const handleSave = () => {
        loadingSpinner.show();
        setTimeout(() => {
            localStorage.setItem("ai_report_overview", JSON.stringify(overviewData));
            localStorage.setItem("ai_report_variables", JSON.stringify(variables));
            loadingSpinner.hide();
            modal.showAlert("알림", "AI 요약보고서 설정이 안전하게 저장되었습니다.");
        }, 500);
    };

    // Reset settings
    const handleReset = () => {
        modal.showConfirm("알림", "AI 요약보고서 설정을 초기화하시겠습니까?", {
            btns: [
                { title: "취소", click: () => { console.log('Reset cancelled'); } },
                {
                    title: "초기화",
                    click: () => {
                        localStorage.removeItem("ai_report_overview");
                        localStorage.removeItem("ai_report_variables");
                        localStorage.removeItem("ai_report_generated");
                        setOverviewData({
                            projectname: sessionStorage.getItem("projectname") || "신규 모바일 서비스 만족도 및 수요 조사",
                            projectnum: sessionStorage.getItem("merge_pn") || sessionStorage.getItem("projectnum") || "P202607-004",
                            period: "2026-07-20 ~ 2026-07-27",
                            target: "전국 만 19세 ~ 59세 스마트폰 주 사용 고객",
                            sampleSize: "1,000명",
                            objectives: "신제품 모바일 앱 론칭을 앞두고 주요 기능(알림 피드, 개인화 추천)에 대한 사용자 선호도를 검증하며, 기존 서비스 대비 개선점을 수렴하여 핵심 프로덕트 고도화 전략의 기초 자료로 활용하고자 함."
                        });
                        setVariables(variables.map(v => ({ ...v, checked: v.id !== 'recommend' && v.id !== 'improvement' })));
                        setReportGenerated(false);
                    }
                }
            ]
        });
    };

    const getBadgeStyle = (type) => {
        switch (type) {
            case 'single': return { background: '#fff7ed', color: '#c2410c', border: '1px solid #ffedd5' };
            case 'multi': return { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #dbeafe' };
            case 'scale': return { background: '#f0fdf4', color: '#15803d', border: '1px solid #dcfce7' };
            default: return { background: '#ecfeff', color: '#0e7490', border: '1px solid #cffafe' };
        }
    };

    // Render Steps content
    const renderContent = () => {
        switch (currentStep) {
            case 0: // 조사개요
                return (
                    <div className="ai-step-content-container">
                        <div className="ai-card">
                            <div className="ai-card-title">
                                <span>📋 조사 기본 정보</span>
                            </div>
                            <div className="ai-form-grid">
                                <div className="ai-form-field">
                                    <label className="ai-field-label">조사명 (Survey Title)</label>
                                    <input
                                        type="text"
                                        className="ai-field-input"
                                        value={overviewData.projectname}
                                        onChange={(e) => setOverviewData({ ...overviewData, projectname: e.target.value })}
                                    />
                                </div>
                                <div className="ai-form-field">
                                    <label className="ai-field-label">프로젝트 번호 (Project Code)</label>
                                    <input
                                        type="text"
                                        className="ai-field-input"
                                        value={overviewData.projectnum}
                                        disabled={true}
                                    />
                                </div>
                                <div className="ai-form-field">
                                    <label className="ai-field-label">조사 기간 (Survey Period)</label>
                                    <input
                                        type="text"
                                        className="ai-field-input"
                                        value={overviewData.period}
                                        onChange={(e) => setOverviewData({ ...overviewData, period: e.target.value })}
                                    />
                                </div>
                                <div className="ai-form-field">
                                    <label className="ai-field-label">샘플 사이즈 (Sample Size)</label>
                                    <input
                                        type="text"
                                        className="ai-field-input"
                                        value={overviewData.sampleSize}
                                        onChange={(e) => setOverviewData({ ...overviewData, sampleSize: e.target.value })}
                                    />
                                </div>
                                <div className="ai-form-field full-width">
                                    <label className="ai-field-label">대상 응답자 (Target Respondents)</label>
                                    <input
                                        type="text"
                                        className="ai-field-input"
                                        value={overviewData.target}
                                        onChange={(e) => setOverviewData({ ...overviewData, target: e.target.value })}
                                    />
                                </div>
                                <div className="ai-form-field full-width">
                                    <label className="ai-field-label">조사 목적 (Survey Objectives)</label>
                                    <textarea
                                        className="ai-field-textarea"
                                        value={overviewData.objectives}
                                        onChange={(e) => setOverviewData({ ...overviewData, objectives: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 1: // 조사내용
                return (
                    <div className="ai-step-content-container">
                        <div className="ai-card">
                            <div className="ai-card-title">
                                <span>✔ AI 분석 포함 문항 선택</span>
                            </div>
                            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '-10px', marginBottom: '20px' }}>
                                아래 체크 리스트 중 AI 요약보고서 생성에 포함할 설문 문항을 체크해 주십시오. (체크된 문항을 요약 분석에 사용합니다.)
                            </p>
                            <div className="ai-list-container">
                                {variables.map((item) => (
                                    <div
                                        key={item.id}
                                        className={`ai-list-item ${item.checked ? 'selected' : ''}`}
                                        onClick={() => handleToggleVariable(item.id)}
                                    >
                                        <div className="ai-checkbox">
                                            {item.checked && (
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12"></polyline>
                                                </svg>
                                            )}
                                        </div>
                                        <span className="ai-item-qnum">{item.qnum}</span>
                                        <span className="ai-item-label">{item.label}</span>
                                        <span className="ai-item-badge" style={getBadgeStyle(item.type)}>{item.type}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            case 2: // 최종분석
                return (
                    <div className="ai-step-content-container">
                        {!reportGenerated && !isGenerating && (
                            <div className="ai-report-generation-box">
                                <Sparkles size={48} color="#2563eb" style={{ marginBottom: '16px', opacity: 0.8 }} />
                                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                                    AI 요약보고서 생성 준비 완료
                                </h3>
                                <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '460px', lineHeight: 1.6, marginBottom: '24px' }}>
                                    설정된 조사개요와 <strong>{variables.filter(v => v.checked).length}개</strong>의 선택된 설문 데이터를 분석하여,<br />
                                    선택하신 <strong>{models.find(m => m.value === selectedModel)?.text}</strong> 모델로 최종 요약 보고서를 도출합니다.
                                </p>
                                <button className="ai-gen-btn" onClick={handleGenerateReport}>
                                    <Sparkles size={16} />
                                    <span>AI 요약보고서 생성하기</span>
                                </button>
                            </div>
                        )}

                        {isGenerating && (
                            <div className="ai-report-generation-box" style={{ gap: '16px' }}>
                                <Loader2 className="animate-spin" size={32} color="#2563eb" />
                                <div style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>
                                    보고서를 분석하고 요약하는 중...
                                </div>
                                <div style={{ width: '280px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', position: 'relative' }}>
                                    <div style={{ width: `${generationProgress}%`, height: '100%', background: '#2563eb', borderRadius: '3px', transition: 'width 0.2s ease' }} />
                                </div>
                                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>{generationProgress}%</span>
                            </div>
                        )}

                        {reportGenerated && !isGenerating && (
                            <div className="ai-report-view-wrapper">
                                <div className="ai-report-header">
                                    <div className="ai-report-title">📝 {overviewData.projectname} - AI 요약보고서</div>
                                    <div className="ai-report-meta">
                                        <span>🏷 프로젝트 코드: {overviewData.projectnum}</span>
                                        <span>📅 작성일: 2026-07-30</span>
                                        <span>🤖 분석 모델: {models.find(m => m.value === selectedModel)?.text}</span>
                                    </div>
                                </div>

                                <div className="ai-report-section">
                                    <div className="ai-section-title">📊 1. 핵심 요약 (Executive Summary)</div>
                                    <ul className="ai-bullet-list">
                                        <li className="ai-bullet-item">
                                            <strong>서비스 전반적 구매의향 긍정적:</strong> 만족도 척도 조사 결과 대다수의 응답자가 신제품 모바일 서비스 론칭에 높은 호감을 표현하고 있으며, 특히 알림 피드와 위젯 기능의 개인 맞춤화 실용성에 주목하고 있습니다.
                                        </li>
                                        <li className="ai-bullet-item">
                                            <strong>주요 타깃 고객 충성도:</strong> 모바일 앱 콘텐츠 다량 사용 고객(주 5회 이상 이용군)에서 만족 지수가 유의미하게 8.2점(10점 만점) 이상으로 높게 도출되어, 적극적 핵심 유저층으로의 초기 안착 가능성이 매우 높습니다.
                                        </li>
                                    </ul>
                                </div>

                                <div className="ai-report-section">
                                    <div className="ai-section-title">💡 2. 문항별 주요 분석 결과 (Key Findings)</div>
                                    <ul className="ai-bullet-list">
                                        {variables.filter(v => v.checked).map((v) => (
                                            <li key={v.id} className="ai-bullet-item">
                                                <strong>{v.qnum}. {v.label.replace(/\?.*/, '')}:</strong>
                                                {v.id === 'gender' && " 남성(48.5%)과 여성(51.5%)의 고른 성비 분포를 보여 성별에 따른 분석 편향이 존재하지 않는 균형 잡힌 표본이 확보되었습니다."}
                                                {v.id === 'age' && " 만 20대와 30대가 전체 표본의 62.4%를 차지하여, 모바일 환경에 친화적인 젊은 층의 관점이 주도적으로 반영되었습니다."}
                                                {v.id === 'frequency' && " 이용 빈도가 매일(68.2%) 혹은 주 3~4회(22.1%)인 충성 주간 사용자가 90%를 초과해, 피드백의 실효성과 정합성이 매우 높습니다."}
                                                {v.id === 'features' && " 개인화 추천 알고리즘과 알림 알림 피드 및 간편 로그인 순으로 핵심 핵심 기능 선호가 밀집되었습니다."}
                                                {v.id === 'satisfaction' && " 5점 척도 중 보통(3점) 이상 긍정 반응을 보인 비율이 78.4%로 도출되어 신제품에 대한 서비스 친밀감이 매우 양호합니다."}
                                                {v.id === 'recommend' && " 주변인 대상 추천 의향은 평균 7.9점으로 도출되어 전반적으로 긍정적인 브랜드 입소문 효과가 기대됩니다."}
                                                {v.id === 'improvement' && " 자유 응답 분석 결과, '초기 로딩 지연 개선', '다크 모드 가독성 확보', '메뉴 튜토리얼 스킵 제공'에 대한 보완 요구사항이 집중되었습니다."}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }} className="ai-report-container">
            <DataHeader title="AI 요약보고서">
                {/* 3단계 스텝퍼 */}
                <div className="ai-stepper-compact">
                    {steps.map((step, idx) => {
                        const isActive = idx === currentStep;
                        const isCompleted = idx < currentStep || (step.key === 'analysis' && reportGenerated);

                        return (
                            <React.Fragment key={idx}>
                                <div
                                    className={`ai-step-compact ${isActive ? 'active' : ''} ${isCompleted ? 'done' : ''}`}
                                    onClick={() => setCurrentStep(idx)}
                                >
                                    <div className="ai-step-num-compact">
                                        {isCompleted && !isActive ? <Check size={12} strokeWidth={3} /> : idx + 1}
                                    </div>
                                    <div className="ai-step-label-group">
                                        <span className="ai-step-text">{step.label}</span>
                                    </div>
                                </div>
                                {idx < steps.length - 1 && (
                                    <div className={`ai-step-line-compact ${isCompleted ? 'done' : ''}`} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* 우측 컨트롤 영역 */}
                <div className="ai-header-controls">
                    {currentStep === 2 && reportGenerated && (
                        <button
                            className="data-header-btn"
                            style={{
                                borderColor: '#fca5a5',
                                color: '#ef4444',
                                background: '#fff'
                            }}
                            onClick={handleReset}
                        >
                            <RotateCcw size={14} />
                            <span>분석 초기화</span>
                        </button>
                    )}

                    <div className="ai-model-select-group">
                        <span className="ai-model-label">분석 LLM 모델</span>
                        <div className="ai-dropdown-wrapper">
                            <DropDownList
                                data={models}
                                textField="text"
                                dataItemKey="value"
                                value={models.find(m => m.value === selectedModel) || models[0]}
                                onChange={(e) => setSelectedModel(e.value.value)}
                                style={{ width: '100%', height: '100%', fontSize: '13px', color: '#1e293b' }}
                            />
                        </div>
                    </div>

                    <button className="data-header-btn data-header-btn-primary" onClick={handleSave}>
                        <Save size={16} />
                        <span>저장</span>
                    </button>
                </div>
            </DataHeader>

            {/* 단계별 내용 */}
            <div style={{ flex: 1, overflow: 'auto', boxSizing: 'border-box' }}>
                {renderContent()}
            </div>
        </div>
    );
};

export default AiReportPage;
