import React, { useRef, useState, useContext, useEffect } from 'react';
import {
    UploadCloud, X, Info, RefreshCw, AlertTriangle,
    CheckCircle2, ChevronDown, ChevronRight, Check
} from 'lucide-react';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { modalContext } from "@/components/common/Modal.jsx";
import { useSelector } from 'react-redux';
import { MapManagementPageApi } from './MapManagementPageApi';
import './MapManagementPage.css';

const CONFIRM_LABELS = {
    respondentsRemoved: "제외되는 응답자 데이터 삭제 동의 (복구 불가)",
    differentSurvey: "다른 설문 파일 데이터 덮어쓰기 동의",
    overwriteExisting: "기존 맵 구성 및 응답 데이터 전체 덮어쓰기 동의",
    variablesRemoved: "SAV 미존재 변수 삭제 동의",
    labelsOverwritten: "기존 라벨을 SAV 라벨로 덮어쓰기 동의",
    mapRestructured: "문항 맵 구조 재구성 동의",
};

const TYPE_LABELS = {
    single: "single",
    multi: "multi",
    open: "open(문자)",
    number: "open(숫자)",
    rank: "rank",
    maxrank: "maxrank",
    minrank: "minrank",
    scale: "scale",
};

const DataUpdateModal = ({ isOpen, onClose, refreshData, onOpenBatchMapEdit }) => {
    const fileInputRef = useRef(null);
    const modalBodyRef = useRef(null);
    const modal = useContext(modalContext);
    const { validateSav, applySav, getSavColumns, syncMap } = MapManagementPageApi();
    const auth = useSelector((store) => store.auth);

    const [activeTab, setActiveTab] = useState('new'); // 'new' | 'update'
    const [step, setStep] = useState(1); // 1: 파일고르기/칸묶기, 1.5: 검사중, 2: 확인화면, 2.5: 적용중, 3: 적용완료
    const [selectedFile, setSelectedFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [projectName, setProjectName] = useState('');

    // 칸 묶기 (Step 1)
    const [isAnalyzingColumns, setIsAnalyzingColumns] = useState(false);
    const [columnsData, setColumnsData] = useState(null);
    const [activeGroups, setActiveGroups] = useState([]); // [{ id, name, label, columns: [], reason, checked: true, isSaved: bool, isCustom: bool }]
    const [isDirectGroupingOpen, setIsDirectGroupingOpen] = useState(false);
    const [directSelectedCols, setDirectSelectedCols] = useState([]); // string[]

    // Step 2 확인 화면
    const [validationResult, setValidationResult] = useState(null);
    const [confirmChecks, setConfirmChecks] = useState({});
    const [typeOverrides, setTypeOverrides] = useState({});
    const [labelFromSavChecks, setLabelFromSavChecks] = useState({});
    const [isDetailsOpen, setIsDetailsOpen] = useState(false); // ▶ 자세히 보기 접힘/펼침
    const [hoveredReasonVar, setHoveredReasonVar] = useState(null); // '!' 툴팁 마우스오버

    // Step 3 완료 화면
    const [applyResult, setApplyResult] = useState(null);
    const [isApplyDetailsOpen, setIsApplyDetailsOpen] = useState(false);

    // 팝업 열림/닫힘 시 상태 완전 초기화
    const resetAllState = () => {
        setSelectedFile(null);
        setStep(1);
        setValidationResult(null);
        setConfirmChecks({});
        setTypeOverrides({});
        setLabelFromSavChecks({});
        setIsDetailsOpen(false);
        setHoveredReasonVar(null);
        setApplyResult(null);
        setIsApplyDetailsOpen(false);
        setIsAnalyzingColumns(false);
        setColumnsData(null);
        setActiveGroups([]);
        setIsDirectGroupingOpen(false);
        setDirectSelectedCols([]);
        setProjectName(sessionStorage.getItem('projectname') || '');
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    useEffect(() => {
        if (isOpen) {
            resetAllState();
        }
    }, [isOpen]);

    // 직접 묶기 토글 열릴 때 팝업 전체 스크롤 맨 밑으로 이동
    useEffect(() => {
        if (isDirectGroupingOpen && modalBodyRef.current) {
            setTimeout(() => {
                if (modalBodyRef.current) {
                    modalBodyRef.current.scrollTo({
                        top: modalBodyRef.current.scrollHeight,
                        behavior: 'smooth'
                    });
                }
            }, 60);
        }
    }, [isDirectGroupingOpen]);

    if (!isOpen) return null;

    const handleModalClose = () => {
        resetAllState();
        onClose();
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        resetAllState();
    };

    // 파일 선택 시 즉시 POST /data/sav/columns 호출 (칸 묶기 분석)
    const processFile = async (file) => {
        if (!file) return;
        const fileName = file.name.toLowerCase();
        if (!fileName.endsWith('.sav')) {
            modal.showErrorAlert("알림", ".sav 형식의 파일만 지원합니다.");
            return;
        }

        setSelectedFile(file);
        setProjectName(sessionStorage.getItem('projectname') || '');
        setColumnsData(null);
        setActiveGroups([]);
        setDirectSelectedCols([]);
        setIsDirectGroupingOpen(false);

        const pn = sessionStorage.getItem('merge_pn') || sessionStorage.getItem('projectnum');
        const userId = auth?.user?.userId || '';
        if (!pn) return;

        // 칸 묶기 API 호출
        setIsAnalyzingColumns(true);
        try {
            const formData = new FormData();
            formData.append("pn", pn);
            formData.append("file", file);
            if (userId) formData.append("user", userId);

            const res = await getSavColumns.mutateAsync(formData);
            const successCode = String(res?.success ?? '');
            if (successCode === '777') {
                const data = res.resultjson || res;
                setColumnsData(data);

                const list = [];
                // 1. savedGroups (설문에 기억된 묶음 - 업데이트 탭에선 이름/라벨 읽기 전용)
                (data.savedGroups || []).forEach((g, idx) => {
                    list.push({
                        id: `saved_${idx}`,
                        name: g.name || '',
                        label: g.label || '',
                        columns: g.columns || [],
                        reason: g.reason || `${g.columns?.length || 0}칸 (${(g.columns || []).join(', ')}) · 기억된 묶음`,
                        checked: true,
                        isSaved: true,
                        isCustom: false
                    });
                });
                // 2. suggestedGroups (서버가 추천한 멀티 묶음)
                (data.suggestedGroups || []).forEach((g, idx) => {
                    list.push({
                        id: `sugg_${idx}`,
                        name: g.name || '',
                        label: g.label || '',
                        columns: g.columns || [],
                        reason: g.reason || `${g.columns?.length || 0}칸 (${(g.columns || []).join(', ')})`,
                        checked: true,
                        isSaved: false,
                        isCustom: false
                    });
                });
                setActiveGroups(list);
            }
        } catch (err) {
            console.error("Columns analysis error:", err);
        } finally {
            setIsAnalyzingColumns(false);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    const onDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
            if (fileInputRef.current) {
                const dt = new DataTransfer();
                dt.items.add(e.dataTransfer.files[0]);
                fileInputRef.current.files = dt.files;
            }
        }
    };

    const handleClearFile = (e) => {
        if (e) e.stopPropagation();
        setSelectedFile(null);
        setColumnsData(null);
        setActiveGroups([]);
        setDirectSelectedCols([]);
        setIsDirectGroupingOpen(false);
        setProjectName(sessionStorage.getItem('projectname') || '');
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    // 직접 묶기: 선택된 2개 이상의 칸을 묶음 목록에 추가
    const handleDirectGroupSubmit = () => {
        if (directSelectedCols.length < 2) {
            modal.showErrorAlert("알림", "멀티로 묶을 칸을 2개 이상 선택해 주세요.");
            return;
        }

        const newGroup = {
            id: `custom_${Date.now()}`,
            name: '', // 비워둠 (비우면 서버가 자동)
            label: '', // 비워둠 (비우면 서버가 자동)
            columns: [...directSelectedCols],
            reason: `${directSelectedCols.length}칸 (${directSelectedCols.join(', ')}) · 직접 묶음 (비우면 자동)`,
            checked: true,
            isSaved: false,
            isCustom: true
        };

        setActiveGroups(prev => [...prev, newGroup]);
        setDirectSelectedCols([]);
    };

    // 이미 어떤 그룹에 속해있는 컬럼 이름 집합
    const groupedColumnNames = new Set(
        activeGroups.filter(g => g.checked).flatMap(g => g.columns || [])
    );

    // Step 1 -> Step 2 (POST /data/sav/validate)
    const handleStartValidate = async () => {
        if (!selectedFile) {
            modal.showErrorAlert("알림", "SAV 파일을 선택해 주세요.");
            return;
        }

        const pn = sessionStorage.getItem('merge_pn') || sessionStorage.getItem('projectnum');
        const userId = auth?.user?.userId || '';
        if (!pn) {
            modal.showErrorAlert("알림", "프로젝트 정보를 찾을 수 없습니다.");
            return;
        }

        setStep(1.5);

        const formData = new FormData();
        formData.append("pn", pn);
        formData.append("file", selectedFile);
        formData.append("mode", activeTab); // 'new' | 'update'
        if (userId) formData.append("user", userId);
        if (activeTab === 'new' && projectName.trim()) {
            formData.append("projectName", projectName.trim());
        }

        // groups 페이로드 구성 (묶음 목록을 보여줬다면 늘 전송, 전부 껐으면 "[]")
        if (columnsData || activeGroups.length > 0) {
            const checkedGroups = activeGroups.filter(g => g.checked);
            const groupsPayload = checkedGroups.map(g => {
                const obj = { columns: g.columns };
                if (g.name && g.name.trim()) obj.name = g.name.trim();
                if (g.label && g.label.trim()) obj.label = g.label.trim();
                return obj;
            });
            formData.append("groups", JSON.stringify(groupsPayload));
        }

        try {
            const res = await validateSav.mutateAsync(formData);
            const resData = (res && typeof res.resultjson === 'object' && res.resultjson !== null)
                ? { ...res, ...res.resultjson }
                : (res || {});

            setValidationResult(resData);

            // 필수 확인 항목 초기화
            const initConfirm = {};
            const confirmList = resData.confirmRequired || [];
            confirmList.forEach(item => {
                const key = typeof item === 'string' ? item : item.key;
                initConfirm[key] = false;
            });
            setConfirmChecks(initConfirm);

            // AI 변수 유형 (review) 초기화
            const initTypes = {};
            const reviewList = resData.review || [];
            reviewList.forEach(item => {
                const vName = item.variable || item.varName;
                if (vName) {
                    initTypes[vName] = item.type || item.suggestedType || 'single';
                }
            });
            setTypeOverrides(initTypes);

            // SAV 글로 바꾸기 (labelChanges.different) 초기화
            const initLabelFromSav = {};
            const labelChanges = resData.labelChanges || [];
            labelChanges.forEach(item => {
                const vName = item.variable || item.varName;
                if (vName && item.different && item.different.length > 0) {
                    initLabelFromSav[vName] = false;
                }
            });
            setLabelFromSavChecks(initLabelFromSav);

            setStep(2);
        } catch (error) {
            console.error("SAV Validate error:", error);
            setStep(1);
            const errMsg = error?.response?.data?.resultjson?.errorcontent
                || error?.response?.data?.message
                || error?.message
                || "검사 요청 중 오류가 발생했습니다.";
            modal.showErrorAlert("오류", errMsg, { zIndex: 99999 });
        }
    };

    // Step 2 -> Step 3 (POST /data/sav/apply)
    const handleStartApply = async () => {
        const resData = (validationResult && typeof validationResult.resultjson === 'object' && validationResult.resultjson !== null)
            ? { ...validationResult, ...validationResult.resultjson }
            : (validationResult || {});

        if (!resData || !resData.checkId) {
            modal.showErrorAlert("알림", "검사 정보가 유효하지 않습니다. 파일을 다시 올려 주세요.");
            return;
        }

        if (resData.canApply === false) {
            modal.showErrorAlert("적용 불가", "검사 결과 적용이 불가능합니다. 파일 문제 또는 설문 오류를 확인해 주세요.");
            return;
        }

        // 필수 확인 항목 체크 검증
        const requiredList = resData.confirmRequired || [];
        const missingConfirms = requiredList.filter(item => {
            const key = typeof item === 'string' ? item : item.key;
            return !confirmChecks[key];
        });
        if (missingConfirms.length > 0) {
            modal.showErrorAlert("알림", "필수 확인 사항을 모두 체크해야 적용할 수 있습니다.");
            return;
        }

        const pn = sessionStorage.getItem('merge_pn') || sessionStorage.getItem('projectnum');
        const userId = auth?.user?.userId || '';

        // types 객체: review 에서 기본 판정과 다르게 고른 것만 전송
        const typesPayload = {};
        (resData.review || []).forEach(item => {
            const vName = item.variable || item.varName;
            const selected = typeOverrides[vName];
            if (vName && selected && selected !== item.type) {
                typesPayload[vName] = selected;
            }
        });

        const payload = {
            pn,
            user: userId,
            checkId: resData.checkId,
            confirm: Object.keys(confirmChecks).filter(k => confirmChecks[k]),
            types: typesPayload,
            labelsFromSav: Object.keys(labelFromSavChecks).filter(k => labelFromSavChecks[k])
        };

        setStep(2.5);

        try {
            const res = await applySav.mutateAsync(payload);
            const successCode = String(res?.success);

            if (successCode === '777') {
                setApplyResult(res);
                setStep(3);
            } else if (successCode === '904') {
                const errContent = res?.resultjson?.errorcontent || res?.message || "확인 항목이 누락되었거나 변경이 발생했습니다.";
                setStep(2);
                modal.showErrorAlert("적용 거절 (904)", errContent, { zIndex: 99999 });
            } else if (successCode === '909' || successCode === '907') {
                const msg = res?.resultjson?.errorcontent || res?.message || "확인한 지 1시간이 지났거나 확인한 기록이 없습니다. 파일을 다시 올려 주세요.";
                modal.showErrorAlert("적용 오류", msg, { zIndex: 99999 });
                setStep(1);
            } else {
                const errorMsg = res?.resultjson?.errorcontent || res?.message || "적용 중 오류가 발생했습니다.";
                modal.showErrorAlert("적용 실패", errorMsg, { zIndex: 99999 });
                setStep(1);
            }
        } catch (error) {
            console.error("SAV Apply error:", error);
            setStep(2);
            const errMsg = error?.response?.data?.resultjson?.errorcontent
                || error?.response?.data?.message
                || error?.message
                || "적용 요청 중 오류가 발생했습니다.";
            modal.showErrorAlert("오류", errMsg, { zIndex: 99999 });
        }
    };

    // 적용 완료 후 닫기
    const handleFinishClose = async () => {
        handleModalClose();
        if (refreshData) refreshData();
        const pn = sessionStorage.getItem('merge_pn') || sessionStorage.getItem('projectnum');
        const userId = auth?.user?.userId || '';
        if (pn) {
            try {
                await syncMap.mutateAsync({ user: userId, pn });
            } catch (e) {
                // ignore
            }
        }
    };

    // 적용 버튼 비활성화 여부
    const isApplyDisabled = () => {
        const resData = (validationResult && typeof validationResult.resultjson === 'object' && validationResult.resultjson !== null)
            ? { ...validationResult, ...validationResult.resultjson }
            : (validationResult || {});

        if (!resData || resData.canApply === false) return true;
        const requiredList = resData.confirmRequired || [];
        return requiredList.some(item => {
            const key = typeof item === 'string' ? item : item.key;
            return !confirmChecks[key];
        });
    };

    // 추출 데이터
    const resData = (validationResult && typeof validationResult.resultjson === 'object' && validationResult.resultjson !== null)
        ? { ...validationResult, ...validationResult.resultjson }
        : (validationResult || {});

    // 적용 전에 확인할 것 존재 여부 (사람이 고를 것만)
    const hasConfirms = resData.confirmRequired && resData.confirmRequired.length > 0;
    const hasValueWarnings = resData.valueWarnings && resData.valueWarnings.length > 0;
    const hasReviews = resData.review && resData.review.length > 0;
    const differentLabelItems = (resData.labelChanges || []).filter(item => item.different && item.different.length > 0);
    const hasLabelChanges = differentLabelItems.length > 0;

    const hasThingsToCheck = hasConfirms || hasValueWarnings || hasReviews || hasLabelChanges;

    return (
        <div className="variable-modal-overlay" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1050, padding: '20px 0' }}>
            <div
                className="variable-modal-content upload-modal-content"
                style={{
                    width: step === 3 ? '640px' : '800px',
                    maxWidth: '95vw',
                    maxHeight: '92vh',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: '#ffffff',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
                    transition: 'all 0.2s',
                    position: 'relative'
                }}
            >
                {/* Header */}
                <div className="variable-modal-header" style={{ padding: '18px 24px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '4px', height: '18px', backgroundColor: '#16a34a', borderRadius: '4px' }}></div>
                        <h3 className="variable-modal-title" style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#0f172a' }}>데이터 등록</h3>
                    </div>
                    <button onClick={handleModalClose} className="variable-modal-close" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Step 1 Tab Header (상하 균등 대칭 패딩) */}
                {step === 1 && (
                    <div style={{ padding: '16px 24px 0 24px', flexShrink: 0, background: '#ffffff' }}>
                        <div style={{
                            display: 'flex',
                            background: '#f8fafc',
                            padding: '5px',
                            borderRadius: '10px',
                            gap: '8px',
                            border: '1px solid #e2e8f0',
                        }}>
                            <button
                                onClick={() => handleTabChange('new')}
                                style={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    padding: '10px 12px',
                                    borderRadius: '8px',
                                    border: activeTab === 'new' ? '1px solid #16a34a' : '1px solid transparent',
                                    background: activeTab === 'new' ? '#ffffff' : 'transparent',
                                    color: activeTab === 'new' ? '#16a34a' : '#64748b',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    transition: 'all 0.2s',
                                    boxShadow: activeTab === 'new' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                                }}
                            >
                                <span>+ SAV 신규등록</span>
                                <span style={{
                                    background: activeTab === 'new' ? '#dcfce7' : '#f1f5f9',
                                    color: activeTab === 'new' ? '#15803d' : '#64748b',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                }}>
                                    새로 만들기
                                </span>
                            </button>
                            <button
                                onClick={() => handleTabChange('update')}
                                style={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    padding: '10px 12px',
                                    borderRadius: '8px',
                                    border: activeTab === 'update' ? '1px solid #16a34a' : '1px solid transparent',
                                    background: activeTab === 'update' ? '#ffffff' : 'transparent',
                                    color: activeTab === 'update' ? '#16a34a' : '#64748b',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    transition: 'all 0.2s',
                                    boxShadow: activeTab === 'update' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                                }}
                            >
                                <span><RefreshCw size={14} style={{ display: 'inline', marginRight: '4px' }} />SAV 업데이트</span>
                                <span style={{
                                    background: activeTab === 'update' ? '#dcfce7' : '#f1f5f9',
                                    color: activeTab === 'update' ? '#15803d' : '#64748b',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                }}>
                                    맵유지 · 값 붙이기
                                </span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Body Area */}
                <div ref={modalBodyRef} className="variable-modal-body custom-scrollbar" style={{ padding: '16px 24px 20px 24px', flex: 1, overflowY: 'auto' }}>

                    {/* ───────────────────────────────────────────────────────────── */}
                    {/* STEP 1: 파일 고르기 + 칸 묶기 (작업체크 A & E)                */}
                    {/* ───────────────────────────────────────────────────────────── */}
                    {step === 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* 안내 정보 표 (기존 원본 디자인 유지) */}
                            <div style={{
                                width: '100%',
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                            }}>
                                <table style={{
                                    width: '100%',
                                    borderCollapse: 'collapse',
                                    fontSize: '13px',
                                }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <th style={{
                                                width: '90px',
                                                background: '#f4fbf7',
                                                color: '#344054',
                                                fontWeight: '600',
                                                padding: '10px 12px',
                                                textAlign: 'left',
                                                borderRight: '1px solid #e2e8f0',
                                                borderTop: '3px solid #16a34a',
                                            }}>
                                                항목
                                            </th>
                                            <th style={{
                                                background: '#f4fbf7',
                                                color: '#15803d',
                                                fontWeight: '600',
                                                padding: '10px 12px',
                                                textAlign: 'left',
                                                borderTop: '3px solid #16a34a',
                                            }}>
                                                {activeTab === 'new' ? 'SAV 신규등록' : 'SAV 업데이트'}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <td style={{
                                                background: '#f4fbf7',
                                                color: '#344054',
                                                fontWeight: '600',
                                                padding: '10px 12px',
                                                borderRight: '1px solid #e2e8f0',
                                            }}>
                                                PID
                                            </td>
                                            <td style={{ padding: '10px 12px', background: '#fff', color: '#334155' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontWeight: '400', color: '#475569', fontSize: '13px' }}>
                                                        {activeTab === 'new' ? (
                                                            <>
                                                                SAV 파일의 <strong style={{ fontWeight: '600', color: '#0f172a', fontSize: 'inherit' }}>PID 기준으로 응답자를 새로 생성</strong>합니다 (PID가 비어있는 행은 제외됨)
                                                            </>
                                                        ) : (
                                                            <>
                                                                <strong style={{ fontWeight: '600', color: '#0f172a', fontSize: 'inherit' }}>PID 로 응답자를 맞춰 SAV 값을 붙입니다</strong> (신규 PID는 추가되고, SAV에 없는 기존 PID는 그대로 둡니다)
                                                            </>
                                                        )}
                                                    </span>
                                                    <span style={{
                                                        background: '#dcfce7',
                                                        color: '#15803d',
                                                        padding: '2px 8px',
                                                        borderRadius: '12px',
                                                        fontSize: '11px',
                                                        fontWeight: '500',
                                                        flexShrink: 0,
                                                        marginLeft: '8px'
                                                    }}>
                                                        {activeTab === 'new' ? '신규 생성' : 'PID 기준'}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#d97706', marginTop: '6px', fontWeight: '500' }}>
                                                    ※ SAV 에 pid 칸(응답자 번호)이 있어야 등록 · 업데이트할 수 있습니다
                                                </div>
                                            </td>
                                        </tr>
                                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <td style={{
                                                background: '#f4fbf7',
                                                color: '#344054',
                                                fontWeight: '600',
                                                padding: '10px 12px',
                                                borderRight: '1px solid #e2e8f0',
                                            }}>
                                                맵(MAP)
                                            </td>
                                            <td style={{ padding: '10px 12px', background: '#fff', color: '#334155' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontWeight: '400', color: '#475569', fontSize: '13px' }}>
                                                        {activeTab === 'new' ? (
                                                            <>
                                                                SAV 파일 정보로 <strong style={{ fontWeight: '600', color: '#0f172a', fontSize: 'inherit' }}>문항 맵을 새로 생성</strong>합니다 (변수 유형 <strong style={{ fontWeight: '600', color: '#0f172a', fontSize: 'inherit' }}>자동 판정</strong>, 적용 후 맵 엑셀에서 수정 가능)
                                                            </>
                                                        ) : (
                                                            <>
                                                                기존 변수 설정은 <strong style={{ fontWeight: '600', color: '#0f172a', fontSize: 'inherit' }}>유지</strong>하고 신규 변수는 <strong style={{ fontWeight: '600', color: '#0f172a', fontSize: 'inherit' }}>추가</strong>합니다 (SAV에 없는 기존 변수는 맵과 값 모두 그대로 둡니다)
                                                            </>
                                                        )}
                                                    </span>
                                                    <span style={{
                                                        background: activeTab === 'new' ? '#dbeafe' : '#f1f5f9',
                                                        color: activeTab === 'new' ? '#1d4ed8' : '#475569',
                                                        padding: '2px 8px',
                                                        borderRadius: '12px',
                                                        fontSize: '11px',
                                                        fontWeight: '500',
                                                        flexShrink: 0,
                                                        marginLeft: '8px'
                                                    }}>
                                                        {activeTab === 'new' ? '자동' : '맵 합치기'}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style={{
                                                background: '#f4fbf7',
                                                color: '#344054',
                                                fontWeight: '600',
                                                padding: '10px 12px',
                                                borderRight: '1px solid #e2e8f0',
                                            }}>
                                                기존 데이터
                                            </td>
                                            <td style={{ padding: '10px 12px', background: '#fff', color: activeTab === 'new' ? '#dc2626' : '#334155' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontWeight: '400', color: activeTab === 'new' ? '#dc2626' : '#475569', fontSize: '13px' }}>
                                                        {activeTab === 'new' ? (
                                                            <>
                                                                기존 등록된 데이터와 맵 설정이 있다면 <strong style={{ fontWeight: '600', color: '#dc2626', fontSize: 'inherit' }}>전체 삭제 후 새로 대체</strong>됩니다
                                                            </>
                                                        ) : (
                                                            <>
                                                                SAV에 있는 변수만 <strong style={{ fontWeight: '600', color: '#0f172a', fontSize: 'inherit' }}>SAV 값으로 바뀌고 나머지는 그대로</strong>입니다. AI 오픈코딩 결과도 그대로입니다 (SAV에서 답이 바뀐 문항만 빠짐)
                                                            </>
                                                        )}
                                                    </span>
                                                    {activeTab === 'new' && (
                                                        <span style={{ background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '500', flexShrink: 0, marginLeft: '8px' }}>
                                                            되돌릴 수 없음
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* 드롭존 (파일 미선택 시) */}
                            {!selectedFile ? (
                                <div
                                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                    onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                                    onDrop={onDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{
                                        border: `2px dashed ${isDragging ? '#16a34a' : '#cbd5e1'}`,
                                        borderRadius: '10px',
                                        padding: '24px 16px',
                                        textAlign: 'center',
                                        background: isDragging ? '#f0fdf4' : '#fafafa',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        style={{ display: 'none' }}
                                        accept=".sav"
                                        onChange={handleFileChange}
                                    />
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                                        <UploadCloud size={22} />
                                    </div>
                                    <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#0f172a' }}>
                                        여기에 파일을 끌어다 놓거나 클릭하여 선택하세요
                                    </div>
                                    <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                                        ※ SPSS 파일(.sav) 형식만 지원합니다. (최대 300MB)
                                    </div>
                                </div>
                            ) : (
                                /* 파일 선택 완료 표시 박스 */
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✓</span>
                                        <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#166534' }}>{selectedFile.name}</span>
                                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                                            · {selectedFile.size >= 1048576 ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)}MB` : `${(selectedFile.size / 1024).toFixed(0)}KB`}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleClearFile}
                                        style={{ border: '1px solid #cbd5e1', background: '#ffffff', borderRadius: '5px', padding: '3px 8px', fontSize: '11.5px', color: '#475569', cursor: 'pointer' }}
                                    >
                                        다른 파일
                                    </button>
                                </div>
                            )}

                            {/* 신규등록만: 설문 이름 입력칸 */}
                            {activeTab === 'new' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <label style={{ width: '70px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>설문 이름</label>
                                    <input
                                        type="text"
                                        placeholder="비워두면 기존 설문 이름 유지"
                                        value={projectName}
                                        onChange={(e) => setProjectName(e.target.value)}
                                        style={{ flex: 1, height: '34px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                    />
                                </div>
                            )}

                            {/* ───────────────────────────────────────────────────────── */}
                            {/* 칸 묶기 영역 (파일 선택 시 표시)                         */}
                            {/* ───────────────────────────────────────────────────────── */}
                            {selectedFile && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                                    {isAnalyzingColumns ? (
                                        <div style={{ padding: '16px', textAlign: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12.5px', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                            <RefreshCw size={14} className="animate-spin text-green-600" />
                                            <span>칸 목록을 분석하는 중... (잠시만 기다려 주세요)</span>
                                        </div>
                                    ) : (
                                        <div style={{ border: '1.5px solid #16a34a', borderRadius: '10px', overflow: 'hidden', background: '#ffffff' }}>
                                            {/* 헤더 바 */}
                                            <div style={{ background: '#16a34a', color: '#ffffff', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '14px', fontWeight: '700', letterSpacing: '-0.2px' }}>
                                                        멀티 문항 묶기
                                                    </span>
                                                </div>
                                                <span style={{ fontSize: '12.5px', color: '#f0fdf4', fontWeight: '500', letterSpacing: '-0.2px' }}>
                                                    선택한 문항만 하나로 묶이며, 이름과 라벨을 직접 수정할 수 있습니다
                                                </span>
                                            </div>

                                            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                {/* 서버 안내 메시지 */}
                                                <div style={{ fontSize: '12.5px', color: '#166534', fontWeight: '600' }}>
                                                    {columnsData?.messages && columnsData.messages.length > 0
                                                        ? columnsData.messages.join(' ')
                                                        : activeGroups.length > 0
                                                            ? `멀티로 보이는 묶음 ${activeGroups.length}개를 찾았습니다. 맞으면 그대로 두고, 아니면 빼 주세요.`
                                                            : '자동으로 묶을 수 있는 멀티 문항이 발견되지 않았습니다. 필요 시 아래 [직접 묶기]를 사용하세요.'
                                                    }
                                                </div>

                                                {/* 묶음 카드 목록 */}
                                                {activeGroups.map((group, gIdx) => (
                                                    <div
                                                        key={group.id}
                                                        style={{
                                                            border: '1px solid #bbf7d0',
                                                            background: group.checked ? '#f0fdf4' : '#f8fafc',
                                                            borderRadius: '8px',
                                                            padding: '10px 12px',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '6px',
                                                            opacity: group.checked ? 1 : 0.65,
                                                            transition: 'all 0.15s'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', fontSize: '13px' }}>
                                                                <div
                                                                    onClick={() => {
                                                                        const val = !group.checked;
                                                                        setActiveGroups(prev => prev.map((g, i) => i === gIdx ? { ...g, checked: val } : g));
                                                                    }}
                                                                    style={{
                                                                        width: '16px',
                                                                        height: '16px',
                                                                        borderRadius: '3px',
                                                                        border: `1.5px solid ${group.checked ? '#16a34a' : '#cbd5e1'}`,
                                                                        background: group.checked ? '#16a34a' : '#ffffff',
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        cursor: 'pointer',
                                                                        flexShrink: 0
                                                                    }}
                                                                >
                                                                    {group.checked && <Check size={12} color="#ffffff" strokeWidth={3.5} />}
                                                                </div>
                                                                <span>이름</span>
                                                            </div>

                                                            {/* 이름 입력칸 */}
                                                            <input
                                                                type="text"
                                                                value={group.name}
                                                                disabled={group.isSaved && activeTab === 'update'}
                                                                placeholder="비우면 자동"
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setActiveGroups(prev => prev.map((g, i) => i === gIdx ? { ...g, name: val } : g));
                                                                }}
                                                                style={{
                                                                    width: '120px',
                                                                    height: '28px',
                                                                    padding: '0 8px',
                                                                    borderRadius: '5px',
                                                                    border: '1px solid #cbd5e1',
                                                                    fontSize: '12.5px',
                                                                    background: (group.isSaved && activeTab === 'update') ? '#f1f5f9' : '#ffffff'
                                                                }}
                                                            />

                                                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>라벨</span>

                                                            {/* 라벨 입력칸 */}
                                                            <input
                                                                type="text"
                                                                value={group.label}
                                                                disabled={group.isSaved && activeTab === 'update'}
                                                                placeholder="비우면 자동"
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setActiveGroups(prev => prev.map((g, i) => i === gIdx ? { ...g, label: val } : g));
                                                                }}
                                                                style={{
                                                                    flex: 1,
                                                                    minWidth: '180px',
                                                                    height: '28px',
                                                                    padding: '0 8px',
                                                                    borderRadius: '5px',
                                                                    border: '1px solid #cbd5e1',
                                                                    fontSize: '12.5px',
                                                                    background: (group.isSaved && activeTab === 'update') ? '#f1f5f9' : '#ffffff'
                                                                }}
                                                            />
                                                        </div>

                                                        {/* 사유 및 포함된 칸 목록 */}
                                                        <div style={{ fontSize: '11.5px', color: '#64748b', paddingLeft: '22px', lineHeight: '1.4' }}>
                                                            {group.reason}
                                                        </div>
                                                    </div>
                                                ))}

                                                {/* 직접 묶기 (접힘 / 아코디언) */}
                                                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginTop: '2px' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsDirectGroupingOpen(!isDirectGroupingOpen)}
                                                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12.5px', fontWeight: '600', color: '#2563eb', padding: '4px 0' }}
                                                    >
                                                        {isDirectGroupingOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                        <span>직접 묶기(필요할 때만)</span>
                                                    </button>

                                                    {isDirectGroupingOpen && (
                                                        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                            <div style={{ maxHeight: '340px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#ffffff' }}>
                                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                                                    <thead>
                                                                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                                                                            <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc', width: '46px', minWidth: '46px', padding: '8px 8px', textAlign: 'center' }}>선택</th>
                                                                            <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc', width: '100px', minWidth: '100px', padding: '8px 10px', textAlign: 'left' }}>칸</th>
                                                                            <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc', padding: '8px 12px', textAlign: 'left' }}>라벨</th>
                                                                            <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc', width: '80px', padding: '7px 8px', textAlign: 'left' }}>보기</th>
                                                                            <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f8fafc', width: '130px', padding: '7px 8px', textAlign: 'left' }}>사유</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {(columnsData?.columns || []).map((col, cIdx) => {
                                                                            const isAlreadyGrouped = groupedColumnNames.has(col.name);
                                                                            const isDisabled = col.isPid || col.kind === 'text' || col.zeroOneOnly || col.autoGroup || isAlreadyGrouped;
                                                                            const isChecked = directSelectedCols.includes(col.name);

                                                                            let reasonText = '';
                                                                            if (col.isPid) reasonText = '응답자 번호';
                                                                            else if (col.kind === 'text') reasonText = '글자 칸';
                                                                            else if (col.zeroOneOnly) reasonText = '0 · 1 칸 — 아직 못 묶음';
                                                                            else if (col.autoGroup) reasonText = '규칙으로 자동 묶임';
                                                                            else if (isAlreadyGrouped) reasonText = '묶음에 들어 있음';

                                                                            return (
                                                                                <tr
                                                                                    key={cIdx}
                                                                                    onClick={() => {
                                                                                        if (isDisabled) return;
                                                                                        if (isChecked) {
                                                                                            setDirectSelectedCols(prev => prev.filter(c => c !== col.name));
                                                                                        } else {
                                                                                            setDirectSelectedCols(prev => [...prev, col.name]);
                                                                                        }
                                                                                    }}
                                                                                    style={{
                                                                                        borderBottom: isChecked ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                                                                                        background: isDisabled ? '#f8fafc' : isChecked ? '#f0fdf4' : '#ffffff',
                                                                                        opacity: isDisabled ? 0.6 : 1,
                                                                                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                                                        transition: 'background-color 0.15s'
                                                                                    }}
                                                                                >
                                                                                    <td style={{ width: '42px', minWidth: '42px', padding: '8px 8px', textAlign: 'center' }}>
                                                                                        <div
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                if (isDisabled) return;
                                                                                                if (isChecked) {
                                                                                                    setDirectSelectedCols(prev => prev.filter(c => c !== col.name));
                                                                                                } else {
                                                                                                    setDirectSelectedCols(prev => [...prev, col.name]);
                                                                                                }
                                                                                            }}
                                                                                            style={{
                                                                                                width: '16px',
                                                                                                height: '16px',
                                                                                                borderRadius: '3px',
                                                                                                border: `1.5px solid ${isChecked ? '#16a34a' : isDisabled ? '#e2e8f0' : '#cbd5e1'}`,
                                                                                                background: isChecked ? '#16a34a' : isDisabled ? '#f1f5f9' : '#ffffff',
                                                                                                display: 'inline-flex',
                                                                                                alignItems: 'center',
                                                                                                justifyContent: 'center',
                                                                                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                                                                margin: '0 auto',
                                                                                                flexShrink: 0
                                                                                            }}
                                                                                        >
                                                                                            {isChecked && <Check size={12} color="#ffffff" strokeWidth={3.5} />}
                                                                                        </div>
                                                                                    </td>
                                                                                    <td style={{ padding: '8px 10px', fontWeight: 'bold', color: '#0f172a' }}>{col.name}</td>
                                                                                    <td style={{ padding: '8px 10px', color: '#334155', lineHeight: '1.4' }}>{col.label}</td>
                                                                                    <td style={{ padding: '8px 10px', color: '#64748b' }}>
                                                                                        {col.valueLabels ? `보기 ${col.valueLabels}` : ''}
                                                                                    </td>
                                                                                    <td style={{ padding: '8px 10px', color: '#94a3b8', fontSize: '11px' }}>{reasonText}</td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            </div>

                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                                                <button
                                                                    type="button"
                                                                    disabled={directSelectedCols.length < 2}
                                                                    onClick={handleDirectGroupSubmit}
                                                                    style={{
                                                                        padding: '5px 12px',
                                                                        borderRadius: '6px',
                                                                        border: '1px solid #cbd5e1',
                                                                        background: directSelectedCols.length >= 2 ? '#16a34a' : '#f1f5f9',
                                                                        color: directSelectedCols.length >= 2 ? '#ffffff' : '#94a3b8',
                                                                        fontSize: '12px',
                                                                        fontWeight: '600',
                                                                        cursor: directSelectedCols.length >= 2 ? 'pointer' : 'not-allowed'
                                                                    }}
                                                                >
                                                                    고른 칸을 멀티로 묶기 ({directSelectedCols.length}개)
                                                                </button>
                                                                <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                                                                    칸 차례 = 응답 차례 (순위면 1위부터)
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ───────────────────────────────────────────────────────────── */}
                    {/* STEP 1.5: 검사 진행 중 로딩 화면                             */}
                    {/* ───────────────────────────────────────────────────────────── */}
                    {step === 1.5 && (
                        <div style={{ padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', textAlign: 'center' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                                <RefreshCw size={24} className="animate-spin" />
                            </div>
                            <h4 style={{ margin: 0, fontSize: '17px', fontWeight: 'bold', color: '#0f172a' }}>
                                SAV 파일을 검사하는 중입니다...
                            </h4>
                            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
                                변수 1,000개 기준 약 1분 안팎이 소요됩니다.<br />
                                잠시만 기다려 주세요.
                            </p>
                        </div>
                    )}

                    {/* ───────────────────────────────────────────────────────────── */}
                    {/* STEP 2: 확인 화면 (작업체크 B)                                */}
                    {/* ───────────────────────────────────────────────────────────── */}
                    {step === 2 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                            {/* [경우 A: canApply === false] 적용 불가 화면 (목업 3번째 이미지) */}
                            {resData.canApply === false ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ border: '1.5px solid #fecaca', borderRadius: '8px', overflow: 'hidden', background: '#ffffff' }}>
                                        <div style={{ background: '#dc2626', color: '#ffffff', padding: '10px 14px', fontWeight: 'bold', fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span>⛔ 이 설문에는 적용할 수 없습니다.</span>
                                        </div>
                                        <div style={{ padding: '14px 16px', fontSize: '13px', color: '#7f1d1d', lineHeight: '1.5' }}>
                                            {(resData.fileErrors && resData.fileErrors.length > 0)
                                                ? resData.fileErrors.join('\n')
                                                : (resData.blocking && resData.blocking.length > 0)
                                                    ? resData.blocking.join('\n')
                                                    : (resData.message || '파일 또는 설문 조건에 문제가 있어 적용할 수 없습니다.')
                                            }
                                        </div>
                                    </div>

                                    <div style={{ fontSize: '12.5px', color: '#64748b' }}>
                                        이 파일은 적용할 수 없어 적용 버튼이 없습니다. 파일을 고쳐 다시 올려 주세요.
                                    </div>
                                </div>
                            ) : (
                                /* [경우 B: canApply === true] 정상 확인 화면 */
                                <>
                                    {/* 상단: 이번에 쓴 묶음이 있으면 한 줄 표시 */}
                                    {resData.groups && resData.groups.length > 0 && (
                                        <div style={{ fontSize: '12px', color: '#166534', background: '#f0fdf4', padding: '6px 10px', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                                            ✓ 이번 검사에 쓴 묶음: {resData.groups.map(g => `${g.name || '멀티'}(${g.columns?.length || 0}칸)`).join(', ')}
                                        </div>
                                    )}

                                    {/* ① 숫자 카드 한 줄 (목업 1~2 이미지 맞춤) */}
                                    <div style={{ display: 'grid', gridTemplateColumns: activeTab === 'new' && (resData.respondents?.removed || 0) > 0 ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)', gap: '8px' }}>
                                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px' }}>
                                            <div style={{ fontSize: '12px', color: '#64748b' }}>변수</div>
                                            <div style={{ fontSize: '17px', fontWeight: 'bold', color: '#0f172a', marginTop: '2px' }}>
                                                {(resData.summary?.savVariables ?? resData.summary?.variablesInSav ?? 0).toLocaleString()}
                                            </div>
                                        </div>

                                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px' }}>
                                            <div style={{ fontSize: '12px', color: '#64748b' }}>응답자 수</div>
                                            <div style={{ fontSize: '17px', fontWeight: 'bold', color: '#0f172a', marginTop: '2px' }}>
                                                {activeTab === 'new'
                                                    ? `${(resData.respondents?.sav ?? resData.respondents?.current ?? 0).toLocaleString()}명`
                                                    : `${((resData.respondents?.current ?? 0) + (resData.respondents?.added ?? 0)).toLocaleString()}명`
                                                }
                                            </div>
                                        </div>

                                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px' }}>
                                            <div style={{ fontSize: '12px', color: '#64748b' }}>유형 확인 필요</div>
                                            <div style={{ fontSize: '17px', fontWeight: 'bold', color: (resData.review?.length || 0) > 0 ? '#d97706' : '#64748b', marginTop: '2px' }}>
                                                {(resData.review?.length || 0).toLocaleString()}
                                            </div>
                                        </div>

                                        {/* 신규등록 중 기존 설문 덮기 시 지워지는 응답 표시 */}
                                        {activeTab === 'new' && (resData.respondents?.removed || 0) > 0 && (
                                            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px' }}>
                                                <div style={{ fontSize: '12px', color: '#b91c1c' }}>지워지는 응답</div>
                                                <div style={{ fontSize: '17px', fontWeight: 'bold', color: '#dc2626', marginTop: '2px' }}>
                                                    {(resData.respondents?.removed || 0).toLocaleString()}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* ② 「적용 전에 확인할 것」 (주황색 테두리 카드 - 고를 것이 있을 때만 그림) */}
                                    {hasThingsToCheck && (
                                        <div style={{ border: '2px solid #f59e0b', borderRadius: '10px', overflow: 'hidden', background: '#ffffff' }}>
                                            {/* 주황색 헤더 */}
                                            <div style={{ background: '#f59e0b', color: '#ffffff', padding: '8px 14px', fontWeight: 'bold', fontSize: '13.5px' }}>
                                                적용 전에 확인할 것
                                            </div>

                                            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                {/* 1. 필수 확인 사항 (confirmRequired) */}
                                                {hasConfirms && (
                                                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <AlertTriangle size={15} color="#d97706" />
                                                            <span>필수 확인 사항 — 아래 항목을 모두 체크해야 적용할 수 있습니다</span>
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '4px' }}>
                                                            {resData.confirmRequired.map(item => {
                                                                const key = typeof item === 'string' ? item : item.key;
                                                                const label = typeof item === 'object' && item.message ? item.message : (CONFIRM_LABELS[key] || key);
                                                                const isChecked = !!confirmChecks[key];

                                                                return (
                                                                    <label
                                                                        key={key}
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            setConfirmChecks(prev => ({ ...prev, [key]: !isChecked }));
                                                                        }}
                                                                        style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '12.5px', color: '#78350f', lineHeight: '1.4' }}
                                                                    >
                                                                        <div
                                                                            style={{
                                                                                marginTop: '2px',
                                                                                width: '16px',
                                                                                height: '16px',
                                                                                borderRadius: '3px',
                                                                                border: `1.5px solid ${isChecked ? '#d97706' : '#fca5a5'}`,
                                                                                background: isChecked ? '#d97706' : '#ffffff',
                                                                                display: 'inline-flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                cursor: 'pointer',
                                                                                flexShrink: 0
                                                                            }}
                                                                        >
                                                                            {isChecked && <Check size={12} color="#ffffff" strokeWidth={3.5} />}
                                                                        </div>
                                                                        <span style={{ fontWeight: isChecked ? '700' : '500' }}>{label}</span>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* 2. 값이 사라지는 경고 (valueWarnings - 빨간 상자, 절대 접지 않음!) */}
                                                {hasValueWarnings && (
                                                    <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '8px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <AlertTriangle size={15} color="#dc2626" />
                                                            <span>값이 사라지는 경고</span>
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#991b1b', lineHeight: '1.4' }}>
                                                            {resData.valueWarnings.map((warn, wIdx) => (
                                                                <div key={wIdx}>
                                                                    • <strong>{warn.variable}</strong>: 보기에 없는 값({warn.notInLabels || 0}건)은 삭제됩니다.
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* 3. 유형 확인이 필요한 변수 (review 테이블) */}
                                                {hasReviews && (
                                                    <div style={{ border: '1px solid #fde68a', borderRadius: '8px', overflow: 'hidden' }}>
                                                        <div style={{ background: '#fffdf0', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #fde68a' }}>
                                                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#92400e' }}>
                                                                유형 확인이 필요한 변수 {resData.review.length}개
                                                            </span>
                                                            <span style={{ fontSize: '11.5px', color: '#78350f' }}>
                                                                ※ 별도로 수정하지 않으면 자동 판단된 유형으로 등록됩니다
                                                            </span>
                                                        </div>

                                                        <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                                                                <thead>
                                                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                                                                        <th style={{ width: '100px', padding: '6px 10px', textAlign: 'left' }}>변수</th>
                                                                        <th style={{ padding: '6px 10px', textAlign: 'left' }}>라벨</th>
                                                                        <th style={{ width: '130px', padding: '6px 10px', textAlign: 'right' }}>유형</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {resData.review.map((item, rIdx) => {
                                                                        const vName = item.variable || item.varName;
                                                                        const options = item.options || ['single', 'multi', 'open', 'number', 'rank', 'scale'];

                                                                        return (
                                                                            <tr key={rIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                                                <td style={{ padding: '6px 10px', fontWeight: 'bold', color: '#0f172a' }}>{vName}</td>
                                                                                <td style={{ padding: '6px 10px', color: '#334155' }}>
                                                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                                                                        <span>{item.label}</span>
                                                                                        {item.reviewReason && (
                                                                                            <span
                                                                                                title={item.reviewReason}
                                                                                                style={{
                                                                                                    display: 'inline-flex',
                                                                                                    alignItems: 'center',
                                                                                                    justifyContent: 'center',
                                                                                                    color: '#94a3b8',
                                                                                                    cursor: 'default'
                                                                                                }}
                                                                                            >
                                                                                                <Info size={14} />
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </td>
                                                                                <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                                                                                    {(() => {
                                                                                        const currentVal = typeOverrides[vName] || item.type || 'single';
                                                                                        const dropdownData = options.map(opt => ({
                                                                                            text: TYPE_LABELS[opt] || opt,
                                                                                            value: opt
                                                                                        }));
                                                                                        const selectedItem = dropdownData.find(d => d.value === currentVal) || { text: TYPE_LABELS[currentVal] || currentVal, value: currentVal };

                                                                                        return (
                                                                                            <div style={{ display: 'inline-block', width: '130px', textAlign: 'left' }}>
                                                                                                <DropDownList
                                                                                                    className="sav-type-dropdown"
                                                                                                    data={dropdownData}
                                                                                                    textField="text"
                                                                                                    dataItemKey="value"
                                                                                                    value={selectedItem}
                                                                                                    onChange={(e) => {
                                                                                                        const val = e.value?.value || e.value;
                                                                                                        setTypeOverrides(prev => ({ ...prev, [vName]: val }));
                                                                                                    }}
                                                                                                    style={{ width: '100%', height: '28px', fontSize: '12px' }}
                                                                                                />
                                                                                            </div>
                                                                                        );
                                                                                    })()}
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* 4. 보기 차이 (labelChanges 중 different 문항) */}
                                                {hasLabelChanges && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                        <div style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#334155' }}>보기 차이 확인:</div>
                                                        {differentLabelItems.map((item, lIdx) => {
                                                            const vName = item.variable || item.varName;
                                                            return (
                                                                <label
                                                                    key={lIdx}
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        setLabelFromSavChecks(prev => ({ ...prev, [vName]: !labelFromSavChecks[vName] }));
                                                                    }}
                                                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569', cursor: 'pointer' }}
                                                                >
                                                                    <div
                                                                        style={{
                                                                            width: '15px',
                                                                            height: '15px',
                                                                            borderRadius: '3px',
                                                                            border: `1.5px solid ${labelFromSavChecks[vName] ? '#16a34a' : '#cbd5e1'}`,
                                                                            background: labelFromSavChecks[vName] ? '#16a34a' : '#ffffff',
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            cursor: 'pointer',
                                                                            flexShrink: 0
                                                                        }}
                                                                    >
                                                                        {labelFromSavChecks[vName] && <Check size={11} color="#ffffff" strokeWidth={3.5} />}
                                                                    </div>
                                                                    <span><strong>{vName}</strong> 보기 글을 SAV 글로 바꾸기</span>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* ③ ▸ 자세히 보기 (접힘 상태) */}
                                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: '#f8fafc' }}>
                                        <button
                                            type="button"
                                            onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                                            style={{
                                                width: '100%',
                                                padding: '10px 14px',
                                                border: 'none',
                                                background: 'transparent',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                cursor: 'pointer',
                                                fontSize: '12.5px',
                                                fontWeight: '600',
                                                color: '#475569'
                                            }}
                                        >
                                            <span>
                                                {isDetailsOpen ? '▾' : '▸'} 자세히 보기 — 적용하면 어떻게 되는지 · 자동으로 정한 유형 · 알림 (읽기만)
                                            </span>
                                            {isDetailsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                        </button>

                                        {isDetailsOpen && (
                                            <div style={{ padding: '12px 14px', borderTop: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', color: '#475569' }}>
                                                {/* 서버 messages 완성 문장 */}
                                                {resData.messages && resData.messages.length > 0 && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                        {resData.messages.map((msg, mIdx) => (
                                                            <div key={mIdx} style={{ lineHeight: '1.4' }}>• {msg}</div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* 자동 판정 유형 요약 */}
                                                {resData.autoTypes && resData.autoTypes.length > 0 && (
                                                    <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '8px' }}>
                                                        <strong style={{ color: '#0f172a' }}>자동으로 판정한 유형 ({resData.autoTypes.length}개):</strong>
                                                        <div style={{ maxHeight: '120px', overflowY: 'auto', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                            {resData.autoTypes.map((at, aIdx) => (
                                                                <div key={aIdx}>
                                                                    {at.variable} ({at.label}): {TYPE_LABELS[at.type] || at.type}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* ───────────────────────────────────────────────────────────── */}
                    {/* STEP 2.5: 적용 진행 중 로딩 화면                             */}
                    {/* ───────────────────────────────────────────────────────────── */}
                    {step === 2.5 && (
                        <div style={{ padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', textAlign: 'center' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                                <RefreshCw size={24} className="animate-spin" />
                            </div>
                            <h4 style={{ margin: 0, fontSize: '17px', fontWeight: 'bold', color: '#0f172a' }}>
                                맵과 응답 데이터를 적용하는 중입니다...
                            </h4>
                            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                                잠시만 기다려 주세요.
                            </p>
                        </div>
                    )}

                    {/* ───────────────────────────────────────────────────────────── */}
                    {/* STEP 3: 적용 완료 화면 (작업체크 D)                            */}
                    {/* ───────────────────────────────────────────────────────────── */}
                    {step === 3 && (
                        <div style={{ padding: '24px 10px 10px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                            {/* 초록색 큰 체크 원형 아이콘 */}
                            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#16a34a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Check size={32} strokeWidth={3} />
                            </div>

                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#0f172a' }}>
                                {activeTab === 'new' ? '신규등록을 마쳤습니다' : '업데이트를 마쳤습니다'}
                            </h3>

                            {/* 숫자 카드 한 줄 */}
                            <div style={{ width: '100%', display: 'grid', gridTemplateColumns: activeTab === 'new' ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '8px' }}>
                                {activeTab === 'new' ? (
                                    <>
                                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
                                            <div style={{ fontSize: '12px', color: '#64748b' }}>변수</div>
                                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', marginTop: '2px' }}>
                                                {(applyResult?.resultjson?.added ?? validationResult?.summary?.savVariables ?? 0).toLocaleString()}
                                            </div>
                                        </div>
                                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
                                            <div style={{ fontSize: '12px', color: '#64748b' }}>응답자</div>
                                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', marginTop: '2px' }}>
                                                {(validationResult?.respondents?.sav ?? validationResult?.respondents?.current ?? 0).toLocaleString()}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px' }}>
                                            <div style={{ fontSize: '11.5px', color: '#64748b' }}>응답자</div>
                                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', marginTop: '2px' }}>
                                                {(applyResult?.resultjson?.answers ?? 0).toLocaleString()}
                                            </div>
                                        </div>
                                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px' }}>
                                            <div style={{ fontSize: '11.5px', color: '#64748b' }}>새 변수</div>
                                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', marginTop: '2px' }}>
                                                {(applyResult?.resultjson?.added ?? 0).toLocaleString()}
                                            </div>
                                        </div>
                                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px' }}>
                                            <div style={{ fontSize: '11.5px', color: '#64748b' }}>유지한 변수</div>
                                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', marginTop: '2px' }}>
                                                {(applyResult?.resultjson?.kept ?? 0).toLocaleString()}
                                            </div>
                                        </div>
                                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px' }}>
                                            <div style={{ fontSize: '11.5px', color: '#64748b' }}>AI 오픈코딩 유지</div>
                                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', marginTop: '2px' }}>
                                                {(applyResult?.resultjson?.aiOpenCarried ?? 0).toLocaleString()}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* ▸ 자세히 보기 (접힘) */}
                            <div style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: '#f8fafc' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsApplyDetailsOpen(!isApplyDetailsOpen)}
                                    style={{
                                        width: '100%',
                                        padding: '9px 12px',
                                        border: 'none',
                                        background: 'transparent',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        color: '#475569'
                                    }}
                                >
                                    <span>{isApplyDetailsOpen ? '▾' : '▸'} 자세히 보기 — 적용한 내용 전체 (읽기만)</span>
                                    {isApplyDetailsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </button>
                                {isApplyDetailsOpen && (
                                    <div style={{ padding: '10px 12px', borderTop: '1px solid #e2e8f0', background: '#ffffff', fontSize: '12px', color: '#334155', lineHeight: '1.5' }}>
                                        {applyResult?.message || applyResult?.resultjson?.message || '적용 처리가 완료되었습니다.'}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer Actions */}
                <div style={{ padding: '12px 22px', borderTop: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                    {/* 좌측 안내문구 */}
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                        {step === 1 && (
                            <span>※ 등록하기를 눌러도 바로 저장되지 않습니다 — 다음 화면에서 확인한 뒤 적용합니다</span>
                        )}
                        {step === 2 && resData.canApply !== false && (
                            hasConfirms && isApplyDisabled() ? (
                                <span style={{ color: '#d97706', fontWeight: 'bold' }}>필수 확인 사항을 체크하면 적용할 수 있습니다</span>
                            ) : (
                                <span>확인 결과는 1시간 동안 유효합니다</span>
                            )
                        )}
                    </div>

                    {/* 우측 버튼들 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                        {step === 1 && (
                            <>
                                <button
                                    type="button"
                                    onClick={handleModalClose}
                                    style={{ height: '34px', padding: '0 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                                >
                                    취소
                                </button>
                                <button
                                    type="button"
                                    onClick={handleStartValidate}
                                    disabled={!selectedFile || isAnalyzingColumns}
                                    style={{
                                        height: '34px',
                                        padding: '0 20px',
                                        borderRadius: '6px',
                                        border: 'none',
                                        background: (!selectedFile || isAnalyzingColumns) ? '#cbd5e1' : '#16a34a',
                                        color: '#ffffff',
                                        fontSize: '13px',
                                        fontWeight: '700',
                                        cursor: (!selectedFile || isAnalyzingColumns) ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    등록하기
                                </button>
                            </>
                        )}

                        {step === 1.5 && (
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                style={{ height: '34px', padding: '0 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                            >
                                취소
                            </button>
                        )}

                        {step === 2 && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    style={{ height: '34px', padding: '0 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                                >
                                    파일 재선택
                                </button>
                                <button
                                    type="button"
                                    onClick={handleModalClose}
                                    style={{ height: '34px', padding: '0 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                                >
                                    {resData.canApply === false ? '닫기' : '취소'}
                                </button>
                                {resData.canApply !== false && (
                                    <button
                                        type="button"
                                        onClick={handleStartApply}
                                        disabled={isApplyDisabled()}
                                        style={{
                                            height: '34px',
                                            padding: '0 20px',
                                            borderRadius: '6px',
                                            border: 'none',
                                            background: isApplyDisabled() ? '#cbd5e1' : '#16a34a',
                                            color: '#ffffff',
                                            fontSize: '13px',
                                            fontWeight: '700',
                                            cursor: isApplyDisabled() ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        {activeTab === 'new' ? '신규등록 적용' : '업데이트 적용'}
                                    </button>
                                )}
                            </>
                        )}

                        {step === 2.5 && (
                            <button
                                type="button"
                                onClick={handleModalClose}
                                style={{ height: '34px', padding: '0 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                            >
                                닫기
                            </button>
                        )}

                        {step === 3 && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => {
                                        handleFinishClose();
                                        if (onOpenBatchMapEdit) onOpenBatchMapEdit();
                                    }}
                                    style={{
                                        border: 'none',
                                        background: 'transparent',
                                        color: '#2563eb',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        marginRight: '6px'
                                    }}
                                >
                                    맵 엑셀로 유형 고치기 →
                                </button>
                                <button
                                    type="button"
                                    onClick={handleFinishClose}
                                    style={{
                                        height: '34px',
                                        padding: '0 22px',
                                        borderRadius: '6px',
                                        border: 'none',
                                        background: '#16a34a',
                                        color: '#ffffff',
                                        fontSize: '13px',
                                        fontWeight: '700',
                                        cursor: 'pointer'
                                    }}
                                >
                                    닫기
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DataUpdateModal;
