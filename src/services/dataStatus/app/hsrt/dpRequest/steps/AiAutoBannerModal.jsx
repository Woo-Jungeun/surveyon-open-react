import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import * as XLSX from 'xlsx';
import { X, Sparkles, Upload, RotateCw, Plus, Trash2, FileText } from 'lucide-react';
import { DpRequestPageApi } from '../DpRequestPageApi';

const AiAutoBannerModal = ({ isOpen, onClose, onApplyToCurrent, onCreateNewBanner, currentBannerLabel }) => {
    const auth = useSelector((store) => store.auth);
    const user = auth?.user?.userId || '';
    const { getAiModels, autoGenerateBannerAsync, getBannerJobStatus, recalculateBannerCounts } = DpRequestPageApi();

    const [models, setModels] = useState([]);
    const [selectedModel, setSelectedModel] = useState('');
    const [userInput, setUserInput] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [jobId, setJobId] = useState(null);
    const [items, setItems] = useState([]);
    const [newBannerName, setNewBannerName] = useState('');
    const [isRecalculating, setIsRecalculating] = useState(false);
    const fileInputRef = useRef(null);
    const timerRef = useRef(null);
    const pollIntervalRef = useRef(null);

    // 1. 모달 오픈/클로즈 상태 변경 시 기존 데이터 전면 초기화 및 AI 모델 목록 로드
    useEffect(() => {
        const clearTimers = () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
        };

        const resetAllData = () => {
            setUserInput('');
            setItems([]);
            setNewBannerName('');
            setIsAnalyzing(false);
            setElapsedSeconds(0);
            setJobId(null);
            setIsRecalculating(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            clearTimers();
        };

        if (!isOpen) {
            resetAllData();
            return;
        }

        // 모달이 새로 열릴 때 기존 입력값 및 분석 결과 완전 초기화
        resetAllData();

        const fetchModels = async () => {
            const pageId = sessionStorage.getItem('pageId') || '';
            try {
                const res = await getAiModels.mutateAsync({ user, pageId });
                if (res && (res.success === 777 || res.success === '777') && Array.isArray(res.resultjson) && res.resultjson.length > 0) {
                    setModels(res.resultjson);
                    setSelectedModel(res.resultjson[0]?.value || '');
                } else {
                    setModels([]);
                    setSelectedModel('');
                }
            } catch (err) {
                console.error("Failed to fetch AI models:", err);
                setModels([]);
                setSelectedModel('');
            }
        };

        fetchModels();
    }, [isOpen]);

    // 타이머 및 폴링 클린업
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, []);

    if (!isOpen) return null;

    // 엑셀 / 파일 업로드 로직
    const handleFileUpload = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        // 신규 파일 업로드 시 기존 결과 프리뷰 및 배너명 초기화
        setItems([]);
        setNewBannerName('');
        setJobId(null);

        const reader = new FileReader();

        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            reader.onload = (evt) => {
                try {
                    const data = new Uint8Array(evt.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const tsvText = XLSX.utils.sheet_to_csv(worksheet, { FS: '\t' });
                    setUserInput(tsvText);
                } catch (err) {
                    console.error("Excel parse error:", err);
                    alert("엑셀 파일을 읽는 중 오류가 발생했습니다.");
                } finally {
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            reader.onload = (evt) => {
                setUserInput(evt.target.result || '');
                if (fileInputRef.current) fileInputRef.current.value = '';
            };
            reader.readAsText(file, 'UTF-8');
        }
    };

    // 드래그앤드롭 로직
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const file = e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) {
            const fakeEvent = { target: { files: [file] } };
            handleFileUpload(fakeEvent);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    // AI 자동분석 시작 (비동기 처리 & 폴링)
    const handleStartAnalysis = async () => {
        if (!userInput.trim()) {
            alert("배너 정의 내용(텍스트 또는 파일)을 입력해주세요.");
            return;
        }

        const pageId = sessionStorage.getItem('pageId') || '';

        try {
            setIsAnalyzing(true);
            setElapsedSeconds(0);

            // 기존 폴링 및 타이머 정리
            if (timerRef.current) clearInterval(timerRef.current);
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

            // 초 단위 타이머
            timerRef.current = setInterval(() => {
                setElapsedSeconds(prev => prev + 1);
            }, 1000);

            const payload = {
                pageId,
                userInput: userInput.trim(),
                modelKey: selectedModel || models[0]?.value || '',
                user
            };

            const startRes = await autoGenerateBannerAsync.mutateAsync(payload);
            if (!startRes || (startRes.success !== 777 && startRes.success !== '777') || !startRes.resultjson?.jobId) {
                throw new Error(startRes?.message || "AI 비동기 분석 요청 실패");
            }

            const currentJobId = startRes.resultjson.jobId;
            setJobId(currentJobId);

            // 2초 간격 폴링
            pollIntervalRef.current = setInterval(async () => {
                try {
                    const statusRes = await getBannerJobStatus.mutateAsync({ jobId: currentJobId, user });
                    if (statusRes && (statusRes.success === 777 || statusRes.success === '777')) {
                        const jobData = statusRes.resultjson || {};
                        const status = jobData.status;

                        if (status === 'completed') {
                            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                            if (timerRef.current) clearInterval(timerRef.current);
                            setIsAnalyzing(false);

                            const rawItems = jobData.items || [];
                            const formattedItems = rawItems.map((it, idx) => ({
                                id: `ai_${idx}_${Date.now()}`,
                                label3: it.label3 || '',
                                label2: it.label2 || '',
                                label: it.label || '',
                                logic: it.logic || '',
                                count: it.count ?? 0,
                                selected: true
                            }));
                            setItems(formattedItems);
                        } else if (status === 'failed') {
                            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                            if (timerRef.current) clearInterval(timerRef.current);
                            setIsAnalyzing(false);
                            alert(`AI 분석 실패: ${jobData.errorMessage || '오류가 발생했습니다.'}`);
                        }
                    }
                } catch (err) {
                    console.error("Polling job status error:", err);
                }
            }, 2000);

        } catch (err) {
            console.error("AI Start Analysis error:", err);
            if (timerRef.current) clearInterval(timerRef.current);
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setIsAnalyzing(false);
            alert("AI 분석 시작 요청 중 오류가 발생했습니다.");
        }
    };

    // N수 재계산 (POST /variables/ai/recalculate-banner-counts)
    const handleRecalculate = async () => {
        if (items.length === 0) return;

        const pageId = sessionStorage.getItem('pageId') || '';

        try {
            setIsRecalculating(true);
            const payload = {
                pageId,
                items: items.map(it => ({
                    label3: it.label3 || '',
                    label2: it.label2 || '',
                    label: it.label || '',
                    logic: it.logic || ''
                })),
                user
            };

            const res = await recalculateBannerCounts.mutateAsync(payload);
            if (res && (res.success === 777 || res.success === '777') && res.resultjson?.items) {
                const updatedList = res.resultjson.items;
                setItems(prev => prev.map((item, idx) => ({
                    ...item,
                    count: updatedList[idx]?.count ?? item.count
                })));
            }
        } catch (err) {
            console.error("Recalculate error:", err);
            alert("N수 재계산 중 오류가 발생했습니다.");
        } finally {
            setIsRecalculating(false);
        }
    };

    // 행 추가 (특정 위치 아래에 삽입)
    const handleInsertRowBelow = (index) => {
        const newItem = {
            id: `ai_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            label3: '',
            label2: '',
            label: '',
            logic: '',
            count: 0,
            selected: true
        };
        setItems(prev => {
            const next = [...prev];
            if (index !== undefined && index >= 0) {
                next.splice(index + 1, 0, newItem);
            } else {
                next.push(newItem);
            }
            return next;
        });
    };

    const handleAddRow = (index) => handleInsertRowBelow(index);

    // 행 수정
    const handleItemChange = (index, field, value) => {
        setItems(prev => prev.map((item, idx) => idx === index ? { ...item, [field]: value } : item));
    };

    // 행 삭제
    const handleDeleteRow = (index) => {
        setItems(prev => prev.filter((_, idx) => idx !== index));
    };

    // 전체 선택 / 해제
    const selectedCount = items.filter(i => i.selected).length;
    const isAllSelected = items.length > 0 && selectedCount === items.length;

    const toggleSelectAll = () => {
        setItems(prev => prev.map(i => ({ ...i, selected: !isAllSelected })));
    };

    const toggleSelectRow = (index) => {
        setItems(prev => prev.map((item, idx) => idx === index ? { ...item, selected: !item.selected } : item));
    };

    // 적용 이벤트
    const handleApplyCurrent = () => {
        const selectedItems = items.filter(i => i.selected);
        if (selectedItems.length === 0) {
            alert("등록할 배너 항목을 선택해주세요.");
            return;
        }
        onApplyToCurrent(selectedItems);
    };

    const handleCreateNew = () => {
        const selectedItems = items.filter(i => i.selected);
        if (selectedItems.length === 0) {
            alert("등록할 배너 항목을 선택해주세요.");
            return;
        }
        onCreateNewBanner(selectedItems, newBannerName);
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999
        }}>
            <div style={{
                width: '1240px',
                maxHeight: '92vh',
                height: '820px',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                fontFamily: "'Pretendard', sans-serif"
            }}>
                {/* 1. Modal Header */}
                <div style={{
                    padding: '16px 24px',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#ffffff'
                }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                                display: 'inline-block',
                                width: '3.5px',
                                height: '16px',
                                backgroundColor: '#2563eb',
                                borderRadius: '2px'
                            }} />
                            <span style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>AI 자동 배너생성</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                            엑셀 파일이나 텍스트를 입력하면 내부 AI가 설문 문항을 분석하여 대/중/소분류와 조건식을 자동으로 구성합니다.
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: '#64748b', padding: '6px', borderRadius: '6px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* 2. Modal Body (2 Columns Split) */}
                <div style={{
                    flex: 1,
                    display: 'grid',
                    gridTemplateColumns: '1fr 1.3fr',
                    gap: '16px',
                    padding: '16px 24px',
                    backgroundColor: '#f8fafc',
                    overflow: 'hidden'
                }}>
                    {/* Left Column: Input Panel */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '14px',
                        gap: '10px',
                        minHeight: 0,
                        overflow: 'hidden'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                                1. 배너 정의 내용 (엑셀 또는 텍스트)
                            </span>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                accept=".xlsx, .xls, .csv, .txt, .tsv"
                                style={{ display: 'none' }}
                            />
                            <button
                                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '5px 10px', fontSize: '11.5px', fontWeight: 600,
                                    color: '#475569', backgroundColor: '#f1f5f9',
                                    border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                            >
                                <Upload size={13} /> 엑셀 파일 열기 (.xlsx)
                            </button>
                        </div>

                        {/* Textarea Area */}
                        <div
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}
                        >
                            <textarea
                                wrap="off"
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                placeholder={`엑셀 파일을 끌어다 놓거나, 배너 정의 텍스트를 직접 붙여넣으세요.

[작성 예시]
[성별 및 연령]
- 성별: 남성 (q1=1), 여성 (q1=2)
- 연령: 20대 (q2 in [1,2]), 30대 (q2 in [3,4]), 40대 이상 (q2 >= 5)

[브랜드 인지도]
- 브랜드 인지자: Q5 1~3순위 선택자
- 최근 1개월 내 구매자: Q6 == 1`}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    resize: 'none',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '8px',
                                    padding: '12px',
                                    fontSize: '12.5px',
                                    fontFamily: 'monospace',
                                    lineHeight: '1.6',
                                    color: '#1e293b',
                                    backgroundColor: '#fafafa',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    whiteSpace: 'pre',
                                    overflowX: 'auto',
                                    overflowY: 'auto'
                                }}
                            />
                        </div>

                        {/* Left Panel Bottom Action Bar */}
                        <div style={{ marginTop: '4px' }}>
                            <button
                                onClick={handleStartAnalysis}
                                disabled={isAnalyzing || !userInput.trim()}
                                style={{
                                    width: '100%',
                                    height: '38px',
                                    borderRadius: '6px',
                                    background: isAnalyzing
                                        ? '#94a3b8'
                                        : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                                    color: '#ffffff',
                                    border: 'none',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    cursor: isAnalyzing || !userInput.trim() ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
                                    transition: 'all 0.15s'
                                }}
                            >
                                <Sparkles size={15} />
                                {isAnalyzing ? `분석 진행 중... (${elapsedSeconds}초)` : (items.length > 0 ? '다시 분석하기' : 'AI 분석 시작')}
                            </button>
                        </div>
                    </div>

                    {/* Right Column: Preview & Edit Panel */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '14px',
                        gap: '10px',
                        minHeight: 0,
                        overflow: 'hidden'
                    }}>
                        {/* Right Panel Header Bar */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                                    2. 생성 결과 검토 & 프리뷰
                                </span>
                                <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>
                                    선택: <strong style={{ color: '#2563eb' }}>{selectedCount}</strong> / {items.length}건
                                </span>
                            </div>

                            {/* Top Right Buttons inside Panel 2 */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginRight: '4px' }}>
                                    <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                                        신규 배너명
                                    </span>
                                    <input
                                        type="text"
                                        value={newBannerName}
                                        onChange={(e) => setNewBannerName(e.target.value)}
                                        placeholder="신규 배너명을 입력하세요"
                                        style={{
                                            height: '26px',
                                            width: '150px',
                                            padding: '0 8px',
                                            fontSize: '11.5px',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '6px',
                                            outline: 'none',
                                            color: '#1e293b',
                                            backgroundColor: '#ffffff',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                                <button
                                    onClick={handleRecalculate}
                                    disabled={isRecalculating || items.length === 0}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '5px',
                                        padding: '4px 10px', fontSize: '11.5px', fontWeight: 600,
                                        color: '#3b82f6', backgroundColor: '#eff6ff',
                                        border: '1px solid #bfdbfe', borderRadius: '6px', cursor: 'pointer'
                                    }}
                                >
                                    <RotateCw size={12} className={isRecalculating ? 'spin' : ''} /> N수 재계산
                                </button>
                            </div>
                        </div>

                        {/* Preview Table Grid */}
                        <div className="custom-scrollbar" style={{
                            flex: 1,
                            minHeight: 0,
                            overflowY: 'auto',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            backgroundColor: '#ffffff'
                        }}>
                            {items.length === 0 ? (
                                <div style={{
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#94a3b8',
                                    gap: '8px'
                                }}>
                                    <FileText size={32} strokeWidth={1.5} color="#cbd5e1" />
                                    <span style={{ fontSize: '13px', fontWeight: 500 }}>좌측에 배너 정의서를 입력하고 [AI 분석 시작]을 눌러주세요.</span>
                                </div>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                                    <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', zIndex: 5 }}>
                                        <tr>
                                            <th style={{ width: '32px', padding: '6px 4px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                <label className="dp-checkbox-label" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', verticalAlign: 'middle' }}>
                                                    <input
                                                        type="checkbox"
                                                        className="dp-checkbox-input"
                                                        checked={isAllSelected}
                                                        onChange={toggleSelectAll}
                                                    />
                                                    <span className="dp-checkbox-box" />
                                                </label>
                                            </th>
                                            <th style={{ width: '28px', padding: '6px 2px', textAlign: 'center', color: '#475569', fontWeight: 700, fontSize: '11px', whiteSpace: 'nowrap', verticalAlign: 'middle' }} title="아래에 행 추가">+</th>
                                            <th style={{ width: '85px', padding: '6px 4px', textAlign: 'left', color: '#475569', fontWeight: 700, fontSize: '11px', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>대분류</th>
                                            <th style={{ width: '95px', padding: '6px 4px', textAlign: 'left', color: '#475569', fontWeight: 700, fontSize: '11px', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>중분류</th>
                                            <th style={{ width: '115px', padding: '6px 4px', textAlign: 'left', color: '#475569', fontWeight: 700, fontSize: '11px', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>소분류(항목명)</th>
                                            <th style={{ padding: '6px 4px', textAlign: 'left', color: '#475569', fontWeight: 700, fontSize: '11px', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>문항 조건식 (logic)</th>
                                            <th style={{ width: '75px', padding: '6px 14px 6px 4px', textAlign: 'right', color: '#475569', fontWeight: 700, fontSize: '11px', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>빈도(N)</th>
                                            <th style={{ width: '36px', padding: '6px 4px', textAlign: 'center', verticalAlign: 'middle' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item, idx) => (
                                            <tr key={item.id || idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: item.selected ? '#ffffff' : '#f8fafc' }}>
                                                <td style={{ textAlign: 'center', padding: '6px', verticalAlign: 'middle' }}>
                                                    <label className="dp-checkbox-label" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', verticalAlign: 'middle' }}>
                                                        <input
                                                            type="checkbox"
                                                            className="dp-checkbox-input"
                                                            checked={item.selected}
                                                            onChange={() => toggleSelectRow(idx)}
                                                        />
                                                        <span className="dp-checkbox-box" />
                                                    </label>
                                                </td>
                                                <td style={{ textAlign: 'center', padding: '4px', verticalAlign: 'middle' }}>
                                                    <button
                                                        className="dp-ai-plus-btn"
                                                        onClick={() => handleInsertRowBelow(idx)}
                                                        title="아래에 행 추가"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </td>
                                                <td style={{ padding: '4px 6px', verticalAlign: 'middle' }}>
                                                    <input
                                                        type="text"
                                                        value={item.label3}
                                                        placeholder="대분류"
                                                        onChange={(e) => handleItemChange(idx, 'label3', e.target.value)}
                                                        style={{
                                                            width: '100%', height: '28px', padding: '0 6px', fontSize: '11.5px',
                                                            border: '1px solid #e2e8f0', borderRadius: '4px', outline: 'none',
                                                            boxSizing: 'border-box'
                                                        }}
                                                    />
                                                </td>
                                                <td style={{ padding: '4px 6px', verticalAlign: 'middle' }}>
                                                    <input
                                                        type="text"
                                                        value={item.label2}
                                                        placeholder="중분류"
                                                        onChange={(e) => handleItemChange(idx, 'label2', e.target.value)}
                                                        style={{
                                                            width: '100%', height: '28px', padding: '0 6px', fontSize: '11.5px',
                                                            border: '1px solid #e2e8f0', borderRadius: '4px', outline: 'none',
                                                            boxSizing: 'border-box'
                                                        }}
                                                    />
                                                </td>
                                                <td style={{ padding: '4px 6px', verticalAlign: 'middle' }}>
                                                    <input
                                                        type="text"
                                                        value={item.label}
                                                        placeholder="소분류 항목명"
                                                        onChange={(e) => handleItemChange(idx, 'label', e.target.value)}
                                                        style={{
                                                            width: '100%', height: '28px', padding: '0 6px', fontSize: '11.5px', fontWeight: 600,
                                                            border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none',
                                                            boxSizing: 'border-box'
                                                        }}
                                                    />
                                                </td>
                                                <td style={{ padding: '4px 6px', verticalAlign: 'middle' }}>
                                                    <input
                                                        type="text"
                                                        value={item.logic}
                                                        placeholder="조건식 (예: q100 == 1)"
                                                        onChange={(e) => handleItemChange(idx, 'logic', e.target.value)}
                                                        style={{
                                                            width: '100%', height: '28px', padding: '0 6px', fontSize: '11px', fontFamily: 'monospace',
                                                            border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none', color: '#1e293b',
                                                            boxSizing: 'border-box'
                                                        }}
                                                    />
                                                </td>
                                                <td style={{ padding: '4px 14px 4px 6px', textAlign: 'right', fontWeight: 700, color: '#334155', verticalAlign: 'middle' }}>
                                                    {item.count !== undefined && item.count !== null ? Number(item.count).toLocaleString() : 0}
                                                </td>
                                                <td style={{ textAlign: 'center', padding: '4px 6px', verticalAlign: 'middle' }}>
                                                    <button
                                                        className="dp-ai-trash-btn"
                                                        onClick={() => handleDeleteRow(idx)}
                                                        title="행 삭제"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. Modal Footer */}
                <div style={{
                    padding: '14px 24px',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#ffffff'
                }}>
                    <div style={{ fontSize: '12.5px', color: '#475569' }}>
                        {/* 선택된 <strong style={{ color: '#4f46e5' }}>{selectedCount}개</strong> 항목을 배너로 등록합니다. */}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '8px 16px', fontSize: '13px', fontWeight: 600,
                                color: '#475569', backgroundColor: '#ffffff',
                                border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer'
                            }}
                        >
                            취소
                        </button>
                        <button
                            onClick={handleApplyCurrent}
                            disabled={selectedCount === 0}
                            style={{
                                padding: '8px 16px', fontSize: '13px', fontWeight: 700,
                                color: '#2563eb', backgroundColor: '#eff6ff',
                                border: '1px solid #93c5fd', borderRadius: '6px', cursor: selectedCount === 0 ? 'not-allowed' : 'pointer'
                            }}
                        >
                            현재 배너에 추가
                        </button>
                        <button
                            onClick={handleCreateNew}
                            disabled={selectedCount === 0}
                            style={{
                                padding: '8px 18px', fontSize: '13px', fontWeight: 700,
                                color: '#ffffff', backgroundColor: '#2563eb',
                                border: 'none', borderRadius: '6px', cursor: selectedCount === 0 ? 'not-allowed' : 'pointer',
                                boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)'
                            }}
                        >
                            새 배너로 생성
                        </button>
                    </div>
                </div>
            </div>
            <style>{`
                .dp-ai-model-popup,
                .k-animation-container {
                    z-index: 1000000 !important;
                }
                .dp-ai-trash-btn {
                    background: transparent !important;
                    border: none !important;
                    cursor: pointer !important;
                    color: #94a3b8 !important;
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    padding: 4px !important;
                    border-radius: 4px !important;
                    vertical-align: middle !important;
                    transition: color 0.15s ease, background-color 0.15s ease !important;
                }
                .dp-ai-trash-btn:hover {
                    color: #ef4444 !important;
                    background-color: #fef2f2 !important;
                }
                .dp-ai-trash-btn svg {
                    pointer-events: none;
                    display: block;
                }
                .dp-ai-plus-btn {
                    background: transparent !important;
                    border: none !important;
                    cursor: pointer !important;
                    color: #3b82f6 !important;
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    padding: 4px !important;
                    border-radius: 4px !important;
                    vertical-align: middle !important;
                    transition: color 0.15s ease, background-color 0.15s ease !important;
                }
                .dp-ai-plus-btn:hover {
                    color: #1d4ed8 !important;
                    background-color: #eff6ff !important;
                }
                .dp-ai-plus-btn svg {
                    pointer-events: none;
                    display: block;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f5f9;
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
            `}</style>
        </div>
    );
};

export default AiAutoBannerModal;
