import React, { useState, useEffect, useRef, useContext } from 'react';
import { X, Upload, FileSpreadsheet, Loader2, AlertTriangle, Info, CheckCircle2, Download, ChevronDown, ChevronUp, MinusCircle, Plus, Pencil, Check, RotateCcw, HelpCircle, Edit3, FileCode, FileCheck, Sliders, Sparkles, Save } from 'lucide-react';
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
        createExcelVersion,
        renameMapVersion,
        previewMapRestore
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
    const [appliedVersionId, setAppliedVersionId] = useState(null);

    // 인라인 이름 변경 (rename) 상태
    const [editingVersionId, setEditingVersionId] = useState(null);
    const [editingLocation, setEditingLocation] = useState(null); // 'card' | 'table'
    const [editingVersionName, setEditingVersionName] = useState('');
    const [isRenaming, setIsRenaming] = useState(false);

    // 미리보기 & 되돌리기 모달 상태
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewLoadingId, setPreviewLoadingId] = useState(null);
    const [previewTarget, setPreviewTarget] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    const [isResurrectChecked, setIsResurrectChecked] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);

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
        setAppliedVersionId(null);
        setIsValidating(false);
        setIsApplying(false);
        setEditingVersionId(null);
        setEditingLocation(null);
        setIsPreviewOpen(false);
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
            setAppliedVersionId(null);
            setIsValidating(false);
            setIsApplying(false);
            setEditingVersionId(null);
            setIsPreviewOpen(false);
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

    // ── origin 배지 렌더링 헬퍼 ──
    const renderOriginBadge = (origin) => {
        if (!origin) {
            return <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}>—</span>;
        }
        const o = String(origin).toLowerCase();
        if (o === 'manual') {
            return <span style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', fontSize: '11px', fontWeight: 'bold', padding: '1px 7px', borderRadius: '4px' }}>수동 저장</span>;
        }
        if (o === 'excel') {
            return <span style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', fontSize: '11px', fontWeight: 'bold', padding: '1px 7px', borderRadius: '4px' }}>엑셀</span>;
        }
        if (o === 'xml') {
            return <span style={{ background: '#f3e8ff', color: '#7e22ce', border: '1px solid #e9d5ff', fontSize: '11px', fontWeight: 'bold', padding: '1px 7px', borderRadius: '4px' }}>XML</span>;
        }
        if (o === 'safety') {
            return <span style={{ background: '#ffedd5', color: '#c2410c', border: '1px solid #fed7aa', fontSize: '11px', fontWeight: 'bold', padding: '1px 7px', borderRadius: '4px' }}>안전</span>;
        }
        return <span style={{ color: '#94a3b8', fontSize: '12px' }}>—</span>;
    };

    // ── kept 배지 렌더링 헬퍼 ──
    const renderKeptBadge = (kept) => {
        if (kept) {
            return <span style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', fontSize: '11px', fontWeight: 'bold', padding: '1px 7px', borderRadius: '4px' }}>안 없어짐</span>;
        }
        return null;
    };

    // ── 상단 3개 카드 데이터 계산 (수동 저장 · 엑셀 수정 · XML 덮기) ──
    const manualKeptItem = (versions || []).find(v => v.kept === true && String(v.origin || '').toLowerCase() === 'manual');
    const excelKeptItem = (versions || []).find(v => v.kept === true && String(v.origin || '').toLowerCase() === 'excel');
    const xmlKeptItem = (versions || []).find(v => v.kept === true && String(v.origin || '').toLowerCase() === 'xml');

    const topCards = [
        { key: 'Manual', title: '수동 저장', item: manualKeptItem },
        { key: 'Excel', title: '엑셀 수정', item: excelKeptItem },
        { key: 'Xml', title: 'XML 덮기', item: xmlKeptItem }
    ];

    // ── 인라인 이름 변경 ──
    const startRename = (item, e, location = 'table') => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        setEditingVersionId(item.id);
        setEditingLocation(location);
        setEditingVersionName(item.versionName || item.name || '');
    };

    const cancelRename = () => {
        setEditingVersionId(null);
        setEditingLocation(null);
        setEditingVersionName('');
    };

    const handleSaveRename = async (item) => {
        const trimmed = editingVersionName.trim();
        if (!trimmed) {
            modal.showErrorAlert('알림', '변경할 지점 이름을 입력해 주세요.');
            return;
        }

        setIsRenaming(true);
        try {
            const res = await renameMapVersion.mutateAsync({
                pn: currentPn,
                versionId: item.id || item.versionNumber,
                versionName: trimmed,
                user: userId
            });

            const code = String(res?.success || res?.code || '');
            if (code === '777') {
                const updatedName = res?.resultjson?.versionName || trimmed;
                setVersions(prev => prev.map(v => (v.id === item.id || v.versionNumber === item.versionNumber) ? { ...v, versionName: updatedName } : v));
                cancelRename();
                fetchVersionsList(true);
            } else if (code === '900' || code === '909') {
                const errMsg = res?.resultjson?.errorcontent || res?.message || (code === '900' ? '빈 이름은 사용할 수 없습니다.' : '지점이 이미 삭제되었습니다.');
                modal.showErrorAlert('오류', errMsg);
            } else {
                const errMsg = res?.resultjson?.errorcontent || res?.message || '이름 변경 처리에 실패했습니다.';
                modal.showErrorAlert('오류', errMsg);
            }
        } catch (err) {
            console.error("renameMapVersion error:", err);
            const errMsg = err?.response?.data?.message || err?.message || '이름 변경 처리 중 오류가 발생했습니다.';
            modal.showErrorAlert('오류', errMsg);
        } finally {
            setIsRenaming(false);
        }
    };

    // ── 복원 미리보기 모달 열기 ──
    const handleOpenRestorePreview = async (item) => {
        const vId = item.id || item.versionNumber;
        setPreviewLoadingId(vId);
        setPreviewTarget(item);

        try {
            const res = await previewMapRestore.mutateAsync({
                pn: currentPn,
                versionId: vId,
                user: userId
            });

            if (String(res?.success) === '777' || res?.resultjson || res?.wouldChange !== undefined) {
                const pData = res?.resultjson || res;
                setPreviewData(pData);
                setIsResurrectChecked(pData?.autoResurrect ?? false);
                setIsPreviewOpen(true);
            } else {
                const errMsg = res?.resultjson?.errorcontent || res?.message || '미리보기 정보를 불러오는데 실패했습니다.';
                modal.showErrorAlert('오류', errMsg);
            }
        } catch (err) {
            console.error("previewMapRestore error:", err);
            const errMsg = err?.response?.data?.message || err?.message || '미리보기 불러오기 중 오류가 발생했습니다.';
            modal.showErrorAlert('오류', errMsg);
        } finally {
            setPreviewLoadingId(null);
        }
    };

    // ── 최종 복원 실행 ──
    const handleExecuteRestore = async () => {
        if (!previewTarget || !previewData) return;
        const vId = previewTarget.id || previewTarget.versionNumber;

        setIsRestoring(true);
        try {
            const res = await restoreExcelVersion.mutateAsync({
                pn: currentPn,
                versionId: vId,
                user: userId,
                resurrect: isResurrectChecked
            });

            if (String(res?.success) === '777') {
                const rData = res?.resultjson || {};
                const resurrectedList = rData.resurrected || [];

                setIsPreviewOpen(false);

                let alertMsg = res?.message || '성공적으로 되돌렸습니다.';
                if (Array.isArray(resurrectedList) && resurrectedList.length > 0) {
                    alertMsg += `\n\n📢 되살린 문항(${resurrectedList.join(', ')})은 AI 오픈코딩 표시가 꺼진 채로 돌아옵니다. 필요하면 맵 화면에서 다시 켜 주세요.`;
                }

                modal.showAlert('복원 완료', alertMsg, null, () => {
                    if (refreshData) refreshData();
                });

                fetchVersionsList();
            } else {
                const errMsg = res?.resultjson?.errorcontent || res?.message || '복원 처리에 실패했습니다.';
                modal.showErrorAlert('오류', errMsg);
            }
        } catch (err) {
            console.error("restoreExcelVersion error:", err);
            const errMsg = err?.response?.data?.message || err?.message || '복원 처리 중 오류가 발생했습니다.';
            modal.showErrorAlert('오류', errMsg);
        } finally {
            setIsRestoring(false);
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
                        const code = String(json?.success || json?.code || '');
                        if (code === '909' || code === '900') {
                            const msg = json?.message || json?.resultjson?.errorcontent || '변수가 없는 설문입니다.';
                            modal.showErrorAlert('알림', msg);
                            return;
                        }
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
        setAppliedVersionId(null);
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
                const versionId = res?.resultjson?.versionId ?? res?.versionId;
                if (versionId === 0) {
                    setIsApplied(true);
                    setAppliedVersionId(0);
                    modal.showAlert('알림', res?.message || '바뀐 게 없습니다.', null, () => {
                        if (refreshData) refreshData();
                    });
                    return;
                }
                setAppliedVersionId(versionId);
                const appliedCount = res?.resultjson?.applied ?? validationResult.changedRows ?? 0;
                const msg = res?.message || `${appliedCount}행을 반영했습니다.`;

                setIsApplied(true);

                // 맵 목록 새로고침 & 복원 지점 재조회
                modal.showAlert('알림', msg, null, () => {
                    if (refreshData) refreshData();
                });
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

    // ── 탭 3: 수동 복원 지점 생성 (create) ──
    const handleCreateVersion = async () => {
        try {
            const res = await createExcelVersion.mutateAsync({
                pn: currentPn,
                user: userId,
                versionName: "수동 저장"
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

    const modifiableFields = [
        '문항', '표제목', 'SPSS변수명', '변수유형', 'SRT이관', '실사이관', '출력제외', '검증문항',
        '멀티값변경', '오픈머지제외', '소수점자리수', '문항최소갯수', '분석제외코드', '기타오픈정의', '로직체크', '메모'
    ];

    const hasFileErrors = validationResult?.fileErrors && validationResult.fileErrors.length > 0;
    const changedRowsCount = validationResult?.changedRows || 0;
    const isApplyDisabled = !selectedFile || isValidating || isApplying || isApplied || hasFileErrors || changedRowsCount === 0;

    if (!isOpen) return null;

    // 최근 저장 시각 정보 헬퍼
    const latestVersion = versions && versions.length > 0 ? versions[0] : null;
    const latestSaveText = latestVersion
        ? `${latestVersion.createdAt ? String(latestVersion.createdAt).slice(5, 16).replace('T', ' ') : ''} 저장 (${latestVersion.createdBy || latestVersion.restoredBy || ''})`.trim()
        : '';

    return (
        <div className="variable-modal-overlay" style={{ zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="variable-modal-content" style={{ width: '920px', maxWidth: '95vw', padding: 0, borderRadius: '12px', overflow: 'hidden', background: '#fff', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', display: 'flex', flexDirection: 'column', maxHeight: '92vh' }}>

                {/* ── 맵 관리 그린 헤더 ── */}
                <div className="variable-modal-header" style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: '4px',
                            height: '18px',
                            backgroundColor: '#16a34a',
                            borderRadius: '4px',
                            marginRight: '2px'
                        }}></div>
                        <h3 className="variable-modal-title" style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#0f172a' }}>
                            맵 세팅 관리
                        </h3>
                        <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '12px', fontWeight: '700', padding: '2px 8px', borderRadius: '6px', marginLeft: '4px' }}>
                            {currentPn}
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        {/* 현재 맵 정보 & 저장하지 않은 변경 배지 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#64748b' }}>
                            {latestSaveText && <span>{latestSaveText}</span>}
                            {hasChanges && (
                                <span style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <AlertTriangle size={12} /> 저장하지 않은 변경 있음
                                </span>
                            )}
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
                </div>

                {/* ── 탭 네비게이션 (1 엑셀 반영, 2 XML 가져오기, 3 히스토리 및 복원) ── */}
                <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#ffffff', padding: '0 24px' }}>
                    <button
                        onClick={() => setActiveTab(1)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', border: 'none',
                            background: 'transparent', cursor: 'pointer', fontSize: '14px', fontWeight: activeTab === 1 ? '700' : '500',
                            color: activeTab === 1 ? '#16a34a' : '#64748b', borderBottom: activeTab === 1 ? '2px solid #16a34a' : '2px solid transparent',
                            marginBottom: '-1px', transition: 'all 0.15s'
                        }}
                    >
                        <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: activeTab === 1 ? '#16a34a' : '#cbd5e1', color: '#fff', fontSize: '11px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>1</span>
                        엑셀 반영
                    </button>

                    <button
                        onClick={() => setActiveTab(2)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', border: 'none',
                            background: 'transparent', cursor: 'pointer', fontSize: '14px', fontWeight: activeTab === 2 ? '700' : '500',
                            color: activeTab === 2 ? '#16a34a' : '#64748b', borderBottom: activeTab === 2 ? '2px solid #16a34a' : '2px solid transparent',
                            marginBottom: '-1px', transition: 'all 0.15s', position: 'relative'
                        }}
                    >
                        <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: activeTab === 2 ? '#16a34a' : '#cbd5e1', color: '#fff', fontSize: '11px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>2</span>
                        XML 가져오기
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', marginLeft: '-2px' }}></span>
                    </button>

                    <button
                        onClick={() => setActiveTab(3)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', border: 'none',
                            background: 'transparent', cursor: 'pointer', fontSize: '14px', fontWeight: activeTab === 3 ? '700' : '500',
                            color: activeTab === 3 ? '#16a34a' : '#64748b', borderBottom: activeTab === 3 ? '2px solid #16a34a' : '2px solid transparent',
                            marginBottom: '-1px', transition: 'all 0.15s'
                        }}
                    >
                        <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: activeTab === 3 ? '#16a34a' : '#cbd5e1', color: '#fff', fontSize: '11px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>3</span>
                        히스토리 및 복원
                    </button>
                </div>

                {/* ── 바디 영역 ── */}
                <div className="custom-scrollbar" style={{ flex: 1, padding: '14px 22px 12px 22px', background: '#f8fafc', maxHeight: 'calc(92vh - 120px)', overflowY: activeTab === 3 ? 'hidden' : 'auto', transition: 'all 0.2s ease-in-out' }}>

                    {/* ───────────────────────────────────────────── */}
                    {/* TAB 1: 엑셀 반영 (엑셀 다운로드 & 파일 업로드) */}
                    {/* ───────────────────────────────────────────── */}
                    {activeTab === 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {/* 상단 엑셀 다운로드 카드 */}
                            <div style={{
                                background: '#ffffff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '8px',
                                padding: '12px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '12px',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '6px',
                                        background: '#f0faf5',
                                        border: '1px solid #bbf7d0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#16a34a',
                                        flexShrink: 0
                                    }}>
                                        <FileSpreadsheet size={18} />
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: '700', color: '#1e293b' }}>
                                                현재 맵 엑셀 양식 내려받기
                                            </h4>
                                            <span style={{ fontSize: '11.5px', color: '#16a34a', background: '#f0faf5', border: '1px solid #bbf7d0', padding: '1px 7px', borderRadius: '10px', fontWeight: '600' }}>
                                                {variables.length || 0}행
                                            </span>
                                            <span style={{ fontSize: '12px', color: '#64748b' }}>
                                                ({currentPn}_map.xlsx)
                                            </span>
                                        </div>
                                        <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b', lineHeight: '1.3' }}>
                                            지금 저장된 맵 데이터를 엑셀 양식으로 내려받습니다.
                                        </p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                    <button
                                        onClick={handleExportExcel}
                                        style={{
                                            height: '34px',
                                            padding: '0 14px',
                                            background: '#16a34a',
                                            color: '#ffffff',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontSize: '12.5px',
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
                                        <Download size={14} />
                                        <span>엑셀 다운로드</span>
                                    </button>
                                </div>
                            </div>

                            {/* 저장하지 않은 변경 안내 경고 박스 */}
                            {hasChanges && (
                                <div style={{ padding: '6px 10px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', fontSize: '11.5px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <AlertTriangle size={13} color="#d97706" style={{ flexShrink: 0 }} />
                                    <span><strong>저장되지 않은 변경사항은 엑셀에 반영되지 않습니다.</strong> 필요 시 맵 화면에서 먼저 저장해 주세요.</span>
                                </div>
                            )}

                            {/* 파일 업로드 드롭존 및 검사/반영 카드 */}
                            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
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

                                {!selectedFile ? (
                                    <div
                                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                                        onDrop={handleDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                        style={{
                                            border: `2px dashed ${isDragging ? '#16a34a' : '#cbd5e1'}`, borderRadius: '6px',
                                            background: isDragging ? '#f0faf5' : '#ffffff', padding: '14px 12px',
                                            textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s',
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px'
                                        }}
                                    >
                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f0faf5', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2px' }}>
                                            <Upload size={17} />
                                        </div>
                                        <p style={{ margin: 0, fontSize: '13.5px', fontWeight: 'bold', color: '#1e293b' }}>
                                            수정한 엑셀 파일을 드래그하거나 클릭하여 선택하세요
                                        </p>
                                        <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                                            .xlsx 형식 지원 (자동 검사 후 반영)
                                        </span>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#ffffff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                                                    <FileSpreadsheet size={16} />
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#1e293b' }}>{selectedFile.name}</span>
                                                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>{(selectedFile.size / 1024).toFixed(0)} KB</span>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                style={{ height: '26px', padding: '0 8px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#ffffff', color: '#475569', fontSize: '11.5px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.15s' }}
                                            >
                                                파일 변경
                                            </button>
                                        </div>

                                        {isValidating && (
                                            <div style={{ padding: '8px 12px', background: '#f0faf5', border: '1px solid #bbf7d0', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px', color: '#15803d', fontSize: '12px' }}>
                                                <Loader2 size={14} className="animate-spin" />
                                                <span><strong>검사하는 중입니다...</strong> 잠시만 기다려주세요.</span>
                                            </div>
                                        )}

                                        {!isValidating && validationResult && (
                                            <div style={{ padding: '8px 12px', background: (validationResult.changedRows || 0) > 0 ? '#f0faf5' : '#f8fafc', border: `1px solid ${(validationResult.changedRows || 0) > 0 ? '#bbf7d0' : '#e2e8f0'}`, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <CheckCircle2 size={16} color="#16a34a" />
                                                    <span style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#15803d' }}>
                                                        총 {validationResult.changedRows || 0}개 행이 변경됩니다
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* 수정 가능 항목 및 작성 안내 (가독성 높은 컴팩트 디자인) */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {/* 수정 가능 항목 */}
                                <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>수정 가능 항목</span>
                                            <span style={{ background: '#f1f5f9', color: '#475569', fontSize: '11px', fontWeight: 'bold', padding: '1px 6px', borderRadius: '8px' }}>
                                                {modifiableFields.length}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11.5px', color: '#475569' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <div style={{ width: '12px', height: '9px', border: '1px solid #cbd5e1', background: '#ffffff', borderRadius: '2px' }}></div>
                                                <span><strong style={{ color: '#16a34a' }}>수정 가능</strong></span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <div style={{ width: '12px', height: '9px', border: '1px solid #cbd5e1', background: '#e2e8f0', borderRadius: '2px' }}></div>
                                                <span><strong style={{ color: '#64748b' }}>수정 불가</strong></span>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                        {modifiableFields.map((field, idx) => (
                                            <span key={idx} style={{
                                                background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a',
                                                fontSize: '11.5px', padding: '2px 7.5px', borderRadius: '4px', fontWeight: '500'
                                            }}>
                                                {field}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* 파일 반영 & 엑셀 작성 안내 (선명하고 고급스러운 서브 카드 디자인) */}
                                <div style={{
                                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '8px',
                                    padding: '10px 14px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <Info size={14} color="#0284c7" />
                                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a' }}>엑셀 반영 및 작성 안내</span>
                                        </div>
                                        <span style={{ fontSize: '11.5px', color: '#64748b' }}>핵심 수정 가이드</span>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        {/* 좌측: 파일 반영 방법 & 값 수정 규칙 */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {/* 파일 반영 방법 */}
                                            <div style={{
                                                background: '#f0f9ff',
                                                border: '1px solid #bae6fd',
                                                borderRadius: '6px',
                                                padding: '9px 12px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '4px',
                                                boxShadow: '0 1px 2px rgba(2,132,199,0.04)'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: '#e0f2fe', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        <FileCheck size={12} color="#0284c7" />
                                                    </div>
                                                    <span style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#0369a1' }}>
                                                        파일 반영 방법
                                                    </span>
                                                </div>
                                                <span style={{ fontSize: '12px', color: '#334155', lineHeight: '1.45', fontWeight: '400' }}>
                                                    파일 선택 시 자동 검사하며, 하단 <strong style={{ color: '#0f172a' }}>[적용]</strong> 버튼을 클릭해야 최종 저장됩니다. (적용 직전 데이터는 되돌리기 지점에 자동 저장)
                                                </span>
                                            </div>

                                            {/* 값 수정 규칙 */}
                                            <div style={{
                                                background: '#f0faf5',
                                                border: '1px solid #bbf7d0',
                                                borderRadius: '6px',
                                                padding: '9px 12px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '4px',
                                                boxShadow: '0 1px 2px rgba(22,163,74,0.04)'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: '#dcfce7', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        <Sliders size={12} color="#16a34a" />
                                                    </div>
                                                    <span style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#15803d' }}>
                                                        값 수정 규칙
                                                    </span>
                                                </div>
                                                <span style={{ fontSize: '12px', color: '#334155', lineHeight: '1.45', fontWeight: '400' }}>
                                                    엑셀 반영은 기존 데이터 「값 고치기」 전용입니다. 파일에 없는 변수는 삭제되지 않으며, 새로운 행 추가도 무시됩니다. (SRT/실사이관 제외)
                                                </span>
                                            </div>
                                        </div>

                                        {/* 우측: 작성 팁 (3개 항목) */}
                                        <div style={{
                                            background: '#f8fafc',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '6px',
                                            padding: '9px 12px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '6px',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: '#e2e8f0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <Sparkles size={12} color="#475569" />
                                                </div>
                                                <span style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#1e293b' }}>
                                                    작성 팁
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <div style={{ display: 'flex', gap: '5px', alignItems: 'flex-start' }}>
                                                    <span style={{ fontSize: '11.5px', color: '#16a34a', flexShrink: 0, fontWeight: 'bold' }}>✓</span>
                                                    <span style={{ fontSize: '12px', color: '#334155', lineHeight: '1.45', fontWeight: '400' }}>O/X 여부 및 변수유형 항목은 엑셀 내 드롭다운 목록에서 선택합니다.</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '5px', alignItems: 'flex-start' }}>
                                                    <span style={{ fontSize: '11.5px', color: '#16a34a', flexShrink: 0, fontWeight: 'bold' }}>✓</span>
                                                    <span style={{ fontSize: '12px', color: '#334155', lineHeight: '1.45', fontWeight: '400' }}>다중 행 일괄 수정 시에는 복사(Ctrl+C) → 붙여넣기(Ctrl+V)를 사용하세요. (드롭다운 자동 채우기 제한)</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '5px', alignItems: 'flex-start' }}>
                                                    <span style={{ fontSize: '11.5px', color: '#16a34a', flexShrink: 0, fontWeight: 'bold' }}>✓</span>
                                                    <span style={{ fontSize: '12px', color: '#334155', lineHeight: '1.45', fontWeight: '400' }}>시트보호 상태에서도 정렬 및 필터 기능은 정상 이용할 수 있습니다.</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ───────────────────────────────────────────── */}
                    {/* TAB 2: XML 가져오기 */}
                    {/* ───────────────────────────────────────────── */}
                    {activeTab === 2 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '32px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#f3e8ff', color: '#7e22ce', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <FileSpreadsheet size={24} />
                                </div>
                                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#1e293b' }}>
                                    XML 파일 가져오기
                                </h4>
                                <p style={{ margin: 0, fontSize: '13px', color: '#64748b', maxWidth: '420px', lineHeight: '1.5' }}>
                                    외부 설문 XML 규격 데이터를 원클릭으로 읽어와 맵 세팅에 일괄 덮어씌웁니다.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ───────────────────────────────────────────── */}
                    {/* TAB 3: 히스토리 및 복원 */}
                    {/* ───────────────────────────────────────────── */}
                    {activeTab === 3 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                            {/* 상단 복원 지점 관리 카드 */}
                            <div style={{
                                background: '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '10px',
                                padding: '16px 20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '16px',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
                            }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                                    <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 'bold', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ color: '#16a34a' }}>|</span> 되돌릴 지점 (복원 지점 생성)
                                    </h4>
                                    <p style={{ margin: 0, fontSize: '12.5px', color: '#475569', lineHeight: '1.45' }}>
                                        엑셀 반영 및 XML 가져오기 작업 진행 시 변경 전 상태가 자동 저장됩니다.<br />
                                        버튼을 눌러 현재 상태를 백업 지점으로 직접 생성하세요. (맵 화면의 단순 '변경사항 저장'은 복원 지점을 생성하지 않습니다)
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleCreateVersion}
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0,
                                        height: '36px', padding: '0 14px', background: '#ffffff', border: '1px solid #cbd5e1',
                                        borderRadius: '6px', fontSize: '12.5px', fontWeight: '600', color: '#15803d', cursor: 'pointer',
                                        transition: 'all 0.15s', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
                                    }}
                                    onMouseOver={e => { e.currentTarget.style.background = '#f0faf5'; e.currentTarget.style.borderColor = '#16a34a'; }}
                                    onMouseOut={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                >
                                    <Plus size={14} color="#16a34a" />
                                    <span>현재 상태 복원 지점으로 생성</span>
                                </button>
                            </div>

                            {/* 섹션 1: 방식별 최신 지점 3장 카드 고정 */}
                            <div style={{
                                background: '#f0faf5',
                                border: '1px solid #a7f3d0',
                                borderRadius: '10px',
                                padding: '14px 16px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 'bold', color: '#0f172a' }}>
                                        방식별 최신 지점
                                    </h4>
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                                        수동·엑셀·XML 저장 방식별 가장 최근 1개 지점은 이력 정리가 되어도 지워지지 않고 보존됩니다
                                    </span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>

                                    {/* Card 1: 수동 저장 */}
                                    {(() => {
                                        const item = manualKeptItem;
                                        return (
                                            <div style={{
                                                background: '#ffffff',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '8px',
                                                padding: '12px 14px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between',
                                                minHeight: '110px',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <Save size={15} color="#0284c7" />
                                                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#0369a1' }}>수동 저장</span>
                                                    </div>
                                                </div>

                                                {item ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                                                        {editingVersionId === item.id && editingLocation === 'card' ? (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', width: '100%' }}>
                                                                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#16a34a', flexShrink: 0 }}>v{item.versionNumber || item.id}</span>
                                                                <input
                                                                    type="text"
                                                                    value={editingVersionName}
                                                                    onChange={e => setEditingVersionName(e.target.value)}
                                                                    onKeyDown={e => {
                                                                        if (e.key === 'Enter') handleSaveRename(item);
                                                                        if (e.key === 'Escape') cancelRename();
                                                                    }}
                                                                    autoFocus
                                                                    style={{
                                                                        height: '26px', padding: '0 6px', fontSize: '12px',
                                                                        border: '1px solid #16a34a', borderRadius: '4px', outline: 'none', flex: 1, minWidth: 0
                                                                    }}
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSaveRename(item)}
                                                                    disabled={isRenaming}
                                                                    style={{ border: 'none', background: '#16a34a', color: '#fff', borderRadius: '4px', padding: '4px 6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
                                                                    title="저장"
                                                                >
                                                                    <Check size={12} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={cancelRename}
                                                                    style={{ border: 'none', background: '#e2e8f0', color: '#475569', borderRadius: '4px', padding: '4px 6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
                                                                    title="취소"
                                                                >
                                                                    <X size={12} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
                                                                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#16a34a' }}>v{item.versionNumber || item.id}</span>
                                                                <span style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.versionName || item.name}>
                                                                    {item.versionName || item.name}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => startRename(item, e, 'card')}
                                                                    style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: '2px', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
                                                                    title="이름 변경"
                                                                    onMouseOver={e => e.currentTarget.style.color = '#16a34a'}
                                                                    onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}
                                                                >
                                                                    <Pencil size={12} />
                                                                </button>
                                                            </div>
                                                        )}

                                                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                                                            {[
                                                                item.createdBy || userId || '',
                                                                item.createdAt ? String(item.createdAt).slice(5, 16).replace('T', ' ') : '',
                                                                `${item.changedCount ?? 0}행 변경`
                                                            ].filter(Boolean).join(' · ')}
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenRestorePreview(item)}
                                                                disabled={previewLoadingId === (item.id || item.versionNumber)}
                                                                style={{
                                                                    height: '26px', padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: '4px',
                                                                    background: '#ffffff', color: '#334155', fontSize: '12px', cursor: 'pointer', fontWeight: '600',
                                                                    transition: 'all 0.15s'
                                                                }}
                                                                onMouseOver={e => { e.currentTarget.style.background = '#f0faf5'; e.currentTarget.style.borderColor = '#16a34a'; e.currentTarget.style.color = '#15803d'; }}
                                                                onMouseOut={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#334155'; }}
                                                            >
                                                                되돌리기
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div style={{ padding: '16px 0', fontSize: '12px', color: '#64748b', textAlign: 'center', lineHeight: '1.45' }}>
                                                        생성된 수동 복원 지점이 없습니다<br />
                                                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>상단의 '+ 현재 상태 복원 지점으로 생성' 활용</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    {/* Card 2: 엑셀 수정 */}
                                    {(() => {
                                        const item = excelKeptItem;
                                        return (
                                            <div style={{
                                                background: '#ffffff',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '8px',
                                                padding: '12px 14px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between',
                                                minHeight: '110px',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <FileSpreadsheet size={15} color="#16a34a" />
                                                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#15803d' }}>엑셀 수정</span>
                                                    </div>
                                                </div>

                                                {item ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                                                        {editingVersionId === item.id && editingLocation === 'card' ? (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', width: '100%' }}>
                                                                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#16a34a', flexShrink: 0 }}>v{item.versionNumber || item.id}</span>
                                                                <input
                                                                    type="text"
                                                                    value={editingVersionName}
                                                                    onChange={e => setEditingVersionName(e.target.value)}
                                                                    onKeyDown={e => {
                                                                        if (e.key === 'Enter') handleSaveRename(item);
                                                                        if (e.key === 'Escape') cancelRename();
                                                                    }}
                                                                    autoFocus
                                                                    style={{
                                                                        height: '26px', padding: '0 6px', fontSize: '12px',
                                                                        border: '1px solid #16a34a', borderRadius: '4px', outline: 'none', flex: 1, minWidth: 0
                                                                    }}
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSaveRename(item)}
                                                                    disabled={isRenaming}
                                                                    style={{ border: 'none', background: '#16a34a', color: '#fff', borderRadius: '4px', padding: '4px 6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
                                                                    title="저장"
                                                                >
                                                                    <Check size={12} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={cancelRename}
                                                                    style={{ border: 'none', background: '#e2e8f0', color: '#475569', borderRadius: '4px', padding: '4px 6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
                                                                    title="취소"
                                                                >
                                                                    <X size={12} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
                                                                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#16a34a' }}>v{item.versionNumber || item.id}</span>
                                                                <span style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.versionName || item.name}>
                                                                    {item.versionName || item.name}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => startRename(item, e, 'card')}
                                                                    style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: '2px', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
                                                                    title="이름 변경"
                                                                    onMouseOver={e => e.currentTarget.style.color = '#16a34a'}
                                                                    onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}
                                                                >
                                                                    <Pencil size={12} />
                                                                </button>
                                                            </div>
                                                        )}

                                                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                                                            {[
                                                                item.createdBy || userId || '',
                                                                item.createdAt ? String(item.createdAt).slice(5, 16).replace('T', ' ') : '',
                                                                `${item.changedCount ?? 0}행 변경`
                                                            ].filter(Boolean).join(' · ')}
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenRestorePreview(item)}
                                                                disabled={previewLoadingId === (item.id || item.versionNumber)}
                                                                style={{
                                                                    height: '26px', padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: '4px',
                                                                    background: '#ffffff', color: '#334155', fontSize: '12px', cursor: 'pointer', fontWeight: '600',
                                                                    transition: 'all 0.15s'
                                                                }}
                                                                onMouseOver={e => { e.currentTarget.style.background = '#f0faf5'; e.currentTarget.style.borderColor = '#16a34a'; e.currentTarget.style.color = '#15803d'; }}
                                                                onMouseOut={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#334155'; }}
                                                            >
                                                                되돌리기
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div style={{ padding: '20px 0', fontSize: '12.5px', color: '#64748b', textAlign: 'center' }}>
                                                        엑셀 일괄 수정 이력이 없습니다
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    {/* Card 3: XML 덮기 */}
                                    {(() => {
                                        const item = xmlKeptItem;
                                        return (
                                            <div style={{
                                                background: '#ffffff',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '8px',
                                                padding: '12px 14px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between',
                                                minHeight: '110px',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <FileCode size={15} color="#c2410c" />
                                                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#c2410c' }}>XML 덮기</span>
                                                    </div>
                                                </div>

                                                {item ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                                                        {editingVersionId === item.id && editingLocation === 'card' ? (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', width: '100%' }}>
                                                                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#16a34a', flexShrink: 0 }}>v{item.versionNumber || item.id}</span>
                                                                <input
                                                                    type="text"
                                                                    value={editingVersionName}
                                                                    onChange={e => setEditingVersionName(e.target.value)}
                                                                    onKeyDown={e => {
                                                                        if (e.key === 'Enter') handleSaveRename(item);
                                                                        if (e.key === 'Escape') cancelRename();
                                                                    }}
                                                                    autoFocus
                                                                    style={{
                                                                        height: '26px', padding: '0 6px', fontSize: '12px',
                                                                        border: '1px solid #16a34a', borderRadius: '4px', outline: 'none', flex: 1, minWidth: 0
                                                                    }}
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSaveRename(item)}
                                                                    disabled={isRenaming}
                                                                    style={{ border: 'none', background: '#16a34a', color: '#fff', borderRadius: '4px', padding: '4px 6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
                                                                    title="저장"
                                                                >
                                                                    <Check size={12} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={cancelRename}
                                                                    style={{ border: 'none', background: '#e2e8f0', color: '#475569', borderRadius: '4px', padding: '4px 6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
                                                                    title="취소"
                                                                >
                                                                    <X size={12} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
                                                                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#16a34a' }}>v{item.versionNumber || item.id}</span>
                                                                <span style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.versionName || item.name}>
                                                                    {item.versionName || item.name}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => startRename(item, e, 'card')}
                                                                    style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: '2px', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
                                                                    title="이름 변경"
                                                                    onMouseOver={e => e.currentTarget.style.color = '#16a34a'}
                                                                    onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}
                                                                >
                                                                    <Pencil size={12} />
                                                                </button>
                                                            </div>
                                                        )}

                                                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                                                            {[
                                                                item.createdBy || userId || '',
                                                                item.createdAt ? String(item.createdAt).slice(5, 16).replace('T', ' ') : '',
                                                                `${item.changedCount ?? 0}행 변경`
                                                            ].filter(Boolean).join(' · ')}
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenRestorePreview(item)}
                                                                disabled={previewLoadingId === (item.id || item.versionNumber)}
                                                                style={{
                                                                    height: '26px', padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: '4px',
                                                                    background: '#ffffff', color: '#334155', fontSize: '12px', cursor: 'pointer', fontWeight: '600',
                                                                    transition: 'all 0.15s'
                                                                }}
                                                                onMouseOver={e => { e.currentTarget.style.background = '#f0faf5'; e.currentTarget.style.borderColor = '#16a34a'; e.currentTarget.style.color = '#15803d'; }}
                                                                onMouseOut={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#334155'; }}
                                                            >
                                                                되돌리기
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div style={{ padding: '20px 0', fontSize: '12.5px', color: '#64748b', textAlign: 'center' }}>
                                                        XML 가져오기 이력이 없습니다
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* 섹션 2: 전체 이력 목록 테이블 */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#0f172a' }}>
                                        전체 이력
                                    </h4>
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                                        최근 20개의 변경 이력을 최신순으로 제공합니다 (초록색 테두리 띠: 상단 고정 보존 지점)
                                    </span>
                                </div>

                                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '10px 16px', fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>
                                        <span style={{ width: '55px' }}>지점</span>
                                        <span style={{ width: '75px' }}>출처</span>
                                        <span style={{ flex: 1 }}>이름</span>
                                        <span style={{ width: '90px' }}>저장자</span>
                                        <span style={{ width: '120px' }}>일시</span>
                                        <span style={{ width: '65px', textAlign: 'center' }}>변경 행</span>
                                        <span style={{ width: '85px', textAlign: 'right' }}></span>
                                    </div>

                                    <div className="custom-scrollbar" style={{ minHeight: '140px', maxHeight: '190px', overflowY: 'auto' }}>
                                        {isLoadingVersions && (!versions || versions.length === 0) ? (
                                            <div style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '13px' }}>
                                                복원 지점 목록을 불러오는 중...
                                            </div>
                                        ) : !versions || versions.length === 0 ? (
                                            <div style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px' }}>
                                                저장된 복원 지점이 없습니다.
                                            </div>
                                        ) : (
                                            versions.map((point, idx) => {
                                                const isTopCardItem = point.kept === true || point.id === manualKeptItem?.id || point.id === excelKeptItem?.id || point.id === xmlKeptItem?.id;

                                                return (
                                                    <div key={point.id || idx} style={{
                                                        display: 'flex', alignItems: 'center', padding: '9px 16px', borderBottom: '1px solid #f1f5f9',
                                                        fontSize: '13px', color: '#334155',
                                                        borderLeft: isTopCardItem ? '4px solid #16a34a' : '4px solid transparent',
                                                        background: isTopCardItem ? '#fafafa' : '#ffffff'
                                                    }}>

                                                        {/* 지점 번호 (v13 등) */}
                                                        <span style={{ width: '55px', fontWeight: 'bold', color: '#16a34a' }}>
                                                            v{point.versionNumber || point.id}
                                                        </span>

                                                        {/* 출처 배지 */}
                                                        <span style={{ width: '75px', display: 'inline-flex', alignItems: 'center' }}>
                                                            {renderOriginBadge(point.origin)}
                                                        </span>

                                                        {/* 이름 & 배지 */}
                                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', paddingRight: '10px', minWidth: 0 }}>
                                                            {editingVersionId === point.id && editingLocation === 'table' ? (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                                                                    <input
                                                                        type="text"
                                                                        value={editingVersionName}
                                                                        onChange={e => setEditingVersionName(e.target.value)}
                                                                        onKeyDown={e => {
                                                                            if (e.key === 'Enter') handleSaveRename(point);
                                                                            if (e.key === 'Escape') cancelRename();
                                                                        }}
                                                                        autoFocus
                                                                        style={{
                                                                            height: '26px', padding: '0 8px', fontSize: '12px',
                                                                            border: '1px solid #16a34a', borderRadius: '4px', outline: 'none', flex: 1
                                                                        }}
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleSaveRename(point)}
                                                                        disabled={isRenaming}
                                                                        style={{ border: 'none', background: '#16a34a', color: '#fff', borderRadius: '4px', padding: '4px 7px', cursor: 'pointer', fontSize: '11px', display: 'inline-flex', alignItems: 'center' }}
                                                                    >
                                                                        <Check size={13} />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={cancelRename}
                                                                        style={{ border: 'none', background: '#e2e8f0', color: '#475569', borderRadius: '4px', padding: '4px 7px', cursor: 'pointer', fontSize: '11px', display: 'inline-flex', alignItems: 'center' }}
                                                                    >
                                                                        <X size={13} />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
                                                                    <span style={{ fontWeight: '500', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                        {point.versionName || point.name}
                                                                    </span>

                                                                    {/* 최신 배지 / 복원됨 배지 */}
                                                                    {point.kept && String(point.origin).toLowerCase() === 'xml' && (
                                                                        <span style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', fontSize: '11px', fontWeight: 'bold', padding: '1px 6px', borderRadius: '4px' }}>최신 XML</span>
                                                                    )}
                                                                    {point.kept && String(point.origin).toLowerCase() === 'manual' && (
                                                                        <span style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', fontSize: '11px', fontWeight: 'bold', padding: '1px 6px', borderRadius: '4px' }}>최신 수동</span>
                                                                    )}
                                                                    {point.kept && String(point.origin).toLowerCase() === 'excel' && (
                                                                        <span style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', fontSize: '11px', fontWeight: 'bold', padding: '1px 6px', borderRadius: '4px' }}>최신 엑셀</span>
                                                                    )}
                                                                    {point.restoredAt && (
                                                                        <span style={{ background: '#f0faf5', color: '#15803d', border: '1px solid #bbf7d0', fontSize: '11px', fontWeight: 'bold', padding: '1px 6px', borderRadius: '4px' }}>
                                                                            {String(point.restoredAt).length > 5 ? `${String(point.restoredAt).slice(5, 10)} 복원됨` : '복원됨'}
                                                                        </span>
                                                                    )}

                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => startRename(point, e)}
                                                                        style={{ border: 'none', background: 'transparent', color: '#cbd5e1', cursor: 'pointer', padding: '2px', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
                                                                        title="이름 변경"
                                                                        onMouseOver={e => e.currentTarget.style.color = '#16a34a'}
                                                                        onMouseOut={e => e.currentTarget.style.color = '#cbd5e1'}
                                                                    >
                                                                        <Pencil size={12} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* 저장자 */}
                                                        <span style={{ width: '90px', fontSize: '12.5px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={point.createdBy || point.restoredBy || ''}>
                                                            {point.createdBy || point.restoredBy || '—'}
                                                        </span>

                                                        {/* 시각 */}
                                                        <span style={{ width: '120px', fontSize: '12px', color: '#64748b' }}>
                                                            {point.createdAt ? String(point.createdAt).slice(5, 16).replace('T', ' ') : '—'}
                                                        </span>

                                                        {/* 변경 행 */}
                                                        <span style={{ width: '65px', textAlign: 'center', fontSize: '12.5px', color: '#475569' }}>
                                                            {point.changedCount ?? 0}행
                                                        </span>

                                                        {/* 작업 버튼 */}
                                                        <div style={{ width: '85px', textAlign: 'right' }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenRestorePreview(point)}
                                                                disabled={previewLoadingId === (point.id || point.versionNumber)}
                                                                style={{
                                                                    height: '28px', padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: '4px',
                                                                    background: '#ffffff', color: '#334155', fontSize: '12px', cursor: 'pointer', fontWeight: '500',
                                                                    transition: 'all 0.15s'
                                                                }}
                                                                onMouseOver={e => { e.currentTarget.style.background = '#f0faf5'; e.currentTarget.style.borderColor = '#16a34a'; e.currentTarget.style.color = '#15803d'; }}
                                                                onMouseOut={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#334155'; }}
                                                            >
                                                                되돌리기
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* 하단 컴팩트 안내 & 규칙 바 (공간 절약 및 핵심 요약) */}
                            <div style={{
                                background: '#fffbeb',
                                border: '1px solid #fef08a',
                                borderRadius: '6px',
                                padding: '8px 12px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '5px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px', color: '#92400e' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12.5px' }}>
                                        <Info size={14} color="#d97706" style={{ flexShrink: 0 }} />
                                        <span style={{ fontSize: '12.5px' }}>되돌리기 클릭 시 현재 상태는 <strong style={{ fontSize: 'inherit' }}>「안전」 지점</strong>으로 자동 보관되어 언제든 복원할 수 있습니다.</span>
                                    </div>
                                    <span style={{ fontSize: '12px', color: '#b45309', whiteSpace: 'nowrap' }}>※ 삭제된 문항 되살리기는 미리보기에서 확인</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12.5px', color: '#78350f', borderTop: '1px solid #fef3c7', paddingTop: '5px' }}>
                                    <span style={{ fontSize: '12.5px' }}>• <strong style={{ fontSize: 'inherit' }}>방식별 최신:</strong> 수동·엑셀·XML 각 1개 보존</span>
                                    <span style={{ fontSize: '12.5px' }}>• <strong style={{ fontSize: 'inherit' }}>이력 보관:</strong> 최근 최대 20개</span>
                                    <span style={{ fontSize: '12.5px' }}>• <strong style={{ fontSize: 'inherit' }}>빈 지점 방지:</strong> 변경 없으면 미생성</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── 푸터 ── */}
                <div className="variable-modal-footer" style={{ borderTop: 'none', padding: '8px 24px 16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    {activeTab === 3 || activeTab === 2 || (activeTab === 1 && isApplied) ? (
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

                            {activeTab === 1 && (
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

            {/* ── 지점 복원 미리보기 팝업 모달 (디자인 명세 기준) ── */}
            {isPreviewOpen && previewTarget && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1150, background: 'rgba(15, 23, 42, 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '560px', maxWidth: '92vw', background: '#ffffff', borderRadius: '16px', padding: '24px 28px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '90vh', overflowY: 'auto' }} className="custom-scrollbar">

                        {/* 헤더 제목 & 서브타이틀 */}
                        {(() => {
                            const o = String(previewTarget.origin || '').toLowerCase();
                            let originLabel = '보관';
                            if (o === 'manual') originLabel = '수동';
                            else if (o === 'excel') originLabel = '엑셀';
                            else if (o === 'xml') originLabel = 'XML';
                            else if (o === 'safety') originLabel = '안전';

                            const verNum = previewTarget.versionNumber || previewTarget.id;
                            const vName = previewTarget.versionName || previewTarget.name || '';
                            const cBy = previewTarget.createdBy || previewTarget.restoredBy || '';
                            const cAt = previewTarget.createdAt ? String(previewTarget.createdAt).slice(5, 16).replace('T', ' ') : '';
                            const subInfo = [vName, cBy, cAt].filter(Boolean).join(' · ');

                            const targetCount = previewData?.targetCount ?? previewData?.targetVarCount ?? previewTarget?.targetVarCount ?? 649;
                            const currentCount = previewData?.currentCount ?? previewData?.currentVarCount ?? 649;
                            const changedCount = previewData?.changedCount ?? previewData?.wouldChange ?? previewTarget?.changedCount ?? 0;

                            const missingList = previewData?.missing || previewData?.missingItems || previewData?.missingList || [];
                            const missingCount = Array.isArray(missingList) ? missingList.length : (previewData?.missingCount || 0);
                            const addedCount = previewData?.addedCount ?? previewData?.newCount ?? 0;
                            const hasLabels = previewData?.hasLabels ?? previewData?.includesLabels ?? (o === 'xml');
                            const labelVarCount = previewData?.labelVarCount ?? 128;
                            const labelLineCount = previewData?.labelLineCount ?? 1004;

                            return (
                                <>
                                    {/* 1층: 메인 모달 타이틀 (복원 미리보기) */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '30px', height: '30px', borderRadius: '6px', background: '#f0faf5', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                                                <RotateCcw size={16} />
                                            </div>
                                            <h3 style={{ margin: 0, fontSize: '17.5px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.3px' }}>
                                                복원 미리보기
                                            </h3>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setIsPreviewOpen(false)}
                                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>

                                    {/* 2층: 복원 대상 지점 질문 & 설명 서브 카드 */}
                                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#15803d' }}>
                                            v{verNum} ({originLabel}) 으로 되돌릴까요?
                                        </h4>
                                        <p style={{ margin: 0, fontSize: '12.5px', color: '#475569', lineHeight: '1.4' }}>
                                            선택한 지점으로 복원하면 아래와 같이 맵 설정이 변경됩니다.
                                        </p>
                                        {subInfo && (
                                            <span style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                                                — {subInfo}
                                            </span>
                                        )}
                                    </div>

                                    {/* 고대비 선명 컴팩트 수치 카드 그리드 (시선 사로잡는 디자인) */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                                        {/* 카드 1: 복원 지점 문항 */}
                                        <div style={{
                                            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '8px',
                                            padding: '8px 12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                                        }}>
                                            <span style={{ fontSize: '12px', color: '#475569', fontWeight: '600' }}>복원 지점 문항</span>
                                            <span style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>{Number(targetCount || 0).toLocaleString()}<span style={{ fontSize: '12px', fontWeight: '500', marginLeft: '2px', color: '#64748b' }}>개</span></span>
                                        </div>

                                        {/* 카드 2: 현재 맵 문항 */}
                                        <div style={{
                                            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '8px',
                                            padding: '8px 12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                                        }}>
                                            <span style={{ fontSize: '12px', color: '#475569', fontWeight: '600' }}>현재 맵 문항</span>
                                            <span style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>{Number(currentCount || 0).toLocaleString()}<span style={{ fontSize: '12px', fontWeight: '500', marginLeft: '2px', color: '#64748b' }}>개</span></span>
                                        </div>

                                        {/* 카드 3: 변경되는 문항 (시선 강탈 하이라이트) */}
                                        <div style={{
                                            background: changedCount > 0 ? '#fffbeb' : '#f8fafc',
                                            border: `1px solid ${changedCount > 0 ? '#fde68a' : '#cbd5e1'}`,
                                            borderRadius: '8px',
                                            padding: '8px 12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            boxShadow: changedCount > 0 ? '0 1px 3px rgba(217,119,6,0.12)' : '0 1px 2px rgba(0,0,0,0.03)'
                                        }}>
                                            <span style={{ fontSize: '12px', color: changedCount > 0 ? '#b45309' : '#475569', fontWeight: '700' }}>변경되는 문항</span>
                                            <span style={{ fontSize: '17px', fontWeight: '800', color: changedCount > 0 ? '#d97706' : '#0f172a' }}>{Number(changedCount || 0).toLocaleString()}<span style={{ fontSize: '12px', fontWeight: '500', marginLeft: '2px', color: changedCount > 0 ? '#b45309' : '#64748b' }}>개</span></span>
                                        </div>
                                    </div>

                                    {/* 불릿 요약 설명 (단일 통합 안내 박스) */}
                                    {(() => {
                                        const refineRestoreNote = (rawNote) => {
                                            if (!rawNote) return '';
                                            let str = String(rawNote).trim();

                                            // 백엔드 원본 문구 순화 및 자연스러운 문맥 정리
                                            if (str.includes('바뀌는 것이 없습니다') && (str.includes('그 지점') || str.includes('이미'))) {
                                                return '현재 맵 설정과 동일하여 복원 시 변경되는 사항이 없습니다.';
                                            }
                                            if (str.includes('보기를 담지 않았습니다') || (str.includes('이 지점은 보기') && str.includes('그대로입니다'))) {
                                                return '해당 복원 시점에는 보기(코드·라벨) 데이터가 포함되지 않아 현재 보기 설정이 그대로 유지됩니다.';
                                            }

                                            str = str.replace(/지금 맵이 이미 그 지점과 같습니다/g, '현재 맵 설정과 동일합니다');
                                            str = str.replace(/되돌려도 바뀌는 것이 없습니다/g, '복원 시 변경되는 사항이 없습니다');
                                            str = str.replace(/이 지점은 보기를 담지 않았습니다/g, '해당 복원 시점에는 보기(라벨) 데이터가 포함되어 있지 않습니다');
                                            str = str.replace(/되돌려도 보기\(코드·라벨\)는 그대로입니다/g, '현재 보기(코드·라벨) 설정이 그대로 유지됩니다');
                                            str = str.replace(/그 지점/g, '복원 시점');
                                            str = str.replace(/이 지점/g, '해당 복원 시점');
                                            str = str.replace(/선택 지점/g, '복원 선택 시점');

                                            return str;
                                        };

                                        return (
                                            <div style={{
                                                background: '#f8fafc',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '8px',
                                                padding: '12px 16px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '8px'
                                            }}>
                                                {Array.isArray(previewData?.notes) && previewData.notes.length > 0 ? (
                                                    previewData.notes.map((rawNote, idx) => {
                                                        const noteText = refineRestoreNote(rawNote);
                                                        const isWarning = rawNote.includes('바뀌는 것이 없습니다') || rawNote.includes('동일');
                                                        return (
                                                            <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '12.5px', color: isWarning ? '#b45309' : '#334155', fontWeight: isWarning ? '600' : '500', lineHeight: '1.5' }}>
                                                                <span style={{ color: isWarning ? '#d97706' : '#64748b', fontWeight: 'bold' }}>·</span>
                                                                <span>{noteText}</span>
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <>
                                                        {o === 'manual' && (
                                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '12.5px', color: '#334155', lineHeight: '1.5' }}>
                                                                <span style={{ color: '#64748b', fontWeight: 'bold' }}>·</span>
                                                                <span>사용자가 직접 생성한 수동 복원 지점입니다.</span>
                                                            </div>
                                                        )}
                                                        {o === 'excel' && (
                                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '12.5px', color: '#334155', lineHeight: '1.5' }}>
                                                                <span style={{ color: '#64748b', fontWeight: 'bold' }}>·</span>
                                                                <span>엑셀 일괄 수정을 통해 반영된 지점입니다.</span>
                                                            </div>
                                                        )}
                                                        {o === 'xml' && (
                                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '12.5px', color: '#334155', lineHeight: '1.5' }}>
                                                                <span style={{ color: '#64748b', fontWeight: 'bold' }}>·</span>
                                                                <span>XML 파일 가져오기로 생성된 지점입니다.</span>
                                                            </div>
                                                        )}

                                                        {missingCount === 0 ? (
                                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '12.5px', color: '#334155', lineHeight: '1.5' }}>
                                                                <span style={{ color: '#64748b', fontWeight: 'bold' }}>·</span>
                                                                <span>현재 맵 설정과 동일하여 복원 시 변경되는 사항이 없습니다.</span>
                                                            </div>
                                                        ) : (
                                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '12.5px', color: '#be123c', lineHeight: '1.5', fontWeight: '500' }}>
                                                                <span style={{ color: '#e11d48', fontWeight: 'bold' }}>·</span>
                                                                <span>복원 선택 시점 이후 삭제되었던 문항 <strong>{Number(missingCount || 0).toLocaleString()}개</strong>가 있습니다.</span>
                                                            </div>
                                                        )}

                                                        {addedCount > 0 && (
                                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '12.5px', color: '#334155', lineHeight: '1.5' }}>
                                                                <span style={{ color: '#64748b', fontWeight: 'bold' }}>·</span>
                                                                <span>복원 선택 시점 이후 추가된 신규 문항 <strong>{Number(addedCount || 0).toLocaleString()}개</strong>는 복원 후에도 유지됩니다.</span>
                                                            </div>
                                                        )}

                                                        {hasLabels ? (
                                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '12.5px', color: '#334155', lineHeight: '1.5' }}>
                                                                <span style={{ color: '#64748b', fontWeight: 'bold' }}>·</span>
                                                                <span>보기(카테고리 라벨) 정보가 포함된 지점입니다. (문항 {Number(labelVarCount || 0).toLocaleString()}개 · 보기 {Number(labelLineCount || 0).toLocaleString()}줄)</span>
                                                            </div>
                                                        ) : (
                                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '12.5px', color: '#334155', lineHeight: '1.5' }}>
                                                                <span style={{ color: '#64748b', fontWeight: 'bold' }}>·</span>
                                                                <span>해당 복원 시점에는 보기(코드·라벨) 데이터가 포함되지 않아 현재 보기 설정이 그대로 유지됩니다.</span>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    {/* 없어진 문항 (missing) 상세 테이블 & 되살리기 체크박스 */}
                                    {missingCount > 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                                            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>
                                                삭제된 문항 목록 ({Number(missingCount || 0).toLocaleString()}개)
                                            </h4>

                                            {/* 없어진 문항 리스트 상자 */}
                                            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', maxHeight: '120px', overflowY: 'auto' }} className="custom-scrollbar">
                                                {missingList.map((mItem, idx) => {
                                                    const isObj = typeof mItem === 'object' && mItem !== null;
                                                    const sysName = isObj ? (mItem.sysName || mItem.spssName || mItem.name || `item_${idx}`) : String(mItem);
                                                    const label = isObj ? (mItem.label || mItem.title || '') : '';

                                                    return (
                                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', borderBottom: idx < missingList.length - 1 ? '1px solid #f1f5f9' : 'none', fontSize: '12.5px' }}>
                                                            <span style={{ fontWeight: 'bold', color: '#0f172a', width: '120px', flexShrink: 0 }}>{sysName}</span>
                                                            <span style={{ color: '#64748b', flex: 1, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* 되살리기 체크박스 박스 */}
                                            <div style={{ background: '#fffdf0', border: '1px solid #fde68a', borderRadius: '10px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isResurrectChecked}
                                                        onChange={e => setIsResurrectChecked(e.target.checked)}
                                                        style={{ width: '15px', height: '15px', accentColor: '#16a34a', cursor: 'pointer' }}
                                                    />
                                                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a' }}>
                                                        삭제된 문항 {missingCount}개를 다시 복원합니다 (되살리기)
                                                    </span>
                                                </label>
                                                <span style={{ fontSize: '11.5px', color: '#78350f', lineHeight: '1.4', paddingLeft: '23px' }}>
                                                    ※ 체크 시 해당 지점 이후 삭제되었던 문항이 맵에 다시 추가됩니다. (복원 후 자동 삭제되지 않으므로 확인 후 필요 시 선택하세요.)
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </>
                            );
                        })()}

                        {/* 하단 취소 / 되돌리기 버튼 */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px' }}>
                            <button
                                type="button"
                                onClick={() => setIsPreviewOpen(false)}
                                style={{
                                    height: '36px', padding: '0 18px', border: '1px solid #cbd5e1', borderRadius: '6px',
                                    background: '#ffffff', color: '#334155', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                                    transition: 'all 0.15s'
                                }}
                                onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                                onMouseOut={e => e.currentTarget.style.background = '#ffffff'}
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={handleExecuteRestore}
                                disabled={isRestoring}
                                style={{
                                    height: '36px', padding: '0 20px', border: 'none', borderRadius: '6px',
                                    background: isRestoring ? '#cbd5e1' : '#16a34a', color: '#ffffff',
                                    fontSize: '13.5px', fontWeight: '700', cursor: isRestoring ? 'not-allowed' : 'pointer',
                                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                                    boxShadow: isRestoring ? 'none' : '0 1px 3px rgba(22,163,74,0.3)',
                                    transition: 'all 0.15s'
                                }}
                                onMouseOver={e => { if (!isRestoring) e.currentTarget.style.background = '#15803d'; }}
                                onMouseOut={e => { if (!isRestoring) e.currentTarget.style.background = '#16a34a'; }}
                            >
                                {isRestoring ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        <span>되돌리는 중...</span>
                                    </>
                                ) : (
                                    <span>되돌리기</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BatchMapEditModal;
