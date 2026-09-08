import React, { useState, useEffect, useRef, useContext } from 'react';
import { X, Upload, FileSpreadsheet, Loader2, AlertTriangle, Info, CheckCircle2, Download, ChevronDown, ChevronUp, MinusCircle, Plus } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useSelector } from 'react-redux';
import { modalContext } from "@/components/common/Modal.jsx";
import { MapManagementPageApi } from './MapManagementPageApi';
import './MapManagementPage.css';

const BatchMapEditModal = ({ isOpen, onClose, pn, variables = [], hasChanges = false, refreshData }) => {
    const auth = useSelector((store) => store.auth);
    const modal = useContext(modalContext);
    const fileInputRef = useRef(null);

    const {
        exportExcel,
        validateExcel,
        applyExcel,
        getExcelVersions,
        restoreExcelVersion,
        createExcelVersion
    } = MapManagementPageApi();

    const [activeTab, setActiveTab] = useState(1); // 1: 엑셀 받기, 2: 올려서 반영, 3: 되돌리기

    // 업로드 & 검사 결과 상태
    const [selectedFile, setSelectedFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    const [isApplied, setIsApplied] = useState(false);
    const [validationResult, setValidationResult] = useState(null);

    // 섹션별 접기/펼치기 상태 (손대지 않은 것, 오류, 참고)
    const [expandedSections, setExpandedSections] = useState({
        ignored: false,
        errors: false,
        notes: false
    });

    const toggleSection = (key) => {
        setExpandedSections(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    // 되돌리기 목록 상태
    const [versions, setVersions] = useState([]);
    const [isLoadingVersions, setIsLoadingVersions] = useState(false);

    const currentPn = pn || sessionStorage.getItem('merge_pn') || sessionStorage.getItem('projectnum') || 'q261043';
    const userId = auth?.user?.userId || '';

    // 모달 닫기 핸들러
    const handleModalClose = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        setSelectedFile(null);
        setValidationResult(null);
        setIsApplied(false);
        setIsValidating(false);
        setIsApplying(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
        if (onClose) onClose();
    };

    // 모달이 열릴 때 상태 초기화
    useEffect(() => {
        if (isOpen) {
            setActiveTab(1);
            setSelectedFile(null);
            setValidationResult(null);
            setIsApplied(false);
            setIsValidating(false);
            setIsApplying(false);
            fetchVersionsList();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // 탭 3으로 이동 시 버전 목록 자동 갱신 (이미 데이터가 있으면 배경에서 조용히 갱신하여 깜빡임 방지)
    useEffect(() => {
        if (isOpen && activeTab === 3) {
            fetchVersionsList(versions && versions.length > 0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    // ── 버전 목록 조회 API 호출 ──
    const fetchVersionsList = async (isSilent = false) => {
        if (!currentPn) return;
        if (!isSilent) {
            setIsLoadingVersions(true);
        }
        try {
            const res = await getExcelVersions.mutateAsync({ pn: currentPn, user: userId });
            if (String(res?.success) === '777' && Array.isArray(res?.resultjson)) {
                setVersions(res.resultjson);
            } else if (Array.isArray(res)) {
                setVersions(res);
            }
        } catch (err) {
            console.error("복원 지점 목록 조회 실패:", err);
        } finally {
            setIsLoadingVersions(false);
        }
    };

    // ── 탭 1: 엑셀 내보내기 ──
    const handleExportExcel = async () => {
        try {
            const res = await exportExcel.mutateAsync({ pn: currentPn, user: userId });

            // response-type / json error 처리
            if (res?.headers) {
                const contentType = res.headers['content-type'] || '';
                if (contentType.includes('application/json')) {
                    const text = await res.data.text();
                    try {
                        const json = JSON.parse(text);
                        const msg = json?.resultjson?.errorcontent || json?.message || '엑셀 추출 중 오류가 발생했습니다.';
                        modal.showErrorAlert('알림', msg);
                        return;
                    } catch (e) {
                        // ignore
                    }
                }

                // Blob 파일 다운로드
                const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const cd = res.headers['content-disposition'] || '';
                const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
                const fileName = match ? decodeURIComponent(match[1]) : `${currentPn}_map.xlsx`;

                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
                return;
            }
        } catch (err) {
            console.warn("API 내보내기 실패, 클라이언트 백업 내보내기 수행:", err);
        }

        // 백업: 클라이언트 엑셀 생성
        try {
            const timestampStr = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
            const fileName = `${currentPn}_map_${timestampStr}.xlsx`;
            if (!variables || variables.length === 0) {
                modal.showErrorAlert('알림', '다운로드할 변수 데이터가 없습니다.');
                return;
            }

            const dataToExport = variables.map(v => ({
                '문항': v.sysName || '',
                '표제목': v.label || '',
                'SPSS변수명': v.spssName || '',
                '변수유형': v.type || 'single',
                'SRT이관': v.isBaked ? 'O' : 'X',
                '실사이관': v.isSilsa ? 'O' : 'X',
                '출력제외': v.excludeOutput ? 'O' : 'X',
                '검증문항': v.verificationVar ? 'O' : 'X',
                '멀티값변경': v.multiValChange ? 'O' : 'X',
                '오픈머지제외': v.excludeOpenMerge ? 'O' : 'X',
                '소수점자리수': v.decimal || 0,
                '문항최소갯수': v.minQuestions || 0,
                '분석제외코드': v.excludeCode || '',
                '기타오픈정의': v.etcOpen || '',
                '로직체크': v.logic || '',
                '메모': v.memo || ''
            }));

            const worksheet = XLSX.utils.json_to_sheet(dataToExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Map_Data');
            XLSX.writeFile(workbook, fileName);
        } catch (e) {
            console.error("클라이언트 엑셀 생성 실패:", e);
            modal.showErrorAlert('오류', '엑셀 파일 생성 중 문제가 발생했습니다.');
        }
    };

    // ── 탭 2: 파일 선택 및 자동 검사 (validate) ──
    const handleFileSelect = async (file) => {
        if (!file) return;

        const nameLower = file.name.toLowerCase();
        if (!nameLower.endsWith('.xlsx') && !nameLower.endsWith('.xls')) {
            modal.showErrorAlert('알림', '.xlsx 또는 .xls 형식의 엑셀 파일만 업로드할 수 있습니다.');
            return;
        }

        setSelectedFile(file);
        setIsApplied(false);
        setIsValidating(true);
        setValidationResult(null);

        const formData = new FormData();
        formData.append("pn", currentPn);
        formData.append("user", userId);
        formData.append("file", file);

        try {
            const res = await validateExcel.mutateAsync(formData);

            if (String(res?.success) === '777') {
                setValidationResult(res.resultjson || res);
            } else {
                const errMsg = res?.resultjson?.errorcontent || res?.message || '검사 처리 중 오류가 발생했습니다.';
                setValidationResult({
                    fileErrors: [errMsg]
                });
            }
        } catch (err) {
            console.error("검사 API 호출 오류:", err);
            const errMsg = err?.response?.data?.message || err?.message || '검사 처리 중 오류가 발생했습니다.';
            setValidationResult({
                fileErrors: [errMsg]
            });
        } finally {
            setIsValidating(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    // ── 탭 2: 엑셀 일괄 수정 적용 (apply) ──
    const handleApplyRules = async () => {
        if (!selectedFile || !validationResult) return;
        if (validationResult.fileErrors && validationResult.fileErrors.length > 0) return;
        if ((validationResult.changedRows || 0) === 0) return;

        setIsApplying(true);

        const formData = new FormData();
        formData.append("pn", currentPn);
        formData.append("user", userId);
        formData.append("file", selectedFile);

        try {
            const res = await applyExcel.mutateAsync(formData);

            if (String(res?.success) === '777') {
                const appliedCount = res?.resultjson?.applied ?? validationResult.changedRows ?? 0;
                const msg = res?.message || `${appliedCount}행을 반영했습니다.`;

                modal.showAlert('알림', msg);
                setIsApplied(true);

                // 맵 목록 새로고침 & 복원 지점 재조회
                if (refreshData) refreshData();
                fetchVersionsList();
            } else {
                const errorMsg = res?.resultjson?.errorcontent || res?.message || '적용 처리 중 오류가 발생했습니다.';
                modal.showErrorAlert('오류', errorMsg);
            }
        } catch (err) {
            console.error("적용 API 호출 오류:", err);
            const errorMsg = err?.response?.data?.message || err?.message || '적용 처리 중 오류가 발생했습니다.';
            modal.showErrorAlert('오류', errorMsg);
        } finally {
            setIsApplying(false);
        }
    };

    // ── 탭 3: 수동 복원 지점 생성 (versions/create) ──
    const handleCreateVersion = async () => {
        try {
            const res = await createExcelVersion.mutateAsync({
                pn: currentPn,
                user: userId,
                versionName: "사용자 지정 복원 지점"
            });
            if (String(res?.success) === '777') {
                modal.showAlert('알림', '복원 지점이 생성되었습니다.');
                fetchVersionsList();
            } else {
                modal.showErrorAlert('오류', res?.resultjson?.errorcontent || res?.message || '복원 지점 생성에 실패했습니다.');
            }
        } catch (err) {
            console.error("복원 지점 생성 오류:", err);
            const errorMsg = err?.response?.data?.message || err?.message || '복원 지점 생성에 실패했습니다.';
            modal.showErrorAlert('오류', errorMsg);
        }
    };

    // ── 탭 3: 복원 실행 (restore) ──
    const handleRestore = (item) => {
        const vId = item.id || item.versionNumber;
        const vName = item.versionName || `v${item.versionNumber || vId}`;

        modal.showConfirm(
            '확인',
            `[${vName}] 지점으로 되돌리시겠습니까?\n\n현재 맵 상태가 먼저 자동 저장된 후 선택하신 지점으로 복원됩니다. (언제든 다시 원복 가능)`,
            {
                btns: [
                    { title: '취소', click: () => { } },
                    {
                        title: '실행',
                        click: async () => {
                            try {
                                const res = await restoreExcelVersion.mutateAsync({
                                    pn: currentPn,
                                    user: userId,
                                    versionId: vId
                                });

                                if (String(res?.success) === '777') {
                                    const restoredCnt = res?.resultjson?.restored ?? item.changedCount ?? '';
                                    const msg = res?.message || `${restoredCnt}개 변수를 성공적으로 되돌렸습니다.`;
                                    modal.showAlert('알림', msg);

                                    if (refreshData) refreshData();
                                    fetchVersionsList();
                                } else {
                                    modal.showErrorAlert('오류', res?.resultjson?.errorcontent || res?.message || '복원 처리에 실패했습니다.');
                                }
                            } catch (err) {
                                console.error("복원 API 오류:", err);
                                const errorMsg = err?.response?.data?.message || err?.message || '복원 처리 중 오류가 발생했습니다.';
                                modal.showErrorAlert('오류', errorMsg);
                            }
                        }
                    }
                ]
            }
        );
    };

    const modifiableFields = [
        '문항', '표제목', 'SPSS변수명', '변수유형', 'SRT이관', '실사이관', '출력제외', '검증문항',
        '멀티값변경', '오픈머지제외', '소수점자리수', '문항최소갯수', '분석제외코드', '기타오픈정의', '로직체크', '메모'
    ];

    const hasFileErrors = validationResult?.fileErrors && validationResult.fileErrors.length > 0;
    const changedRowsCount = validationResult?.changedRows || 0;
    const isApplyDisabled = !selectedFile || isValidating || isApplying || isApplied || hasFileErrors || changedRowsCount === 0;

    if (!isOpen) return null;

    return (
        <div className="variable-modal-overlay" style={{ zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="variable-modal-content" style={{ width: '840px', maxWidth: '95vw', padding: 0, borderRadius: '12px', overflow: 'hidden', background: '#fff', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', display: 'flex', flexDirection: 'column', maxHeight: '92vh' }}>

                {/* ── 맵 관리 고유 그린 헤더 ── */}
                <div className="variable-modal-header" style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: '4px',
                            height: '18px',
                            backgroundColor: '#16a34a',
                            borderRadius: '4px',
                            marginRight: '4px'
                        }}></div>
                        <h3 className="variable-modal-title" style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#0f172a' }}>
                            맵 일괄 수정
                        </h3>
                        <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '12px', fontWeight: '600', padding: '2px 8px', borderRadius: '12px', marginLeft: '6px' }}>
                            {currentPn}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={handleModalClose}
                        className="variable-modal-close"
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* ── 탭 네비게이션 ── */}
                <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#ffffff', padding: '0 24px' }}>
                    <button
                        onClick={() => setActiveTab(1)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 16px', border: 'none',
                            background: 'transparent', cursor: 'pointer', fontSize: '14px', fontWeight: activeTab === 1 ? '700' : '500',
                            color: activeTab === 1 ? '#16a34a' : '#64748b', borderBottom: activeTab === 1 ? '2px solid #16a34a' : '2px solid transparent',
                            marginBottom: '-1px', transition: 'all 0.15s'
                        }}
                    >
                        <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: activeTab === 1 ? '#16a34a' : '#cbd5e1', color: '#fff', fontSize: '11px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>1</span>
                        엑셀 받기
                    </button>
                    <button
                        onClick={() => setActiveTab(2)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 16px', border: 'none',
                            background: 'transparent', cursor: 'pointer', fontSize: '14px', fontWeight: activeTab === 2 ? '700' : '500',
                            color: activeTab === 2 ? '#16a34a' : '#64748b', borderBottom: activeTab === 2 ? '2px solid #16a34a' : '2px solid transparent',
                            marginBottom: '-1px', transition: 'all 0.15s', position: 'relative'
                        }}
                    >
                        <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: activeTab === 2 ? '#16a34a' : '#cbd5e1', color: '#fff', fontSize: '11px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>2</span>
                        올려서 반영
                        {validationResult?.errors && validationResult.errors.length > 0 && (
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', position: 'absolute', top: '12px', right: '8px' }}></span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab(3)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 16px', border: 'none',
                            background: 'transparent', cursor: 'pointer', fontSize: '14px', fontWeight: activeTab === 3 ? '700' : '500',
                            color: activeTab === 3 ? '#16a34a' : '#64748b', borderBottom: activeTab === 3 ? '2px solid #16a34a' : '2px solid transparent',
                            marginBottom: '-1px', transition: 'all 0.15s'
                        }}
                    >
                        <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: activeTab === 3 ? '#16a34a' : '#cbd5e1', color: '#fff', fontSize: '11px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>3</span>
                        되돌리기
                    </button>
                </div>

                {/* ── 바디 영역 ── */}
                <div className="custom-scrollbar" style={{ flex: 1, padding: '16px 24px 12px 24px', background: '#ffffff', maxHeight: 'calc(92vh - 130px)', overflowY: 'auto', transition: 'all 0.2s ease-in-out' }}>

                    {/* ───────────────────────────────────────────── */}
                    {/* TAB 1: 엑셀 받기 */}
                    {/* ───────────────────────────────────────────── */}
                    {activeTab === 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* 상단 엑셀 다운로드 카드 */}
                            <div style={{
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                padding: '16px 20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '16px',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                                    <div style={{
                                        width: '42px',
                                        height: '42px',
                                        borderRadius: '8px',
                                        background: '#f0faf5',
                                        border: '1px solid #bbf7d0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#16a34a',
                                        flexShrink: 0
                                    }}>
                                        <FileSpreadsheet size={22} />
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>
                                                현재 맵 엑셀 양식 내려받기
                                            </h4>
                                            <span style={{ fontSize: '12px', color: '#16a34a', background: '#f0faf5', border: '1px solid #bbf7d0', padding: '1px 8px', borderRadius: '10px', fontWeight: '600' }}>
                                                {variables.length || 0}행
                                            </span>
                                            <span style={{ fontSize: '12px', color: '#64748b' }}>
                                                ({currentPn}_map.xlsx)
                                            </span>
                                        </div>
                                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b', lineHeight: '1.4' }}>
                                            지금 저장된 맵 데이터를 엑셀 양식으로 내려받습니다. 지정된 16개 항목만 수정이 가능합니다.
                                        </p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                                    <button
                                        onClick={handleExportExcel}
                                        style={{
                                            height: '38px',
                                            padding: '0 16px',
                                            background: '#16a34a',
                                            color: '#ffffff',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            transition: 'background 0.15s',
                                            whiteSpace: 'nowrap'
                                        }}
                                        onMouseOver={e => e.currentTarget.style.background = '#15803d'}
                                        onMouseOut={e => e.currentTarget.style.background = '#16a34a'}
                                    >
                                        <Download size={15} />
                                        <span>엑셀 다운로드</span>
                                    </button>
                                </div>
                            </div>

                            {/* 저장하지 않은 변경 안내 경고 박스 */}
                            {hasChanges && (
                                <div style={{ padding: '14px 16px', background: '#fffbeb', border: '1px solid #fef08a', borderRadius: '8px', fontSize: '13px', color: '#92400e', lineHeight: '1.5' }}>
                                    <strong>저장하지 않은 변경이 있습니다.</strong> 엑셀은 저장된 값 기준이라, 지금 화면에서 고친 내용은 담기지 않습니다. 필요하면 먼저 저장해주세요.
                                </div>
                            )}

                            {/* 고칠 수 있는 칸 & 엑셀 작성 안내 영역 (2줄 세로 스택) */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {/* 1행: 고칠 수 있는 칸 (헤더 우측에 흰칸/회색칸 범례 표출) */}
                                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b' }}>수정 가능 항목</span>
                                            <span style={{ background: '#f1f5f9', color: '#475569', fontSize: '12px', fontWeight: 'bold', padding: '1px 7px', borderRadius: '10px' }}>
                                                {modifiableFields.length}
                                            </span>
                                        </div>

                                        {/* 수정 가능 / 수정 불가 범례 */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', color: '#475569' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <div style={{ width: '20px', height: '14px', border: '1px solid #cbd5e1', background: '#ffffff', borderRadius: '3px' }}></div>
                                                <span><strong style={{ color: '#16a34a' }}>수정 가능</strong></span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <div style={{ width: '20px', height: '14px', border: '1px solid #cbd5e1', background: '#e2e8f0', borderRadius: '3px' }}></div>
                                                <span><strong style={{ color: '#64748b' }}>수정 불가</strong></span>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {modifiableFields.map((field, idx) => (
                                            <span key={idx} style={{
                                                background: '#ffffff',
                                                border: '1px solid #cbd5e1',
                                                color: '#0f172a',
                                                fontSize: '12px',
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                fontWeight: '500',
                                                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                                            }}>
                                                {field}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* 2행: 엑셀 작성 참고사항 */}
                                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b' }}>엑셀 작성 참고사항</span>
                                    <div style={{ fontSize: '12px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '6px', lineHeight: '1.5' }}>
                                        <div>• O/X 여부 및 변수유형 항목은 엑셀 내 드롭다운 목록에서 선택합니다.</div>
                                        <div>• 다중 행 일괄 수정 시에는 <strong>복사(Ctrl+C) → 붙여넣기(Ctrl+V)</strong>를 사용하세요. (드롭다운 자동 채우기 제한)</div>
                                        <div>• 시트보호 상태에서도 정렬 및 필터 기능은 정상 이용할 수 있습니다.</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ───────────────────────────────────────────── */}
                    {/* TAB 2: 올려서 반영 */}
                    {/* ───────────────────────────────────────────── */}
                    {activeTab === 2 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                accept=".xlsx, .xls"
                                onChange={(e) => {
                                    if (e.target.files?.[0]) {
                                        handleFileSelect(e.target.files[0]);
                                    }
                                    e.target.value = "";
                                }}
                            />

                            {/* 파일 선택 드롭존 (파일이 없을 때) */}
                            {!selectedFile && (
                                <>
                                    <div
                                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                                        onDrop={handleDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                        style={{
                                            border: `2px dashed ${isDragging ? '#16a34a' : '#cbd5e1'}`, borderRadius: '8px',
                                            background: isDragging ? '#f0faf5' : '#ffffff', padding: '36px 20px',
                                            textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s',
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                        }}
                                    >
                                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#f0faf5', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
                                            <Upload size={24} />
                                        </div>
                                        <p style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#1e293b' }}>
                                            엑셀 파일을 드래그하거나 클릭하여 선택하세요
                                        </p>
                                        <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                                            .xlsx 형식 지원
                                        </span>
                                    </div>

                                    <div style={{ padding: '14px 16px', background: '#f0faf5', border: '1px solid #bbf7d0', borderRadius: '8px', fontSize: '13px', color: '#15803d', lineHeight: '1.5' }}>
                                        <strong>파일 반영 안내:</strong> 파일 선택 시 자동 검사하며, <strong>[적용]</strong> 버튼을 클릭해야 저장됩니다. (적용 직전 데이터는 되돌리기 지점에 자동 저장됩니다.)
                                    </div>
                                </>
                            )}

                            {/* 파일이 선택된 상태 */}
                            {selectedFile && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {/* 선택된 파일 카드 */}
                                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '30px', height: '30px', borderRadius: '6px', background: '#ffffff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                                                <FileSpreadsheet size={16} />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>{selectedFile.name}</span>
                                                <span style={{ fontSize: '11px', color: '#94a3b8' }}>{(selectedFile.size / 1024).toFixed(0)} KB</span>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (fileInputRef.current) {
                                                    fileInputRef.current.click();
                                                }
                                            }}
                                            style={{ height: '28px', padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#ffffff', color: '#475569', fontSize: '12px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.15s' }}
                                            onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                                            onMouseOut={e => e.currentTarget.style.background = '#ffffff'}
                                        >
                                            파일 변경
                                        </button>
                                    </div>

                                    {/* 1. 검사 진행 중 */}
                                    {isValidating && (
                                        <div style={{ padding: '14px 16px', background: '#f0faf5', border: '1px solid #bbf7d0', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', color: '#15803d', fontSize: '13px' }}>
                                            <Loader2 size={18} className="animate-spin" />
                                            <span><strong>검사하는 중입니다...</strong> 잠시만 기다려주세요.</span>
                                        </div>
                                    )}

                                    {/* 2. 적용 처리 완료 상태 */}
                                    {!isValidating && isApplied && (
                                        <div style={{ padding: '20px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', color: '#166534' }}>
                                            <CheckCircle2 size={36} color="#16a34a" />
                                            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>성공적으로 반영되었습니다!</h4>
                                            <p style={{ margin: 0, fontSize: '12px', color: '#15803d' }}>
                                                엑셀 변경사항이 맵 데이터에 반영되었으며, 복원 지점이 자동 생성되었습니다.
                                            </p>
                                        </div>
                                    )}

                                    {/* 3. 검사 결과 표출 (적용 전) */}
                                    {!isValidating && !isApplied && validationResult && (
                                        <>
                                            {/* fileErrors가 존재하는 경우 (다른 설문 파일 / 엑셀 형식 오류 등 전체 차단) */}
                                            {hasFileErrors ? (
                                                <div style={{ padding: '16px 18px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <AlertTriangle size={16} color="#dc2626" />
                                                        <strong style={{ fontSize: '14px', color: '#dc2626' }}>업로드할 수 없는 파일입니다.</strong>
                                                    </div>
                                                    <div style={{ paddingLeft: '4px', display: 'flex', flexDirection: 'column', gap: '4px', color: '#7f1d1d', lineHeight: '1.45' }}>
                                                        {validationResult.fileErrors.map((err, idx) => (
                                                            <div key={idx}>
                                                                • {err}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div style={{ marginTop: '2px', paddingTop: '8px', borderTop: '1px solid #fee2e2', color: '#991b1b', fontSize: '12.5px', fontWeight: '500' }}>
                                                        ※ 변경사항은 반영되지 않았습니다. <strong>'1. 엑셀 받기'</strong> 탭에서 최신 엑셀을 다시 내려받아 작업해주세요.
                                                    </div>
                                                </div>
                                            ) : (
                                                /* 정상 또는 오류 섞인 파일 결과 내역 */
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {/* 요약 상태 배너 */}
                                                    <div style={{
                                                        padding: '8px 14px',
                                                        background: (validationResult.changedRows || 0) > 0 ? '#f0faf5' : '#f8fafc',
                                                        border: `1px solid ${(validationResult.changedRows || 0) > 0 ? '#bbf7d0' : '#e2e8f0'}`,
                                                        borderRadius: '8px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between'
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            {(validationResult.changedRows || 0) > 0 ? (
                                                                <CheckCircle2 size={18} color="#16a34a" />
                                                            ) : (
                                                                <Info size={18} color="#64748b" />
                                                            )}
                                                            <div>
                                                                <div style={{ fontSize: '14px', fontWeight: 'bold', color: (validationResult.changedRows || 0) > 0 ? '#15803d' : '#334155' }}>
                                                                    {(validationResult.changedRows || 0) > 0
                                                                        ? `총 ${validationResult.changedRows}개 행이 변경됩니다`
                                                                        : '변경사항이 없습니다 (0개 행)'}
                                                                </div>
                                                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                                                                    {(validationResult.changedRows || 0) > 0
                                                                        ? `업로드한 파일에서 확인한 ${validationResult.totalRows || 0}행 중 ${validationResult.changedRows}개 행의 값이 수정됩니다.`
                                                                        : `업로드한 ${validationResult.totalRows || 0}행의 데이터가 현재 저장된 맵과 동일합니다.`}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* 항목별 변경 칩 (changeByField) */}
                                                    {validationResult.changeByField && Object.keys(validationResult.changeByField).length > 0 && (
                                                        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e293b' }}>항목별 변경 내역</span>
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                                {Object.entries(validationResult.changeByField).map(([key, val], idx) => (
                                                                    <span key={idx} style={{ background: '#f0faf5', border: '1px solid #bbf7d0', color: '#15803d', fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '12px' }}>
                                                                        {key} <strong style={{ marginLeft: '3px' }}>+{val}</strong>
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* 미변경 항목 (ignored / missing) */}
                                                    {validationResult.ignored && validationResult.ignored.length > 0 && (() => {
                                                        const ignoredList = validationResult.ignored;
                                                        const ignoredCount = (validationResult.ignoredRows || 0) + (validationResult.missingRows || 0) || ignoredList.length;

                                                        return (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: '2px', paddingRight: '2px' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                        <MinusCircle size={14} color="#64748b" />
                                                                        <span style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#334155' }}>미변경 항목</span>
                                                                        <span style={{ background: '#e2e8f0', color: '#475569', padding: '1px 7px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold' }}>
                                                                            {ignoredCount}
                                                                        </span>
                                                                    </div>
                                                                    {ignoredList.length > 2 && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => toggleSection('ignored')}
                                                                            style={{
                                                                                display: 'inline-flex', alignItems: 'center', gap: '2px',
                                                                                background: 'transparent', border: 'none', color: '#475569',
                                                                                fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                                                                                padding: '1px 5px', borderRadius: '4px', transition: 'all 0.15s'
                                                                            }}
                                                                            onMouseOver={e => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#1e293b'; }}
                                                                            onMouseOut={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#475569'; }}
                                                                        >
                                                                            <span style={{ fontSize: '12px' }}>{expandedSections.ignored ? '접기' : '펼쳐보기'}</span>
                                                                            {expandedSections.ignored ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                <div className="custom-scrollbar" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: expandedSections.ignored ? '260px' : '85px', overflowY: 'auto', transition: 'max-height 0.2s ease-in-out' }}>
                                                                    {ignoredList.map((text, idx) => (
                                                                        <div key={idx} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', color: '#334155', lineHeight: '1.35' }}>
                                                                            {text}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}

                                                    {/* 오류 상세 카드 (errors) */}
                                                    {validationResult.errors && validationResult.errors.length > 0 && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: '2px', paddingRight: '2px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <AlertTriangle size={14} color="#dc2626" />
                                                                    <span style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#991b1b' }}>오류</span>
                                                                    <span style={{ background: '#fee2e2', color: '#dc2626', padding: '1px 7px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold' }}>
                                                                        {validationResult.errors.length}
                                                                    </span>
                                                                    <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '4px' }}>— 해당 행만 제외하고 진행됩니다</span>
                                                                </div>
                                                                {validationResult.errors.length > 2 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => toggleSection('errors')}
                                                                        style={{
                                                                            display: 'inline-flex', alignItems: 'center', gap: '2px',
                                                                            background: 'transparent', border: 'none', color: '#475569',
                                                                            fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                                                                            padding: '1px 5px', borderRadius: '4px', transition: 'all 0.15s'
                                                                        }}
                                                                        onMouseOver={e => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#1e293b'; }}
                                                                        onMouseOut={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#475569'; }}
                                                                    >
                                                                        <span style={{ fontSize: '12px' }}>{expandedSections.errors ? '접기' : '펼쳐보기'}</span>
                                                                        {expandedSections.errors ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <div className="custom-scrollbar" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: expandedSections.errors ? '280px' : '90px', overflowY: 'auto', transition: 'max-height 0.2s ease-in-out' }}>
                                                                {validationResult.errors.map((errItem, idx) => (
                                                                    <div key={idx} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                                                                        <span style={{ width: '40px', color: '#94a3b8', flexShrink: 0, fontSize: '12px' }}>{errItem.row}행</span>
                                                                        <span style={{ width: '70px', fontWeight: 'bold', color: '#1e293b', flexShrink: 0, fontSize: '12px' }}>{errItem.varName || errItem.id}</span>
                                                                        <span style={{ flex: 1, color: '#334155', fontSize: '12px' }}>
                                                                            {Array.isArray(errItem.messages) ? errItem.messages.join(', ') : errItem.messages || errItem.message}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* 참고 상세 카드 (notes) */}
                                                    {validationResult.notes && validationResult.notes.length > 0 && (() => {
                                                        const notesList = validationResult.notes;

                                                        return (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: '2px', paddingRight: '2px' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                        <Info size={14} color="#0284c7" />
                                                                        <span style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#0369a1' }}>참고</span>
                                                                        <span style={{ background: '#e0f2fe', color: '#0284c7', padding: '1px 7px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold' }}>
                                                                            {notesList.length}
                                                                        </span>
                                                                        <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '4px' }}>— 자동 변경 또는 안내사항</span>
                                                                    </div>
                                                                    {notesList.length > 2 && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => toggleSection('notes')}
                                                                            style={{
                                                                                display: 'inline-flex', alignItems: 'center', gap: '2px',
                                                                                background: 'transparent', border: 'none', color: '#475569',
                                                                                fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                                                                                padding: '1px 5px', borderRadius: '4px', transition: 'all 0.15s'
                                                                            }}
                                                                            onMouseOver={e => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#1e293b'; }}
                                                                            onMouseOut={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#475569'; }}
                                                                        >
                                                                            <span style={{ fontSize: '12px' }}>{expandedSections.notes ? '접기' : '펼쳐보기'}</span>
                                                                            {expandedSections.notes ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                <div className="custom-scrollbar" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: expandedSections.notes ? '260px' : '85px', overflowY: 'auto', transition: 'max-height 0.2s ease-in-out' }}>
                                                                    {notesList.map((noteItem, idx) => (
                                                                        <div key={idx} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                                                                            <span style={{ width: '40px', color: '#94a3b8', flexShrink: 0, fontSize: '12px' }}>{noteItem.row ? `${noteItem.row}행` : ''}</span>
                                                                            <span style={{ flex: 1, color: '#334155', fontSize: '12px' }}>
                                                                                {noteItem.varName && <strong style={{ color: '#1e293b', marginRight: '6px', fontSize: '12px' }}>{noteItem.varName}</strong>}
                                                                                {typeof noteItem === 'string' ? noteItem : noteItem.message}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ───────────────────────────────────────────── */}
                    {/* TAB 3: 되돌리기 */}
                    {/* ───────────────────────────────────────────── */}
                    {activeTab === 3 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* 상단 통합 안내 및 복원 지점 생성 바 */}
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                                background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px 16px', borderRadius: '8px'
                            }}>
                                <div style={{ fontSize: '13px', color: '#334155', lineHeight: '1.45' }}>
                                    엑셀 적용 전 상태가 자동 저장되며, 필요한 경우 직접 복원 지점을 만드실 수 있습니다. <span style={{ color: '#64748b', fontSize: '12px' }}>(최근 <strong>20개</strong>까지 보관)</span>
                                </div>
                                <button
                                    onClick={handleCreateVersion}
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0,
                                        height: '34px', padding: '0 14px', background: '#ffffff', border: '1px solid #16a34a',
                                        borderRadius: '6px', fontSize: '12.5px', fontWeight: '600', color: '#15803d', cursor: 'pointer',
                                        transition: 'all 0.15s', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
                                    }}
                                    onMouseOver={e => { e.currentTarget.style.background = '#f0faf5'; e.currentTarget.style.borderColor = '#15803d'; }}
                                    onMouseOut={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#16a34a'; }}
                                >
                                    <Plus size={14} color="#16a34a" />
                                    <span>현재 상태 복원 지점으로 생성</span>
                                </button>
                            </div>

                            {/* 복원 지점 테이블 */}
                            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                                <div style={{ display: 'flex', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '10px 16px', fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>
                                    <span style={{ width: '60px' }}>지점</span>
                                    <span style={{ width: '130px' }}>시각</span>
                                    <span style={{ flex: 1 }}>이름</span>
                                    <span style={{ width: '80px', textAlign: 'center' }}>바뀐 행</span>
                                    <span style={{ width: '90px', textAlign: 'right' }}></span>
                                </div>
                                <div className="custom-scrollbar" style={{ minHeight: '210px', maxHeight: '240px', overflowY: 'auto' }}>
                                    {isLoadingVersions && (!versions || versions.length === 0) ? (
                                        <div style={{ height: '210px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '13px' }}>
                                            복원 지점 목록을 불러오는 중...
                                        </div>
                                    ) : !versions || versions.length === 0 ? (
                                        <div style={{ height: '210px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px' }}>
                                            저장된 복원 지점이 없습니다.
                                        </div>
                                    ) : (
                                        versions.map((point, idx) => (
                                            <div key={point.id || idx} style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #f1f5f9', fontSize: '13px', color: '#334155' }}>
                                                <span style={{ width: '60px', fontWeight: 'bold', color: '#16a34a' }}>v{point.versionNumber || point.id}</span>
                                                <span style={{ width: '130px', fontSize: '12px', color: '#64748b' }}>
                                                    {point.createdAt ? String(point.createdAt).slice(5, 16).replace('T', ' ') : point.time}
                                                </span>
                                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ fontWeight: '500' }}>{point.versionName || point.name}</span>
                                                    {point.isAuto && (
                                                        <span style={{ background: '#f1f5f9', color: '#64748b', fontSize: '11px', padding: '1px 6px', borderRadius: '4px' }}>자동</span>
                                                    )}
                                                    {point.restoredAt && (() => {
                                                        const s = String(point.restoredAt).replace('T', ' ').trim();
                                                        let text = '복원됨';
                                                        if (s && s !== 'true') {
                                                            const formatted = s.length >= 16 ? s.slice(5, 16) : s;
                                                            text = `${formatted} 복원됨`;
                                                        }
                                                        return (
                                                            <span style={{ background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', fontSize: '11px', fontWeight: '500', padding: '1px 7px', borderRadius: '4px' }}>
                                                                {text}
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                                <span style={{ width: '80px', textAlign: 'center', fontSize: '12px', color: '#475569' }}>
                                                    {point.changedCount ?? '—'}
                                                </span>
                                                <div style={{ width: '90px', textAlign: 'right' }}>
                                                    <button
                                                        onClick={() => handleRestore(point)}
                                                        style={{
                                                            height: '28px', padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: '4px',
                                                            background: '#ffffff', color: '#334155', fontSize: '12px', cursor: 'pointer', fontWeight: '500',
                                                            transition: 'all 0.15s'
                                                        }}
                                                        onMouseOver={e => { e.currentTarget.style.background = '#f0faf5'; e.currentTarget.style.borderColor = '#86efac'; e.currentTarget.style.color = '#15803d'; }}
                                                        onMouseOut={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#334155'; }}
                                                    >
                                                        되돌리기
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* 되돌리기 안내 박스 */}
                            <div style={{ padding: '13px 16px', background: '#f0faf5', border: '1px solid #bbf7d0', borderRadius: '8px', fontSize: '12.5px', fontWeight: '500', color: '#15803d', lineHeight: '1.5' }}>
                                복원 시 현재 상태가 먼저 자동 저장되므로 언제든 다시 원복할 수 있습니다. 변경이 일어났던 해당 행들만 안전하게 복원됩니다.
                            </div>
                        </div>
                    )}
                </div>

                {/* ── 푸터 ── */}
                <div className="variable-modal-footer" style={{ borderTop: 'none', padding: '8px 24px 24px 24px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    {isApplied || activeTab === 1 || activeTab === 3 ? (
                        <button
                            type="button"
                            className="upload-cancel-btn"
                            onClick={handleModalClose}
                            style={{
                                height: '36px',
                                padding: '0 20px',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: '600',
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                color: '#334155',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                            }}
                            onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                            onMouseOut={e => e.currentTarget.style.background = '#ffffff'}
                        >
                            닫기
                        </button>
                    ) : (
                        <>
                            <button
                                type="button"
                                className="upload-cancel-btn"
                                onClick={handleModalClose}
                            >
                                취소
                            </button>

                            {activeTab === 2 && (
                                <button
                                    type="button"
                                    className="upload-submit-btn"
                                    onClick={handleApplyRules}
                                    disabled={isApplyDisabled}
                                    style={{
                                        backgroundColor: isApplyDisabled ? '#cbd5e1' : '#16a34a',
                                        cursor: isApplyDisabled ? 'not-allowed' : 'pointer',
                                        opacity: isApplyDisabled ? 0.6 : 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    {isApplying ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" />
                                            <span>적용 중...</span>
                                        </>
                                    ) : (
                                        `적용 (${changedRowsCount}행)`
                                    )}
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BatchMapEditModal;
