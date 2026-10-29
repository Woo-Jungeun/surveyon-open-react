import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MapManagementPageApi } from '@/services/dataManagement/app/mapManagement/MapManagementPageApi';

/**
 * 변수 목록 창 (로직체크 [변수 목록] 버튼으로 여는 전용 페이지)
 * - 주소: /variable_list?pn={pn}&user={user}
 * - POST /map/variables/titles { pn, user } → resultjson.items[{ variable, question, tableTitle, type, spssName }]
 * - 찾기는 받은 목록에서만 거른다 (서버 재호출 X) · [새로고침]은 같은 API 재호출 (찾기 글자 유지)
 */

const TYPE_STYLE = {
    single: { background: '#fff7ed', color: '#c2410c', border: '1px solid #ffedd5' },
    multi: { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #dbeafe' },
    scale: { background: '#f0fdf4', color: '#15803d', border: '1px solid #dcfce7' },
    rank: { background: '#fdf4ff', color: '#a21caf', border: '1px solid #fae8ff' },
    other: { background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' },
};

function TypeBadge({ type }) {
    if (!type) return null;
    const k = String(type).toLowerCase();
    const key = k === 'double' ? 'multi' : (TYPE_STYLE[k] ? k : 'other');
    const label = k === 'double' ? 'multi' : type;
    return <span className="vl-badge" style={TYPE_STYLE[key]} title={label}>{label}</span>;
}

export default function VariableListPage() {
    const { getVariableTitles } = MapManagementPageApi();

    const params = useMemo(() => new URLSearchParams(window.location.search), []);
    const pn = params.get('pn') || '';
    const user = params.get('user') || '';

    const [all, setAll] = useState([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        document.title = pn ? `변수 목록 — ${pn}` : '변수 목록';
    }, [pn]);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await getVariableTitles.mutateAsync({ pn, user });
            if (String(res?.success) !== '777') {
                setAll([]);
                setError(res?.resultjson?.errorcontent || res?.message || '변수 목록을 불러오지 못했습니다.');
                return;
            }
            setAll(res?.resultjson?.items || []);
        } catch (e) {
            setAll([]);
            setError('변수 목록을 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pn, user]);

    useEffect(() => { load(); }, [load]);

    const q = query.trim().toLowerCase();
    const filtered = useMemo(() => {
        if (!q) return all;
        return all.filter(v =>
            (v.variable || '').toLowerCase().includes(q) ||
            (v.spssName || '').toLowerCase().includes(q) ||
            (v.question || '').toLowerCase().includes(q) ||
            (v.tableTitle || '').toLowerCase().includes(q)
        );
    }, [all, q]);

    let body;
    if (loading) body = <div className="vl-empty">변수 목록을 불러오는 중입니다…</div>;
    else if (error) body = <div className="vl-empty">{error}</div>;
    else if (filtered.length === 0) body = <div className="vl-empty">찾는 변수가 없습니다</div>;
    else body = (
        <table className="vl-table">
            <thead>
                <tr>
                    <th style={{ width: '100px' }}>변수명</th>
                    <th style={{ width: '110px' }}>SPSS명</th>
                    <th>문항</th>
                    <th style={{ width: '26%' }}>표제목</th>
                    <th style={{ width: '95px', textAlign: 'center' }}>변수 유형</th>
                </tr>
            </thead>
            <tbody>
                {filtered.map((v, idx) => (
                    <tr key={`${v.variable}-${idx}`}>
                        <td className="vl-vn">{v.variable}</td>
                        <td className="vl-spss" title={v.spssName || ''}>{v.spssName || ''}</td>
                        <td className="vl-q" title={v.question || ''}>{v.question}</td>
                        <td title={v.tableTitle || ''}>{v.tableTitle || ''}</td>
                        <td style={{ textAlign: 'center' }}><TypeBadge type={v.type} /></td>
                    </tr>
                ))}
            </tbody>
        </table>
    );

    return (
        <div className="vl-wrap">
            <style>{`
                html,body,#root{height:100%;margin:0}
                .vl-wrap{height:100vh;display:flex;flex-direction:column;overflow:hidden;font-family:Pretendard,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#1e293b;background:#f1f5f9}
                .vl-wrap *{box-sizing:border-box}
                .vl-hd{display:flex;align-items:center;gap:16px;padding:0 20px;height:52px;background:#fff;border-bottom:2px solid #16a34a;flex-shrink:0;box-shadow:0 2px 8px rgba(22,163,74,.1)}
                .vl-logo{display:flex;align-items:center;gap:10px}
                .vl-title{font-size:15px;font-weight:800;color:#15803d;letter-spacing:-.3px}
                .vl-pn{font-size:12px;font-weight:600;color:#64748b;background:#f0fdf4;border:1px solid #bbf7d0;padding:3px 10px;border-radius:20px}
                .vl-cnt{font-size:12.5px;font-weight:600;color:#64748b;white-space:nowrap}
                .vl-cnt strong{color:#16a34a}
                .vl-right{display:flex;align-items:center;gap:10px;margin-left:auto}
                .vl-search{width:340px;display:flex;align-items:center;gap:8px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:8px;padding:0 12px;height:34px;transition:border-color .15s}
                .vl-search:focus-within{border-color:#16a34a;background:#fff}
                .vl-search input{flex:1;background:transparent;border:none;outline:none;font-size:12.5px;color:#1e293b}
                .vl-search input::placeholder{color:#94a3b8}
                .vl-refresh{height:32px;padding:0 14px;border:1.5px solid #16a34a;background:#fff;color:#16a34a;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:all .15s}
                .vl-refresh:hover{background:#f0fdf4;box-shadow:0 2px 6px rgba(22,163,74,.15)}
                .vl-refresh:disabled{opacity:.5;cursor:default}
                .vl-scroll{flex:1;overflow-y:auto}
                .vl-card{margin:14px 16px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;box-shadow:0 1px 3px rgba(15,23,42,.06)}
                .vl-table{width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed}
                .vl-table th{position:sticky;top:0;background:#fff;font-size:11.5px;font-weight:700;color:#64748b;text-align:left;padding:11px 16px;border-bottom:1px solid #e2e8f0;white-space:nowrap;z-index:5;user-select:none}
                .vl-table th:first-child{border-top-left-radius:10px}
                .vl-table th:last-child{border-top-right-radius:10px}
                .vl-table td{padding:11px 16px;border-bottom:1px solid #f1f5f9;vertical-align:middle;color:#334155;font-size:12.5px;line-height:1.5;word-break:break-all}
                .vl-table tbody tr:last-child td{border-bottom:none}
                .vl-table tbody tr:hover td{background:#f0fdf4}
                .vl-vn{font-weight:700;color:#15803d !important}
                .vl-table tbody tr:hover td.vl-vn{color:#166534 !important}
                .vl-spss{font-weight:600;color:#0369a1 !important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
                .vl-table tbody tr:hover td.vl-spss{color:#075985 !important}
                .vl-q{color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;word-break:normal !important}
                .vl-badge{display:inline-block;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:800;text-transform:lowercase;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis;vertical-align:middle}
                .vl-empty{display:flex;align-items:center;justify-content:center;padding:80px 20px;color:#94a3b8;font-size:13px;font-weight:600}
                .vl-scroll::-webkit-scrollbar{width:6px}
                .vl-scroll::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px}
            `}</style>

            <div className="vl-hd">
                <div className="vl-logo">
                    <h1 className="vl-title" style={{ margin: 0 }}>변수 목록</h1>
                    {pn && <span className="vl-pn">{pn}</span>}
                    {!loading && !error && (
                        <span className="vl-cnt">
                            {q
                                ? <>변수 {all.length}개 중 <strong>{filtered.length}</strong>개</>
                                : <>변수 <strong>{all.length}</strong>개</>}
                        </span>
                    )}
                </div>
                <div className="vl-right">
                    <div className="vl-search">
                        <svg width="14" height="14" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                        <input
                            id="vl-search-input"
                            placeholder="변수명 · SPSS명 · 문항 · 표제목 검색"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>
                    <button id="vl-refresh-btn" type="button" className="vl-refresh" onClick={load} disabled={loading}>
                        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                        새로고침
                    </button>
                </div>
            </div>

            <div className="vl-scroll">
                <div className="vl-card">{body}</div>
            </div>
        </div>
    );
}
