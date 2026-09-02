import React, { useState, useEffect, useContext, useRef } from 'react';
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
    const { exportData, exportSupplyTicket, exportSupplyToolStatus } = MapManagementPageApi();
    const auth = useSelector((store) => store.auth);
    const modal = useContext(modalContext);

    const [isAccordionOpen, setIsAccordionOpen] = useState(false);
    const [selectedFormats, setSelectedFormats] = useState([]);
    const [downloading, setDownloading] = useState(false);
    const [downloadingSav, setDownloadingSav] = useState(false);

    // PC 도구 구동 확인 로딩 & 10초 카운트다운 상태
    const [checkingTool, setCheckingTool] = useState(false);
    const [countdown, setCountdown] = useState(10);
    const countdownTimerRef = useRef(null);

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

    const exportAbortControllerRef = useRef(null);
    const exportSignalrConnRef = useRef(null);

    // 팝업이 닫히거나 상태가 변경될 때 선택 항목 및 토글 초기화
    useEffect(() => {
        if (!isOpen) {
            setSelectedFormats([]);
            setIsAccordionOpen(false);
            setCheckingTool(false);
            setDownloading(false);
            if (countdownTimerRef.current) {
                clearInterval(countdownTimerRef.current);
                countdownTimerRef.current = null;
            }
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
    const handleFormatToggle = toggleFormat;

    const handleReset = () => {
        setSelectedFormats([]);
    };

    /**
     * PC 내보내기 도구 실행 (surveyonexport://run?...)
     * ① 티켓 발급 (POST /export/supply/ticket)
     * ② 프로토콜 URL 조립 및 실행
     * ③ 10초 뒤 1회 구동 확인 (POST /export/supply/tool/status)
     */
    const executeExport = async (gbParam) => {
        if (!gbParam) return;

        const pn = sessionStorage.getItem('merge_pn') || sessionStorage.getItem('projectnum') || '';
        const userId = auth?.user?.userId || sessionStorage.getItem('userId') || '';

        if (!pn || !userId) {
            modal.showAlert("알림", "프로젝트 정보 또는 사용자 정보가 올바르지 않습니다.");
            return;
        }

        try {
            setDownloading(true);
            setCheckingTool(true);
            setCountdown(10);

            // ① 티켓 발급 (POST /export/supply/ticket)
            const ticketRes = await exportSupplyTicket.mutateAsync({ pn, user: userId });

            if (String(ticketRes?.success) !== '777' || !ticketRes?.resultjson?.ticket) {
                setDownloading(false);
                setCheckingTool(false);
                const errMsg = ticketRes?.resultjson?.errorcontent || ticketRes?.resultjson?.Errorcontent || ticketRes?.message || "이미 진행 중인 작업이 있습니다. 완료된 후 다시 시작해 주세요.";
                modal.showAlert("알림", errMsg);
                return;
            }

            const ticket = ticketRes.resultjson.ticket;

            // ② URL 조립 (surveyonexport://run?central=..&ticket=..&pn=..&gb=..&state=..)
            const host = window.API_CONFIG?.API_BASE_URL_DATAMANAGEMENT || window.API_CONFIG?.API_BASE_URL || window.location.origin;
            const p = new URLSearchParams();
            p.set('central', host);
            p.set('ticket', ticket);
            p.set('pn', pn);
            p.set('gb', gbParam);
            p.set('state', '4');

            window.location.href = `surveyonexport://run?${p.toString()}`;

            // 10초 카운트다운 타이머 시작
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = setInterval(() => {
                setCountdown(prev => Math.max(0, prev - 1));
            }, 1000);

            // ③ 10초 뒤 1회 구동 확인 (POST /export/supply/tool/status)
            setTimeout(async () => {
                if (countdownTimerRef.current) {
                    clearInterval(countdownTimerRef.current);
                    countdownTimerRef.current = null;
                }
                setCheckingTool(false);
                setDownloading(false);

                try {
                    const statusRes = await exportSupplyToolStatus.mutateAsync({ pn, user: userId });
                    const isStarted = statusRes?.resultjson?.started ?? statusRes?.started ?? false;

                    if (isStarted) {
                        modal.showAlert("알림", "PC 내보내기 도구 창에서 작업이 진행됩니다.");
                    } else {
                        const downloadUrl = statusRes?.resultjson?.downloadUrl || statusRes?.downloadUrl || `${host.replace(/\/+$/, '')}/export/supply/tool/download`;
                        modal.showConfirm(
                            "PC 내보내기 도구 설치 안내",
                            "PC 내보내기 도구가 감지되지 않았습니다.\n\n" +
                            "1. [도구 다운로드] 버튼을 눌러 SurveyonExportTool.exe를 내려받아 주세요.\n" +
                            "2. 내려받은 파일(SurveyonExportTool.exe)을 더블클릭 후 [예]를 눌러 설치를 완료해 주세요.\n" +
                            "3. 설치 완료 후 [다운로드] 버튼을 다시 눌러주시면 작업이 시작됩니다.\n\n" +
                            "(※ 이미 설치하셨다면 브라우저 확장 프로그램의 프로토콜 차단 여부를 확인해 주세요.)",
                            {
                                btns: [
                                    { title: "닫기", click: () => { } },
                                    {
                                        title: "도구 다운로드",
                                        click: () => {
                                            const link = document.createElement('a');
                                            link.href = downloadUrl;
                                            link.setAttribute('download', 'SurveyonExportTool.exe');
                                            document.body.appendChild(link);
                                            link.click();
                                            link.parentNode.removeChild(link);
                                        }
                                    }
                                ]
                            }
                        );
                    }
                } catch (e) {
                    console.error("exportSupplyToolStatus error:", e);
                }
            }, 10000);

        } catch (err) {
            setDownloading(false);
            setCheckingTool(false);
            if (countdownTimerRef.current) {
                clearInterval(countdownTimerRef.current);
                countdownTimerRef.current = null;
            }
            console.error("executeExport error:", err);
            modal.showAlert("알림", "PC 내보내기 실행 중 오류가 발생했습니다.");
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

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '12px', color: '#475569' }}>
                    선택된 {totalCount}개 산출물 파일이 PC 내보내기 도구를 통해 다운로드 폴더로 추출됩니다.
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '11px' }}>└</span>
                    <span>{generatedFiles.join('  ·  ')}</span>
                </div>
            </div>
        );
    };

    const handleCloseExportProgress = () => {
        // 진행 중일 때 X 버튼을 누르면 HTTP 요청 취소 (ctrl.abort()) 및 SignalR 해제
        if (!exportProgress.isCompleted) {
            if (exportAbortControllerRef.current) {
                try {
                    exportAbortControllerRef.current.abort();
                } catch (e) { }
                exportAbortControllerRef.current = null;
            }
            if (exportSignalrConnRef.current) {
                try {
                    exportSignalrConnRef.current.stop();
                } catch (e) { }
                exportSignalrConnRef.current = null;
            }
        }

        setExportProgress({
            isExporting: false,
            percent: 0,
            step: 1,
            statusText: '',
            isCompleted: false,
            fileBlob: null,
            filename: ''
        });
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
                    {/* Close Button */}
                    <button
                        type="button"
                        onClick={handleCloseExportProgress}
                        style={{
                            position: 'absolute',
                            top: '20px',
                            right: '20px',
                            width: '32px',
                            height: '32px',
                            border: 'none',
                            background: 'transparent',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f1f5f9';
                            e.currentTarget.style.color = '#334155';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = '#94a3b8';
                        }}
                        title="닫기"
                    >
                        <X size={20} />
                    </button>
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
            <div className="variable-modal-content download-modal-content" style={{ width: '480px', position: 'relative', overflow: 'hidden' }}>
                {/* PC 도구 구동 상태 확인 글래스모피즘 전체 로딩 오버레이 */}
                {checkingTool && (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 100,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '24px',
                        borderRadius: '8px'
                    }}>
                        {/* Monitor Icon with Status Pulsing Light */}
                        <div style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '16px',
                            backgroundColor: '#f0fdf4',
                            border: '1.5px solid #bbf7d0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '16px',
                            color: '#16a34a',
                            position: 'relative',
                            boxShadow: '0 4px 12px rgba(22, 163, 74, 0.12)'
                        }}>
                            <Monitor size={30} />
                            <span style={{
                                position: 'absolute',
                                top: '-2px',
                                right: '-2px',
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                backgroundColor: '#22c55e',
                                border: '2px solid #ffffff',
                                boxShadow: '0 0 8px rgba(34, 197, 94, 0.8)'
                            }} />
                        </div>

                        <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', marginBottom: '6px', letterSpacing: '-0.3px' }}>
                            PC 내보내기 도구 연결 확인 중
                        </div>

                        <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '22px', textAlign: 'center', lineHeight: '1.5' }}>
                            프로그램 구동 상태를 확인하고 있습니다.<br />
                            잠시만 기다려 주세요.
                        </div>

                        {/* Animated Smooth Progress Bar */}
                        <div style={{ width: '260px', backgroundColor: '#e2e8f0', height: '8px', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
                            <div style={{
                                width: `${Math.min(100, Math.max(5, ((10 - countdown) / 10) * 100))}%`,
                                height: '100%',
                                backgroundColor: '#16a34a',
                                borderRadius: '4px',
                                transition: 'width 1s linear'
                            }} />
                        </div>

                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: '#22c55e',
                                display: 'inline-block'
                            }} />
                            <span>확인 대기 남은 시간: <strong>{countdown}초</strong></span>
                        </div>
                    </div>
                )}

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
                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                                다른 형식으로 받기 (다중 선택 가능)
                            </span>
                            {selectedFormats.length > 0 && (
                                <span style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: '#ffffff',
                                    backgroundColor: '#16a34a',
                                    borderRadius: '10px',
                                    padding: '1px 7px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {getGeneratedFileCount()}
                                </span>
                            )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isAccordionOpen && selectedFormats.length > 0 && (
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontSize: '12px',
                                        color: '#64748b',
                                        background: '#fff',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '6px',
                                        padding: '3px 8px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <RotateCcw size={12} />
                                    <span>초기화</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 5. Formats Grid Container (Controlled by isAccordionOpen) */}
                    {isAccordionOpen && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                {OTHER_FORMAT_OPTIONS.map(item => {
                                    const isChecked = selectedFormats.includes(item.id);
                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => toggleFormat(item.id)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '10px 14px',
                                                borderRadius: '8px',
                                                border: `1.5px solid ${isChecked ? '#16a34a' : '#e2e8f0'}`,
                                                backgroundColor: isChecked ? '#f0fdf4' : '#ffffff',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease',
                                                userSelect: 'none'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{
                                                    width: '16px',
                                                    height: '16px',
                                                    borderRadius: '4px',
                                                    border: `1.5px solid ${isChecked ? '#16a34a' : '#cbd5e1'}`,
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
                                                : `선택한 ${getGeneratedFileCount()}개 파일 다운로드`)
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

