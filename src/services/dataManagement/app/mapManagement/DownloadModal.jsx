import React, { useState, useEffect, useContext } from 'react';
import { useSelector } from 'react-redux';
import { Download, X, FileText, ChevronDown, ChevronUp, Check, RotateCcw } from 'lucide-react';
import { MapManagementPageApi } from './MapManagementPageApi';
import { modalContext } from "@/components/common/Modal.jsx";
import moment from 'moment';
import './MapManagementPage.css';

const OTHER_FORMAT_OPTIONS = [
    { id: 'crd', token: 'crd', label: '.crd' },
    { id: 'sps', token: 'sps', label: '.sps' },
    { id: 'sps_open', token: 'sps-open', label: '.sps + 오픈', badge: '2개' },
    { id: 'open_excel', token: 'open-excel', label: '오픈만 (Excel)' },
    { id: 'map_txt', token: 'map-txt', label: 'Map.txt' },
    { id: 'stp', token: 'stp', label: '.stp', badge: '2개' }
];

const DownloadModal = ({ isOpen, onClose }) => {
    const { exportData } = MapManagementPageApi();
    const auth = useSelector((store) => store.auth);
    const modal = useContext(modalContext);

    const [isAccordionOpen, setIsAccordionOpen] = useState(false);
    const [selectedFormats, setSelectedFormats] = useState([]);
    const [downloading, setDownloading] = useState(false);
    const [downloadingSav, setDownloadingSav] = useState(false);

    // 팝업이 닫히거나 상태가 변경될 때 선택 항목 및 토글 초기화
    useEffect(() => {
        if (!isOpen) {
            setSelectedFormats([]);
            setIsAccordionOpen(false);
        }
    }, [isOpen]);

    const handleCloseModal = () => {
        setSelectedFormats([]);
        setIsAccordionOpen(false);
        if (onClose) onClose();
    };

    if (!isOpen) return null;

    const toggleFormat = (id) => {
        setSelectedFormats(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleReset = () => {
        setSelectedFormats([]);
    };

    /**
     * API 호출 - gb 토큰 1개 또는 콤마 나열 방식 (예: "sav" 또는 "crd,sps")
     */
    const executeExport = async (gbParam) => {
        if (!gbParam) return;

        try {
            const pn = sessionStorage.getItem('merge_pn') || sessionStorage.getItem('projectnum') || '';
            const userId = auth?.user?.userId || '';

            if (!pn) {
                modal.showErrorAlert("알림", "프로젝트 정보를 찾을 수 없습니다.");
                return;
            }

            const payload = {
                pn: pn,
                gb: gbParam,
                answerStateCode: "4", // API 명세: answerStateCode (완료만)
                user: userId
            };

            const res = await exportData.mutateAsync(payload);

            // Blob 응답 파싱 (Axios response 객체 또는 Blob)
            const blob = res?.data instanceof Blob ? res.data : (res instanceof Blob ? res : null);

            if (!blob) {
                modal.showErrorAlert("에러", "파일을 생성하지 못했습니다.");
                return;
            }

            // JSON 오류 응답이 Blob 형태로 온 경우 처리
            if (blob.type?.includes("application/json")) {
                const text = await blob.text();
                let msg = "다운로드 요청이 거부되었습니다.";
                try {
                    const parsed = JSON.parse(text);
                    if (parsed.message) msg = parsed.message;
                } catch (e) { }
                modal.showErrorAlert("에러", msg);
                return;
            }

            // 응답 헤더의 Content-Disposition 에서 파일명 추출 시도
            let filename = '';
            const disposition = res?.headers?.['content-disposition'] || res?.headers?.['Content-Disposition'];
            if (disposition && disposition.includes('filename=')) {
                const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (match && match[1]) {
                    filename = match[1].replace(/['"]/g, '');
                }
            }

            // 헤더 파일명이 없는 경우 명세에 맞는 Fallback 파일명 생성
            if (!filename) {
                const timestamp = moment().format("YYYYMMDDHHmmss");
                if (gbParam === 'sav') {
                    filename = `${pn}_Data_${timestamp}.sav`;
                } else if (gbParam.includes(',')) {
                    filename = `${pn}_Export_${timestamp}.zip`;
                } else if (gbParam === 'crd') {
                    filename = `${pn}.crd`;
                } else if (gbParam === 'sps') {
                    filename = `${pn}.sps`;
                } else if (gbParam === 'sps-open') {
                    filename = `${pn}_openText.zip`;
                } else if (gbParam === 'open-excel') {
                    filename = `${pn}_${timestamp}.XLSX`;
                } else if (gbParam === 'map-txt') {
                    filename = `${pn}Map.txt`;
                } else if (gbParam === 'stp') {
                    filename = `${pn}_stp.zip`;
                } else {
                    filename = `${pn}_Export_${timestamp}.zip`;
                }
            }

            // 브라우저 파일 다운로드 트리거
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Export error:", error);
            modal.showErrorAlert("에러", "다운로드 요청 처리 중 오류가 발생했습니다.");
        }
    };

    /** SPSS (.sav) 단독 다운로드 */
    const handleDownloadSav = async () => {
        if (downloadingSav || downloading) return;
        setDownloadingSav(true);
        try {
            await executeExport('sav');
        } finally {
            setDownloadingSav(false);
        }
    };

    /** 선택된 다른 형식들 다중 다운로드 (콤마 조인 토큰 전송: 예 "crd,sps") */
    const handleBulkDownload = async () => {
        if (selectedFormats.length === 0 || downloading || downloadingSav) return;

        setDownloading(true);
        try {
            // 선택된 ID들을 API 명세 토큰으로 변환 (crd, sps, sps-open, open-excel, map-txt, stp)
            const tokens = selectedFormats
                .map(id => OTHER_FORMAT_OPTIONS.find(opt => opt.id === id)?.token)
                .filter(Boolean);

            const gbParam = tokens.join(',');
            await executeExport(gbParam);
        } finally {
            setDownloading(false);
        }
    };

    const getGeneratedFileCount = () => {
        let count = 0;
        selectedFormats.forEach(id => {
            if (id === 'sps_open' || id === 'stp') count += 2;
            else count += 1;
        });
        return count;
    };

    const renderSummaryBox = () => {
        if (selectedFormats.length === 0) return null;

        const currentPn = sessionStorage.getItem('merge_pn') || sessionStorage.getItem('projectnum') || '{pn}';

        let generatedFiles = [];
        selectedFormats.forEach(id => {
            if (id === 'crd') generatedFiles.push(`${currentPn}.crd`);
            else if (id === 'sps') generatedFiles.push(`${currentPn}.sps`);
            else if (id === 'sps_open') {
                generatedFiles.push(`${currentPn}_Open.sps`);
                generatedFiles.push(`${currentPn}_openText.sps`);
            }
            else if (id === 'open_excel') generatedFiles.push(`${currentPn}_{일시}.XLSX`);
            else if (id === 'map_txt') generatedFiles.push(`${currentPn}Map.txt`);
            else if (id === 'stp') {
                generatedFiles.push(`${currentPn}.stp`);
                generatedFiles.push(`table_${currentPn}.stp`);
            }
        });

        const totalCount = generatedFiles.length;

        if (totalCount === 1) {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '12px', color: '#475569' }}>단일 파일로 내려옵니다.</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{generatedFiles[0]}</div>
                </div>
            );
        }

        let zipName = `${currentPn}_Export_{일시}.zip`;
        if (selectedFormats.length === 1 && selectedFormats[0] === 'sps_open') {
            zipName = `${currentPn}_openText.zip`;
        } else if (selectedFormats.length === 1 && selectedFormats[0] === 'stp') {
            zipName = `${currentPn}_stp.zip`;
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ fontSize: '12px', color: '#475569' }}>
                    선택된 {totalCount}개 파일이 ZIP으로 압축되어 내려옵니다.
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#16a34a' }}>
                    {zipName}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '11px' }}>└</span>
                    <span>{generatedFiles.join('  ·  ')}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="variable-modal-overlay">
            <div className="variable-modal-content download-modal-content" style={{ width: '480px' }}>
                {/* 1. Standard Header */}
                <div className="variable-modal-header">
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{
                            width: '4px',
                            height: '18px',
                            backgroundColor: '#16a34a',
                            borderRadius: '4px',
                            marginRight: '8px'
                        }}></div>
                        <h3 className="variable-modal-title">다운로드</h3>
                    </div>
                    <button onClick={handleCloseModal} className="variable-modal-close"><X size={20} /></button>
                </div>

                {/* 2. Body */}
                <div className="variable-modal-body" style={{ padding: '24px' }}>
                    <p className="download-modal-desc" style={{ fontSize: '13px', color: '#64748b', marginTop: 0, marginBottom: '16px' }}>
                        원하는 형식의 파일을 선택하여 다운로드하세요.
                    </p>

                    {/* 3. Primary Top Highlight Card: SPSS 데이터 (.sav) */}
                    <div
                        className="dm-tactile-card"
                        onClick={handleDownloadSav}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: '#f0faf5',
                            border: '1.5px solid #16a34a',
                            borderRadius: '12px',
                            padding: '14px 16px',
                            cursor: (downloadingSav || downloading) ? 'wait' : 'pointer',
                            marginBottom: '20px',
                            boxShadow: '0 2px 8px rgba(22, 163, 74, 0.08)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e6f7ed'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f0faf5'}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '10px',
                                backgroundColor: '#ffffff',
                                border: '1px solid #bbf7d0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#16a34a'
                            }}>
                                <FileText size={20} />
                            </div>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                                    SPSS 데이터 (.sav)
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                    통계 분석용 표준 파일
                                </div>
                            </div>
                        </div>
                        <button
                            type="button"
                            className="dm-tactile-btn"
                            disabled={downloadingSav || downloading}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadSav();
                            }}
                            style={{
                                padding: '7px 14px',
                                borderRadius: '8px',
                                backgroundColor: (downloadingSav || downloading) ? '#cbd5e1' : '#16a34a',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                color: '#ffffff',
                                fontSize: '12px',
                                fontWeight: 700,
                                boxShadow: (downloadingSav || downloading) ? 'none' : '0 2px 6px rgba(22, 163, 74, 0.25)',
                                cursor: (downloadingSav || downloading) ? 'wait' : 'pointer'
                            }}
                        >
                            <span>{downloadingSav ? '다운로드 중...' : '바로 받기'}</span>
                            <Download size={13} />
                        </button>
                    </div>

                    {/* 4. Accordion Toggle Header: 다른 형식으로 받기 + Reset Link + Green Badge Count */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '12px',
                            userSelect: 'none'
                        }}
                    >
                        {/* <div
                            onClick={() => setIsAccordionOpen(!isAccordionOpen)}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#475569', cursor: 'pointer', flex: 1 }}
                        >
                            {isAccordionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            <span>다른 형식으로 받기 (다중 선택 가능)</span>
                            {isAccordionOpen && selectedFormats.length > 0 && (
                                <span style={{
                                    backgroundColor: '#16a34a',
                                    color: '#ffffff',
                                    borderRadius: '50%',
                                    width: '20px',
                                    height: '20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    marginLeft: '2px'
                                }}>
                                    {getGeneratedFileCount()}
                                </span>
                            )}
                        </div> */}

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isAccordionOpen && selectedFormats.length > 0 && (
                                <button
                                    type="button"
                                    className="dm-tactile-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleReset();
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '3px 8px',
                                        borderRadius: '6px',
                                        border: '1px solid #cbd5e1',
                                        backgroundColor: '#ffffff',
                                        color: '#475569',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
                                    }}
                                >
                                    <RotateCcw size={11} />
                                    <span>초기화</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 5. Collapsible Grid & Summary Box & Footer Buttons */}
                    {isAccordionOpen && (
                        <div>
                            {/* 2-Column Grid */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '8px',
                                marginBottom: '12px'
                            }}>
                                {OTHER_FORMAT_OPTIONS.map((item) => {
                                    const isChecked = selectedFormats.includes(item.id);
                                    return (
                                        <div
                                            key={item.id}
                                            className="dm-tactile-card"
                                            onClick={() => toggleFormat(item.id)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '10px 12px',
                                                borderRadius: '8px',
                                                border: isChecked ? '1.5px solid #16a34a' : '1px solid #e2e8f0',
                                                backgroundColor: isChecked ? '#f0faf5' : '#ffffff',
                                                cursor: 'pointer',
                                                userSelect: 'none'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {/* Checkbox */}
                                                <div style={{
                                                    width: '16px',
                                                    height: '16px',
                                                    borderRadius: '4px',
                                                    border: isChecked ? '1.5px solid #16a34a' : '1.5px solid #cbd5e1',
                                                    backgroundColor: isChecked ? '#16a34a' : '#ffffff',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    boxSizing: 'border-box'
                                                }}>
                                                    {isChecked && <Check size={12} color="#ffffff" strokeWidth={3} />}
                                                </div>
                                                <span style={{ fontSize: '13px', fontWeight: 600, color: isChecked ? '#15803d' : '#1e293b' }}>
                                                    {item.label}
                                                </span>
                                            </div>
                                            {item.badge && (
                                                <span style={{
                                                    fontSize: '11px',
                                                    fontWeight: 600,
                                                    color: '#64748b',
                                                    backgroundColor: '#f1f5f9',
                                                    borderRadius: '10px',
                                                    padding: '1px 7px'
                                                }}>
                                                    {item.badge}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Dynamic Selection Summary Box (Only when formats are selected) */}
                            {selectedFormats.length > 0 && (
                                <div style={{
                                    backgroundColor: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    padding: '12px 14px',
                                    minHeight: '52px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    boxSizing: 'border-box',
                                    marginBottom: '20px'
                                }}>
                                    {renderSummaryBox()}
                                </div>
                            )}

                            {/* 6. Footer Buttons */}
                            <div className="variable-modal-footer" style={{ marginTop: 0, padding: 0, borderTop: 'none', display: 'flex' }}>
                                <button
                                    type="button"
                                    className="dm-tactile-btn"
                                    onClick={handleBulkDownload}
                                    disabled={selectedFormats.length === 0 || downloading}
                                    style={{
                                        width: '100%',
                                        height: '44px',
                                        fontSize: '14px',
                                        fontWeight: 700,
                                        borderRadius: '8px',
                                        border: 'none',
                                        backgroundColor: selectedFormats.length > 0 && !downloading ? '#16a34a' : '#cbd5e1',
                                        color: '#ffffff',
                                        cursor: selectedFormats.length > 0 && !downloading ? 'pointer' : 'not-allowed',
                                        boxShadow: selectedFormats.length > 0 && !downloading ? '0 2px 6px rgba(22, 163, 74, 0.25)' : 'none'
                                    }}
                                >
                                    {downloading ? '다운로드 중...' : (
                                        selectedFormats.length > 0
                                            ? (getGeneratedFileCount() === 1
                                                ? '선택한 1개 파일 다운로드'
                                                : `선택한 ${getGeneratedFileCount()}개 파일 ZIP 다운로드`)
                                            : '다운로드'
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DownloadModal;

