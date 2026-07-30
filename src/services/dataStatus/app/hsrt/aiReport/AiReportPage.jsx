import React, { useState, useEffect, useContext } from 'react';
import { useSelector } from 'react-redux';
import { 
    Save, Sparkles, Check, RotateCcw, Loader2, 
    Paperclip, X, Search, Plus, 
    Play, ArrowRight, ChevronDown, ChevronUp, 
    Filter, RefreshCw 
} from 'lucide-react';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import DataHeader from "@/services/dataStatus/components/DataHeader";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import { modalContext } from "@/components/common/Modal.jsx";
import { DpRequestPageApi } from "@/services/dataStatus/app/hsrt/dpRequest/DpRequestPageApi";

import './AiReportPage.css';

const AiReportPage = () => {
    const loadingSpinner = useContext(loadingSpinnerContext);
    const modal = useContext(modalContext);
    const auth = useSelector((store) => store.auth);
    const { getAiModels } = DpRequestPageApi();

    const [currentStep, setCurrentStep] = useState(0);
    const [selectedModel, setSelectedModel] = useState("");

    // LLM Models list
    const [models, setModels] = useState([]);

    useEffect(() => {
        const fetchModels = async () => {
            try {
                const res = await getAiModels.mutateAsync({ user: auth?.user?.userId || '' });
                if (String(res?.success) === '777' && Array.isArray(res?.resultjson)) {
                    const mapped = res.resultjson.map(m => ({ text: m.label, value: m.value }));
                    if (mapped.length > 0) {
                        setModels(mapped);
                        // set default selected model
                        const hasGemma = mapped.some(m => m.value.includes("gemma"));
                        if (hasGemma) {
                            setSelectedModel(mapped.find(m => m.value.includes("gemma")).value);
                        } else {
                            setSelectedModel(mapped[0].value);
                        }
                    }
                }
            } catch (e) {
                console.error("AI 모델 조회 오류:", e);
            }
        };
        fetchModels();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [auth?.user?.userId]);

    // Stepper definitions
    const steps = [
        { key: 'overview', label: '조사개요', desc: '조사의 명칭, 목표 대상, 표본 크기 및 주요 조사 목적을 정의합니다.' },
        { key: 'content', label: '조사내용', desc: '보고서 작성에 포함할 설문 문항 및 분석 변수들을 필터링합니다.' },
        { key: 'analysis', label: '최종분석', desc: '지정된 LLM 모델을 사용하여 종합 AI 요약 보고서를 생성 및 확인합니다.' }
    ];

    // Step 1: Survey Overview State
    const [fileAttached, setFileAttached] = useState(true);
    const [fileName, setFileName] = useState("설문온_월핏_공기청정기_기획안_최종.docx");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisProgress, setAnalysisProgress] = useState(0);
    
    const [overviewData, setOverviewData] = useState({
        projectname: sessionStorage.getItem("projectname") || "신규 월핏 공기청정기 평가 조사",
        method: "대면 심층 인터뷰 및 실물 시연 (3회 세션)",
        objectives: "소비자 의견을 수렴하여 향후 가전 신제품(월핏 공기청정기) 개발에 필요한 디자인·기능·가격·브랜드 인사이트를 확보하고, 제품 컨셉·스펙·가격·구매 의향을 정량·정성적으로 평가한다.",
        target: "공기청정기 구매 경험이 있거나 향후 1년 내 구매 의향이 있는 20세 이상 성인(남녀 구분 없음) 한국 거주자"
    });

    // Step 2: Survey Variables Checklist State
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState("전체 유형");
    const [questions, setQuestions] = useState([
        { id: 'q50_stub', qnum: 'SQ1', label: '다음 중 귀하나 가족 중 광고/리서치 회사에 종사하는 분이 계십니까?', group: 'SQ. 스크리닝 및 기본 고객 특성', type: 'SQ', subtype: 'single', viewCount: 6, checked: true },
        { id: 'q100_stub', qnum: 'SQ2', label: '귀하의 성별은 무엇입니까?', group: 'SQ. 스크리닝 및 기본 고객 특성', type: 'SQ', subtype: 'single', viewCount: 3, checked: true },
        { id: 'q150_stub', qnum: 'SQ3', label: '귀하의 연령대는 어떻게 되십니까?', group: 'SQ. 스크리닝 및 기본 고객 특성', type: 'SQ', subtype: 'single', viewCount: 5, checked: true },
        { id: 'q200_stub', qnum: 'SQ4', label: '최근 3개월 이내 휴대용 공기청정기를 직접 구매하거나 사용해 보신 적이 있습니까?', group: 'SQ. 스크리닝 및 기본 고객 특성', type: 'SQ', subtype: 'single', viewCount: 3, checked: true },
        { id: 'q250_stub', qnum: 'SQ5', label: '귀하가 주로 사용하는 공기청정기의 제품 이용 형태는 무엇입니까?', group: 'SQ. 스크리닝 및 기본 고객 특성', type: 'SQ', subtype: 'single', viewCount: 4, checked: true },
        { id: 'q300_stub', qnum: 'SQ6', label: '귀하가 현재 사용 중인 공기청정기 브랜드를 계속 유지하려는 이유는 무엇입니까?', group: 'SQ. 스크리닝 및 기본 고객 특성', type: 'SQ', subtype: 'rank', viewCount: 14, checked: true },
        { id: 'q300_stub_(1)', qnum: 'SQ6', label: '귀하가 현재 사용 중인 공기청정기 브랜드를 계속 유지하려는 이유는 무엇입니까? (1순위)', group: 'SQ. 스크리닝 및 기본 고객 특성', type: 'SQ', subtype: 'rank', viewCount: 15, checked: true },
        { id: 'q300_stub_(1+2)', qnum: 'SQ6', label: '귀하가 현재 사용 중인 공기청정기 브랜드를 계속 유지하려는 이유는 무엇입니까? (1+2순위)', group: 'SQ. 스크리닝 및 기본 고객 특성', type: 'SQ', subtype: 'rank', viewCount: 15, checked: true },
        { id: 'q300_stub_(1+2+3)', qnum: 'SQ6', label: '귀하가 현재 사용 중인 공기청정기 브랜드를 계속 유지하려는 이유는 무엇입니까? (1+2+3순위)', group: 'SQ. 스크리닝 및 기본 고객 특성', type: 'SQ', subtype: 'rank', viewCount: 15, checked: true },
        { id: 'q350_stub', qnum: 'SQ7', label: '귀하가 사용 중인 공기청정기의 주요 기능 중 가장 만족하는 기능은 무엇입니까?', group: 'SQ. 스크리닝 및 기본 고객 특성', type: 'SQ', subtype: 'single', viewCount: 103, checked: true },
        { id: 'q400_stub', qnum: 'SQ8', label: '귀하가 사용 중인 공기청정기의 크기나 가용 면적은 어떻게 됩니까?', group: 'SQ. 스크리닝 및 기본 고객 특성', type: 'SQ', subtype: 'single', viewCount: 6, checked: true },
        { id: 'q450_stub', qnum: 'SQ9', label: '귀하가 가입하신 공기청정기 렌탈/구매 상품의 요금제는 무엇입니까?', group: 'SQ. 스크리닝 및 기본 고객 특성', type: 'SQ', subtype: 'single', viewCount: 95, checked: true },
        { id: 'q500_stub', qnum: 'SQ10', label: '귀하가 가입하신 공기청정기 상품의 렌탈 요금제 유형은 무엇입니까?', group: 'SQ. 스크리닝 및 기본 고객 특성', type: 'SQ', subtype: 'single', viewCount: 7, checked: true },
    ]);

    // Right side Category settings
    const [categoryMode, setCategoryMode] = useState("ai"); // 'ai' or 'group'
    const [categories] = useState([
        { id: 1, title: '스크리닝·고객 특성', desc: '응답 표본의 인구통계·이용 경험 분포를 정의하는 기준 문항군.', count: 5, color: '#3b82f6' },
        { id: 2, title: '통신사 유지 인식', desc: '통신사 유지 이유의 우선순위가 전환 저항의 핵심 동인이다.', count: 4, color: '#a855f7' },
        { id: 3, title: '단말기·요금제 현황', desc: '현재 단말기·요금제 구성이 기기변경 니즈의 배경이 된다.', count: 4, color: '#6366f1' },
        { id: 4, title: '기기변경 여정·채널', desc: '정보 탐색 채널의 순서와 구매 채널 선택이 전환에 직접 영향을 준다.', count: 9, color: '#f97316' },
        { id: 5, title: 'TDS 전환 트리거', desc: '할인 쿠폰 안내·장단점 인식이 TDS 전환의 트리거로 작동한다.', count: 8, color: '#10b981' },
        { id: 6, title: 'TDS 구매 확신도', desc: '실납부 금액·혜택 요약의 명확성이 구매 확신을 좌우한다.', count: 7, color: '#f43f5e' },
        { id: 7, title: 'TDS 이탈·저해 요인', desc: '여정별 만족도 저하 지점이 이탈·채널 전환의 원인이다.', count: 10, color: '#14b8a6' },
    ]);

    // Step 3: Final Analysis state
    const [aiGuideline, setAiGuideline] = useState("백분율은 소수점 첫째 자리까지 표기하고, 집단 간 차이가 큰 항목을 우선 서술");
    const [pipelineStatus, setPipelineStatus] = useState({
        l1: { progress: 100, countText: "331 / 331 문항", isDone: true, isGenerating: false },
        l2: { progress: 100, countText: "9개 카테고리", isDone: true, isGenerating: false },
        l3: { progress: 100, countText: "보고서 추출 가능", isDone: true, isGenerating: false }
    });
    const [activeSubTab, setActiveSubTab] = useState("l1"); // 'l1', 'l2', 'l3'
    const [l1SearchQuery, setL1SearchQuery] = useState("");
    const [isL1CardExpanded, setIsL1CardExpanded] = useState(true);

    // Initial load checks
    useEffect(() => {
        const cachedOverview = localStorage.getItem("ai_report_overview_v2");
        if (cachedOverview) {
            try { setOverviewData(JSON.parse(cachedOverview)); } catch (e) { console.error(e); }
        }
        const cachedGuideline = localStorage.getItem("ai_report_guideline");
        if (cachedGuideline) {
            setAiGuideline(cachedGuideline);
        }
    }, []);

    // Toggle variable selection
    const handleToggleQuestion = (id) => {
        const updated = questions.map(q => q.id === id ? { ...q, checked: !q.checked } : q);
        setQuestions(updated);
    };

    const handleSelectAllQuestions = (checked) => {
        const updated = questions.map(q => ({ ...q, checked }));
        setQuestions(updated);
    };

    // Simulated Overview File analysis start
    const handleStartAnalysisFile = () => {
        if (!fileAttached) {
            modal.showAlert("알림", "설문지 파일을 첨부해 주세요.");
            return;
        }
        setIsAnalyzing(true);
        setAnalysisProgress(0);
        const interval = setInterval(() => {
            setAnalysisProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setIsAnalyzing(false);
                    modal.showAlert("알림", "워드 설문지 분석 완료! 프로젝트 정보가 아래와 같이 자동 업데이트되었습니다.");
                    setOverviewData({
                        projectname: "신규 월핏 공기청정기 평가 조사",
                        method: "대면 심층 인터뷰 및 실물 시연 (3회 세션)",
                        objectives: "소비자 의견을 수렴하여 향후 가전 신제품(월핏 공기청정기) 개발에 필요한 디자인·기능·가격·브랜드 인사이트를 확보하고, 제품 컨셉·스펙·가격·구매 의향을 정량·정성적으로 평가한다.",
                        target: "공기청정기 구매 경험이 있거나 향후 1년 내 구매 의향이 있는 20세 이상 성인(남녀 구분 없음) 한국 거주자"
                    });
                    return 100;
                }
                return prev + 20;
            });
        }, 150);
    };

    // Simulated pipeline generation triggers
    const triggerPipelineRegenerate = (level) => {
        setPipelineStatus(prev => ({
            ...prev,
            [level]: { ...prev[level], isGenerating: true, progress: 0 }
        }));
        
        let prog = 0;
        const interval = setInterval(() => {
            prog += 20;
            setPipelineStatus(prev => ({
                ...prev,
                [level]: { ...prev[level], progress: prog }
            }));
            if (prog >= 100) {
                clearInterval(interval);
                setPipelineStatus(prev => ({
                    ...prev,
                    [level]: { ...prev[level], isGenerating: false, isDone: true, progress: 100 }
                }));
                modal.showAlert("알림", `${level.toUpperCase()} 분석 재생성이 성공적으로 완료되었습니다.`);
            }
        }, 200);
    };

    // Save Page Data
    const handleSave = () => {
        loadingSpinner.show();
        setTimeout(() => {
            localStorage.setItem("ai_report_overview_v2", JSON.stringify(overviewData));
            localStorage.setItem("ai_report_guideline", aiGuideline);
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
                        localStorage.removeItem("ai_report_overview_v2");
                        localStorage.removeItem("ai_report_guideline");
                        setOverviewData({
                            projectname: "신규 월핏 공기청정기 평가 조사",
                            method: "대면 심층 인터뷰 및 실물 시연 (3회 세션)",
                            objectives: "소비자 의견을 수렴하여 향후 가전 신제품(월핏 공기청정기) 개발에 필요한 디자인·기능·가격·브랜드 인사이트를 확보하고, 제품 컨셉·스펙·가격·구매 의향을 정량·정성적으로 평가한다.",
                            target: "공기청정기 구매 경험이 있거나 향후 1년 내 구매 의향이 있는 20세 이상 성인(남녀 구분 없음) 한국 거주자"
                        });
                        setAiGuideline("백분율은 소수점 첫째 자리까지 표기하고, 집단 간 차이가 큰 항목을 우선 서술");
                        setFileAttached(true);
                        setFileName("설문온_월핏_공기청정기_기획안_최종.docx");
                        modal.showAlert("알림", "초기화 완료되었습니다.");
                    }
                }
            ]
        });
    };

    const handleAddCategory = () => {
        modal.showAlert("알림", "새 카테고리 추가 기능이 활성화되었습니다. (시뮬레이션)");
    };

    // Render Steps content
    const renderContent = () => {
        switch (currentStep) {
            case 0: // 조사개요
                return (
                    <div className="ai-step-content-container">
                        {/* STEP 1: 원본 워드 설문지 첨부 */}
                        <div className="ai-card">
                            <div className="ai-step-badge-tag">STEP 1</div>
                            <span className="ai-step-badge-title">원본 워드 설문지 첨부</span>
                            <span className="ai-step-badge-desc">.docx / 최대 20MB · 분석 후 자동 폐기</span>
                            
                            <div className="ai-upload-row">
                                <button className="ai-upload-btn" onClick={() => {
                                    setFileAttached(true);
                                    setFileName("설문온_월핏_공기청정기_기획안_최종.docx");
                                }}>
                                    <Paperclip size={14} />
                                    <span>설문지 첨부</span>
                                </button>

                                {fileAttached ? (
                                    <div className="ai-attached-file-chip">
                                        <span className="ai-file-type-badge">DOCX</span>
                                        <span className="ai-attached-file-name">{fileName}</span>
                                        <button className="ai-file-delete-btn" onClick={() => setFileAttached(false)}>
                                            <X size={12} />
                                        </button>
                                    </div>
                                ) : (
                                    <span className="ai-no-file-text">첨부된 파일이 없습니다.</span>
                                )}
                            </div>

                            <div className="ai-info-box-row">
                                <div className="ai-info-icon-text">
                                    <Sparkles size={14} className="ai-spark-yellow" />
                                    <span>파일 첨부 후 분석을 실행하면 아래 프로젝트 정보가 자동 추출됩니다.</span>
                                </div>
                                <div className="ai-info-actions">
                                    <button className="ai-info-reset-btn" onClick={() => setFileAttached(false)}>초기화</button>
                                    <button className="ai-info-start-btn" onClick={handleStartAnalysisFile} disabled={isAnalyzing}>
                                        {isAnalyzing ? (
                                            <>
                                                <Loader2 className="animate-spin" size={14} />
                                                <span>분석 중... ({analysisProgress}%)</span>
                                            </>
                                        ) : (
                                            <>
                                                <Play size={12} fill="white" />
                                                <span>분석 시작</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* STEP 2: 프로젝트 정보 */}
                        <div className="ai-card" style={{ marginTop: '20px' }}>
                            <div className="ai-step-badge-tag blue">STEP 2</div>
                            <span className="ai-step-badge-title">프로젝트 정보</span>
                            <span className="ai-step-badge-desc">병합 결과에서 자동 추출됩니다 · 직접 수정 가능</span>

                            <div className="ai-form-grid" style={{ marginTop: '20px' }}>
                                <div className="ai-form-field">
                                    <label className="ai-field-label">프로젝트명 <span className="ai-required">*</span></label>
                                    <input
                                        type="text"
                                        className="ai-field-input"
                                        value={overviewData.projectname}
                                        onChange={(e) => setOverviewData({ ...overviewData, projectname: e.target.value })}
                                    />
                                </div>
                                <div className="ai-form-field">
                                    <label className="ai-field-label">조사 방법</label>
                                    <input
                                        type="text"
                                        className="ai-field-input"
                                        value={overviewData.method}
                                        onChange={(e) => setOverviewData({ ...overviewData, method: e.target.value })}
                                    />
                                </div>
                                <div className="ai-form-field full-width">
                                    <label className="ai-field-label">조사 배경 및 목적</label>
                                    <textarea
                                        className="ai-field-textarea"
                                        value={overviewData.objectives}
                                        onChange={(e) => setOverviewData({ ...overviewData, objectives: e.target.value })}
                                        style={{ minHeight: '80px' }}
                                    />
                                </div>
                                <div className="ai-form-field full-width">
                                    <label className="ai-field-label">조사 대상 (모집단)</label>
                                    <textarea
                                        className="ai-field-textarea"
                                        value={overviewData.target}
                                        onChange={(e) => setOverviewData({ ...overviewData, target: e.target.value })}
                                        style={{ minHeight: '80px' }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 1: // 조사내용
                return (
                    <div className="ai-step-content-container ai-split-layout">
                        {/* Left: 문항 목록 */}
                        <div className="ai-card ai-left-column">
                            <div className="ai-card-title-row">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className="ai-panel-icon">📝</span>
                                    <span className="ai-panel-title">문항 목록</span>
                                    <span className="ai-panel-help-icon">?</span>
                                </div>
                                <span className="ai-panel-total">전체 47문항</span>
                            </div>

                            <div className="ai-filter-search-row">
                                <div className="ai-search-wrapper">
                                    <Search size={14} className="ai-search-icon" />
                                    <input
                                        type="text"
                                        className="ai-search-input"
                                        placeholder="문항 번호 또는 텍스트 검색"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <div className="ai-dropdown-small">
                                    <DropDownList
                                        data={["전체 유형", "Single", "Multi", "Rank", "Open"]}
                                        value={typeFilter}
                                        onChange={(e) => setTypeFilter(e.value)}
                                        style={{ height: '32px', fontSize: '12px' }}
                                    />
                                </div>
                            </div>

                            <div className="ai-group-chips-row">
                                <span className="ai-chips-label">설문지 그룹</span>
                                <div className="ai-chip active">SQ <span className="chip-count">13</span></div>
                                <div className="ai-chip">P1 <span className="chip-count">9</span></div>
                                <div className="ai-chip">P2 <span className="chip-count">17</span></div>
                                <div className="ai-chip">P3 <span className="chip-count">8</span></div>
                            </div>

                            {/* Questions checklist table */}
                            <div className="ai-question-table-wrap">
                                <div className="ai-table-header">
                                    <div className="ai-th-col select-col">
                                        <input 
                                            type="checkbox"
                                            checked={questions.every(q => q.checked)}
                                            onChange={(e) => handleSelectAllQuestions(e.target.checked)}
                                        />
                                    </div>
                                    <div className="ai-th-col group-header-col">
                                        <ChevronDown size={14} style={{ marginRight: '6px' }} />
                                        <span>SQ. 스크리닝 및 기본 고객 특성</span>
                                        <span className="ai-group-badge">13문항</span>
                                    </div>
                                </div>

                                <div className="ai-table-body">
                                    {questions
                                        .filter(q => searchQuery === "" || q.label.includes(searchQuery) || q.qnum.includes(searchQuery))
                                        .map((q) => (
                                            <div 
                                                key={q.id} 
                                                className={`ai-table-row ${q.checked ? 'selected' : ''}`}
                                                onClick={() => handleToggleQuestion(q.id)}
                                            >
                                                <div className="ai-td select-col" onClick={(e) => e.stopPropagation()}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={q.checked}
                                                        onChange={() => handleToggleQuestion(q.id)}
                                                    />
                                                </div>
                                                <div className="ai-td id-col">
                                                    <span className="ai-q-id-badge">{q.id}</span>
                                                </div>
                                                <div className="ai-td label-col">
                                                    <span className="ai-q-num-label">{q.qnum}.</span>
                                                    <span className="ai-q-text-label">{q.label}</span>
                                                </div>
                                                <div className="ai-td type-col">
                                                    <span className="ai-type-badge-mini">{q.type}</span>
                                                </div>
                                                <div className="ai-td subtype-col">
                                                    <span className="ai-subtype-text">{q.subtype}</span>
                                                </div>
                                                <div className="ai-td view-col">
                                                    <span className="ai-view-link">보기 {q.viewCount}</span>
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        </div>

                        {/* Right: 생성된 카테고리 */}
                        <div className="ai-card ai-right-column">
                            <div className="ai-card-title-row">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className="ai-panel-icon">⚙</span>
                                    <span className="ai-panel-title">생성된 카테고리</span>
                                    <span className="ai-category-badge-count">{categories.length}</span>
                                </div>
                                <button className="ai-add-category-btn" onClick={handleAddCategory}>
                                    <Plus size={14} />
                                    <span>추가</span>
                                </button>
                            </div>

                            {/* Toggle tab buttons */}
                            <div className="ai-category-toggle-tabs">
                                <button 
                                    className={`ai-toggle-tab ${categoryMode === 'ai' ? 'active' : ''}`}
                                    onClick={() => setCategoryMode('ai')}
                                >
                                    <Sparkles size={13} />
                                    <span>AI 자동 분류</span>
                                </button>
                                <button 
                                    className={`ai-toggle-tab ${categoryMode === 'group' ? 'active' : ''}`}
                                    onClick={() => setCategoryMode('group')}
                                >
                                    <span>⚡ 설문지 그룹화</span>
                                </button>
                            </div>

                            {/* Category Cards List */}
                            <div className="ai-category-cards-container">
                                {categories.map((cat) => (
                                    <div key={cat.id} className="ai-category-card" style={{ borderLeftColor: cat.color }}>
                                        <div className="ai-cat-card-left">
                                            <h4 className="ai-cat-card-title">{cat.title}</h4>
                                            <p className="ai-cat-card-desc">{cat.desc}</p>
                                        </div>
                                        <div className="ai-cat-card-right">
                                            <span className="ai-cat-card-count">{cat.count}문항</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            case 2: // 최종분석
                return (
                    <div className="ai-step-content-container" style={{ gap: '20px' }}>
                        {/* AI 요약 생성 지침 */}
                        <div className="ai-card">
                            <div className="ai-guideline-header">
                                <Sparkles size={16} className="ai-spark-yellow" />
                                <span className="ai-guideline-title">AI 요약 생성 지침</span>
                                <span className="ai-panel-help-icon">?</span>
                                <button className="ai-guideline-preset-btn">선택</button>
                            </div>
                            <input 
                                type="text"
                                className="ai-guideline-input"
                                value={aiGuideline}
                                onChange={(e) => setAiGuideline(e.target.value)}
                                placeholder="예: 백분율은 소수점 첫째 자리까지 표기하고, 집단 간 차이가 큰 항목을 우선 서술"
                            />
                        </div>

                        {/* 분석 파이프라인 */}
                        <div className="ai-pipeline-section">
                            <h3 className="ai-section-main-title">분석 파이프라인 <span className="ai-panel-help-icon">?</span></h3>
                            
                            <div className="ai-pipeline-grid">
                                {/* Card 1 */}
                                <div className="ai-pipeline-card">
                                    <div className="ai-pipe-header">
                                        <div className="ai-pipe-level-badge level1">L1</div>
                                        <span className="ai-pipe-title">문항별 인사이트 분석</span>
                                        <span className="ai-panel-help-icon">?</span>
                                    </div>
                                    <div className="ai-pipe-status-row">
                                        <div className="ai-pipe-done-icon">
                                            <Check size={12} strokeWidth={3} />
                                        </div>
                                        <span className="ai-pipe-status-text">생성 완료 · {pipelineStatus.l1.countText}</span>
                                    </div>
                                    <div className="ai-pipe-progress-container">
                                        <div className="ai-pipe-progress-bar">
                                            <div className="ai-pipe-progress-fill l1" style={{ width: `${pipelineStatus.l1.progress}%` }}></div>
                                        </div>
                                        <span className="ai-pipe-percent-label">{pipelineStatus.l1.progress}%</span>
                                    </div>
                                    <button 
                                        className="ai-pipe-action-btn l1-btn"
                                        onClick={() => triggerPipelineRegenerate('l1')}
                                        disabled={pipelineStatus.l1.isGenerating}
                                    >
                                        {pipelineStatus.l1.isGenerating ? "분석 중..." : "문항별 인사이트 재생성"}
                                    </button>
                                </div>

                                <div className="ai-pipeline-arrow">
                                    <ArrowRight size={20} color="#94a3b8" />
                                </div>

                                {/* Card 2 */}
                                <div className="ai-pipeline-card">
                                    <div className="ai-pipe-header">
                                        <div className="ai-pipe-level-badge level2">L2</div>
                                        <span className="ai-pipe-title">조사내용별 분석</span>
                                        <span className="ai-panel-help-icon">?</span>
                                    </div>
                                    <div className="ai-pipe-status-row">
                                        <div className="ai-pipe-done-icon">
                                            <Check size={12} strokeWidth={3} />
                                        </div>
                                        <span className="ai-pipe-status-text">생성 완료 · {pipelineStatus.l2.countText}</span>
                                    </div>
                                    <div className="ai-pipe-progress-container" style={{ visibility: 'hidden' }}>
                                        <div className="ai-pipe-progress-bar">
                                            <div className="ai-pipe-progress-fill" style={{ width: '100%' }}></div>
                                        </div>
                                        <span>100%</span>
                                    </div>
                                    <button 
                                        className="ai-pipe-action-btn l2-btn"
                                        onClick={() => triggerPipelineRegenerate('l2')}
                                        disabled={pipelineStatus.l2.isGenerating}
                                    >
                                        {pipelineStatus.l2.isGenerating ? "분석 중..." : "조사내용별 재생성"}
                                    </button>
                                </div>

                                <div className="ai-pipeline-arrow">
                                    <ArrowRight size={20} color="#94a3b8" />
                                </div>

                                {/* Card 3 */}
                                <div className="ai-pipeline-card">
                                    <div className="ai-pipe-header">
                                        <div className="ai-pipe-level-badge level3">L3</div>
                                        <span className="ai-pipe-title">종합 요약 보고서</span>
                                        <span className="ai-panel-help-icon">?</span>
                                    </div>
                                    <div className="ai-pipe-status-row">
                                        <div className="ai-pipe-done-icon green">
                                            <Check size={12} strokeWidth={3} />
                                        </div>
                                        <span className="ai-pipe-status-text font-green">생성 완료 · {pipelineStatus.l3.countText}</span>
                                    </div>
                                    <div className="ai-pipe-progress-container" style={{ visibility: 'hidden' }}>
                                        <div className="ai-pipe-progress-bar">
                                            <div className="ai-pipe-progress-fill" style={{ width: '100%' }}></div>
                                        </div>
                                        <span>100%</span>
                                    </div>
                                    <button 
                                        className="ai-pipe-action-btn l3-btn"
                                        onClick={() => triggerPipelineRegenerate('l3')}
                                        disabled={pipelineStatus.l3.isGenerating}
                                    >
                                        {pipelineStatus.l3.isGenerating ? "분석 중..." : "종합 보고서 재생성"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Report list detail section */}
                        <div className="ai-report-detail-card">
                            {/* Tabs row */}
                            <div className="ai-detail-tabs-row">
                                <div className="ai-detail-tabs">
                                    <button 
                                        className={`ai-detail-tab ${activeSubTab === 'l1' ? 'active' : ''}`}
                                        onClick={() => setActiveSubTab('l1')}
                                    >
                                        <div className="tab-dot blue"></div>
                                        <span>L1 문항별 인사이트</span>
                                    </button>
                                    <button 
                                        className={`ai-detail-tab ${activeSubTab === 'l2' ? 'active' : ''}`}
                                        onClick={() => setActiveSubTab('l2')}
                                    >
                                        <div className="tab-dot green"></div>
                                        <span>L2 조사내용별 분석</span>
                                    </button>
                                    <button 
                                        className={`ai-detail-tab ${activeSubTab === 'l3' ? 'active' : ''}`}
                                        onClick={() => setActiveSubTab('l3')}
                                    >
                                        <div className="tab-dot green"></div>
                                        <span>L3 종합 요약 보고서</span>
                                    </button>
                                </div>

                                <div className="ai-detail-actions">
                                    <span className="ai-detail-status-count">요약 완료 <strong>331 / 331 문항</strong></span>
                                    
                                    <div className="ai-detail-search-wrap">
                                        <Search size={13} className="ai-detail-search-icon" />
                                        <input 
                                            type="text" 
                                            className="ai-detail-search-input" 
                                            placeholder="문항 ID 또는 이름 검색"
                                            value={l1SearchQuery}
                                            onChange={(e) => setL1SearchQuery(e.target.value)}
                                        />
                                    </div>

                                    <button className="ai-icon-btn"><Filter size={13} /></button>
                                    <button className="ai-xlsx-btn">
                                        <span>XLSX</span>
                                    </button>
                                    <button className="ai-icon-btn"><RefreshCw size={13} /></button>
                                </div>
                            </div>

                            {/* Report content blocks */}
                            <div className="ai-report-blocks-wrap">
                                {activeSubTab === 'l1' ? (
                                    <div className="ai-block-card">
                                        {/* Card Header Accordion style */}
                                        <div className="ai-block-header" onClick={() => setIsL1CardExpanded(!isL1CardExpanded)}>
                                            <div className="ai-block-header-left">
                                                <span className="ai-block-q-id">q100_stub</span>
                                                <h4 className="ai-block-q-title">PQ2. 참여 세션 구분</h4>
                                                <span className="ai-block-done-badge">요약 완료</span>
                                            </div>
                                            <div className="ai-block-header-right">
                                                {isL1CardExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </div>
                                        </div>

                                        {/* Card Body */}
                                        {isL1CardExpanded && (
                                            <div className="ai-block-body">
                                                {/* Bullet 1: 정당 집계 요약 */}
                                                <div className="ai-insight-bullet">
                                                    <div className="ai-bullet-title-row">
                                                        <span className="ai-bullet-num-badge">1</span>
                                                        <span className="ai-bullet-title-text">정당 집계 요약</span>
                                                        <span className="ai-panel-help-icon">?</span>
                                                    </div>
                                                    <p className="ai-bullet-body-content">
                                                        연령 및 라이프스테이지별로 응답 세션의 편차가 존재하며, 특히 공기청정기 미사용자와 교체/추가 구매자 간의 세션 분포 격차가 뚜렷함. 제품 선호도 및 CMF 비교 데이터는 특정 세션과 사용자 특성에 따라 분산되어 나타남
                                                    </p>
                                                </div>

                                                {/* Bullet 2: 응답자 특성 요약 */}
                                                <div className="ai-insight-bullet" style={{ marginTop: '16px' }}>
                                                    <div className="ai-bullet-title-row">
                                                        <span className="ai-bullet-num-badge">2</span>
                                                        <span className="ai-bullet-title-text">응답자 특성 요약</span>
                                                        <span className="ai-panel-help-icon">?</span>
                                                    </div>
                                                    <div className="ai-insight-result-box">
                                                        <span className="ai-result-purple-chip">연령(세대)(G1)</span>
                                                        <p className="ai-result-text">
                                                            <strong>41.7% (30대)</strong> vs 16.7% (20대) / 25.0p.p 격차 30대 집단에서 2세션 응답률이 가장 높게 나타나며, 20대 집단은 3세션 응답률이 100%로 집중됨
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="ai-block-empty-state">
                                        <span>선택한 레벨({activeSubTab.toUpperCase()})의 리포트 조회가 활성화되었습니다.</span>
                                    </div>
                                )}
                            </div>
                        </div>
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
                        const isCompleted = idx < currentStep || (step.key === 'analysis' && pipelineStatus.l3.isDone);

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
                    {currentStep === 2 && pipelineStatus.l3.isDone && (
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
