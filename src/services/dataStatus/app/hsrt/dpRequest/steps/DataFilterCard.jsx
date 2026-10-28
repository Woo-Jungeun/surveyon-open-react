import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Filter, Users, X, AlertCircle, Loader2, ChevronDown, Search } from 'lucide-react';
import { getSpss } from '../../../common/spssName';

/**
 * 범용 데이터 필터 조건식 생성
 * - 같은 문항의 배지끼리는 OR, 서로 다른 문항끼리는 AND 결합 (규격서 5.1)
 */
export const buildFilterExpression = (badges) => {
    if (!Array.isArray(badges) || badges.length === 0) return '';
    const groups = {};
    const order = [];
    badges.forEach(b => {
        const key = b.variable_id || 'default';
        if (!groups[key]) { groups[key] = []; order.push(key); }
        if (b.logic) groups[key].push(b.logic);
    });
    return order
        .filter(k => groups[k].length > 0)
        .map(k => (groups[k].length > 1 ? `(${groups[k].join(' or ')})` : groups[k][0]))
        .join(' and ');
};

/**
 * 필터 가능한 문항 목록 생성 (교차분석/추가분석 필터와 동일 규칙)
 * - 출처: /datasets/overview/context 의 base_variables (객체 또는 배열)
 * - ADD_ 문항은 recoded_type === 'computed' 인 경우만 포함
 * - 보기는 label과 logic이 모두 있어야 포함 (교차분석 기준)
 */
export const toFilterVariables = (baseVars) => {
    if (!baseVars) return [];
    const entries = Array.isArray(baseVars)
        ? baseVars.map(v => [v?.id ?? v?.name, v])
        : Object.entries(baseVars);
    return entries
        .map(([key, v]) => {
            const id = String(v?.id ?? key ?? '').trim();
            if (!id) return null;
            if (id.toUpperCase().startsWith('ADD_') && String(v?.recoded_type ?? '').toLowerCase() !== 'computed') return null;
            const label = String(v?.label ?? key).trim() || id;
            const infoList = Array.isArray(v?.info) ? v.info : [];
            const options = infoList
                .map((info, idx) => {
                    const optLabel = String(info?.label ?? '').trim();
                    const logic = String(info?.logic ?? '').trim();
                    if (!optLabel || !logic) return null;
                    const rawValue = info?.value ?? idx + 1;
                    return { key: `${id}::${String(rawValue).trim() || String(idx + 1)}::${idx}`, label: optLabel, value: rawValue, logic };
                })
                .filter(Boolean);
            if (options.length === 0) return null;
            // spssName: 표출/검색 전용 (배지 저장에는 포함하지 않음)
            return { id, label, options, spssName: getSpss(v) };
        })
        .filter(Boolean);
};

const STATUS_STYLE = {
    none: { bg: '#F1F5F9', fg: '#64748B', border: '#E2E8F0' },
    ok: { bg: '#ECFDF5', fg: '#047857', border: '#A7F3D0' },
    loading: { bg: 'var(--srt-primary-50)', fg: 'var(--srt-primary-700)', border: 'var(--srt-primary-200)' },
    error: { bg: '#FEF2F2', fg: '#B91C1C', border: '#FECACA' },
};

const fmt = (n) => (n === null || n === undefined || n === '' ? '-' : Number(n).toLocaleString());

// 추가분석 필터 팝업과 동일한 체크박스 모양
const CheckBox = ({ checked, indeterminate }) => (
    <div style={{ width: 15, height: 15, border: (checked || indeterminate) ? '1.5px solid var(--srt-primary-500)' : '1.5px solid #cbd5e1', borderRadius: 3, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {checked && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--srt-primary-500)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
        {!checked && indeterminate && <div style={{ width: 8, height: 2, background: 'var(--srt-primary-500)' }} />}
    </div>
);

const DataFilterCard = ({ variables, badges, onChangeBadges, previewFilter, onValidityChange, onZeroChange }) => {
    const auth = useSelector((store) => store.auth);
    const [isOpen, setIsOpen] = useState(false);
    const [draftKeys, setDraftKeys] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const reqSeq = useRef(0);
    const anchorRef = useRef(null);
    const addBtnRef = useRef(null);

    const expression = useMemo(() => buildFilterExpression(badges), [badges]);

    // 문항 × 보기 평탄화 (key → 항목)
    const optionMap = useMemo(() => {
        const m = new Map();
        variables.forEach(v => v.options.forEach(o => m.set(o.key, { ...o, variable_id: v.id, variable_label: v.label })));
        return m;
    }, [variables]);

    // 검색 (추가분석과 동일: 문항명/ID 일치 시 전체, 아니면 일치 보기만)
    const filteredGroups = useMemo(() => {
        const q = searchText.trim().toLowerCase();
        if (!q) return variables;
        return variables.map(v => {
            if (v.label.toLowerCase().includes(q) || v.id.toLowerCase().includes(q) || (v.spssName || '').toLowerCase().includes(q)) return v;
            const opts = v.options.filter(o => o.label.toLowerCase().includes(q));
            return opts.length > 0 ? { ...v, options: opts } : null;
        }).filter(Boolean);
    }, [variables, searchText]);

    // 바깥 클릭 시 닫기 (미적용 선택은 폐기)
    useEffect(() => {
        if (!isOpen) return;
        const onDown = (e) => { if (anchorRef.current && !anchorRef.current.contains(e.target) && !(addBtnRef.current && addBtnRef.current.contains(e.target))) setIsOpen(false); };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [isOpen]);

    // 조건식 변경 시 300ms 디바운스로 완료집계수 미리보기 호출
    useEffect(() => {
        const pageId = sessionStorage.getItem('pageId');
        if (!pageId || !previewFilter) return;
        const seq = ++reqSeq.current;
        setLoading(true);
        const timer = setTimeout(async () => {
            try {
                const res = await previewFilter.mutateAsync({ pageid: pageId, user: auth?.user?.userId, filter_expression: expression || null });
                if (seq !== reqSeq.current) return;
                const data = res?.resultjson || res?.data?.resultjson || res || {};
                setPreview(data);
                onValidityChange?.(data.valid !== false);
                onZeroChange?.(!!expression && data.valid !== false && Number(data.after) === 0);
            } catch (e) {
                if (seq !== reqSeq.current) return;
                console.error('preview-filter failed:', e);
                setPreview({ valid: false, error: '완료집계수 조회에 실패했습니다.' });
                onValidityChange?.(!expression); // 필터가 없으면 저장은 허용
                onZeroChange?.(false);
            } finally {
                if (seq === reqSeq.current) setLoading(false);
            }
        }, 300);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [expression]);

    const togglePopup = () => {
        if (!isOpen) setDraftKeys(badges.map(b => b.id));
        setIsOpen(!isOpen);
    };

    const toggleChild = (key) => setDraftKeys(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

    const toggleParent = (group) => {
        const ids = group.options.map(o => o.key);
        const allChecked = ids.every(id => draftKeys.includes(id));
        setDraftKeys(prev => allChecked ? prev.filter(k => !ids.includes(k)) : [...prev, ...ids.filter(id => !prev.includes(id))]);
    };

    // [필터 추가]: 팝업에서 체크한 상태로 배지 목록 반영 (추가분석과 동일하게 선택 상태 = 적용 목록)
    const handleAdd = () => {
        const keys = isOpen ? draftKeys : badges.map(b => b.id);
        // 현재 목록에 없는(문항 삭제 등) 기존 배지는 유지
        const orphan = badges.filter(b => !optionMap.has(b.id));
        const next = keys.filter(k => optionMap.has(k)).map(k => {
            const existing = badges.find(b => b.id === k);
            if (existing) return existing;
            const o = optionMap.get(k);
            return {
                id: o.key,
                variable_id: o.variable_id,
                variable_label: o.variable_label,
                category_label: o.label,
                display_label: `${o.variable_label} - ${o.label}`,
                logic: o.logic,
            };
        });
        const result = [...orphan, ...next];
        const changed = result.length !== badges.length || result.some((b, i) => b.id !== badges[i]?.id);
        if (changed) onChangeBadges(result);
        setIsOpen(false);
    };

    const handleRemoveVariable = (variableId) => onChangeBadges(badges.filter(b => b.variable_id !== variableId));
    const handleReset = () => { if (badges.length > 0) onChangeBadges([]); };

    // 적용 배지를 문항 단위로 묶어 표시 (추가분석과 동일: "문항 [보기1, 보기2]")
    const groupedChips = useMemo(() => {
        const map = new Map();
        badges.forEach(b => {
            const k = b.variable_id || b.id;
            if (!map.has(k)) map.set(k, { variableId: k, label: b.variable_label || k, items: [] });
            map.get(k).items.push(b.category_label || b.display_label);
        });
        return Array.from(map.values());
    }, [badges]);

    const hasFilter = !!expression;
    const isInvalid = hasFilter && preview?.valid === false;
    const isZero = hasFilter && !isInvalid && preview && Number(preview.after) === 0;

    // 상단 완료집계 배지 (파랑 기준, 오류/0명만 빨강)
    const BLUE = { bg: 'var(--srt-primary-50)', fg: 'var(--srt-primary-700)', border: 'var(--srt-primary-200)' };
    const RED = { bg: '#FEF2F2', fg: '#B91C1C', border: '#FECACA' };
    const GRAY = { bg: '#F8FAFC', fg: '#64748B', border: '#E2E8F0' };
    let statusStyle = GRAY;
    let statusText = preview?.total != null ? `전체 완료집계: ${fmt(preview.total)}명 (필터 미적용)` : '필터 미적용';
    if (loading) { statusStyle = BLUE; statusText = '집계 중...'; }
    else if (isInvalid) { statusStyle = RED; statusText = '조건식 오류'; }
    else if (hasFilter && preview) {
        statusStyle = isZero ? RED : BLUE;
        statusText = `완료집계: ${fmt(preview.after)}명 / 전체 ${fmt(preview.total)}명 (${preview.rate ?? 0}%)`;
    }

    const pill = (s) => ({ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, background: s.bg, color: s.fg, border: `1px solid ${s.border}` });
    const metricLabel = { fontSize: 13, color: '#64748B', fontWeight: 500 };
    const accent = isZero ? '#B91C1C' : '#0F172A';
    const sectionTitle = { fontSize: 13, fontWeight: 700, color: '#94A3B8', letterSpacing: 0.2, marginBottom: 12, display: 'block' };
    const rowLabel = { width: 88, flexShrink: 0, fontSize: 13, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' };

    return (
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, padding: '24px 28px' }}>
            {/* ① 무엇인지 + 현재 상태 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>데이터 필터 (범용 필터)</span>
                <span style={pill(statusStyle)}>
                    {loading ? <Loader2 size={14} className="spin" /> : <Users size={14} />}
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{statusText}</span>
                </span>
                {badges.length > 0 && (
                    <span style={pill(GRAY)}><span style={{ fontSize: 13, fontWeight: 600 }}>{groupedChips.length}개 문항 · {badges.length}개 보기</span></span>
                )}
            </div>
            <p style={{ margin: '8px 0 0', paddingBottom: 20, marginBottom: 20, borderBottom: '1px solid #E2E8F0', fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>
                교차분석·추가분석·엑셀 다운로드에 항상 적용되는 기본 필터입니다. 각 화면의 필터와는 <b>AND</b>로 결합됩니다.
            </p>

            {/* ② 조건 설정 */}
            <span style={sectionTitle}>조건 설정</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={rowLabel}>필터</span>
                <div ref={anchorRef} style={{ position: 'relative' }}>
                    <div id="dp-data-filter-select" onClick={togglePopup}
                        style={{ width: 520, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: `1px solid ${isOpen ? 'var(--srt-primary-500)' : '#cbd5e1'}`, borderRadius: 4, background: '#fff', padding: '0 12px', cursor: 'pointer', userSelect: 'none', boxSizing: 'border-box' }}>
                        <span style={{ fontSize: 13, color: '#334155', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {isOpen && draftKeys.length > 0 ? `${draftKeys.length}개 선택됨` : '필터 선택'}
                        </span>
                        <ChevronDown size={16} color="#94a3b8" />
                    </div>

                    {isOpen && (
                        <div style={{ position: 'absolute', top: 42, left: 0, width: 520, zIndex: 1000, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, display: 'flex', flexDirection: 'column', maxHeight: 520, overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)' }}>
                            {/* 검색창 */}
                            <div style={{ padding: '8px 8px 4px 8px', position: 'relative', borderBottom: '1px solid #e2e8f0' }}>
                                <input type="text" placeholder="필터 검색" value={searchText} autoFocus
                                    onChange={e => setSearchText(e.target.value)}
                                    style={{ width: '100%', padding: '6px 10px 6px 30px', fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 6, outline: 'none', boxSizing: 'border-box', height: 32 }} />
                                <Search size={14} style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                {searchText && <X size={14} onClick={() => setSearchText('')} style={{ position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', cursor: 'pointer' }} />}
                            </div>

                            {/* 문항 그룹 / 보기 */}
                            <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '2px 0' }}>
                                {filteredGroups.length === 0 ? (
                                    <div style={{ padding: 16, fontSize: 13, color: '#94a3b8', textAlign: 'center' }}>
                                        {variables.length === 0 ? '등록된 문항이 없습니다.' : '검색 결과가 없습니다.'}
                                    </div>
                                ) : filteredGroups.map((group, index) => {
                                    const ids = group.options.map(o => o.key);
                                    const checkedCnt = ids.filter(id => draftKeys.includes(id)).length;
                                    const all = ids.length > 0 && checkedCnt === ids.length;
                                    const some = checkedCnt > 0 && !all;
                                    return (
                                        <div key={group.id} style={{ borderBottom: index === filteredGroups.length - 1 ? 'none' : '1px solid #cbd5e1', paddingBottom: 6 }}>
                                            <div onClick={() => toggleParent(group)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', cursor: 'pointer', userSelect: 'none' }}>
                                                <CheckBox checked={all} indeterminate={some} />
                                                <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{group.label}</span>
                                            </div>
                                            <div style={{ paddingLeft: 28, display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                                                {group.options.map(opt => (
                                                    <div key={opt.key} onClick={() => toggleChild(opt.key)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', cursor: 'pointer', borderRadius: 4, userSelect: 'none' }}>
                                                        <CheckBox checked={draftKeys.includes(opt.key)} />
                                                        <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>{opt.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
                <button id="dp-data-filter-add" type="button" ref={addBtnRef} onClick={handleAdd}
                    style={{ height: 34, padding: '0 20px', background: 'var(--srt-primary-500)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                    onMouseOver={e => { e.currentTarget.style.background = 'var(--srt-primary-600)'; }}
                    onMouseOut={e => { e.currentTarget.style.background = 'var(--srt-primary-500)'; }}>
                    필터 추가
                </button>
            </div>

            {/* 적용된 범용 필터 (문항별 칩) */}
            {groupedChips.length > 0 && (
                <div style={{ marginTop: 14, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ ...rowLabel, lineHeight: '26px' }}>적용된 필터</span>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 120, overflowY: 'auto' }}>
                        {groupedChips.map(chip => (
                            <div key={chip.variableId} title={`${chip.label} [${chip.items.join(', ')}]`}
                                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--srt-primary-50)', border: '1px solid var(--srt-primary-200)', borderRadius: 16, padding: '3px 6px 3px 10px', maxWidth: 420 }}>
                                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--srt-primary-600)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {chip.label} [{chip.items.join(', ')}]
                                </span>
                                <span onClick={() => handleRemoveVariable(chip.variableId)} title="삭제"
                                    style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: '50%', fontSize: 11, fontWeight: 700, background: 'var(--srt-primary-100)', color: 'var(--srt-primary-700)', flexShrink: 0 }}>✕</span>
                            </div>
                        ))}
                    </div>
                    <button id="dp-data-filter-reset" type="button" onClick={handleReset}
                        style={{ padding: '4px 10px', borderRadius: 16, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        onMouseOver={e => { e.currentTarget.style.background = '#e2e8f0'; }}
                        onMouseOut={e => { e.currentTarget.style.background = '#f8fafc'; }}>
                        전체 초기화
                    </button>
                </div>
            )}

            {/* ③ 적용 결과 (수치 먼저, 조건식은 상세) */}
            {hasFilter && (
                <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #E2E8F0' }}>
                    <span style={sectionTitle}>적용 결과</span>
                    <div style={{ border: `1px solid ${isInvalid || isZero ? '#FECACA' : '#E2E8F0'}`, borderRadius: 8, overflow: 'hidden' }}>
                        {isInvalid ? (
                            <div style={{ padding: '14px 18px', background: '#FEF2F2', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <AlertCircle size={15} color="#B91C1C" />
                                <span style={{ fontSize: 13, color: '#B91C1C' }}>조건식 검증 오류: {preview?.error || '조건식이 올바르지 않습니다.'} (오류가 해결될 때까지 저장할 수 없습니다)</span>
                            </div>
                        ) : preview && (
                            <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', background: isZero ? '#FEF2F2' : '#FFFFFF' }}>
                                <span style={metricLabel}>완료 표본 수(빈도수) <b style={{ fontSize: 16, color: accent, marginLeft: 6 }}>{fmt(preview.after)}명</b></span>
                                <span style={{ width: 1, height: 14, background: '#CBD5E1' }} />
                                <span style={metricLabel}>전체 표본 대비 <b style={{ fontSize: 16, color: accent, marginLeft: 6 }}>{preview.rate ?? 0}%</b>
                                    <span style={{ fontSize: 12, color: '#94A3B8', marginLeft: 4 }}>({fmt(preview.after)} / {fmt(preview.total)}명)</span></span>
                                <span style={{ width: 1, height: 14, background: '#CBD5E1' }} />
                                <span style={metricLabel}>제외 표본 <b style={{ fontSize: 16, color: '#475569', marginLeft: 6 }}>{fmt(preview.diff)}명</b></span>
                                {isZero && (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#B91C1C' }}>
                                        <AlertCircle size={14} /> 조건에 해당하는 응답자가 없어 모든 표가 비게 됩니다.
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataFilterCard;
