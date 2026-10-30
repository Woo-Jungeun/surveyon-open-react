import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Copy, Download, RotateCw, FileCode, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { DpRequestPageApi } from '../dpRequest/DpRequestPageApi';
import moment from 'moment';
import '@/components/common/popup/ConditionBuilderPopup.css';
import '@/services/dataStatus/app/hsrt/srtTheme.css';

const MULTI_FORMAT_OPTIONS = [
    { text: '이분형(0/1) 변수 분할 + MRSETS (권장)', value: 'dichotomy' },
    { text: '쉼표 구분 문자열', value: 'string' }
];

const WATERFALL_MODE_OPTIONS = [
    { text: 'DO IF ~ ELSE IF 블록 (권장)', value: 'do_if' },
    { text: '순차적 IF (...) VAR=값 구조', value: 'sequential_if' }
];

const ENCODING_OPTIONS = [
    { text: 'CP949 (구버전 한글 깨짐 시)', value: 'cp949' },
    { text: 'UTF-8 with BOM (최신 SPSS 권장)', value: 'utf-8' }
];

/**
 * SPSS 신텍스(.sps) 추출 모달
 * AI조건식 자동생성 / 변수조합기 팝업과 통일된 SRT 디자인 시스템 적용
 * 문항추가에서 생성된 리코딩(계산) 문항을 원본 SAV 파일에 반영하는 스크립트 생성 및 다운로드
 */
const SpssSyntaxExportModal = ({
    show,
    onClose,
    banners = [],
    currentBannerId = '',
    pageId = '',
    userId = ''
}) => {
    const { getComputedSpssSyntax, downloadComputedSpssSyntax } = DpRequestPageApi();

    // 1. 추출 대상 문항 모드 ('all' | 'current' | 'custom')
    const [targetMode, setTargetMode] = useState('all');
    // 직접 선택 모드일 때 선택된 문항 ID 목록
    const [selectedCustomIds, setSelectedCustomIds] = useState(() => {
        if (currentBannerId) return [currentBannerId];
        return banners.length > 0 ? [banners[0].id] : [];
    });
    const [isCustomDropdownOpen, setIsCustomDropdownOpen] = useState(false);

    // 2. 신텍스 옵션
    const [multiFormat, setMultiFormat] = useState('dichotomy');
    const [waterfallMode, setWaterfallMode] = useState('do_if');
    const [encoding, setEncoding] = useState('cp949');

    // 3. 신텍스 결과 상태
    const [syntaxContent, setSyntaxContent] = useState('');
    const [filename, setFilename] = useState('');
    const [variableCount, setVariableCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [copySuccess, setCopySuccess] = useState(false);

    // 유효한 저장 완료 문항만 필터링 (임시 작성 중인 NEW_ 문항 제외)
    const validBanners = useMemo(() => {
        return banners.filter(b => b && b.id && !b.id.startsWith('NEW_'));
    }, [banners]);

    // 대상 문항 ID 목록 계산
    const targetVariableIds = useMemo(() => {
        if (targetMode === 'current') {
            return currentBannerId && !currentBannerId.startsWith('NEW_') ? [currentBannerId] : [];
        }
        if (targetMode === 'custom') {
            return selectedCustomIds;
        }
        // 'all': null 전달 (모든 계산 문항 대상)
        return null;
    }, [targetMode, currentBannerId, selectedCustomIds]);

    // 신텍스 행 분할 (라인 번호 렌더링용)
    const syntaxLines = useMemo(() => {
        if (!syntaxContent) return [];
        return syntaxContent.split('\n');
    }, [syntaxContent]);

    // 신텍스 본문 조회 API 호출
    const fetchSyntax = useCallback(async () => {
        if (!show || !pageId) return;
        setIsLoading(true);
        setErrorMessage('');

        try {
            const payload = {
                pageid: pageId,
                user: userId || 'user',
                variable_ids: targetVariableIds,
                options: {
                    multi_format: multiFormat,
                    waterfall_mode: waterfallMode,
                    encoding: encoding,
                    include_save_comment: true
                }
            };

            const res = await getComputedSpssSyntax.mutateAsync(payload);

            if (String(res?.success) === '777' && res.resultjson) {
                setSyntaxContent(res.resultjson.syntax_content || '');
                setFilename(res.resultjson.filename || `HSRT_Computed_Syntax_${moment().format('YYYYMMDD')}.sps`);
                setVariableCount(res.resultjson.variable_count ?? (targetVariableIds ? targetVariableIds.length : validBanners.length));
            } else {
                const msg = res?.message || res?.Message || '신텍스 생성에 실패했습니다.';
                setErrorMessage(msg);
                setSyntaxContent(`* [오류] ${msg}`);
            }
        } catch (err) {
            console.error('getComputedSpssSyntax error:', err);
            const msg = err?.message || '신텍스 조회 중 통신 오류가 발생했습니다.';
            setErrorMessage(msg);
            setSyntaxContent(`* [오류 발생]\n* ${msg}\n* 잠시 후 다시 시도해주세요.`);
        } finally {
            setIsLoading(false);
        }
    }, [show, pageId, userId, targetVariableIds, multiFormat, waterfallMode, encoding, validBanners.length, getComputedSpssSyntax]);

    // 모달이 열리거나 옵션이 바뀔 때 자동 조회
    useEffect(() => {
        if (show) {
            fetchSyntax();
        }
    }, [show, targetMode, selectedCustomIds, multiFormat, waterfallMode, encoding]);

    // 클립보드 복사
    const handleCopyClipboard = async () => {
        if (!syntaxContent) return;
        try {
            await navigator.clipboard.writeText(syntaxContent);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
            console.error('Clipboard copy failed:', err);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = syntaxContent;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        }
    };

    // .sps 파일 다운로드
    const handleDownload = async () => {
        if (isDownloading) return;
        setIsDownloading(true);

        const defaultFileName = filename || `HSRT_Computed_Syntax_${moment().format('YYYYMMDD')}.sps`;

        try {
            const payload = {
                pageid: pageId,
                user: userId || 'user',
                variable_ids: targetVariableIds,
                options: {
                    multi_format: multiFormat,
                    waterfall_mode: waterfallMode,
                    encoding: encoding,
                    include_save_comment: true
                }
            };

            const response = await downloadComputedSpssSyntax.mutateAsync(payload);

            // 바이너리/텍스트 Blob 생성
            let blobData = response?.data !== undefined ? response.data : response;
            const mimeType = encoding === 'cp949' ? 'text/plain;charset=cp949' : 'text/plain;charset=utf-8';
            const blob = blobData instanceof Blob ? blobData : new Blob([blobData], { type: mimeType });

            // 서버 응답 헤더에서 filename 추출 시도
            let downloadName = defaultFileName;
            const disposition = response?.headers?.['content-disposition'];
            if (disposition && disposition.includes('filename=')) {
                const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
                if (match && match[1]) {
                    downloadName = decodeURIComponent(match[1].replace(/['"]/g, ''));
                }
            }

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = downloadName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.warn('Direct download API failed, falling back to client-side blob download:', err);
            // 클라이언트 사이드 Fallback 다운로드
            if (syntaxContent) {
                const mimeType = encoding === 'cp949' ? 'text/plain;charset=cp949' : 'text/plain;charset=utf-8';
                const blob = new Blob([syntaxContent], { type: mimeType });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = defaultFileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            } else {
                alert('신텍스 파일 다운로드에 실패했습니다.');
            }
        } finally {
            setIsDownloading(false);
        }
    };

    // 직접 선택 토글
    const handleToggleCustomId = (id) => {
        setSelectedCustomIds(prev => {
            if (prev.includes(id)) {
                const next = prev.filter(x => x !== id);
                return next.length > 0 ? next : [id]; // 최소 1개 유지
            } else {
                return [...prev, id];
            }
        });
    };

    if (!show) return null;

    const displayCurrentId = currentBannerId && !currentBannerId.startsWith('NEW_') ? currentBannerId : (validBanners[0]?.id || '없음');

    const isCustomOpen = targetMode === 'custom' && isCustomDropdownOpen;

    return (
        <div className="advanced-filter-overlay-cbp theme-blue">
            <div
                className="advanced-filter-content-cbp"
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '880px',
                    height: isCustomOpen ? 'min(920px, 94vh)' : 'min(760px, 86vh)',
                    maxHeight: '95vh',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'height 0.25s ease-in-out'
                }}
            >
                {/* 헤더 영역 (AI조건식/변수조합기 팝업과 통일) */}
                <div className="filter-popup-header-cbp">
                    <div className="header-title-cbp">
                        <h3>SPSS 신텍스(.sps) 추출</h3>
                        <p>
                            문항추가에서 생성된 리코딩(계산) 문항을 원본 SAV 파일에 반영하는 스크립트를 생성합니다.
                        </p>
                    </div>
                    <div className="header-actions-cbp">
                        <button onClick={onClose} className="close-btn-cbp" title="닫기">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* 컨텐츠 컨테이너 영역 */}
                <div
                    className="filter-popup-container-cbp custom-scrollbar"
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '16px 20px',
                        gap: '14px',
                        background: 'var(--srt-primary-25)',
                        boxSizing: 'border-box',
                        flex: 1,
                        minHeight: 0,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        width: '100%',
                        maxWidth: '100%'
                    }}
                >
                    {/* 1. 추출 대상 문항 카드 */}
                    <div style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '14px 16px',
                        boxSizing: 'border-box',
                        width: '100%',
                        minWidth: 0
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>
                                1. 추출 대상 문항
                            </span>
                            <span style={{
                                fontSize: '11px',
                                color: 'var(--srt-primary-700)',
                                background: 'var(--srt-primary-50)',
                                border: '1px solid var(--srt-primary-200)',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontWeight: 600
                            }}>
                                {targetMode === 'all'
                                    ? `전체 ${validBanners.length}개 대상`
                                    : targetMode === 'current'
                                        ? `선택 문항 1건`
                                        : `직접 선택 ${selectedCustomIds.length}건`}
                            </span>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '20px' }}>
                            {/* 1) 전체 문항 */}
                            <div
                                onClick={() => setTargetMode('all')}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '13px', color: targetMode === 'all' ? '#0f172a' : '#334155', cursor: 'pointer', userSelect: 'none' }}
                            >
                                <div style={{
                                    width: '16px',
                                    height: '16px',
                                    borderRadius: '50%',
                                    border: targetMode === 'all' ? '1.5px solid var(--srt-primary-600, #2563eb)' : '1.5px solid #94a3b8',
                                    backgroundColor: '#ffffff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    transition: 'all 0.15s'
                                }}>
                                    {targetMode === 'all' && (
                                        <div style={{
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            backgroundColor: 'var(--srt-primary-600, #2563eb)'
                                        }} />
                                    )}
                                </div>
                                <span style={{ fontWeight: targetMode === 'all' ? 600 : 400 }}>
                                    전체 추가 문항 일괄 ({validBanners.length}개)
                                </span>
                            </div>

                            {/* 2) 현재 편집 중인 문항 */}
                            {(() => {
                                const isDisabled = !currentBannerId || currentBannerId.startsWith('NEW_');
                                const isCurrent = targetMode === 'current';
                                return (
                                    <div
                                        onClick={() => { if (!isDisabled) setTargetMode('current'); }}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '7px',
                                            fontSize: '13px',
                                            color: isCurrent ? '#0f172a' : '#334155',
                                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                                            opacity: isDisabled ? 0.5 : 1,
                                            userSelect: 'none'
                                        }}
                                    >
                                        <div style={{
                                            width: '16px',
                                            height: '16px',
                                            borderRadius: '50%',
                                            border: isCurrent ? '1.5px solid var(--srt-primary-600, #2563eb)' : '1.5px solid #94a3b8',
                                            backgroundColor: '#ffffff',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            transition: 'all 0.15s'
                                        }}>
                                            {isCurrent && (
                                                <div style={{
                                                    width: '8px',
                                                    height: '8px',
                                                    borderRadius: '50%',
                                                    backgroundColor: 'var(--srt-primary-600, #2563eb)'
                                                }} />
                                            )}
                                        </div>
                                        <span style={{ fontWeight: isCurrent ? 600 : 400 }}>
                                            현재 편집 중인 문항만 ({displayCurrentId})
                                        </span>
                                    </div>
                                );
                            })()}

                            {/* 3) 직접 선택 */}
                            <div
                                onClick={() => setTargetMode('custom')}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '13px', color: targetMode === 'custom' ? '#0f172a' : '#334155', cursor: 'pointer', userSelect: 'none' }}
                            >
                                <div style={{
                                    width: '16px',
                                    height: '16px',
                                    borderRadius: '50%',
                                    border: targetMode === 'custom' ? '1.5px solid var(--srt-primary-600, #2563eb)' : '1.5px solid #94a3b8',
                                    backgroundColor: '#ffffff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    transition: 'all 0.15s'
                                }}>
                                    {targetMode === 'custom' && (
                                        <div style={{
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            backgroundColor: 'var(--srt-primary-600, #2563eb)'
                                        }} />
                                    )}
                                </div>
                                <span style={{ fontWeight: targetMode === 'custom' ? 600 : 400 }}>
                                    직접 선택 ({selectedCustomIds.length}개 선택됨)
                                </span>
                            </div>

                            {targetMode === 'custom' && (
                                <button
                                    type="button"
                                    onClick={() => setIsCustomDropdownOpen(!isCustomDropdownOpen)}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        height: '26px',
                                        padding: '0 9px',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        borderRadius: '4px',
                                        border: '1px solid var(--srt-primary-400, #93c5fd)',
                                        background: 'var(--srt-primary-50, #eff6ff)',
                                        color: 'var(--srt-primary-700, #1d4ed8)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'inherit' }}>
                                        문항 목록 {isCustomDropdownOpen ? '접기' : '열기'}
                                    </span>
                                    {isCustomDropdownOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                </button>
                            )}
                        </div>

                        {/* 직접 선택 문항 체크박스 아코디언 */}
                        {targetMode === 'custom' && isCustomDropdownOpen && (
                            <div style={{
                                marginTop: '12px',
                                padding: '8px 10px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                backgroundColor: '#f8fafc',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px'
                            }}>
                                {/* 상단 전체선택 / 전체해제 툴바 */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid #e2e8f0' }}>
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                                        선택된 문항: <strong style={{ color: 'var(--srt-primary-700, #1d4ed8)' }}>{selectedCustomIds.length}</strong> / {validBanners.length}개
                                    </span>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedCustomIds(validBanners.map(b => b.id))}
                                            style={{
                                                fontSize: '11px',
                                                padding: '2px 7px',
                                                borderRadius: '3px',
                                                border: '1px solid #cbd5e1',
                                                background: '#ffffff',
                                                color: '#334155',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            전체 선택
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedCustomIds(validBanners.length > 0 ? [validBanners[0].id] : [])}
                                            style={{
                                                fontSize: '11px',
                                                padding: '2px 7px',
                                                borderRadius: '3px',
                                                border: '1px solid #cbd5e1',
                                                background: '#ffffff',
                                                color: '#334155',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            최소 선택 (1건)
                                        </button>
                                    </div>
                                </div>

                                {/* 문항 리스트 그리드 (글씨 크기 13px로 조정) */}
                                <div style={{
                                    maxHeight: '135px',
                                    overflowY: 'auto',
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                                    gap: '5px'
                                }}>
                                    {validBanners.map(b => {
                                        const isChecked = selectedCustomIds.includes(b.id);
                                        return (
                                            <div
                                                key={b.id}
                                                onClick={() => handleToggleCustomId(b.id)}
                                                title={`${b.id} ${b.label || ''}`}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '7px',
                                                    fontSize: '13px',
                                                    color: '#334155',
                                                    cursor: 'pointer',
                                                    userSelect: 'none',
                                                    padding: '3px 6px',
                                                    borderRadius: '4px',
                                                    backgroundColor: isChecked ? 'var(--srt-primary-50, #eff6ff)' : 'transparent',
                                                    transition: 'all 0.15s'
                                                }}
                                            >
                                                {/* 선명한 커스텀 체크박스 박스 */}
                                                <div style={{
                                                    width: '15px',
                                                    height: '15px',
                                                    borderRadius: '3px',
                                                    border: isChecked ? '1px solid var(--srt-primary-600, #2563eb)' : '1px solid #94a3b8',
                                                    backgroundColor: isChecked ? 'var(--srt-primary-600, #2563eb)' : '#ffffff',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                    transition: 'all 0.15s'
                                                }}>
                                                    {isChecked && (
                                                        <Check size={11} color="#ffffff" strokeWidth={3} />
                                                    )}
                                                </div>
                                                <span style={{ fontSize: '13px', fontWeight: 600, color: isChecked ? 'var(--srt-primary-800, #1e40af)' : '#1e293b' }}>
                                                    {b.id}
                                                </span>
                                                <span
                                                    title={`${b.id} ${b.label || ''}`}
                                                    style={{ fontSize: '13px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}
                                                >
                                                    {b.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 2. 옵션 드롭다운 3열 그리드 (Kendo DropDownList) */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                        gap: '12px',
                        width: '100%',
                        boxSizing: 'border-box'
                    }}>
                        {/* 1) 다중선택 변환 방식 */}
                        <div style={{
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '12px 14px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            minWidth: 0,
                            boxSizing: 'border-box'
                        }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#1e293b', marginBottom: '6px' }}>
                                    다중선택(multi) 변환 방식
                                </label>
                                <DropDownList
                                    className="spss-opt-dropdown"
                                    popupSettings={{ className: 'spss-opt-dropdown-popup' }}
                                    data={MULTI_FORMAT_OPTIONS}
                                    textField="text"
                                    dataItemKey="value"
                                    value={MULTI_FORMAT_OPTIONS.find(opt => opt.value === multiFormat)}
                                    onChange={(e) => setMultiFormat(e.value?.value || e.value)}
                                    style={{
                                        width: '100%',
                                        minWidth: 0,
                                        height: '32px',
                                        fontSize: '12px',
                                        borderRadius: '4px'
                                    }}
                                />
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', whiteSpace: 'normal', wordBreak: 'keep-all' }}>
                                SPSS 교차분석 시 보기별 이분형 분할이 필수입니다.
                            </div>
                        </div>

                        {/* 2) 조건문 분기 방식 */}
                        <div style={{
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '12px 14px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            minWidth: 0,
                            boxSizing: 'border-box'
                        }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#1e293b', marginBottom: '6px' }}>
                                    조건문 분기 방식
                                </label>
                                <DropDownList
                                    className="spss-opt-dropdown"
                                    popupSettings={{ className: 'spss-opt-dropdown-popup' }}
                                    data={WATERFALL_MODE_OPTIONS}
                                    textField="text"
                                    dataItemKey="value"
                                    value={WATERFALL_MODE_OPTIONS.find(opt => opt.value === waterfallMode)}
                                    onChange={(e) => setWaterfallMode(e.value?.value || e.value)}
                                    style={{
                                        width: '100%',
                                        minWidth: 0,
                                        height: '32px',
                                        fontSize: '12px',
                                        borderRadius: '4px'
                                    }}
                                />
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', whiteSpace: 'normal', wordBreak: 'keep-all' }}>
                                elif, else를 상호 배타적으로 처리합니다.
                            </div>
                        </div>

                        {/* 3) 파일 인코딩 */}
                        <div style={{
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '12px 14px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            minWidth: 0,
                            boxSizing: 'border-box'
                        }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#1e293b', marginBottom: '6px' }}>
                                    파일 인코딩
                                </label>
                                <DropDownList
                                    className="spss-opt-dropdown"
                                    popupSettings={{ className: 'spss-opt-dropdown-popup' }}
                                    data={ENCODING_OPTIONS}
                                    textField="text"
                                    dataItemKey="value"
                                    value={ENCODING_OPTIONS.find(opt => opt.value === encoding)}
                                    onChange={(e) => setEncoding(e.value?.value || e.value)}
                                    style={{
                                        width: '100%',
                                        minWidth: 0,
                                        height: '32px',
                                        fontSize: '12px',
                                        borderRadius: '4px'
                                    }}
                                />
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', whiteSpace: 'normal', wordBreak: 'keep-all' }}>
                                구버전 SPSS에서 한글 깨짐 시 CP949 선택
                            </div>
                        </div>
                    </div>

                    {/* 3. SPSS 신텍스 미리보기 영역 카드 (SRT 조화형 라이트 테마 + 라인 번호) */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        background: '#ffffff',
                        overflow: 'hidden',
                        flex: 1,
                        minHeight: isCustomOpen ? '200px' : '250px',
                        width: '100%',
                        minWidth: 0,
                        boxSizing: 'border-box'
                    }}>
                        {/* 미리보기 헤더 바 */}
                        <div style={{
                            padding: '10px 14px',
                            background: '#f8fafc',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                                    SPSS 신텍스 미리보기
                                </span>
                                <span style={{
                                    fontSize: '11px',
                                    fontWeight: 500,
                                    color: '#64748b',
                                    background: '#f1f5f9',
                                    border: '1px solid #e2e8f0',
                                    padding: '2px 7px',
                                    borderRadius: '4px'
                                }}>
                                    읽기 전용
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                    type="button"
                                    title="신텍스 내용 복사"
                                    onClick={handleCopyClipboard}
                                    disabled={!syntaxContent || isLoading}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        height: '26px',
                                        padding: '0 10px',
                                        border: copySuccess ? '1px solid #16a34a' : '1px solid var(--srt-primary-400, #93c5fd)',
                                        borderRadius: '4px',
                                        background: copySuccess ? '#f0fdf4' : 'var(--srt-primary-50, #eff6ff)',
                                        color: copySuccess ? '#16a34a' : 'var(--srt-primary-700, #1d4ed8)',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: (!syntaxContent || isLoading) ? 'default' : 'pointer',
                                        transition: 'all 0.15s'
                                    }}
                                    onMouseEnter={(e) => { if (syntaxContent && !isLoading && !copySuccess) e.currentTarget.style.background = 'var(--srt-primary-100, #dbeafe)'; }}
                                    onMouseLeave={(e) => { if (!copySuccess) e.currentTarget.style.background = 'var(--srt-primary-50, #eff6ff)'; }}
                                >
                                    {copySuccess ? <Check size={13} color="#16a34a" /> : <Copy size={13} />}
                                    <span>{copySuccess ? '복사 완료!' : '클립보드 복사'}</span>
                                </button>

                                <button
                                    type="button"
                                    title="신텍스 다시 생성"
                                    onClick={fetchSyntax}
                                    disabled={isLoading}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        height: '26px',
                                        padding: '0 10px',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '4px',
                                        background: '#ffffff',
                                        color: '#475569',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: isLoading ? 'default' : 'pointer',
                                        transition: 'all 0.15s'
                                    }}
                                    onMouseEnter={(e) => { if (!isLoading) { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#1e293b'; } }}
                                    onMouseLeave={(e) => { if (!isLoading) { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#475569'; } }}
                                >
                                    <RotateCw
                                        size={12}
                                        style={{
                                            transform: isLoading ? 'rotate(360deg)' : 'none',
                                            transition: isLoading ? 'transform 0.6s linear infinite' : 'none'
                                        }}
                                    />
                                    <span>새로고침</span>
                                </button>
                            </div>
                        </div>

                        {/* 신텍스 텍스트 본문 (라이트 코드 뷰어 + 라인 번호 거터) */}
                        <div
                            className="custom-scrollbar"
                            style={{
                                position: 'relative',
                                flex: 1,
                                minHeight: isCustomOpen ? '180px' : '220px',
                                backgroundColor: '#f8fafc',
                                overflowY: 'auto',
                                overflowX: 'hidden'
                            }}
                        >
                            {isLoading ? (
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: '100%',
                                    minHeight: '200px',
                                    gap: '8px',
                                    color: '#64748b',
                                    fontSize: '13px'
                                }}>
                                    <div className="animate-spin" style={{ width: '20px', height: '20px', border: '2px solid var(--srt-primary-500, #3b82f6)', borderTopColor: 'transparent', borderRadius: '50%' }} />
                                    <span>SPSS 신텍스를 생성하고 있습니다...</span>
                                </div>
                            ) : syntaxLines.length === 0 ? (
                                <div style={{ padding: '16px', color: '#94a3b8', fontSize: '12.5px', fontStyle: 'italic' }}>
                                    * 변환 가능한 계산 문항이 없습니다.
                                </div>
                            ) : (
                                <div style={{
                                    display: 'flex',
                                    minHeight: '100%',
                                    fontFamily: "Consolas, Monaco, 'Courier New', monospace",
                                    fontSize: '12px',
                                    lineHeight: '1.7'
                                }}>
                                    {/* 좌측 라인 번호 열 (Line Numbers Gutter) */}
                                    <div style={{
                                        padding: '12px 10px',
                                        textAlign: 'right',
                                        userSelect: 'none',
                                        color: '#94a3b8',
                                        backgroundColor: '#f1f5f9',
                                        borderRight: '1px solid #e2e8f0',
                                        minWidth: '38px',
                                        flexShrink: 0
                                    }}>
                                        {syntaxLines.map((_, i) => (
                                            <div key={i}>{i + 1}</div>
                                        ))}
                                    </div>

                                    {/* 우측 코드 텍스트 영역 */}
                                    <div style={{
                                        padding: '12px 14px',
                                        flex: 1,
                                        minWidth: 0,
                                        overflowX: 'auto',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-all',
                                        overflowWrap: 'anywhere'
                                    }}>
                                        {syntaxLines.map((line, idx) => {
                                            const trimmed = line.trim();
                                            const isComment = trimmed.startsWith('*');

                                            if (isComment) {
                                                return (
                                                    <div
                                                        key={idx}
                                                        style={{
                                                            color: '#64748b',
                                                            fontStyle: 'italic',
                                                            fontWeight: 400
                                                        }}
                                                    >
                                                        {line || '\u00A0'}
                                                    </div>
                                                );
                                            }

                                            // SPSS 키워드 하이라이팅 (NUMERIC, VARIABLE LABELS, IF, DO IF, ELSE, END IF 등)
                                            const tokens = line.split(/(\b(?:NUMERIC|VARIABLE LABELS|VALUE LABELS|ADD VALUE LABELS|DO IF|ELSE IF|ELSE|END IF|IF|EXECUTE|COMPUTE|RECODE|MRSETS|ANY)\b|'[^']*'|"[^"]*")/g);

                                            return (
                                                <div
                                                    key={idx}
                                                    style={{
                                                        color: '#334155',
                                                        fontWeight: 400
                                                    }}
                                                >
                                                    {tokens.map((token, tIdx) => {
                                                        const isKeyword = /^(NUMERIC|VARIABLE LABELS|VALUE LABELS|ADD VALUE LABELS|DO IF|ELSE IF|ELSE|END IF|IF|EXECUTE|COMPUTE|RECODE|MRSETS|ANY)$/.test(token);
                                                        const isString = /^('[^']*'|"[^"]*")$/.test(token);
                                                        if (isKeyword) {
                                                            return (
                                                                <span key={tIdx} style={{ color: 'var(--srt-primary-600, #2563eb)', fontWeight: 600 }}>
                                                                    {token}
                                                                </span>
                                                            );
                                                        }
                                                        if (isString) {
                                                            return (
                                                                <span key={tIdx} style={{ color: '#047857', fontWeight: 400 }}>
                                                                    {token}
                                                                </span>
                                                            );
                                                        }
                                                        return <span key={tIdx}>{token}</span>;
                                                    })}
                                                    {tokens.length === 0 && '\u00A0'}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 푸터 영역 (변수조합기 / AI조건식 팝업 표준) */}
                <div className="filter-popup-footer-cbp" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px 24px',
                    borderTop: '1px solid #e2e8f0',
                    background: '#ffffff',
                    flexShrink: 0
                }}>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                        ※ 원본 .sav 파일을 SPSS에서 열고 이 신텍스를 실행(Run)하면 맨 마지막 열에 변수가 추가됩니다.
                    </div>
                    <div className="footer-right-cbp" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button type="button" className="btn-cancel-cbp" onClick={onClose}>
                            닫기
                        </button>

                        <button
                            type="button"
                            className="btn-apply-cbp"
                            onClick={handleDownload}
                            disabled={!syntaxContent || isLoading || isDownloading}
                            style={{
                                background: 'var(--srt-primary-600, #2563eb)',
                                borderColor: 'var(--srt-primary-600, #2563eb)',
                                color: '#ffffff',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                height: '36px',
                                padding: '0 18px',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: 600,
                                opacity: (!syntaxContent || isLoading || isDownloading) ? 0.5 : 1,
                                cursor: (!syntaxContent || isLoading || isDownloading) ? 'default' : 'pointer',
                                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                            }}
                        >
                            {isDownloading ? (
                                <>
                                    <div className="animate-spin" style={{ width: '13px', height: '13px', border: '2px solid #ffffff', borderTopColor: 'transparent', borderRadius: '50%' }} />
                                    <span style={{ color: '#ffffff', fontWeight: 600 }}>다운로드 중...</span>
                                </>
                            ) : (
                                <>
                                    <Download size={15} color="#ffffff" />
                                    <span style={{ color: '#ffffff', fontWeight: 600 }}>.sps 파일 다운로드</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
                .spss-opt-dropdown.k-dropdownlist,
                .spss-opt-dropdown.k-picker {
                    height: 32px !important;
                    font-size: 12px !important;
                }
                .spss-opt-dropdown .k-input-inner,
                .spss-opt-dropdown .k-input-value-text,
                .spss-opt-dropdown span {
                    font-size: 12px !important;
                    color: #1e293b !important;
                    line-height: 30px !important;
                }
                .spss-opt-dropdown .k-input-inner {
                    padding: 0 8px !important;
                    display: flex !important;
                    align-items: center !important;
                }
                .spss-opt-dropdown-popup .k-list-item,
                .spss-opt-dropdown-popup .k-item,
                .spss-opt-dropdown-popup .k-list-item-text,
                .spss-opt-dropdown-popup span {
                    font-size: 12px !important;
                    padding: 6px 10px !important;
                    line-height: 1.4 !important;
                }
            `}</style>
        </div>
    );
};

export default SpssSyntaxExportModal;
