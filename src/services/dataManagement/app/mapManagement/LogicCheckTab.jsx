import React, {
    useState, useMemo, useEffect, useRef, useContext, useCallback
} from 'react';
import {
    Check, List, MoreHorizontal, RotateCcw, Wand2, PlayCircle, X,
    RefreshCw, ChevronDown, Edit2, FileDown,
    Lightbulb, Search, Loader2, Copy,
} from 'lucide-react';
import { modalContext } from '@/components/common/Modal.jsx';
import * as signalR from '@microsoft/signalr';
import './LogicCheckTab.css';

// ─── 색 상수 ───────────────────────────────────
const C = {
    blue: '#3b82f6',
    blueLight: '#eff6ff',
    red: '#ef4444',
    redLight: '#fef2f2',
    orange: '#f59e0b',
    orangeLight: '#fffbeb',
    gray: '#cbd5e1',
    grayLight: '#f8fafc',
    green: 'var(--dm-primary)',
    greenLight: 'var(--dm-primary-light)',
};

// ─── 판정 결과 범례 ─────────────────────────────
const LEGEND_ITEMS = [
    { key: 'target-answer', label: '대상자 응답', color: C.blue },
    { key: 'target-missing', label: '대상자 무응답', color: C.red },
    { key: 'nontarget-answer', label: '비대상 응답', color: C.orange },
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
function AutoFillResultDialog({ result, onClose, onRestore, onGoJudge }) {
    const r = result || {};
    const review = [...(r.needsReview || []), ...(r.undetermined || [])];
    const newly = r.newlyFilled || [];
    const skips = r.skipNotComputed || [];
    const failed = r.failedVariables || [];
    const newlyCount = r.newlyFilledCount ?? newly.length;
    const reviewCount = (r.needsReviewCount ?? (r.needsReview || []).length) + (r.undeterminedCount ?? (r.undetermined || []).length);

    const tabs = [
        { key: 'newly', label: '새로 채워진 문항', count: newlyCount, rows: newly, cols: ['변수', '들어간 조건'], last: false,
          empty: '비어 있던 칸에 새로 들어간 조건이 없습니다.',
          hint: '비어 있던 칸에 조건이 들어간 문항입니다. 일부러 비워 두었던 문항이 있는지 확인해 주세요.' },
        { key: 'review', label: '직접 확인할 문항', count: reviewCount, rows: review, cols: ['변수', '이유'], last: false,
          empty: '직접 확인할 문항이 없습니다.',
          hint: 'AI가 로직을 정하지 못해 비워 둔 문항입니다. 로직이 필요하면 맵에서 직접 넣어 주세요. 비어 있는 문항은 판정하지 않습니다.' },
        { key: 'skip', label: '적용 못한 건너뛰기', count: r.skipNotComputedCount ?? skips.length, rows: skips, cols: ['건너뛰기 규칙', '이유'], last: true,
          empty: '모든 건너뛰기 규칙을 적용했습니다.',
          hint: '설문지의 건너뛰기 규칙 중 계산하지 못한 것입니다. 필요하면 시작 문항의 로직을 직접 확인해 주세요.' },
    ];
    if (failed.length) {
        tabs.push({ key: 'failed', label: '채우지 못한 문항', count: failed.length, rows: failed, cols: ['변수', ''], last: false,
            empty: '', hint: 'AI 요청이 실패해 바뀌지 않은 문항입니다. 다시 [자동 채우기]를 누르면 빈 칸부터 다시 채웁니다.' });
    }
    const [tab, setTab] = useState(newlyCount > 0 ? 'newly' : reviewCount > 0 ? 'review' : 'newly');
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
        { label: '건너뛰기 적용', value: r.skipVariablesChanged, suffix: '문항' },
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
                            <div key={s.label} className={`lc-result-stat${s.tone ? ` ${s.tone}` : ''}`}>
                                <span className="lc-result-stat-value">{fmtN(s.value)}{s.suffix ? <small>{s.suffix}</small> : null}</span>
                                <span className="lc-result-stat-label">{s.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* 경고 */}
                    {r.usedPaidFallback && (
                        <div className="lc-result-warn">일부 문항은 보조 모델로 채웠습니다. 반복 문항의 조건을 한 번 더 확인해 주세요.</div>
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

                    {/* 목록 */}
                    <div className="lc-result-tabs" role="tablist">
                        {tabs.map(t => (
                            <button
                                key={t.key}
                                type="button"
                                role="tab"
                                id={`lc-result-tab-${t.key}`}
                                aria-selected={tab === t.key}
                                className={`lc-result-tab${tab === t.key ? ' active' : ''}`}
                                onClick={() => setTab(t.key)}
                            >
                                {t.label} <span className="lc-result-tab-count">{fmtN(t.count)}</span>
                            </button>
                        ))}
                    </div>
                    {cur.hint && cur.rows.length > 0 && <p className="lc-result-hint">{cur.hint}</p>}
                    <div className="lc-result-list">
                        {cur.rows.length === 0 ? (
                            <div className="lc-result-empty">{cur.empty}</div>
                        ) : cur.rows.map((row, i) => {
                            const [a, b] = splitPair(row, cur.last);
                            return (
                                <div key={i} className="lc-result-row">
                                    <span className="lc-result-key" title={a}>{a}</span>
                                    <span className="lc-result-val">{b}</span>
                                </div>
                            );
                        })}
                    </div>
                    {cur.key === 'newly' && newlyCount > newly.length && (
                        <p className="lc-result-hint">최대 {fmtN(newly.length)}개까지만 보입니다 (전체 {fmtN(newlyCount)}개).</p>
                    )}
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
            className={`lc-var-row${isActive ? ' active' : ''}${item.status === 'error' ? ' err' : ''}`}
            onClick={onClick}
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
                    {isUnreadable ? '로직 해석 불가' : !item.hasLogic ? '로직 없음' : item.status === 'noResponse' ? '응답 없음' : '판정 전'}
                </div>
            ) : (
                <>
                    <div className="lc-vr-bar">
                        <div style={{ width: `${bAnswered}%`, background: C.blue }} />
                        <div style={{ width: `${bMissing}%`, background: C.red }} />
                        <div style={{ width: `${bUnexpected}%`, background: C.orange }} />
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
                        style={selectedKind === group.key ? { borderColor: group.color, background: group.bgColor } : {}}
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
                                style={selectedKind === c.key ? { borderColor: c.color, background: c.bgColor } : {}}
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
}) => {
    const modal = useContext(modalContext);
    const pn = sessionStorage.getItem('merge_pn') || sessionStorage.getItem('projectnum') || '';
    const userId = auth?.user?.userId || '';

    // ── 전체 상태 ──
    const [judgeResult, setJudgeResult] = useState(null);   // { items, unreadable, summary, checkedResponses, judgedAt }
    const [isProgressing, setIsProgressing] = useState(false);
    const [progressData, setProgressData] = useState({ title: '', message: '', percent: 0 });
    const [abortFn, setAbortFn] = useState(null);

    // ── 왼쪽 목록 상태 ──
    const [filter, setFilter] = useState('error');          // 거르개
    const [sortKey, setSortKey] = useState('order');        // 정렬
    const [listSearch, setListSearch] = useState('');       // 찾기
    const [selectedVar, setSelectedVar] = useState(null);   // 선택된 item

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
                { title: '취소', click: () => {} },
                {
                    title: '되돌리기',
                    click: async () => {
                        try {
                            const res = await restoreExcelVersion?.mutateAsync({ pn, user: userId, versionId });
                            if (String(res?.success) === '777') {
                                setFillResult(null);
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
                setDetail({ ...res.resultjson, _kind: kind, _item: item });
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
            setDetailLoading(false);
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

    // ─── 수정 양식 받기 ───
    const handleFixForm = useCallback(async (variable) => {
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
        }
    }, [pn, userId, getCheckLogicFixForm, modal]);

    // ─── PID 복사 ───
    const handleCopyPids = useCallback(async (mode) => {
        if (!detail?.rows) return;
        const rows = detail.rows;
        try {
            if (mode === 'comma') {
                const pids = rows.map(r => r[0]).join(',');
                await navigator.clipboard.writeText(pids);
            } else {
                // 엑셀 붙일 표 (TSV)
                const cols = detail.columns || [];
                const header = cols.map(c => c.title || c).join('\t');
                const body = rows.map(r => r.join('\t')).join('\n');
                await navigator.clipboard.writeText(header + '\n' + body);
            }
            modal?.showAlert?.('복사 완료', `응답자 ${fmt(rows.length)}명을 복사했습니다.`);
        } catch {
            modal?.showErrorAlert?.('오류', '복사하지 못했습니다. 브라우저의 클립보드 권한을 확인해 주세요.');
        }
    }, [detail, modal]);

    // ─── 분포 표 렌더 ───
    const DistTable = useMemo(() => {
        if (!detail?.distribution) return null;
        const dist = detail.distribution || {};
        const entries = dist.entries || [];
        const allRespondents = dist.allRespondents || 1;
        const maxCount = Math.max(...entries.map(e => e.total || 0), 1);

        return (
            <div className="lc-dist-wrap">
                <div className="lc-dist-title">응답값 분포</div>
                <table className="lc-dist-table">
                    <colgroup>
                        <col style={{ width: '70px' }} />
                        <col style={{ width: '160px' }} />
                        <col />
                        <col style={{ width: '70px' }} />
                        <col style={{ width: '70px' }} />
                        <col style={{ width: '70px' }} />
                    </colgroup>
                    <thead>
                        <tr>
                            <th>코드</th>
                            <th>보기</th>
                            <th>분포</th>
                            <th style={{ color: C.blue }}>대상자</th>
                            <th style={{ color: C.orange }}>비대상</th>
                            <th>계</th>
                        </tr>
                    </thead>
                    <tbody>
                        {entries.map((e, i) => {
                            const isNoLabel = e.label == null;
                            const pct = allRespondents ? ((e.inTarget || 0) / allRespondents * 100).toFixed(1) : '0.0';
                            const barW = maxCount ? ((e.total || 0) / maxCount * 100) : 0;
                            const inBarW = maxCount ? ((e.inTarget || 0) / maxCount * 100) : 0;
                            return (
                                <tr key={i} style={isNoLabel ? { color: C.red } : {}}>
                                    <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{e.code ?? ''}</td>
                                    <td title={e.label || '보기에 없는 코드'} style={isNoLabel ? { color: C.red } : {}}>
                                        {e.label ?? <span style={{ color: C.red }}>보기에 없는 코드</span>}
                                    </td>
                                    <td>
                                        <div className="lc-dist-bar-wrap">
                                            <div className="lc-dist-bar-bg" style={{ width: `${barW}%` }}>
                                                <div className="lc-dist-bar-in" style={{ width: `${inBarW ? (inBarW / barW * 100) : 0}%` }} />
                                            </div>
                                            <span className="lc-dist-pct">{pct}%</span>
                                        </div>
                                    </td>
                                    <td style={{ color: C.blue }}>{fmt(e.inTarget)}</td>
                                    <td>
                                        <button
                                            type="button"
                                            className="lc-dist-num-btn"
                                            style={(e.outTarget || 0) > 0 ? { color: C.orange, fontWeight: 700 } : { color: '#94a3b8' }}
                                            disabled={!e.outTarget}
                                            onClick={() => e.outTarget > 0 && setCodeFilter({ code: e.code, label: e.label })}
                                        >
                                            {fmt(e.outTarget)}
                                        </button>
                                    </td>
                                    <td>{fmt(e.total)}</td>
                                </tr>
                            );
                        })}
                        {/* 응답 계 줄 */}
                        {dist.totalAnswered != null && (
                            <tr style={{ fontWeight: 700, borderTop: '2px solid #e2e8f0' }}>
                                <td colSpan={2} style={{ color: '#475569' }}>응답 계</td>
                                <td />
                                <td style={{ color: C.blue }}>{fmt(dist.totalInTarget)}</td>
                                <td style={{ color: C.orange }}>{fmt(dist.totalOutTarget)}</td>
                                <td>{fmt(dist.totalAnswered)}</td>
                            </tr>
                        )}
                        {/* 무응답 줄 */}
                        <tr>
                            <td style={{ color: '#94a3b8', fontStyle: 'italic' }}></td>
                            <td style={{ color: '#94a3b8', fontStyle: 'italic' }}>무응답</td>
                            <td />
                            <td>
                                <button type="button" className="lc-dist-num-btn"
                                    style={selectedVar?.missing > 0 ? { color: C.red, fontWeight: 700 } : { color: '#94a3b8' }}
                                    disabled={!(selectedVar?.missing > 0)}
                                    onClick={() => selectedVar?.missing > 0 && handleKindSelect('missing')}
                                >
                                    {fmt(selectedVar?.missing)}
                                </button>
                            </td>
                            <td style={{ color: '#94a3b8' }}>{fmt(Math.max(0, (selectedVar?.base ?? 0) - (selectedVar?.answered ?? 0) - (selectedVar?.missing ?? 0)))}</td>
                            <td />
                        </tr>
                    </tbody>
                </table>
                {dist.truncated && (
                    <div className="lc-dist-note">이 밖에 응답값 {fmt(dist.allDistinct - entries.length)}개는 표시하지 않았습니다</div>
                )}
            </div>
        );
    }, [detail, selectedVar, handleKindSelect]);

    // ─── 응답자 표 렌더 ───
    const RespTable = useMemo(() => {
        if (!detail?.rows) return null;
        const cols = detail.columns || [];
        const rows = codeFilter
            ? detail.rows.filter(r => {
                // 변수 이 문항 컬럼 인덱스 찾기 (2번째 이후)
                const idx = cols.findIndex(c => c.isTarget);
                return idx >= 0 ? String(r[idx]) === String(codeFilter.code) : true;
            })
            : detail.rows;
        const total = detail.total || rows.length;
        const kindLabel = {
            missing: '대상자 무응답', unexpected: '비대상 응답',
            base: '대상자', answered: '대상자 응답', values: '응답자'
        }[detailKind] || '응답자';

        return (
            <div className="lc-resp-wrap">
                <div className="lc-resp-head">
                    <span className="lc-resp-title">
                        <span className="lc-resp-dot" style={{
                            background: detailKind === 'missing' ? C.red : detailKind === 'unexpected' ? C.orange : C.blue
                        }} />
                        {kindLabel} {fmt(total)}명
                        {codeFilter && (
                            <button type="button" className="lc-chip" onClick={() => setCodeFilter(null)}>
                                코드 {codeFilter.code} {codeFilter.label} ×
                            </button>
                        )}
                    </span>
                    <div className="lc-resp-actions">
                        <div className="lc-dropdown-wrap">
                            <button type="button" className="lc-btn-outline" style={{ height: '28px', padding: '0 10px', fontSize: '12px' }}>
                                <Copy size={12} /> PID 복사 <ChevronDown size={11} />
                            </button>
                            <div className="lc-dropdown-menu">
                                <button type="button" onClick={() => handleCopyPids('excel')}>엑셀에 붙일 표</button>
                                <button type="button" onClick={() => handleCopyPids('comma')}>쉼표로 이은 PID</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lc-resp-table-wrap">
                    <table className="lc-resp-table">
                        <thead>
                            <tr>
                                <th style={{ width: '40px' }}>#</th>
                                {cols.map((c, i) => (
                                    <th key={i}>{c.title || c}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r, ri) => (
                                <tr key={ri}>
                                    <td style={{ color: '#94a3b8', fontSize: '11px', textAlign: 'right' }}>{ri + 1}</td>
                                    {r.map((cell, ci) => (
                                        <td key={ci} style={ci > 0 && cols[ci]?.isCondition ? { color: '#94a3b8', fontSize: '12px' } : {}}>
                                            {cell === '' || cell == null
                                                ? <span style={{ color: cols[ci]?.isCondition ? '#94a3b8' : C.red, fontSize: '12px' }}>무응답</span>
                                                : cell}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {total > 5000 && (
                    <div className="lc-resp-note">전체 {fmt(total)}명 중 앞의 5,000명만 보여 드립니다 (복사도 보이는 응답자만 됩니다)</div>
                )}
                {rows.length === 0 && (
                    <div className="lc-resp-empty">해당하는 응답자가 없습니다.</div>
                )}
            </div>
        );
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [detail, codeFilter, detailKind, handleCopyPids]);

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
            <div className="lc-subheader">
                <span className="lc-status">
                    <span className={`lc-status-dot${isJudged ? ' done' : ''}`} />
                    {isJudged
                        ? `${judgeResult.judgedAt} 판정 · 완료 응답 ${fmt(judgeResult.checkedResponses)}건`
                        : '아직 판정하지 않았습니다'}
                </span>

                <div className="lc-subheader-actions" ref={menuRef}>
                    <button
                        id="lc-varlist-btn"
                        type="button"
                        className="lc-btn-outline"
                        onClick={() => openVariableListWindow(pn, userId, modal)}
                    >
                        <List size={14} /> 변수 목록
                    </button>
                    {isJudged && (
                        <button
                            id="lc-rejudge-btn"
                            type="button"
                            className="lc-btn-outline"
                            onClick={handleJudge}
                            disabled={isProgressing}
                        >
                            <RefreshCw size={13} /> 다시 판정
                        </button>
                    )}
                    <button
                        id="lc-more-btn"
                        type="button"
                        className={`lc-btn-icon${isMenuOpen ? ' active' : ''}`}
                        onClick={() => setIsMenuOpen(p => !p)}
                        title="더보기"
                    >
                        <MoreHorizontal size={16} />
                    </button>

                    {isMenuOpen && (
                        <div className="lc-menu">
                            <button type="button" className="lc-menu-item" onClick={() => { setIsMenuOpen(false); handleAutoFill(false); }}>
                                <Wand2 size={14} /> 로직 자동 채우기
                            </button>
                            <div className="lc-menu-sep" />
                            <button
                                type="button"
                                className="lc-menu-item"
                                disabled={!isJudged}
                                onClick={() => { setIsMenuOpen(false); setJudgeResult(null); setSelectedVar(null); setDetail(null); }}
                            >
                                <RotateCcw size={14} /> 판정 결과 지우기
                            </button>
                        </div>
                    )}
                </div>
            </div>

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
                                    <span className="lc-step-desc">완료된 응답이 로직대로 들어왔는지 확인합니다. 2~10분 정도 걸립니다.</span>
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
                            <select className="lc-sort-sel" value={sortKey} onChange={e => setSortKey(e.target.value)}>
                                {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                            </select>
                        </div>

                        {/* 목록 */}
                        <div className="lc-var-list">
                            {listItems.length === 0 ? (
                                <div className="lc-var-empty">조건에 맞는 문항이 없습니다.</div>
                            ) : (
                                listItems.map(item => (
                                    <VarRow
                                        key={item.variable || item.sysName}
                                        item={item}
                                        isActive={selectedVar?.variable === item.variable}
                                        isUnreadable={item._unreadable}
                                        checkedResponses={judgeResult.checkedResponses}
                                        onClick={() => handleVarClick(item)}
                                    />
                                ))
                            )}
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
                                        <span className="lc-detail-type">{selectedVar.type || ''}</span>
                                        <span className="lc-detail-title" title={selectedVar.title || selectedVar.label || ''}>
                                            {selectedVar.title || selectedVar.label || ''}
                                        </span>
                                    </div>
                                    <div className="lc-detail-head-actions">
                                        <button type="button" className="lc-btn-outline" style={{ height: '28px', fontSize: '12px' }}
                                            onClick={() => {/* 로직 편집 팝업 — 맵관리 탭으로 이동 또는 팝업 */ }}>
                                            <Edit2 size={12} />
                                            {selectedVar.hasLogic ? '로직 수정' : '로직 넣기'}
                                        </button>
                                        {(selectedVar.missing > 0 || selectedVar.unexpected > 0) && (
                                            <button
                                                type="button"
                                                className={`lc-btn-primary${selectedVar.hints?.length > 0 ? '' : ''}`}
                                                style={{ height: '28px', fontSize: '12px' }}
                                                onClick={() => handleFixForm(selectedVar.variable || selectedVar.sysName)}
                                            >
                                                <FileDown size={12} /> 수정 양식 받기
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* ② 요약 */}
                                {summaryText && (
                                    <div className="lc-summary-bar" style={{
                                        borderLeftColor: summaryText.color,
                                        background: summaryText.color === C.green ? '#f0faf5' : summaryText.color === C.red ? C.redLight : '#f8fafc'
                                    }}>
                                        <span style={{ color: summaryText.color, fontWeight: 700 }}>{summaryText.text}</span>
                                    </div>
                                )}

                                {/* 힌트 */}
                                {selectedVar.hints?.map((h, i) => (
                                    <div key={i} className="lc-hint">
                                        <Lightbulb size={13} style={{ color: '#d97706', flexShrink: 0 }} />
                                        <span>{h}</span>
                                    </div>
                                ))}

                                {/* 로직 줄 */}
                                {selectedVar.hasLogic && (
                                    <div className="lc-logic-line">
                                        <span className="lc-logic-label">로직</span>
                                        <code className="lc-logic-code">{selectedVar.logic || 'all'}</code>
                                    </div>
                                )}

                                {/* 베이스 현황 */}
                                {selectedVar.hasLogic && !selectedVar._unreadable && selectedVar.status !== 'noResponse' && (
                                    <>
                                        {/* 얇은 막대 */}
                                        <div className="lc-base-bar">
                                            {(() => {
                                                const total = judgeResult.checkedResponses || 1;
                                                const a = (selectedVar.answered / total) * 100;
                                                const m = (selectedVar.missing / total) * 100;
                                                const u = (selectedVar.unexpected / total) * 100;
                                                const r = Math.max(0, 100 - a - m - u);
                                                return <>
                                                    <div style={{ width: `${a}%`, background: C.blue }} />
                                                    <div style={{ width: `${m}%`, background: C.red }} />
                                                    <div style={{ width: `${u}%`, background: C.orange }} />
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

                                {/* ③ 분포 + ④ 응답자 */}
                                {detailLoading ? (
                                    <div className="lc-detail-loading">
                                        <Loader2 size={20} className="lc-spin" /> 불러오는 중입니다…
                                    </div>
                                ) : (
                                    <div className="lc-detail-tables">
                                        {DistTable}
                                        {RespTable || (
                                            <div className="lc-resp-placeholder">
                                                위의 칸이나 분포표의 숫자를 누르면 해당 응답자 목록이 여기에 나옵니다
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LogicCheckTab;
