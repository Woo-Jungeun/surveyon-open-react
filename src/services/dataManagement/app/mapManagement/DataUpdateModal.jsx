import React, { useRef, useState, useContext, useEffect } from 'react';
import {
    UploadCloud, X, Info, RefreshCw, AlertTriangle,
    AlertCircle, ArrowLeft, Sparkles, Trash2, FileSpreadsheet, CheckCircle2, ChevronDown, ChevronUp, Check
} from 'lucide-react';
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
    const modal = useContext(modalContext);
    const { validateSav, applySav, syncMap } = MapManagementPageApi();
    const auth = useSelector((store) => store.auth);

    const [activeTab, setActiveTab] = useState('new'); // 'new' | 'update'
    const [step, setStep] = useState(1); // 1: 파일고르기, 1.5: 검사중, 2: 검사결과, 2.5: 적용중, 3: 적용완료
    const [selectedFile, setSelectedFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [projectName, setProjectName] = useState('');

    // Step 2 State
    const [validationResult, setValidationResult] = useState(null);
    const [confirmChecks, setConfirmChecks] = useState({});
    const [typeOverrides, setTypeOverrides] = useState({});
    const [deleteVarChecks, setDeleteVarChecks] = useState({});
    const [labelFromSavChecks, setLabelFromSavChecks] = useState({});

    // Collapsible states
    const [showRemovedPids, setShowRemovedPids] = useState(false);
    const [showAutoTypes, setShowAutoTypes] = useState(false);

    // Step 3 State
    const [applyResult, setApplyResult] = useState(null);


    // 팝업 열림/닫힘 시 상태 완전 초기화
    const resetAllState = () => {
        setSelectedFile(null);
        setStep(1);
        setValidationResult(null);
        setConfirmChecks({});
        setTypeOverrides({});
        setDeleteVarChecks({});
        setLabelFromSavChecks({});
        setShowRemovedPids(false);
        setShowAutoTypes(false);
        setApplyResult(null);
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

    if (!isOpen) return null;

    const handleModalClose = () => {
        resetAllState();
        onClose();
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        resetAllState();
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
            setProjectName(sessionStorage.getItem('projectname') || '');
        }
    };

    const onDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const onDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const onDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setSelectedFile(e.dataTransfer.files[0]);
            setProjectName(sessionStorage.getItem('projectname') || '');
            if (fileInputRef.current) {
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(e.dataTransfer.files[0]);
                fileInputRef.current.files = dataTransfer.files;
            }
        }
    };

    const handleFileSelectClick = (e) => {
        if (e) e.stopPropagation();
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleClearFile = (e) => {
        if (e) e.stopPropagation();
        setSelectedFile(null);
        setProjectName(sessionStorage.getItem('projectname') || '');
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    // Step 1 -> Step 2 (POST /data/sav/validate)
    const handleStartValidate = async () => {
        if (!selectedFile) {
            modal.showErrorAlert("알림", "검사할 SAV 파일을 선택해주세요.");
            return;
        }

        const fileName = selectedFile.name.toLowerCase();
        if (!fileName.endsWith('.sav')) {
            modal.showErrorAlert("알림", ".sav 형식의 파일만 검사할 수 있습니다.");
            return;
        }

        const pn = sessionStorage.getItem('merge_pn') || sessionStorage.getItem('projectnum');
        const userId = auth?.user?.userId || '';

        if (!pn) {
            modal.showErrorAlert("알림", "프로젝트 정보를 찾을 수 없습니다.");
            return;
        }

        // 로딩 화면 (Step 1.5: 검사 중)
        setStep(1.5);

        const formData = new FormData();
        formData.append("pn", pn);
        formData.append("file", selectedFile);
        formData.append("mode", activeTab); // 'new' | 'update'
        if (userId) formData.append("user", userId);
        if (activeTab === 'new' && projectName.trim()) {
            formData.append("projectName", projectName.trim());
        }

        try {
            const res = await validateSav.mutateAsync(formData);
            const resData = (res && typeof res.resultjson === 'object' && res.resultjson !== null)
                ? { ...res, ...res.resultjson }
                : (res || {});

            setValidationResult(resData);

            // 1. 필수 확인 항목 초기화
            const initConfirm = {};
            const confirmList = resData.confirmRequired || [];
            confirmList.forEach(item => {
                const key = typeof item === 'string' ? item : item.key;
                initConfirm[key] = false;
            });
            setConfirmChecks(initConfirm);

            // 2. AI 변수 유형 초기화 (review)
            const initTypes = {};
            const reviewList = resData.review || [];
            reviewList.forEach(item => {
                const vName = item.variable || item.varName;
                if (vName) {
                    initTypes[vName] = item.type || item.suggestedType || 'single';
                }
            });
            setTypeOverrides(initTypes);

            // 3. SAV 미존재 변수 삭제 선택 초기화 (기본: false = 남김)
            const initDeleteVars = {};
            const missingList = resData.missingInSavList || [];
            missingList.forEach(item => {
                const vName = item.variable || item.varName;
                if (vName) {
                    initDeleteVars[vName] = false;
                }
            });
            setDeleteVarChecks(initDeleteVars);

            // 4. SAV 글로 바꾸기 선택 초기화 (different 문항만, 기본: false = 해제)
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
            modal.showErrorAlert("에러", "검사 요청 중 오류가 발생했습니다.", { zIndex: 99999 });
        }
    };

    // Step 2 -> Step 3 (POST /data/sav/apply)
    const handleStartApply = async () => {
        const resData = (validationResult && typeof validationResult.resultjson === 'object' && validationResult.resultjson !== null)
            ? { ...validationResult, ...validationResult.resultjson }
            : (validationResult || {});

        if (!resData || !resData.checkId) {
            modal.showErrorAlert("알림", "검사 정보가 유효하지 않습니다. 다시 검사해 주세요.");
            return;
        }

        if (resData.canApply === false) {
            modal.showErrorAlert("적용 불가", "검사 결과 적용이 불가능합니다. 파일 문제 또는 설문 오류를 확인해 주세요.");
            return;
        }

        // 필수 확인 항목 체크 여부 검증
        const requiredList = resData.confirmRequired || [];
        const missingConfirms = requiredList.filter(item => {
            const key = typeof item === 'string' ? item : item.key;
            return !confirmChecks[key];
        });

        if (missingConfirms.length > 0) {
            modal.showErrorAlert("알림", "필수 확인 항목에 모두 동의해주셔야 적용을 진행할 수 있습니다.");
            return;
        }

        const deleteVarList = Object.keys(deleteVarChecks).filter(k => deleteVarChecks[k]);

        // 지우는 변수가 있으면 2차 확인 창
        if (deleteVarList.length > 0) {
            const confirmed = await new Promise((resolve) => {
                modal.showConfirm(
                    "변수 삭제 경고",
                    `변수 ${deleteVarList.length}개(${deleteVarList.join(', ')})를 지웁니다.\n되살릴 수 없습니다. 계속할까요?`,
                    {
                        btns: [
                            { title: "취소", click: () => resolve(false) },
                            { title: "삭제 후 적용", click: () => resolve(true) }
                        ]
                    }
                );
            });
            if (!confirmed) return;
        }

        const pn = sessionStorage.getItem('merge_pn') || sessionStorage.getItem('projectnum');
        const userId = auth?.user?.userId || '';

        // types 객체: review 항목 중 기본 판정과 다르게 선택한 것만 보냄 (또는 설정된 값)
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
            deleteVariables: deleteVarList,
            types: typesPayload,
            labelsFromSav: Object.keys(labelFromSavChecks).filter(k => labelFromSavChecks[k])
        };

        // 로딩 화면 (Step 2.5: 적용 중... - 목업 6)
        setStep(2.5);

        try {
            const res = await applySav.mutateAsync(payload);
            const successCode = String(res?.success);

            if (successCode === '777') {
                setApplyResult(res);
                setStep(3);
            } else if (successCode === '904') {
                const errContent = res?.resultjson?.errorcontent || res?.errortext || res?.message || "확인 항목이 누락되었거나 검사 뒤 변경이 발생했습니다.";
                setStep(2);
                modal.showErrorAlert("적용 거절 (904)", errContent, { zIndex: 99999 });
            } else if (successCode === '909' || successCode === '907') {
                const msg = res?.resultjson?.errorcontent || res?.message || "검사 결과가 없거나 1시간이 지났습니다. 다시 검사해주세요.";
                modal.showErrorAlert("적용 오류", msg, { zIndex: 99999 });
                setStep(1);
            } else {
                const errorMsg = res?.errortext || res?.message || "적용 중 오류가 발생했습니다.";
                modal.showErrorAlert("적용 실패", errorMsg, { zIndex: 99999 });
                setStep(1);
            }
        } catch (error) {
            console.error("SAV Apply error:", error);
            setStep(2);
            modal.showErrorAlert("에러", "적용 요청 중 오류가 발생했습니다.", { zIndex: 99999 });
        }
    };

    // 적용 완료 팝업 닫기 시 메인 데이터 새로고침
    const handleFinishClose = async () => {
        handleModalClose();
        if (refreshData) refreshData();
        const pn = sessionStorage.getItem('merge_pn') || sessionStorage.getItem('projectnum');
        const userId = auth?.user?.userId || '';
        if (pn) {
            await syncMap.mutateAsync({ user: userId, pn });
        }
    };

    // 적용 버튼 비활성화 판단
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

    // 추출 데이터 정리
    const resData = (validationResult && typeof validationResult.resultjson === 'object' && validationResult.resultjson !== null)
        ? { ...validationResult, ...validationResult.resultjson }
        : (validationResult || {});

    const fileErrors = resData.fileErrors || [];
    const blocking = resData.blocking || [];
    const blockMessages = [...fileErrors, ...blocking];
    if (blockMessages.length === 0 && resData.canApply === false && resData.message) {
        blockMessages.push(resData.message);
    }

    const removedPidsList = resData.respondents?.removedPids || [];

    // 자동 유형 요약 텍스트 생성
    const getAutoTypesSummaryText = () => {
        if (resData.types?.counts) {
            return Object.entries(resData.types.counts)
                .map(([k, v]) => `${TYPE_LABELS[k] || k} ${v}`)
                .join(' · ');
        }
        if (resData.autoTypes && Array.isArray(resData.autoTypes)) {
            const counts = {};
            resData.autoTypes.forEach(t => {
                const k = t.type || 'single';
                counts[k] = (counts[k] || 0) + 1;
            });
            return Object.entries(counts)
                .map(([k, v]) => `${TYPE_LABELS[k] || k} ${v}`)
                .join(' · ');
        }
        return '';
    };

    const rankNamesText = (resData.types?.rankNames && resData.types.rankNames.length > 0)
        ? `순위로 정한 것: ${resData.types.rankNames.join(', ')}`
        : '';

    return (
        <div className="variable-modal-overlay" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '20px 0' }}>


            <div
                className="variable-modal-content upload-modal-content"
                style={{ width: step === 2 ? '800px' : '700px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', transition: 'width 0.3s', position: 'relative' }}
            >
                {/* Header */}
                <div className="variable-modal-header" style={{ padding: '20px 24px 16px 24px', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: '4px',
                            height: '18px',
                            backgroundColor: '#16a34a',
                            borderRadius: '4px'
                        }}></div>
                        <h3 className="variable-modal-title" style={{ fontSize: '19px', fontWeight: '700' }}>데이터 등록</h3>
                    </div>
                    <button onClick={handleModalClose} className="variable-modal-close"><X size={20} /></button>
                </div>

                {/* 고정 상단 영역 (탭 스위처 + 요약 카드 Grid + 안내문구: 스크롤 제외) */}
                {step < 3 && step !== 1.5 && step !== 2.5 && (
                    <div style={{ padding: '0 24px 14px 24px', flexShrink: 0, borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* Step 1 & 2 Tab Header */}
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
                                    맵유지·응답교체
                                </span>
                            </button>
                        </div>

                        {/* Step 2 고정 요약 숫자 카드 & 유효시간 안내 */}
                        {step === 2 && validationResult && resData.canApply !== false && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {activeTab === 'new' && (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        fontSize: '12.5px',
                                        color: '#64748b',
                                        background: '#f8fafc',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '6px',
                                        padding: '5px 10px'
                                    }}>
                                        <Info size={13} color="#2563eb" style={{ flexShrink: 0 }} />
                                        <span>본 검사 결과는 <strong style={{ color: '#334155' }}>1시간 동안 유효</strong>하며, 1시간 이내에 적용해 주시기 바랍니다.</span>
                                    </div>
                                )}

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                    gap: '8px',
                                    width: '100%'
                                }}>
                                    {activeTab === 'update' ? (
                                        <>
                                            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', whiteSpace: 'nowrap' }}>기존 유지 변수</span>
                                                <span style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap' }}>
                                                    {(resData.summary?.kept ?? 0).toLocaleString()}
                                                </span>
                                            </div>
                                            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', whiteSpace: 'nowrap' }}>추가될 변수</span>
                                                <span style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap' }}>
                                                    {(resData.summary?.added ?? 0).toLocaleString()}
                                                </span>
                                            </div>
                                            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', whiteSpace: 'nowrap' }}>SAV 미존재 변수</span>
                                                <span style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap' }}>
                                                    {(resData.summary?.missingInSav ?? resData.missingInSavList?.length ?? 0).toLocaleString()}
                                                </span>
                                            </div>
                                            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', whiteSpace: 'nowrap' }}>응답자 수</span>
                                                <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap' }}>
                                                    {(resData.respondents?.current ?? 0).toLocaleString()}명 → {(resData.respondents?.sav ?? 0).toLocaleString()}명
                                                </span>
                                            </div>
                                            {(resData.respondents?.removed || 0) > 0 && (
                                                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                                    <span style={{ fontSize: '13px', color: '#b91c1c', fontWeight: '500', whiteSpace: 'nowrap' }}>제외될 응답자</span>
                                                    <span style={{ fontSize: '15px', fontWeight: '700', color: '#dc2626', whiteSpace: 'nowrap' }}>
                                                        {(resData.respondents?.removed || 0).toLocaleString()}명
                                                    </span>
                                                </div>
                                            )}
                                            {resData.review && resData.review.length > 0 && (
                                                <div style={{ background: '#fffbeb', border: '1px solid #fde047', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                                    <span style={{ fontSize: '13px', color: '#854d0e', fontWeight: '500', whiteSpace: 'nowrap' }}>유형 확인 필요</span>
                                                    <span style={{ fontSize: '15px', fontWeight: '700', color: '#d97706', whiteSpace: 'nowrap' }}>
                                                        {resData.review.length}
                                                    </span>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', whiteSpace: 'nowrap' }}>등록될 변수</span>
                                                <span style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap' }}>
                                                    {(resData.summary?.savVariables ?? resData.summary?.variablesInSav ?? 0).toLocaleString()}
                                                </span>
                                            </div>
                                            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', whiteSpace: 'nowrap' }}>등록될 응답자</span>
                                                <span style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap' }}>
                                                    {(resData.respondents?.sav ?? resData.respondents?.current ?? 0).toLocaleString()}명
                                                </span>
                                            </div>
                                            {resData.review && resData.review.length > 0 && (
                                                <div style={{ background: '#fffbeb', border: '1px solid #fde047', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                                    <span style={{ fontSize: '13px', color: '#854d0e', fontWeight: '500', whiteSpace: 'nowrap' }}>유형 확인 필요</span>
                                                    <span style={{ fontSize: '15px', fontWeight: '700', color: '#d97706', whiteSpace: 'nowrap' }}>
                                                        {resData.review.length}
                                                    </span>
                                                </div>
                                            )}
                                            {(resData.respondents?.removed || 0) > 0 && (
                                                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                                    <span style={{ fontSize: '13px', color: '#b91c1c', fontWeight: '500', whiteSpace: 'nowrap' }}>삭제될 기존 응답</span>
                                                    <span style={{ fontSize: '15px', fontWeight: '700', color: '#dc2626', whiteSpace: 'nowrap' }}>
                                                        {(resData.respondents?.removed || 0).toLocaleString()}명
                                                    </span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="variable-modal-body" style={{ padding: '16px 24px 20px 24px', flex: 1, overflowY: 'auto' }}>

                    {/* STEP 1: 검사 (File Upload) */}
                    {step === 1 && (
                        <>
                            {/* 안내 정보 표 (목업 디자인 1:1 맞춤) */}
                            <div style={{
                                width: '100%',
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                marginBottom: '20px',
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
                                                                응답 데이터를 <strong style={{ fontWeight: '600', color: '#0f172a', fontSize: 'inherit' }}>SAV 기준으로 전체 교체</strong>합니다 (신규 PID는 추가되고, SAV에 없는 기존 PID는 삭제됩니다)
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
                                                        {activeTab === 'new' ? '신규 생성' : 'SAV 기준'}
                                                    </span>
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
                                                                기존 변수 설정은 <strong style={{ fontWeight: '600', color: '#0f172a', fontSize: 'inherit' }}>유지</strong>하고 신규 변수는 <strong style={{ fontWeight: '600', color: '#0f172a', fontSize: 'inherit' }}>추가</strong>합니다 (SAV에 없는 기존 변수는 값 초기화 또는 삭제 선택 가능)
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
                                                                기존 응답 데이터가 <strong style={{ fontWeight: '600', color: '#0f172a', fontSize: 'inherit' }}>SAV로 교체</strong>되며, 동일 PID·동일 응답의 <strong style={{ fontWeight: '600', color: '#0f172a', fontSize: 'inherit' }}>AI 오픈코딩 결과는 자동 이관</strong>됩니다
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

                            {/* 파일 업로드 영역 (드래그 앤 드롭 및 선택된 파일 표시) */}
                            {!selectedFile ? (
                                <div
                                    className={`upload-drag-area ${isDragging ? 'dragging' : ''}`}
                                    onDragOver={onDragOver}
                                    onDragLeave={onDragLeave}
                                    onDrop={onDrop}
                                    onClick={handleFileSelectClick}
                                >
                                    <div className="upload-drag-icon" style={{
                                        backgroundColor: '#f0faf5',
                                        color: '#16a34a'
                                    }}>
                                        <UploadCloud size={26} />
                                    </div>
                                    <p className="upload-drag-text">
                                        여기에 파일을 끌어다 놓거나 클릭하여 선택하세요
                                    </p>
                                    <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px', fontWeight: 'normal', margin: '6px 0 0 0' }}>
                                        ※ SPSS 파일(.sav) 형식만 지원합니다.
                                    </p>
                                </div>
                            ) : (
                                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: '#ffffff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                                            <FileSpreadsheet size={18} />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{selectedFile.name}</span>
                                            <span style={{ fontSize: '12.5px', color: '#94a3b8', fontWeight: '600' }}>
                                                {selectedFile.size >= 1048576
                                                    ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`
                                                    : `${(selectedFile.size / 1024).toFixed(0)} KB`}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleClearFile}
                                        style={{ height: '32px', padding: '0 14px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#ffffff', color: '#475569', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0 }}
                                        onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                                        onMouseOut={e => e.currentTarget.style.background = '#ffffff'}
                                    >
                                        파일 변경
                                    </button>
                                </div>
                            )}

                            {/* 설문 이름 입력 (신규등록 탭 전용) */}
                            {activeTab === 'new' && (
                                <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <label style={{ fontSize: '14px', fontWeight: '600', color: '#334155', minWidth: '70px' }}>
                                        설문 이름
                                    </label>
                                    <input
                                        type="text"
                                        value={projectName}
                                        onChange={(e) => setProjectName(e.target.value)}
                                        placeholder="비우면 기존 이름 → 설문번호"
                                        style={{
                                            flex: 1,
                                            padding: '8px 12px',
                                            borderRadius: '6px',
                                            border: '1px solid #cbd5e1',
                                            fontSize: '14px',
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                            )}

                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                onChange={handleFileChange}
                                accept=".sav"
                            />
                        </>
                    )}

                    {/* STEP 1.5: 검사 중 (Loading Animation - 목업 2, 9) */}
                    {step === 1.5 && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '16px' }}>
                            <div className="animate-spin" style={{ color: '#16a34a' }}>
                                <RefreshCw size={36} />
                            </div>
                            <div style={{ fontSize: '17px', fontWeight: '700', color: '#1e293b' }}>
                                검사 중...
                            </div>
                            <div style={{ width: '80%', background: '#e2e8f0', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: '60%', background: '#16a34a', height: '100%', borderRadius: '3px', transition: 'width 0.5s' }}></div>
                            </div>
                            <div style={{ fontSize: '13px', color: '#64748b' }}>
                                변수 유형을 판정하는 중...(변수 1,000개에 1분 안팎)
                            </div>
                        </div>
                    )}

                    {/* STEP 2: 검사 결과 (POST /data/sav/validate 결과 - 목업 3, 4, 5, 10, 11, 12, 13) */}
                    {step === 2 && validationResult && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                            {/* CANAPPLY === FALSE 인 경우: 에러 메시지만 전면 표시 및 적용 버튼 차단 (목업 5, 13 1:1 대응) */}
                            {resData.canApply === false ? (
                                <div style={{
                                    background: '#fff5f5',
                                    border: '1px solid #fca5a5',
                                    borderRadius: '10px',
                                    padding: '24px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', fontWeight: '700', fontSize: '17px' }}>
                                        <span>⛔ 파일에 문제가 있어 적용할 수 없습니다.</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px', color: '#7f1d1d' }}>
                                        {blockMessages.map((msg, idx) => (
                                            <div key={idx}>{msg}</div>
                                        ))}
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#64748b', marginTop: '12px' }}>
                                        검사 번호가 발급되지 않아 적용 버튼이 없습니다. 파일을 고쳐 다시 올려 주세요.
                                    </div>
                                </div>
                            ) : (
                                <>

                                    {/* 2. 서버 완성 메시지 카드 (Blue Message Cards - 목업 3, 4, 10, 12 파란 상자 대응) */}
                                    {resData.messages && resData.messages.length > 0 && (
                                        <div style={{
                                            border: '1px solid #bfdbfe',
                                            background: '#eff6ff',
                                            borderRadius: '8px',
                                            padding: '10px 12px',
                                            fontSize: '13px',
                                            color: '#1e40af',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '4px'
                                        }}>
                                            {resData.messages.map((msgItem, idx) => {
                                                const msgText = typeof msgItem === 'string' ? msgItem : (msgItem.text || msgItem.message || '');
                                                return (
                                                    <div key={idx} style={{ lineHeight: '1.4', fontSize: '13px', fontWeight: '500' }}>
                                                        {msgText}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* 3. 변수 유형 자동 결정 요약 카드 (Auto Types Summary - 목업 3, 4, 10 대응) */}
                                    <div style={{
                                        border: '1px solid #e2e8f0',
                                        background: '#f8fafc',
                                        borderRadius: '10px',
                                        padding: '10px 14px',
                                        fontSize: '13px'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <strong style={{ color: '#1e293b', fontSize: '14px', fontWeight: '700' }}>
                                                {activeTab === 'update' && (resData.summary?.added || 0) > 0
                                                    ? `신규 변수 ${resData.summary.added}개 ― 변수 유형 자동 판정`
                                                    : '변수 유형 자동 판정 결과'}
                                            </strong>
                                            <span style={{ fontSize: '11.5px', color: '#64748b' }}>※ 세부 유형 변경은 적용 완료 후 [맵 엑셀 편집]에서 가능합니다</span>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                <span style={{ color: '#334155', fontWeight: '500', fontSize: '13px' }}>
                                                    {getAutoTypesSummaryText() || '자동 분석된 변수 유형이 표시됩니다'}
                                                </span>
                                                {rankNamesText && (
                                                    <span style={{ color: '#64748b', fontSize: '13px' }}>
                                                        ({rankNamesText})
                                                    </span>
                                                )}
                                            </div>

                                            {resData.autoTypes && resData.autoTypes.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowAutoTypes(!showAutoTypes)}
                                                    style={{
                                                        background: showAutoTypes ? '#dbeafe' : '#eff6ff',
                                                        border: '1px solid #bfdbfe',
                                                        color: '#1d4ed8',
                                                        fontSize: '13px',
                                                        cursor: 'pointer',
                                                        padding: '2px 6px',
                                                        borderRadius: '6px',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        fontWeight: '600',
                                                        flexShrink: 0,
                                                        transition: 'all 0.15s'
                                                    }}
                                                >
                                                    <span>전체 목록 보기</span>
                                                    {showAutoTypes ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                                </button>
                                            )}
                                        </div>

                                        {showAutoTypes && resData.autoTypes && (
                                            <div style={{ marginTop: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', background: '#ffffff' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                                    <thead>
                                                        <tr style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}>
                                                            <th style={{ padding: '5px 8px', width: '110px', fontSize: '13px' }}>변수명</th>
                                                            <th style={{ padding: '5px 8px', fontSize: '13px' }}>변수 설명 (라벨)</th>
                                                            <th style={{ padding: '5px 8px', width: '120px', whiteSpace: 'nowrap', fontSize: '13px' }}>판정 유형</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {resData.autoTypes.map((item, aIdx) => {
                                                            const vName = item.variable || item.varName;
                                                            const vLabel = item.label || item.varLabel;

                                                            return (
                                                                <tr key={aIdx} style={{ borderBottom: '1px solid #f1f5f9', background: aIdx % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                                                                    <td style={{ padding: '5px 8px', fontWeight: '600', color: '#1e293b', fontSize: '13px' }}>{vName}</td>
                                                                    <td style={{ padding: '5px 8px', color: '#475569', fontSize: '13px' }}>{vLabel || '-'}</td>
                                                                    <td style={{ padding: '5px 8px', fontSize: '13px' }}>
                                                                        <span style={{ background: '#e2e8f0', color: '#334155', padding: '1px 5px', borderRadius: '4px', fontWeight: '500', whiteSpace: 'nowrap' }}>
                                                                            {item.type}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>

                                    {/* 4. 유형 확인이 필요한 변수 (review[]) - 드롭다운 테이블 (목업 3, 4, 11 황색 상자 1:1 대응) */}
                                    {resData.review && resData.review.length > 0 && (
                                        <div style={{
                                            border: '1px solid #fde047',
                                            background: '#fffdf0',
                                            borderRadius: '8px',
                                            padding: '12px 14px',
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                <strong style={{ color: '#854d0e', fontSize: '13px', fontWeight: '700' }}>
                                                    유형 확인이 필요한 변수 {resData.review.length}개
                                                </strong>
                                                <span style={{ fontSize: '11.5px', color: '#a16207' }}>
                                                    ※ 별도로 수정하지 않으면 자동 판단된 유형으로 등록됩니다
                                                </span>
                                            </div>

                                            <div style={{ marginTop: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', background: '#ffffff' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                                    <thead>
                                                        <tr style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}>
                                                            <th style={{ padding: '5px 8px', width: '70px', fontSize: '13px' }}>변수명</th>
                                                            <th style={{ padding: '5px 8px', fontSize: '13px' }}>변수 설명(라벨)</th>
                                                            <th style={{ padding: '5px 8px', width: '120px', fontSize: '13px' }}>유형 선택</th>
                                                            <th style={{ padding: '5px 8px', fontSize: '13px' }}>자동 판정 사유</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {resData.review.map((item, rIdx) => {
                                                            const vName = item.variable || item.varName;
                                                            const vLabel = item.label || item.varLabel;
                                                            const reasonText = item.reviewReason || item.reason || '';

                                                            const rawOpts = item.options || ['single', 'multi', 'open', 'number', 'rank', 'scale'];
                                                            const normOpts = rawOpts.map(o => typeof o === 'string' ? { value: o, label: TYPE_LABELS[o] || o } : o);

                                                            return (
                                                                <tr key={rIdx} style={{ borderBottom: '1px solid #f1f5f9', background: rIdx % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                                                                    <td style={{ padding: '5px 8px', fontWeight: '600', color: '#1e293b', fontSize: '13px' }}>{vName}</td>
                                                                    <td style={{ padding: '5px 8px', color: '#475569', fontSize: '13px' }}>{vLabel}</td>
                                                                    <td style={{ padding: '5px 8px', fontSize: '13px' }}>
                                                                        <select
                                                                            value={typeOverrides[vName] || item.type || item.suggestedType || ''}
                                                                            onChange={(e) => {
                                                                                const val = e.target.value;
                                                                                setTypeOverrides(prev => ({ ...prev, [vName]: val }));
                                                                            }}
                                                                            style={{
                                                                                width: '100%',
                                                                                padding: '2px 4px',
                                                                                borderRadius: '4px',
                                                                                border: '1px solid #cbd5e1',
                                                                                fontSize: '13px',
                                                                                color: '#1e293b',
                                                                                background: '#ffffff',
                                                                                cursor: 'pointer'
                                                                            }}
                                                                        >
                                                                            {normOpts.map((opt, oIdx) => (
                                                                                <option key={oIdx} value={opt.value}>{opt.label}</option>
                                                                            ))}
                                                                        </select>
                                                                    </td>
                                                                    <td style={{ padding: '5px 8px', color: '#64748b', fontSize: '13px' }}>
                                                                        {reasonText}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {/* 5. SAV 미존재 변수 (missingInSavList[]) - 목업 11 대응 */}
                                    {resData.missingInSavList && resData.missingInSavList.length > 0 && (
                                        <div style={{
                                            border: '1px solid #fca5a5',
                                            background: '#fff5f5',
                                            borderRadius: '8px',
                                            padding: '10px 12px',
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                                                <strong style={{ color: '#991b1b', fontSize: '14px' }}>
                                                    SAV 파일에 없는 기존 변수 {resData.missingInSavList.length}개
                                                </strong>
                                                <span style={{ fontSize: '12px', color: '#dc2626' }}>
                                                    ※ 기본값은 변수 유지(응답값 초기화)이며, 체크 시 해당 변수가 영구 삭제됩니다
                                                </span>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                {resData.missingInSavList.map((item, mIdx) => {
                                                    const vName = item.variable || item.varName;
                                                    const vLabel = item.label || item.varLabel;
                                                    const isChecked = !!deleteVarChecks[vName];
                                                    const usedByList = item.usedBy || [];
                                                    const hasLogic = item.hasLogic || usedByList.length > 0;
                                                    const hasAiOpen = !!item.hasAiOpen;

                                                    return (
                                                        <label key={mIdx} style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            background: '#ffffff',
                                                            border: `1px solid ${isChecked ? '#fca5a5' : '#fee2e2'}`,
                                                            borderRadius: '6px',
                                                            padding: '8px 8px',
                                                            fontSize: '13px',
                                                            cursor: 'pointer'
                                                        }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                                                                <div
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        setDeleteVarChecks(prev => ({ ...prev, [vName]: !prev[vName] }));
                                                                    }}
                                                                    style={{
                                                                        width: '16px',
                                                                        height: '16px',
                                                                        border: `1px solid ${isChecked ? '#dc2626' : '#cbd5e1'}`,
                                                                        background: isChecked ? '#dc2626' : '#fff',
                                                                        borderRadius: '3px',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        flexShrink: 0,
                                                                        cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    {isChecked && <Check size={12} color="#fff" strokeWidth={3} />}
                                                                </div>
                                                                <strong style={{ color: '#1e293b', width: '80px', fontSize: '13px' }}>{vName}</strong>
                                                                <span style={{ color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px' }}>
                                                                    {vLabel}
                                                                </span>
                                                            </div>

                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                                                {hasLogic && (
                                                                    <span style={{ fontSize: '11.5px', background: '#fee2e2', color: '#991b1b', padding: '1px 5px', borderRadius: '3px', fontWeight: '600' }}>
                                                                        {usedByList.length > 0 ? `연관 로직에서 사용 중 (${usedByList.join(', ')})` : '연관 로직 존재'}
                                                                    </span>
                                                                )}
                                                                {hasAiOpen && (
                                                                    <span style={{ fontSize: '11.5px', background: '#fee2e2', color: '#991b1b', padding: '1px 5px', borderRadius: '3px', fontWeight: '600' }}>
                                                                        AI 오픈코딩 데이터 존재
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* 6. 보기 차이 (labelChanges[]) - 목업 11 대응 */}
                                    {resData.labelChanges && resData.labelChanges.length > 0 && (
                                        <div style={{
                                            border: '1px solid #cbd5e1',
                                            background: '#f8fafc',
                                            borderRadius: '8px',
                                            padding: '8px 10px',
                                            fontSize: '13px'
                                        }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '4px' }}>
                                                <strong style={{ color: '#334155', fontSize: '14px' }}>
                                                    SAV 라벨과 차이가 있는 문항 {resData.labelChanges.length}개
                                                </strong>
                                                <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                                                    ※ SAV에 새로 추가된 코드는 반영되며, 라벨 문구가 다른 경우 기존 맵이 유지됩니다
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                {resData.labelChanges.map((item, lIdx) => {
                                                    const vName = item.variable || item.varName;
                                                    const diffList = item.different || [];
                                                    const hasDiff = diffList.length > 0;
                                                    const savOnlyList = item.savOnly || [];

                                                    const isChecked = !!labelFromSavChecks[vName];

                                                    return (
                                                        <div key={lIdx} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                            {hasDiff && (
                                                                <label style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'space-between',
                                                                    background: '#fff',
                                                                    padding: '4px 6px',
                                                                    borderRadius: '4px',
                                                                    border: '1px solid #e2e8f0',
                                                                    cursor: 'pointer'
                                                                }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                        <div
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                setLabelFromSavChecks(prev => ({ ...prev, [vName]: !prev[vName] }));
                                                                            }}
                                                                            style={{
                                                                                width: '16px',
                                                                                height: '16px',
                                                                                border: `1px solid ${isChecked ? '#16a34a' : '#cbd5e1'}`,
                                                                                background: isChecked ? '#16a34a' : '#fff',
                                                                                borderRadius: '3px',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                flexShrink: 0,
                                                                                cursor: 'pointer'
                                                                            }}
                                                                        >
                                                                            {isChecked && <Check size={12} color="#fff" strokeWidth={3} />}
                                                                        </div>
                                                                        <span>
                                                                            <strong>{vName}</strong> 라벨 차이 발생 ― 맵 「{diffList.map(d => d.map).join(',')}」 ➔ SAV 「{diffList.map(d => d.sav).join(',')}」 (체크 시 SAV 라벨 적용)
                                                                        </span>
                                                                    </div>
                                                                </label>
                                                            )}
                                                            {savOnlyList.length > 0 && (
                                                                <div style={{ padding: '2px 6px', color: '#64748b', fontSize: '12.5px' }}>
                                                                    {vName} SAV 전용 코드 {savOnlyList.map(s => `${s.code} 「${s.label}」`).join(', ')} (자동 추가됨)
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* 7. 기타 서버 알림 카드 (existingNotices, layoutChanges, renameHints, valueWarnings - 목업 11 대응) */}
                                    {(resData.existingNotices?.length > 0 || resData.layoutChanges?.length > 0 || resData.valueWarnings?.length > 0) && (
                                        <div style={{
                                            border: '1px solid #e2e8f0',
                                            background: '#f8fafc',
                                            borderRadius: '8px',
                                            padding: '10px 12px',
                                            fontSize: '13px',
                                            color: '#475569',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '4px'
                                        }}>
                                            <div style={{ fontWeight: '600', color: '#1e293b' }}>
                                                기존 변수 알림사항 (기존 설정 유지)
                                            </div>
                                            {resData.existingNotices?.map((n, idx) => (
                                                <div key={`n-${idx}`}>• {n.message || n.text}</div>
                                            ))}
                                            {resData.layoutChanges?.map((l, idx) => (
                                                <div key={`l-${idx}`}>• {l.variable}: {l.field} ({l.from} → {l.to})</div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* STEP 2.5: 적용 중 (Loading Animation - 목업 6) */}
                    {step === 2.5 && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '16px' }}>
                            <div className="animate-spin" style={{ color: '#16a34a' }}>
                                <RefreshCw size={36} />
                            </div>
                            <div style={{ fontSize: '17px', fontWeight: '700', color: '#1e293b' }}>
                                {activeTab === 'new' ? '설문을 새로 만드는 중...' : '응답을 SAV 로 바꾸는 중...'}
                            </div>
                            <div style={{ width: '80%', background: '#e2e8f0', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: '70%', background: '#16a34a', height: '100%', borderRadius: '3px', transition: 'width 0.5s' }}></div>
                            </div>
                            <div style={{ fontSize: '13px', color: '#64748b' }}>
                                {activeTab === 'new' ? 'SPSS 데이터 DB 적재 중...' : '응답 교체 → 맵 합치기 → SRT이관'}
                            </div>
                        </div>
                    )}

                    {/* STEP 3: 적용 완료 (POST /data/sav/apply 성공 시 - 목업 7) */}
                    {step === 3 && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '30px 0', gap: '20px' }}>
                            <div style={{ color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Check size={48} strokeWidth={3} />
                            </div>

                            <h4 style={{ fontSize: '19px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                                {activeTab === 'new' ? '신규등록을 마쳤습니다' : '업데이트를 마쳤습니다'}
                            </h4>

                            {/* 서버 응답 메세지 그대로 파란 상자로 출력 (목업 7 1:1 대응) */}
                            <div style={{
                                background: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                borderRadius: '8px',
                                padding: '16px 20px',
                                fontSize: '14px',
                                color: '#1e40af',
                                width: '100%',
                                textAlign: 'left',
                                lineHeight: '1.5'
                            }}>
                            </div>
                        </div>
                    )}

                </div>

                <div className="variable-modal-footer" style={{ borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', background: '#fff', borderBottomLeftRadius: 'inherit', borderBottomRightRadius: 'inherit', padding: 0 }}>
                    {/* ConfirmRequired (푸터와 일체형으로 고정) */}
                    {step === 2 && resData?.confirmRequired && resData.confirmRequired.length > 0 && (
                        <div style={{ padding: '12px 24px 0 24px', width: '100%' }}>
                            <div style={{
                                padding: '10px 16px',
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                borderRadius: '8px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px'
                            }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '500', color: '#b91c1c' }}>
                            <AlertTriangle size={14} />
                            <span>필수 확인 사항 ― 아래 동의 항목을 <strong style={{ fontWeight: '800' }}>모두 체크해야</strong> 적용할 수 있습니다</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {resData.confirmRequired.map(item => {
                                const key = typeof item === 'string' ? item : item.key;
                                const label = typeof item === 'object' && item.message ? item.message : (CONFIRM_LABELS[key] || key);
                                const isChecked = !!confirmChecks[key];

                                return (
                                    <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <label
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setConfirmChecks(prev => ({ ...prev, [key]: !prev[key] }));
                                            }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: '8px',
                                                fontSize: '12.5px',
                                                color: '#334155',
                                                cursor: 'pointer',
                                                lineHeight: '1.4'
                                            }}>
                                            <div
                                                style={{
                                                    marginTop: '1px',
                                                    width: '15px',
                                                    height: '15px',
                                                    border: `1.5px solid ${isChecked ? '#ef4444' : '#fca5a5'}`,
                                                    background: isChecked ? '#ef4444' : '#fff',
                                                    borderRadius: '3px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                    transition: 'all 0.15s ease'
                                                }}
                                            >
                                                {isChecked && <Check size={12} color="#fff" strokeWidth={3.5} />}
                                            </div>
                                            <span style={{ fontWeight: isChecked ? '600' : '500', color: isChecked ? '#991b1b' : '#431407', flex: 1 }}>{label}</span>
                                            
                                            {/* 빠지는 응답자 PID 보기 토글 */}
                                            {key === 'respondentsRemoved' && removedPidsList.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setShowRemovedPids(!showRemovedPids);
                                                    }}
                                                    style={{ border: '1px solid #cbd5e1', background: '#ffffff', color: '#2563eb', padding: '1px 6px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}
                                                >
                                                    [제외 PID 목록 보기] {showRemovedPids ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                </button>
                                            )}
                                        </label>

                                        {/* 빠지는 PID 접기/펼치기 박스 */}
                                        {key === 'respondentsRemoved' && showRemovedPids && removedPidsList.length > 0 && (
                                            <div style={{ background: '#ffffff', border: '1px solid #fecaca', borderRadius: '4px', padding: '4px 8px', fontSize: '11.5px', color: '#991b1b', display: 'flex', flexWrap: 'wrap', gap: '3px', marginLeft: '23px', marginTop: '2px' }}>
                                                {removedPidsList.map((pid, pIdx) => (
                                                    <span key={pIdx} style={{ background: '#fee2e2', padding: '1px 4px', borderRadius: '3px' }}>{pid}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                            </div>
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div style={{ padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>

                    {/* 좌측 영역: 이전 단계 동작(파일 재선택) 또는 안내문 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, paddingRight: '16px', minWidth: 0 }}>
                        {step === 1 && (
                            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                                ※ 검사 단계에서는 데이터가 변경되거나 저장되지 않습니다.
                            </div>
                        )}

                        {step === 2 && (
                            <button
                                className="upload-cancel-btn"
                                onClick={(e) => {
                                    handleClearFile(e);
                                    setStep(1);
                                }}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '8px 14px',
                                    fontSize: '14px',
                                    background: '#f8fafc',
                                    borderColor: '#cbd5e1',
                                    color: '#334155',
                                    flexShrink: 0
                                }}
                            >
                                파일 재선택
                            </button>
                        )}

                        {step === 2.5 && (
                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                                ※ 작업 처리 중 창을 닫으셔도 서버에서 정상적으로 처리가 이어집니다.
                            </div>
                        )}

                        {step === 3 && (
                            <div></div>
                        )}
                    </div>

                    {/* 우측 영역: 주요 실행/닫기 버튼들 (취소 + 적용) */}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginLeft: 'auto', flexShrink: 0, whiteSpace: 'nowrap' }}>
                        {step === 1 && (
                            <>
                                <button className="upload-cancel-btn" onClick={handleModalClose}>
                                    취소
                                </button>
                                <button
                                    className="upload-submit-btn"
                                    onClick={handleStartValidate}
                                    disabled={!selectedFile}
                                    style={{
                                        backgroundColor: !selectedFile ? '#cbd5e1' : '#16a34a',
                                        cursor: !selectedFile ? 'not-allowed' : 'pointer',
                                        opacity: !selectedFile ? 0.6 : 1,
                                    }}
                                >
                                    검사하기
                                </button>
                            </>
                        )}

                        {step === 1.5 && (
                            <button className="upload-cancel-btn" onClick={() => setStep(1)}>
                                취소
                            </button>
                        )}

                        {step === 2 && (
                            <>
                                <button className="upload-cancel-btn" onClick={handleModalClose}>
                                    {resData.canApply === false ? '닫기' : '취소'}
                                </button>
                                {resData.canApply !== false && (
                                    <button
                                        className="upload-submit-btn"
                                        onClick={handleStartApply}
                                        disabled={isApplyDisabled()}
                                        style={{
                                            backgroundColor: isApplyDisabled() ? '#cbd5e1' : '#16a34a',
                                            cursor: isApplyDisabled() ? 'not-allowed' : 'pointer',
                                            opacity: isApplyDisabled() ? 0.6 : 1,
                                        }}
                                    >
                                        {activeTab === 'new' ? '신규등록 적용' : '업데이트 적용'}
                                    </button>
                                )}
                            </>
                        )}

                        {step === 2.5 && (
                            <button className="upload-cancel-btn" onClick={handleModalClose}>
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
                                        background: 'none',
                                        border: 'none',
                                        color: '#2563eb',
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        marginRight: '8px',
                                        fontWeight: '500'
                                    }}
                                >
                                    {/* 맵 엑셀로 유형 고치기 → */}
                                </button>
                                <button
                                    className="upload-submit-btn"
                                    onClick={handleFinishClose}
                                    style={{ backgroundColor: '#16a34a', cursor: 'pointer' }}
                                >
                                    닫기
                                </button>
                            </>
                        )}
                    </div>
                </div>
                </div>
            </div>
        </div>
    );
};

export default DataUpdateModal;
