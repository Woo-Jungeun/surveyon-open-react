import React, { useState, useEffect, useContext, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Save, Check, RotateCcw } from 'lucide-react';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import DataHeader from "@/services/dataStatus/components/DataHeader";

import { modalContext } from "@/components/common/Modal.jsx";



import './AiReportPage.css';
import { AiReportPageApi } from "./AiReportPageApi";
import { DpRequestPageApi } from '../dpRequest/DpRequestPageApi';
import AiReportOverviewStep from "./steps/AiReportOverviewStep";
import AiReportContentStep from "./steps/AiReportContentStep";
import AiReportAnalysisStep from "./steps/AiReportAnalysisStep";

const CATEGORY_COLORS = [
    '#3b82f6', // Blue
    '#a855f7', // Purple
    '#6366f1', // Indigo
    '#f97316', // Orange
    '#10b981', // Emerald Green
    '#f43f5e', // Rose Pink
    '#06b6d4', // Cyan
    '#f59e0b', // Amber/Gold
    '#ec4899', // Pink
    '#14b8a6', // Teal
    '#84cc16', // Lime Green
    '#8b5cf6', // Violet
    '#0284c7', // Sky Blue
    '#d946ef'  // Fuchsia
];

const AiReportPage = () => {
    const modal = useContext(modalContext);
    const auth = useSelector((store) => store.auth);
    const { getAiModels, getAiSummaryData, uploadQuestionnaire, getUploadProgress, saveAiSummaryFrame, getAutoCategories, getL1Status, exportL1Excel, generateL2 } = AiReportPageApi();
    const { getOverviewContext, getCrosstabAiSummaryAll } = DpRequestPageApi();
    const fileInputRef = useRef(null);
    const recodedVariablesRef = useRef({});

    const [currentStep, setCurrentStep] = useState(0);
    const [selectedModel, setSelectedModel] = useState("");

    const [isAdding, setIsAdding] = useState(false);
    const [editingCategoryId, setEditingCategoryId] = useState(null);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [newHypothesis, setNewHypothesis] = useState("");
    const [newKpiQuestionId, setNewKpiQuestionId] = useState(null);

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

    const [stepCompletion, setStepCompletion] = useState({
        step1: false,
        step2: false,
        step3_L1: false,
        step3_L2: false,
        step3_L3: false
    });

    // Step 2: Survey Variables Checklist State
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState("전체 유형");
    const [questions, setQuestions] = useState([]);

    // Right side Category settings
    const [fileAttached, setFileAttached] = useState(false);
    const [fileName, setFileName] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);
    const [pollingIntervalId, setPollingIntervalId] = useState(null);
    const [pollingInfo, setPollingInfo] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisProgress, setAnalysisProgress] = useState(0);

    const [categories, setCategories] = useState([]);
    const [isAiCategorized, setIsAiCategorized] = useState(false);
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const [missingVariables, setMissingVariables] = useState([]);
    const [bannerVars, setBannerVars] = useState([]);

    // Fallback Mock data definitions
    const defaultL1 = {};

    const defaultL2 = [];

    const defaultL3 = {};

    // Step 3: Final Analysis state
    const [aiGuideline, setAiGuideline] = useState("백분율은 소수점 첫째 자리까지 표기하고, 집단 간 차이가 큰 항목을 우선 서술");
    const [pipelineStatus, setPipelineStatus] = useState({
        l1: { progress: 0, countText: "0문항", isDone: false, isGenerating: false },
        l2: { progress: 0, countText: "0개 카테고리", isDone: false, isGenerating: false },
        l3: { progress: 0, countText: "분석 대기 중", isDone: false, isGenerating: false }
    });
    const [activeSubTab, setActiveSubTab] = useState("l1"); // 'l1', 'l2', 'l3'
    const [l1SearchQuery, setL1SearchQuery] = useState("");
    const [expandedL1Cards, setExpandedL1Cards] = useState({});

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
                setIsAiCategorized(false);

                let parsedVariablesData = {};
                let parsedAnalysisFrame = {};
                let parsedInsightData = {};

                const variablesDataRaw = item.variablesData || item.VariablesData;
                const analysisFrameRaw = item.analysisFrame || item.AnalysisFrame;
                const insightDataRaw = item.insightData || item.InsightData;

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
                // 1. Step 1: Overview
                const piFrame = parsedAnalysisFrame || {};
                if (Array.isArray(piFrame.banner)) {
                    setBannerVars(piFrame.banner);
                } else if (typeof piFrame.banner === 'string' && piFrame.banner.trim() !== '') {
                    setBannerVars([piFrame.banner]);
                }
                const piVar = parsedVariablesData.project_info || {};
                setOverviewData({
                    projectname: piFrame.projectName || piFrame.projectname || piVar.projectName || piVar.projectname || sessionStorage.getItem("projectname") || "",
                    method: piFrame.method || piVar.method || "",
                    objectives: piFrame.research_purpose || piFrame.objectives || piVar.research_purpose || piVar.objectives || "",
                    target: piFrame.target_population || piFrame.target || piVar.target_population || piVar.target || ""
                });

                // 2. Step 1: Questions (Load recoded_variables from overview context)
                let finalQuestionsLength = 0;
                try {
                    const contextRes = await getOverviewContext.mutateAsync({ pageid: pageId, user: userId });
                    const ctxPayload = contextRes?.resultjson || contextRes || {};
                    const recodedVars = ctxPayload.recoded_variables || {};
                    recodedVariablesRef.current = recodedVars;

                    const mappedQuestions = Object.entries(recodedVars)
                        .filter(([key, v]) => {
                            const varId = String(v?.id ?? key).toLowerCase();
                            return !varId.startsWith("weight_") && varId !== "banner";
                        })
                        .map(([key, v]) => {
                            const varId = v?.id || key;
                            const labelStr = v?.label || '';
                            let qnumVal = '';
                            let labelVal = labelStr;

                            const dotIndex = labelStr.indexOf('.');
                            if (dotIndex !== -1 && dotIndex < 10) {
                                const possibleQnum = labelStr.substring(0, dotIndex).trim();
                                if (/^[A-Za-z0-9\-_]+$/.test(possibleQnum)) {
                                    qnumVal = possibleQnum;
                                    labelVal = labelStr.substring(dotIndex + 1).trim();
                                }
                            }

                            const stubVar = parsedVariablesData.variables?.[varId] || {};
                            const sectionName = v?.SectionName || v?.sectionName || stubVar.SectionName || '기타';
                            const optionsList = Array.isArray(v?.info) ? v.info : (Array.isArray(v?.Options) ? v.Options : []);

                            return {
                                id: varId,
                                qnum: qnumVal || varId,
                                label: labelVal,
                                group: sectionName,
                                type: v?.type || v?.qtype || v?.recoded_type || 'single',
                                subtype: v?.type || v?.qtype || v?.recoded_type || 'single',
                                viewCount: optionsList.length,
                                options: optionsList,
                                checked: false
                            };
                        });

                    if (mappedQuestions.length > 0) {
                        setQuestions(mappedQuestions);
                        finalQuestionsLength = mappedQuestions.length;
                    }
                } catch (e) {
                    console.error("Error loading recoded variables:", e);
                }

                // 3. Step 2: Categories
                let finalCategoriesLength = 7;
                if (parsedAnalysisFrame.categories) {
                    const mappedCategories = (parsedAnalysisFrame.categories || []).map((cat, idx) => ({
                        id: idx + 1,
                        title: cat.category_name || '',
                        desc: cat.hypothesis || '가설 검증 및 문항 분석',
                        qnums: Array.isArray(cat.qnums) ? cat.qnums : [],
                        count: cat.qnums?.length || 0,
                        color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
                        kpi_question_id: cat.kpi || cat.kpi_question_id || null
                    }));
                    setSelectedCategoryId(null);
                    setCategories(mappedCategories);
                    finalCategoriesLength = mappedCategories.length;
                }

                // 4. Step 3: InsightData L1 / L2 / L3
                setInsightData({
                    l1: parsedInsightData.l1 || defaultL1,
                    l2: parsedInsightData.l2 || defaultL2,
                    l3: parsedInsightData.l3 || defaultL3
                });

                // Update step completeness flags
                setStepCompletion({
                    step1: item.step1_yn === true || item.step1_yn === 'Y',
                    step2: item.step2_yn === true || item.step2_yn === 'Y',
                    step3_L1: item.step3_L1_yn === true || item.step3_L1_yn === 'Y',
                    step3_L2: item.step3_L2_yn === true || item.step3_L2_yn === 'Y',
                    step3_L3: item.step3_L3_yn === true || item.step3_L3_yn === 'Y'
                });

                // Update pipeline status
                const l1Done = item.step3_L1_yn === true || item.step3_L1_yn === 'Y';
                const l2Done = item.step3_L2_yn === true || item.step3_L2_yn === 'Y';
                const l3Done = item.step3_L3_yn === true || item.step3_L3_yn === 'Y';

                setPipelineStatus({
                    l1: { progress: l1Done ? 100 : 0, countText: l1Done ? `${finalQuestionsLength}개 문항` : "분석 대기 중", isDone: l1Done, isGenerating: false },
                    l2: { progress: l2Done ? 100 : 0, countText: l2Done ? `${finalCategoriesLength}개 카테고리` : "분석 대기 중", isDone: l2Done, isGenerating: false },
                    l3: { progress: l3Done ? 100 : 0, countText: l3Done ? "보고서 추출 가능" : "분석 대기 중", isDone: l3Done, isGenerating: false }
                });
            }
        } catch (err) {
            console.error("Failed to load existing AI summary data:", err);
        }
    };
    const fetchL1StatusData = async () => {
        const pageId = sessionStorage.getItem("pageId") || "3fa85f64-5717-4562-b3fc-2c963f66afa6";
        const userId = auth?.user?.userId || "jewoo";
        try {
            const l1StatusRes = await getL1Status.mutateAsync({ pageId, user: userId });
            if (String(l1StatusRes?.success) === '777' && l1StatusRes?.resultjson) {
                const l1Payload = l1StatusRes.resultjson;
                setMissingVariables(l1Payload.missingVariables || []);
                if (l1Payload.l1Insights) {
                    setInsightData(prev => ({
                        ...prev,
                        l1: l1Payload.l1Insights
                    }));
                }
            }
        } catch (e) {
            console.error("Failed to load L1 status:", e);
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

    // Load L1 status when entering Step 3 (최종분석)
    useEffect(() => {
        if (currentStep === 2) {
            fetchL1StatusData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentStep]);
    const handleExportL1Excel = async () => {
        const pageId = sessionStorage.getItem("pageId") || "3fa85f64-5717-4562-b3fc-2c963f66afa6";
        const userId = auth?.user?.userId || "jewoo";

        const l1InsightsPayload = {};
        if (insightData.l1) {
            Object.keys(insightData.l1).forEach(key => {
                const item = insightData.l1[key];
                if (item) {
                    l1InsightsPayload[key] = {
                        fact_summary: typeof item.fact_summary === 'object' ? (item.fact_summary.description || item.fact_summary.headline || '') : String(item.fact_summary || ''),
                        respondent_characteristics: typeof item.respondent_characteristics === 'object' ? (item.respondent_characteristics.description || item.respondent_characteristics.headline || '') : String(item.respondent_characteristics || '')
                    };
                }
            });
        }

        const payload = {
            pageId: pageId,
            user: userId,
            l1Insights: l1InsightsPayload
        };

        try {
            const res = await exportL1Excel.mutateAsync(payload);
            const payloadRes = res?.resultjson || res || {};

            if (String(res?.success) === "777" && payloadRes.content_base64) {
                const binaryString = window.atob(payloadRes.content_base64);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                const blob = new Blob([bytes], { type: payloadRes.content_type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', payloadRes.filename || `ai_summary_l1_${pageId}.xlsx`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            } else {
                modal.showAlert('오류', res?.message || '엑셀 데이터 생성에 실패했습니다.');
            }
        } catch (error) {
            console.error('L1 Excel Export Error:', error);
            modal.showAlert('오류', '엑셀 다운로드 중 문제가 발생했습니다.');
        }
    };

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
                    options: v.Options || [],
                    checked: false
                }));
                setQuestions(mappedQuestions);
            }
        }
    };

    // Simulated pipeline generation triggers
    const triggerPipelineRegenerate = async (level) => {
        setPipelineStatus(prev => ({
            ...prev,
            [level]: { ...prev[level], isGenerating: true, progress: 0 }
        }));

        if (level === 'l1') {
            const pageId = sessionStorage.getItem("pageId") || "3fa85f64-5717-4562-b3fc-2c963f66afa6";
            const userId = auth?.user?.userId || "jewoo";

            // Load recoded_variables if empty
            let recodedVars = recodedVariablesRef.current || {};
            if (Object.keys(recodedVars).length === 0) {
                try {
                    const contextRes = await getOverviewContext.mutateAsync({ pageid: pageId, user: userId });
                    const ctxPayload = contextRes?.resultjson || contextRes || {};
                    recodedVars = ctxPayload.recoded_variables || {};
                    recodedVariablesRef.current = recodedVars;
                } catch (e) {
                    console.error("Failed to load context in regenerate:", e);
                }
            }

            const bannerVarList = bannerVars.length > 0 ? bannerVars : ["banner_001"];
            const variablesPayload = Object.keys(recodedVars).map(key => {
                const item = recodedVars[key];
                let bannerVal = bannerVarList;
                if (item && item.banner) {
                    if (Array.isArray(item.banner)) {
                        bannerVal = item.banner;
                    } else if (typeof item.banner === 'string' && item.banner.trim() !== '') {
                        bannerVal = [item.banner];
                    }
                }
                return {
                    variableId: key,
                    banner: bannerVal
                };
            });

            const payload = {
                pageId: pageId,
                filterExpression: "",
                weightCol: "",
                model: selectedModel || "llm-gpt-oss-120b",
                variables: variablesPayload,
                user: userId,
                triggerBatch: true
            };

            try {
                const res = await getCrosstabAiSummaryAll.mutateAsync(payload);
                if (String(res?.success) === '777' && res?.resultjson) {
                    const data = res.resultjson;
                    const initialProg = data.progress ?? 0;
                    setPipelineStatus(prev => ({
                        ...prev,
                        l1: {
                            ...prev.l1,
                            progress: initialProg,
                            isGenerating: data.running ?? false
                        }
                    }));

                    const pollInterval = setInterval(async () => {
                        try {
                            const pollPayload = { ...payload, triggerBatch: false };
                            const pollRes = await getCrosstabAiSummaryAll.mutateAsync(pollPayload);
                            if (String(pollRes?.success) === '777' && pollRes?.resultjson) {
                                const pollData = pollRes.resultjson;
                                const prog = pollData.progress ?? 0;
                                const isRunning = pollData.running ?? false;

                                setPipelineStatus(prev => ({
                                    ...prev,
                                    l1: {
                                        ...prev.l1,
                                        progress: prog,
                                        isGenerating: isRunning
                                    }
                                }));

                                if (!isRunning || prog >= 100) {
                                    clearInterval(pollInterval);
                                    setPipelineStatus(prev => ({
                                        ...prev,
                                        l1: { ...prev.l1, isGenerating: false, isDone: true, progress: 100 }
                                    }));
                                    modal.showAlert("알림", "문항별 인사이트 재생성이 완료되었습니다.");
                                    await loadSummaryData();
                                    await fetchL1StatusData();
                                }
                            } else {
                                clearInterval(pollInterval);
                                setPipelineStatus(prev => ({
                                    ...prev,
                                    l1: { ...prev.l1, isGenerating: false }
                                }));
                            }
                        } catch (pollErr) {
                            console.error("L1 summary polling error:", pollErr);
                            clearInterval(pollInterval);
                            setPipelineStatus(prev => ({
                                ...prev,
                                l1: { ...prev.l1, isGenerating: false }
                            }));
                        }
                    }, 2000);
                } else {
                    setPipelineStatus(prev => ({
                        ...prev,
                        l1: { ...prev.l1, isGenerating: false }
                    }));
                    modal.showAlert("오류", res?.message || "문항별 인사이트 재생성 작업 시작에 실패하였습니다.");
                }
            } catch (err) {
                console.error("Failed to trigger L1 recreate:", err);
                setPipelineStatus(prev => ({
                    ...prev,
                    l1: { ...prev.l1, isGenerating: false }
                }));
                modal.showAlert("오류", "서버 통신 실패로 인사이트 재생성을 실행하지 못했습니다.");
            }
        } else if (level === 'l2') {
            const pageId = sessionStorage.getItem("pageId") || "3fa85f64-5717-4562-b3fc-2c963f66afa6";
            const userId = auth?.user?.userId || "jewoo";

            const payload = {
                pageId: pageId,
                user: userId,
                modelType: selectedModel || "llm-gpt-oss-120b",
                userInstructions: aiGuideline || ""
            };

            let prog = 0;
            const progressInterval = setInterval(() => {
                prog = Math.min(prog + 15, 95);
                setPipelineStatus(prev => ({
                    ...prev,
                    l2: { ...prev.l2, progress: prog }
                }));
            }, 300);

            try {
                const res = await generateL2.mutateAsync(payload);
                clearInterval(progressInterval);

                if (String(res?.success) === '777') {
                    setInsightData(prev => ({
                        ...prev,
                        l2: res.resultjson || []
                    }));

                    setPipelineStatus(prev => ({
                        ...prev,
                        l2: {
                            ...prev.l2,
                            isGenerating: false,
                            isDone: true,
                            progress: 100,
                            countText: `${res.resultjson?.length || 0}개 카테고리`
                        }
                    }));
                    modal.showAlert("알림", "조사내용별 분석(L2) 생성이 성공적으로 완료되었습니다.");
                    await loadSummaryData();
                } else {
                    setPipelineStatus(prev => ({
                        ...prev,
                        l2: { ...prev.l2, isGenerating: false, progress: 0 }
                    }));
                    modal.showAlert("오류", res?.message || "조사내용별 분석(L2) 생성에 실패했습니다.");
                }
            } catch (err) {
                console.error("Failed to generate L2:", err);
                clearInterval(progressInterval);
                setPipelineStatus(prev => ({
                    ...prev,
                    l2: { ...prev.l2, isGenerating: false, progress: 0 }
                }));
                modal.showAlert("오류", "서버 통신 실패로 L2 분석을 완료하지 못했습니다.");
            }
        } else {
            // Simulated triggers for l3
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
                    loadSummaryData();
                }
            }, 200);
        }
    };

    // Save Page Data
    const handleSave = async () => {
        const pageId = sessionStorage.getItem("pageId") || "3fa85f64-5717-4562-b3fc-2c963f66afa6";
        const pn = sessionStorage.getItem("pn") || sessionStorage.getItem("Pn") || "P001234";
        const userId = auth?.user?.userId || "jewoo";

        const frameObj = {
            projectName: overviewData.projectname,
            research_purpose: overviewData.objectives,
            target_population: overviewData.target,
            method: overviewData.method,
            categories: categories.map(cat => ({
                category_name: cat.title,
                qnums: cat.qnums,
                kpi: cat.kpi_question_id || (cat.qnums && cat.qnums[0]) || "",
                hypothesis: cat.desc
            }))
        };

        const payload = {
            pageId,
            user: userId,
            pn,
            analysisFrame: JSON.stringify(frameObj)
        };

        try {
            const res = await saveAiSummaryFrame.mutateAsync(payload);
            if (String(res?.success) === '777') {
                modal.showAlert("알림", "저장되었습니다.");
                await loadSummaryData();
            } else {
                modal.showAlert("오류", res?.message || "저장에 실패하였습니다.");
            }
        } catch (err) {
            console.error("Failed to save analysis frame:", err);
            modal.showAlert("오류", "서버 통신 실패로 저장하지 못했습니다.");
        }
    };

    const handleAiAutoCategorize = async () => {
        modal.showConfirm("알림", "AI 자동 분류를 실행하시겠습니까?\n기존 카테고리 목록은 모두 삭제되고 \n 새로운 추천 분류 정보로 덮어씌워집니다.", {
            btns: [
                { title: "취소", click: () => { console.log("AI auto categorization cancelled"); } },
                {
                    title: "실행",
                    click: async () => {
                        setCategories([]); // 로딩 시작 시 기존 카테고리 데이터 비우기
                        const pageId = sessionStorage.getItem("pageId") || "3fa85f64-5717-4562-b3fc-2c963f66afa6";
                        const userId = auth?.user?.userId || "jewoo";
                        const modelType = selectedModel || "llm-gpt-oss-120b";

                        const payload = {
                            pageId,
                            modelType,
                            user: userId
                        };

                        try {
                            const res = await getAutoCategories.mutateAsync(payload);
                            if (String(res?.success) === '777' && res?.resultjson?.categories) {
                                const mappedCategories = (res.resultjson.categories || []).map((cat, idx) => ({
                                    id: idx + 1,
                                    title: cat.category_name || '',
                                    desc: cat.hypothesis || '가설 검증 및 문항 분석',
                                    qnums: Array.isArray(cat.qnums) ? cat.qnums : [],
                                    count: cat.qnums?.length || 0,
                                    color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
                                    kpi_question_id: cat.kpi || cat.kpi_question_id || null
                                }));
                                setSelectedCategoryId(null);
                                setCategories(mappedCategories);
                                setIsAiCategorized(true);
                                modal.showAlert("알림", "AI 자동 분류가 완료되었습니다.");
                            } else {
                                modal.showAlert("오류", res?.message || "AI 자동 분류에 실패하였습니다.");
                            }
                        } catch (err) {
                            console.error("Failed to run AI auto categorization:", err);
                            modal.showAlert("오류", "서버 통신 실패로 AI 자동 분류를 실행하지 못했습니다.");
                        }
                    }
                }
            ]
        });
    };

    const handleRestoreOriginalCategories = async () => {
        try {
            await loadSummaryData();
            modal.showAlert("알림", "기존 카테고리로 원복되었습니다.");
        } catch (e) {
            console.error("Failed to restore original categories:", e);
            modal.showAlert("오류", "카테고리 원복에 실패했습니다.");
        }
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
        setSelectedCategoryId(null);
        setEditingCategoryId(null);
        setIsAdding(true);
        setNewCategoryName("");
        setNewHypothesis("");
        setNewKpiQuestionId(null);
        setQuestions(prev => prev.map(q => ({ ...q, checked: false })));
    };

    const handleStartEditCategory = (catId) => {
        setIsAdding(false);
        const cat = categories.find(c => c.id === catId);
        if (cat) {
            setEditingCategoryId(catId);
            setNewCategoryName(cat.title);
            setNewHypothesis(cat.desc);
            setNewKpiQuestionId(cat.kpi_question_id);
            setSelectedCategoryId(null);
            
            // Initialize questions checklist
            setQuestions(prev => prev.map(q => ({
                ...q,
                checked: cat.qnums?.some(qk => q.id === qk || q.qnum === qk) || false
            })));

            // Scroll to the first matched question in the left grid
            const firstMatched = questions.find(q => cat.qnums?.some(qk => q.id === qk || q.qnum === qk));
            if (firstMatched) {
                setTimeout(() => {
                    const element = document.getElementById(`q_row_${firstMatched.id}`);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 80);
            }
        }
    };

    const handleCancelEditCategory = () => {
        setEditingCategoryId(null);
        setNewCategoryName("");
        setNewHypothesis("");
        setNewKpiQuestionId(null);
        setQuestions(prev => prev.map(q => ({ ...q, checked: false })));
    };

    const handleSaveEditCategory = async () => {
        if (!newCategoryName.trim()) {
            modal.showAlert("알림", "카테고리명을 입력해주세요.");
            return;
        }
        const selectedQuestions = questions.filter(q => q.checked);
        const selectedQIds = selectedQuestions.map(q => q.id);

        const finalKpiQuestionId = (newKpiQuestionId && selectedQIds.includes(newKpiQuestionId))
            ? newKpiQuestionId
            : (selectedQIds[0] || null);

        const updatedCategories = categories.map(cat => {
            if (cat.id === editingCategoryId) {
                return {
                    ...cat,
                    title: newCategoryName.trim(),
                    desc: newHypothesis.trim() || '가설 검증 및 문항 분석',
                    qnums: selectedQIds,
                    count: selectedQIds.length,
                    kpi_question_id: finalKpiQuestionId
                };
            }
            return cat;
        });

        const pageId = sessionStorage.getItem("pageId") || "3fa85f64-5717-4562-b3fc-2c963f66afa6";
        const pn = sessionStorage.getItem("pn") || sessionStorage.getItem("Pn") || "P001234";
        const userId = auth?.user?.userId || "jewoo";

        const frameObj = {
            projectName: overviewData.projectname,
            research_purpose: overviewData.objectives,
            target_population: overviewData.target,
            method: overviewData.method,
            categories: updatedCategories.map(cat => ({
                category_name: cat.title,
                qnums: cat.qnums,
                kpi: cat.kpi_question_id || (cat.qnums && cat.qnums[0]) || "",
                hypothesis: cat.desc
            }))
        };

        const payload = {
            pageId,
            user: userId,
            pn,
            analysisFrame: JSON.stringify(frameObj)
        };

        try {
            const res = await saveAiSummaryFrame.mutateAsync(payload);
            if (String(res?.success) === '777') {
                setCategories(updatedCategories);
                setSelectedCategoryId(editingCategoryId);
                setEditingCategoryId(null);
                setNewCategoryName("");
                setNewHypothesis("");
                setNewKpiQuestionId(null);
                setQuestions(prev => prev.map(q => ({ ...q, checked: false })));
                modal.showAlert("알림", "카테고리가 수정 및 저장되었습니다.");
                await loadSummaryData();
            } else {
                modal.showAlert("오류", res?.message || "카테고리 저장에 실패하였습니다.");
            }
        } catch (err) {
            console.error("Failed to save analysis frame on editing category:", err);
            modal.showAlert("오류", "서버 통신 실패로 카테고리를 저장하지 못했습니다.");
        }
    };

    const handleSaveNewCategory = async () => {
        if (!newCategoryName.trim()) {
            modal.showAlert("알림", "카테고리명을 입력해주세요.");
            return;
        }
        const selectedQuestions = questions.filter(q => q.checked);
        const selectedQIds = selectedQuestions.map(q => q.id);

        const finalKpiQuestionId = (newKpiQuestionId && selectedQIds.includes(newKpiQuestionId))
            ? newKpiQuestionId
            : (selectedQIds[0] || null);

        const newId = categories.length > 0 ? Math.max(...categories.map(c => c.id)) + 1 : 1;
        const newCat = {
            id: newId,
            title: newCategoryName.trim(),
            desc: newHypothesis.trim() || '가설 검증 및 문항 분석',
            qnums: selectedQIds,
            count: selectedQIds.length,
            color: CATEGORY_COLORS[(newId - 1) % CATEGORY_COLORS.length],
            kpi_question_id: finalKpiQuestionId
        };

        const updatedCategories = [newCat, ...categories];

        const pageId = sessionStorage.getItem("pageId") || "3fa85f64-5717-4562-b3fc-2c963f66afa6";
        const pn = sessionStorage.getItem("pn") || sessionStorage.getItem("Pn") || "P001234";
        const userId = auth?.user?.userId || "jewoo";

        const frameObj = {
            projectName: overviewData.projectname,
            research_purpose: overviewData.objectives,
            target_population: overviewData.target,
            method: overviewData.method,
            categories: updatedCategories.map(cat => ({
                category_name: cat.title,
                qnums: cat.qnums,
                kpi: cat.kpi_question_id || (cat.qnums && cat.qnums[0]) || "",
                hypothesis: cat.desc
            }))
        };

        const payload = {
            pageId,
            user: userId,
            pn,
            analysisFrame: JSON.stringify(frameObj)
        };

        try {
            const res = await saveAiSummaryFrame.mutateAsync(payload);
            if (String(res?.success) === '777') {
                setCategories(updatedCategories);
                setSelectedCategoryId(newId);
                setIsAdding(false);
                setNewCategoryName("");
                setNewHypothesis("");
                setNewKpiQuestionId(null);
                modal.showAlert("알림", "새 카테고리가 등록 및 저장되었습니다.");
                await loadSummaryData();
            } else {
                modal.showAlert("오류", res?.message || "카테고리 저장에 실패하였습니다.");
            }
        } catch (err) {
            console.error("Failed to save analysis frame on adding category:", err);
            modal.showAlert("오류", "서버 통신 실패로 카테고리를 저장하지 못했습니다.");
        }
    };

    const handleCancelNewCategory = () => {
        setIsAdding(false);
        setNewCategoryName("");
        setNewHypothesis("");
        setNewKpiQuestionId(null);
    };

    const handleDeleteCategory = (catId, e) => {
        if (e) {
            e.stopPropagation();
        }
        modal.showConfirm("알림", "선택한 테고리를 정말 삭제하시겠습니까?", {
            btns: [
                { title: "취소", click: () => { console.log("Delete cancelled"); } },
                {
                    title: "삭제",
                    click: async () => {
                        const updatedCategories = categories.filter(c => c.id !== catId);

                        const pageId = sessionStorage.getItem("pageId") || "3fa85f64-5717-4562-b3fc-2c963f66afa6";
                        const pn = sessionStorage.getItem("pn") || sessionStorage.getItem("Pn") || "P001234";
                        const userId = auth?.user?.userId || "jewoo";

                        const frameObj = {
                            projectName: overviewData.projectname,
                            research_purpose: overviewData.objectives,
                            target_population: overviewData.target,
                            method: overviewData.method,
                            categories: updatedCategories.map(cat => ({
                                category_name: cat.title,
                                qnums: cat.qnums,
                                kpi: cat.kpi_question_id || (cat.qnums && cat.qnums[0]) || "",
                                hypothesis: cat.desc
                            }))
                        };

                        const payload = {
                            pageId,
                            user: userId,
                            pn,
                            analysisFrame: JSON.stringify(frameObj)
                        };

                        try {
                            const res = await saveAiSummaryFrame.mutateAsync(payload);
                            if (String(res?.success) === '777') {
                                setCategories(updatedCategories);
                                if (selectedCategoryId === catId) {
                                    setSelectedCategoryId(null);
                                }
                                if (editingCategoryId === catId) {
                                    setEditingCategoryId(null);
                                    setNewCategoryName("");
                                    setNewHypothesis("");
                                    setNewKpiQuestionId(null);
                                }
                                modal.showAlert("알림", "카테고리가 삭제 및 저장되었습니다.");
                                await loadSummaryData();
                            } else {
                                modal.showAlert("오류", res?.message || "카테고리 삭제에 실패하였습니다.");
                            }
                        } catch (err) {
                            console.error("Failed to delete category:", err);
                            modal.showAlert("오류", "서버 통신 실패로 삭제하지 못했습니다.");
                        }
                    }
                }
            ]
        });
    };

    // Render Steps content
    const renderContent = () => {
        switch (currentStep) {
            case 0: // 조사개요
                return (
                    <AiReportOverviewStep
                        fileInputRef={fileInputRef}
                        handleFileChange={handleFileChange}
                        fileAttached={fileAttached}
                        fileName={fileName}
                        setFileAttached={setFileAttached}
                        setFileName={setFileName}
                        setSelectedFile={setSelectedFile}
                        setPollingInfo={setPollingInfo}
                        pollingIntervalId={pollingIntervalId}
                        handleReset={handleReset}
                        handleStartAnalysisFile={handleStartAnalysisFile}
                        isAnalyzing={isAnalyzing}
                        analysisProgress={analysisProgress}
                        pollingInfo={pollingInfo}
                        overviewData={overviewData}
                        setOverviewData={setOverviewData}
                    />
                );
            case 1: // 조사내용
                return (
                    <AiReportContentStep
                        categories={categories}
                        selectedCategoryId={selectedCategoryId}
                        setSelectedCategoryId={setSelectedCategoryId}
                        questions={questions}
                        newKpiQuestionId={newKpiQuestionId}
                        setNewKpiQuestionId={setNewKpiQuestionId}
                        isAdding={isAdding}
                        editingCategoryId={editingCategoryId}
                        newCategoryName={newCategoryName}
                        setNewCategoryName={setNewCategoryName}
                        newHypothesis={newHypothesis}
                        setNewHypothesis={setNewHypothesis}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        typeFilter={typeFilter}
                        setTypeFilter={setTypeFilter}
                        handleSelectAllQuestions={handleSelectAllQuestions}
                        handleToggleQuestion={handleToggleQuestion}
                        handleAiAutoCategorize={handleAiAutoCategorize}
                        isAiCategorized={isAiCategorized}
                        handleRestoreOriginalCategories={handleRestoreOriginalCategories}
                        handleAddCategory={handleAddCategory}
                        handleCancelNewCategory={handleCancelNewCategory}
                        handleSaveNewCategory={handleSaveNewCategory}
                        handleDeleteCategory={handleDeleteCategory}
                        handleStartEditCategory={handleStartEditCategory}
                        handleCancelEditCategory={handleCancelEditCategory}
                        handleSaveEditCategory={handleSaveEditCategory}
                    />
                );
            case 2: // 최종분석
                return (
                    <AiReportAnalysisStep
                        aiGuideline={aiGuideline}
                        setAiGuideline={setAiGuideline}
                        pipelineStatus={pipelineStatus}
                        triggerPipelineRegenerate={triggerPipelineRegenerate}
                        activeSubTab={activeSubTab}
                        setActiveSubTab={setActiveSubTab}
                        insightData={insightData}
                        setInsightData={setInsightData}
                        questions={questions}
                        l1SearchQuery={l1SearchQuery}
                        setL1SearchQuery={setL1SearchQuery}
                        expandedL1Cards={expandedL1Cards}
                        setExpandedL1Cards={setExpandedL1Cards}
                        missingVariables={missingVariables}
                        onExportL1Excel={handleExportL1Excel}
                        categories={categories}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 40px)' }} className="ai-report-container">
            <DataHeader title="AI 요약보고서">
                {/* 3단계 스텝퍼 */}
                <div className="ai-stepper-compact">
                    {steps.map((step, idx) => {
                        const isActive = idx === currentStep;
                        const isCompleted = idx === 0 ? stepCompletion.step1 :
                            idx === 1 ? stepCompletion.step2 :
                                ((stepCompletion.step3_L1 && stepCompletion.step3_L2 && stepCompletion.step3_L3) || pipelineStatus.l3.isDone);

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

                    {currentStep !== 1 && (
                        <button className="data-header-btn data-header-btn-primary" onClick={handleSave}>
                            <Save size={16} />
                            <span>저장</span>
                        </button>
                    )}
                </div>
            </DataHeader>

            {/* 단계별 내용 */}
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', background: '#f1f5f9' }}>
                {renderContent()}
            </div>
        </div>
    );
};

export default AiReportPage;
