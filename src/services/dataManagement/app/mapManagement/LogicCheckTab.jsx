import React, {
    useState, useMemo, useEffect, useRef, useContext, useCallback
} from 'react';
import { createPortal } from 'react-dom';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import {
    Check, List, MoreHorizontal, RotateCcw, Wand2, PlayCircle, X,
    RefreshCw, ChevronDown, Edit2, FileDown,
    Lightbulb, Search, Loader2, Copy, Trash2,
} from 'lucide-react';
import { modalContext } from '@/components/common/Modal.jsx';
import { loadingSpinnerContext } from '@/components/common/LoadingSpinner.jsx';
import * as signalR from '@microsoft/signalr';
import './LogicCheckTab.css';
import MapConfigFilterPopup from '../../../../components/common/popup/MapConfigFilterPopup';

// ─── 색 상수 ───────────────────────────────────
const C = {
    blue: '#3d8bfd',
    blueLight: '#ebf3ff',
    red: '#f43f5e',
    redLight: '#fff1f2',
    orange: '#fb923c',
    orangeLight: '#fffbeb',
    gray: '#e2e8f0',
    grayLight: '#f8fafc',
    green: 'var(--dm-primary)',
    greenLight: 'var(--dm-primary-light)',
};
// 분포 막대 전용 — 연한 톤
const BAR = { blue: '#7ba3f5', red: '#fb7185', orange: '#fdab5e' };

// ─── 판정 결과 범례 ─────────────────────────────
const LEGEND_ITEMS = [
    { key: 'target-answer', label: '대상자 응답', color: BAR.blue },
    { key: 'target-missing', label: '대상자 무응답', color: BAR.red },
    { key: 'nontarget-answer', label: '비대상 응답', color: BAR.orange },
    { key: 'nontarget-missing', label: '비대상 무응답', color: C.gray },
];

// ─── 거르개 키 ──────────────────────────────────
const FILTERS = [
    { key: 'all', label: '전체' },
    { key: 'error', label: '확인 필요' },
    { key: 'noResponse', label: '응답 없음' },
    { key: 'noLogic', label: '로직 없음' },
];

// ─── 정렬 옵션 ──────────────────────────────────
// 동기 복사 — copy 이벤트로 글자 + 표를 같이 넣기 (클릭 핸들러 안에서 불러야 함)
const copySync = (text, html) => {
    const onCopy = (ev) => {
        ev.preventDefault();
        ev.clipboardData.setData('text/plain', text);
        if (html) ev.clipboardData.setData('text/html', html);
    };
    const ta = document.createElement('textarea');
    ta.value = ' ';
    ta.style.cssText = 'position:fixed;top:-1000px;opacity:0;';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.addEventListener('copy', onCopy);
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    document.removeEventListener('copy', onCopy);
    ta.remove();
    return ok;
};

const SORT_OPTIONS = [
    { key: 'order', label: '문항 순서' },
    { key: 'confirm', label: '확인할 응답자 많은 순' },
    { key: 'missing', label: '대상자 무응답 많은 순' },
    { key: 'unexpected', label: '비대상 응답 많은 순' },
    { key: 'base', label: '대상자 많은 순' },
];

// ─────────────────────────────────────────────────────────────────────────────
// 유틸 함수
// ─────────────────────────────────────────────────────────────────────────────

/** 숫자를 ","로 format */
const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString());

/** 상태별 표시 배지 — 향후 사용 */
// eslint-disable-next-line no-unused-vars
function getStatusBadge(item, isUnreadable) {
    if (isUnreadable) return { text: '!', color: C.orange, title: '로직을 읽지 못했습니다' };
    if (!item.hasLogic) return { text: '−', color: C.gray, title: '로직 없음' };
    if (item.status === 'noResponse') return { text: '−', color: C.gray, title: '응답 없음' };
    if (item.status === 'error') {
        const parts = [];
        if (item.missing > 0) parts.push(`대상자 무응답 ${fmt(item.missing)}`);
        if (item.unexpected > 0) parts.push(`비대상 응답 ${fmt(item.unexpected)}`);
        return { text: '!', color: C.red, title: parts.join(' · ') || '오류' };
    }
    if (item.status === 'ok') return { text: '✓', color: C.green, title: '정상' };
    return null;
}

/** SignalR 연결 생성 */
async function createSignalRConnection() {
    try {
        const baseUrl = window.API_CONFIG?.API_BASE_URL_DATAMANAGEMENT || window.API_CONFIG?.API_BASE_URL || window.location.origin;
        let hubUrl = baseUrl.replace(/\/+$/, '') + '/hubs/task-progress';
        if (!hubUrl.startsWith('http')) hubUrl = window.location.origin + hubUrl;
        const conn = new signalR.HubConnectionBuilder()
            .withUrl(hubUrl)
            .withAutomaticReconnect()
            .configureLogging(signalR.LogLevel.None)
            .build();
        await conn.start();
        return conn;
    } catch (e) {
        console.error('SignalR 연결 오류:', e);
        return null;
    }
}

/** 문법표 응답 { groups[{ group, items[] }], legacy[] } → [{ title, rows }] (서버 한 곳에서 관리 — 프론트는 베끼지 않음) */
function normalizeSyntax(res) {
    const rj = res?.resultjson || {};
    const groups = (rj.groups || []).map(g => ({ title: g.group || '', rows: g.items || [] }));
    if (rj.legacy?.length) {
        groups.push({ title: '옛 글자 — 읽기는 되지만 새로 쓰지 마세요', rows: rj.legacy.map(r => ({ ...r, legacy: true })) });
    }
    return groups.filter(g => g.rows.length > 0);
}
let syntaxCache = null; // 고정표 — 한 번만 받기

const LOGIC_WORDS = new Set(['and', 'or', 'not', 'in', 'is', 'null', 'all', 'like', 'true', 'false']);
/** 식에 쓴 변수 → 맵 변수 (쓴 순서 · 중복 제거) — 맵에 없는 이름은 { _missing: true, name } */
function findLogicVars(text, variables) {
    const byName = new Map();
    (variables || []).forEach(v => {
        if (v.name) byName.set(String(v.name).toLowerCase(), v);
        if (v.sysName && !byName.has(String(v.sysName).toLowerCase())) byName.set(String(v.sysName).toLowerCase(), v);
    });
    const out = [];
    const seen = new Set();
    // 따옴표 안 글자는 변수가 아님
    const src = String(text || '').replace(/'[^']*'|"[^"]*"/g, ' ');
    for (const m of src.matchAll(/[A-Za-z_][A-Za-z0-9_]*/g)) {
        const key = m[0].toLowerCase();
        if (LOGIC_WORDS.has(key) || seen.has(key)) continue;
        seen.add(key);
        const v = byName.get(key);
        out.push(v || { _missing: true, name: m[0] });
    }
    return out;
}
const normLogic = (s) => String(s || '').replace(/\s+/g, ' ').trim();

/** 로직 넣기 / 수정 창 (기획서 팝업) */
function LogicEditDialog({ item, mapVar, variables, auth, pn, loadSyntax, onCancel, onSave }) {
    const varName = item.variable || item.sysName;
    const isEdit = !!item.hasLogic;
    const [text, setText] = useState(mapVar?.logic || item.logic || '');
    const [info, setInfo] = useState(mapVar?.logicInfo);
    const [helpOpen, setHelpOpen] = useState(false);
    const [syntax, setSyntax] = useState(syntaxCache);
    const [syntaxError, setSyntaxError] = useState(false);
    const [builderOpen, setBuilderOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const current = String(mapVar?.logic || item.logic || '').trim();

    useEffect(() => {
        if (!helpOpen || syntax || !loadSyntax) return;
        let alive = true;
        setSyntaxError(false);
        loadSyntax()
            .then(res => { if (!alive) return; const g = normalizeSyntax(res); if (!g.length) { setSyntaxError(true); return; } syntaxCache = g; setSyntax(g); })
            .catch(() => { if (alive) setSyntaxError(true); });
        return () => { alive = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [helpOpen, syntax]);

    const modal = useContext(modalContext);
    const initialText = mapVar?.logic || item.logic || '';

    const handleSave = async () => {
        if (saving) return;
        // 안 바꿨으면 보내지 않음 (원래 없던 로직을 빈 채로 저장해도 같음)
        if (normLogic(text) === normLogic(current)) {
            modal?.showAlert?.('알림', '변경사항이 없습니다.');
            return;
        }
        // 비워서 저장 = 로직 지우기 → 한 번 묻기
        if (!normLogic(text)) {
            const ok = await new Promise(resolve => modal?.showConfirm?.('알림', `${varName} 의 로직을 지울까요?\n지우면 이 문항은 판정하지 않습니다.`, {
                btns: [
                    { title: '취소', click: () => resolve(false) },
                    { title: '지우기', click: () => resolve(true) },
                ],
            }));
            if (!ok) return;
        }
        setSaving(true);
        setError('');
        try {
            const r = await onSave(text, info);
            if (r?.logic !== undefined) setText(r.logic);   // 서버가 바꾼(표준화·한 줄) 모양 그대로
            if (r?.error) setError(r.error);
        } finally { setSaving(false); }
    };

    // 닫기 — 고치던 식이 있으면 한 번 묻기 · 다시 판정 중엔 닫지 않음
    const requestClose = () => {
        if (saving) return;
        if (normLogic(text) === normLogic(initialText)) { onCancel(); return; }
        modal?.showConfirm?.('알림', '고치던 식이 저장되지 않았습니다. 버리고 닫을까요?', {
            btns: [
                { title: '취소', click: () => { } },
                { title: '버리고 닫기', click: () => onCancel() },
            ],
        });
    };
    const closeRef = useRef(requestClose);
    closeRef.current = requestClose;
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape' && !builderOpen) { e.preventDefault(); closeRef.current(); } };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [builderOpen]);

    return (
        <div className="variable-modal-overlay" data-theme="data-management" onClick={requestClose}>
            <div className="lc-dialog lc-logic-dialog" role="dialog" aria-labelledby="lc-logic-title" onClick={e => e.stopPropagation()}>
                <div className="variable-modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                        <div style={{ width: '4px', height: '18px', backgroundColor: 'var(--dm-primary)', borderRadius: '4px', marginRight: '8px', flexShrink: 0 }}></div>
                        <h3 id="lc-logic-title" className="variable-modal-title">
                            {isEdit ? '로직 수정' : '로직 넣기'} - {varName}
                        </h3>
                        {(item.title || item.label) && (
                            <span className="lc-logic-dialog-sub" title={item.title || item.label}>{item.title || item.label}</span>
                        )}
                    </div>
                    <button type="button" id="lc-logic-close" onClick={requestClose} disabled={saving} className="variable-modal-close">&times;</button>
                </div>

                <div className="lc-dialog-body">
                    <div className={`lc-logic-now${!current || !item.hasLogic || item.status === 'noResponse' ? ''
                            : item._unreadable ? ' tone-warn'
                                : item.missing > 0 ? ' tone-error'
                                    : item.unexpected > 0 ? ' tone-warn'
                                        : ' tone-ok'}`}>
                        <div className="lc-logic-now-row">
                            <span className="lc-logic-now-label">상태</span>
                            {!current || !item.hasLogic ? (
                                <span>로직이 없어 판정하지 않았습니다</span>
                            ) : item._unreadable ? (
                                <span style={{ color: C.orange }}>식을 읽지 못해 판정하지 않았습니다</span>
                            ) : item.status === 'noResponse' ? (
                                <span>응답이 없어 판정하지 않았습니다</span>
                            ) : (
                                <span>
                                    대상자 <b>{fmt(item.base ?? ((item.answered || 0) + (item.missing || 0)))}</b>명
                                    {' · '}대상자 무응답 <b style={{ color: item.missing > 0 ? C.red : undefined }}>{fmt(item.missing || 0)}</b>명
                                    {' · '}비대상 응답 <b style={{ color: item.unexpected > 0 ? C.orange : undefined }}>{fmt(item.unexpected || 0)}</b>명
                                </span>
                            )}
                        </div>
                        <div className="lc-logic-now-row">
                            <span className="lc-logic-now-label">현재 식</span>
                            {current
                                ? <code className="lc-logic-code">{current}</code>
                                : <span className="lc-logic-now-empty">없음</span>}
                        </div>
                    </div>

                    <div className="lc-logic-field-head">
                        <span className="lc-logic-field-label">수정 식</span>
                        <span className="lc-logic-field-note">Enter로 줄바꿈 가능합니다</span>
                        <button type="button" id="lc-logic-help-toggle" className={`lc-logic-help-toggle${helpOpen ? ' open' : ''}`}
                            onClick={() => setHelpOpen(o => !o)}>
                            문법 도움말 <ChevronDown size={12} />
                        </button>
                    </div>

                    {helpOpen && (
                        syntax ? (
                            <table className="lc-logic-help">
                                {syntax.map((g, gi) => (
                                    <tbody key={gi}>
                                        {g.title && syntax.length > 1 && (
                                            <tr className="grp"><td colSpan={3}>{g.title}</td></tr>
                                        )}
                                        {g.rows.map((r, ri) => (
                                            <tr key={ri} className={r.legacy ? 'legacy' : ''} title={r.note || undefined}>
                                                <td className="op">{r.token}</td>
                                                <td>
                                                    {r.meaning}
                                                    {r.legacy && r.instead && <span className="instead"> → 대신 <code>{r.instead}</code></span>}
                                                </td>
                                                <td className="ex">{r.example}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                ))}
                            </table>
                        ) : (
                            <div className="lc-logic-help lc-logic-help-msg">
                                {syntaxError ? '문법 도움말을 불러오지 못했습니다.' : <><Loader2 size={12} className="lc-spin" /> 불러오는 중…</>}
                            </div>
                        )
                    )}

                    <textarea
                        id="lc-logic-input"
                        className={`lc-logic-textarea${error ? ' has-error' : ''}`}
                        value={text}
                        autoFocus
                        spellCheck={false}
                        placeholder="예) q5 in [1, 2]"
                        onChange={e => { setText(e.target.value); if (error) setError(''); }}
                    />
                    {(() => {
                        const refs = findLogicVars(text, variables);
                        if (!refs.length) return null;
                        const shownRefs = refs.slice(0, 5);
                        return (
                            <ul className="lc-logic-refs">
                                {shownRefs.map(v => {
                                    if (v._missing) {
                                        return (
                                            <li key={`x-${v.name}`} className="missing">
                                                <span className="ref-name">{v.name}</span>
                                                <span className="ref-missing">맵에 없는 변수입니다</span>
                                            </li>
                                        );
                                    }
                                    const labels = v.labels || [];
                                    return (
                                        <li key={v.id ?? v.name}>
                                            <span className="ref-name">{v.name || v.sysName}</span>
                                            {v.type && <span className="ref-type">{String(v.type).toLowerCase()}</span>}
                                            <span className="ref-label" title={v.label || ''}>{v.label || ''}</span>
                                            {labels.length > 0 && (
                                                <span className="ref-opts">
                                                    {labels.slice(0, 6).map(l => (
                                                        <span key={l.code} className="ref-opt"><b>{l.code}</b> {l.label}</span>
                                                    ))}
                                                    {labels.length > 6 && (
                                                        <span className="ref-more" title={labels.map(l => `${l.code} ${l.label}`).join('\n')}>+{labels.length - 6}</span>
                                                    )}
                                                </span>
                                            )}
                                        </li>
                                    );
                                })}
                                {refs.length > 5 && <li className="ref-more-vars">외 변수 {refs.length - 5}개</li>}
                            </ul>
                        );
                    })()}
                    {error && <div className="lc-logic-error">{error}</div>}
                </div>

                <div className="variable-modal-footer lc-logic-footer">
                    <button type="button" id="lc-logic-builder" className="btn-cancel lc-btn-green-outline" onClick={() => setBuilderOpen(true)}>조건으로 만들기</button>
                    <div style={{ flex: 1 }} />
                    <button type="button" id="lc-logic-cancel" className="btn-cancel" onClick={requestClose}>취소</button>
                    <button type="button" id="lc-logic-save" className="btn-save" disabled={saving} onClick={handleSave}>
                        저장 후 재확인
                    </button>
                </div>

                {/* 다시 판정 중 — 진행률이 없어 퍼센트는 안 줌 · 이 동안 닫히지 않음 */}
                {saving && (
                    <div className="lc-logic-saving" role="status">
                        <Loader2 size={22} className="lc-spin" />
                        <div className="lc-logic-saving-title">다시 판정하는 중</div>
                        <div className="lc-logic-saving-desc">이 문항만 응답을 한 번 읽어 판정한 뒤 저장합니다</div>
                        <div className="lc-logic-saving-bar"><span /></div>
                    </div>
                )}
            </div>

            {builderOpen && (
                <div onClick={e => e.stopPropagation()}>
                    <MapConfigFilterPopup
                        auth={auth}
                        pageId={pn}
                        initialVariables={[]}
                        variablesList={variables}
                        initialLogic={text.replace(/\s*\n\s*/g, ' ').trim()}
                        initialInfo={info}
                        title={`로직 검수 설정 - ${varName}`}
                        onClose={() => setBuilderOpen(false)}
                        onSave={(_id, logicStr, _label, newInfo) => {
                            setText(logicStr || '');
                            setInfo(newInfo);
                            setBuilderOpen(false);
                        }}
                    />
                </div>
            )}
        </div>
    );
}

/** 자동 채우기 방식 선택 창 (기획서 팝업) — 빈 칸만 / 전부 지우고 다시 */
function AutoFillDialog({ initialRestart = false, logicCount = 0, totalCount = 0, onCancel, onStart }) {
    const [restart, setRestart] = useState(!!initialRestart);
    const n = Number(logicCount || 0).toLocaleString();
    const empty = Math.max(0, Number(totalCount || 0) - Number(logicCount || 0)).toLocaleString();
    const options = [
        {
            value: false,
            title: '빈 칸만 채우기',
            desc: `로직이 없는 문항 ${empty}개만 채웁니다. 입력된 로직 ${n}개는 그대로 둡니다.`,
        },
        {
            value: true,
            title: '전부 지우고 다시 채우기',
            desc: `입력된 로직 ${n}개를 모두 지우고 처음부터 채웁니다. 직접 고친 로직도 지워집니다.`,
        },
    ];
    return (
        <div className="variable-modal-overlay" data-theme="data-management" onClick={onCancel}>
            <div className="lc-dialog" role="dialog" aria-labelledby="lc-autofill-title" onClick={e => e.stopPropagation()}>
                <div className="variable-modal-header">
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ width: '4px', height: '18px', backgroundColor: 'var(--dm-primary)', borderRadius: '4px', marginRight: '8px' }}></div>
                        <h3 id="lc-autofill-title" className="variable-modal-title">로직 자동 채우기</h3>
                    </div>
                    <button type="button" id="lc-autofill-close" onClick={onCancel} className="variable-modal-close">&times;</button>
                </div>
                <div className="lc-dialog-body">
                    <p className="lc-dialog-desc">AI가 설문지를 읽고 문항별 로직을 대신 입력해 드립니다. 채울 방식을 골라 주세요.</p>

                    <div className="lc-choice-list">
                        {options.map(opt => (
                            <label
                                key={String(opt.value)}
                                className={`lc-choice${restart === opt.value ? ' selected' : ''}`}
                                onClick={() => setRestart(opt.value)}
                            >
                                <span className="lc-choice-radio" />
                                <span className="lc-choice-text">
                                    <span className="lc-choice-title">{opt.title}</span>
                                    <span className="lc-choice-desc">{opt.desc}</span>
                                </span>
                            </label>
                        ))}
                    </div>

                    <ul className="lc-dialog-notes">
                        {restart
                            ? <li>지우기 전에 지금 상태를 복원 지점으로 저장해 둡니다. 중간에 멈추면 남은 문항은 빈 칸으로 남습니다.</li>
                            : <li>로직이 필요 없어 일부러 비워 둔 문항도 채워질 수 있습니다. 끝나면 새로 채워진 문항을 알려 드립니다.</li>}
                        <li>10~20분 정도 걸립니다. 중간에 멈춰도 그때까지 채운 로직은 저장됩니다.</li>
                        {!restart && <li>다시 보고 싶은 문항은 맵에서 로직을 지운 뒤 다시 누르세요.</li>}
                    </ul>
                </div>

                <div className="variable-modal-footer">
                    <button type="button" id="lc-autofill-cancel" className="btn-cancel" onClick={onCancel}>취소</button>
                    <button type="button" id="lc-autofill-start" className="btn-save" onClick={() => onStart(restart)}>채우기 시작</button>
                </div>
            </div>
        </div>
    );
}

/** "변수: 내용" 문자열을 [앞, 뒤]로 나눔 (last=true 면 마지막 ": " 기준 — 건너뛰기 규칙용) */
function splitPair(s, last = false) {
    const str = String(s ?? '');
    const i = last ? str.lastIndexOf(': ') : str.indexOf(': ');
    return i < 0 ? [str, ''] : [str.slice(0, i), str.slice(i + 2)];
}

/** 자동 채우기 결과 창 (정의서 B) */
function AutoFillResultDialog({ result, onClose, onRestore, onGoJudge, onGoTo }) {
    const r = result || {};
    const newly = r.newlyFilled || [];
    const skips = r.skipNotComputed || [];
    const failed = r.failedVariables || [];
    const newlyCount = r.newlyFilledCount ?? newly.length;
    // 직접 확인할 문항 = undetermined · needsReview · skipNotComputed (원인만 다름 → 꼬리표)
    const review = [
        ...(r.undetermined || []).map(s => ({ s, tag: '비워 둠', last: false })),
        ...(r.needsReview || []).map(s => ({ s, tag: '맵에 없는 변수', last: false })),
        ...skips.map(s => ({ s, tag: '건너뛰기 확인', last: true, skip: true })),
    ];
    const reviewCount = (r.undeterminedCount ?? (r.undetermined || []).length)
        + (r.needsReviewCount ?? (r.needsReview || []).length)
        + (r.skipNotComputedCount ?? skips.length);

    const tabs = [
        {
            key: 'review', label: '직접 확인할 문항', count: reviewCount, rows: review, cols: ['문항', '이유'],
            hint: '로직이 비어 있는 문항은 판정하지 않습니다. 줄을 누르면 맵의 그 문항으로 이동해 로직을 넣을 수 있습니다.'
        },
        {
            key: 'newly', label: '새로 채워진 문항', count: newlyCount, rows: newly.map(s => ({ s, last: false })), cols: ['문항', '들어간 조건'],
            hint: '비어 있던 칸에 조건이 들어간 문항입니다. 일부러 비워 두었던 문항이면 맵에서 그 문항만 다시 비우면 됩니다.'
        },
        {
            key: 'failed', label: '채우지 못한 문항', count: failed.length, rows: failed.map(s => ({ s, last: false })), cols: ['문항', ''],
            hint: 'AI 답을 받지 못해 바꾸지 않은 문항입니다(기존 로직 그대로). 다시 [자동 채우기]를 누르면 다시 묻습니다.'
        },
    ].filter(t => t.rows.length > 0); // 비어 있으면 숨김
    const [tab, setTab] = useState(tabs[0]?.key || null);
    const [msgOpen, setMsgOpen] = useState(false);
    const cur = tabs.find(t => t.key === tab) || tabs[0];
    const fmtN = (n) => Number(n || 0).toLocaleString();

    const stats = [
        { label: '전체 문항', value: r.totalVariables ?? r.processedCount },
        r.restarted
            ? { label: '지우고 다시 채움', value: r.clearedCount }
            : { label: '기존 로직 유지', value: r.alreadyFilledCount },
        { label: '새로 채워짐', value: newlyCount, tone: 'green' },
        { label: '직접 확인', value: reviewCount, tone: reviewCount ? 'red' : '' },
        { label: '건너뛰기 적용', value: r.skipVariablesChanged },
    ];

    return (
        <div className="variable-modal-overlay" data-theme="data-management">
            <div className="lc-dialog lc-result-dialog" role="dialog" aria-labelledby="lc-result-title" onClick={e => e.stopPropagation()}>
                <div className="variable-modal-header">
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ width: '4px', height: '18px', backgroundColor: 'var(--dm-primary)', borderRadius: '4px', marginRight: '8px' }}></div>
                        <h3 id="lc-result-title" className="variable-modal-title">로직 자동 채우기 결과</h3>
                    </div>
                    <button type="button" id="lc-result-close" onClick={onClose} className="variable-modal-close">&times;</button>
                </div>

                <div className="lc-dialog-body">
                    {/* 요약 숫자 */}
                    <div className="lc-result-stats">
                        {stats.map(s => (
                            <div key={s.label} className={`lc-result-stat${s.tone && Number(s.value) ? ` ${s.tone}` : ''}${!Number(s.value) ? ' is-zero' : ''}`}>
                                <span className="lc-result-stat-value">{fmtN(s.value)}{s.suffix ? <small>{s.suffix}</small> : null}</span>
                                <span className="lc-result-stat-label">{s.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* 경고 */}
                    {r.usedPaidFallback && (
                        <div className="lc-result-warn">설문지가 커서 유료 AI로 채웠습니다. 반복 문항(_r1·_r2 …)의 조건이 다른 문항으로 잡혔을 수 있으니 맵에서 한 번 더 확인해 주세요.</div>
                    )}

                    {/* 서버 안내 문장 (그대로) */}
                    {r.message && (
                        <div className={`lc-result-msg${msgOpen ? ' open' : ''}`}>
                            <p>{r.message}</p>
                            <button type="button" className="lc-result-msg-toggle" onClick={() => setMsgOpen(o => !o)}>
                                {msgOpen ? '접기' : '자세히 보기'}
                            </button>
                        </div>
                    )}

                    {/* 목록 (비어 있으면 숨김) */}
                    {cur && (<>
                        <div className="lc-result-tabs" role="tablist">
                            {tabs.map(t => (
                                <button
                                    key={t.key}
                                    type="button"
                                    role="tab"
                                    id={`lc-result-tab-${t.key}`}
                                    aria-selected={cur.key === t.key}
                                    className={`lc-result-tab${cur.key === t.key ? ' active' : ''}`}
                                    onClick={() => setTab(t.key)}
                                >
                                    {t.label} <span className="lc-result-tab-count">{fmtN(t.count)}</span>
                                </button>
                            ))}
                        </div>
                        {cur.hint && <p className="lc-result-hint">{cur.hint}</p>}
                        <div className="lc-result-list">
                            {cur.rows.map((row, i) => {
                                const [a, b] = splitPair(row.s, row.last);
                                // 건너뛰기 줄은 시작 문항 기준 ("문A → 문C (조건)")
                                const target = row.skip ? a.split('→')[0].trim() : a.trim();
                                return (
                                    <button type="button" key={i} className="lc-result-row clickable"
                                        title="맵에서 이 문항 열기"
                                        onClick={() => onGoTo?.(target, row.skip)}>
                                        <span className="lc-result-key" title={a}>{a}</span>
                                        <span className="lc-result-val" title={b}>{String(b ?? '').replace(/\s*\(0개\)\s*$/, '')}</span>
                                        {row.tag && <span className="lc-result-tag">{row.tag}</span>}
                                    </button>
                                );
                            })}
                        </div>
                        {cur.count > cur.rows.length && (
                            <p className="lc-result-hint">최대 {fmtN(cur.rows.length)}개까지만 보입니다 (전체 {fmtN(cur.count)}개).</p>
                        )}
                    </>)}
                </div>

                <div className="variable-modal-footer lc-result-footer">
                    {r.safetyVersionId ? (
                        <button type="button" id="lc-result-restore" className="btn-cancel lc-result-restore" onClick={() => onRestore(r.safetyVersionId)}>
                            자동 채우기 전으로 되돌리기
                        </button>
                    ) : <span />}
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" id="lc-result-ok" className="btn-cancel" onClick={onClose}>닫기</button>
                        <button type="button" id="lc-result-judge" className="btn-save" onClick={onGoJudge}>로직 판정하러 가기</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/** 진행 모달 */
function ProgressModal({ title, message, percent, onAbort, canClose = false }) {
    // 진행률은 묶음(30문항)마다 와서 그 사이엔 숫자가 멈춰 있다 → 흐르는 막대·스피너로 '돌고 있음'을 보여 줌 (퍼센트는 서버 값 그대로)
    const pct = Math.min(100, percent || 0);

    return (
        <div className="variable-modal-overlay" data-theme="data-management" onClick={canClose ? undefined : (e) => e.stopPropagation()}>
            <div className="lc-progress-modal" onClick={e => e.stopPropagation()}>
                <div className="lc-progress-title">{title}</div>
                <div className="lc-progress-msg">
                    <Loader2 size={13} className="lc-spin" />
                    <span>{message || '처리 중...'}</span>
                </div>
                <div className="lc-progress-bar-wrap lc-progress-live">
                    <div className="lc-progress-bar" style={{ width: `${pct}%` }} />
                </div>
                <div className="lc-progress-pct">{Math.round(pct)}%</div>
                {onAbort && (
                    <button type="button" className="lc-btn-outline lc-progress-abort" onClick={onAbort}>
                        중지
                    </button>
                )}
            </div>
        </div>
    );
}

/** 변수 목록 창 (새 창 · 전용 페이지 /variable_list) — 설문마다 창 하나(varlist_{pn}) */
const varListWindows = {};
function openVariableListWindow(pn, userId, modal) {
    const existing = varListWindows[pn];
    if (existing && !existing.closed) { existing.focus(); return; }

    const url = `/variable_list?pn=${encodeURIComponent(pn)}&user=${encodeURIComponent(userId || '')}`;
    const h = window.screen.availHeight || 900;
    const w = Math.min(1200, window.screen.availWidth || 1200);
    const left = Math.max(0, ((window.screen.availWidth || w) - w) / 2);
    const win = window.open(url, `varlist_${pn}`, `width=${w},height=${h},top=0,left=${left},resizable=yes,scrollbars=yes`);
    if (!win) {
        modal?.showAlert?.('알림', '팝업이 차단되어 변수 목록 창을 열 수 없습니다.\n브라우저 주소창 오른쪽에서 이 사이트의 팝업을 허용해 주세요.');
        return;
    }
    varListWindows[pn] = win;
    win.focus();
}

// ─────────────────────────────────────────────────────────────────────────────
// 왼쪽 목록 — 변수 카드 한 줄
// ─────────────────────────────────────────────────────────────────────────────
const VarRow = React.memo(function VarRow({ item, isActive, isUnreadable, checkedResponses, onClick }) {
    const base = item.base ?? 0;
    const answered = item.answered ?? 0;
    const missing = item.missing ?? 0;
    const unexpected = item.unexpected ?? 0;
    const total = checkedResponses || 1;

    const bAnswered = (answered / total) * 100;
    const bMissing = (missing / total) * 100;
    const bUnexpected = (unexpected / total) * 100;
    const bRest = Math.max(0, 100 - bAnswered - bMissing - bUnexpected);
    const noData = item.status == null || !item.hasLogic || isUnreadable || item.status === 'noResponse';

    return (
        <div
            className={`lc-var-row${isActive ? ' active' : ''}${item.status === 'error' ? ` err ${item.missing > 0 ? 'err-missing' : 'err-unexpected'}` : ''}`}
            onClick={onClick}
            data-var={item.variable || item.sysName}
            title={item.label || item.title || ''}
        >
            <div className="lc-vr-top">
                <span className="lc-vr-name">{item.variable || item.sysName}</span>
                {(item.hints?.length > 0) && <span className="lc-vr-icon" title="확인 팁 있음"><Lightbulb size={11} /></span>}
                {isUnreadable && <span className="lc-vr-icon err-icon" title="로직을 해석하지 못했습니다">!</span>}
                {item._fixed && <span className="lc-vr-icon" title="로직을 고쳐 다시 판정했습니다"><Edit2 size={11} /></span>}
            </div>
            <div className="lc-vr-label" title={item.title || item.label || ''}>
                {item.title || item.label || ''}
            </div>
            {noData ? (
                <div className="lc-vr-nodata">
                    {isUnreadable ? '로직 해석 불가' : !item.hasLogic ? '로직 없음 · 판정 안 함' : item.status === 'noResponse' ? '응답 없음' : '판정 전'}
                </div>
            ) : (
                <>
                    <div className="lc-vr-bar">
                        <div style={{ width: `${bAnswered}%`, background: BAR.blue }} />
                        <div style={{ width: `${bMissing > 0 ? Math.max(bMissing, 1.5) : 0}%`, background: BAR.red }} />
                        <div style={{ width: `${bUnexpected > 0 ? Math.max(bUnexpected, 1.5) : 0}%`, background: BAR.orange }} />
                        <div style={{ width: `${bRest}%`, background: C.gray }} />
                    </div>
                    <div className="lc-vr-nums">
                        <span className="lc-vr-base">대상자 {fmt(base)} · {base && total ? ((base / total) * 100).toFixed(1) : 0}%</span>
                        <span className={`lc-vr-num${missing > 0 ? ' red' : ' zero'}`}>{fmt(missing)}</span>
                        <span className={`lc-vr-num${unexpected > 0 ? ' orange' : ' zero'}`}>{fmt(unexpected)}</span>
                    </div>
                </>
            )}
        </div>
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// 오른쪽 상세 — 베이스 칸 (4칸)
// ─────────────────────────────────────────────────────────────────────────────
function BaseQuad({ item, checkedResponses, selectedKind, onSelectKind }) {
    // 선택 칸 테두리 — 그 칸 색의 진한 색
    const DARK = { [C.blue]: '#1f6fe5', [C.red]: '#be123c', [C.orange]: '#b45309', '#64748b': '#334155' };
    const base = item?.base ?? 0;
    const answered = item?.answered ?? 0;
    const missing = item?.missing ?? 0;
    const unexpected = item?.unexpected ?? 0;
    const nonTarget = Math.max(0, (checkedResponses || 0) - base);
    const nonTargetMissing = Math.max(0, nonTarget - unexpected);

    const cells = [
        {
            key: 'base', label: '대상자', value: base, sub: null,
            color: C.blue, bgColor: C.blueLight,
            children: [
                { key: 'answered', label: '응답', value: answered, color: C.blue, bgColor: C.blueLight },
                { key: 'missing', label: '무응답', value: missing, color: C.red, bgColor: C.redLight, isProblem: missing > 0 },
            ]
        },
        {
            key: 'nonTarget', label: '비대상', value: nonTarget, sub: null,
            color: '#64748b', bgColor: '#f1f5f9', clickable: false,
            children: [
                { key: 'unexpected', label: '응답', value: unexpected, color: C.orange, bgColor: C.orangeLight, isProblem: unexpected > 0 },
                { key: 'nonTargetMissing', label: '무응답', value: nonTargetMissing, color: C.gray, bgColor: C.grayLight, clickable: false },
            ]
        }
    ];

    return (
        <div className="lc-basequad">
            {cells.map(group => (
                <div key={group.key} className="lc-bq-group">
                    <button
                        type="button"
                        className={`lc-bq-cell head${selectedKind === group.key ? ' selected' : ''}`}
                        style={selectedKind === group.key ? { '--sel': DARK[group.color] || group.color, background: group.bgColor } : {}}
                        onClick={() => onSelectKind?.(group.key)}
                        disabled={group.clickable === false}
                    >
                        <span className="lc-bq-label">{group.label}</span>
                        <span className="lc-bq-value">{fmt(group.value)}</span>
                    </button>
                    <div className="lc-bq-subs">
                        {group.children.map(c => (
                            <button
                                key={c.key}
                                type="button"
                                className={`lc-bq-cell sub${c.isProblem ? ' problem' : ''}${selectedKind === c.key ? ' selected' : ''}${c.value === 0 ? ' zero' : ''}`}
                                style={selectedKind === c.key ? { '--sel': DARK[c.color] || c.color, background: c.bgColor } : {}}
                                onClick={() => c.value > 0 && c.clickable !== false && onSelectKind?.(c.key)}
                                disabled={c.clickable === false || c.value === 0}
                            >
                                <span className="lc-bq-label">{c.label}</span>
                                <span className="lc-bq-value" style={c.value > 0 ? { color: c.color, fontWeight: 700 } : {}}>
                                    {fmt(c.value)}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────
const LogicCheckTab = ({
    variables = [],
    auth,
    generateLogicChecks,
    runCheckLogic,
    fetchCheckLogicDetail,
    getCheckLogicFixForm,
    restoreExcelVersion, // 복원 지점 되돌리기 (자동 채우기 결과 창)
    onMapReload,
    onGoToVariable, // 맵 그 문항 줄로 이동 + 로직 편집
    onLogicSaved,   // (mapId, logic, info) — 서버 저장 끝난 뒤 부모 맵 상태 맞춤
    checkLogicOne,  // POST /check-logic/one
    getCheckLogicSyntax, // GET /check-logic/syntax
}) => {
    const modal = useContext(modalContext);
    const loadingSpinner = useContext(loadingSpinnerContext);
    const pn = sessionStorage.getItem('merge_pn') || sessionStorage.getItem('projectnum') || '';
    const userId = auth?.user?.userId || '';

    // ── 전체 상태 ──
    const [judgeResult, setJudgeResult] = useState(null);   // { items, unreadable, summary, checkedResponses, judgedAt }
    const [isProgressing, setIsProgressing] = useState(false);
    const [progressData, setProgressData] = useState({ title: '', message: '', percent: 0 });
    const [abortFn, setAbortFn] = useState(null);

    // ── 왼쪽 목록 상태 ──
    const [filter, setFilter] = useState('error');          // 거르개
    const [copyMenuOpen, setCopyMenuOpen] = useState(false);
    const [hintsOpen, setHintsOpen] = useState(false);
    const copyMenuRef = useRef(null);
    useEffect(() => {
        if (!copyMenuOpen) return;
        const onDown = (e) => { if (!copyMenuRef.current?.contains(e.target)) setCopyMenuOpen(false); };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [copyMenuOpen]);
    const [sortKey, setSortKey] = useState('order');        // 정렬
    const [listSearch, setListSearch] = useState('');       // 찾기
    const [selectedVar, setSelectedVar] = useState(null);   // 선택된 item
    useEffect(() => { setHintsOpen(false); }, [selectedVar?.variable]);
    const [logicEditOpen, setLogicEditOpen] = useState(false);

    // ── 오른쪽 상세 상태 ──
    const [detail, setDetail] = useState(null);              // API 응답
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailKind, setDetailKind] = useState(null);      // 현재 표시 kind
    const [selectedKind, setSelectedKind] = useState(null);  // 베이스 칸 선택
    const [codeFilter, setCodeFilter] = useState(null);      // 분포 → 응답자 필터
    const detailAbortRef = useRef(null);
    const selectDebounceRef = useRef(null);

    // ── ··· 메뉴 ──
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);

    // ── 판정 정보·버튼 줄은 맵 관리 탭 줄 오른쪽(#map-tab-extra)에 그린다 ──
    const [tabBarSlot, setTabBarSlot] = useState(null);
    useEffect(() => { setTabBarSlot(document.getElementById('map-tab-extra')); }, []);
    const renderInTabBar = (node) => (tabBarSlot ? createPortal(node, tabBarSlot) : node);

    // ─── 로직 보유 현황 (준비 화면용) ───
    const totalCount = variables.length;
    const logicCount = useMemo(
        () => variables.filter(v => String(v.logic || '').trim() !== '').length,
        [variables]
    );
    const isLogicReady = logicCount > 0;
    const isJudged = !!judgeResult;

    // ─── ··· 메뉴 외부 클릭 닫기 ───
    useEffect(() => {
        if (!isMenuOpen) return;
        const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setIsMenuOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [isMenuOpen]);

    // ─── 진행 중 요청 — 화면을 떠나면 끊는다 (정의서: 창을 닫으면 멈춤 · 채운 만큼은 맵에 남음) ───
    const activeAbortRef = useRef(null);
    const unmountedRef = useRef(false);
    useEffect(() => {
        unmountedRef.current = false;
        return () => {
            unmountedRef.current = true;
            activeAbortRef.current?.abort();
        };
    }, []);

    // ─── SignalR 진행 공통 ───
    const runWithProgress = useCallback(async (title, apiFn, onDone, onStop) => {
        setIsProgressing(true);
        setProgressData({ title, message: '준비하고 있습니다…', percent: 0 });

        let conn = null;
        let aborted = false;
        let connId = null;

        try {
            conn = await createSignalRConnection();
            connId = conn?.connectionId || null;

            if (conn) {
                conn.on('ReceiveProgress', (data) => {
                    setProgressData(prev => ({
                        ...prev,
                        message: data.message || prev.message,
                        percent: data.percent ?? prev.percent,
                    }));
                });
            }

            // abort 함수 등록 — 요청 자체를 끊는다 (별도 중지 API 없음)
            const abortController = new AbortController();
            activeAbortRef.current = abortController;
            setAbortFn(() => () => {
                aborted = true;
                abortController.abort();
            });

            const res = await apiFn(connId, abortController.signal);
            if (unmountedRef.current) return;
            if (aborted || res?.canceled) { onStop?.(); return; }

            if (String(res?.success) === '777') {
                await onDone(res);
            } else {
                const msg = res?.resultjson?.errorcontent || res?.errorcontent || res?.message || '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
                modal?.showErrorAlert?.('오류', msg);
            }
        } catch (err) {
            if (unmountedRef.current) return;
            if (aborted) {
                onStop?.();
            } else {
                console.error(err);
                const msg = err?.response?.data?.resultjson?.errorcontent || err?.response?.data?.message || err?.message || '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
                modal?.showErrorAlert?.('오류', msg);
            }
        } finally {
            activeAbortRef.current = null;
            if (conn) { try { conn.stop(); } catch { /* ignore */ } }
            if (!unmountedRef.current) {
                setIsProgressing(false);
                setAbortFn(null);
            }
        }
    }, [modal]);

    // ─── A. 자동 채우기 ───
    const [autoFillDialog, setAutoFillDialog] = useState(null); // null | { restart }
    const handleAutoFill = useCallback((restart = false) => {
        setAutoFillDialog({ restart });
    }, []);

    const runAutoFill = useCallback(async (restart = false) => {
        const doFill = async () => {
            await runWithProgress(
                '로직 자동 채우기',
                async (connId, signal) => {
                    const payload = { pn, user: userId, connectionId: connId, signal };
                    if (restart) payload.restart = true;
                    return generateLogicChecks?.mutateAsync(payload);
                },
                async (res) => {
                    const rj = res?.resultjson || {};
                    // message 는 응답 최상위에 옴 (resultjson 안이 아님)
                    setFillResult({ ...rj, message: res?.message || rj.message || '' });
                    onMapReload?.();
                    setJudgeResult(null); // 판정 결과 초기화 — 로직이 바뀌었으니 다시 판정
                },
                () => {
                    modal?.showAlert?.('알림', restart
                        ? '멈췄습니다. 아직 채우지 않은 문항은 빈 칸으로 남아 있습니다.\n다시 [자동 채우기]를 눌러 마저 채우거나, 복원 지점으로 되돌려 주세요.'
                        : '멈췄습니다. 지금까지 채운 문항은 맵에 남아 있습니다.\n다시 누르면 남은 문항부터 이어서 채웁니다.');
                    onMapReload?.();
                }
            );
        };

        await doFill();
    }, [pn, userId, generateLogicChecks, modal, onMapReload, runWithProgress]);

    // ─── B. 채움 결과 창 ───
    const [fillResult, setFillResult] = useState(null);

    // 복원 지점으로 되돌리기 — POST /map/history/restore { pn, user, versionId }
    const handleRestore = useCallback((versionId) => {
        modal?.showConfirm?.('자동 채우기 전으로 되돌리기',
            '맵을 자동 채우기 전 상태(복원 지점 「로직 자동 채움 전」)로 되돌립니다.\n이번에 채운 로직은 모두 사라집니다.', {
            btns: [
                { title: '취소', click: () => { } },
                {
                    title: '되돌리기',
                    click: async () => {
                        try {
                            const res = await restoreExcelVersion?.mutateAsync({ pn, user: userId, versionId });
                            if (String(res?.success) === '777') {
                                setFillResult(null);
                                setJudgeResult(null); // 로직이 바뀌었으니 다시 판정
                                setSelectedVar(null);
                                setDetail(null);
                                onMapReload?.();
                                modal?.showAlert?.('알림', '자동 채우기 전으로 되돌렸습니다.');
                            } else {
                                modal?.showErrorAlert?.('오류', res?.resultjson?.errorcontent || res?.message || '되돌리지 못했습니다. 맵 관리의 변경 이력에서 다시 시도해 주세요.');
                            }
                        } catch (err) {
                            console.error(err);
                            modal?.showErrorAlert?.('오류', err?.response?.data?.resultjson?.errorcontent || '되돌리지 못했습니다. 잠시 후 다시 시도해 주세요.');
                        }
                    }
                },
            ]
        });
    }, [modal, restoreExcelVersion, pn, userId, onMapReload]);

    // ─── C. 판정 ───
    const handleJudge = useCallback(async () => {
        await runWithProgress(
            '로직 판정',
            async (connId, signal) => runCheckLogic?.mutateAsync({ pn, user: userId, connectionId: connId, signal }),
            async (res) => {
                const rj = res?.resultjson || {};
                setJudgeResult({
                    items: rj.items || [],
                    unreadable: rj.unreadable || [],
                    summary: rj.summary || {},
                    checkedResponses: rj.checkedResponses || 0,
                    judgedAt: new Date().toLocaleString('ko-KR'),
                });
                setFilter('error');
                setSortKey('order');
                setSelectedVar(null);
                setDetail(null);
                const judgeMsg = res?.message || rj.message;
                if (judgeMsg) modal?.showAlert?.('판정 완료', judgeMsg);
            },
            null
        );
    }, [pn, userId, runCheckLogic, modal, runWithProgress]);

    // ─── D. 왼쪽 목록 — 필터·정렬·검색 ───
    const listItems = useMemo(() => {
        if (!judgeResult) return [];
        const { items, unreadable } = judgeResult;

        // 언리더블은 별도 플래그
        const unreadableSet = new Set((unreadable || []).map(u => u.variable));
        const enriched = items.map(it => ({ ...it, _unreadable: unreadableSet.has(it.variable) }));

        let filtered = enriched;
        if (filter === 'error') {
            filtered = enriched.filter(it => it.status === 'error' || it._unreadable || it._fixed);
        } else if (filter === 'noResponse') {
            filtered = enriched.filter(it => it.status === 'noResponse');
        } else if (filter === 'noLogic') {
            filtered = enriched.filter(it => !it.hasLogic);
        }

        // 검색
        if (listSearch.trim()) {
            const q = listSearch.toLowerCase();
            filtered = filtered.filter(it =>
                (it.variable || '').toLowerCase().includes(q) ||
                (it.title || it.label || '').toLowerCase().includes(q) ||
                (it.logic || '').toLowerCase().includes(q)
            );
        }

        // 정렬
        const safeN = (v) => (v == null ? -1 : Number(v));
        if (sortKey === 'confirm') {
            filtered = [...filtered].sort((a, b) => (safeN(b.missing) + safeN(b.unexpected)) - (safeN(a.missing) + safeN(a.unexpected)));
        } else if (sortKey === 'missing') {
            filtered = [...filtered].sort((a, b) => safeN(b.missing) - safeN(a.missing));
        } else if (sortKey === 'unexpected') {
            filtered = [...filtered].sort((a, b) => safeN(b.unexpected) - safeN(a.unexpected));
        } else if (sortKey === 'base') {
            filtered = [...filtered].sort((a, b) => safeN(b.base) - safeN(a.base));
        }

        return filtered;
    }, [judgeResult, filter, sortKey, listSearch]);

    // ─── F. 오른쪽 상세 — 변수 선택 시 API 호출 ───
    const loadDetail = useCallback(async (item, kindOverride) => {
        // 이전 요청 취소
        if (detailAbortRef.current) {
            detailAbortRef.current.abort();
        }
        const ac = new AbortController();
        detailAbortRef.current = ac;

        const isUnreadable = item._unreadable;
        const kind = kindOverride || (
            isUnreadable || !item.hasLogic || item.status === 'noResponse'
                ? 'values'
                : item.unexpected > 0
                    ? 'unexpected'
                    : 'missing'
        );

        setDetailLoading(true);
        setDetailKind(kind);
        setCodeFilter(null);

        try {
            const res = await fetchCheckLogicDetail?.(
                { pn, user: userId, variable: item.variable || item.sysName, kind, limit: 5000 },
                ac.signal
            );
            if (res?.resultjson?.canceled || ac.signal.aborted) return;
            if (String(res?.success) === '777') {
                const rj = res.resultjson || {};
                // 네 칸을 눌러 다시 부른 경우 분포는 처음 받은 것 그대로
                setDetail(prev => (kindOverride && prev?.distribution)
                    ? { ...rj, distribution: prev.distribution, _distKind: prev._distKind, _kind: kind, _item: item }
                    : { ...rj, _distKind: rj.kind || kind, _kind: rj.kind || kind, _item: item });
            } else {
                const msg = res?.resultjson?.errorcontent || res?.errorcontent || '문항 상세를 불러오지 못했습니다.';
                modal?.showErrorAlert?.('오류', msg);
                setDetail(null);
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                modal?.showErrorAlert?.('오류', '문항 상세를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
            }
            setDetail(null);
        } finally {
            // 취소된 이전 요청이 새 요청의 로딩 표시를 끄지 않게
            if (detailAbortRef.current === ac) setDetailLoading(false);
        }
    }, [pn, userId, fetchCheckLogicDetail, modal]);

    // 베이스 칸 클릭 → 재호출
    const handleKindSelect = useCallback(async (kind) => {
        if (!selectedVar) return;
        setSelectedKind(kind);
        setCodeFilter(null);
        // values가 아닌 경우 재호출
        if (kind !== 'nonTarget' && kind !== 'nonTargetMissing') {
            await loadDetail(selectedVar, kind);
        }
    }, [selectedVar, loadDetail]);

    // 변수 행 클릭 — debounce 후 로드
    const handleVarClick = useCallback((item) => {
        if (selectDebounceRef.current) clearTimeout(selectDebounceRef.current);
        selectDebounceRef.current = setTimeout(() => {
            setSelectedVar(item);
            setSelectedKind(null);
            setDetail(null);
            setCodeFilter(null);
            loadDetail(item);
        }, 80);
    }, [loadDetail]);

    // ─── 재검사 후 왼쪽 목록에서 그 문항으로 이동 ───
    const pendingScrollRef = useRef(null);
    useEffect(() => {
        const name = pendingScrollRef.current;
        if (!name) return;
        if (!listItems.some(x => (x.variable || x.sysName) === name)) {
            // 지금 거르개·찾기에서 빠졌으면 전체로 바꿔 보여 줌
            if (filter !== 'all' || listSearch) { setFilter('all'); setListSearch(''); }
            else pendingScrollRef.current = null;
            return;
        }
        pendingScrollRef.current = null;
        requestAnimationFrame(() => {
            const el = document.querySelector(`.lc-var-row[data-var="${CSS.escape(name)}"]`);
            el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        });
    }, [listItems, filter, listSearch]);

    // ─── 로직 고치기 — 그 문항만 다시 판정하고 저장 (check-logic/one) ───
    // 돌려주는 값: { logic? (입력칸에 다시 넣을 식), error? (창 안에 보여 줄 이유) }
    const saveLogicRef = useRef(null);
    const handleSaveLogicOne = useCallback(async (item, mapVar, text, info, opts = {}) => {
        const variable = item.variable || item.sysName;
        // 바뀐 것 없음 · 지우기 확인은 로직 수정 창에서 먼저 함
        const isClear = String(text || '').trim() === '';

        let res;
        try {
            res = await checkLogicOne?.({ pn, user: userId, variable, logic: isClear ? '' : text, save: true });
        } catch {
            return { error: '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' };
        }
        const rj = res?.resultjson || {};
        if (String(res?.success) !== '777') {
            const msg = rj.errorcontent || res?.errorcontent || res?.message || '저장하지 못했습니다.';
            if (opts.revert) { modal?.showErrorAlert?.('오류', msg); return { error: msg }; }
            return { error: String(res?.success) === '904' ? `읽지 못해 저장하지 않았습니다 — ${msg}` : msg };
        }

        const savedLogic = rj.logic ?? (isClear ? '' : text);
        if (rj.saved !== false && mapVar) onLogicSaved?.(mapVar.id, savedLogic, isClear ? null : info);

        // 판정 결과에서 그 문항 한 줄만 바꿔 끼우기 (✎ 고침 · 다시 판정 전)
        const same = (x) => (x?.variable || x?.sysName) === variable;
        const newItem = rj.item
            ? { ...rj.item, _fixed: true }
            : { ...item, _unreadable: false, hasLogic: !isClear, logic: savedLogic, status: isClear ? undefined : item.status, _fixed: true };
        delete newItem._unreadable;
        setJudgeResult(prev => {
            if (!prev) return prev;
            const inItems = prev.items.some(same);
            return {
                ...prev,
                items: inItems ? prev.items.map(x => same(x) ? newItem : x) : [...prev.items, newItem],
                unreadable: (prev.unreadable || []).filter(x => !same(x)),
            };
        });
        setLogicEditOpen(false);
        pendingScrollRef.current = variable;
        setSelectedVar(newItem);
        setSelectedKind(null);
        setDetail(null);
        loadDetail(newItem);

        // 알림 + [되돌리기] (previousLogic 으로 다시 저장)
        const statusText = !newItem.hasLogic ? ''
            : newItem.status === 'ok' ? '정상'
                : newItem.status === 'noResponse' ? '응답 없음'
                    : `대상자 무응답 ${fmt(newItem.missing || 0)}명 · 비대상 응답 ${fmt(newItem.unexpected || 0)}명`;
        const msg = opts.revert
            ? `되돌렸습니다${statusText ? ` · ${statusText}` : ''}`
            : isClear ? '로직을 지웠습니다.'
                : `저장하고 ${variable} 만 다시 판정했습니다 · ${statusText}`;
        const prevLogic = rj.previousLogic;
        if (!opts.revert && prevLogic != null && normLogic(prevLogic) !== normLogic(savedLogic)) {
            modal?.showConfirm?.('알림', msg, {
                btns: [
                    { title: '닫기', click: () => { } },
                    { title: '되돌리기', click: () => saveLogicRef.current?.(newItem, mapVar, prevLogic, undefined, { revert: true }) },
                ],
            });
        } else {
            modal?.showAlert?.('알림', msg);
        }
        return { logic: savedLogic };
    }, [pn, userId, checkLogicOne, onLogicSaved, modal, loadDetail]);
    saveLogicRef.current = handleSaveLogicOne;

    // ─── 수정 양식 받기 ───
    const [fixLoading, setFixLoading] = useState(false);
    const handleFixForm = useCallback(async (variable) => {
        setFixLoading(true);
        loadingSpinner?.show?.();
        try {
            const res = await getCheckLogicFixForm?.mutateAsync({ pn, user: userId, variable });
            // Content-Type이 json이면 오류
            const contentType = res?.headers?.['content-type'] || '';
            if (contentType.includes('application/json')) {
                const text = await res?.data?.text?.();
                let msg = '수정 양식을 내려받지 못했습니다.';
                try { const j = JSON.parse(text); msg = j.errorcontent || j.message || msg; } catch (_e) { /* ignore */ }
                modal?.showErrorAlert?.('오류', msg);
                return;
            }
            // 파일 다운로드
            const blob = new Blob([res?.data], { type: res?.headers?.['content-type'] || 'application/octet-stream' });
            const disposition = res?.headers?.['content-disposition'] || '';
            const nameMatch = disposition.match(/filename[^;=\n]*=(?:(['"]).*?\1|[^;\n]*)/i);
            const filename = nameMatch ? decodeURIComponent(nameMatch[1] || nameMatch[0]).replace(/^['"]|['"]$/g, '') : `fix_${variable}.xlsx`;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = filename; document.body.appendChild(a); a.click();
            setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);
        } catch (err) {
            modal?.showErrorAlert?.('오류', '수정 양식을 내려받지 못했습니다. 잠시 후 다시 시도해 주세요.');
        } finally {
            loadingSpinner?.hide?.();
            setFixLoading(false);
        }
    }, [pn, userId, getCheckLogicFixForm, modal, loadingSpinner]);

    // 힌트가 있는 문항은 받기 전에 한 번 묻기 — 로직이 틀렸다면 정상 응답을 지우게 됨
    const requestFixForm = useCallback((item) => {
        const variable = item.variable || item.sysName;
        if (!(item.hints?.length > 0)) { handleFixForm(variable); return; }
        modal?.showConfirm?.('알림',
            `로직부터 확인해 주세요.\n로직이 틀렸다면 지금 받는 양식은 비대상 응답 ${fmt(item.unexpected || 0)}명은 모두 삭제(1) · 대상자 무응답 ${fmt(item.missing || 0)}명은 값 채우기로 들어갑니다.`,
            {
                btns: [
                    { title: '로직 수정', click: () => setLogicEditOpen(true) },
                    { title: '그래도 받기', click: () => handleFixForm(variable) },
                ],
            });
    }, [handleFixForm, modal]);

    // ─── 코드 → 보기 이름 (분포 all 에서) ───
    const labelMap = useMemo(() => {
        const m = new Map();
        (detail?.distribution?.all || []).forEach(e => { if (e.code !== '' && e.label != null) m.set(String(e.code), e.label); });
        return m;
    }, [detail]);

    // 값 「1 가족」 — 멀티는 코드마다 이어서
    const renderValue = useCallback((val, isCond) => {
        if (val === '' || val == null) {
            return <span style={{ color: isCond ? '#94a3b8' : C.red, fontSize: '12px' }}>무응답</span>;
        }
        if (isCond) return <span style={{ color: '#94a3b8' }}>{String(val)}</span>;
        const codes = String(val).split(',');
        return codes.map((c, i) => {
            const lb = labelMap.get(c.trim());
            return (
                <span key={i}>
                    {i > 0 && ', '}
                    <b>{c.trim()}</b>{lb ? ` ${lb}` : ''}
                </span>
            );
        });
    }, [labelMap]);

    // 코드 거르기 적용한 rows (이미 받은 rows 안에서)
    const filteredRows = useMemo(() => {
        const rows = detail?.rows || [];
        if (!codeFilter) return rows;
        const target = String(codeFilter.code);
        return rows.filter(r => String(r.value ?? '').split(',').map(s => s.trim()).includes(target));
    }, [detail, codeFilter]);

    // ─── PID 복사 ───
    // 서버에서 받은 복사 데이터 캐시 — 포커스 문제로 실패해도 다시 누르면 서버 안 부르고 바로 복사
    const copyCacheRef = useRef({});
    const writeClipboard = useCallback(async (text, html) => {
        try {
            if (html && window.ClipboardItem) {
                await navigator.clipboard.write([new ClipboardItem({
                    'text/plain': new Blob([text], { type: 'text/plain' }),
                    'text/html': new Blob([html], { type: 'text/html' }),
                })]);
            } else {
                await navigator.clipboard.writeText(text);
            }
            return true;
        } catch {
            return copySync(text, html);
        }
    }, []);

    // 글자 복사가 막히면(포커스 등) → [확인] 클릭 순간에 복사 (다시 버튼 누를 필요 없음)
    const copyOrConfirm = useCallback(async (text, html, count) => {
        if (await writeClipboard(text, html)) {
            modal?.showAlert?.('알림', `${fmt(count)}개를 복사했습니다.\n필요한 곳에 붙여넣기 하세요.`);
            return;
        }
        modal?.showAlert?.('알림', `${fmt(count)}개를 복사할 준비가 됐습니다.\n[확인]을 누르면 복사됩니다.`, null, () => {
            const ok = copySync(text, html);
            // 모달이 닫힌 뒤 결과 알림
            setTimeout(() => {
                if (ok) modal?.showAlert?.('알림', `${fmt(count)}개를 복사했습니다.\n필요한 곳에 붙여넣기 하세요.`);
                else modal?.showErrorAlert?.('오류', '복사하지 못했습니다. 브라우저의 클립보드 권한을 확인해 주세요.');
            }, 0);
        });
    }, [writeClipboard, modal]);

    const handleCopyPids = useCallback(async (mode) => {
        if (!detail || !selectedVar) return;
        const variable = detail.variable || selectedVar.variable || selectedVar.sysName;
        const condVars = detail.conditionVariables || [];
        const total = detail.total ?? (detail.rows || []).length;
        const useLocal = codeFilter || total <= 5000;
        try {
            const cacheKey = `${pn}|${variable}|${detailKind}|${mode}`;
            if (mode === 'comma') {
                let pids;
                if (useLocal) {
                    pids = filteredRows.map(r => r.pid);
                } else if (copyCacheRef.current[cacheKey]) {
                    pids = copyCacheRef.current[cacheKey];
                } else {
                    loadingSpinner?.show?.();
                    let res;
                    try { res = await fetchCheckLogicDetail?.({ pn, user: userId, variable, kind: detailKind, pidsOnly: true }); }
                    finally { loadingSpinner?.hide?.(); }
                    if (String(res?.success) !== '777') throw new Error(res?.resultjson?.errorcontent || res?.errorcontent || '');
                    pids = res.resultjson?.pids || [];
                    copyCacheRef.current[cacheKey] = pids;
                }
                await copyOrConfirm(pids.join(','), null, pids.length);
                return;
            }
            // 엑셀에 붙일 표
            let columns, rows;
            if (useLocal) {
                columns = ['PID', variable, ...condVars];
                rows = filteredRows.map(r => [r.pid, r.value ?? '', ...condVars.map(c => r.conditions?.[c] ?? '')]);
            } else if (copyCacheRef.current[cacheKey]) {
                ({ columns, rows } = copyCacheRef.current[cacheKey]);
            } else {
                loadingSpinner?.show?.();
                let res;
                try { res = await fetchCheckLogicDetail?.({ pn, user: userId, variable, kind: detailKind, copyRows: true }); }
                finally { loadingSpinner?.hide?.(); }
                if (String(res?.success) !== '777') throw new Error(res?.resultjson?.errorcontent || res?.errorcontent || '');
                columns = res.resultjson?.columns || [];
                rows = res.resultjson?.rows || [];
                copyCacheRef.current[cacheKey] = { columns, rows };
            }
            const tsv = [columns, ...rows].map(r => r.map(v => String(v ?? '')).join('\t')).join('\n');
            const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const html = '<table>' + [columns, ...rows].map(r =>
                '<tr>' + r.map(v => `<td style="mso-number-format:'\\@'">${esc(v)}</td>`).join('') + '</tr>'
            ).join('') + '</table>';
            await copyOrConfirm(tsv, html, rows.length);
        } catch (err) {
            modal?.showErrorAlert?.('오류', err?.message || '복사하지 못했습니다. 브라우저의 클립보드 권한을 확인해 주세요.');
        }
    }, [detail, selectedVar, codeFilter, filteredRows, detailKind, fetchCheckLogicDetail, pn, userId, modal, copyOrConfirm, loadingSpinner]);

    // ─── 분포 표 렌더 ───
    // 분포는 문항을 열 때 받은 것(distKind 기준)을 그대로 둔다
    const DistTable = useMemo(() => {
        const dist = detail?.distribution;
        if (!dist || !selectedVar) return null;
        const distKind = detail._distKind;
        const isValues = distKind === 'values';
        const byCode = !!dist.byCode;

        const allMap = new Map();
        (dist.all || []).forEach(e => allMap.set(String(e.code), e));
        const matchedMap = new Map();
        (dist.matched || []).forEach(e => matchedMap.set(String(e.code), e.count || 0));

        // 무응답("") 줄은 따로
        const blank = allMap.get('')?.count || 0;
        const mkEntry = (code, label, e) => {
            const total = e?.count || 0;
            const out = distKind === 'unexpected' ? (matchedMap.get(String(code)) || 0) : 0;
            return { code, label, total, inT: total - out, outT: out };
        };
        // 맵 보기(/read labels) — 있으면 그 차례대로, 0건 보기도 0줄
        const varName = detail.variable || selectedVar.variable || selectedVar.sysName;
        const mapVar = variables.find(v => v.name === varName || v.sysName === varName);
        const mapLabels = mapVar?.labels || [];
        const hasAnyLabel = mapLabels.length > 0;
        const entries = [];
        if (hasAnyLabel) {
            const seen = new Set();
            mapLabels.forEach(l => {
                const code = String(l.code);
                seen.add(code);
                entries.push(mkEntry(l.code, l.label, allMap.get(code)));
            });
            // 맵 보기에 없는 코드 → 맨 아래
            allMap.forEach((e, code) => {
                if (code === '' || seen.has(code)) return;
                entries.push(mkEntry(e.code, null, e));
            });
        } else {
            allMap.forEach((e, code) => { if (code !== '') entries.push(mkEntry(e.code, e.label, e)); });
        }

        const sumIn = entries.reduce((s, e) => s + e.inT, 0);
        const sumOut = entries.reduce((s, e) => s + e.outT, 0);
        const denom = byCode ? (dist.allRespondents || 0) : (isValues ? entries.reduce((s, e) => s + e.total, 0) : sumIn);
        const maxCount = Math.max(...entries.map(e => e.total), 1);
        const missingIn = selectedVar.missing ?? 0;
        const missingOut = Math.max(0, blank - missingIn);
        const canFilter = detail._kind === 'unexpected' && (detail.total ?? 0) <= 5000;
        const shown = entries.length;
        const cut = (dist.allDistinct || 0) > shown + (blank ? 1 : 0) ? dist.allDistinct - shown - (blank ? 1 : 0) : 0;

        const Bar = ({ inT, outT, inColor = BAR.blue, outColor = BAR.orange }) => (
            <div className="lc-dist-track">
                <div style={{ width: `${(inT / maxCount) * 100}%`, background: inColor }} />
                <div style={{ width: `${(outT / maxCount) * 100}%`, background: outColor }} />
            </div>
        );

        return (
            <div className={`lc-dist-wrap${isValues ? ' full' : ''}`}>
                <div className="lc-dist-title">
                    {byCode ? '고른 코드' : '응답값 분포'}
                    {byCode && <span className="lc-dist-sub">여러 개 고르는 문항 — 코드마다 고른 사람 수</span>}
                </div>
                <div className="lc-dist-scroll">
                    <table className="lc-dist-table">
                        <colgroup>
                            <col style={{ width: '56px' }} />
                            <col style={{ width: '30%' }} />
                            <col />
                            {isValues ? <col style={{ width: '72px' }} /> : <>
                                <col style={{ width: '68px' }} />
                                <col style={{ width: '68px' }} />
                                <col style={{ width: '68px' }} />
                            </>}
                        </colgroup>
                        <thead>
                            <tr>
                                <th>코드</th>
                                <th>보기</th>
                                <th>분포</th>
                                {isValues ? <th className="num">응답</th> : <>
                                    <th className="num">대상자</th>
                                    <th className="num">비대상</th>
                                    <th className="num">계</th>
                                </>}
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((e, i) => {
                                const noLabel = hasAnyLabel && e.label == null;
                                const base = isValues ? e.total : e.inT;
                                // 대상자 응답이 하나도 없으면(전부 비대상 응답) → 비대상 응답 기준 비율(주황) — 막대와 맞춤
                                const outBased = !denom && !isValues && sumOut > 0;
                                const pct = denom ? `${(base / denom * 100).toFixed(1)}%`
                                    : outBased ? `${(e.outT / sumOut * 100).toFixed(1)}%` : '–';
                                return (
                                    <tr key={i} className={noLabel ? 'nolabel' : e.total === 0 ? 'zero' : ''}>
                                        <td className="code">{hasAnyLabel ? e.code : ''}</td>
                                        <td title={hasAnyLabel ? (e.label ?? '보기에 없는 코드') : String(e.code)}>
                                            {hasAnyLabel ? (e.label ?? '보기에 없는 코드') : e.code}
                                        </td>
                                        <td>
                                            <div className="lc-dist-bar-wrap">
                                                <Bar inT={isValues ? e.total : e.inT} outT={isValues ? 0 : e.outT} />
                                                <span className="lc-dist-pct" style={outBased ? { color: C.orange } : undefined}
                                                    title={outBased ? '대상자 응답이 없어 비대상 응답 기준 비율입니다' : undefined}>{pct}</span>
                                            </div>
                                        </td>
                                        {isValues ? <td className="num">{fmt(e.total)}</td> : <>
                                            <td className="num">{fmt(e.inT)}</td>
                                            <td className="num">
                                                {e.outT > 0 && canFilter ? (
                                                    <button type="button" className="lc-dist-num-btn" style={{ color: C.orange }}
                                                        onClick={() => setCodeFilter({ code: e.code, label: e.label })}>
                                                        {fmt(e.outT)}
                                                    </button>
                                                ) : (
                                                    <span style={e.outT > 0 ? { color: C.orange, fontWeight: 700 } : { color: '#cbd5e1' }}>{fmt(e.outT)}</span>
                                                )}
                                            </td>
                                            <td className="num">{fmt(e.total)}</td>
                                        </>}
                                    </tr>
                                );
                            })}
                            {!byCode && !isValues && (
                                <tr className="sum">
                                    <td />
                                    <td>응답 계</td>
                                    <td />
                                    <td className="num">{fmt(sumIn)}</td>
                                    <td className="num" style={{ color: sumOut ? C.orange : undefined }}>{fmt(sumOut)}</td>
                                    <td className="num">{fmt(sumIn + sumOut)}</td>
                                </tr>
                            )}
                            <tr className="blank">
                                <td />
                                <td>무응답</td>
                                <td>
                                    {!isValues && <Bar inT={missingIn} outT={missingOut} inColor={BAR.red} outColor="#e2e8f0" />}
                                </td>
                                {isValues ? <td className="num">{fmt(blank)}</td> : <>
                                    <td className="num">
                                        {missingIn > 0 ? (
                                            <button type="button" className="lc-dist-num-btn" style={{ color: C.red }}
                                                onClick={() => handleKindSelect('missing')}>
                                                {fmt(missingIn)}
                                            </button>
                                        ) : <span style={{ color: '#cbd5e1' }}>0</span>}
                                    </td>
                                    <td className="num" style={{ color: '#94a3b8' }}>{fmt(missingOut)}</td>
                                    <td className="num" style={{ color: '#94a3b8' }}>{fmt(blank)}</td>
                                </>}
                            </tr>
                        </tbody>
                    </table>
                </div>
                {cut > 0 && <div className="lc-dist-note">외 {fmt(cut)}종</div>}
            </div>
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [detail, selectedVar, variables, handleKindSelect]);

    // ─── 응답자 표 렌더 ───
    const RespTable = useMemo(() => {
        if (!detail?.rows || detail._kind === 'values') return null;
        if (!selectedKind && !codeFilter && (detail.total ?? detail.rows.length) === 0) return null; // 정상 문항 — 자리표
        const variable = detail.variable || selectedVar?.variable || selectedVar?.sysName;
        const condVars = detail.conditionVariables || [];
        const rows = filteredRows;
        const total = detail.total ?? rows.length;
        const kindLabel = {
            missing: '대상자 무응답', unexpected: '비대상 응답',
            base: '대상자 전체', answered: '대상자 응답',
        }[detail._kind] || '응답자';
        const dot = detail._kind === 'missing' ? C.red : detail._kind === 'unexpected' ? C.orange : C.blue;
        const count = codeFilter ? rows.length : total;

        return (
            <div className="lc-resp-wrap">
                <div className="lc-resp-head">
                    <span className="lc-resp-title">
                        <span className="lc-resp-dot" style={{ background: dot }} />
                        {kindLabel} {fmt(count)}명
                        {codeFilter && (
                            <button type="button" className="lc-chip" onClick={() => setCodeFilter(null)}>
                                코드 {codeFilter.code} {codeFilter.label || ''} <X size={11} />
                            </button>
                        )}
                    </span>
                    {count > 0 && (
                        <div className="lc-resp-actions">
                            <div className={`lc-dropdown-wrap${copyMenuOpen ? ' open' : ''}`} ref={copyMenuRef}>
                                <button type="button" className="lc-btn-outline" onClick={() => setCopyMenuOpen(o => !o)}>
                                    <Copy size={12} /> PID 복사 <ChevronDown size={11} />
                                </button>
                                <div className="lc-dropdown-menu">
                                    <button type="button" className="lc-copy-opt" onClick={() => { setCopyMenuOpen(false); handleCopyPids('excel'); }}>
                                        <span className="lc-copy-opt-title">표로 복사 (엑셀용)</span>
                                        <span className="lc-copy-opt-sub">PID · 응답값 열 그대로 · {fmt(count)}명</span>
                                    </button>
                                    <button type="button" className="lc-copy-opt" onClick={() => { setCopyMenuOpen(false); handleCopyPids('comma'); }}>
                                        <span className="lc-copy-opt-title">PID만 쉼표로 이어서</span>
                                        <span className="lc-copy-opt-sub">{(rows.slice(0, 2).map(r => r.pid).join(',') || '14556021,16444025')},… · {fmt(count)}명</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {rows.length === 0 ? (
                    <div className="lc-resp-empty">해당하는 응답자가 없습니다.</div>
                ) : (
                    <div className="lc-resp-table-wrap">
                        <table className="lc-resp-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '44px' }}>#</th>
                                    <th>PID</th>
                                    <th>{variable} <span className="lc-th-sub">이 문항</span></th>
                                    {condVars.map(c => <th key={c}>{c} <span className="lc-th-sub">조건</span></th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r, ri) => (
                                    <tr key={`${r.pid}-${ri}`}>
                                        <td className="idx">{ri + 1}</td>
                                        <td>{r.pid}</td>
                                        <td>{renderValue(r.value, false)}</td>
                                        {condVars.map(c => <td key={c}>{renderValue(r.conditions?.[c], true)}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {rows.length > 0 && (
                    <div className="lc-resp-foot">
                        {total > 5000 && !codeFilter
                            ? `앞 5,000명만 보입니다 — 복사는 ${fmt(total)}명 전부`
                            : `${fmt(count)}명 전부`}
                    </div>
                )}
            </div>
        );
    }, [detail, selectedVar, selectedKind, filteredRows, codeFilter, handleCopyPids, renderValue, copyMenuOpen]);

    // ─── 요약 문장 ───
    const summaryText = useMemo(() => {
        if (!selectedVar || !judgeResult) return null;
        const item = selectedVar;
        const isUnreadable = item._unreadable;
        const unreadableItem = isUnreadable
            ? judgeResult.unreadable?.find(u => u.variable === item.variable)
            : null;

        if (isUnreadable) return { text: `로직을 해석하지 못해 판정하지 않았습니다${unreadableItem?.reason ? ` — ${unreadableItem.reason}` : ''}`, color: C.orange };
        if (!item.hasLogic) return { text: '로직이 없어 판정하지 않았습니다', color: '#64748b' };
        if (item.status === 'noResponse') return { text: '이 문항에는 응답이 하나도 없습니다', color: '#64748b' };
        if (item._fixed) return { text: '로직을 고쳐 이 문항만 다시 판정했습니다', color: C.blue };
        if (item.status === 'ok') return { text: '모든 응답이 로직대로 들어왔습니다', color: C.green };

        const parts = [];
        if (item.missing > 0) parts.push(`대상자 ${fmt(item.base)}명 중 ${fmt(item.missing)}명이 응답하지 않았습니다`);
        if (item.unexpected > 0) parts.push(`건너뛰어야 할 비대상 중 ${fmt(item.unexpected)}명이 응답했습니다`);
        if (parts.length === 2) return { text: `대상자 무응답 ${fmt(item.missing)}명 · 비대상 응답 ${fmt(item.unexpected)}명을 확인해 주세요`, color: C.red };
        return { text: parts[0] || '확인이 필요합니다', color: C.red };
    }, [selectedVar, judgeResult]);

    // ───────────────────────────────────────────────────────────────────────
    // 렌더
    // ───────────────────────────────────────────────────────────────────────

    return (
        <div className="lc-root">
            {/* ── 진행 모달 ── */}
            {isProgressing && (
                <ProgressModal
                    title={progressData.title}
                    message={progressData.message}
                    percent={progressData.percent}
                    onAbort={abortFn}
                />
            )}

            {/* ── 자동 채우기 방식 선택 ── */}
            {fillResult && (
                <AutoFillResultDialog
                    result={fillResult}
                    onClose={() => setFillResult(null)}
                    onRestore={handleRestore}
                    onGoJudge={() => { setFillResult(null); handleJudge(); }}
                    onGoTo={(target, isSkip) => {
                        // 변수명 그대로 → 없으면 문항 번호("문12")로 제목 앞부분을 찾음
                        let name = target;
                        if (!variables.some(v => v.name === target || v.sysName === target)) {
                            const esc = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                            const re = new RegExp(`^${esc}(?![0-9-])`);
                            const hit = variables.find(v => re.test(String(v.label || '').trim()));
                            name = hit ? (hit.name || hit.sysName) : null;
                        }
                        if (name && onGoToVariable?.(name)) {
                            setFillResult(null);
                        } else {
                            modal?.showAlert?.('알림', `맵에서 「${target}」 문항을 찾지 못했습니다.${isSkip ? '\n건너뛰기 시작 문항을 맵에서 직접 찾아 주세요.' : ''}`);
                        }
                    }}
                />
            )}
            {autoFillDialog && (
                <AutoFillDialog
                    initialRestart={autoFillDialog.restart}
                    logicCount={logicCount}
                    totalCount={totalCount}
                    onCancel={() => setAutoFillDialog(null)}
                    onStart={(restart) => { setAutoFillDialog(null); runAutoFill(restart); }}
                />
            )}

            {/* ── 상단 서브헤더 ── */}
            {renderInTabBar(<div className="lc-subheader in-tabbar">
                <span className="lc-status">
                    {isJudged && (
                        <>
                            <span className="lc-status-dot done" />
                            <span title="완료 · 실사 응답 기준 (테스트 · 제외 응답은 빼고 판정합니다)">
                                {`${judgeResult.judgedAt} 판정 · 완료 응답 ${fmt(judgeResult.checkedResponses)}건 (실사 기준)`}
                            </span>
                            {(() => {
                                const n = (judgeResult.items || []).filter(i => i._fixed).length;
                                if (!n) return null;
                                return (
                                    <button type="button" className="lc-fixed-badge"
                                        title="판정 뒤 고친 로직입니다. 그 문항만 다시 판정했고, 전체 숫자에 반영하려면 [다시 판정]을 눌러 주세요."
                                        onClick={() => modal?.showAlert?.('알림', `판정 뒤 고친 로직이 ${n}개 있습니다.\n전체 결과에 반영하려면 [다시 판정]을 눌러 주세요.`)}>
                                        <Edit2 size={11} /> 고친 로직 {n}개 미반영
                                    </button>
                                );
                            })()}
                        </>
                    )}
                </span>

                <div className="lc-subheader-actions">
                    <span className="lc-tool-group" ref={menuRef}>
                        {isJudged && (
                            <button
                                id="lc-rejudge-btn"
                                type="button"
                                className="lc-rejudge-icon"
                                onClick={handleJudge}
                                disabled={isProgressing}
                                title="다시 판정"
                                aria-label="다시 판정"
                            >
                                <RefreshCw size={13} />
                            </button>
                        )}
                        {/* 판정 전엔 준비 화면에 [자동 채우기]가 있고 지울 결과도 없어 ⋯ 를 숨김 */}
                        {isJudged && <button
                            id="lc-more-btn"
                            type="button"
                            className={`lc-btn-icon${isMenuOpen ? ' active' : ''}`}
                            onClick={() => setIsMenuOpen(p => !p)}
                            title="더보기"
                        >
                            <MoreHorizontal size={16} />
                        </button>}

                        {isJudged && isMenuOpen && (
                            <div className="lc-menu">
                                <button type="button" className="lc-menu-item" onClick={() => { setIsMenuOpen(false); handleAutoFill(false); }}>
                                    <Wand2 size={14} /> 로직 자동 채우기
                                </button>
                                <div className="lc-menu-sep" />
                                <button
                                    type="button"
                                    className="lc-menu-item danger"
                                    disabled={!isJudged}
                                    onClick={() => { setIsMenuOpen(false); setJudgeResult(null); setSelectedVar(null); setDetail(null); }}
                                >
                                    <Trash2 size={14} /> 판정 결과 지우기
                                </button>
                            </div>
                        )}
                    </span>
                    {isJudged && <span className="lc-tool-divider" />}
                    <button
                        id="lc-varlist-btn"
                        type="button"
                        className="lc-btn-outline"
                        onClick={() => openVariableListWindow(pn, userId, modal)}
                    >
                        <List size={14} /> 변수 목록
                    </button>
                </div>
            </div>)}

            {/* ── 본문 ── */}
            {!isJudged ? (
                /* ── 준비 화면 ── */
                <div className="lc-body">
                    <div className="lc-main">
                        <div className="lc-panel" style={{ animation: 'lc-rise 0.25s ease-out' }}>
                            <h2 className="lc-title">응답이 설문 로직대로 들어왔는지 확인합니다</h2>
                            <p className="lc-subtitle">아래 두 단계를 차례대로 진행해 주세요.</p>

                            {/* 1단계 */}
                            <div className={`lc-step${isLogicReady ? ' done' : ' active'}`}>
                                <span className="lc-step-badge">
                                    {isLogicReady ? <Check size={15} strokeWidth={3} /> : '1'}
                                </span>
                                <div className="lc-step-text">
                                    <span className="lc-step-title">로직 준비</span>
                                    <span className="lc-step-desc">
                                        {isLogicReady
                                            ? <>전체 <strong>{fmt(totalCount)}</strong>개 문항 중 <strong>{fmt(logicCount)}</strong>개에 로직이 있습니다.<br />로직이 없는 문항은 판정에서 빠집니다.<span className="lc-step-hint">다시 채우고 싶은 문항은 맵에서 로직을 지운 뒤 [자동 채우기]를 누르세요.</span></>
                                            : <>아직 로직이 있는 문항이 없습니다. 자동 채우기로 로직을 먼저 준비해 주세요.</>
                                        }
                                    </span>
                                </div>
                                <button
                                    id="lc-autofill-btn"
                                    type="button"
                                    className={isLogicReady ? 'lc-btn-outline' : 'lc-btn-primary'}
                                    onClick={() => handleAutoFill(false)}
                                    disabled={isProgressing}
                                >
                                    <Wand2 size={13} /> 자동 채우기
                                </button>
                            </div>

                            {/* 2단계 */}
                            <div className={`lc-step${isLogicReady ? ' active' : ' disabled'}`}>
                                <span className="lc-step-badge">2</span>
                                <div className="lc-step-text">
                                    <span className="lc-step-title">판정</span>
                                    <span className="lc-step-desc">완료 응답이 로직대로 들어왔는지 검사합니다.<br />응답 수에 따라 몇 초에서 몇 분 걸립니다.</span>
                                </div>
                                <button
                                    id="lc-judge-btn"
                                    type="button"
                                    className="lc-btn-primary"
                                    disabled={!isLogicReady || isProgressing}
                                    onClick={handleJudge}
                                >
                                    <PlayCircle size={14} /> 판정하기
                                </button>
                            </div>

                            {/* 안내 */}
                            <div className="lc-guide">
                                <div className="lc-guide-title">판정 결과 보는 법</div>
                                <ul className="lc-guide-list">
                                    <li>문항마다 응답자를 <strong>대상자</strong>(로직 조건에 맞아 답해야 하는 사람)와 <strong>비대상</strong>(건너뛰어야 하는 사람)으로 나눠 보여 드립니다.</li>
                                    <li>이 중 <strong>대상자 무응답</strong>과 <strong>비대상 응답</strong>이 확인이 필요한 응답입니다.</li>
                                </ul>
                                <div className="lc-legend">
                                    {LEGEND_ITEMS.map(item => (
                                        <span key={item.key} className="lc-legend-item">
                                            <span className="lc-legend-swatch" style={{ background: item.color }} />
                                            {item.label}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* ── 판정 완료 화면 ── */
                <div className="lc-judge-body">
                    {/* ── 왼쪽 목록 ── */}
                    <div className="lc-left">
                        {/* 거르개 */}
                        <div className="lc-filters">
                            {FILTERS.map(f => {
                                const count = f.key === 'all'
                                    ? (judgeResult.items.length + judgeResult.unreadable.length)
                                    : f.key === 'error'
                                        ? ((judgeResult.summary.error || 0) + (judgeResult.unreadable?.length || 0))
                                        : judgeResult.summary[f.key] || 0;
                                return (
                                    <button
                                        key={f.key}
                                        type="button"
                                        className={`lc-filter-btn${filter === f.key ? ' active' : ''}`}
                                        onClick={() => setFilter(f.key)}
                                    >
                                        <span className="lc-filter-label">{f.label}</span>
                                        <span className={`lc-filter-count${f.key === 'error' && count > 0 ? ' red' : ''}`}>
                                            {fmt(count)}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* 찾기 + 정렬 */}
                        <div className="lc-list-toolbar">
                            <div className="lc-list-search">
                                <Search size={13} />
                                <input
                                    type="text"
                                    placeholder="변수명·문항·로직 검색"
                                    value={listSearch}
                                    onChange={e => setListSearch(e.target.value)}
                                />
                                {listSearch && <button type="button" onClick={() => setListSearch('')}><X size={12} /></button>}
                            </div>
                            <DropDownList
                                className="lc-sort-ddl"
                                data={SORT_OPTIONS}
                                textField="label"
                                dataItemKey="key"
                                value={SORT_OPTIONS.find(o => o.key === sortKey)}
                                onChange={e => setSortKey(e.value.key)}
                                popupSettings={{ width: 160, popupClass: 'lc-sort-popup' }}
                                title={SORT_OPTIONS.find(o => o.key === sortKey)?.label}
                            />
                        </div>

                        {/* 목록 */}
                        <div className="lc-var-list">
                            {listItems.length === 0 ? (
                                <div className="lc-var-empty">조건에 맞는 문항이 없습니다.</div>
                            ) : (() => {
                                const renderRow = (item) => (
                                    <VarRow
                                        key={item.variable || item.sysName}
                                        item={item}
                                        isActive={selectedVar?.variable === item.variable}
                                        isUnreadable={item._unreadable}
                                        checkedResponses={judgeResult.checkedResponses}
                                        onClick={() => handleVarClick(item)}
                                    />
                                );
                                // 확인 필요 + 문항 순서 → 문제 종류로 묶음 (제목은 위에 붙음)
                                if (filter !== 'error' || sortKey !== 'order') return listItems.map(renderRow);
                                const GROUPS = [
                                    { key: 'unreadable', label: '로직 못 읽음', test: i => i._unreadable },
                                    { key: 'both', label: '대상자 무응답 + 비대상 응답', test: i => i.missing > 0 && i.unexpected > 0 },
                                    { key: 'unexpected', label: '비대상 응답', test: i => i.unexpected > 0 },
                                    { key: 'missing', label: '대상자 무응답', test: i => i.missing > 0 },
                                    { key: 'fixed', label: '고침 · 다시 판정 전', test: () => true },
                                ];
                                const buckets = GROUPS.map(g => ({ ...g, rows: [] }));
                                listItems.forEach(it => { buckets.find(b => b.test(it)).rows.push(it); });
                                return buckets.filter(b => b.rows.length).map(b => (
                                    <React.Fragment key={b.key}>
                                        <div className="lc-list-group">{b.label} <span>{fmt(b.rows.length)}문항</span></div>
                                        {b.rows.map(renderRow)}
                                    </React.Fragment>
                                ));
                            })()}
                        </div>

                        {/* 하단 줄 */}
                        <div className="lc-list-foot">
                            <span>{FILTERS.find(f => f.key === filter)?.label} {fmt(listItems.length)}개</span>
                            <span style={{ color: C.green }}>정상 {fmt(judgeResult.summary.ok)}</span>
                        </div>
                    </div>

                    {/* ── 오른쪽 상세 ── */}
                    <div className="lc-right">
                        {!selectedVar ? (
                            <div className="lc-right-empty">
                                <div>왼쪽 목록에서 문항을 선택하면<br />판정 결과를 자세히 볼 수 있습니다</div>
                            </div>
                        ) : (
                            <div className="lc-detail">
                                {/* ① 머리 */}
                                <div className="lc-detail-head">
                                    <div className="lc-detail-head-left">
                                        <span className="lc-detail-varname">{selectedVar.variable || selectedVar.sysName}</span>
                                        <span className={`lc-detail-type t-${String(selectedVar.type || '').toLowerCase()}`}>{selectedVar.type || ''}</span>
                                        <span className="lc-detail-title" title={selectedVar.title || selectedVar.label || ''}>
                                            {selectedVar.title || selectedVar.label || ''}
                                        </span>
                                        {summaryText && (
                                            <span className="lc-detail-summary" style={{
                                                color: summaryText.color,
                                                background: summaryText.color === C.green ? 'var(--dm-primary-light)' : summaryText.color === C.red ? C.redLight : '#f8fafc',
                                                borderColor: summaryText.color === C.green ? 'var(--dm-primary-border)' : summaryText.color === C.red ? '#fecdd3' : 'var(--dm-border)',
                                            }} title={summaryText.text}>
                                                {summaryText.text}
                                            </span>
                                        )}
                                        {(hintsOpen ? (selectedVar.hints || []) : (selectedVar.hints || []).slice(0, 1)).map((h, i) => (
                                            <span key={i} className={`lc-detail-summary lc-hint-pill${hintsOpen ? ' expanded' : ''}`} title={h}>
                                                <Lightbulb size={11} style={{ flexShrink: 0 }} />
                                                <span className="lc-hint-pill-text">{h}</span>
                                            </span>
                                        ))}
                                        {selectedVar.hints?.length > 1 && (
                                            <button type="button" className={`lc-hint-more${hintsOpen ? ' open' : ''}`}
                                                onClick={() => setHintsOpen(o => !o)}>
                                                {hintsOpen ? '접기' : `외 ${selectedVar.hints.length - 1}개`} <ChevronDown size={11} />
                                            </button>
                                        )}
                                    </div>
                                    <div className="lc-detail-head-actions">
                                        <button type="button"
                                            className={(selectedVar.hints?.length > 0 || selectedVar._unreadable) ? 'lc-btn-primary' : 'lc-btn-outline'}
                                            onClick={() => setLogicEditOpen(true)}>
                                            <Edit2 size={12} />
                                            {selectedVar.hasLogic ? '로직 수정' : '로직 넣기'}
                                        </button>
                                        {(selectedVar.missing > 0 || selectedVar.unexpected > 0) && (
                                            <button
                                                type="button"
                                                // 힌트·못 읽은 로직이면 로직 수정이 먼저 → 양식은 보조
                                                className={(selectedVar.hints?.length > 0 || selectedVar._unreadable) ? 'lc-btn-outline' : 'lc-btn-primary'}
                                                onClick={() => requestFixForm(selectedVar)}
                                                disabled={fixLoading}
                                                title="큐마 데이터 수정 양식(엑셀) — 대상자 무응답은 값 채우기 · 비대상 응답은 삭제(1)"
                                            >
                                                <FileDown size={12} /> 수정 양식 다운로드
                                            </button>
                                        )}
                                    </div>
                                </div>


                                {/* 로직 + 베이스 현황 — 카드 하나 */}
                                {selectedVar.hasLogic && (
                                    <div className="lc-base-card">
                                        <div className="lc-base-card-head">
                                            <span className="lc-logic-label">로직</span>
                                            <code className="lc-logic-code">{selectedVar.logic || 'all'}</code>
                                            {(selectedVar.logic || 'all') === 'all' && <span className="lc-base-card-note">모든 응답자</span>}
                                            {!selectedVar._unreadable && selectedVar.status !== 'noResponse' && (
                                                <span className="lc-base-card-total">완료 응답 {fmt(judgeResult.checkedResponses)}명 기준 · 숫자를 누르면 아래에 응답자 목록이 나옵니다
                                                    <span className="lc-help-q" title={`대상자 — 로직 조건에 해당하는 응답자\n비대상 — 조건에 해당하지 않는 응답자\n응답 / 무응답 — 이 문항에 값이 있는지\n\n확인할 것: 대상자 무응답(빨강) · 비대상 응답(주황)\n완료 응답 ${fmt(judgeResult.checkedResponses)}명 = 100% · 칸을 누르면 그 사람들`}>?</span>
                                                </span>
                                            )}
                                        </div>
                                        {!selectedVar._unreadable && selectedVar.status !== 'noResponse' && (
                                            <>
                                                <div className="lc-base-bar">
                                                    {(() => {
                                                        const total = judgeResult.checkedResponses || 1;
                                                        const a = (selectedVar.answered / total) * 100;
                                                        const m = (selectedVar.missing / total) * 100;
                                                        const u = (selectedVar.unexpected / total) * 100;
                                                        const r = Math.max(0, 100 - a - m - u);
                                                        return <>
                                                            <div style={{ width: `${a}%`, background: BAR.blue }} />
                                                            <div style={{ width: `${m > 0 ? Math.max(m, 1.5) : 0}%`, background: BAR.red }} />
                                                            <div style={{ width: `${u > 0 ? Math.max(u, 1.5) : 0}%`, background: BAR.orange }} />
                                                            <div style={{ width: `${r}%`, background: C.gray }} />
                                                        </>;
                                                    })()}
                                                </div>
                                                <BaseQuad
                                                    item={selectedVar}
                                                    checkedResponses={judgeResult.checkedResponses}
                                                    selectedKind={selectedKind}
                                                    onSelectKind={handleKindSelect}
                                                />
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* ③ 분포 + ④ 응답자 */}
                                {detailLoading && !detail?.distribution ? (
                                    <div className="lc-detail-loading">
                                        <Loader2 size={20} className="lc-spin" /> {(!selectedVar.hasLogic || selectedVar._unreadable || selectedVar.status === 'noResponse')
                                            ? '응답값을 불러오고 있습니다...'
                                            : '응답자 명단을 불러오고 있습니다... 응답자가 많으면 조금 더 걸릴 수 있습니다.'}
                                    </div>
                                ) : (
                                    <div className="lc-detail-tables">
                                        {DistTable}
                                        {(() => {
                                            // detail 호출 중이면 항상 로딩 아이콘
                                            if (detailLoading) {
                                                return (
                                                    <div className="lc-resp-placeholder">
                                                        <Loader2 size={18} className="lc-spin" />&nbsp;응답자를 불러오는 중입니다…
                                                    </div>
                                                );
                                            }
                                            const isValuesVar = detail?._distKind === 'values'
                                                || !selectedVar.hasLogic || selectedVar._unreadable || selectedVar.status === 'noResponse';
                                            if (isValuesVar) {
                                                return DistTable ? null : (
                                                    <div className="lc-resp-placeholder">
                                                        {detail ? '이 문항은 응답값이 없습니다.' : '응답값 분포를 불러오지 못했습니다.'}
                                                    </div>
                                                );
                                            }
                                            return detailLoading ? (
                                                <div className="lc-resp-placeholder">
                                                    <Loader2 size={18} className="lc-spin" />&nbsp;응답자를 불러오는 중입니다…
                                                </div>
                                            ) : (RespTable || (
                                                <div className="lc-resp-placeholder">
                                                    위 대상자·비대상 칸이나 분포표의 숫자를 누르면 해당 응답자 목록이 여기에 표시됩니다.
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
            {logicEditOpen && selectedVar && (() => {
                const name = selectedVar.variable || selectedVar.sysName;
                const mapVar = variables.find(v => v.name === name || v.sysName === name);
                return (
                    <LogicEditDialog
                        item={selectedVar}
                        mapVar={mapVar}
                        variables={variables}
                        auth={auth}
                        pn={pn}
                        loadSyntax={getCheckLogicSyntax}
                        onCancel={() => setLogicEditOpen(false)}
                        onSave={(text, info) => handleSaveLogicOne(selectedVar, mapVar, text, info)}
                    />
                );
            })()}
        </div>
    );
};

export default LogicCheckTab;
