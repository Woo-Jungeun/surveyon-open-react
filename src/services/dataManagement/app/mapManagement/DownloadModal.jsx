import React, { useState, useEffect, useContext } from 'react';
import { useSelector } from 'react-redux';
import { Download, X, FileText, ChevronDown, ChevronUp, Check, RotateCcw, Monitor } from 'lucide-react';
import { MapManagementPageApi } from './MapManagementPageApi';
import { modalContext } from "@/components/common/Modal.jsx";
import moment from 'moment';
import * as signalR from "@microsoft/signalr";
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

    // Export Progress Bar Modal State (matching screenshots UI)
    const [exportProgress, setExportProgress] = useState({
        isExporting: false,
        percent: 0,
        step: 1, // 1: 준비, 2: 파일 생성, 3: 압축 · 전송
        statusText: '',
        isCompleted: false,
        fileBlob: null,
        filename: ''
    });

    // 팝업이 닫히거나 상태가 변경될 때 선택 항목 및 토글 초기화
    useEffect(() => {
        if (!isOpen) {
            setSelectedFormats([]);
            setIsAccordionOpen(false);
            setExportProgress({
                isExporting: false,
                percent: 0,
                step: 1,
                statusText: '',
                isCompleted: false,
                fileBlob: null,
                filename: ''
            });
        }
    }, [isOpen]);

    const handleCloseModal = () => {
        setSelectedFormats([]);
        setIsAccordionOpen(false);
        setExportProgress({
            isExporting: false,
            percent: 0,
            step: 1,
            statusText: '',
            isCompleted: false,
            fileBlob: null,
            filename: ''
        });
        if (onClose) onClose();
    };

    const getFileListForGb = (gbParam) => {
        if (!gbParam) return ['Export File'];
        const tokens = gbParam.split(',').map(s => s.trim()).filter(Boolean);
        const files = [];

        tokens.forEach(tok => {
            if (tok === 'sav') files.push('SAV 데이터');
            else if (tok === 'crd') files.push('CRD');
            else if (tok === 'sps') files.push('SPS');
            else if (tok === 'sps-open') {
                files.push('SPS');
                files.push('SPS (Text)');
            } else if (tok === 'open-excel') files.push('OPEN EXCEL');
            else if (tok === 'map-txt') files.push('MAP.TXT');
            else if (tok === 'stp') {
                files.push('STP');
                files.push('TABLE STP');
            } else files.push(tok.toUpperCase());
        });
        return files;
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

        const pn = sessionStorage.getItem('merge_pn') || sessionStorage.getItem('projectnum') || '';
        const userId = auth?.user?.userId || '';

        if (!pn) {
            modal.showErrorAlert("알림", "프로젝트 정보를 찾을 수 없습니다.");
            return;
        }

        const filesList = getFileListForGb(gbParam);
        const totalCount = filesList.length;

        // Export Progress Modal 시작
        setExportProgress({
            isExporting: true,
            percent: 4,
            step: 1,
            statusText: `[1/${totalCount}] ${filesList[0]} 생성 중...`,
            isCompleted: false,
            fileBlob: null,
            filename: ''
        });

        let currentPercent = 4;
        let myConnectionId = null;
        let signalrConn = null;

        try {
            const baseUrl = window.API_CONFIG?.API_BASE_URL_DATAMANAGEMENT || "";
            let hubUrl = baseUrl.replace(/\/+$/, '') + "/hubs/task-progress";
            if (!hubUrl.startsWith('http')) {
                hubUrl = window.location.origin + hubUrl;
            }

            signalrConn = new signalR.HubConnectionBuilder()
                .withUrl(hubUrl)
                .withAutomaticReconnect()
                .configureLogging(signalR.LogLevel.None)
                .build();

            const handleReceiveProgress = (...args) => {
                let percent = 0;
                let msg = '';

                if (args.length >= 2 && typeof args[1] === 'number') {
                    msg = args[0];
                    percent = args[1];
                } else if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
                    msg = args[0].message || args[0].Message;
                    percent = args[0].percent || args[0].Percent || args[0].percentage || args[0].Percentage;
                } else if (args.length >= 2 && typeof args[0] === 'number') {
                    percent = args[0];
                    msg = args[1];
                }

                if (percent) {
                    const p = Math.min(99, Math.max(1, percent));
                    let currentStep = 1;
                    if (p >= 25 && p < 70) currentStep = 2;
                    else if (p >= 70) currentStep = 3;

                    setExportProgress(prev => ({
                        ...prev,
                        percent: p,
                        step: currentStep,
                        statusText: msg || prev.statusText
                    }));
                }
            };

            signalrConn.on("ReceiveProgress", handleReceiveProgress);
            signalrConn.on("progress", handleReceiveProgress);

            await signalrConn.start();
            myConnectionId = signalrConn.connectionId;
        } catch (e) {
            console.error("SignalR Connection Error in Export:", e);
        }

        const progressTimer = setInterval(() => {
            currentPercent += Math.floor(Math.random() * 6) + 3;
            if (currentPercent > 92) {
                currentPercent = 92;
            }

            let currentStep = 1;
            let currentText = '';

            if (currentPercent < 25) {
                currentStep = 1;
                currentText = `[1/${totalCount}] ${filesList[0]} 생성 중...`;
            } else if (currentPercent < 70) {
                currentStep = 2;
                const fileIdx = Math.min(Math.floor((currentPercent - 25) / (45 / Math.max(1, totalCount))), totalCount - 1);
                const fileItem = filesList[fileIdx] || filesList[0];
                currentText = `[${fileIdx + 1}/${totalCount}] ${fileItem} 완료`;
            } else {
                currentStep = 3;
                currentText = `[${Math.max(1, totalCount - 1)}/${totalCount}] EXPORT 완료`;
            }

            setExportProgress(prev => ({
                ...prev,
                percent: Math.max(prev.percent, currentPercent),
                step: currentStep,
                statusText: prev.statusText || currentText
            }));
        }, 250);

        try {
            const payload = {
                pn: pn,
                gb: gbParam,
                answerStateCode: "4",
                user: userId
            };
            if (myConnectionId) {
                payload.connectionId = myConnectionId;
            }

            const res = await exportData.mutateAsync(payload);
            const blob = res?.data instanceof Blob ? res.data : (res instanceof Blob ? res : null);

            clearInterval(progressTimer);

            if (!blob) {
                setExportProgress(prev => ({ ...prev, isExporting: false }));
                modal.showErrorAlert("에러", "파일을 생성하지 못했습니다.");
                return;
            }

            if (blob.type?.includes("application/json")) {
                const text = await blob.text();
                let msg = "다운로드 요청이 거부되었습니다.";
                try {
                    const parsed = JSON.parse(text);
                    if (parsed.message) msg = parsed.message;
                } catch (e) { }
                setExportProgress(prev => ({ ...prev, isExporting: false }));
                modal.showErrorAlert("에러", msg);
                return;
            }

            let filename = '';
            const disposition = res?.headers?.['content-disposition'] || res?.headers?.['Content-Disposition'];
            if (disposition && disposition.includes('filename=')) {
                const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (match && match[1]) {
                    filename = match[1].replace(/['"]/g, '');
                }
            }

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

            // 100% 완료 상태 설정
            setExportProgress({
                isExporting: true,
                percent: 100,
                step: 3,
                statusText: '완료',
                isCompleted: true,
                fileBlob: blob,
                filename: filename
            });

        } catch (error) {
            clearInterval(progressTimer);
            setExportProgress(prev => ({ ...prev, isExporting: false }));
            console.error("Export error:", error);
            modal.showErrorAlert("에러", "다운로드 요청 처리 중 오류가 발생했습니다.");
        } finally {
            if (signalrConn) {
                try {
                    signalrConn.stop();
                } catch (e) { }
            }
        }
    };

    const handleDownloadCompleteFile = () => {
        if (!exportProgress.fileBlob || !exportProgress.filename) return;

        const url = URL.createObjectURL(exportProgress.fileBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = exportProgress.filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        setExportProgress({
            isExporting: false,
            percent: 0,
            step: 1,
            statusText: '',
            isCompleted: false,
            fileBlob: null,
            filename: ''
        });
        handleCloseModal();
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

    const renderExportProgressModal = () => {
        if (!exportProgress.isExporting) return null;

        const { percent, step, statusText, isCompleted } = exportProgress;

        return (
            <div className="variable-modal-overlay" style={{ zIndex: 1300, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)' }}>
                <div style={{
                    width: '440px',
                    backgroundColor: '#ffffff',
                    borderRadius: '24px',
                    padding: '36px 32px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    position: 'relative'
                }}>
                    {/* Header Title & Subtitle */}
                    <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        통계 데이터 추출 (Export)
                    </h2>
                    <p style={{ fontSize: '13px', color: '#64748b', marginTop: '10px', marginBottom: 0, lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                        선택한 산출물을 하나씩 만들어 내려줍니다.{"\n"}여러 개를 고르면 ZIP 으로 묶입니다.
                    </p>

                    {/* Step Tracker (3 Horizontal Steps) */}
                    <div style={{ width: '100%', position: 'relative', marginTop: '32px', marginBottom: '36px' }}>
                        {/* Connecting Line Track */}
                        <div style={{
                            position: 'absolute',
                            top: '26px',
                            left: '50px',
                            right: '50px',
                            height: '2px',
                            backgroundColor: '#e2e8f0',
                            zIndex: 1
                        }}>
                            <div style={{
                                height: '100%',
                                width: isCompleted ? '100%' : (step >= 3 ? '85%' : (step >= 2 ? '50%' : '0%')),
                                backgroundColor: isCompleted ? '#10b981' : '#8b5cf6',
                                transition: 'width 0.3s ease'
                            }} />
                        </div>

                        {/* Step Nodes */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 2, padding: '0 10px' }}>
                            {/* Step 1: 준비 */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                    width: '52px',
                                    height: '52px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: (step > 1 || isCompleted) ? '#10b981' : '#ffffff',
                                    border: (step > 1 || isCompleted) ? 'none' : '2px solid #8b5cf6',
                                    boxShadow: (step > 1 || isCompleted) ? '0 4px 12px rgba(16, 185, 129, 0.25)' : (step === 1 ? '0 0 0 6px rgba(139, 92, 246, 0.15)' : 'none'),
                                    transition: 'all 0.3s ease'
                                }}>
                                    {(step > 1 || isCompleted) ? (
                                        <Check size={24} color="#ffffff" strokeWidth={3} />
                                    ) : (
                                        <Monitor size={22} color="#8b5cf6" />
                                    )}
                                </div>
                                <span style={{
                                    fontSize: '13px',
                                    fontWeight: (step >= 1 || isCompleted) ? 700 : 500,
                                    color: (step > 1 || isCompleted) ? '#10b981' : (step === 1 ? '#8b5cf6' : '#94a3b8')
                                }}>
                                    준비
                                </span>
                            </div>

                            {/* Step 2: 파일 생성 */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                    width: '52px',
                                    height: '52px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: (step > 2 || isCompleted) ? '#10b981' : (step === 2 ? '#ffffff' : '#f8fafc'),
                                    border: (step > 2 || isCompleted) ? 'none' : (step === 2 ? '2px solid #8b5cf6' : '1.5px solid #e2e8f0'),
                                    boxShadow: (step > 2 || isCompleted) ? '0 4px 12px rgba(16, 185, 129, 0.25)' : (step === 2 ? '0 0 0 6px rgba(139, 92, 246, 0.15)' : 'none'),
                                    transition: 'all 0.3s ease'
                                }}>
                                    {(step > 2 || isCompleted) ? (
                                        <Check size={24} color="#ffffff" strokeWidth={3} />
                                    ) : (
                                        <FileText size={22} color={step === 2 ? '#8b5cf6' : '#94a3b8'} />
                                    )}
                                </div>
                                <span style={{
                                    fontSize: '13px',
                                    fontWeight: (step >= 2 || isCompleted) ? 700 : 500,
                                    color: (step > 2 || isCompleted) ? '#10b981' : (step === 2 ? '#8b5cf6' : '#94a3b8')
                                }}>
                                    파일 생성
                                </span>
                            </div>

                            {/* Step 3: 압축 · 전송 */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                    width: '52px',
                                    height: '52px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: isCompleted ? '#10b981' : (step === 3 ? '#ffffff' : '#f8fafc'),
                                    border: isCompleted ? 'none' : (step === 3 ? '2px solid #8b5cf6' : '1.5px solid #e2e8f0'),
                                    boxShadow: isCompleted ? '0 4px 12px rgba(16, 185, 129, 0.25)' : (step === 3 ? '0 0 0 6px rgba(139, 92, 246, 0.15)' : 'none'),
                                    transition: 'all 0.3s ease'
                                }}>
                                    {isCompleted ? (
                                        <Check size={24} color="#ffffff" strokeWidth={3} />
                                    ) : (
                                        <Download size={22} color={step === 3 ? '#8b5cf6' : '#94a3b8'} />
                                    )}
                                </div>
                                <span style={{
                                    fontSize: '13px',
                                    fontWeight: isCompleted ? 700 : (step === 3 ? 700 : 500),
                                    color: isCompleted ? '#10b981' : (step === 3 ? '#8b5cf6' : '#94a3b8')
                                }}>
                                    압축 · 전송
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar Section */}
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: isCompleted ? '#334155' : '#64748b' }}>
                                {statusText}
                            </span>
                            <span style={{ fontSize: '18px', fontWeight: 800, color: '#7c3aed' }}>
                                {percent}%
                            </span>
                        </div>

                        <div style={{
                            width: '100%',
                            height: '10px',
                            backgroundColor: '#f1f5f9',
                            borderRadius: '9999px',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                height: '100%',
                                width: `${percent}%`,
                                background: 'linear-gradient(90deg, #8b5cf6 0%, #6d28d9 100%)',
                                borderRadius: '9999px',
                                transition: 'width 0.25s ease-out'
                            }} />
                        </div>
                    </div>

                    {/* Action Button on Completion */}
                    {isCompleted && (
                        <button
                            type="button"
                            onClick={handleDownloadCompleteFile}
                            style={{
                                width: '100%',
                                height: '48px',
                                backgroundColor: '#10b981',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: '15px',
                                fontWeight: 700,
                                marginTop: '24px',
                                cursor: 'pointer',
                                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#059669';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#10b981';
                                e.currentTarget.style.transform = 'none';
                            }}
                        >
                            추출된 파일 다운로드
                        </button>
                    )}
                </div>
            </div>
        );
    };

    if (exportProgress.isExporting) {
        return renderExportProgressModal();
    }

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
                        <div
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
                        </div>

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

