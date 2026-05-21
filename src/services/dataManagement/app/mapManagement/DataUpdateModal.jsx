import React, { useRef, useState, useContext } from 'react';
import { UploadCloud, X, Info, RefreshCw, Check, AlertTriangle } from 'lucide-react';
import { modalContext } from "@/components/common/Modal.jsx";
import { useSelector } from 'react-redux';
import { MapManagementPageApi } from './MapManagementPageApi';
import './MapManagementPage.css';

const DataUpdateModal = ({ isOpen, onClose, refreshData }) => {
    const fileInputRef = useRef(null);
    const modal = useContext(modalContext);
    const { updateDataFromSav, uploadSpss } = MapManagementPageApi();
    const auth = useSelector((store) => store.auth);

    const [selectedFile, setSelectedFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [activeTab, setActiveTab] = useState('update'); // 'update' | 'replace'

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
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
            if (fileInputRef.current) {
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(e.dataTransfer.files[0]);
                fileInputRef.current.files = dataTransfer.files;
            }
        }
    };

    const handleUploadSubmitOriginal = async () => {
        if (!selectedFile) {
            modal.showErrorAlert("알림", "업데이트할 파일을 선택해주세요.");
            return;
        }

        // 확장자 확인 (.sav)
        const fileName = selectedFile.name.toLowerCase();
        if (!fileName.endsWith('.sav')) {
            modal.showErrorAlert("알림", ".sav 형식의 파일만 업데이트할 수 있습니다.");
            return;
        }

        const pn = sessionStorage.getItem('merge_pn') || sessionStorage.getItem('projectnum');
        const projectName = sessionStorage.getItem('projectname');
        const userId = auth?.user?.userId || '';

        if (!pn) {
            modal.showErrorAlert("알림", "프로젝트 정보를 찾을 수 없습니다.");
            return;
        }

        modal.showConfirm("알림", "불러오기 완료 시 기존 내용으로의 복구가 절대 불가능하므로 \n 신중히 확인해 주세요.\n 데이터 불러오기를 계속 진행하시겠습니까?", {
            btns: [
                { title: "취소", click: () => { } },
                {
                    title: "시작",
                    click: async () => {
                        const formData = new FormData();
                        formData.append("pn", pn);
                        formData.append("file", selectedFile);
                        if (userId) formData.append("user", userId);

                        try {
                            const res = await updateDataFromSav.mutateAsync(formData);

                            if (res?.success === "777") {
                                // 1. 성공 시 팝업 닫기
                                handleModalClose();
                                // 2. 알림 메시지 띄우기 (확인 버튼 누를 때까지 대기)
                                await modal.showAlert("알림", "데이터 불러오기 처리가 완료되었습니다.", { zIndex: 99999 });
                                // 3. 맵 구성 조회 API 태우기 (재조회)
                                if (refreshData) refreshData();
                            } else if (res?.success === "907") {
                                let duplicatePids = [
                                    "중복PID값1",
                                    "중복PID값2",
                                    "중복PID값3"
                                ];
                                if (res?.resultjson && Array.isArray(res.resultjson)) {
                                    duplicatePids = res.resultjson;
                                }
                                const pidsText = duplicatePids.length > 0 ? ` (중복된 PID: ${duplicatePids.join(", ")})` : "";

                                modal.showErrorAlert("에러", (res?.message || "SAV 파일 내에 중복된 고유 식별자(PID)가 존재하여 업데이트가 중단되었습니다.") + "\n" + pidsText, { zIndex: 99999 });
                            } else if (res?.success === "909") {
                                let errorDetails = res?.message || "SAV 파일과 프로젝트 맵(Map) 구조가 일치하지 않아 데이터 오염 방지를 위해 업데이트가 거부되었습니다.";
                                if (res?.resultjson) {
                                    const { missingInDb, missingInSav } = res.resultjson;
                                    if (missingInDb && missingInDb.length > 0) {
                                        errorDetails += `\n\n[SAV에만 존재하는 문항]:\n${missingInDb.join(", ")}`;
                                    }
                                    if (missingInSav && missingInSav.length > 0) {
                                        errorDetails += `\n\n[DB(맵 구성)에만 선언되어 있는 문항]:\n${missingInSav.join(", ")}`;
                                    }
                                }
                                modal.showErrorAlert("구조 불일치 에러", errorDetails, { zIndex: 99999 });
                            } else {
                                const errorMsg = res?.errortext || res?.message || "데이터 불러오기 중 오류가 발생했습니다.";
                                modal.showErrorAlert("에러", errorMsg, { zIndex: 99999 });
                            }
                        } catch (error) {
                            console.error("Update error:", error);
                            modal.showErrorAlert("에러", "데이터 불러오기 요청 중 오류가 발생했습니다.", { zIndex: 99999 });
                        }
                    }
                }
            ]
        });
    };

    const handleReplaceSubmit = async () => {
        const pn = sessionStorage.getItem('merge_pn') || sessionStorage.getItem('projectnum');
        const projectName = sessionStorage.getItem('projectname');
        const userId = auth?.user?.userId || '';

        if (!pn) {
            modal.showErrorAlert("알림", "프로젝트 정보를 찾을 수 없습니다.");
            return;
        }

        modal.showConfirm("알림", "교체(업로드) 완료 시 기존 내용으로의 복구가 절대 불가능하며,\n기존의 모든 맵 구성과 데이터가 삭제되고 덮어씌워집니다.\n계속 진행하시겠습니까?", {
            btns: [
                { title: "취소", click: () => { } },
                {
                    title: "시작",
                    click: async () => {
                        const formData = new FormData();
                        formData.append("pn", pn);
                        formData.append("file", selectedFile);
                        formData.append("gb", "spss");
                        if (projectName) {
                            formData.append("projectName", projectName);
                        }
                        if (userId) {
                            formData.append("user", userId);
                        }

                        try {
                            const res = await uploadSpss.mutateAsync(formData);

                            if (res?.success === "777") {
                                handleModalClose();
                                await modal.showAlert("알림", "파일 교체(업로드)가 완료되었습니다.", { zIndex: 99999 });
                                if (refreshData) refreshData();
                            } else {
                                const errorMsg = res?.errortext || res?.message || "파일 교체 중 오류가 발생했습니다.";
                                modal.showErrorAlert("에러", errorMsg, { zIndex: 99999 });
                            }
                        } catch (error) {
                            console.error("Replace error:", error);
                            modal.showErrorAlert("에러", "파일 교체 요청 중 오류가 발생했습니다.", { zIndex: 99999 });
                        }
                    }
                }
            ]
        });
    };

    const handleUploadSubmit = async () => {
        if (!selectedFile) {
            modal.showErrorAlert("알림", activeTab === 'update' ? "업데이트할 파일을 선택해주세요." : "교체할 파일을 선택해주세요.");
            return;
        }

        const fileName = selectedFile.name.toLowerCase();
        if (!fileName.endsWith('.sav')) {
            modal.showErrorAlert("알림", ".sav 형식의 파일만 업로드할 수 있습니다.");
            return;
        }

        if (activeTab === 'update') {
            await handleUploadSubmitOriginal();
        } else {
            await handleReplaceSubmit();
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
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleModalClose = () => {
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
        onClose();
    };

    return (
        <div className="variable-modal-overlay">
            <div className="variable-modal-content download-modal-content upload-modal-content">
                <div className="variable-modal-header">
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{
                            width: '4px',
                            height: '18px',
                            backgroundColor: '#16a34a',
                            borderRadius: '4px',
                            marginRight: '8px'
                        }}></div>
                        <h3 className="variable-modal-title">데이터 등록</h3>
                    </div>
                    <button onClick={handleModalClose} className="variable-modal-close"><X size={20} /></button>
                </div>

                <div className="variable-modal-body" style={{ padding: '24px' }}>

                    {/* 탭 헤더 */}
                    <div style={{
                        display: 'flex',
                        background: '#f8fafc',
                        padding: '6px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        gap: '8px',
                        border: '1px solid #e2e8f0',
                    }}>
                        <button
                            onClick={() => {
                                setActiveTab('update');
                                setSelectedFile(null);
                                if (fileInputRef.current) fileInputRef.current.value = "";
                            }}
                            style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                padding: '10px 12px',
                                borderRadius: '6px',
                                border: activeTab === 'update' ? '1px solid #16a34a' : '1px solid transparent',
                                background: activeTab === 'update' ? '#ffffff' : 'transparent',
                                color: activeTab === 'update' ? '#16a34a' : '#64748b',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '600',
                                transition: 'all 0.2s',
                                boxShadow: activeTab === 'update' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                            }}
                        >
                            <RefreshCw size={13} style={{ color: activeTab === 'update' ? '#16a34a' : '#64748b' }} />
                            <span>SAV 최초등록 / 업데이트</span>
                            <span style={{
                                background: activeTab === 'update' ? '#dcfce7' : '#f1f5f9',
                                color: activeTab === 'update' ? '#15803d' : '#64748b',
                                padding: '2px 6px',
                                borderRadius: '12px',
                                fontSize: '10px',
                                fontWeight: '500',
                            }}>
                                PID 기준
                            </span>
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab('replace');
                                setSelectedFile(null);
                                if (fileInputRef.current) fileInputRef.current.value = "";
                            }}
                            style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                padding: '10px 12px',
                                borderRadius: '6px',
                                border: activeTab === 'replace' ? '1px solid #d97706' : '1px solid transparent',
                                background: activeTab === 'replace' ? '#ffffff' : 'transparent',
                                color: activeTab === 'replace' ? '#d97706' : '#64748b',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '600',
                                transition: 'all 0.2s',
                                boxShadow: activeTab === 'replace' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                            }}
                        >
                            <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '13px', lineHeight: 1 }}>⇅</span>
                            <span>SAV 교체</span>
                            <span style={{
                                background: activeTab === 'replace' ? '#fef3c7' : '#f1f5f9',
                                color: activeTab === 'replace' ? '#d97706' : '#64748b',
                                padding: '2px 6px',
                                borderRadius: '12px',
                                fontSize: '10px',
                                fontWeight: '500',
                            }}>
                                전체 덮어씀
                            </span>
                        </button>
                    </div>

                    {/* 데이터 불러오기 주의사항 (상단) - 테이블 형식 */}
                    {activeTab === 'update' ? (
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
                                fontFamily: 'inherit',
                                fontSize: '13px',
                            }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <th style={{
                                            width: '100px',
                                            background: '#f4fbf7',
                                            color: '#344054',
                                            fontWeight: '600',
                                            padding: '10px 16px',
                                            textAlign: 'left',
                                            borderRight: '1px solid #e2e8f0',
                                            fontSize: '12px',
                                            borderTop: '3px solid #16a34a',
                                        }}>
                                            항목
                                        </th>
                                        <th style={{
                                            background: '#f4fbf7',
                                            color: '#344054',
                                            fontWeight: '600',
                                            padding: '10px 16px',
                                            textAlign: 'left',
                                            fontSize: '12px',
                                            borderTop: '3px solid #16a34a',
                                        }}>
                                            SAV 최초등록 / 업데이트
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={{
                                            background: '#f4fbf7',
                                            color: '#344054',
                                            fontWeight: '600',
                                            padding: '14px 16px',
                                            borderRight: '1px solid #e2e8f0',
                                            verticalAlign: 'middle',
                                        }}>
                                            PID
                                        </td>
                                        <td style={{
                                            padding: '14px 16px',
                                            background: '#fff',
                                            color: '#344054',
                                            verticalAlign: 'middle',
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                                <span>기존 PID 기준으로 행 매칭</span>
                                                <div style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    background: '#f0fdf4',
                                                    border: '1px solid #bbf7d0',
                                                    color: '#16a34a',
                                                    padding: '2px 8px',
                                                    borderRadius: '20px',
                                                    fontSize: '11px',
                                                    fontWeight: '500',
                                                }}>
                                                    유지+추가
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={{
                                            background: '#f4fbf7',
                                            color: '#344054',
                                            fontWeight: '600',
                                            padding: '14px 16px',
                                            borderRight: '1px solid #e2e8f0',
                                            verticalAlign: 'middle',
                                        }}>
                                            맵(MAP)
                                        </td>
                                        <td style={{
                                            padding: '14px 16px',
                                            background: '#fff',
                                            color: '#b45309',
                                            verticalAlign: 'middle',
                                        }}>
                                            <span>기존 맵 유지 · 새파일맵 ≠ 기존맵 ⇒ 업데이트 불가</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style={{
                                            background: '#f4fbf7',
                                            color: '#344054',
                                            fontWeight: '600',
                                            padding: '14px 16px',
                                            borderRight: '1px solid #e2e8f0',
                                            verticalAlign: 'middle',
                                        }}>
                                            기존 데이터
                                        </td>
                                        <td style={{
                                            padding: '14px 16px',
                                            background: '#fff',
                                            color: '#344054',
                                            verticalAlign: 'middle',
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                                <span>PID 없는 행 원본 유지</span>
                                                <div style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    background: '#eff6ff',
                                                    border: '1px solid #bfdbfe',
                                                    color: '#2563eb',
                                                    padding: '2px 8px',
                                                    borderRadius: '20px',
                                                    fontSize: '11px',
                                                    fontWeight: '500',
                                                }}>
                                                    데이터 업데이트
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div>
                            {/* 기존 데이터와 맵이 모두 삭제됩니다 경고 */}
                            <div style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                borderRadius: '8px',
                                padding: '12px 16px',
                                marginBottom: '16px',
                                fontSize: '13px',
                                color: '#991b1b',
                            }}>
                                <AlertTriangle size={15} style={{ color: '#ef4444', flexShrink: 0 }} />
                                <span>
                                    기존 데이터와 맵이 <strong style={{ fontWeight: '700', color: '#dc2626' }}>모두 삭제</strong>됩니다. 업로드 즉시 <strong style={{ fontWeight: '700', color: '#dc2626' }}>복구가 불가능</strong>합니다.
                                </span>
                            </div>

                            {/* 테이블 형식 */}
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
                                    fontFamily: 'inherit',
                                    fontSize: '13px',
                                }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <th style={{
                                                width: '100px',
                                                background: '#fffbeb',
                                                color: '#344054',
                                                fontWeight: '600',
                                                padding: '10px 16px',
                                                textAlign: 'left',
                                                borderRight: '1px solid #e2e8f0',
                                                fontSize: '12px',
                                                borderTop: '3px solid #f59e0b',
                                            }}>
                                                항목
                                            </th>
                                            <th style={{
                                                background: '#fffbeb',
                                                color: '#344054',
                                                fontWeight: '600',
                                                padding: '10px 16px',
                                                textAlign: 'left',
                                                fontSize: '12px',
                                                borderTop: '3px solid #f59e0b',
                                            }}>
                                                SAV 교체
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <td style={{
                                                background: '#fffbeb',
                                                color: '#344054',
                                                fontWeight: '600',
                                                padding: '14px 16px',
                                                borderRight: '1px solid #e2e8f0',
                                                verticalAlign: 'middle',
                                            }}>
                                                PID
                                            </td>
                                            <td style={{
                                                padding: '14px 16px',
                                                background: '#fff',
                                                color: '#344054',
                                                verticalAlign: 'middle',
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                                    <span>새 파일 PID로 전면 교체</span>
                                                    <div style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        background: '#fee2e2',
                                                        border: '1px solid #fecaca',
                                                        color: '#ef4444',
                                                        padding: '2px 8px',
                                                        borderRadius: '20px',
                                                        fontSize: '11px',
                                                        fontWeight: '500',
                                                    }}>
                                                        복구 불가
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <td style={{
                                                background: '#fffbeb',
                                                color: '#344054',
                                                fontWeight: '600',
                                                padding: '14px 16px',
                                                borderRight: '1px solid #e2e8f0',
                                                verticalAlign: 'middle',
                                            }}>
                                                맵(MAP)
                                            </td>
                                            <td style={{
                                                padding: '14px 16px',
                                                background: '#fff',
                                                color: '#344054',
                                                verticalAlign: 'middle',
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                                    <span>새 파일 기준 맵 전체 교체</span>
                                                    <div style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        background: '#fee2e2',
                                                        border: '1px solid #fecaca',
                                                        color: '#ef4444',
                                                        padding: '2px 8px',
                                                        borderRadius: '20px',
                                                        fontSize: '11px',
                                                        fontWeight: '500',
                                                    }}>
                                                        복구 불가
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style={{
                                                background: '#fffbeb',
                                                color: '#344054',
                                                fontWeight: '600',
                                                padding: '14px 16px',
                                                borderRight: '1px solid #e2e8f0',
                                                verticalAlign: 'middle',
                                            }}>
                                                기존 데이터
                                            </td>
                                            <td style={{
                                                padding: '14px 16px',
                                                background: '#fff',
                                                color: '#ef4444',
                                                verticalAlign: 'middle',
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                                    <span>전체 삭제됨</span>
                                                    <div style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        background: '#fee2e2',
                                                        border: '1px solid #fecaca',
                                                        color: '#ef4444',
                                                        padding: '2px 8px',
                                                        borderRadius: '20px',
                                                        fontSize: '11px',
                                                        fontWeight: '500',
                                                    }}>
                                                        복구 불가
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* 드래그 앤 드롭 영역 */}
                    <div
                        className={`upload-drag-area ${isDragging ? 'dragging' : ''}`}
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onDrop={onDrop}
                        onClick={handleFileSelectClick}
                    >
                        <div className="upload-drag-icon">
                            <UploadCloud size={24} />
                        </div>
                        <p className="upload-drag-text">
                            여기에 파일을 끌어다 놓거나 클릭하여 선택하세요
                        </p>
                        <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', fontWeight: 'normal', margin: '6px 0 0 0' }}>
                            ※ SPSS 파일(.sav) 형식만 지원합니다.
                        </p>
                    </div>

                    {/* 파일 선택 버튼 & 파일명 표시 영역 */}
                    <div className="upload-file-display-area">
                        <button
                            className="upload-file-btn"
                            onClick={handleFileSelectClick}
                        >
                            파일 선택
                        </button>
                        <div className={`upload-file-name ${selectedFile ? 'has-file' : ''}`}>
                            {selectedFile ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '8px' }}>
                                        {selectedFile.name}
                                    </span>
                                    <button
                                        className="upload-file-clear-btn"
                                        onClick={handleClearFile}
                                        style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: '2px' }}
                                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                        onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : '선택된 파일이 없습니다'}
                        </div>
                    </div>


                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                        accept=".sav"
                    />
                </div>

                <div className="variable-modal-footer" style={{ borderTop: 'none', padding: '0 24px 24px 24px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button className="upload-cancel-btn" onClick={handleModalClose}>
                        취소
                    </button>
                    <button
                        className="upload-submit-btn"
                        onClick={handleUploadSubmit}
                        disabled={!selectedFile}
                        style={{
                            backgroundColor: !selectedFile
                                ? '#cbd5e1'
                                : (activeTab === 'update' ? '#16a34a' : '#f59e0b'),
                            cursor: !selectedFile ? 'not-allowed' : 'pointer',
                            opacity: !selectedFile ? 0.6 : 1,
                        }}
                    >
                        {activeTab === 'update' ? '업데이트 시작' : '⇅ 교체 시작'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DataUpdateModal;
