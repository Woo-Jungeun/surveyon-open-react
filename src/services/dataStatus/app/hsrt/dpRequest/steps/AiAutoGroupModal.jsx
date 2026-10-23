import React, { useState, useEffect, useRef, useContext } from 'react';
import { useSelector } from 'react-redux';
import { modalContext } from '@/components/common/Modal.jsx';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import * as XLSX from 'xlsx';
import { X, Sparkles, Upload, Plus, Trash2, FileText, ChevronDown } from 'lucide-react';
import { DpRequestPageApi } from '../DpRequestPageApi';

// 결과 행 기본값
const newRowId = () => `g_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
const toText = (v) => (Array.isArray(v) ? v.join(', ') : (v == null ? '' : String(v)));
import { TIER_OPTIONS, insertSiblingRow } from './groupTierOptions';

// API 응답 안에서 groups 배열 찾기 (형태가 확정되지 않아 넓게 탐색)
const findGroups = (payload, depth = 0) => {
    if (payload == null || depth > 4) return null;
    if (typeof payload === 'string') {
        try { return findGroups(JSON.parse(payload), depth + 1); } catch { return null; }
    }
    if (Array.isArray(payload)) {
        if (payload.length && payload.every(g => g && typeof g === 'object' && ('label' in g || 'values' in g || 'values_text' in g))) return payload;
        for (const p of payload) { const r = findGroups(p, depth + 1); if (r) return r; }
        return null;
    }
    if (typeof payload === 'object') {
        if (Array.isArray(payload.groups)) return payload.groups;
        for (const k of ['resultjson', 'result', 'data', 'payload', 'preset']) {
            const r = findGroups(payload[k], depth + 1);
            if (r) return r;
        }
    }
    return null;
};

const inputStyle = {
    width: '100%', height: '28px', padding: '0 6px', fontSize: '11.5px',
    border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none', boxSizing: 'border-box'
};
const thStyle = { padding: '6px 4px', textAlign: 'left', color: '#475569', fontWeight: 700, fontSize: '11px', whiteSpace: 'nowrap', verticalAlign: 'middle' };

/**
 * 표설정 → 그룹 묶기 → AI 자동 그룹 생성
 * 디자인은 AiAutoBannerModal과 맞춤
 */
const AiAutoGroupModal = ({ isOpen, onClose, onCreateNew, onOverwrite, overwriteTargetName, defaultPresetName, initialGenCrosstab, onGenCrosstabChange }) => {
    const modal = useContext(modalContext);
    const auth = useSelector((store) => store.auth);
    const user = auth?.user?.userId || '';
    const { getAiModels, autoGenerateGroupAsync, getGroupJobStatus } = DpRequestPageApi();

    const DEFAULT_MODEL = 'llm-gpt-oss-120b';
    const [modelOptions, setModelOptions] = useState([]); // /variables/ai/models 목록
    const [modelKey, setModelKey] = useState(DEFAULT_MODEL);
    const [userInput, setUserInput] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [progressMsg, setProgressMsg] = useState('');
    const [items, setItems] = useState([]);
    const [presetName, setPresetName] = useState('');
    const [showNameModal, setShowNameModal] = useState(false);
    const [genCrosstab, setGenCrosstab] = useState(false); // 그룹 전용 교차표 추가 생성
    const fileInputRef = useRef(null);
    const timerRef = useRef(null);
    const timeoutRef = useRef(null);

    const cleanup = () => {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        if (timeoutRef.current) { clearInterval(timeoutRef.current); clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    };

    useEffect(() => {
        cleanup();
        setUserInput('');
        setItems([]);
        setIsAnalyzing(false);
        setElapsedSeconds(0);
        setProgressMsg('');
        setPresetName(defaultPresetName || '');
        setGenCrosstab(!!initialGenCrosstab);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (!isOpen) return;

        const pageId = sessionStorage.getItem('pageId') || '';
        getAiModels.mutateAsync({ user, pageId })
            .then(res => {
                const raw = String(res?.success) === '777' && Array.isArray(res?.resultjson) ? res.resultjson : [];
                const list = raw.filter(m => m?.value != null).map(m => ({ value: String(m.value), text: String(m.label ?? m.text ?? m.value) }));
                setModelOptions(list);
                // 기본값: llm-gpt-oss-120b (목록에 없으면 첫 번째)
                setModelKey(list.some(m => m.value === DEFAULT_MODEL) ? DEFAULT_MODEL : (list[0]?.value || DEFAULT_MODEL));
            })
            .catch(err => { console.error('Failed to fetch AI models:', err); setModelOptions([]); setModelKey(DEFAULT_MODEL); });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    useEffect(() => () => cleanup(), []);

    if (!isOpen) return null;

    // 엑셀 / 텍스트 파일
    const handleFileUpload = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        if (/\.xlsx?$/i.test(file.name)) {
            reader.onload = (evt) => {
                try {
                    const wb = XLSX.read(new Uint8Array(evt.target.result), { type: 'array' });
                    const sheetName = wb.SheetNames.find(n => /group|그룹|stt/i.test(n)) || wb.SheetNames[0];
                    setUserInput(XLSX.utils.sheet_to_csv(wb.Sheets[sheetName], { FS: '\t' }));
                } catch (err) {
                    console.error('Excel parse error:', err);
                    modal.showAlert('알림', '엑셀 파일을 읽는 중 오류가 발생했습니다.');
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

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) handleFileUpload({ target: { files: [file] } });
    };

    const finish = () => {
        cleanup();
        setIsAnalyzing(false);
    };

    const applyResult = (groups) => {
        finish();
        setItems((groups || []).map(g => ({
            id: g.id || newRowId(),
            tier: Number(g.tier) === 2 ? 2 : 1,
            label: g.label || '',
            values: g.values_text || toText(g.values),
            bottom_values: g.bottom_values_text || toText(g.bottom_values),
            selected: true,
        })));
    };

    // AI 생성 실행 — jobId 받은 뒤 상태 조회 API로 결과 확인
    const handleStart = async () => {
        if (!userInput.trim()) {
            modal.showAlert('알림', '그룹 분류 정의를 입력해 주세요.');
            return;
        }
        cleanup();
        setIsAnalyzing(true);
        setElapsedSeconds(0);
        setProgressMsg('');
        timerRef.current = setInterval(() => setElapsedSeconds(p => p + 1), 1000);

        try {
            const res = await autoGenerateGroupAsync.mutateAsync({
                pageId: sessionStorage.getItem('pageId') || '',
                user,
                userInput: userInput.trim(),
                modelKey,
            });
            if (!res || String(res.success) !== '777') {
                throw new Error(res?.resultjson?.errorcontent || res?.message || 'AI 그룹 생성 요청 실패');
            }
            const jobId = res?.resultjson?.jobId;
            if (!jobId) throw new Error('작업 ID를 받지 못했습니다.');

            // 상태 조회 폴링 — processing 동안 2초마다, completed/failed 면 중단
            let busy = false;
            timeoutRef.current = setInterval(async () => {
                if (busy) return;
                busy = true;
                try {
                    const st = await getGroupJobStatus.mutateAsync({ jobId, user });
                    const r = st?.resultjson;
                    if (!r) {
                        finish();
                        modal.showAlert('알림', st?.message || '작업을 찾을 수 없습니다.');
                        return;
                    }
                    if (r.status === 'completed') {
                        const groups = Array.isArray(r.items) ? r.items : [];
                        if (groups.length) applyResult(groups);
                        else { finish(); modal.showAlert('알림', 'AI 그룹 생성 결과가 없습니다.'); }
                    } else if (r.status === 'failed') {
                        finish();
                        modal.showAlert('알림', `AI 그룹 생성 실패: ${r.errorMessage || '오류가 발생했습니다.'}`);
                    }
                } catch (err) {
                    console.error('AI group status error:', err);
                    finish();
                    modal.showAlert('알림', err?.response?.data?.message || '작업 상태 조회 중 오류가 발생했습니다.');
                } finally {
                    busy = false;
                }
            }, 2000);
        } catch (err) {
            console.error('AI group start error:', err);
            finish();
            modal.showAlert('알림', err?.message || 'AI 그룹 생성 요청 중 오류가 발생했습니다.');
        }
    };

    // 행 편집
    const updateItem = (idx, field, value) => setItems(prev => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
    // 대분류 [+] → 소속 중분류들 아래에 대분류 / 중분류 [+] → 바로 아래 중분류
    const insertBelow = (idx) => setItems(prev => insertSiblingRow(prev, idx, { id: newRowId(), label: '', values: '', bottom_values: '', selected: true }));
    const deleteItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

    const selectedCount = items.filter(i => i.selected).length;
    const isAllSelected = items.length > 0 && selectedCount === items.length;
    const selectedItems = () => items.filter(i => i.selected);

    const handleCreate = () => {
        const sel = selectedItems();
        if (!sel.length) { modal.showAlert('알림', '적용할 그룹을 선택해 주세요.'); return; }
        onCreateNew?.(sel, presetName.trim() || defaultPresetName || '새 그룹 설정', genCrosstab);
    };
    const handleOverwrite = () => {
        const sel = selectedItems();
        if (!sel.length) { modal.showAlert('알림', '적용할 그룹을 선택해 주세요.'); return; }
        onOverwrite?.(sel, '', genCrosstab);
    };

    const disabledBtn = selectedCount === 0;

    return (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
            <div style={{ width: '1240px', maxHeight: '92vh', height: '820px', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Pretendard', sans-serif" }}>
                {/* 1. Header */}
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ display: 'inline-block', width: '3.5px', height: '16px', backgroundColor: '#2563eb', borderRadius: '2px' }} />
                            <span style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>AI 자동 그룹 생성</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                            보기 텍스트나 엑셀 분류표를 입력하면 AI가 대분류 · 중분류, 보기 코드, 하단 고정 코드를 자동으로 구성합니다.
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '6px', borderRadius: '6px', display: 'flex' }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <X size={20} />
                    </button>
                </div>

                {/* 2. Body */}
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '16px', padding: '16px 24px', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
                    {/* 왼쪽: 입력 */}
                    <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', gap: '10px', minHeight: 0, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>1. 그룹 분류 정의 (엑셀 또는 텍스트)</span>
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls, .csv, .txt, .tsv" style={{ display: 'none' }} />
                            <button onClick={() => fileInputRef.current && fileInputRef.current.click()}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', fontSize: '11.5px', fontWeight: 600, color: '#475569', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}>
                                <Upload size={13} /> 엑셀 파일 열기 (.xlsx)
                            </button>
                        </div>

                        <div onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <textarea
                                className="dp-ai-group-input"
                                wrap={userInput ? 'off' : 'soft'}
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                placeholder={`엑셀 파일을 끌어다 놓거나, 텍스트를 직접 붙여넣으세요.

[작성 예시]
1: 이마트, 2: 홈플러스, 3: 롯데마트,
4: CU, 5: GS25, 98: 기타, 99: 없음
→ 대형마트와 편의점으로 나누고
   기타/없음은 하단 고정으로 빼줘.

[2단계 작성 예시]
대분류 전자제품
  └ 중분류 휴대폰 (1, 2)
  └ 중분류 가전 (3, 4, 5)`}
                                style={{ width: '100%', height: '100%', resize: 'none', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', fontSize: '12.5px', fontFamily: 'monospace', lineHeight: '1.6', color: '#1e293b', backgroundColor: '#fafafa', outline: 'none', boxSizing: 'border-box', whiteSpace: userInput ? 'pre' : 'pre-wrap', overflow: 'auto' }}
                            />
                        </div>


                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>AI 모델</span>
                            <div style={{ flex: 1, position: 'relative' }}>
                                <DropDownList
                                    data={modelOptions.length ? modelOptions : [{ value: DEFAULT_MODEL, text: DEFAULT_MODEL }]}
                                    textField="text"
                                    dataItemKey="value"
                                    value={(modelOptions.find(m => m.value === modelKey)) || { value: modelKey, text: modelOptions.find(m => m.value === modelKey)?.text || modelKey }}
                                    onChange={(e) => setModelKey(e.value?.value || DEFAULT_MODEL)}
                                    disabled={isAnalyzing}
                                    className="dp-model-dropdown"
                                    popupSettings={{ popupClass: 'dp-tier-dropdown-popup' }}
                                    style={{ width: '100%' }}
                                />
                                <ChevronDown size={14} color="#3B82F6" style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                            </div>
                        </div>

                        <button
                            onClick={handleStart}
                            disabled={isAnalyzing || !userInput.trim()}
                            style={{ width: '100%', height: '38px', borderRadius: '6px', background: isAnalyzing ? '#94a3b8' : (!userInput.trim() ? '#e2e8f0' : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'), color: !isAnalyzing && !userInput.trim() ? '#94a3b8' : '#ffffff', border: 'none', fontSize: '13px', fontWeight: 700, cursor: isAnalyzing ? 'wait' : (!userInput.trim() ? 'default' : 'pointer'), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: !isAnalyzing && userInput.trim() ? '0 2px 4px rgba(37, 99, 235, 0.25)' : 'none' }}
                        >
                            <Sparkles size={15} />
                            {isAnalyzing ? `분석 진행 중... (${elapsedSeconds}초)` : (items.length > 0 ? '다시 분석하기' : 'AI 분석 시작')}
                        </button>
                        {isAnalyzing && progressMsg && (
                            <div style={{ fontSize: '11.5px', color: '#64748b', textAlign: 'center' }}>{progressMsg}</div>
                        )}
                    </div>

                    {/* 오른쪽: 결과 */}
                    <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', gap: '10px', minHeight: 0, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>2. 결과 확인 및 수정</span>
                                <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>
                                    선택: <strong style={{ color: '#2563eb' }}>{Number(selectedCount || 0).toLocaleString()}</strong> / {Number(items.length || 0).toLocaleString()}건
                                </span>
                            </div>
                            <button onClick={() => insertBelow(undefined)}
                                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', fontSize: '11.5px', fontWeight: 600, color: '#3b82f6', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', cursor: 'pointer' }}>
                                <Plus size={12} /> 그룹 추가
                            </button>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#f8fafc' }}>
                            <label className="dp-checkbox-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none', margin: 0 }}>
                                <input
                                    type="checkbox"
                                    className="dp-checkbox-input"
                                    checked={genCrosstab}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        setGenCrosstab(checked);
                                        onGenCrosstabChange?.(checked);
                                    }}
                                />
                                <span className="dp-checkbox-box" />
                                <span style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>그룹 전용 교차표 추가 생성</span>
                            </label>
                            <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                                {genCrosstab ? '그룹만 있는 교차표를 하나 더 만듭니다.' : '기본: 원본 보기 + 그룹 소계 교차표만 만듭니다.'}
                            </span>
                        </div>

                        <div className="custom-scrollbar" style={{ flex: 1, minHeight: 0, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#ffffff' }}>
                            {items.length === 0 ? (
                                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '8px' }}>
                                    <FileText size={32} strokeWidth={1.5} color="#cbd5e1" />
                                    <span style={{ fontSize: '13px', fontWeight: 500 }}> 왼쪽에 보기 목록을 넣고 [그룹 만들기]를 누르면 여기에 결과가 나옵니다.</span>
                                </div>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                                    <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', zIndex: 5 }}>
                                        <tr>
                                            <th style={{ width: '32px', padding: '6px 4px', textAlign: 'center' }}>
                                                <label className="dp-checkbox-label" style={{ cursor: 'pointer', display: 'inline-flex' }}>
                                                    <input type="checkbox" className="dp-checkbox-input" checked={isAllSelected} onChange={() => setItems(prev => prev.map(i => ({ ...i, selected: !isAllSelected })))} />
                                                    <span className="dp-checkbox-box" />
                                                </label>
                                            </th>
                                            <th style={{ ...thStyle, width: '44px', textAlign: 'center' }} title="아래에 행 추가">+</th>
                                            <th style={{ ...thStyle, width: '112px' }}>단계</th>
                                            <th style={thStyle}>그룹명</th>
                                            <th style={{ ...thStyle, width: '150px' }}>보기 코드</th>
                                            <th style={{ ...thStyle, width: '120px' }} title="그룹 안에서 맨 아래에 고정할 코드">하단 고정 코드</th>
                                            <th style={{ width: '36px' }} />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item, idx) => {
                                            const isSub = Number(item.tier) === 2 && idx > 0;
                                            const locked = idx === 0;
                                            return (
                                                <tr key={item.id} style={{ borderBottom: '1px solid #E2E8F0', borderTop: !isSub && idx > 0 ? '1px solid #E2E8F0' : undefined, backgroundColor: isSub ? '#F8FAFC' : '#ffffff', opacity: item.selected ? 1 : 0.6 }}>
                                                    <td style={{ textAlign: 'center', padding: '6px' }}>
                                                        <label className="dp-checkbox-label" style={{ cursor: 'pointer', display: 'inline-flex' }}>
                                                            <input type="checkbox" className="dp-checkbox-input" checked={item.selected} onChange={() => updateItem(idx, 'selected', !item.selected)} />
                                                            <span className="dp-checkbox-box" />
                                                        </label>
                                                    </td>
                                                    <td style={{ padding: '4px', whiteSpace: 'nowrap' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <button className="dp-ai-plus-btn" onClick={() => insertBelow(idx)} title={isSub ? '아래에 중분류 추가' : '이 대분류 다음에 대분류 추가'}><Plus size={14} /></button>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: isSub ? '4px 6px 4px 24px' : '4px 6px', position: 'relative' }}>
                                                        {isSub && <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-60%)', color: '#93C5FD', fontSize: '14px', fontWeight: 700, pointerEvents: 'none' }}>└</span>}
                                                        <DropDownList
                                                            data={locked ? TIER_OPTIONS.slice(0, 1) : TIER_OPTIONS}
                                                            textField="text"
                                                            dataItemKey="value"
                                                            value={TIER_OPTIONS.find(o => o.value === (isSub ? 2 : 1))}
                                                            onChange={(e) => updateItem(idx, 'tier', locked ? 1 : (e.value?.value || 1))}
                                                            disabled={locked}
                                                            title={locked ? '첫 번째 행은 대분류만 가능합니다' : undefined}
                                                            className={isSub ? 'dp-tier-dropdown dp-tier-overlay dp-tier-sub' : 'dp-tier-dropdown dp-tier-overlay'}
                                                            popupSettings={{ popupClass: 'dp-tier-dropdown-popup' }}
                                                            style={{ width: '100%' }}
                                                        />
                                                        <span style={{ position: 'absolute', left: isSub ? '24px' : '6px', right: locked ? '6px' : '28px', top: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', fontSize: isSub ? '12px' : '13px', fontWeight: isSub ? 500 : 600, color: isSub ? '#475569' : '#1E40AF' }}>
                                                            {isSub ? '중분류' : '대분류'}
                                                        </span>
                                                        {!locked && (
                                                            <span style={{ position: 'absolute', right: '7px', top: '7px', bottom: '7px', width: '22px', borderLeft: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                                                                <ChevronDown size={14} color={isSub ? '#94A3B8' : '#3B82F6'} />
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '4px 6px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                                            <input type="text" value={item.label} placeholder="그룹명" onChange={(e) => updateItem(idx, 'label', e.target.value)} style={{ ...inputStyle, fontWeight: isSub ? 400 : 700, color: isSub ? '#334155' : '#0f172a' }} />
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '4px 6px' }}>
                                                        <input type="text" value={item.values} placeholder="예: 1~3, 5" onChange={(e) => updateItem(idx, 'values', e.target.value)} style={{ ...inputStyle, fontFamily: 'monospace' }} />
                                                    </td>
                                                    <td style={{ padding: '4px 6px' }}>
                                                        <input type="text" className="dp-bottom-val-input" value={item.bottom_values} placeholder="예: 98, 99" onChange={(e) => updateItem(idx, 'bottom_values', e.target.value)} style={{ ...inputStyle, fontFamily: 'monospace' }} />
                                                    </td>
                                                    <td style={{ textAlign: 'center', padding: '4px 6px' }}>
                                                        <button className="dp-ai-trash-btn" onClick={() => deleteItem(idx)} title="행 삭제"><Trash2 size={14} /></button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. Footer */}
                <div style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', backgroundColor: '#ffffff', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button onClick={onClose} style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600, color: '#475569', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>
                            취소
                        </button>
                        <button
                            onClick={handleOverwrite}
                            disabled={disabledBtn || !overwriteTargetName}
                            title={overwriteTargetName ? `[${overwriteTargetName}] 의 그룹을 이 결과로 바꿉니다` : '덮어쓸 그룹 프리셋을 먼저 펼쳐 주세요'}
                            style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 700, color: (disabledBtn || !overwriteTargetName) ? '#94a3b8' : '#2563eb', backgroundColor: (disabledBtn || !overwriteTargetName) ? '#f1f5f9' : '#eff6ff', border: `1px solid ${(disabledBtn || !overwriteTargetName) ? '#e2e8f0' : '#93c5fd'}`, borderRadius: '6px', cursor: (disabledBtn || !overwriteTargetName) ? 'default' : 'pointer' }}
                        >
                            {overwriteTargetName ? `[${overwriteTargetName}]에 덮어쓰기` : '열린 그룹으로 덮어쓰기'}
                        </button>
                        <button
                            onClick={() => { setPresetName(defaultPresetName || ''); setShowNameModal(true); }}
                            disabled={disabledBtn}
                            style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 700, color: disabledBtn ? '#94a3b8' : '#ffffff', backgroundColor: disabledBtn ? '#e2e8f0' : '#2563eb', border: 'none', borderRadius: '6px', cursor: disabledBtn ? 'default' : 'pointer', boxShadow: disabledBtn ? 'none' : '0 2px 4px rgba(37, 99, 235, 0.25)' }}
                        >
                            새 그룹으로 추가
                        </button>
                    </div>
                </div>

                {/* 새 프리셋 이름 입력 미니 팝업 */}
                {showNameModal && (
                    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100005 }}>
                        <div style={{ width: '380px', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: "'Pretendard', sans-serif" }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Sparkles size={18} color="#2563eb" />
                                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>새 그룹으로 추가</span>
                                </div>
                                <button onClick={() => setShowNameModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px', borderRadius: '4px', display: 'flex' }}>
                                    <X size={18} />
                                </button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>새 프리셋 이름을 입력하세요</label>
                                <input
                                    type="text"
                                    value={presetName}
                                    onChange={(e) => setPresetName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && presetName.trim()) { setShowNameModal(false); handleCreate(); }
                                        if (e.key === 'Escape') setShowNameModal(false);
                                    }}
                                    autoFocus
                                    placeholder="예: 유통 채널 분류"
                                    style={{ height: '36px', padding: '0 12px', fontSize: '13px', border: '1.5px solid #2563eb', borderRadius: '6px', outline: 'none', color: '#0f172a', fontWeight: 600, boxSizing: 'border-box' }}
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <button onClick={() => setShowNameModal(false)} style={{ padding: '7px 14px', fontSize: '13px', fontWeight: 600, color: '#475569', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>
                                    취소
                                </button>
                                <button
                                    onClick={() => { setShowNameModal(false); handleCreate(); }}
                                    disabled={!presetName.trim()}
                                    style={{ padding: '7px 16px', fontSize: '13px', fontWeight: 700, color: presetName.trim() ? '#ffffff' : '#94a3b8', backgroundColor: presetName.trim() ? '#2563eb' : '#e2e8f0', border: 'none', borderRadius: '6px', cursor: presetName.trim() ? 'pointer' : 'default' }}
                                >
                                    추가
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AiAutoGroupModal;
