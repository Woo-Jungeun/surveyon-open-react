import React, { useState, useEffect, useContext, useRef } from 'react';
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
    const { getAiModels, getAiSummaryData, uploadQuestionnaire, getUploadProgress } = DpRequestPageApi();
    const fileInputRef = useRef(null);

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

    const [overviewData, setOverviewData] = useState({
        projectname: sessionStorage.getItem("projectname") || "",
        method: "",
        objectives: "",
        target: ""
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
    const [fileAttached, setFileAttached] = useState(false);
    const [fileName, setFileName] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);
    const [pollingIntervalId, setPollingIntervalId] = useState(null);
    const [pollingInfo, setPollingInfo] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisProgress, setAnalysisProgress] = useState(0);

    const [categoryMode, setCategoryMode] = useState("ai"); // 'ai' or 'group'
    const [categories, setCategories] = useState([
        { id: 1, title: '스크리닝·고객 특성', desc: '응답 표본의 인구통계·이용 경험 분포를 정의하는 기준 문항군.', count: 5, color: '#3b82f6' },
        { id: 2, title: '통신사 유지 인식', desc: '통신사 유지 이유의 우선순위가 전환 저항의 핵심 동인이다.', count: 4, color: '#a855f7' },
        { id: 3, title: '단말기·요금제 현황', desc: '현재 단말기·요금제 구성이 기기변경 니즈의 배경이 된다.', count: 4, color: '#6366f1' },
        { id: 4, title: '기기변경 여정·채널', desc: '정보 탐색 채널의 순서와 구매 채널 선택이 전환에 직접 영향을 준다.', count: 9, color: '#f97316' },
        { id: 5, title: 'TDS 전환 트리거', desc: '할인 쿠폰 안내·장단점 인식이 TDS 전환의 트리거로 작동한다.', count: 8, color: '#10b981' },
        { id: 6, title: 'TDS 구매 확신도', desc: '실납부 금액·혜택 요약의 명확성이 구매 확신을 좌우한다.', count: 7, color: '#f43f5e' },
        { id: 7, title: 'TDS 이탈·저해 요인', desc: '여정별 만족도 저하 지점이 이탈·채널 전환의 원인이다.', count: 10, color: '#14b8a6' },
    ]);

    // Fallback Mock data definitions
    const defaultL1 = {
        "q100_stub": {
            "fact_summary": "연령 및 라이프스테이지별로 응답 세션의 편차가 존재하며, 특히 공기청정기 미사용자와 교체/추가 구매자 간의 세션 분포 격차가 뚜렷함. 제품 선호도 및 CMF 비교 데이터는 특정 세션과 사용자 특성에 따라 분산되어 나타남",
            "segment_insights": "세그먼트 간 응답 차이가 뚜렷하게 관찰되며, 일부 기능에 대한 선호 편차가 나타남",
            "respondent_characteristics": "연령(세대)(G1) 41.7% (30대) vs 16.7% (20대) / 25.0p.p 격차 30대 집단에서 2세션 응답률이 가장 높게 나타나며, 20대 집단은 3세션 응답률이 100%로 집중됨"
        }
    };

    const defaultL2 = [
        {
            "category_name": "스크리닝·고객 특성",
            "insights": {
                "core_finding": "30대 기혼 가구의 휴대용 공기청정기 구매 비중이 가장 높으며, 주요 구매 채널은 온라인 쇼핑몰로 집계됨",
                "hypothesis_result": "연령대별 구매 채널 분포 가설(30대 온라인 집중)이 95% 신뢰수준에서 통계적으로 유의미하게 지지됨",
                "so_what": "30대 기혼 타겟을 대상으로 모바일 혜택 강조 및 온라인 특가 패키지 프로모션을 우선적으로 집중 전개할 필요가 있음"
            }
        }
    ];

    const defaultL3 = {
        "executive_summary": "본 조사는 신규 출시 예정인 월핏 공기청정기의 제품 만족도 및 속성 평가를 목표로 수행되었습니다. 분석 결과 30대 핵심 실사용자 층에서 공기청정 성능과 소음 항목에 대한 높은 선호도가 관측되었습니다. 다만 가격 저항선이 다소 보수적으로 형성되어 있어 렌탈 및 장기 할부 모델 위주의 상품 구성이 필요할 것으로 판단됩니다.",
        "strategic_recommendations": [
            "1. 공기 청정 필터 성능 중심의 디지털 콘텐츠 캠페인 구성",
            "2. 초기 구매 장벽 완화를 위한 렌탈 전용 라인업 기획",
            "3. 오프라인 시연 존 확대를 통한 고객 실제 체감 경험 강화"
        ]
    };

    // Step 3: Final Analysis state
    const [aiGuideline, setAiGuideline] = useState("백분율은 소수점 첫째 자리까지 표기하고, 집단 간 차이가 큰 항목을 우선 서술");
    const [pipelineStatus, setPipelineStatus] = useState({
        l1: { progress: 100, countText: "331 / 331 문항", isDone: true, isGenerating: false },
        l2: { progress: 100, countText: "9개 카테고리", isDone: true, isGenerating: false },
        l3: { progress: 100, countText: "보고서 추출 가능", isDone: true, isGenerating: false }
    });
    const [activeSubTab, setActiveSubTab] = useState("l1"); // 'l1', 'l2', 'l3'
    const [l1SearchQuery, setL1SearchQuery] = useState("");
    const [expandedL1Cards, setExpandedL1Cards] = useState({ q100_stub: true });

    const [insightData, setInsightData] = useState({
        l1: defaultL1,
        l2: defaultL2,
        l3: defaultL3
    });

    // Cleanup polling interval on unmount
    useEffect(() => {
        return () => {
            if (pollingIntervalId) {
                clearInterval(pollingIntervalId);
            }
        };
    }, [pollingIntervalId]);

    const loadSummaryData = async () => {
        const pageId = sessionStorage.getItem("pageId") || "3fa85f64-5717-4562-b3fc-2c963f66afa6";
        const userId = auth?.user?.userId || "jewoo";
        try {
            const res = await getAiSummaryData.mutateAsync({ pageId, user: userId });
            if (String(res?.success) === '777' && res?.resultjson) {
                const item = res.resultjson;

                let parsedVariablesData = {};
                let parsedAnalysisFrame = {};
                let parsedInsightData = {};

                const variablesDataRaw = item.variablesData || item.VariablesData;
                const analysisFrameRaw = item.analysisFrame || item.AnalysisFrame;
                const insightDataRaw = item.insightData || item.InsightData;
                const statusVal = item.status || item.Status;

                try {
                    if (variablesDataRaw) {
                        parsedVariablesData = typeof variablesDataRaw === 'string' ? JSON.parse(variablesDataRaw) : variablesDataRaw;
                    }
                } catch (e) { console.error("Error parsing variablesData:", e); }

                try {
                    if (analysisFrameRaw) {
                        parsedAnalysisFrame = typeof analysisFrameRaw === 'string' ? JSON.parse(analysisFrameRaw) : analysisFrameRaw;
                    }
                } catch (e) { console.error("Error parsing analysisFrame:", e); }

                try {
                    if (insightDataRaw) {
                        parsedInsightData = typeof insightDataRaw === 'string' ? JSON.parse(insightDataRaw) : insightDataRaw;
                    }
                } catch (e) { console.error("Error parsing insightData:", e); }

                // 1. Step 1: Overview
                if (parsedVariablesData.project_info) {
                    const pi = parsedVariablesData.project_info;
                    setOverviewData({
                        projectname: pi.projectName || pi.projectname || sessionStorage.getItem("projectname") || "조사명 없음",
                        method: pi.method || "",
                        objectives: pi.research_purpose || pi.objectives || "",
                        target: pi.target_population || pi.target || ""
                    });
                }

                // 2. Step 1: Questions
                let finalQuestionsLength = 47;
                if (parsedVariablesData.variables) {
                    const variablesList = Array.isArray(parsedVariablesData.variables)
                        ? parsedVariablesData.variables
                        : Object.values(parsedVariablesData.variables);
                    if (variablesList.length > 0) {
                        const mappedQuestions = variablesList.map((v, vIdx) => ({
                            id: v.VarId || v.Qnum || `var_${vIdx}`,
                            qnum: v.Qnum || '',
                            label: v.Qtext || v.Label || '',
                            group: v.SectionName || '기타',
                            type: v.Qtype || v.Type || 'SQ',
                            subtype: v.Qsubtype || 'single',
                            viewCount: v.Options?.length || 0,
                            checked: true
                        }));
                        setQuestions(mappedQuestions);
                        finalQuestionsLength = mappedQuestions.length;
                    }
                }

                // 3. Step 2: Categories
                let finalCategoriesLength = 7;
                if (parsedAnalysisFrame.categories) {
                    const mappedCategories = (parsedAnalysisFrame.categories || []).map((cat, idx) => ({
                        id: idx + 1,
                        title: cat.category_name || '',
                        desc: cat.hypothesis || '가설 검증 및 문항 분석',
                        count: cat.qnums?.length || 0,
                        color: ['#3b82f6', '#a855f7', '#6366f1', '#f97316', '#10b981', '#f43f5e', '#14b8a6'][idx % 7]
                    }));
                    setCategories(mappedCategories);
                    finalCategoriesLength = mappedCategories.length;
                }

                // 4. Step 3: InsightData L1 / L2 / L3
                setInsightData({
                    l1: parsedInsightData.l1 || defaultL1,
                    l2: parsedInsightData.l2 || defaultL2,
                    l3: parsedInsightData.l3 || defaultL3
                });

                // Update pipeline status
                if (statusVal === 'completed' || statusVal === 'COMPLETED') {
                    setPipelineStatus({
                        l1: { progress: 100, countText: `${finalQuestionsLength}개 문항`, isDone: true, isGenerating: false },
                        l2: { progress: 100, countText: `${finalCategoriesLength}개 카테고리`, isDone: true, isGenerating: false },
                        l3: { progress: 100, countText: "보고서 추출 가능", isDone: true, isGenerating: false }
                    });
                }
            }
        } catch (err) {
            console.error("Failed to load existing AI summary data:", err);
        }
    };
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



        loadSummaryData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [auth?.user?.userId]);
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
    // Real survey document upload and poll progress
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setFileName(file.name);
            setFileAttached(true);
        }
    };

    const handleStartAnalysisFile = async () => {
        if (!fileAttached || !selectedFile) {
            modal.showAlert("알림", "설문지 파일을 첨부해 주세요.");
            return;
        }

        setIsAnalyzing(true);
        setAnalysisProgress(0);

        // Start the progress display immediately
        setPollingInfo({
            status: "PROCESSING",
            progress: 0,
            elapsed_time_seconds: 0,
            current_step_index: 0,
            step_info: { description: "설문지 업로드 및 분석 준비 중..." }
        });

        const pageId = sessionStorage.getItem("pageId") || "3fa85f64-5717-4562-b3fc-2c963f66afa6";
        const pn = sessionStorage.getItem("pn") || sessionStorage.getItem("Pn") || "P001234";
        const userId = auth?.user?.userId || "jewoo";

        const formData = new FormData();
        formData.append("pageId", pageId);
        formData.append("Pn", pn);
        formData.append("User", userId);
        formData.append("ModelType", selectedModel || "llm-gpt-oss-120b");
        formData.append("DocumentFile", selectedFile);

        let secondsElapsed = 0;

        // 1. Start polling immediately
        const intervalId = setInterval(async () => {
            secondsElapsed += 2;
            try {
                const progressRes = await getUploadProgress.mutateAsync({ pageId, user: userId });
                if (String(progressRes?.success) === '777' && progressRes?.resultjson) {
                    const currentProgress = progressRes.resultjson;

                    if (currentProgress.elapsedSeconds !== undefined) {
                        currentProgress.elapsed_time_seconds = currentProgress.elapsedSeconds;
                    }
                    if (currentProgress.elapsed_time_seconds === undefined || currentProgress.elapsed_time_seconds === null) {
                        currentProgress.elapsed_time_seconds = secondsElapsed;
                    }

                    if (currentProgress.progressPercentage !== undefined) {
                        currentProgress.progress = currentProgress.progressPercentage;
                    }

                    if (currentProgress.stepIndex !== undefined) {
                        currentProgress.current_step_index = currentProgress.stepIndex;
                    }

                    if (currentProgress.stepDescription || currentProgress.stepName) {
                        currentProgress.step_info = {
                            description: currentProgress.stepDescription || currentProgress.stepName
                        };
                    }

                    // Construct 4 steps dynamically
                    if (!currentProgress.steps && currentProgress.stepIndex !== undefined) {
                        const stepNamesList = [
                            "1단계: 설문지 텍스트 파싱",
                            "2단계: AI 구조 및 모집단 분석",
                            "3단계: 3단 변수 병합 처리",
                            "4단계: 분석 프레임 구성"
                        ];
                        currentProgress.steps = stepNamesList.map((label, sIdx) => {
                            let stepStatus = "pending";
                            if (currentProgress.stepIndex > sIdx) {
                                stepStatus = "completed";
                            } else if (currentProgress.stepIndex === sIdx) {
                                stepStatus = (currentProgress.progressPercentage === 100 || currentProgress.status === "COMPLETED" || currentProgress.isCompleted === true) ? "completed" : "processing";
                            }
                            return {
                                step: sIdx + 1,
                                label: label,
                                status: stepStatus
                            };
                        });
                        currentProgress.total_steps = 4;
                    }

                    setPollingInfo(currentProgress);
                    setAnalysisProgress(currentProgress.progress);

                    if (currentProgress.progress === 100 || currentProgress.status === 'COMPLETED' || currentProgress.status === 'completed' || currentProgress.isCompleted === true) {
                        clearInterval(intervalId);
                        if (currentProgress.result) {
                            handleAnalysisComplete(currentProgress.result);
                        }
                        await loadSummaryData();
                        setIsAnalyzing(false);
                    } else if (currentProgress.status === 'FAILED' || currentProgress.status === 'failed') {
                        clearInterval(intervalId);
                        setIsAnalyzing(false);
                        modal.showAlert("오류", "설문 구조 분석에 실패하였습니다. 다시 시도해주세요.");
                    }
                }
            } catch (pollErr) {
                console.error("Failed to poll upload progress:", pollErr);
            }
        }, 2000);

        setPollingIntervalId(intervalId);

        // 2. Start file upload asynchronously in the background
        uploadQuestionnaire.mutateAsync(formData)
            .then((res) => {
                if (String(res?.success) !== '777') {
                    clearInterval(intervalId);
                    setIsAnalyzing(false);
                    modal.showAlert("오류", res?.message || "파일 업로드에 실패하였습니다.");
                }
            })
            .catch((err) => {
                clearInterval(intervalId);
                setIsAnalyzing(false);
                console.error("Failed to upload questionnaire:", err);
                modal.showAlert("오류", "서버 통신 실패 또는 잘못된 파일 형식입니다.");
            });
    };

    // Callback when upload/analysis completes successfully
    const handleAnalysisComplete = (result) => {
        modal.showAlert("알림", "워드 설문지 분석 완료! 프로젝트 정보 및 문항 정보가 자동 업데이트되었습니다.");

        const projectInfo = result?.project_info || result?.projectInfo || result?.ProjectInfo;
        if (projectInfo) {
            const pi = projectInfo;
            setOverviewData({
                projectname: pi.projectName || pi.projectname || "",
                method: pi.method || "",
                objectives: pi.research_purpose || pi.objectives || "",
                target: pi.target_population || pi.target || ""
            });
        }

        const variablesRaw = result?.variables || result?.Variables;
        if (variablesRaw) {
            const variablesList = Array.isArray(variablesRaw)
                ? variablesRaw
                : Object.values(variablesRaw);
            if (variablesList.length > 0) {
                const mappedQuestions = variablesList.map((v, vIdx) => ({
                    id: v.VarId || v.Qnum || `var_${vIdx}`,
                    qnum: v.Qnum || '',
                    label: v.Qtext || v.Label || '',
                    group: v.SectionName || '기타',
                    type: v.Qtype || v.Type || 'SQ',
                    subtype: v.Qsubtype || 'single',
                    viewCount: v.Options?.length || 0,
                    checked: true
                }));
                setQuestions(mappedQuestions);
            }
        }
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
                            projectname: sessionStorage.getItem("projectname") || "",
                            method: "",
                            objectives: "",
                            target: ""
                        });
                        setAiGuideline("");
                        setFileAttached(false);
                        setFileName("");
                        setSelectedFile(null);
                        setPollingInfo(null);
                        if (pollingIntervalId) clearInterval(pollingIntervalId);
                        if (fileInputRef.current) fileInputRef.current.value = "";
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
                        <div className="ai-card" style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                                <div>
                                    <div className="ai-step-badge-tag blue">STEP 1</div>
                                    <span className="ai-step-badge-title">원본 워드 설문지 첨부</span>
                                    <span className="ai-step-badge-desc">.docx / 최대 20MB · 분석 후 자동 폐기</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontWeight: 500 }}>
                                    <span style={{ fontSize: '12px' }}>💡 파일 첨부 후 병합을 실행하면 아래 프로젝트 정보가 자동 추출됩니다.</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, marginRight: '16px' }}>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept=".docx,.doc"
                                        style={{ display: 'none' }}
                                    />
                                    <button className="ai-upload-btn" onClick={() => fileInputRef.current?.click()} style={{ padding: '6px 12px', fontSize: '12.5px', height: '32px' }}>
                                        <Paperclip size={13} />
                                        <span>설문지 첨부</span>
                                    </button>

                                    {fileAttached ? (
                                        <div className="ai-attached-file-chip" style={{ padding: '3px 8px', borderRadius: '4px', gap: '6px', height: '32px' }}>
                                            <span className="ai-attached-file-name" style={{ fontSize: '12.5px' }}>{fileName}</span>
                                            <button className="ai-file-delete-btn" onClick={() => {
                                                setFileAttached(false);
                                                setFileName("");
                                                setSelectedFile(null);
                                                setPollingInfo(null);
                                                if (pollingIntervalId) clearInterval(pollingIntervalId);
                                                if (fileInputRef.current) fileInputRef.current.value = "";
                                            }}>
                                                <X size={10} />
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="ai-no-file-text" style={{ fontSize: '12.5px' }}>첨부된 파일이 없습니다. 설문지 파일을 첨부해 주세요.</span>
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                    <button className="ai-info-reset-btn" onClick={handleReset} style={{ padding: '6px 12px', fontSize: '12.5px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>초기화</button>
                                    <button className="ai-info-start-btn" onClick={handleStartAnalysisFile} disabled={isAnalyzing} style={{ padding: '6px 12px', fontSize: '12.5px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                        {isAnalyzing ? (
                                            <>
                                                <Loader2 className="animate-spin" size={13} />
                                                <span>분석 중... ({analysisProgress}%)</span>
                                            </>
                                        ) : (
                                            <>
                                                <Play size={10} fill="white" />
                                                <span>분석 시작</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* 설문 구조 분석 · 3단 변수 병합 진행 상황 (STEP 1 내부 영역으로 통합) */}
                            {isAnalyzing && pollingInfo && (
                                <div style={{
                                    marginTop: '16px',
                                    border: '1px solid #e2e8f0',
                                    background: '#f1f5f9',
                                    padding: '16px',
                                    borderRadius: '8px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {pollingInfo.status === 'completed' || pollingInfo.progress === 100 ? (
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px', borderRadius: '50%', background: '#10b981', color: '#fff' }}>
                                                    <Check size={9} strokeWidth={3} />
                                                </div>
                                            ) : (
                                                <Loader2 className="animate-spin" size={14} color="#2f5597" />
                                            )}
                                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                                                설문 구조 분석 · 3단 변수 병합 진행 중
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>
                                            ⏱ {(() => {
                                                const sec = pollingInfo.elapsed_time_seconds || 0;
                                                const mm = String(Math.floor(sec / 60)).padStart(2, '0');
                                                const ss = String(sec % 60).padStart(2, '0');
                                                return `${mm}:${ss}`;
                                            })()}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', padding: '0 10px', position: 'relative' }}>
                                        <div style={{ position: 'absolute', top: '13px', left: '40px', right: '40px', height: '2px', background: '#e2e8f0', zIndex: 1 }}></div>
                                        <div style={{
                                            position: 'absolute',
                                            top: '13px',
                                            left: '40px',
                                            width: `${Math.min(100, Math.max(0, (pollingInfo.current_step_index / (pollingInfo.total_steps - 1)) * 100))}%`,
                                            height: '2px',
                                            background: '#4f46e5',
                                            zIndex: 1,
                                            transition: 'width 0.4s ease'
                                        }}></div>

                                        {(pollingInfo.steps || [
                                            { step: 1, label: "1단계: 설문지 분석", status: "pending" },
                                            { step: 2, label: "2단계: 조사개요 분석", status: "pending" },
                                            { step: 3, label: "3단계: 3단 변수 병합 처리", status: "pending" },
                                            { step: 4, label: "4단계: 분석 프레임 구성", status: "pending" }
                                        ]).map((stepItem, sIdx) => {
                                            const isStepCompleted = stepItem.status === 'completed';
                                            const isStepProcessing = stepItem.status === 'processing';
                                            const labelText = stepItem.label && stepItem.label.includes(':')
                                                ? stepItem.label.split(':')[1].trim()
                                                : (stepItem.label || '');

                                            return (
                                                <div key={sIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, width: '80px' }}>
                                                    <div style={{
                                                        width: '24px',
                                                        height: '24px',
                                                        borderRadius: '50%',
                                                        background: isStepCompleted ? '#10b981' : (isStepProcessing ? '#3b82f6' : '#ffffff'),
                                                        border: isStepCompleted ? 'none' : (isStepProcessing ? '2px solid #3b82f6' : '2px solid #cbd5e1'),
                                                        color: isStepCompleted ? '#ffffff' : (isStepProcessing ? '#ffffff' : '#64748b'),
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '11px',
                                                        fontWeight: 600,
                                                        boxShadow: isStepProcessing ? '0 0 0 2px rgba(59, 130, 246, 0.15)' : 'none',
                                                        transition: 'all 0.3s ease'
                                                    }}>
                                                        {isStepCompleted ? <Check size={10} strokeWidth={3} /> : stepItem.step}
                                                    </div>
                                                    <span style={{
                                                        fontSize: '10px',
                                                        fontWeight: isStepProcessing ? 600 : 500,
                                                        color: isStepProcessing ? '#1e2b4f' : (isStepCompleted ? '#475569' : '#94a3b8'),
                                                        marginTop: '5px',
                                                        textAlign: 'center',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {labelText}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', fontSize: '11.5px' }}>
                                            <span style={{ fontWeight: 500, color: '#475569' }}>
                                                {pollingInfo.step_info?.description || '설문지 분석 중...'}
                                            </span>
                                            <span style={{ fontWeight: 600, color: '#2f5597' }}>
                                                {pollingInfo.progress}%
                                            </span>
                                        </div>
                                        <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                                            <div style={{
                                                width: `${pollingInfo.progress}%`,
                                                height: '100%',
                                                background: 'linear-gradient(90deg, #3b82f6, #6366f1)',
                                                borderRadius: '2px',
                                                transition: 'width 0.4s ease'
                                            }}></div>
                                        </div>
                                    </div>
                                </div>
                            )}
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
                                        placeholder="프로젝트명을 입력하거나 설문지 파일을 첨부해 주세요."
                                        onChange={(e) => setOverviewData({ ...overviewData, projectname: e.target.value })}
                                    />
                                </div>
                                <div className="ai-form-field">
                                    <label className="ai-field-label">조사 방법</label>
                                    <input
                                        type="text"
                                        className="ai-field-input"
                                        value={overviewData.method}
                                        placeholder="조사 방법을 입력해 주세요. (예: 모바일 Web 조사)"
                                        onChange={(e) => setOverviewData({ ...overviewData, method: e.target.value })}
                                    />
                                </div>
                                <div className="ai-form-field full-width">
                                    <label className="ai-field-label">조사 배경 및 목적</label>
                                    <textarea
                                        className="ai-field-textarea"
                                        value={overviewData.objectives}
                                        placeholder="조사 배경 및 목적을 입력해 주세요."
                                        onChange={(e) => setOverviewData({ ...overviewData, objectives: e.target.value })}
                                        style={{ minHeight: '80px' }}
                                    />
                                </div>
                                <div className="ai-form-field full-width">
                                    <label className="ai-field-label">조사 대상 (모집단)</label>
                                    <textarea
                                        className="ai-field-textarea"
                                        value={overviewData.target}
                                        placeholder="조사 대상(모집단) 및 선정 조건 등을 입력해 주세요."
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
                                    <span className="ai-detail-status-count">요약 완료 <strong>{Object.keys(insightData.l1 || {}).length} / {questions.length} 문항</strong></span>

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
                                {activeSubTab === 'l1' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {Object.keys(insightData.l1 || {}).length === 0 ? (
                                            <div className="ai-block-empty-state">
                                                <span>조회된 L1 문항별 인사이트가 없습니다.</span>
                                            </div>
                                        ) : (
                                            Object.keys(insightData.l1 || {}).map((qKey) => {
                                                const l1Val = insightData.l1[qKey];
                                                const matchingQ = questions.find(q => q.id === qKey || q.qnum === qKey);
                                                const qTitle = matchingQ ? `${matchingQ.qnum}. ${matchingQ.label}` : qKey;

                                                if (l1SearchQuery && !qKey.toLowerCase().includes(l1SearchQuery.toLowerCase()) && !qTitle.toLowerCase().includes(l1SearchQuery.toLowerCase())) {
                                                    return null;
                                                }

                                                const isExpanded = !!expandedL1Cards[qKey];

                                                return (
                                                    <div className="ai-block-card" key={qKey}>
                                                        <div className="ai-block-header" onClick={() => {
                                                            setExpandedL1Cards(prev => ({ ...prev, [qKey]: !prev[qKey] }));
                                                        }}>
                                                            <div className="ai-block-header-left">
                                                                <span className="ai-block-q-id">{qKey}</span>
                                                                <h4 className="ai-block-q-title">{qTitle}</h4>
                                                                <span className="ai-block-done-badge">요약 완료</span>
                                                            </div>
                                                            <div className="ai-block-header-right">
                                                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                            </div>
                                                        </div>

                                                        {isExpanded && (
                                                            <div className="ai-block-body">
                                                                {l1Val.fact_summary && (
                                                                    <div className="ai-insight-bullet">
                                                                        <div className="ai-bullet-title-row">
                                                                            <span className="ai-bullet-num-badge">1</span>
                                                                            <span className="ai-bullet-title-text">정량 집계 요약</span>
                                                                            <span className="ai-panel-help-icon">?</span>
                                                                        </div>
                                                                        <p className="ai-bullet-body-content">
                                                                            {l1Val.fact_summary}
                                                                        </p>
                                                                    </div>
                                                                )}

                                                                {l1Val.segment_insights && (
                                                                    <div className="ai-insight-bullet" style={{ marginTop: '16px' }}>
                                                                        <div className="ai-bullet-title-row">
                                                                            <span className="ai-bullet-num-badge">2</span>
                                                                            <span className="ai-bullet-title-text">세그먼트 특징 요약</span>
                                                                            <span className="ai-panel-help-icon">?</span>
                                                                        </div>
                                                                        <p className="ai-bullet-body-content">
                                                                            {l1Val.segment_insights}
                                                                        </p>
                                                                    </div>
                                                                )}

                                                                {l1Val.respondent_characteristics && (
                                                                    <div className="ai-insight-bullet" style={{ marginTop: '16px' }}>
                                                                        <div className="ai-bullet-title-row">
                                                                            <span className="ai-bullet-num-badge">{l1Val.segment_insights ? '3' : '2'}</span>
                                                                            <span className="ai-bullet-title-text">응답자 특성 요약</span>
                                                                            <span className="ai-panel-help-icon">?</span>
                                                                        </div>
                                                                        <div className="ai-insight-result-box">
                                                                            <span className="ai-result-purple-chip">집단 분석 결과</span>
                                                                            <p className="ai-result-text">
                                                                                {l1Val.respondent_characteristics}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                )}

                                {activeSubTab === 'l2' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {(!insightData.l2 || insightData.l2.length === 0) ? (
                                            <div className="ai-block-empty-state">
                                                <span>조회된 L2 조사내용별 분석결과가 없습니다.</span>
                                            </div>
                                        ) : (
                                            insightData.l2.map((catItem, idx) => (
                                                <div className="ai-block-card" key={idx}>
                                                    <div className="ai-block-header">
                                                        <div className="ai-block-header-left">
                                                            <span className="ai-block-q-id" style={{ background: '#ecfdf5', color: '#059669', padding: '2px 8px' }}>L2 Category</span>
                                                            <h4 className="ai-block-q-title">{catItem.category_name}</h4>
                                                            <span className="ai-block-done-badge" style={{ background: '#ecfdf5', color: '#059669' }}>분석 완료</span>
                                                        </div>
                                                    </div>
                                                    <div className="ai-block-body">
                                                        {catItem.insights?.core_finding && (
                                                            <div className="ai-insight-bullet">
                                                                <div className="ai-bullet-title-row">
                                                                    <span className="ai-bullet-num-badge" style={{ background: '#10b981' }}>1</span>
                                                                    <span className="ai-bullet-title-text">핵심 발견 (Core Finding)</span>
                                                                </div>
                                                                <p className="ai-bullet-body-content">
                                                                    {catItem.insights.core_finding}
                                                                </p>
                                                            </div>
                                                        )}

                                                        {catItem.insights?.hypothesis_result && (
                                                            <div className="ai-insight-bullet" style={{ marginTop: '16px' }}>
                                                                <div className="ai-bullet-title-row">
                                                                    <span className="ai-bullet-num-badge" style={{ background: '#10b981' }}>2</span>
                                                                    <span className="ai-bullet-title-text">가설 검증 결과 (Hypothesis Result)</span>
                                                                </div>
                                                                <p className="ai-bullet-body-content">
                                                                    {catItem.insights.hypothesis_result}
                                                                </p>
                                                            </div>
                                                        )}

                                                        {catItem.insights?.so_what && (
                                                            <div className="ai-insight-bullet" style={{ marginTop: '16px' }}>
                                                                <div className="ai-bullet-title-row">
                                                                    <span className="ai-bullet-num-badge" style={{ background: '#8b5cf6' }}>So What</span>
                                                                    <span className="ai-bullet-title-text">전략적 시사점</span>
                                                                </div>
                                                                <div className="ai-insight-result-box" style={{ background: '#f5f3ff', borderLeftColor: '#8b5cf6', padding: '12px 16px' }}>
                                                                    <p className="ai-result-text" style={{ color: '#4c1d95', margin: 0 }}>
                                                                        {catItem.insights.so_what}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}

                                {activeSubTab === 'l3' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        {/* Executive Summary Card */}
                                        <div className="ai-card" style={{ padding: '24px', background: '#f1f5f9', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                                <span style={{ fontSize: '20px' }}>📋</span>
                                                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', margin: 0 }}>Executive Summary (종합 의사결정 요약문)</h3>
                                            </div>
                                            <p style={{ fontSize: '13px', lineHeight: '1.7', color: '#334155', margin: 0, whiteSpace: 'pre-wrap' }}>
                                                {insightData.l3?.executive_summary}
                                            </p>
                                        </div>

                                        {/* Strategic Recommendations Card */}
                                        <div className="ai-card" style={{ padding: '24px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #dcfce7', boxShadow: 'none' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                                <span style={{ fontSize: '20px' }}>💡</span>
                                                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#14532d', margin: 0 }}>Strategic Recommendations (전략적 제안 및 실행 과제)</h3>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                {Array.isArray(insightData.l3?.strategic_recommendations) ? (
                                                    insightData.l3.strategic_recommendations.map((rec, rIdx) => (
                                                        <div key={rIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                                            <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✓</span>
                                                            <p style={{ fontSize: '13px', lineHeight: '1.5', color: '#1b4332', margin: 0 }}>{rec}</p>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p style={{ fontSize: '13px', lineHeight: '1.6', color: '#1b4332', margin: 0, whiteSpace: 'pre-wrap' }}>
                                                        {insightData.l3?.strategic_recommendations}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
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
            <div style={{ flex: 1, overflow: 'auto', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', background: '#f1f5f9' }}>
                {renderContent()}
            </div>
        </div>
    );
};

export default AiReportPage;
