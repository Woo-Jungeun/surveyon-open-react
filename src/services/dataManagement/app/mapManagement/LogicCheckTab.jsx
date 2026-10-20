import React, {
    useState, useMemo, useEffect, useRef, useContext, useCallback
} from 'react';
import {
    Check, List, MoreHorizontal, RotateCcw, Wand2, PlayCircle, X,
    RefreshCw, ChevronDown, Edit2, FileDown,
    Lightbulb, Search, Loader2, Copy,
} from 'lucide-react';
import { modalContext } from '@/components/common/Modal.jsx';
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
    { key: 'error', label: '오류만' },
    { key: 'noResponse', label: '응답 없음' },
    { key: 'noLogic', label: '로직 없음' },
];

// ─── 정렬 옵션 ──────────────────────────────────
const SORT_OPTIONS = [
    { key: 'order', label: '문항 순서' },
    { key: 'confirm', label: '확인할 사람 많은 순' },
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
    if (!window.signalR) return null;
    try {
        const baseUrl = window.API_CONFIG?.API_BASE_URL_DATAMANAGEMENT || '';
        let hubUrl = baseUrl.replace(/\/+$/, '') + '/hubs/task-progress';
        if (!hubUrl.startsWith('http')) hubUrl = window.location.origin + hubUrl;
        const conn = new window.signalR.HubConnectionBuilder()
            .withUrl(hubUrl)
            .withAutomaticReconnect()
            .configureLogging(window.signalR.LogLevel.None)
            .build();
        await conn.start();
        return conn;
    } catch (e) {
        console.error('SignalR 연결 오류:', e);
        return null;
    }
}

/** 진행 모달 */
function ProgressModal({ title, message, percent, onAbort, canClose = false }) {
    return (
        <div className="lc-overlay" onClick={canClose ? undefined : (e) => e.stopPropagation()}>
            <div className="lc-progress-modal" onClick={e => e.stopPropagation()}>
                <div className="lc-progress-title">{title}</div>
                <div className="lc-progress-msg">{message || '처리 중...'}</div>
                <div className="lc-progress-bar-wrap">
                    <div className="lc-progress-bar" style={{ width: `${Math.min(100, percent || 0)}%` }} />
                </div>
                <div className="lc-progress-pct">{Math.round(percent || 0)}%</div>
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
                {(item.hints?.length > 0) && <span className="lc-vr-icon" title="힌트 있음">💡</span>}
                {isUnreadable && <span className="lc-vr-icon err-icon" title="로직을 읽지 못했습니다">!</span>}
                {item._fixed && <span className="lc-vr-icon" title="로직을 고쳐 다시 판정했습니다">✎</span>}
            </div>
            <div className="lc-vr-label" title={item.title || item.label || ''}>
                {item.title || item.label || ''}
            </div>
            {noData ? (
                <div className="lc-vr-nodata">
                    {isUnreadable ? '로직 못 읽음' : !item.hasLogic ? '로직 없음' : item.status === 'noResponse' ? '응답 없음' : '미판정'}
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
    // restoreExcelVersion, // 복원 지점 되돌리기용 - 향후 사용
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

    // ─── SignalR 진행 공통 ───
    const runWithProgress = useCallback(async (title, apiFn, onDone, onStop) => {
        setIsProgressing(true);
        setProgressData({ title, message: '준비 중...', percent: 0 });

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

            // abort 함수 등록
            let abortController = null;
            setAbortFn(() => () => {
                aborted = true;
                abortController?.abort();
            });

            const res = await apiFn(connId);
            if (aborted) { onStop?.(); return; }

            if (String(res?.success) === '777') {
                await onDone(res);
            } else {
                const msg = res?.resultjson?.errorcontent || res?.errorcontent || res?.message || '오류가 발생했습니다.';
                modal?.showErrorAlert?.('오류', msg);
            }
        } catch (err) {
            if (!aborted) {
                console.error(err);
                modal?.showErrorAlert?.('오류', err?.message || '처리 중 오류가 발생했습니다.');
            }
            onStop?.();
        } finally {
            setIsProgressing(false);
            setAbortFn(null);
            if (conn) { try { conn.stop(); } catch { /* ignore */ } }
        }
    }, [modal]);

    // ─── A. 자동 채우기 ───
    const handleAutoFill = useCallback(async (restart = false) => {
        const doFill = async () => {
            await runWithProgress(
                '로직 자동 채우기',
                async (connId) => {
                    const payload = { pn, user: userId, connectionId: connId };
                    if (restart) payload.restart = true;
                    return generateLogicChecks?.mutateAsync(payload);
                },
                async (res) => {
                    const rj = res?.resultjson || {};
                    const newlyFilled = rj.newlyFilled || [];
                    const undetermined = rj.undetermined || [];
                    const msg = [
                        rj.message || '자동 채우기가 완료되었습니다.',
                        newlyFilled.length ? `채운 문항 ${rj.newlyFilledCount ?? newlyFilled.length}개` : '',
                        undetermined.length ? `확인 필요 ${undetermined.length}개` : '',
                    ].filter(Boolean).join(' · ');
                    modal?.showAlert?.('완료', msg);
                    onMapReload?.();
                    setJudgeResult(null); // 판정 결과 초기화
                },
                () => {
                    modal?.showAlert?.('알림', '멈췄습니다. 지금까지 채운 문항은 맵에 남아 있습니다.\n다시 누르면 남은 문항부터 이어집니다.');
                    onMapReload?.();
                }
            );
        };

        // 확인 창
        await new Promise((resolve) => {
            modal?.showConfirm?.('로직 자동 채우기', [
                '구조화된 설문지를 AI가 읽어 로직을 채웁니다.',
                '• 로직이 비어 있는 문항만 채웁니다.',
                '• 10~20분 소요됩니다. 중지하면 채운 만큼 저장됩니다.',
                restart ? '• ⚠ 싹 지우고 다시 채웁니다.' : '',
            ].filter(Boolean).join('\n'), {
                btns: [
                    { title: '취소', click: () => resolve(false) },
                    { title: restart ? '싹 지우고 채우기 시작' : '채우기 시작', click: () => resolve(true) },
                ]
            });
        }).then((go) => { if (go) doFill(); });
    }, [pn, userId, generateLogicChecks, modal, onMapReload, runWithProgress]);

    // ─── C. 판정 ───
    const handleJudge = useCallback(async () => {
        await runWithProgress(
            '판정',
            async (connId) => runCheckLogic?.mutateAsync({ pn, user: userId, connectionId: connId }),
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
                if (rj.message) modal?.showAlert?.('판정 완료', rj.message);
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
                const msg = res?.resultjson?.errorcontent || res?.errorcontent || '상세 조회에 실패했습니다.';
                modal?.showErrorAlert?.('오류', msg);
                setDetail(null);
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                modal?.showErrorAlert?.('오류', '상세 조회 중 오류가 발생했습니다.');
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
                let msg = '수정 양식 다운로드에 실패했습니다.';
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
            modal?.showErrorAlert?.('오류', '수정 양식 다운로드 중 오류가 발생했습니다.');
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
            modal?.showAlert?.('복사 완료', `${rows.length}명 복사했습니다.`);
        } catch {
            modal?.showErrorAlert?.('오류', '클립보드 복사에 실패했습니다.');
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
                    <div className="lc-dist-note">외 {dist.allDistinct - entries.length}종 더 있습니다</div>
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
                    <div className="lc-resp-note">앞 5,000명만 보입니다 — 복사는 {fmt(total)}명 전부</div>
                )}
                {rows.length === 0 && (
                    <div className="lc-resp-empty">데이터가 없습니다.</div>
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

        if (isUnreadable) return { text: `로직을 읽지 못해 판정하지 못했습니다${unreadableItem?.reason ? ` — ${unreadableItem.reason}` : ''}`, color: C.orange };
        if (!item.hasLogic) return { text: '로직이 없어 판정하지 않았습니다', color: '#64748b' };
        if (item.status === 'noResponse') return { text: '응답이 하나도 없습니다', color: '#64748b' };
        if (item._fixed) return { text: '로직을 고쳐 이 문항만 다시 판정했습니다', color: C.blue };
        if (item.status === 'ok') return { text: '문제 없습니다', color: C.green };

        const parts = [];
        if (item.missing > 0) parts.push(`대상자 ${fmt(item.base)}명 중 ${fmt(item.missing)}명이 무응답입니다`);
        if (item.unexpected > 0) parts.push(`비대상 ${fmt(Math.max(0, (judgeResult.checkedResponses || 0) - item.base))}명이 응답했습니다`);
        if (parts.length === 2) return { text: `대상자 무응답 ${fmt(item.missing)}명 · 비대상 응답 ${fmt(item.unexpected)}명`, color: C.red };
        return { text: parts[0] || '확인 필요', color: C.red };
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
                            <button type="button" className="lc-menu-item" onClick={() => { setIsMenuOpen(false); handleAutoFill(true); }}>
                                <RotateCcw size={14} /> 싹 지우고 다시 채우기
                            </button>
                            <div className="lc-menu-sep" />
                            <button
                                type="button"
                                className="lc-menu-item"
                                disabled={!isJudged}
                                onClick={() => { setIsMenuOpen(false); setJudgeResult(null); setSelectedVar(null); setDetail(null); }}
                            >
                                <RotateCcw size={14} /> 판정 결과 초기화
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
                            <p className="lc-subtitle">두 단계면 됩니다. 지금 할 일은 <strong>초록 칸</strong>입니다.</p>

                            {/* 1단계 */}
                            <div className={`lc-step${isLogicReady ? ' done' : ' active'}`}>
                                <span className="lc-step-badge">
                                    {isLogicReady ? <Check size={15} strokeWidth={3} /> : '1'}
                                </span>
                                <div className="lc-step-text">
                                    <span className="lc-step-title">로직 준비</span>
                                    <span className="lc-step-desc">
                                        {isLogicReady
                                            ? <><strong>{fmt(totalCount)}</strong>개 문항 중 <strong>{fmt(logicCount)}</strong>개에 로직이 있습니다 · 나머지는 판정하지 않습니다</>
                                            : <>아직 로직이 설정된 문항이 없습니다 · 자동 채우기로 로직을 준비해 주세요</>
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
                                    <span className="lc-step-desc">완료 응답을 로직과 맞춰 봅니다 · 2~10분</span>
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
                                판정하면 문항마다 응답자를 네 칸으로 나눠 <strong>베이스</strong>를 보여 줍니다 —{' '}
                                <strong>대상자</strong>(로직 조건에 맞아 답해야 하는 사람) · <strong>비대상</strong>(건너뛰어야 하는 사람) × 응답 · 무응답.
                                이 중 <strong>대상자 무응답</strong>과 <strong>비대상 응답</strong>이 확인할 것입니다.
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
                                <div className="lc-var-empty">표시할 문항이 없습니다.</div>
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
                                <div>베이스 칸이나 분포의 비대상 응답 숫자를 누르면<br />그 사람들이 여기 나옵니다</div>
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
                                        <Loader2 size={20} className="lc-spin" /> 데이터를 불러오는 중...
                                    </div>
                                ) : (
                                    <div className="lc-detail-tables">
                                        {DistTable}
                                        {RespTable || (
                                            <div className="lc-resp-placeholder">
                                                베이스 칸이나 분포의 비대상 응답 숫자를 누르면 그 사람들이 여기 나옵니다
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
