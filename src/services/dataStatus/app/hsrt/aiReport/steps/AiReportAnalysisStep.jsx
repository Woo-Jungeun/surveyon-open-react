
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Check, ArrowRight, RefreshCw, ChevronUp, ChevronDown, FileSpreadsheet, ChevronsUpDown, ChevronsDownUp, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, Presentation, FileText, Target, BarChart2, CheckCircle2, Users, ExternalLink, Download, BarChartHorizontal, Layers, Percent, LineChart, PieChart, Aperture, MoreHorizontal, AreaChart, LayoutGrid, Cloud, Settings, LayoutList, Zap } from 'lucide-react';
import { DpRequestPageApi } from '../../dpRequest/DpRequestPageApi';
import { AiReportPageApi } from '../AiReportPageApi';
import KendoChart from '@/services/dataStatus/components/KendoChart';

const CHART_THEME_OPTIONS = [
    { id: 'default', name: '기본 테마', preview: ['#2563eb', '#7c3aed', '#db2777', '#ca8a04', '#16a34a'] },
    { id: 'professional', name: '프로페셔널', preview: ['#1e40af', '#3b82f6', '#93c5fd', '#64748b', '#94a3b8'] },
    { id: 'tableau', name: '태블로', preview: ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f'] },
    { id: 'pastel', name: '파스텔', preview: ['#a78bfa', '#f472b6', '#38bdf8', '#4ade80', '#fbbf24'] },
    { id: 'ocean', name: '오션', preview: ['#0284c7', '#06b6d4', '#0d9488', '#14b8a6', '#2dd4bf'] },
    { id: 'forest', name: '포레스트', preview: ['#15803d', '#16a34a', '#65a30d', '#84cc16', '#a3e635'] },
    { id: 'sunset', name: '선셋', preview: ['#c026d3', '#e11d48', '#f97316', '#facc15', '#fbbf24'] },
    { id: 'slate', name: '슬레이트', preview: ['#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1'] },
    { id: 'vivid', name: '비비드', preview: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'] }
];

const CHART_TYPE_OPTIONS = [
    { id: 'column', label: '세로 막대형', icon: <BarChart2 size={16} /> },
    { id: 'bar', label: '가로 막대형', icon: <BarChartHorizontal size={16} /> },
    { id: 'stackedColumn', label: '누적 막대형', icon: <Layers size={16} /> },
    { id: 'stacked100Column', label: '100% 누적 막대형', icon: <Percent size={16} /> },
    { id: 'line', label: '선형', icon: <LineChart size={16} /> },
    { id: 'pie', label: '원형', icon: <PieChart size={16} /> },
    { id: 'donut', label: '도넛형', icon: <PieChart size={16} style={{ opacity: 0.8 }} /> },
    { id: 'radarArea', label: '방사형', icon: <Aperture size={16} /> },
    { id: 'scatterPoint', label: '점도표', icon: <MoreHorizontal size={16} /> },
    { id: 'area', label: '영역형', icon: <AreaChart size={16} /> },
    { id: 'heatmap', label: '히트맵', icon: <LayoutGrid size={16} /> },
    { id: 'wordCloud', label: '워드클라우드', icon: <Cloud size={16} /> }
];

const renderInsightText = (val) => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (Array.isArray(val)) {
        return val.map(item => renderInsightText(item)).join('\n');
    }
    if (typeof val === 'object') {
        return val.description || val.headline || val.text || JSON.stringify(val);
    }
    return String(val);
};

const formatProgressPercent = (val) => {
    if (val === undefined || val === null) return 0;
    const num = typeof val === 'number' ? val : parseFloat(val);
    if (isNaN(num)) return 0;
    return Number(num.toFixed(2));
};

const AiReportAnalysisStep = ({
    aiGuideline,
    setAiGuideline,
    pipelineStatus,
    triggerPipelineRegenerate,
    activeSubTab,
    setActiveSubTab,
    insightData,
    questions,
    l1SearchQuery,
    setL1SearchQuery,
    expandedL1Cards,
    setExpandedL1Cards,
    missingVariables = [],
    l1CountInfo = {},
    onExportL1Excel,
    onExportL3File,
    categories,
    bannerVars,
    userId,
    recodedVariables = {}
}) => {
    const { getOverviewContext } = DpRequestPageApi();
    const { getOverviewProofStyled, getOverviewProofStyledChart, getOverviewSingleStyled } = AiReportPageApi();

    const [recodedVariablesMap, setRecodedVariablesMap] = useState(recodedVariables || {});

    useEffect(() => {
        if (recodedVariables && typeof recodedVariables === 'object' && Object.keys(recodedVariables).length > 0) {
            setRecodedVariablesMap(recodedVariables);
            return;
        }
        const fetchRecodedVars = async () => {
            const pageId = sessionStorage.getItem('pageId') || "3fa85f64-5717-4562-b3fc-2c963f66afa6";
            const user = userId || "";
            try {
                const contextRes = await getOverviewContext.mutateAsync({ pageid: pageId, user });
                const ctxPayload = contextRes?.resultjson || contextRes || {};
                const recodedVars = ctxPayload.recoded_variables || {};
                if (recodedVars && typeof recodedVars === 'object' && Object.keys(recodedVars).length > 0) {
                    setRecodedVariablesMap(recodedVars);
                }
            } catch (e) {
                console.error("Failed to load recoded_variables for stub label lookup:", e);
            }
        };
        fetchRecodedVars();
    }, [userId, getOverviewContext, recodedVariables]);

    const getStubDisplayLabel = useCallback((stubCode) => {
        if (!stubCode) return '';
        const stubStr = String(stubCode).trim();

        if (recodedVariablesMap[stubStr]?.label) {
            return recodedVariablesMap[stubStr].label;
        }

        const stubWithSuffix = stubStr.endsWith('_stub') ? stubStr : `${stubStr}_stub`;
        const stubWithoutSuffix = stubStr.replace(/_stub$/, '');

        if (recodedVariablesMap[stubWithSuffix]?.label) {
            return recodedVariablesMap[stubWithSuffix].label;
        }
        if (recodedVariablesMap[stubWithoutSuffix]?.label) {
            return recodedVariablesMap[stubWithoutSuffix].label;
        }

        const foundByVal = Object.values(recodedVariablesMap).find(v =>
            v && (v.id === stubStr || v.id === stubWithSuffix || v.id === stubWithoutSuffix)
        );
        if (foundByVal?.label) {
            return foundByVal.label;
        }

        if (Array.isArray(questions) && questions.length > 0) {
            const qMatch = questions.find(q =>
                q.id === stubStr || q.id === stubWithSuffix || q.id === stubWithoutSuffix || q.qnum === stubStr || q.qnum === stubWithoutSuffix
            );
            if (qMatch?.label) {
                return qMatch.qnum ? `${qMatch.qnum}. ${qMatch.label}` : qMatch.label;
            }
        }

        return stubStr;
    }, [recodedVariablesMap, questions]);

    const handleOpenSingleCrosstab = (stubCode, findItem) => {
        if (!stubCode) return;

        const pageId = sessionStorage.getItem('pageId') || "3fa85f64-5717-4562-b3fc-2c963f66afa6";
        const user = userId || "";
        const windowTitle = findItem?.question_name || findItem?.question_title || findItem?.question || `문항 [${stubCode}] 핵심 교차표`;

        const target = findItem?.evidence_target || {};
        const bannerName = target.banner_name || findItem?.banner_name || "";
        const bannerColumn = target.banner_column || findItem?.banner_column || "";
        let bannerList = bannerColumn && [bannerColumn];
        if (!bannerList) {
            bannerList = bannerName ? [bannerName] : (bannerVars && bannerVars.length > 0 ? bannerVars : []);
        } else if (typeof bannerList === 'string') {
            bannerList = [bannerList];
        }
        if (!Array.isArray(bannerList)) {
            bannerList = [];
        }

        const weightVar = target.weight_variable || target.weight_col || findItem?.weight_variable || findItem?.weight_col || "";
        const filterExpr = target.filter_expression || findItem?.filter_expression || "";

        const payload = {
            pageId: pageId,
            user: user,
            stubId: stubCode,
            bannerList: bannerList,
            weightVar: weightVar,
            filterExpr: filterExpr,
            windowTitle: windowTitle
        };

        const queryParams = new URLSearchParams({
            stub: stubCode,
            title: windowTitle,
            pageId: pageId,
            user: user,
            banner: JSON.stringify(bannerList),
            weightVar: weightVar,
            filterExpr: filterExpr
        }).toString();

        try {
            sessionStorage.setItem('singleCrosstabParams', JSON.stringify(payload));
            const width = Math.min(1400, window.screen.width * 0.9);
            const height = Math.min(900, window.screen.height * 0.9);
            const left = (window.screen.width - width) / 2;
            const top = (window.screen.height - height) / 2;
            window.open(
                `/crosstab-single-view?${queryParams}`,
                'SingleCrosstabViewWindow',
                `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no`
            );
        } catch (e) {
            console.error("Failed to open single crosstab window:", e);
        }
    };
    // L2 state and variables
    const [l1StatusTab, setL1StatusTab] = useState('completed'); // 'completed' | 'missing'
    const [activeCategoryIndex, setActiveCategoryIndex] = useState(-1);
    const activeTabRef = useRef(null);
    const l2ContentScrollRef = useRef(null);
    const l1ListScrollRef = useRef(null);
    const l3ListScrollRef = useRef(null);

    useEffect(() => {
        if (activeTabRef.current) {
            activeTabRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'nearest'
            });
        }
        if (l1ListScrollRef.current) {
            l1ListScrollRef.current.scrollTop = 0;
        }
        if (l2ContentScrollRef.current) {
            l2ContentScrollRef.current.scrollTop = 0;
        }
        if (l3ListScrollRef.current) {
            l3ListScrollRef.current.scrollTop = 0;
        }
        const outerContainer = document.querySelector('.ai-step-content-container');
        if (outerContainer) {
            outerContainer.scrollTop = 0;
        }
        const allOverflowElements = document.querySelectorAll('.ai-report-blocks-wrap div[style*="overflow"]');
        allOverflowElements.forEach(el => {
            el.scrollTop = 0;
        });
    }, [activeCategoryIndex, activeSubTab, l1StatusTab]);

    useEffect(() => {
        if (activeSubTab === 'l2') {
            setActiveCategoryIndex(-1);
        }
    }, [activeSubTab]);
    const [openEvidences, setOpenEvidences] = useState({});
    const [evidenceDataMap, setEvidenceDataMap] = useState({});
    const [evidenceLoadingMap, setEvidenceLoadingMap] = useState({});
    const [evidenceChartDataMap, setEvidenceChartDataMap] = useState({});
    const [evidenceChartLoadingMap, setEvidenceChartLoadingMap] = useState({});
    const [crosstabTabMap, setCrosstabTabMap] = useState({});
    const [chartModeMap, setChartModeMap] = useState({});
    const [paletteIdMap, setPaletteIdMap] = useState({});
    const [showLegendMap, setShowLegendMap] = useState({});
    const [chartDataTypeMap, setChartDataTypeMap] = useState({});
    const [showChartValuesMap, setShowChartValuesMap] = useState({});
    const [showPercentSymbolMap, setShowPercentSymbolMap] = useState({});
    const [openDropdownMap, setOpenDropdownMap] = useState({});

    useEffect(() => {
        const hasOpenDropdown = Object.values(openDropdownMap).some(Boolean);
        if (!hasOpenDropdown) return;

        const handleOutsideClick = () => {
            setOpenDropdownMap({});
        };

        window.addEventListener('click', handleOutsideClick);
        return () => window.removeEventListener('click', handleOutsideClick);
    }, [openDropdownMap]);
    const chartContainerRefs = useRef({});
    const [isPipelineExpanded, setIsPipelineExpanded] = useState(true);

    const handleChartDownload = (evidenceKey, format) => {
        const container = chartContainerRefs.current[evidenceKey];
        if (!container) return;

        const svgElement = container.querySelector('.k-chart svg') || container.querySelector('svg');
        if (!svgElement) return;

        const fileName = `crosstab_chart_${evidenceKey}`;

        if (format === 'svg') {
            const serializer = new XMLSerializer();
            let source = serializer.serializeToString(svgElement);
            if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
                source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
            }
            const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${fileName}.svg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } else {
            const serializer = new XMLSerializer();
            const svgString = serializer.serializeToString(svgElement);
            const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const bbox = svgElement.getBoundingClientRect();
                canvas.width = (bbox.width || 600) * 2;
                canvas.height = (bbox.height || 400) * 2;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.scale(2, 2);
                ctx.drawImage(img, 0, 0);
                const pngUrl = canvas.toDataURL('image/png');
                const a = document.createElement('a');
                a.href = pngUrl;
                a.download = `${fileName}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            };
            img.src = url;
        }
        setActiveDownloadMenu(null);
    };

    const fetchEvidenceChartData = (evidenceKey, evidenceItem) => {
        const evData = evidenceDataMap[evidenceKey];
        const chartData = evData?.chart_data || evData?.resultjson?.chart_data;
        if (chartData) {
            setEvidenceChartDataMap(prev => ({ ...prev, [evidenceKey]: chartData }));
        }
    };

    const [selectedEvidenceStubMap, setSelectedEvidenceStubMap] = useState({});

    const parseStubList = useCallback((list, item) => {
        let stubList = Array.isArray(list) ? list.filter(Boolean) : [];
        if (stubList.length === 0) {
            const single = item?.stub_id || item?.evidence_target?.stub_id || (typeof item?.stubs === 'string' ? item.stubs : null);
            if (single) stubList.push(single);
        }
        return stubList;
    }, []);

    const getEvidenceTargetAndMetric = useCallback((item, evidenceKey) => {
        if (!item) return { target: {}, metric: '', stubId: '', stubList: [], activeEv: null };

        const evidences = Array.isArray(item.evidences) && item.evidences.length > 0 ? item.evidences : null;

        let stubList = [];
        if (evidences) {
            stubList = evidences.map(ev => ev.stub_id || ev.evidence_target?.stub_id).filter(Boolean);
        } else if (item.stubs) {
            stubList = typeof item.stubs === 'string'
                ? item.stubs.split(',').map(s => s.trim()).filter(Boolean)
                : Array.isArray(item.stubs) ? item.stubs.map(s => String(s).trim()).filter(Boolean) : [];
        }

        stubList = parseStubList(stubList, item);

        const selectedStub = selectedEvidenceStubMap[evidenceKey] || stubList[0] || item.stub_id || item.evidence_target?.stub_id || '';

        let activeEv = null;
        if (evidences) {
            activeEv = evidences.find(ev => {
                const sid = ev.stub_id || ev.evidence_target?.stub_id || '';
                return sid === selectedStub || sid.replace(/_stub$/, '') === selectedStub.replace(/_stub$/, '');
            }) || evidences[0];
        }

        const rawTarget = activeEv?.evidence_target || item.evidence_target || {};
        const stubId = selectedStub || activeEv?.stub_id || rawTarget.stub_id || stubList[0] || '';
        const target = { ...rawTarget, stub_id: stubId };

        let metric = activeEv?.evidence_metric || item.evidence_metric || '';
        if (metric && stubId) {
            const labelText = getStubDisplayLabel(stubId);
            if (labelText && labelText !== stubId) {
                metric = metric.replace(/\[[a-zA-Z0-9_]+\]/g, `[${labelText}]`);
            }
        }

        return {
            target,
            metric,
            stubId,
            stubList,
            activeEv
        };
    }, [selectedEvidenceStubMap, parseStubList, getStubDisplayLabel]);

    const fetchEvidenceForTarget = useCallback(async (item, evidenceKey, overrideStub) => {
        const currentStub = overrideStub || selectedEvidenceStubMap[evidenceKey];
        const tempStubMap = currentStub ? { ...selectedEvidenceStubMap, [evidenceKey]: currentStub } : selectedEvidenceStubMap;

        const evidences = Array.isArray(item?.evidences) && item.evidences.length > 0 ? item.evidences : null;
        let stubList = [];
        if (evidences) {
            stubList = evidences.map(ev => ev.stub_id || ev.evidence_target?.stub_id).filter(Boolean);
        } else if (item?.stubs) {
            stubList = typeof item.stubs === 'string'
                ? item.stubs.split(',').map(s => s.trim()).filter(Boolean)
                : Array.isArray(item.stubs) ? item.stubs.map(s => String(s).trim()).filter(Boolean) : [];
        }

        stubList = parseStubList(stubList, item);

        const effectiveStub = currentStub || tempStubMap[evidenceKey] || stubList[0] || item?.stub_id || item?.evidence_target?.stub_id || '';

        let activeEv = null;
        if (evidences) {
            activeEv = evidences.find(ev => {
                const sid = ev.stub_id || ev.evidence_target?.stub_id || '';
                return sid === effectiveStub || sid.replace(/_stub$/, '') === effectiveStub.replace(/_stub$/, '');
            }) || evidences[0];
        }

        const rawTarget = activeEv?.evidence_target || item?.evidence_target || {};
        const stubId = effectiveStub || activeEv?.stub_id || rawTarget.stub_id || stubList[0] || '';
        const target = { ...rawTarget, stub_id: stubId };

        const stubsList = stubId ? [stubId] : [];

        const pageId = sessionStorage.getItem('pageId') || "3fa85f64-5717-4562-b3fc-2c963f66afa6";
        const user = userId || "";

        let contextUiSettings = null;
        try {
            const contextRes = await getOverviewContext.mutateAsync({ pageid: pageId, user });
            const ctxPayload = contextRes?.resultjson || contextRes || {};
            if (ctxPayload.ui_settings && typeof ctxPayload.ui_settings === 'object') {
                contextUiSettings = ctxPayload.ui_settings;
            } else if (ctxPayload.effective_render_settings && typeof ctxPayload.effective_render_settings === 'object') {
                contextUiSettings = ctxPayload.effective_render_settings;
            }
        } catch (ctxErr) {
            console.error("Failed to load context for proof-styled:", ctxErr);
        }

        if (!contextUiSettings) {
            contextUiSettings = {
                font_family: "Pretendard", font_size: 13, format_show_n: true, format_show_percent: true,
                format_percent_as_column: true, format_n_round: 0, format_percent_round: 1, format_percent_symbol: true,
                format_base_prefix: "(", format_base_postfix: ")", sig_diff_fin_mode: "t-test", sig_diff_test_mode: true,
                sig_level: 95, theme_primary: "#2F5597", theme_primary_fg: "#FFFFFF", theme_base_bg: "#F1F5F9",
                theme_base_fg: "#0F172A", stub_group_layout: "merge", zero_display: "-", empty_display: ""
            };
        }

        const bannerName = target.banner_name || item?.banner_name || "";
        const bannerColumn = target.banner_column || item?.banner_column || "";
        let bannerList = bannerColumn && [bannerColumn];
        if (!bannerList) {
            bannerList = bannerName ? [bannerName] : (bannerVars?.[0] ? [bannerVars[0]] : []);
        } else if (typeof bannerList === 'string') {
            bannerList = [bannerList];
        }
        if (!Array.isArray(bannerList)) bannerList = [];

        const proofWeightVar = target.weight_variable || target.weight_col || item?.weight_variable || item?.weight_col || contextUiSettings?.weight_variable || "";

        const proofPayload = {
            pageid: pageId,
            user: user,
            stub_id: stubId,
            stubs: stubsList,
            banner_name: bannerName,
            banner_column: bannerColumn,
            banner: bannerList,
            banner_mode: "override",
            target_column: target.target_column || "",
            compare_column: target.compare_column || "",
            weight_variable: proofWeightVar,
            filter_expression: target.filter_expression || "",
            ui_settings: contextUiSettings,
            include_stats: ["t-test"],
            include_tests: ["t-test"]
        };

        try {
            setEvidenceLoadingMap(prev => ({ ...prev, [evidenceKey]: true }));
            setEvidenceChartDataMap(prev => ({ ...prev, [evidenceKey]: null }));

            const proofRes = await getOverviewProofStyled.mutateAsync(proofPayload);
            const payload = proofRes?.resultjson || proofRes || null;
            setEvidenceDataMap(prev => ({ ...prev, [evidenceKey]: payload }));

            const chartData = payload?.chart_data || payload?.resultjson?.chart_data || proofRes?.chart_data || proofRes?.resultjson?.chart_data || null;
            if (chartData) {
                setEvidenceChartDataMap(prev => ({ ...prev, [evidenceKey]: chartData }));
            }
        } catch (err) {
            console.error("Failed to call /datasets/overview/proof-styled API:", err);
            setEvidenceDataMap(prev => ({ ...prev, [evidenceKey]: null }));
        } finally {
            setEvidenceLoadingMap(prev => ({ ...prev, [evidenceKey]: false }));
        }
    }, [getOverviewContext, getOverviewProofStyled, userId, bannerVars, selectedEvidenceStubMap]);

    const handleEvidenceClick = async (item, evidenceKey, catIdx, sectionTitle, sectionLabel) => {
        setIsPipelineExpanded(false);
        if (openEvidences[evidenceKey]) {
            setOpenEvidences(prev => {
                const next = { ...prev };
                delete next[evidenceKey];
                return next;
            });
            return;
        }

        const updatedEvidence = {
            ...item,
            evidenceKey,
            catIdx,
            sectionTitle,
            sectionLabel
        };
        setOpenEvidences(prev => ({
            ...prev,
            [evidenceKey]: updatedEvidence
        }));

        await fetchEvidenceForTarget(item, evidenceKey);
    };

    const l2Categories = insightData.l2 || [];
    const cachedDisplayCount = typeof l1CountInfo?.cachedCount === 'number'
        ? l1CountInfo.cachedCount
        : Object.keys(insightData.l1 || {}).length;
    const totalDisplayCount = typeof l1CountInfo?.totalCount === 'number'
        ? l1CountInfo.totalCount
        : (typeof l1CountInfo?.cachedCount === 'number' ? l1CountInfo.cachedCount : Object.keys(insightData.l1 || {}).length);
    const unsummarizedCount = (Array.isArray(missingVariables) && missingVariables.length > 0)
        ? missingVariables.length
        : Math.max(0, totalDisplayCount - cachedDisplayCount);

    const allEvidenceItems = useMemo(() => {
        const items = [];
        l2Categories.forEach((catItem, catIdx) => {
            const insights = catItem?.insights || {};
            // 1. Core Findings
            if (Array.isArray(insights.core_finding)) {
                insights.core_finding.forEach((item, idx) => {
                    items.push({
                        ...item,
                        catIdx,
                        evidenceKey: 'core_' + catIdx + '_' + idx,
                        sectionTitle: '핵심 정량 분석',
                        sectionLabel: '핵심 분석 근거'
                    });
                });
            }
            // 2. Action Plan (so_what)
            if (Array.isArray(insights.so_what)) {
                insights.so_what.forEach((item, idx) => {
                    items.push({
                        ...item,
                        catIdx,
                        evidenceKey: 'sowhat_' + catIdx + '_' + idx,
                        sectionTitle: '전략적 시사점 & 액션 플랜',
                        sectionLabel: '전략 과제 근거'
                    });
                });
            }
            // 3. Demographic Profile (respondent_characteristics_summary)
            if (Array.isArray(insights.respondent_characteristics_summary)) {
                insights.respondent_characteristics_summary.forEach((item, idx) => {
                    items.push({
                        ...item,
                        catIdx,
                        evidenceKey: 'profile_' + catIdx + '_' + idx,
                        sectionTitle: '타겟 세그먼트 프로필',
                        sectionLabel: '세그먼트 특징 근거'
                    });
                });
            }
        });
        return items;
    }, [l2Categories]);

    useEffect(() => {
        setOpenEvidences({});
        setEvidenceDataMap({});
        setEvidenceLoadingMap({});
        setCrosstabTabMap({});
    }, [activeCategoryIndex]);



    const renderCrosstabTable = (evidenceKey, evidenceItem) => {
        const isEvidenceLoading = !!evidenceLoadingMap[evidenceKey];
        if (isEvidenceLoading) {
            return (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '140px', color: '#64748b', fontSize: '13px' }}>
                    <RefreshCw className="animate-spin" size={18} style={{ marginRight: '6px' }} />
                    <span>데이터를 불러오는 중입니다...</span>
                </div>
            );
        }

        const evidenceCrosstabData = evidenceDataMap[evidenceKey];
        const selectedEvidence = evidenceItem || openEvidences[evidenceKey];

        // 1. Check if backend API returned raw HTML table content
        const rawHtml =
            evidenceCrosstabData?.tables?.[0]?.html ||
            evidenceCrosstabData?.html ||
            evidenceCrosstabData?.resultjson?.tables?.[0]?.html ||
            evidenceCrosstabData?.resultjson?.html ||
            selectedEvidence?.crosstab_html ||
            selectedEvidence?.tables?.[0]?.html ||
            selectedEvidence?.html;

        const styleCss =
            evidenceCrosstabData?.style_css ||
            evidenceCrosstabData?.resultjson?.style_css ||
            selectedEvidence?.style_css ||
            selectedEvidence?.resultjson?.style_css;

        if (rawHtml) {
            return (
                <div className="proof-table-container hsrt-styled-table-container" style={{ overflowX: 'auto', maxHeight: '420px' }}>
                    {styleCss && <style dangerouslySetInnerHTML={{ __html: styleCss }} />}
                    <div dangerouslySetInnerHTML={{ __html: rawHtml }} />
                </div>
            );
        }

        let colHeaders = [];
        let rowsData = [];

        const targetGroup = selectedEvidence?.evidence_target?.target_column || '';
        const displayTargetName = targetGroup || '2030 세대';

        if (evidenceCrosstabData && evidenceCrosstabData.columns && evidenceCrosstabData.rows) {
            const columns = evidenceCrosstabData.columns;
            const rows = evidenceCrosstabData.rows;

            let overallIndex = columns.findIndex(c => {
                const label = typeof c === 'object' ? c.label || c.name : String(c);
                return label === '전체' || label === 'Total' || label === '합계';
            });
            if (overallIndex === -1) overallIndex = 0;

            let targetIndex = columns.findIndex(c => {
                const label = typeof c === 'object' ? c.label || c.name : String(c);
                return label.toLowerCase().includes(targetGroup.toLowerCase());
            });
            if (targetIndex === -1) targetIndex = columns.length > 1 ? 1 : 0;

            colHeaders = [
                { label: '구분', index: -1 },
                { label: '전체', index: overallIndex },
                { label: '★ ' + (typeof columns[targetIndex] === 'object' ? columns[targetIndex].label : columns[targetIndex]), index: targetIndex }
            ];

            rowsData = rows.map(r => ({
                label: r.label,
                values: colHeaders.slice(1).map(col => {
                    const valObj = r.values[col.index];
                    return valObj ? parseFloat(valObj.percent || 0).toFixed(1) + '%' : '-';
                })
            }));
        } else {
            colHeaders = [
                { label: '구분', index: -1 },
                { label: '전체', index: 0 },
                { label: '★ ' + displayTargetName, index: 1 }
            ];

            rowsData = [
                { label: '매우 만족', values: ['14.0%', '18.0%'] },
                { label: '만족', values: ['35.0%', '45.8%'] },
                { label: '보통', values: ['40.0%', '29.2%'] },
                { label: '불만족', values: ['7.0%', '5.0%'] },
                { label: '매우 불만족', values: ['4.0%', '2.0%'] },
                { label: 'Top2 (긍정)', values: ['49.0%', '63.8%'] },
                { label: 'Bot2 (부정)', values: ['11.0%', '7.0%'] }
            ];
        }

        return (
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                            {colHeaders.map((col, idx) => (
                                <th
                                    key={idx}
                                    style={{
                                        padding: '9px 14px',
                                        fontWeight: idx === 2 ? 700 : 500,
                                        color: idx === 2 ? '#2563eb' : '#64748b',
                                        textAlign: idx === 0 ? 'left' : 'center',
                                        background: idx === 2 ? '#f8fafc' : 'transparent',
                                        width: idx === 0 ? '34%' : '33%'
                                    }}
                                >
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rowsData.map((row, rIdx) => {
                            const isTopOrBot = row.label.includes('Top') || row.label.includes('Bot');
                            return (
                                <tr
                                    key={rIdx}
                                    style={{
                                        borderBottom: '1px solid #f1f5f9',
                                        fontWeight: isTopOrBot ? 700 : 400,
                                        color: isTopOrBot ? '#0f172a' : '#334155'
                                    }}
                                >
                                    <td style={{ padding: '8.5px 14px', textAlign: 'left', color: isTopOrBot ? '#0f172a' : '#475569' }}>
                                        {row.label}
                                    </td>
                                    {row.values.map((val, vIdx) => (
                                        <td
                                            key={vIdx}
                                            style={{
                                                padding: '8.5px 14px',
                                                textAlign: 'center',
                                                color: vIdx === 1 ? '#2563eb' : (isTopOrBot ? '#0f172a' : '#334155'),
                                                background: vIdx === 1 ? '#f8fafc' : 'transparent',
                                                fontWeight: vIdx === 1 ? 700 : (isTopOrBot ? 700 : 400)
                                            }}
                                        >
                                            {val}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    const renderChartToolbar = (evidenceKey, evidenceItem) => {
        const currentChartMode = chartModeMap[evidenceKey] || 'column';
        const currentPaletteId = paletteIdMap[evidenceKey] || 'default';
        const currentShowLegend = showLegendMap[evidenceKey] !== undefined ? showLegendMap[evidenceKey] : false;
        const currentChartDataType = chartDataTypeMap[evidenceKey] || 'percentage';
        const currentShowChartValues = showChartValuesMap[evidenceKey] !== undefined ? showChartValuesMap[evidenceKey] : true;
        const currentShowPercentSymbol = showPercentSymbolMap[evidenceKey] !== undefined ? showPercentSymbolMap[evidenceKey] : true;
        const activeDropdown = openDropdownMap[evidenceKey] || null;

        const toggleDropdown = (menuType) => {
            setOpenDropdownMap(prev => ({
                ...prev,
                [evidenceKey]: prev[evidenceKey] === menuType ? null : menuType
            }));
        };

        const closeDropdown = () => {
            setOpenDropdownMap(prev => ({ ...prev, [evidenceKey]: null }));
        };

        return (
            <div className="chart-type-toolbar" style={{ display: 'inline-flex', alignItems: 'center', background: '#f1f5f9', padding: '3px 6px', borderRadius: '8px', gap: '4px' }}>
                {/* 1. Download PNG / SVG Menu */}
                <div style={{ position: 'relative' }}>
                    <button
                        className={`view-option-btn download-btn ${activeDropdown === 'download' ? 'active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); toggleDropdown('download'); }}
                        title="다운로드"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', background: activeDropdown === 'download' ? '#ffffff' : '#f1f5f9', border: activeDropdown === 'download' ? '1px solid #cbd5e1' : 'none', borderRadius: '6px', cursor: 'pointer', color: '#475569' }}
                    >
                        <Download size={14} />
                    </button>
                    {activeDropdown === 'download' && (
                        <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, left: 'auto', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', zIndex: 1100, minWidth: '130px', padding: '4px 0' }}>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleChartDownload(evidenceKey, 'png'); closeDropdown(); }}
                                style={{ width: '100%', textAlign: 'left', padding: '6px 12px', fontSize: '12px', border: 'none', background: 'none', cursor: 'pointer', color: '#334155', whiteSpace: 'nowrap' }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                            >
                                PNG (이미지)
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleChartDownload(evidenceKey, 'svg'); closeDropdown(); }}
                                style={{ width: '100%', textAlign: 'left', padding: '6px 12px', fontSize: '12px', border: 'none', background: 'none', cursor: 'pointer', color: '#334155', whiteSpace: 'nowrap' }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                            >
                                SVG (PPT용)
                            </button>
                        </div>
                    )}
                </div>

                {/* 2. Color Palette Theme Selector */}
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleDropdown('palette'); }}
                        title="색상 테마 설정"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', background: activeDropdown === 'palette' ? '#ffffff' : '#f1f5f9', border: activeDropdown === 'palette' ? '1px solid #cbd5e1' : 'none', borderRadius: '6px', cursor: 'pointer' }}
                    >
                        {(() => {
                            const theme = CHART_THEME_OPTIONS.find(opt => opt.id === currentPaletteId) || CHART_THEME_OPTIONS[0];
                            const colors = theme.preview;
                            return (
                                <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: `conic-gradient(${colors[0]}, ${colors[1]}, ${colors[2]}, ${colors[0]})` }} />
                            );
                        })()}
                    </button>
                    {activeDropdown === 'palette' && (
                        <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, left: 'auto', minWidth: '160px', zIndex: 1100, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '4px 0', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}>
                            {CHART_THEME_OPTIONS.map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={(e) => { e.stopPropagation(); setPaletteIdMap(prev => ({ ...prev, [evidenceKey]: opt.id })); closeDropdown(); }}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '6px 12px', fontSize: '12px', border: 'none', background: currentPaletteId === opt.id ? '#eff6ff' : 'none', cursor: 'pointer', color: currentPaletteId === opt.id ? '#2563eb' : '#334155', fontWeight: currentPaletteId === opt.id ? 700 : 400 }}
                                    onMouseEnter={(e) => { if (currentPaletteId !== opt.id) e.currentTarget.style.background = '#f8fafc'; }}
                                    onMouseLeave={(e) => { if (currentPaletteId !== opt.id) e.currentTarget.style.background = 'none'; }}
                                >
                                    <div style={{ display: 'flex', gap: '2px' }}>
                                        {opt.preview.map((c, i) => <div key={i} style={{ width: '8px', height: '8px', borderRadius: '1px', background: c }} />)}
                                    </div>
                                    <span>{opt.name}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ width: '1px', height: '14px', background: '#cbd5e1', margin: '0 2px' }} />

                {/* 3. Legend Toggle Button */}
                <button
                    onClick={(e) => { e.stopPropagation(); setShowLegendMap(prev => ({ ...prev, [evidenceKey]: !currentShowLegend })); }}
                    title="범례 보기/숨기기"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', border: `1px solid ${currentShowLegend ? '#3b82f6' : '#e2e8f0'}`, borderRadius: '6px', background: currentShowLegend ? '#eff6ff' : '#ffffff', color: currentShowLegend ? '#2563eb' : '#64748b', fontSize: '12px', fontWeight: 600, cursor: 'pointer', height: '28px' }}
                >
                    <LayoutList size={14} style={{ flexShrink: 0 }} />
                    <span style={{ whiteSpace: 'nowrap' }}>범례</span>
                </button>

                <div style={{ width: '1px', height: '14px', background: '#cbd5e1', margin: '0 2px' }} />

                {/* 4. Options Button */}
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleDropdown('options'); }}
                        title="차트 옵션"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '12px', fontWeight: 600, border: `1px solid ${activeDropdown === 'options' ? '#3b82f6' : '#e2e8f0'}`, borderRadius: '6px', background: activeDropdown === 'options' ? '#eff6ff' : '#ffffff', color: activeDropdown === 'options' ? '#2563eb' : '#64748b', cursor: 'pointer', height: '28px' }}
                    >
                        <Settings size={14} style={{ flexShrink: 0 }} />
                        <span style={{ whiteSpace: 'nowrap' }}>옵션</span>
                    </button>

                    {activeDropdown === 'options' && (
                        <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, left: 'auto', minWidth: '220px', zIndex: 1100, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px', textAlign: 'left' }}>차트 표출 데이터</span>
                                <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '6px', padding: '4px' }}>
                                    <div
                                        onClick={(e) => { e.stopPropagation(); setChartDataTypeMap(prev => ({ ...prev, [evidenceKey]: 'frequency' })); }}
                                        style={{ flex: 1, textAlign: 'center', padding: '6px 0', fontSize: '12px', fontWeight: currentChartDataType === 'frequency' ? 700 : 500, color: currentChartDataType === 'frequency' ? '#2563eb' : '#64748b', background: currentChartDataType === 'frequency' ? '#ffffff' : 'transparent', borderRadius: '4px', cursor: 'pointer', boxShadow: currentChartDataType === 'frequency' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}
                                    >
                                        빈도
                                    </div>
                                    <div
                                        onClick={(e) => { e.stopPropagation(); setChartDataTypeMap(prev => ({ ...prev, [evidenceKey]: 'percentage' })); }}
                                        style={{ flex: 1, textAlign: 'center', padding: '6px 0', fontSize: '12px', fontWeight: currentChartDataType === 'percentage' ? 700 : 500, color: currentChartDataType === 'percentage' ? '#2563eb' : '#64748b', background: currentChartDataType === 'percentage' ? '#ffffff' : 'transparent', borderRadius: '4px', cursor: 'pointer', boxShadow: currentChartDataType === 'percentage' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}
                                    >
                                        비율
                                    </div>
                                </div>
                            </div>
                            <div style={{ height: '1px', background: '#e2e8f0' }} />
                            <div>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px', textAlign: 'left' }}>차트 값 표기</span>
                                <div
                                    onClick={(e) => { e.stopPropagation(); setShowChartValuesMap(prev => ({ ...prev, [evidenceKey]: !currentShowChartValues })); }}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '4px 0' }}
                                >
                                    <span style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>값 표출하기</span>
                                    <div style={{ width: '36px', height: '20px', background: currentShowChartValues ? '#3b82f6' : '#e2e8f0', borderRadius: '20px', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
                                        <div style={{ position: 'absolute', top: '2px', left: currentShowChartValues ? '18px' : '2px', width: '16px', height: '16px', background: '#ffffff', borderRadius: '50%', transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }} />
                                    </div>
                                </div>
                                {currentChartDataType !== 'frequency' && (
                                    <div
                                        onClick={(e) => { e.stopPropagation(); setShowPercentSymbolMap(prev => ({ ...prev, [evidenceKey]: !currentShowPercentSymbol })); }}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '4px 0', marginTop: '8px' }}
                                    >
                                        <span style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>% 표출</span>
                                        <div style={{ width: '36px', height: '20px', background: currentShowPercentSymbol ? '#3b82f6' : '#e2e8f0', borderRadius: '20px', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
                                            <div style={{ position: 'absolute', top: '2px', left: currentShowPercentSymbol ? '18px' : '2px', width: '16px', height: '16px', background: '#ffffff', borderRadius: '50%', transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ width: '1px', height: '14px', background: '#cbd5e1', margin: '0 2px' }} />

                {/* 5. 2-Tier Style Chart Type Dropdown Button! */}
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleDropdown('chartType'); }}
                        title="차트 타입 변경"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', border: `1px solid ${activeDropdown === 'chartType' ? '#3b82f6' : '#cbd5e1'}`, borderRadius: '6px', background: activeDropdown === 'chartType' ? '#eff6ff' : '#ffffff', color: activeDropdown === 'chartType' ? '#2563eb' : '#64748b', cursor: 'pointer' }}
                    >
                        {CHART_TYPE_OPTIONS.find(opt => opt.id === currentChartMode)?.icon || <BarChart2 size={16} />}
                    </button>

                    {activeDropdown === 'chartType' && (
                        <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, left: 'auto', minWidth: '160px', zIndex: 1100, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', maxHeight: '260px', overflowY: 'auto', padding: '4px 0' }}>
                            {CHART_TYPE_OPTIONS.map((option) => (
                                <button
                                    key={option.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setChartModeMap(prev => ({ ...prev, [evidenceKey]: option.id }));
                                        closeDropdown();
                                    }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '8px 14px', fontSize: '13px', border: 'none',
                                        background: currentChartMode === option.id ? '#eff6ff' : 'transparent',
                                        color: currentChartMode === option.id ? '#2563eb' : '#334155',
                                        fontWeight: currentChartMode === option.id ? 700 : 500,
                                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s'
                                    }}
                                    onMouseEnter={(e) => { if (currentChartMode !== option.id) e.currentTarget.style.background = '#f8fafc'; }}
                                    onMouseLeave={(e) => { if (currentChartMode !== option.id) e.currentTarget.style.background = 'transparent'; }}
                                >
                                    {option.icon}
                                    <span>{option.label}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderCrosstabChart = (evidenceKey, evidenceItem) => {
        const isChartLoading = !!evidenceChartLoadingMap[evidenceKey];
        const chartApiPayload = evidenceChartDataMap[evidenceKey];
        const evidenceCrosstabData = evidenceDataMap[evidenceKey];
        const selectedEvidence = evidenceItem || openEvidences[evidenceKey];

        if (!chartApiPayload && !isChartLoading && evidenceChartDataMap[evidenceKey] === undefined) {
            fetchEvidenceChartData(evidenceKey, evidenceItem);
        }

        if (isChartLoading) {
            return (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '260px', color: '#64748b', fontSize: '13px' }}>
                    <RefreshCw className="animate-spin" size={20} style={{ marginRight: '8px' }} />
                    <span>차트 데이터를 불러오는 중입니다...</span>
                </div>
            );
        }

        const currentChartMode = chartModeMap[evidenceKey] || 'column';
        const currentPaletteId = paletteIdMap[evidenceKey] || 'default';
        const currentShowLegend = showLegendMap[evidenceKey] !== undefined ? showLegendMap[evidenceKey] : false;
        const currentChartDataType = chartDataTypeMap[evidenceKey] || 'percentage';
        const currentShowChartValues = showChartValuesMap[evidenceKey] !== undefined ? showChartValuesMap[evidenceKey] : true;
        const currentShowPercentSymbol = showPercentSymbolMap[evidenceKey] !== undefined ? showPercentSymbolMap[evidenceKey] : true;

        let kendoData = [];
        let kendoSeriesNames = [];

        // 1. Primary: from chart-data API
        if (chartApiPayload && chartApiPayload.labels && chartApiPayload.series) {
            const labels = chartApiPayload.labels || [];
            const series = chartApiPayload.series || [];

            kendoData = labels.map((lbl, idx) => {
                const row = { name: lbl.label || lbl.key || `항목 ${idx + 1}` };
                series.forEach(s => {
                    let val = 0;
                    if (currentChartDataType === 'frequency') {
                        if (s.count && typeof s.count[idx] === 'number') {
                            val = s.count[idx];
                        } else if (s.percent && typeof s.percent[idx] === 'number') {
                            val = s.percent[idx];
                        }
                    } else {
                        if (s.percent && typeof s.percent[idx] === 'number') {
                            val = s.percent[idx];
                        } else if (s.count && typeof s.count[idx] === 'number') {
                            val = s.count[idx];
                        }
                    }
                    row[s.key] = val;
                });
                return row;
            });

            kendoSeriesNames = series.map(s => ({
                field: s.key,
                name: s.label || s.key
            }));
        }
        // 2. Secondary: from proof-styled crosstab API data
        else if (evidenceCrosstabData && evidenceCrosstabData.columns && evidenceCrosstabData.rows) {
            const columns = evidenceCrosstabData.columns;
            const rows = evidenceCrosstabData.rows;

            const validCols = columns.filter((col) => {
                const lbl = typeof col === 'object' ? col.label || col.name : String(col);
                return lbl !== '구분' && lbl !== '변수명';
            });

            kendoSeriesNames = validCols.map((col, cIdx) => ({
                field: `col_${cIdx}`,
                name: typeof col === 'object' ? col.label || col.name : String(col)
            }));

            kendoData = rows.map(r => {
                const rowObj = { name: r.label || r.name };
                validCols.forEach((col, cIdx) => {
                    const originalIdx = columns.indexOf(col);
                    const valObj = r.values ? r.values[originalIdx] : null;
                    let numVal = 0;
                    if (valObj) {
                        if (currentChartDataType === 'frequency') {
                            numVal = parseFloat(valObj.count ?? valObj.percent ?? 0);
                        } else {
                            numVal = parseFloat(valObj.percent ?? valObj.count ?? 0);
                        }
                    }
                    rowObj[`col_${cIdx}`] = numVal;
                });
                return rowObj;
            });
        }

        return (
            <div
                ref={el => { chartContainerRefs.current[evidenceKey] = el; }}
                style={{ height: '340px', maxHeight: '360px', overflowX: 'auto', overflowY: 'auto', position: 'relative', width: '100%', minWidth: 0, marginTop: '6px' }}
            >
                <KendoChart
                    key={`${evidenceKey}-${currentChartMode}-${currentPaletteId}-${currentShowLegend}-${currentShowChartValues}-${currentShowPercentSymbol}-${currentChartDataType}`}
                    data={kendoData}
                    seriesNames={kendoSeriesNames}
                    initialType={currentChartMode}
                    allowedTypes={[currentChartMode]}
                    labelLimit={12}
                    suffix={currentShowPercentSymbol && currentChartDataType !== 'frequency' ? '%' : ''}
                    isPercent={currentChartDataType === 'percentage'}
                    paletteId={currentPaletteId}
                    hideHeader={true}
                    externalShowLegend={currentShowLegend}
                    showLabels={currentShowChartValues}
                    allowAggregate={true}
                />
            </div>
        );
    };

    const renderEvidenceTabbedContainer = (evidenceKey, evidenceItem) => {
        const activeTab = crosstabTabMap[evidenceKey] || 'table';

        return (
            <div style={{
                marginTop: '10px',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                background: '#ffffff',
                padding: '14px 16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                width: '100%',
                minWidth: 0,
                boxSizing: 'border-box',
                overflowX: 'auto'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                    marginBottom: '12px'
                }}>
                    <div style={{
                        display: 'inline-flex',
                        background: '#f1f5f9',
                        padding: '3px',
                        borderRadius: '8px',
                        gap: '2px'
                    }}>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setCrosstabTabMap(prev => ({ ...prev, [evidenceKey]: 'table' }));
                            }}
                            style={{
                                padding: '4px 14px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: activeTab === 'table' ? 700 : 500,
                                color: activeTab === 'table' ? '#2563eb' : '#64748b',
                                background: activeTab === 'table' ? '#ffffff' : 'transparent',
                                border: 'none',
                                boxShadow: activeTab === 'table' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            요약표
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setCrosstabTabMap(prev => ({ ...prev, [evidenceKey]: 'chart' }));
                                fetchEvidenceChartData(evidenceKey, evidenceItem);
                            }}
                            style={{
                                padding: '4px 14px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: activeTab === 'chart' ? 700 : 500,
                                color: activeTab === 'chart' ? '#2563eb' : '#64748b',
                                background: activeTab === 'chart' ? '#ffffff' : 'transparent',
                                border: 'none',
                                boxShadow: activeTab === 'chart' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            차트
                        </button>
                    </div>

                    {activeTab === 'chart' && (
                        <div style={{ marginLeft: 'auto' }}>
                            {renderChartToolbar(evidenceKey, evidenceItem)}
                        </div>
                    )}
                </div>

                {activeTab === 'table' ? renderCrosstabTable(evidenceKey, evidenceItem) : renderCrosstabChart(evidenceKey, evidenceItem)}
            </div>
        );
    };


    const keys = Object.keys(insightData.l1 || {});
    const allExpanded = keys.length > 0 && keys.every(key => !!expandedL1Cards[key]);

    const handleToggleAll = () => {
        if (allExpanded) {
            setExpandedL1Cards({});
        } else {
            const newExpanded = {};
            keys.forEach(key => {
                newExpanded[key] = true;
            });
            setExpandedL1Cards(newExpanded);
        }
    };

    const renderBulletText = (textVal) => {
        if (!textVal) return null;
        const str = typeof textVal === 'string' ? textVal : '';
        if (!str) return null;

        const lines = str.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '2px 0' }}>
                {lines.map((line, lIdx) => {
                    const cleaned = line.replace(/^[-*•\s]+/, '').trim();
                    return (
                        <div key={lIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                            <span style={{ color: '#2563eb', fontSize: '11px', marginTop: '3px', flexShrink: 0 }}>•</span>
                            <span style={{ fontSize: '12px', color: '#334155', lineHeight: '1.5', flex: 1, wordBreak: 'keep-all' }}>
                                {cleaned}
                            </span>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderStubChips = (stubs, findItem, evidenceKey) => {
        if (!findItem) return null;
        const { stubList, stubId: currentStub } = getEvidenceTargetAndMetric(findItem, evidenceKey);

        if (!stubList || stubList.length === 0) return null;

        return (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>근거문항:</span>
                {stubList.map((stub, sIdx) => {
                    const isSelectedStub = stub === currentStub || stub.replace(/_stub$/, '') === currentStub.replace(/_stub$/, '');
                    const displayLabel = getStubDisplayLabel(stub);
                    const truncatedLabel = displayLabel.length > 20 ? `${displayLabel.substring(0, 20)}...` : displayLabel;
                    return (
                        <button
                            key={sIdx}
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvidenceStubMap(prev => ({ ...prev, [evidenceKey]: stub }));
                                fetchEvidenceForTarget(findItem, evidenceKey, stub);
                            }}
                            title={`[${displayLabel}] (${stub}) 클릭하여 해당 문항 근거 상세 보기`}
                            style={{
                                background: isSelectedStub ? '#2563eb' : '#eff6ff',
                                color: isSelectedStub ? '#ffffff' : '#1d4ed8',
                                border: `1px solid ${isSelectedStub ? '#2563eb' : '#bfdbfe'}`,
                                borderRadius: '5px',
                                padding: '4px 10px',
                                fontSize: '13px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                lineHeight: 1.3,
                                transition: 'all 0.15s ease-in-out',
                                boxShadow: isSelectedStub ? '0 2px 4px rgba(37, 99, 235, 0.25)' : '0 1px 2px rgba(37, 99, 235, 0.06)',
                                maxWidth: '230px'
                            }}
                        >
                            <span style={{
                                fontSize: '13px',
                                fontWeight: 700,
                                lineHeight: 1,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '210px',
                                display: 'inline-block'
                            }}>
                                {truncatedLabel}
                            </span>
                        </button>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="ai-step-content-container" style={{ gap: '8px', height: '100%', overflowY: 'hidden', boxSizing: 'border-box' }}>
            {/* AI 요약 생성 지침 (한 줄로 표출) */}
            <div className="ai-card" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <span className="ai-guideline-title" style={{ whiteSpace: 'nowrap' }}>AI 요약 생성 지침</span>
                    <span className="ai-guideline-badge">L2·L3 전용</span>
                    <span className="ai-panel-help-icon" title="여기에 입력한 지침은 L2, L3 단계의 분석 프롬프트에 최우선으로 반영되어 리포트가 생성됩니다.">?</span>
                </div>
                <input
                    type="text"
                    className="ai-guideline-input"
                    value={aiGuideline}
                    onChange={(e) => setAiGuideline(e.target.value)}
                    placeholder="AI요약 생성 지침을 작성하세요."
                    style={{ flex: 1, height: '32px', margin: 0 }}
                />
            </div>

            {/* 분석 파이프라인 */}
            <div className="ai-pipeline-section" style={{ flexShrink: 0, margin: 0, paddingBottom: 0 }}>
                {isPipelineExpanded ? (
                    <div style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
                        padding: '12px 14px'
                    }}>
                        {/* Header inside the white card */}
                        <div
                            onClick={() => setIsPipelineExpanded(false)}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '10px',
                                cursor: 'pointer',
                                userSelect: 'none'
                            }}
                            title="클릭하여 파이프라인 접기"
                        >
                            <h3 className="ai-section-main-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                분석 파이프라인
                                <span
                                    className="ai-panel-help-icon"
                                    title="L1이 완료되어야 L2를 생성할 수 있고, L1, L2 결과를 기반으로 L3를 생성합니다. 선행 단계를 재생성하면 하위 단계 결과는 초기화됩니다."
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    ?
                                </span>
                                <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 'normal', marginLeft: '10px' }}>
                                    (각 단계를 클릭하면 하단에 상세 결과가 표시됩니다)
                                </span>
                            </h3>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsPipelineExpanded(false);
                                }}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#2563eb',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '4px',
                                    borderRadius: '4px'
                                }}
                                title="접기"
                            >
                                <ChevronUp size={15} />
                            </button>
                        </div>

                        {/* Grid columns */}
                        <div style={{ display: 'flex', alignItems: 'stretch' }}>
                            {/* Card 1 */}
                            <div
                                className={`ai-pipeline-card l1 ${activeSubTab === 'l1' ? 'active' : ''}`}
                                onClick={() => setActiveSubTab('l1')}
                                title="클릭하여 L1 문항별 인사이트 결과 보기"
                            >
                                {activeSubTab === 'l1' && <div className="ai-pipe-bottom-pointer l1" />}
                                <div className="ai-pipe-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div className="ai-pipe-level-badge level1">L1</div>
                                        <span className="ai-pipe-title">문항별 인사이트 분석</span>
                                        <span className="ai-panel-help-icon" title="교차표 캐시를 로드하고, 아직 요약되지 않은 문항을 일괄 생성합니다.">?</span>
                                    </div>
                                    <div className="ai-pipe-status-row">
                                        <span className={`ai-pipe-status-dot ${pipelineStatus.l1.isGenerating ? 'generating' : pipelineStatus.l1.isDone ? 'done' : 'waiting'}`}></span>
                                        <span className={`ai-pipe-status-text ${pipelineStatus.l1.isGenerating ? 'generating' : pipelineStatus.l1.isDone ? 'done' : 'waiting'}`}>
                                            {pipelineStatus.l1.isGenerating ? (
                                                '분석 중...'
                                            ) : pipelineStatus.l1.isDone ? (
                                                <>
                                                    생성 완료 <span className="ai-pipe-count-pill">{cachedDisplayCount} / {totalDisplayCount}개 문항</span>
                                                </>
                                            ) : (
                                                '분석 대기 중'
                                            )}
                                        </span>
                                    </div>
                                </div>
                                <div className="ai-pipe-progress-container" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                    <div className="ai-pipe-progress-bar" style={{ flex: 1 }}>
                                        <div className="ai-pipe-progress-fill l1" style={{ width: `${formatProgressPercent(pipelineStatus.l1.progress)}%` }}></div>
                                    </div>
                                    {pipelineStatus.l1.progress > 0 && (
                                        <span className="ai-pipe-percent-label">{formatProgressPercent(pipelineStatus.l1.progress)}%</span>
                                    )}
                                    {unsummarizedCount > 0 && pipelineStatus.l1.progress > 0 && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                triggerPipelineRegenerate('l1_missing');
                                            }}
                                            disabled={pipelineStatus.l1.isGenerating}
                                            title={`아직 요약되지 않은 ${unsummarizedCount}개 문항의 L1 AI 요약을 일괄 생성합니다.`}
                                            style={{
                                                background: pipelineStatus.l1.isGenerating ? '#f1f5f9' : '#2563eb',
                                                color: pipelineStatus.l1.isGenerating ? '#94a3b8' : '#ffffff',
                                                border: 'none',
                                                borderRadius: '6px',
                                                padding: '2px 8px',
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                cursor: pipelineStatus.l1.isGenerating ? 'not-allowed' : 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '3px',
                                                boxShadow: pipelineStatus.l1.isGenerating ? 'none' : '0 1.5px 4px rgba(37, 99, 235, 0.25)',
                                                transition: 'all 0.15s ease',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            <Zap size={11} />
                                            <span>미요약 문항 생성 ({unsummarizedCount}개)</span>
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            triggerPipelineRegenerate('l1');
                                        }}
                                        disabled={pipelineStatus.l1.isGenerating}
                                        title="재생성 시 하위 단계(L2-L3) 결과가 초기화됩니다."
                                        className="ai-pipe-regen-btn l1"
                                    >
                                        <RefreshCw size={11} className={pipelineStatus.l1.isGenerating ? 'animate-spin' : ''} />
                                        <span>{pipelineStatus.l1.isGenerating ? '분석 중...' : '재생성'}</span>
                                    </button>
                                </div>
                            </div>

                            <div className="ai-pipeline-arrow-in">
                                <ArrowRight size={16} />
                            </div>

                            {/* Card 2 */}
                            <div
                                className={`ai-pipeline-card l2 ${activeSubTab === 'l2' ? 'active' : ''}`}
                                onClick={() => setActiveSubTab('l2')}
                                title="클릭하여 L2 조사내용별 분석 결과 보기"
                            >
                                {activeSubTab === 'l2' && <div className="ai-pipe-bottom-pointer l2" />}
                                <div className="ai-pipe-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div className="ai-pipe-level-badge level2">L2</div>
                                        <span className="ai-pipe-title">조사내용별 분석</span>
                                        <span className="ai-panel-help-icon" title="L1 문항 요약을 조사내용(카테고리)별로 결합해 가설 검증 핵심 사실전략 제안을 작성합니다.">?</span>
                                    </div>
                                    <div className="ai-pipe-status-row">
                                        <span className={`ai-pipe-status-dot ${pipelineStatus.l2.isGenerating ? 'generating' : pipelineStatus.l2.isDone ? 'done' : 'waiting'}`}></span>
                                        <span className={`ai-pipe-status-text ${pipelineStatus.l2.isGenerating ? 'generating' : pipelineStatus.l2.isDone ? 'done' : 'waiting'}`}>
                                            {pipelineStatus.l2.isGenerating ? (
                                                '분석 중...'
                                            ) : pipelineStatus.l2.isDone ? (
                                                <>
                                                    생성 완료 <span className="ai-pipe-count-pill">{pipelineStatus.l2.countText}</span>
                                                </>
                                            ) : (
                                                '분석 대기 중'
                                            )}
                                        </span>
                                    </div>
                                </div>
                                <div className="ai-pipe-progress-container" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                    <div className="ai-pipe-progress-bar" style={{ flex: 1 }}>
                                        <div className="ai-pipe-progress-fill l2" style={{ width: `${formatProgressPercent(pipelineStatus.l2.progress)}%` }}></div>
                                    </div>
                                    <span className="ai-pipe-percent-label l2">{formatProgressPercent(pipelineStatus.l2.progress)}%</span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            triggerPipelineRegenerate('l2');
                                        }}
                                        disabled={pipelineStatus.l2.isGenerating}
                                        title="재생성 시 하위 단계(L3) 결과가 초기화됩니다."
                                        className="ai-pipe-regen-btn l2"
                                    >
                                        <RefreshCw size={11} className={pipelineStatus.l2.isGenerating ? 'animate-spin' : ''} />
                                        <span>{pipelineStatus.l2.isGenerating ? '분석 중...' : '재생성'}</span>
                                    </button>
                                </div>
                            </div>

                            <div className="ai-pipeline-arrow-in">
                                <ArrowRight size={16} />
                            </div>

                            {/* Card 3 */}
                            <div
                                className={`ai-pipeline-card l3 ${activeSubTab === 'l3' ? 'active' : ''}`}
                                onClick={() => setActiveSubTab('l3')}
                                title="클릭하여 L3 종합 요약 보고서 결과 보기"
                            >
                                {activeSubTab === 'l3' && <div className="ai-pipe-bottom-pointer l3" />}
                                <div className="ai-pipe-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div className="ai-pipe-level-badge level3">L3</div>
                                        <span className="ai-pipe-title">종합 요약 보고서</span>
                                        <span className="ai-panel-help-icon" title="L1, L2 결과를 종합해 Executive Summary와 전략적 액션 아이템을 생성합니다.">?</span>
                                    </div>
                                    <div className="ai-pipe-status-row">
                                        <span className={`ai-pipe-status-dot ${pipelineStatus.l3.isGenerating ? 'generating' : pipelineStatus.l3.isDone ? 'done' : 'waiting'}`}></span>
                                        <span className={`ai-pipe-status-text ${pipelineStatus.l3.isGenerating ? 'generating' : pipelineStatus.l3.isDone ? 'done' : 'waiting'}`}>
                                            {pipelineStatus.l3.isGenerating ? (
                                                '분석 중...'
                                            ) : pipelineStatus.l3.isDone ? (
                                                <>
                                                    생성 완료 <span className="ai-pipe-count-pill">{pipelineStatus.l3.countText}</span>
                                                </>
                                            ) : (
                                                '분석 대기 중'
                                            )}
                                        </span>
                                    </div>
                                </div>
                                <div className="ai-pipe-progress-container" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                    <div className="ai-pipe-progress-bar" style={{ flex: 1 }}>
                                        <div className="ai-pipe-progress-fill l3" style={{ width: `${formatProgressPercent(pipelineStatus.l3.progress)}%` }}></div>
                                    </div>
                                    <span className="ai-pipe-percent-label l3">{formatProgressPercent(pipelineStatus.l3.progress)}%</span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            triggerPipelineRegenerate('l3');
                                        }}
                                        disabled={pipelineStatus.l3.isGenerating}
                                        title="종합 요약 보고서를 다시 생성합니다."
                                        className="ai-pipe-regen-btn l3"
                                    >
                                        <RefreshCw size={11} className={pipelineStatus.l3.isGenerating ? 'animate-spin' : ''} />
                                        <span>{pipelineStatus.l3.isGenerating ? '분석 중...' : '재생성'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '12px',
                            padding: '8px 16px',
                            cursor: 'pointer',
                            height: '48px',
                            boxSizing: 'border-box',
                            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
                            transition: 'all 0.2s ease'
                        }}
                        onClick={() => setIsPipelineExpanded(true)}
                        title="클릭하여 분석 파이프라인 펼치기"
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>분석 파이프라인</span>
                                <span className="ai-panel-help-icon" title="L1이 완료되어야 L2를 생성할 수 있고, L1, L2 결과를 기반으로 L3를 생성합니다.">?</span>
                            </div>

                            <span style={{ height: '14px', width: '1px', backgroundColor: '#cbd5e1', margin: '0 4px' }} />

                            <div style={{ fontSize: '11.5px', display: 'flex', gap: '8px', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                                {/* L1 button */}
                                <button
                                    onClick={() => setActiveSubTab('l1')}
                                    style={{
                                        background: activeSubTab === 'l1' ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' : '#f8fafc',
                                        color: activeSubTab === 'l1' ? '#1d4ed8' : '#475569',
                                        border: activeSubTab === 'l1' ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                                        borderRadius: '20px',
                                        padding: '3px 12px',
                                        fontSize: '11.5px',
                                        fontWeight: activeSubTab === 'l1' ? 800 : 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        boxShadow: activeSubTab === 'l1' ? '0 2px 8px rgba(37, 99, 235, 0.15)' : 'none',
                                        transition: 'all 0.15s ease',
                                        outline: 'none'
                                    }}
                                >
                                    <span className={`ai-pipe-status-dot ${pipelineStatus.l1.isGenerating ? 'generating' : pipelineStatus.l1.isDone ? 'done' : 'waiting'}`} />
                                    <span>L1 문항별 보기</span>
                                    {pipelineStatus.l1.isDone && <span style={{ fontSize: '10px', opacity: 0.85, fontWeight: 700 }}>({pipelineStatus.l1.countText})</span>}
                                </button>

                                <span style={{ color: '#94a3b8', fontSize: '11px', display: 'flex', alignItems: 'center' }}>➔</span>

                                {/* L2 button */}
                                <button
                                    onClick={() => setActiveSubTab('l2')}
                                    style={{
                                        background: activeSubTab === 'l2' ? 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)' : '#f8fafc',
                                        color: activeSubTab === 'l2' ? '#6d28d9' : '#475569',
                                        border: activeSubTab === 'l2' ? '1.5px solid #7c3aed' : '1px solid #e2e8f0',
                                        borderRadius: '20px',
                                        padding: '3px 12px',
                                        fontSize: '11.5px',
                                        fontWeight: activeSubTab === 'l2' ? 800 : 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        boxShadow: activeSubTab === 'l2' ? '0 2px 8px rgba(124, 58, 237, 0.15)' : 'none',
                                        transition: 'all 0.15s ease',
                                        outline: 'none'
                                    }}
                                >
                                    <span className={`ai-pipe-status-dot ${pipelineStatus.l2.isGenerating ? 'generating' : pipelineStatus.l2.isDone ? 'done' : 'waiting'}`} />
                                    <span>L2 조사내용별 보기</span>
                                    {pipelineStatus.l2.isDone && <span style={{ fontSize: '10px', opacity: 0.85, fontWeight: 700 }}>({pipelineStatus.l2.countText})</span>}
                                </button>

                                <span style={{ color: '#94a3b8', fontSize: '11px', display: 'flex', alignItems: 'center' }}>➔</span>

                                {/* L3 button */}
                                <button
                                    onClick={() => setActiveSubTab('l3')}
                                    style={{
                                        background: activeSubTab === 'l3' ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' : '#f8fafc',
                                        color: activeSubTab === 'l3' ? '#047857' : '#475569',
                                        border: activeSubTab === 'l3' ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                                        borderRadius: '20px',
                                        padding: '3px 12px',
                                        fontSize: '11.5px',
                                        fontWeight: activeSubTab === 'l3' ? 800 : 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        boxShadow: activeSubTab === 'l3' ? '0 2px 8px rgba(16, 185, 129, 0.15)' : 'none',
                                        transition: 'all 0.15s ease',
                                        outline: 'none'
                                    }}
                                >
                                    <span className={`ai-pipe-status-dot ${pipelineStatus.l3.isGenerating ? 'generating' : pipelineStatus.l3.isDone ? 'done' : 'waiting'}`} />
                                    <span>L3 종합 요약 보기</span>
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsPipelineExpanded(true);
                            }}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#2563eb',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '4px',
                                borderRadius: '4px'
                            }}
                            title="펼치기"
                        >
                            <ChevronDown size={15} />
                        </button>
                    </div>
                )}
            </div>
            {/* Report list detail section */}
            <div className="ai-report-detail-card" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', paddingBottom: '24px' }}>
                {/* Tabs row */}
                {activeSubTab !== 'l2' && (
                    <div className="ai-detail-tabs-row" style={{ flexShrink: 0 }}>
                        <div className="ai-detail-actions" style={{ width: '100%', justifyContent: 'space-between' }}>
                            {activeSubTab === 'l1' ? (
                                (Array.isArray(missingVariables) && missingVariables.length > 0) ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <button
                                            type="button"
                                            onClick={() => setL1StatusTab('completed')}
                                            style={{
                                                padding: '4px 12px',
                                                borderRadius: '20px',
                                                fontSize: '12.5px',
                                                fontWeight: l1StatusTab === 'completed' ? 700 : 500,
                                                color: l1StatusTab === 'completed' ? '#15803d' : '#64748b',
                                                background: l1StatusTab === 'completed' ? '#f0fdf4' : '#f8fafc',
                                                border: l1StatusTab === 'completed' ? '1.5px solid #16a34a' : '1px solid #cbd5e1',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease',
                                                outline: 'none'
                                            }}
                                        >
                                            요약 완료 {cachedDisplayCount} / {totalDisplayCount} 문항
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setL1StatusTab('missing')}
                                            style={{
                                                padding: '4px 12px',
                                                borderRadius: '20px',
                                                fontSize: '12.5px',
                                                fontWeight: l1StatusTab === 'missing' ? 700 : 500,
                                                color: l1StatusTab === 'missing' ? '#d97706' : '#64748b',
                                                background: l1StatusTab === 'missing' ? '#fffbeb' : '#f8fafc',
                                                border: l1StatusTab === 'missing' ? '1.5px solid #f59e0b' : '1px solid #cbd5e1',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease',
                                                outline: 'none'
                                            }}
                                        >
                                            미완료 {missingVariables.length}개 문항
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span className="ai-detail-status-count">요약 완료 <strong>{cachedDisplayCount} / {totalDisplayCount} 문항</strong></span>
                                    </div>
                                )
                            ) : activeSubTab === 'l2' ? (
                                <span className="ai-detail-status-count">조사내용 <strong>{insightData.l2?.length || 0}개</strong> 카테고리 분석 완료</span>
                            ) : (
                                <span className="ai-detail-status-count"><strong>최종 종합 보고서</strong></span>
                            )}

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {activeSubTab === 'l1' && Object.keys(insightData.l1 || {}).length > 0 && (
                                    <>
                                        <div className="ai-detail-search-wrap">
                                            <input
                                                type="text"
                                                className="ai-detail-search-input"
                                                placeholder="문항 ID 또는 텍스트 검색"
                                                value={l1SearchQuery}
                                                onChange={(e) => setL1SearchQuery(e.target.value)}
                                            />
                                        </div>
                                        <button
                                            className="ai-icon-btn"
                                            title="전체 펼치기/접기"
                                            onClick={handleToggleAll}
                                        >
                                            {allExpanded ? <ChevronsDownUp size={13} /> : <ChevronsUpDown size={13} />}
                                        </button>
                                        <button className="ai-xlsx-btn" onClick={onExportL1Excel} title="Excel">
                                            <FileSpreadsheet size={13} />
                                            <span>Excel</span>
                                        </button>
                                    </>
                                )}
                                {activeSubTab === 'l3' && (pipelineStatus.l3.isDone || !!(insightData.l3?.executive_summary || insightData.l3?.key_takeaways || (insightData.l3?.action_items && insightData.l3.action_items.length > 0))) && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <button
                                            className="ai-pdf-btn"
                                            onClick={() => onExportL3File('pdf')}
                                            title="PDF"
                                        >
                                            <FileText size={13} />
                                            <span>PDF</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Report content blocks */}
                <div className="ai-report-blocks-wrap" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                    {activeSubTab === 'l1' && (
                        <div ref={l1ListScrollRef} style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '8px' }}>
                            {l1StatusTab === 'missing' && Array.isArray(missingVariables) && missingVariables.length > 0 ? (
                                missingVariables.length === 0 ? (
                                    <div className="ai-block-empty-state">
                                        <span>미완료 문항이 없습니다.</span>
                                    </div>
                                ) : (
                                    missingVariables.map((item, idx) => {
                                        const qKey = typeof item === 'object' && item !== null
                                            ? (item.variableId || item.id || item.qnum || String(idx))
                                            : String(item || '');
                                        const matchingQ = questions.find(q => q && (q.id === qKey || q.qnum === qKey));
                                        const labelStr = matchingQ ? (typeof matchingQ.label === 'object' ? (matchingQ.label.text || matchingQ.label.label || JSON.stringify(matchingQ.label)) : String(matchingQ.label || '')) : '';
                                        const qTitle = matchingQ ? `${matchingQ.qnum || matchingQ.id}. ${labelStr}` : String(qKey || '');

                                        if (l1SearchQuery && !qKey.toLowerCase().includes(l1SearchQuery.toLowerCase()) && !qTitle.toLowerCase().includes(l1SearchQuery.toLowerCase())) {
                                            return null;
                                        }

                                        return (
                                            <div className="ai-block-card" key={qKey || idx}>
                                                <div className="ai-block-header" style={{ borderBottom: 'none' }}>
                                                    <div className="ai-block-header-left">
                                                        <span className="ai-block-q-id">{qKey}</span>
                                                        <h4 className="ai-block-q-title">{qTitle}</h4>
                                                        <span className="ai-block-done-badge" style={{ background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' }}>미완료</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )
                            ) : (
                                (!pipelineStatus.l1.isDone || Object.keys(insightData.l1 || {}).length === 0) ? (
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
                                                <div className="ai-block-header" style={{ borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none' }} onClick={() => {
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
                                                                    <span className="ai-panel-help-icon" title="교차표 수치에 근거한 사실 서술입니다. 해석·추론 문장은 포함하지 않습니다.">?</span>
                                                                </div>
                                                                <p className="ai-bullet-body-content">
                                                                    {renderInsightText(l1Val.fact_summary)}
                                                                </p>
                                                            </div>
                                                        )}

                                                        {l1Val.segment_insights && (
                                                            <div className="ai-insight-bullet" style={{ marginTop: '16px' }}>
                                                                <div className="ai-bullet-title-row">
                                                                    <span className="ai-bullet-num-badge">2</span>
                                                                    <span className="ai-bullet-title-text">배너 요약</span>
                                                                    <span className="ai-panel-help-icon" title="각 배너별 주요 유의점 및 뚜렷한 특징 차이를 요약한 결과입니다.">?</span>
                                                                </div>
                                                                <p className="ai-bullet-body-content">
                                                                    {renderInsightText(l1Val.segment_insights)}
                                                                </p>
                                                            </div>
                                                        )}

                                                        {l1Val.respondent_characteristics && (
                                                            <div className="ai-insight-bullet" style={{ marginTop: '16px' }}>
                                                                <div className="ai-bullet-title-row">
                                                                    <span className="ai-bullet-num-badge">{l1Val.segment_insights ? '3' : '2'}</span>
                                                                    <span className="ai-bullet-title-text">응답자 특성 요약</span>
                                                                    <span className="ai-panel-help-icon" title="인구통계 교차축(G1-G2-G3) 기준으로 최대 격차를 보인 집단을 자동 추출한 결과입니다.">?</span>
                                                                </div>
                                                                <div className="ai-insight-result-box">
                                                                    <span className="ai-result-purple-chip">집단 분석 결과</span>
                                                                    <p className="ai-result-text">
                                                                        {renderInsightText(l1Val.respondent_characteristics)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )
                            )}
                        </div>
                    )}

                    {activeSubTab === 'l2' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                            {/* L2 Category Navigation Sub-Tabs Bar (Fixed Top) */}
                            {l2Categories.length === 0 ? (
                                <div className="ai-block-empty-state">
                                    <span>조회된 L2 조사내용별 분석결과가 없습니다.</span>
                                </div>
                            ) : (
                                <>
                                    <div
                                        className="ai-l2-tabs-bar"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            background: '#ffffff',
                                            border: '1.5px solid #cbd5e1',
                                            padding: '8px 16px',
                                            borderRadius: '8px',
                                            color: '#0f172a',
                                            flexShrink: 0,
                                            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
                                        }}
                                    >
                                        {/* Left Controls (Page Indicator, <<, <) */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginRight: '4px' }}>
                                                {activeCategoryIndex === -1 ? '전체' : (activeCategoryIndex + 1) + ' / ' + l2Categories.length}
                                            </span>
                                            <div style={{ display: 'flex', gap: '2px' }}>
                                                <button
                                                    style={{ background: 'transparent', border: 'none', color: activeCategoryIndex === -1 ? '#cbd5e1' : '#2563eb', cursor: activeCategoryIndex === -1 ? 'default' : 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                                                    disabled={activeCategoryIndex === -1}
                                                    onClick={() => setActiveCategoryIndex(-1)}
                                                    title="처음으로"
                                                >
                                                    <ChevronsLeft size={16} />
                                                </button>
                                                <button
                                                    style={{ background: 'transparent', border: 'none', color: activeCategoryIndex === -1 ? '#cbd5e1' : '#2563eb', cursor: activeCategoryIndex === -1 ? 'default' : 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                                                    disabled={activeCategoryIndex === -1}
                                                    onClick={() => setActiveCategoryIndex(prev => prev === 0 ? -1 : prev - 1)}
                                                    title="이전"
                                                >
                                                    <ChevronLeft size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        <div style={{ height: '16px', width: '1px', backgroundColor: '#e2e8f0', flexShrink: 0 }} />

                                        {/* Horizontal Category Tabs (Middle) */}
                                        <div
                                            className="ai-l2-tabs-scroll"
                                            style={{
                                                display: 'flex',
                                                gap: '8px',
                                                overflowX: 'auto',
                                                flex: 1,
                                                scrollbarWidth: 'none',
                                                msOverflowStyle: 'none'
                                            }}
                                        >
                                            {/* 전체보기 Tab */}
                                            <button
                                                ref={activeCategoryIndex === -1 ? activeTabRef : null}
                                                onClick={() => setActiveCategoryIndex(-1)}
                                                style={{
                                                    background: activeCategoryIndex === -1 ? '#2563eb' : '#f1f5f9',
                                                    color: activeCategoryIndex === -1 ? '#ffffff' : '#475569',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    padding: '6px 12px',
                                                    fontSize: '12px',
                                                    fontWeight: activeCategoryIndex === -1 ? 700 : 500,
                                                    whiteSpace: 'nowrap',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease'
                                                }}
                                            >
                                                전체보기
                                            </button>

                                            {l2Categories.map((cat, idx) => {
                                                const isActive = idx === activeCategoryIndex;
                                                return (
                                                    <button
                                                        key={idx}
                                                        ref={isActive ? activeTabRef : null}
                                                        onClick={() => setActiveCategoryIndex(idx)}
                                                        style={{
                                                            background: isActive ? '#2563eb' : '#f1f5f9',
                                                            color: isActive ? '#ffffff' : '#475569',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            padding: '6px 12px',
                                                            fontSize: '12px',
                                                            fontWeight: isActive ? 700 : 500,
                                                            whiteSpace: 'nowrap',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.15s ease'
                                                        }}
                                                    >
                                                        {cat.category_name}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <div style={{ height: '16px', width: '1px', backgroundColor: '#e2e8f0', flexShrink: 0 }} />

                                        {/* Right Controls (>, >>) */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                                            <button
                                                style={{ background: 'transparent', border: 'none', color: activeCategoryIndex === l2Categories.length - 1 ? '#cbd5e1' : '#2563eb', cursor: activeCategoryIndex === l2Categories.length - 1 ? 'default' : 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                                                disabled={activeCategoryIndex === l2Categories.length - 1}
                                                onClick={() => setActiveCategoryIndex(prev => prev === -1 ? 0 : prev + 1)}
                                                title="다음"
                                            >
                                                <ChevronRight size={16} />
                                            </button>
                                            <button
                                                style={{ background: 'transparent', border: 'none', color: activeCategoryIndex === l2Categories.length - 1 ? '#cbd5e1' : '#2563eb', cursor: activeCategoryIndex === l2Categories.length - 1 ? 'default' : 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                                                disabled={activeCategoryIndex === l2Categories.length - 1}
                                                onClick={() => setActiveCategoryIndex(l2Categories.length - 1)}
                                                title="끝으로"
                                            >
                                                <ChevronsRight size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* L2 Category Main Contents (Scrollbar starts BELOW tab bar!) */}
                                    <div
                                        ref={l2ContentScrollRef}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            flex: 1,
                                            minHeight: 0,
                                            overflowY: (activeCategoryIndex === -1 && l2Categories.length <= 9) ? 'hidden' : 'auto',
                                            paddingRight: (activeCategoryIndex === -1 && l2Categories.length <= 9) ? '0' : '6px'
                                        }}
                                    >
                                        {activeCategoryIndex === -1 ? (
                                            /* 전체보기 탭: 9개 이하일 때는 3x3 높이 100% 스크롤 없음, 10개 이상일 때는 세로 스크롤 허용 */
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(3, 1fr)',
                                                gridTemplateRows: l2Categories.length <= 9 ? 'repeat(3, 1fr)' : 'none',
                                                gridAutoRows: l2Categories.length > 9 ? 'minmax(145px, auto)' : 'none',
                                                gap: '10px',
                                                height: l2Categories.length <= 9 ? '100%' : 'auto',
                                                paddingBottom: l2Categories.length > 9 ? '16px' : '0',
                                                boxSizing: 'border-box'
                                            }}>
                                                {l2Categories.map((catItem, idx) => {
                                                    const insights = catItem?.insights || {};
                                                    const hypothesisResult = insights.hypothesis_result || {};

                                                    return (
                                                        <div
                                                            key={idx}
                                                            className="ai-card"
                                                            onClick={() => setActiveCategoryIndex(idx)}
                                                            style={{
                                                                padding: '8px 12px',
                                                                border: '1.5px solid #cbd5e1',
                                                                borderRadius: '10px',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                justifyContent: 'space-between',
                                                                gap: '4px',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s ease',
                                                                height: '100%',
                                                                boxSizing: 'border-box'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.borderColor = '#2563eb';
                                                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.08)';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.borderColor = '#cbd5e1';
                                                                e.currentTarget.style.boxShadow = 'none';
                                                            }}
                                                        >
                                                            {/* Top Row: SLIDE Label & Title & Status Badge */}
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
                                                                    <span style={{
                                                                        color: '#2563eb',
                                                                        fontSize: '11.5px',
                                                                        fontWeight: 800,
                                                                        flexShrink: 0
                                                                    }}>
                                                                        SLIDE {idx + 1}.
                                                                    </span>
                                                                    <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                        {catItem.category_name}
                                                                    </h4>
                                                                </div>
                                                                {(() => {
                                                                    let status = 'NO_DATA';
                                                                    if (typeof hypothesisResult === 'string') {
                                                                        if (
                                                                            hypothesisResult.includes('부분 채택') ||
                                                                            hypothesisResult.includes('부분 기각') ||
                                                                            hypothesisResult.includes('[부분 채택]') ||
                                                                            hypothesisResult.includes('[부분 기각]')
                                                                        ) {
                                                                            status = 'PARTIALLY_ACCEPTED';
                                                                        } else if (
                                                                            hypothesisResult.includes('가설 채택') ||
                                                                            hypothesisResult.includes('가설 지지') ||
                                                                            hypothesisResult.includes('가설 수용') ||
                                                                            hypothesisResult.includes('[채택]') ||
                                                                            hypothesisResult.includes('[가설 지지]') ||
                                                                            hypothesisResult.includes('[가설 수용]')
                                                                        ) {
                                                                            status = 'ACCEPTED';
                                                                        } else if (
                                                                            hypothesisResult.includes('가설 기각') ||
                                                                            hypothesisResult.includes('[기각]') ||
                                                                            hypothesisResult.includes('[가설 기각]')
                                                                        ) {
                                                                            status = 'REJECTED';
                                                                        }
                                                                    } else {
                                                                        status = hypothesisResult?.status || 'NO_DATA';
                                                                    }
                                                                    let label = '데이터 미비';
                                                                    let bg = '#f9fafb';
                                                                    let color = '#4b5563';
                                                                    let border = '1px solid #e5e7eb';

                                                                    if (status === 'ACCEPTED') {
                                                                        label = '채택';
                                                                        bg = '#f0fdf4';
                                                                        color = '#16a34a';
                                                                        border = '1px solid #bbf7d0';
                                                                    } else if (status === 'REJECTED') {
                                                                        label = '기각';
                                                                        bg = '#fef2f2';
                                                                        color = '#dc2626';
                                                                        border = '1px solid #fecaca';
                                                                    } else if (status === 'PARTIALLY_ACCEPTED') {
                                                                        label = '부분 채택';
                                                                        bg = '#fffbeb';
                                                                        color = '#d97706';
                                                                        border = '1px solid #fde68a';
                                                                    }

                                                                    return (
                                                                        <span style={{
                                                                            fontSize: '11px',
                                                                            fontWeight: 700,
                                                                            backgroundColor: bg,
                                                                            color: color,
                                                                            border: border,
                                                                            padding: '2px 7px',
                                                                            borderRadius: '4px',
                                                                            flexShrink: 0
                                                                        }}>
                                                                            {label}
                                                                        </span>
                                                                    );
                                                                })()}
                                                            </div>

                                                            {/* Middle Section: Full summary text ('전체 응답자의 ...') */}
                                                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', margin: '4px 0' }}>
                                                                <p style={{
                                                                    fontSize: '11px',
                                                                    fontWeight: 400,
                                                                    color: '#64748b',
                                                                    lineHeight: '1.4',
                                                                    margin: 0,
                                                                    display: '-webkit-box',
                                                                    WebkitLineClamp: 2,
                                                                    WebkitBoxOrient: 'vertical',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis'
                                                                }}>
                                                                    {(() => {
                                                                        let text = '';
                                                                        if (typeof hypothesisResult === 'string') {
                                                                            text = hypothesisResult;
                                                                        } else if (hypothesisResult) {
                                                                            if (Array.isArray(hypothesisResult.details)) {
                                                                                text = hypothesisResult.details.filter(Boolean).join(' ');
                                                                            } else if (typeof hypothesisResult.details === 'string') {
                                                                                text = hypothesisResult.details;
                                                                            } else if (hypothesisResult.headline) {
                                                                                text = hypothesisResult.headline;
                                                                            }
                                                                        }
                                                                        if (!text && catItem?.insights?.core_finding?.length > 0) {
                                                                            const first = catItem.insights.core_finding[0];
                                                                            text = typeof first === 'string' ? first : first?.finding || first?.text || '';
                                                                        }
                                                                        return text || '가설 검증 요약 정보입니다.';
                                                                    })()}
                                                                </p>
                                                            </div>

                                                            {/* Bottom Row: First KPI Impact */}
                                                            {(() => {
                                                                const firstKpi = Array.isArray(hypothesisResult?.kpi_impacts) && hypothesisResult.kpi_impacts[0];
                                                                if (!firstKpi) return null;
                                                                const isUp = firstKpi.trend === 'UP';
                                                                const isDown = firstKpi.trend === 'DOWN';
                                                                return (
                                                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', borderTop: '1px solid #e2e8f0', paddingTop: '6px', marginTop: 'auto' }}>
                                                                        <span style={{ fontSize: '14.5px', fontWeight: 800, color: '#0f172a' }}>
                                                                            {firstKpi.value}{firstKpi.unit || '%'}
                                                                        </span>
                                                                        {isUp && <span style={{ color: '#059669', fontWeight: 800, fontSize: '12px' }}>↑</span>}
                                                                        {isDown && <span style={{ color: '#dc2626', fontWeight: 800, fontSize: '12px' }}>↓</span>}
                                                                        <span style={{ fontSize: '11.5px', color: '#475569', fontWeight: 600 }}>
                                                                            {firstKpi.label}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            l2Categories.map((catItem, idx) => {
                                                if (idx !== activeCategoryIndex) return null;
                                                const insights = catItem?.insights || {};
                                                const hypothesisResult = insights.hypothesis_result || {};
                                                const coreFindingsList = insights.core_finding || [];
                                                const soWhatList = insights.so_what || [];
                                                const profileList = insights.respondent_characteristics_summary || [];

                                                return (
                                                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                        {/* Category Section Title (Only in 전체보기 mode) */}
                                                        {activeCategoryIndex === -1 && (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '8px', borderBottom: '1.5px solid #cbd5e1', marginTop: idx > 0 ? '28px' : '0' }}>
                                                                <span style={{ color: '#2563eb', fontSize: '11px', fontWeight: 800, backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '2px 8px', lineHeight: '1.2' }}>
                                                                    카테고리 {idx + 1}
                                                                </span>
                                                                <h3 style={{ fontSize: '14.5px', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                                                                    {catItem.category_name}
                                                                </h3>
                                                            </div>
                                                        )}

                                                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '16px', width: '100%', minWidth: 0 }}>
                                                            {/* Left Column wrapper using display: contents to participate in parent grid */}
                                                            <div style={{ display: 'contents' }}>
                                                                {/* 가설 검증 결론 Card (order: 1) */}
                                                                <div className="ai-card" style={{ padding: '14px 18px', border: '1.5px solid #cbd5e1', borderRadius: '12px', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '12px', order: 1, minWidth: 0, width: '100%', height: '100%', boxSizing: 'border-box', boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)' }}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '8px' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                                <CheckCircle2 size={16} color="#2563eb" />
                                                                            </div>
                                                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                                                                <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                                                                                    가설 검증 결론
                                                                                </h4>
                                                                                <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>Hypothesis Conclusion</span>
                                                                            </div>
                                                                        </div>
                                                                        {(() => {
                                                                            let status = 'NO_DATA';
                                                                            if (typeof hypothesisResult === 'string') {
                                                                                if (
                                                                                    hypothesisResult.includes('부분 채택') ||
                                                                                    hypothesisResult.includes('부분 기각') ||
                                                                                    hypothesisResult.includes('[부분 채택]') ||
                                                                                    hypothesisResult.includes('[부분 기각]')
                                                                                ) {
                                                                                    status = 'PARTIALLY_ACCEPTED';
                                                                                } else if (
                                                                                    hypothesisResult.includes('가설 채택') ||
                                                                                    hypothesisResult.includes('가설 지지') ||
                                                                                    hypothesisResult.includes('가설 수용') ||
                                                                                    hypothesisResult.includes('[채택]') ||
                                                                                    hypothesisResult.includes('[가설 지지]') ||
                                                                                    hypothesisResult.includes('[가설 수용]')
                                                                                ) {
                                                                                    status = 'ACCEPTED';
                                                                                } else if (
                                                                                    hypothesisResult.includes('가설 기각') ||
                                                                                    hypothesisResult.includes('[기각]') ||
                                                                                    hypothesisResult.includes('[가설 기각]')
                                                                                ) {
                                                                                    status = 'REJECTED';
                                                                                }
                                                                            } else {
                                                                                status = hypothesisResult?.status || 'NO_DATA';
                                                                            }
                                                                            let label = '데이터 미비';
                                                                            let bg = '#f9fafb';
                                                                            let color = '#4b5563';
                                                                            let border = '1px solid #e5e7eb';

                                                                            if (status === 'ACCEPTED') {
                                                                                label = '채택';
                                                                                bg = '#f0fdf4';
                                                                                color = '#16a34a';
                                                                                border = '1px solid #bbf7d0';
                                                                            } else if (status === 'REJECTED') {
                                                                                label = '기각';
                                                                                bg = '#fef2f2';
                                                                                color = '#dc2626';
                                                                                border = '1px solid #fecaca';
                                                                            } else if (status === 'PARTIALLY_ACCEPTED') {
                                                                                label = '부분 채택';
                                                                                bg = '#fffbeb';
                                                                                color = '#d97706';
                                                                                border = '1px solid #fde68a';
                                                                            }

                                                                            return (
                                                                                <span style={{
                                                                                    fontSize: '11px',
                                                                                    fontWeight: 700,
                                                                                    backgroundColor: bg,
                                                                                    color: color,
                                                                                    border: border,
                                                                                    padding: '2px 8px',
                                                                                    borderRadius: '4px'
                                                                                }}>
                                                                                    {label}
                                                                                </span>
                                                                            );
                                                                        })()}
                                                                    </div>

                                                                    {/* 사전 가설 Box */}
                                                                    {(() => {
                                                                        const matchedCat = categories?.find(c => c.title === catItem?.category_name);
                                                                        const hypothesisText = matchedCat?.desc;
                                                                        if (!hypothesisText || hypothesisText.trim() === '' || hypothesisText === '가설 검증 및 문항 분석') return null;
                                                                        return (
                                                                            <div
                                                                                style={{
                                                                                    background: '#eff6ff',
                                                                                    border: '1px solid #dbeafe',
                                                                                    borderRadius: '6px',
                                                                                    padding: '10px 12px',
                                                                                    display: 'flex',
                                                                                    alignItems: 'flex-start',
                                                                                    gap: '8px'
                                                                                }}
                                                                            >
                                                                                <span style={{
                                                                                    background: '#ffffff',
                                                                                    color: '#2563eb',
                                                                                    border: '1px solid #bfdbfe',
                                                                                    borderRadius: '4px',
                                                                                    padding: '1px 6px',
                                                                                    fontSize: '10px',
                                                                                    fontWeight: 700,
                                                                                    whiteSpace: 'nowrap'
                                                                                }}>
                                                                                    사전 가설
                                                                                </span>
                                                                                <span style={{ fontSize: '12px', color: '#1e3a8a', lineHeight: '1.5' }}>
                                                                                    &quot;{hypothesisText}&quot;
                                                                                </span>
                                                                            </div>
                                                                        );
                                                                    })()}

                                                                    {/* 가설 설명 서술 영역 */}
                                                                    <div style={{ fontSize: '12px', lineHeight: '1.6', color: '#334155' }}>
                                                                        {hypothesisResult?.headline && (
                                                                            <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '6px', fontSize: '14px', letterSpacing: '-0.02em' }}>
                                                                                {hypothesisResult.headline}
                                                                            </div>
                                                                        )}
                                                                        {Array.isArray(hypothesisResult?.details) ? (
                                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '2px 0' }}>
                                                                                {hypothesisResult.details.map((dt, dtIdx) => (
                                                                                    <div key={dtIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                                                                        <span style={{ color: '#2563eb', fontSize: '11px', marginTop: '3px', flexShrink: 0 }}>•</span>
                                                                                        <span style={{ fontSize: '12px', color: '#334155', lineHeight: '1.55', flex: 1, wordBreak: 'keep-all' }}>
                                                                                            {dt}
                                                                                        </span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        ) : typeof hypothesisResult?.details === 'string' ? (
                                                                            renderBulletText(hypothesisResult.details)
                                                                        ) : typeof hypothesisResult === 'string' ? (
                                                                            renderBulletText(hypothesisResult)
                                                                        ) : (
                                                                            <p style={{ margin: 0, fontSize: '12px', color: '#334155' }}>{hypothesisResult?.details || '가설 검증 의견이 서술되지 않았습니다.'}</p>
                                                                        )}
                                                                    </div>

                                                                    {/* KPI Impacts Cards Grid */}
                                                                    {Array.isArray(hypothesisResult?.kpi_impacts) && hypothesisResult.kpi_impacts.length > 0 && (
                                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '4px' }}>
                                                                            {hypothesisResult.kpi_impacts.map((kpi, kIdx) => {
                                                                                const isUp = kpi.trend === 'UP';
                                                                                const isDown = kpi.trend === 'DOWN';
                                                                                return (
                                                                                    <div
                                                                                        key={kIdx}
                                                                                        style={{
                                                                                            border: '1px solid #e2e8f0',
                                                                                            borderRadius: '8px',
                                                                                            padding: '12px',
                                                                                            backgroundColor: '#ffffff',
                                                                                            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.02)'
                                                                                        }}
                                                                                    >
                                                                                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={kpi.label}>
                                                                                            {kpi.label}
                                                                                        </div>
                                                                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                                                                            <span style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b' }}>
                                                                                                {kpi.value}{kpi.unit || '%'}
                                                                                            </span>
                                                                                            {isUp && <span style={{ color: '#059669', fontWeight: 800, fontSize: '14px', marginLeft: '4px' }}>↑</span>}
                                                                                            {isDown && <span style={{ color: '#dc2626', fontWeight: 800, fontSize: '14px', marginLeft: '4px' }}>↓</span>}
                                                                                            {!isUp && !isDown && <span style={{ color: '#64748b', fontWeight: 800, fontSize: '14px', marginLeft: '4px' }}>-</span>}
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* 핵심 정량 분석 Card (order: 3) */}
                                                                <div className="ai-card" style={{ padding: '14px 18px', border: '1.5px solid #cbd5e1', borderRadius: '12px', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '12px', order: 3, minWidth: 0, width: '100%', height: '100%', boxSizing: 'border-box', boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '8px' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                                <BarChart2 size={16} color="#2563eb" />
                                                                            </div>
                                                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                                                                <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                                                                                    핵심 정량 분석
                                                                                </h4>
                                                                                <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>Core Findings</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                                        {Array.isArray(coreFindingsList) && coreFindingsList.length > 0 ? (
                                                                            coreFindingsList.map((find, fIdx) => {
                                                                                const evidenceKey = 'core_' + idx + '_' + fIdx;
                                                                                const isSelected = !!openEvidences[evidenceKey];
                                                                                return (
                                                                                    <div
                                                                                        key={fIdx}
                                                                                        style={{
                                                                                            display: 'flex',
                                                                                            flexDirection: 'column',
                                                                                            gap: '10px',
                                                                                            padding: '14px 16px',
                                                                                            borderRadius: '10px',
                                                                                            background: '#ffffff',
                                                                                            border: isSelected ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
                                                                                            boxShadow: isSelected ? '0 4px 12px rgba(59, 130, 246, 0.12)' : '0 2px 6px rgba(15, 23, 42, 0.04)',
                                                                                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                                                                        }}
                                                                                    >
                                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                                                                                                <span style={{
                                                                                                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                                                                                                    color: '#ffffff',
                                                                                                    fontWeight: 700,
                                                                                                    width: '22px',
                                                                                                    height: '22px',
                                                                                                    borderRadius: '6px',
                                                                                                    display: 'inline-flex',
                                                                                                    alignItems: 'center',
                                                                                                    justifyContent: 'center',
                                                                                                    fontSize: '11px',
                                                                                                    flexShrink: 0,
                                                                                                    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)'
                                                                                                }}>
                                                                                                    {fIdx + 1}
                                                                                                </span>
                                                                                                <h5 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.4, letterSpacing: '-0.02em' }}>
                                                                                                    {find.headline}
                                                                                                </h5>
                                                                                            </div>
                                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                                                                <button
                                                                                                    onClick={() => handleEvidenceClick(find, evidenceKey, idx, '핵심 정량 분석', '핵심 분석 근거')}
                                                                                                    style={{
                                                                                                        background: isSelected ? '#2563eb' : '#ffffff',
                                                                                                        color: isSelected ? '#ffffff' : '#2563eb',
                                                                                                        border: `1px solid ${isSelected ? '#2563eb' : '#bfdbfe'}`,
                                                                                                        borderRadius: '14px',
                                                                                                        padding: '5px 12px',
                                                                                                        fontSize: '12px',
                                                                                                        fontWeight: 600,
                                                                                                        cursor: 'pointer',
                                                                                                        display: 'inline-flex',
                                                                                                        alignItems: 'center',
                                                                                                        gap: '4px',
                                                                                                        boxShadow: '0 1px 2px rgba(37, 99, 235, 0.05)',
                                                                                                        transition: 'all 0.15s ease'
                                                                                                    }}
                                                                                                >
                                                                                                    <Search size={11} color={isSelected ? '#ffffff' : '#2563eb'} />
                                                                                                    <span style={{ fontSize: '12px', lineHeight: 1 }}>증거</span>
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>

                                                                                        <p style={{ fontSize: '12px', color: '#475569', margin: 0, lineHeight: 1.55, letterSpacing: '-0.01em' }}>
                                                                                            {find.description}
                                                                                        </p>

                                                                                        {isSelected && (() => {
                                                                                            const activeEvInfo = getEvidenceTargetAndMetric(find, evidenceKey);
                                                                                            return (
                                                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                                                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                                                                        {renderStubChips(find.stubs, find, evidenceKey)}
                                                                                                    </div>

                                                                                                    {activeEvInfo.metric && (
                                                                                                        <div style={{
                                                                                                            display: 'flex',
                                                                                                            alignItems: 'center',
                                                                                                            justifyContent: 'space-between',
                                                                                                            gap: '10px',
                                                                                                            padding: '6px 12px',
                                                                                                            borderRadius: '6px',
                                                                                                            background: '#fffbeb',
                                                                                                            border: '1px solid #fde68a',
                                                                                                            marginTop: '4px',
                                                                                                            maxWidth: '100%',
                                                                                                            boxSizing: 'border-box',
                                                                                                            fontSize: '11.5px'
                                                                                                        }}>
                                                                                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', flex: 1, minWidth: 0 }}>
                                                                                                                <BarChart2 size={13} color="#d97706" style={{ marginTop: '2px', flexShrink: 0 }} />
                                                                                                                <div style={{ fontSize: '11.5px', color: '#92400e', lineHeight: '1.45', wordBreak: 'break-all' }}>
                                                                                                                    <strong style={{ color: '#b45309', marginRight: '5px', fontWeight: 700, fontSize: '11.5px' }}>교차표 판단:</strong>
                                                                                                                    <span style={{ fontSize: '11.5px' }}>{activeEvInfo.metric}</span>
                                                                                                                </div>
                                                                                                            </div>

                                                                                                            {activeEvInfo.stubId && (
                                                                                                                <button
                                                                                                                    type="button"
                                                                                                                    onClick={(e) => {
                                                                                                                        e.stopPropagation();
                                                                                                                        handleOpenSingleCrosstab(activeEvInfo.stubId, {
                                                                                                                            ...find,
                                                                                                                            evidence_target: activeEvInfo.target
                                                                                                                        });
                                                                                                                    }}
                                                                                                                    title={`[${activeEvInfo.stubId}] 클릭하여 핵심 교차표 새창 보기`}
                                                                                                                    style={{
                                                                                                                        padding: '5.5px 10px',
                                                                                                                        borderRadius: '6px',
                                                                                                                        fontSize: '12px',
                                                                                                                        fontWeight: 600,
                                                                                                                        color: '#1e293b',
                                                                                                                        background: '#ffffff',
                                                                                                                        border: '1px solid #cbd5e1',
                                                                                                                        cursor: 'pointer',
                                                                                                                        display: 'inline-flex',
                                                                                                                        alignItems: 'center',
                                                                                                                        gap: '4px',
                                                                                                                        flexShrink: 0,
                                                                                                                        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)',
                                                                                                                        transition: 'all 0.15s ease'
                                                                                                                    }}
                                                                                                                    onMouseEnter={(e) => {
                                                                                                                        e.currentTarget.style.background = '#f8fafc';
                                                                                                                        e.currentTarget.style.borderColor = '#2563eb';
                                                                                                                        e.currentTarget.style.color = '#2563eb';
                                                                                                                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(37, 99, 235, 0.12)';
                                                                                                                    }}
                                                                                                                    onMouseLeave={(e) => {
                                                                                                                        e.currentTarget.style.background = '#ffffff';
                                                                                                                        e.currentTarget.style.borderColor = '#cbd5e1';
                                                                                                                        e.currentTarget.style.color = '#1e293b';
                                                                                                                        e.currentTarget.style.boxShadow = '0 1px 2px rgba(15, 23, 42, 0.06)';
                                                                                                                    }}
                                                                                                                >
                                                                                                                    <ExternalLink size={12} color="#2563eb" />
                                                                                                                    <span style={{ fontSize: '12px', lineHeight: 1.2 }}>핵심 교차표</span>
                                                                                                                </button>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    )}

                                                                                                    {renderEvidenceTabbedContainer(evidenceKey, find)}
                                                                                                </div>
                                                                                            );
                                                                                        })()}
                                                                                    </div>
                                                                                );
                                                                            })
                                                                        ) : typeof coreFindingsList === 'string' ? (
                                                                            renderBulletText(coreFindingsList)
                                                                        ) : (
                                                                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>핵심 발견 사실이 없습니다.</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Right Column wrapper using display: contents to participate in parent grid */}
                                                            <div style={{ display: 'contents' }}>
                                                                {/* 전략적 시사점 & 액션 플랜 Card (order: 2) */}
                                                                <div className="ai-card" style={{ padding: '14px 18px', border: '1.5px solid #cbd5e1', borderRadius: '12px', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '12px', order: 2, minWidth: 0, width: '100%', height: '100%', boxSizing: 'border-box', boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '8px' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                                <Target size={16} color="#2563eb" />
                                                                            </div>
                                                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                                                                <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                                                                                    전략적 시사점 & 액션 플랜
                                                                                </h4>
                                                                                <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>Strategic Action Plan</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                                        {Array.isArray(soWhatList) && soWhatList.length > 0 ? (
                                                                            soWhatList.map((plan, pIdx) => {
                                                                                const evidenceKey = 'sowhat_' + idx + '_' + pIdx;
                                                                                const isSelected = !!openEvidences[evidenceKey];
                                                                                return (
                                                                                    <div
                                                                                        key={pIdx}
                                                                                        style={{
                                                                                            display: 'flex',
                                                                                            flexDirection: 'column',
                                                                                            gap: '10px',
                                                                                            padding: '14px 16px',
                                                                                            borderRadius: '10px',
                                                                                            background: '#ffffff',
                                                                                            border: isSelected ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
                                                                                            boxShadow: isSelected ? '0 4px 12px rgba(59, 130, 246, 0.12)' : '0 2px 6px rgba(15, 23, 42, 0.04)',
                                                                                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                                                                        }}
                                                                                    >
                                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                                                                                                {(() => {
                                                                                                    const zoneRaw = plan.matrix_zone || 'QUICK_WIN';
                                                                                                    const zoneUpper = String(zoneRaw).toUpperCase();
                                                                                                    let koreanText = '';
                                                                                                    let bg = '#fef2f2';
                                                                                                    let color = '#991b1b';
                                                                                                    let border = '1px solid #fca5a5';

                                                                                                    if (zoneUpper.includes('QUICK')) {
                                                                                                        koreanText = '즉시실행';
                                                                                                        bg = '#fef2f2';
                                                                                                        color = '#991b1b';
                                                                                                        border = '1px solid #fca5a5';
                                                                                                    } else if (zoneUpper.includes('LONG')) {
                                                                                                        koreanText = '장기과제';
                                                                                                        bg = '#faf5ff';
                                                                                                        color = '#581c87';
                                                                                                        border = '1px solid #d8b4fe';
                                                                                                    } else if (zoneUpper.includes('EASY')) {
                                                                                                        koreanText = '단기전략과제';
                                                                                                        bg = '#eff6ff';
                                                                                                        color = '#1e40af';
                                                                                                        border = '1px solid #93c5fd';
                                                                                                    } else if (zoneUpper.includes('LOW')) {
                                                                                                        koreanText = '낮은우선순위';
                                                                                                        bg = '#f3f4f6';
                                                                                                        color = '#374151';
                                                                                                        border = '1px solid #d1d5db';
                                                                                                    }

                                                                                                    const label = koreanText ? `${zoneRaw} (${koreanText})` : zoneRaw;

                                                                                                    return (
                                                                                                        <span style={{
                                                                                                            fontSize: '11px',
                                                                                                            fontWeight: 700,
                                                                                                            backgroundColor: bg,
                                                                                                            color: color,
                                                                                                            border: border,
                                                                                                            padding: '2px 10px',
                                                                                                            borderRadius: '20px',
                                                                                                            display: 'inline-flex',
                                                                                                            alignItems: 'center',
                                                                                                            letterSpacing: '-0.01em',
                                                                                                            flexShrink: 0
                                                                                                        }}>
                                                                                                            {label}
                                                                                                        </span>
                                                                                                    );
                                                                                                })()}
                                                                                                <h5 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.4, letterSpacing: '-0.02em' }}>
                                                                                                    {plan.headline}
                                                                                                </h5>
                                                                                            </div>
                                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                                                                <button
                                                                                                    onClick={() => handleEvidenceClick(plan, evidenceKey, idx, '전략적 시사점 & 액션 플랜', '전략 과제 근거')}
                                                                                                    style={{
                                                                                                        background: isSelected ? '#2563eb' : '#ffffff',
                                                                                                        color: isSelected ? '#ffffff' : '#2563eb',
                                                                                                        border: `1px solid ${isSelected ? '#2563eb' : '#bfdbfe'}`,
                                                                                                        borderRadius: '14px',
                                                                                                        padding: '5px 12px',
                                                                                                        fontSize: '12px',
                                                                                                        fontWeight: 600,
                                                                                                        cursor: 'pointer',
                                                                                                        display: 'inline-flex',
                                                                                                        alignItems: 'center',
                                                                                                        gap: '4px',
                                                                                                        boxShadow: '0 1px 2px rgba(37, 99, 235, 0.05)',
                                                                                                        transition: 'all 0.15s ease'
                                                                                                    }}
                                                                                                >
                                                                                                    <Search size={11} color={isSelected ? '#ffffff' : '#2563eb'} />
                                                                                                    <span style={{ fontSize: '12px', lineHeight: 1 }}>증거</span>
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>

                                                                                        <p style={{ fontSize: '12px', color: '#475569', margin: 0, lineHeight: 1.55, letterSpacing: '-0.01em' }}>
                                                                                            {plan.description}
                                                                                        </p>

                                                                                        {isSelected && (() => {
                                                                                            const activeEvInfo = getEvidenceTargetAndMetric(plan, evidenceKey);
                                                                                            return (
                                                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                                                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                                                                        {renderStubChips(plan.stubs, plan, evidenceKey)}
                                                                                                    </div>

                                                                                                    {activeEvInfo.metric && (
                                                                                                        <div style={{
                                                                                                            display: 'flex',
                                                                                                            alignItems: 'center',
                                                                                                            justifyContent: 'space-between',
                                                                                                            gap: '10px',
                                                                                                            padding: '6px 12px',
                                                                                                            borderRadius: '6px',
                                                                                                            background: '#fffbeb',
                                                                                                            border: '1px solid #fde68a',
                                                                                                            marginTop: '4px',
                                                                                                            maxWidth: '100%',
                                                                                                            boxSizing: 'border-box',
                                                                                                            fontSize: '11.5px'
                                                                                                        }}>
                                                                                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', flex: 1, minWidth: 0 }}>
                                                                                                                <BarChart2 size={13} color="#d97706" style={{ marginTop: '2px', flexShrink: 0 }} />
                                                                                                                <div style={{ fontSize: '11.5px', color: '#92400e', lineHeight: '1.45', wordBreak: 'break-all' }}>
                                                                                                                    <strong style={{ color: '#b45309', marginRight: '5px', fontWeight: 700, fontSize: '11.5px' }}>교차표 판단:</strong>
                                                                                                                    <span style={{ fontSize: '11.5px' }}>{activeEvInfo.metric}</span>
                                                                                                                </div>
                                                                                                            </div>

                                                                                                            {activeEvInfo.stubId && (
                                                                                                                <button
                                                                                                                    type="button"
                                                                                                                    onClick={(e) => {
                                                                                                                        e.stopPropagation();
                                                                                                                        handleOpenSingleCrosstab(activeEvInfo.stubId, {
                                                                                                                            ...plan,
                                                                                                                            evidence_target: activeEvInfo.target
                                                                                                                        });
                                                                                                                    }}
                                                                                                                    title={`[${activeEvInfo.stubId}] 클릭하여 핵심 교차표 새창 보기`}
                                                                                                                    style={{
                                                                                                                        padding: '5.5px 10px',
                                                                                                                        borderRadius: '6px',
                                                                                                                        fontSize: '12px',
                                                                                                                        fontWeight: 600,
                                                                                                                        color: '#1e293b',
                                                                                                                        background: '#ffffff',
                                                                                                                        border: '1px solid #cbd5e1',
                                                                                                                        cursor: 'pointer',
                                                                                                                        display: 'inline-flex',
                                                                                                                        alignItems: 'center',
                                                                                                                        gap: '4px',
                                                                                                                        flexShrink: 0,
                                                                                                                        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)',
                                                                                                                        transition: 'all 0.15s ease'
                                                                                                                    }}
                                                                                                                    onMouseEnter={(e) => {
                                                                                                                        e.currentTarget.style.background = '#f8fafc';
                                                                                                                        e.currentTarget.style.borderColor = '#2563eb';
                                                                                                                        e.currentTarget.style.color = '#2563eb';
                                                                                                                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(37, 99, 235, 0.12)';
                                                                                                                    }}
                                                                                                                    onMouseLeave={(e) => {
                                                                                                                        e.currentTarget.style.background = '#ffffff';
                                                                                                                        e.currentTarget.style.borderColor = '#cbd5e1';
                                                                                                                        e.currentTarget.style.color = '#1e293b';
                                                                                                                        e.currentTarget.style.boxShadow = '0 1px 2px rgba(15, 23, 42, 0.06)';
                                                                                                                    }}
                                                                                                                >
                                                                                                                    <ExternalLink size={12} color="#2563eb" />
                                                                                                                    <span style={{ fontSize: '12px', lineHeight: 1.2 }}>핵심 교차표</span>
                                                                                                                </button>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    )}

                                                                                                    {renderEvidenceTabbedContainer(evidenceKey, plan)}
                                                                                                </div>
                                                                                            );
                                                                                        })()}
                                                                                    </div>
                                                                                );
                                                                            })
                                                                        ) : typeof soWhatList === 'string' ? (
                                                                            renderBulletText(soWhatList)
                                                                        ) : (
                                                                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>시사점 및 액션플랜이 없습니다.</span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* 타겟 세그먼트 프로필 Card (order: 4) */}
                                                                <div className="ai-card" style={{ padding: '14px 18px', border: '1.5px solid #cbd5e1', borderRadius: '12px', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '12px', order: 4, minWidth: 0, width: '100%', height: '100%', boxSizing: 'border-box', boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '8px' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                                <Users size={16} color="#2563eb" />
                                                                            </div>
                                                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                                                                <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                                                                                    타겟 세그먼트 프로필
                                                                                </h4>
                                                                                <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>Demographic Profile</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                                        {Array.isArray(profileList) && profileList.length > 0 ? (
                                                                            profileList.map((prof, pIdx) => {
                                                                                const evidenceKey = 'profile_' + idx + '_' + pIdx;
                                                                                const isSelected = !!openEvidences[evidenceKey];
                                                                                return (
                                                                                    <div
                                                                                        key={pIdx}
                                                                                        style={{
                                                                                            display: 'flex',
                                                                                            flexDirection: 'column',
                                                                                            gap: '10px',
                                                                                            padding: '14px 16px',
                                                                                            borderRadius: '10px',
                                                                                            background: '#ffffff',
                                                                                            border: isSelected ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
                                                                                            boxShadow: isSelected ? '0 4px 12px rgba(59, 130, 246, 0.12)' : '0 2px 6px rgba(15, 23, 42, 0.04)',
                                                                                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                                                                        }}
                                                                                    >
                                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                                                                                                <span style={{
                                                                                                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                                                                                                    color: '#ffffff',
                                                                                                    fontWeight: 700,
                                                                                                    width: '22px',
                                                                                                    height: '22px',
                                                                                                    borderRadius: '6px',
                                                                                                    display: 'inline-flex',
                                                                                                    alignItems: 'center',
                                                                                                    justifyContent: 'center',
                                                                                                    fontSize: '11px',
                                                                                                    flexShrink: 0,
                                                                                                    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)'
                                                                                                }}>
                                                                                                    {pIdx + 1}
                                                                                                </span>
                                                                                                <h5 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.4, letterSpacing: '-0.02em' }}>
                                                                                                    {prof.headline}
                                                                                                </h5>
                                                                                            </div>

                                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                                                                <button
                                                                                                    onClick={() => handleEvidenceClick(prof, evidenceKey, idx, '타겟 세그먼트 프로필', '세그먼트 특징 근거')}
                                                                                                    style={{
                                                                                                        background: isSelected ? '#2563eb' : '#ffffff',
                                                                                                        color: isSelected ? '#ffffff' : '#2563eb',
                                                                                                        border: `1px solid ${isSelected ? '#2563eb' : '#bfdbfe'}`,
                                                                                                        borderRadius: '14px',
                                                                                                        padding: '5px 12px',
                                                                                                        fontSize: '12px',
                                                                                                        fontWeight: 600,
                                                                                                        cursor: 'pointer',
                                                                                                        display: 'inline-flex',
                                                                                                        alignItems: 'center',
                                                                                                        gap: '4px',
                                                                                                        boxShadow: '0 1px 2px rgba(37, 99, 235, 0.05)',
                                                                                                        transition: 'all 0.15s ease'
                                                                                                    }}
                                                                                                >
                                                                                                    <Search size={11} color={isSelected ? '#ffffff' : '#2563eb'} />
                                                                                                    <span style={{ fontSize: '12px', lineHeight: 1 }}>증거</span>
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>

                                                                                        {(prof.group_a || prof.group_b) && (
                                                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '2px' }}>
                                                                                                {prof.group_a && (
                                                                                                    <div style={{ background: '#f8fafc', color: '#334155', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '7px 10px', fontSize: '11.5px', fontWeight: 600, textAlign: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                                                                                                        {prof.group_a}
                                                                                                    </div>
                                                                                                )}
                                                                                                {prof.group_b && (
                                                                                                    <div style={{ background: '#f8fafc', color: '#334155', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '7px 10px', fontSize: '11.5px', fontWeight: 600, textAlign: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                                                                                                        {prof.group_b}
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        )}

                                                                                        <p style={{ fontSize: '12px', color: '#475569', margin: 0, lineHeight: 1.55, letterSpacing: '-0.01em' }}>
                                                                                            {prof.description}
                                                                                        </p>

                                                                                        {isSelected && (() => {
                                                                                            const activeEvInfo = getEvidenceTargetAndMetric(prof, evidenceKey);
                                                                                            return (
                                                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                                                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                                                                        {renderStubChips(prof.stubs, prof, evidenceKey)}
                                                                                                    </div>

                                                                                                    {activeEvInfo.metric && (
                                                                                                        <div style={{
                                                                                                            display: 'flex',
                                                                                                            alignItems: 'center',
                                                                                                            justifyContent: 'space-between',
                                                                                                            gap: '10px',
                                                                                                            padding: '6px 12px',
                                                                                                            borderRadius: '6px',
                                                                                                            background: '#fffbeb',
                                                                                                            border: '1px solid #fde68a',
                                                                                                            marginTop: '4px',
                                                                                                            maxWidth: '100%',
                                                                                                            boxSizing: 'border-box',
                                                                                                            fontSize: '11.5px'
                                                                                                        }}>
                                                                                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', flex: 1, minWidth: 0 }}>
                                                                                                                <BarChart2 size={13} color="#d97706" style={{ marginTop: '2px', flexShrink: 0 }} />
                                                                                                                <div style={{ fontSize: '11.5px', color: '#92400e', lineHeight: '1.45', wordBreak: 'break-all' }}>
                                                                                                                    <strong style={{ color: '#b45309', marginRight: '5px', fontWeight: 700, fontSize: '11.5px' }}>교차표 판단:</strong>
                                                                                                                    <span style={{ fontSize: '11.5px' }}>{activeEvInfo.metric}</span>
                                                                                                                </div>
                                                                                                            </div>

                                                                                                            {activeEvInfo.stubId && (
                                                                                                                <button
                                                                                                                    type="button"
                                                                                                                    onClick={(e) => {
                                                                                                                        e.stopPropagation();
                                                                                                                        handleOpenSingleCrosstab(activeEvInfo.stubId, {
                                                                                                                            ...prof,
                                                                                                                            evidence_target: activeEvInfo.target
                                                                                                                        });
                                                                                                                    }}
                                                                                                                    title={`[${activeEvInfo.stubId}] 클릭하여 핵심 교차표 새창 보기`}
                                                                                                                    style={{
                                                                                                                        padding: '5.5px 10px',
                                                                                                                        borderRadius: '6px',
                                                                                                                        fontSize: '12px',
                                                                                                                        fontWeight: 600,
                                                                                                                        color: '#1e293b',
                                                                                                                        background: '#ffffff',
                                                                                                                        border: '1px solid #cbd5e1',
                                                                                                                        cursor: 'pointer',
                                                                                                                        display: 'inline-flex',
                                                                                                                        alignItems: 'center',
                                                                                                                        gap: '4px',
                                                                                                                        flexShrink: 0,
                                                                                                                        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)',
                                                                                                                        transition: 'all 0.15s ease'
                                                                                                                    }}
                                                                                                                    onMouseEnter={(e) => {
                                                                                                                        e.currentTarget.style.background = '#f8fafc';
                                                                                                                        e.currentTarget.style.borderColor = '#2563eb';
                                                                                                                        e.currentTarget.style.color = '#2563eb';
                                                                                                                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(37, 99, 235, 0.12)';
                                                                                                                    }}
                                                                                                                    onMouseLeave={(e) => {
                                                                                                                        e.currentTarget.style.background = '#ffffff';
                                                                                                                        e.currentTarget.style.borderColor = '#cbd5e1';
                                                                                                                        e.currentTarget.style.color = '#1e293b';
                                                                                                                        e.currentTarget.style.boxShadow = '0 1px 2px rgba(15, 23, 42, 0.06)';
                                                                                                                    }}
                                                                                                                >
                                                                                                                    <ExternalLink size={12} color="#2563eb" />
                                                                                                                    <span style={{ fontSize: '12px', lineHeight: 1.2 }}>핵심 교차표</span>
                                                                                                                </button>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    )}

                                                                                                    {renderEvidenceTabbedContainer(evidenceKey, prof)}
                                                                                                </div>
                                                                                            );
                                                                                        })()}
                                                                                    </div>
                                                                                );
                                                                            })
                                                                        ) : typeof profileList === 'string' ? (
                                                                            renderBulletText(profileList)
                                                                        ) : (
                                                                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>타겟 프로필 데이터가 없습니다.</span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {activeSubTab === 'l3' && (
                        (!insightData.l3 || !(insightData.l3.executive_summary || insightData.l3.strategic_recommendations)) ? (
                            <div className="ai-block-empty-state">
                                <span>조회된 L3 종합 요약 보고서 결과가 없습니다.</span>
                            </div>
                        ) : (
                            <div ref={l3ListScrollRef} style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '8px' }}>
                                {/* Executive Summary Card */}
                                <div className="ai-card" style={{ padding: '24px', background: '#f1f5f9', borderRadius: '12px', border: '1.5px solid #cbd5e1', boxShadow: 'none' }}>
                                    <div style={{ marginBottom: '16px' }}>
                                        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                                            종합 의사결정 요약문 <span style={{ fontSize: '11px', fontWeight: 400, color: '#64748b', marginLeft: '4px' }}>Executive Summary</span>
                                        </h3>
                                    </div>
                                    <p style={{ fontSize: '13px', lineHeight: '1.7', color: '#334155', margin: 0, whiteSpace: 'pre-wrap' }}>
                                        {renderInsightText(insightData.l3?.executive_summary)}
                                    </p>
                                </div>

                                {/* Strategic Recommendations Card */}
                                <div className="ai-card" style={{ padding: '24px', background: '#f0fdf4', borderRadius: '12px', border: '1.5px solid #86efac', boxShadow: 'none' }}>
                                    <div style={{ marginBottom: '16px' }}>
                                        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#14532d', margin: 0 }}>
                                            최종 전략적 액션 아이템 <span style={{ fontSize: '11px', fontWeight: 400, color: '#16a34a', marginLeft: '4px' }}>Strategic Action Items</span>
                                        </h3>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {Array.isArray(insightData.l3?.strategic_recommendations) ? (
                                            insightData.l3.strategic_recommendations.map((rec, rIdx) => (
                                                <div key={rIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        width: '18px',
                                                        height: '18px',
                                                        borderRadius: '50%',
                                                        background: '#d1fae5',
                                                        color: '#16a34a',
                                                        flexShrink: 0,
                                                        marginTop: '2px'
                                                    }}>
                                                        <Check size={11} strokeWidth={3} />
                                                    </div>
                                                    <p style={{ fontSize: '13px', lineHeight: '1.5', color: '#1b4332', margin: 0 }}>{renderInsightText(rec)}</p>
                                                </div>
                                            ))
                                        ) : (
                                            <p style={{ fontSize: '13px', lineHeight: '1.6', color: '#1b4332', margin: 0, whiteSpace: 'pre-wrap' }}>
                                                {renderInsightText(insightData.l3?.strategic_recommendations)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    )}

                </div>
            </div>
        </div>
    );
};

export default AiReportAnalysisStep;