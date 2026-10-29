import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Search, Copy, Check, ChevronDown, ChevronUp, X, Layers, ExternalLink } from 'lucide-react';
import { DpRequestPageApi } from '../DpRequestPageApi';
import { getSpss } from '../../../common/spssName';
import '@/services/dataStatus/app/hsrt/srtTheme.css';

/**
 * 전체 문항 정보 조회 뷰어 (새창) - [슬림 & 콤팩트 스마트 그리드]
 * - 1화면에 15~20개 문항이 한눈에 보이는 높은 정보 밀도
 * - 문항번호 / 보기 클릭 시 조건식 즉시 클립보드 복사
 */
export default function QuestionsInfoPage() {
    const [searchParams] = useSearchParams();
    const auth = useSelector((store) => store.auth);

    const pageId = searchParams.get('pageId') || sessionStorage.getItem('pageId') || '';
    const pnParam = searchParams.get('pn') || sessionStorage.getItem('merge_pn') || sessionStorage.getItem('projectnum') || '';
    const user = searchParams.get('user') || auth?.user?.userId || '';

    const { getBaseVariableList, getRecodedOverview } = DpRequestPageApi();

    const [loading, setLoading] = useState(true);
    const [variables, setVariables] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedType, setSelectedType] = useState('all'); // all, single, multi, scale, open
    const [expandAllOptions, setExpandAllOptions] = useState(false);
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [copiedText, setCopiedText] = useState('');
    const [toastMessage, setToastMessage] = useState('');

    useEffect(() => {
        document.title = pnParam ? `문항 정보 — ${pnParam}` : '전체 문항 정보 조회';
    }, [pnParam]);

    // 데이터 로드
    useEffect(() => {
        let isMounted = true;
        const loadQuestions = async () => {
            if (!pageId) {
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                // 1. 기본 문항 목록 조회
                const baseRes = await getBaseVariableList.mutateAsync({ pageid: pageId, user });
                let baseList = [];
                if (String(baseRes?.success) === '777' && baseRes?.resultjson) {
                    const raw = baseRes.resultjson;
                    baseList = Array.isArray(raw) ? raw : Object.values(raw);
                }

                // 2. 재코딩 문항 목록 조회 (보조)
                let recodedList = [];
                try {
                    const recodedRes = await getRecodedOverview.mutateAsync({ pageid: pageId, user });
                    const recJson = recodedRes?.resultjson || recodedRes?.data?.resultjson;
                    if (recJson?.variables) {
                        recodedList = Object.values(recJson.variables);
                    }
                } catch (e) {
                    // ignore
                }

                if (!isMounted) return;

                // 3. 변수 리스트 정규화
                const normalizedMap = new Map();

                baseList.forEach(v => {
                    if (!v || !v.id) return;
                    const spss = getSpss(v) || v.spss_name || v.id;
                    const cats = (v.categories || v.info || v.options || []).map((c, idx) => {
                        const val = c.value !== undefined ? c.value : (c.id !== undefined ? c.id : (idx + 1));
                        const label = c.label || c.name || c.text || String(val);
                        return { value: val, label: String(label).trim() };
                    });

                    normalizedMap.set(v.id, {
                        id: v.id,
                        spss_name: spss,
                        label: v.label || v.question || v.name || '',
                        type: (v.type || 'single').toLowerCase(),
                        is_recoded: false,
                        categories: cats
                    });
                });

                recodedList.forEach(v => {
                    if (!v || !v.id) return;
                    if (normalizedMap.has(v.id)) return;
                    const spss = getSpss(v) || v.spss_name || v.id;
                    const cats = (v.categories || v.info || v.options || []).map((c, idx) => {
                        const val = c.value !== undefined ? c.value : (c.id !== undefined ? c.id : (idx + 1));
                        const label = c.label || c.name || c.text || String(val);
                        return { value: val, label: String(label).trim() };
                    });

                    normalizedMap.set(v.id, {
                        id: v.id,
                        spss_name: spss,
                        label: v.label || v.question || v.name || '',
                        type: (v.type || 'single').toLowerCase(),
                        is_recoded: true,
                        categories: cats
                    });
                });

                setVariables(Array.from(normalizedMap.values()));
            } catch (err) {
                console.error("문항 정보 조회 실패:", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadQuestions();
        return () => { isMounted = false; };
    }, [pageId, user]);

    // 클립보드 복사 함수
    const copyToClipboard = useCallback((text) => {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            setCopiedText(text);
            setToastMessage(`복사됨: ${text}`);
            setTimeout(() => {
                setCopiedText('');
                setToastMessage('');
            }, 2000);
        }).catch(err => {
            console.error('클립보드 복사 실패:', err);
        });
    }, []);

    // 유형 필터 분류 헬퍼
    const getTypeCategory = (type) => {
        const t = (type || '').toLowerCase();
        if (t === 'single') return 'single';
        if (t === 'multi' || t === 'double') return 'multi';
        if (t === 'scale') return 'scale';
        if (t.includes('숫자') || t.includes('num') || t === 'open-num' || t === 'open_num' || t === 'number') return 'open(숫자)';
        if (t.includes('문자') || t.includes('text') || t.includes('char') || t.includes('str') || t === 'open') return 'open(문자)';
        return 'other';
    };

    const getTypeDisplay = (type) => {
        const cat = getTypeCategory(type);
        if (cat === 'single') return { label: 'single', bg: '#FFF7ED', color: '#C2410C', border: '#FFEDD5' };
        if (cat === 'multi') return { label: 'multi', bg: '#EFF6FF', color: '#1D4ED8', border: '#DBEAFE' };
        if (cat === 'scale') return { label: 'scale', bg: '#F0FDF4', color: '#15803D', border: '#DCFCE7' };
        if (cat === 'open(숫자)') return { label: 'open(숫자)', bg: '#F1F5F9', color: '#334155', border: '#CBD5E1' };
        if (cat === 'open(문자)') return { label: 'open(문자)', bg: '#F8FAFC', color: '#64748B', border: '#E2E8F0' };
        return { label: type || '기타', bg: '#F1F5F9', color: '#64748B', border: '#E2E8F0' };
    };

    // 검색 및 필터링
    const filteredVariables = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return variables.filter(item => {
            if (selectedType !== 'all') {
                const itemCat = getTypeCategory(item.type);
                if (selectedType !== itemCat) return false;
            }

            if (!q) return true;

            const inSpss = (item.spss_name || '').toLowerCase().includes(q);
            const inId = (item.id || '').toLowerCase().includes(q);
            const inLabel = (item.label || '').toLowerCase().includes(q);
            const inCats = item.categories.some(c =>
                String(c.value).toLowerCase().includes(q) ||
                (c.label || '').toLowerCase().includes(q)
            );

            return inSpss || inId || inLabel || inCats;
        });
    }, [variables, searchQuery, selectedType]);

    useEffect(() => {
        const prevTheme = document.documentElement.getAttribute('data-theme');
        document.documentElement.setAttribute('data-theme', 'hsrt');
        return () => {
            if (prevTheme) document.documentElement.setAttribute('data-theme', prevTheme);
            else document.documentElement.removeAttribute('data-theme');
        };
    }, []);

    // 조건식 생성 헬퍼
    const getConditionFormula = (item, cat) => {
        const spss = item.spss_name || item.id;
        const val = cat.value;
        const catType = getTypeCategory(item.type);

        if (catType === 'multi') {
            return `${spss} in [${val}]`;
        }
        return `${spss} == ${val}`;
    };

    const toggleRowExpand = (id) => {
        setExpandedRows(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            backgroundColor: '#F8FAFC',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Pretendard", sans-serif',
            color: '#1E293B',
            overflow: 'hidden'
        }}>
            {/* 전역 CSS의 오렌지 포커스 강제 무력화 및 블루 포커스 보장 */}
            <style>{`
                .q-search-input {
                    outline: none !important;
                    border: 1px solid #CBD5E1 !important;
                    box-shadow: none !important;
                }
                html body input.q-search-input,
                html body input.q-search-input:focus,
                html body input.q-search-input:focus-visible,
                html body [data-theme] input.q-search-input:focus,
                html body [data-theme] input.q-search-input:focus-visible,
                html[data-theme] input.q-search-input:focus,
                body[data-theme] input.q-search-input:focus,
                [data-theme] input[type="text"].q-search-input:focus {
                    border-color: #3B82F6 !important;
                    box-shadow: 0 0 0 2.5px rgba(59, 130, 246, 0.22) !important;
                    outline: none !important;
                    background-color: #FFFFFF !important;
                }
            `}</style>

            {/* 1. 슬림 헤더 바 */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 16px',
                backgroundColor: '#FFFFFF',
                borderBottom: '1px solid #E2E8F0',
                gap: '16px'
            }}>
                {/* 좌측: 타이틀 & 프로젝트 번호 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <div style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '6px',
                        backgroundColor: '#EEF2FF',
                        color: '#4F46E5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Layers size={15} />
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', whiteSpace: 'nowrap' }}>
                        문항 정보 조회
                    </span>
                    {pnParam && (
                        <span style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#64748B',
                            backgroundColor: '#F1F5F9',
                            padding: '1px 6px',
                            borderRadius: '4px'
                        }}>
                            {pnParam}
                        </span>
                    )}
                </div>

                {/* 우측: 실시간 검색창 */}
                <div style={{
                    position: 'relative',
                    width: '360px',
                    maxWidth: '100%'
                }}>
                    <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                        type="text"
                        className="q-search-input"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="검색어를 입력하세요."
                        style={{
                            width: '100%',
                            height: '32px',
                            paddingLeft: '30px',
                            paddingRight: '28px',
                            fontSize: '12px',
                            borderRadius: '6px',
                            boxSizing: 'border-box',
                            backgroundColor: '#F8FAFC',
                            transition: 'all 0.15s'
                        }}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            style={{
                                position: 'absolute',
                                right: '6px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                border: 'none',
                                background: 'transparent',
                                color: '#94A3B8',
                                cursor: 'pointer',
                                padding: '2px'
                            }}
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>
            </div>

            {/* 2. 필터 & 상태 툴바 (화이트 배경, 좌우 균형 배치) */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 16px',
                backgroundColor: '#FFFFFF',
                borderBottom: '1px solid #E2E8F0',
                gap: '12px'
            }}>
                {/* 좌측: 유형 탭 필터 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                    {[
                        { key: 'all', label: '전체 유형' },
                        { key: 'single', label: 'single' },
                        { key: 'multi', label: 'multi' },
                        { key: 'open(숫자)', label: 'open(숫자)' },
                        { key: 'open(문자)', label: 'open(문자)' },
                        { key: 'scale', label: 'scale' }
                    ].map(tab => {
                        const isSelected = selectedType === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setSelectedType(tab.key)}
                                style={{
                                    padding: '4px 10px',
                                    fontSize: '11.5px',
                                    fontWeight: isSelected ? 700 : 500,
                                    borderRadius: '5px',
                                    border: isSelected ? '1px solid #2563EB' : '1px solid #CBD5E1',
                                    backgroundColor: isSelected ? '#2563EB' : '#FFFFFF',
                                    color: isSelected ? '#FFFFFF' : '#475569',
                                    cursor: 'pointer',
                                    transition: 'all 0.12s ease',
                                    boxShadow: isSelected ? '0 1px 2px rgba(37,99,235,0.2)' : 'none'
                                }}
                                onMouseEnter={e => {
                                    if (!isSelected) {
                                        e.currentTarget.style.backgroundColor = '#F8FAFC';
                                        e.currentTarget.style.borderColor = '#94A3B8';
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (!isSelected) {
                                        e.currentTarget.style.backgroundColor = '#FFFFFF';
                                        e.currentTarget.style.borderColor = '#CBD5E1';
                                    }
                                }}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* 우측: 결과 카운트 뱃지 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <span style={{
                        fontSize: '11.5px',
                        color: '#64748B',
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        whiteSpace: 'nowrap'
                    }}>
                        검색 <strong style={{ color: '#2563EB', fontWeight: 700 }}>{filteredVariables.length}</strong> / {variables.length}개
                    </span>
                </div>
            </div>

            {/* 3. 문항 목록 테이블 컨테이너 (스크롤 격리) */}
            <div style={{
                flex: 1,
                minHeight: 0,
                padding: '10px 16px 12px 16px',
                backgroundColor: '#F1F5F9',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {loading ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                        문항 정보를 불러오는 중입니다...
                    </div>
                ) : filteredVariables.length === 0 ? (
                    <div style={{
                        padding: '40px',
                        textAlign: 'center',
                        color: '#94A3B8',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '6px',
                        border: '1px solid #E2E8F0',
                        fontSize: '12.5px'
                    }}>
                        검색 조건에 일치하는 문항이 없습니다.
                    </div>
                ) : (
                    <div className="custom-scrollbar" style={{
                        flex: 1,
                        minHeight: 0,
                        overflowY: 'auto',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                    }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', tableLayout: 'fixed' }}>
                            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                <tr style={{ backgroundColor: '#EBF5FF', borderBottom: '1.5px solid #BFDBFE', color: '#1E3A8A', fontWeight: 700 }}>
                                    <th style={{ position: 'sticky', top: 0, backgroundColor: '#EBF5FF', zIndex: 10, padding: '10px 8px', width: '38px', textAlign: 'center', borderBottom: '1.5px solid #BFDBFE', color: '#1E3A8A' }}>No</th>
                                    <th style={{ position: 'sticky', top: 0, backgroundColor: '#EBF5FF', zIndex: 10, padding: '10px 10px', width: '120px', textAlign: 'left', borderBottom: '1.5px solid #BFDBFE', color: '#1E3A8A' }}>문항번호</th>
                                    <th style={{ position: 'sticky', top: 0, backgroundColor: '#EBF5FF', zIndex: 10, padding: '10px 8px', width: '85px', textAlign: 'center', borderBottom: '1.5px solid #BFDBFE', color: '#1E3A8A' }}>문항유형</th>
                                    <th style={{ position: 'sticky', top: 0, backgroundColor: '#EBF5FF', zIndex: 10, padding: '10px 12px', textAlign: 'left', width: '210px', borderBottom: '1.5px solid #BFDBFE', color: '#1E3A8A' }}>문항명</th>
                                    <th style={{ position: 'sticky', top: 0, backgroundColor: '#EBF5FF', zIndex: 10, padding: '8px 14px', textAlign: 'left', borderBottom: '1.5px solid #BFDBFE', color: '#1E3A8A' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                            <span style={{ fontWeight: 700 }}>보기 항목 (클릭 시 조건식 복사)</span>
                                            <button
                                                onClick={() => setExpandAllOptions(prev => !prev)}
                                                title={expandAllOptions ? "보기 전체 1줄로 접기" : "보기 전체 여러 줄로 펼치기"}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '5px',
                                                    padding: '5.5px 14px',
                                                    fontSize: '12px',
                                                    fontWeight: 700,
                                                    lineHeight: '1.2',
                                                    color: expandAllOptions ? '#1D4ED8' : '#2563EB',
                                                    backgroundColor: expandAllOptions ? '#EFF6FF' : '#FFFFFF',
                                                    border: expandAllOptions ? '1px solid #93C5FD' : '1px solid #BFDBFE',
                                                    borderRadius: '20px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.12s ease',
                                                    boxShadow: '0 1px 2px rgba(37,99,235,0.08)'
                                                }}
                                                onMouseEnter={e => {
                                                    e.currentTarget.style.backgroundColor = '#EFF6FF';
                                                    e.currentTarget.style.borderColor = '#3B82F6';
                                                    e.currentTarget.style.transform = 'translateY(-0.5px)';
                                                }}
                                                onMouseLeave={e => {
                                                    e.currentTarget.style.backgroundColor = expandAllOptions ? '#EFF6FF' : '#FFFFFF';
                                                    e.currentTarget.style.borderColor = expandAllOptions ? '#93C5FD' : '#BFDBFE';
                                                    e.currentTarget.style.transform = 'none';
                                                }}
                                            >
                                                {expandAllOptions ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                <span style={{ fontSize: '12px', fontWeight: 700, lineHeight: 1 }}>
                                                    {expandAllOptions ? '전체 접기' : '전체 펼치기'}
                                                </span>
                                            </button>
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredVariables.map((item, idx) => {
                                    const spss = item.spss_name || item.id;
                                    const typeInfo = getTypeDisplay(item.type);
                                    const isRowExpanded = expandAllOptions || expandedRows.has(item.id);
                                    const cats = item.categories || [];
                                    const maxVisibleCats = 4;
                                    const visibleCats = isRowExpanded ? cats : cats.slice(0, maxVisibleCats);
                                    const hasMoreCats = cats.length > maxVisibleCats;
                                    const isOpenQuestion = cats.length === 0;

                                    return (
                                        <tr
                                            key={item.id}
                                            style={{
                                                borderBottom: '1px solid #E2E8F0',
                                                backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFCFF',
                                                transition: 'background-color 0.1s'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F0F7FF'}
                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#FFFFFF' : '#FAFCFF'}
                                        >
                                            {/* 1) No */}
                                            <td style={{ padding: '7px 8px', textAlign: 'center', color: '#94A3B8', fontSize: '11px', verticalAlign: 'middle' }}>
                                                {idx + 1}
                                            </td>

                                            {/* 2) 변수명 (아이콘 유지) */}
                                            <td style={{ padding: '7px 10px', verticalAlign: 'middle' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                                                    <button
                                                        onClick={() => copyToClipboard(spss)}
                                                        title={`변수명 복사: ${spss}`}
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            padding: '2.5px 8px',
                                                            fontSize: '12px',
                                                            fontWeight: 700,
                                                            color: copiedText === spss ? '#16A34A' : '#1D4ED8',
                                                            backgroundColor: copiedText === spss ? '#F0FDF4' : '#EFF6FF',
                                                            border: copiedText === spss ? '1px solid #86EFAC' : '1px solid #BFDBFE',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            lineHeight: '1.2',
                                                            transition: 'all 0.12s ease',
                                                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                                                        }}
                                                        onMouseEnter={e => {
                                                            if (copiedText !== spss) {
                                                                e.currentTarget.style.backgroundColor = '#DBEAFE';
                                                                e.currentTarget.style.borderColor = '#3B82F6';
                                                                e.currentTarget.style.color = '#1E40AF';
                                                                e.currentTarget.style.transform = 'translateY(-1px)';
                                                                e.currentTarget.style.boxShadow = '0 2px 5px rgba(37,99,235,0.18)';
                                                            }
                                                        }}
                                                        onMouseLeave={e => {
                                                            if (copiedText !== spss) {
                                                                e.currentTarget.style.backgroundColor = '#EFF6FF';
                                                                e.currentTarget.style.borderColor = '#BFDBFE';
                                                                e.currentTarget.style.color = '#1D4ED8';
                                                                e.currentTarget.style.transform = 'none';
                                                                e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.03)';
                                                            }
                                                        }}
                                                    >
                                                        <span>{spss}</span>
                                                        {copiedText === spss ? <Check size={11} color="#16A34A" /> : <Copy size={11} color="#3B82F6" />}
                                                    </button>
                                                    {item.id !== spss && (
                                                        <span style={{ fontSize: '11px', color: '#94A3B8', fontFamily: 'monospace', paddingLeft: '2px' }}>
                                                            {item.id}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* 3) 문항 유형 (별도 독립 컬럼) */}
                                            <td style={{ padding: '7px 8px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                <span style={{
                                                    display: 'inline-block',
                                                    fontSize: '10.5px',
                                                    fontWeight: 600,
                                                    padding: '2px 7px',
                                                    borderRadius: '4px',
                                                    backgroundColor: typeInfo.bg,
                                                    color: typeInfo.color,
                                                    border: `1px solid ${typeInfo.border}`,
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {typeInfo.label}
                                                </span>
                                            </td>

                                            {/* 4) 문항명 (너비 축소, 말줄임, 마우스오버 시 타이틀 툴팁) */}
                                            <td style={{ padding: '7px 12px', verticalAlign: 'middle', overflow: 'hidden' }}>
                                                <div
                                                    title={item.label}
                                                    style={{
                                                        fontSize: '12px',
                                                        fontWeight: 600,
                                                        color: '#1E293B',
                                                        lineHeight: 1.35,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        cursor: 'default'
                                                    }}
                                                >
                                                    {item.label}
                                                </div>
                                            </td>

                                            {/* 5) 보기 항목 및 값 (미니 태그 칩) */}
                                            <td style={{ padding: '7px 12px', verticalAlign: 'middle' }}>
                                                {isOpenQuestion ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <span style={{ fontSize: '11px', color: '#94A3B8' }}>주관식 (보기 없음)</span>
                                                        <button
                                                            onClick={() => copyToClipboard(`${spss} is not null`)}
                                                            title="주관식 응답 조건식 복사"
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '3px',
                                                                padding: '2px 7px',
                                                                fontSize: '11px',
                                                                fontFamily: 'monospace',
                                                                color: '#475569',
                                                                backgroundColor: '#F8FAFC',
                                                                border: '1px solid #CBD5E1',
                                                                borderRadius: '4px',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.12s ease'
                                                            }}
                                                            onMouseEnter={e => {
                                                                e.currentTarget.style.backgroundColor = '#EFF6FF';
                                                                e.currentTarget.style.borderColor = '#3B82F6';
                                                                e.currentTarget.style.color = '#1D4ED8';
                                                            }}
                                                            onMouseLeave={e => {
                                                                e.currentTarget.style.backgroundColor = '#F8FAFC';
                                                                e.currentTarget.style.borderColor = '#CBD5E1';
                                                                e.currentTarget.style.color = '#475569';
                                                            }}
                                                        >
                                                            <span>{spss} is not null</span>
                                                            <Copy size={10} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            flexWrap: isRowExpanded ? 'wrap' : 'nowrap',
                                                            gap: '4px',
                                                            alignItems: 'center',
                                                            overflow: isRowExpanded ? 'visible' : 'hidden',
                                                            padding: '2px 0',
                                                            maxWidth: '100%',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                    >
                                                        {visibleCats.map((cat, cIdx) => {
                                                            const formula = getConditionFormula(item, cat);
                                                            const isCopied = copiedText === formula;

                                                            return (
                                                                <button
                                                                    key={`${cat.value}-${cIdx}`}
                                                                    onClick={() => copyToClipboard(formula)}
                                                                    title={isRowExpanded ? `클릭 시 조건식 복사: ${formula}` : `${cat.value}. ${cat.label} (클릭 시 복사)`}
                                                                    style={{
                                                                        flexShrink: isRowExpanded ? 0 : 1,
                                                                        maxWidth: isRowExpanded ? 'none' : '190px',
                                                                        whiteSpace: 'nowrap',
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px',
                                                                        padding: '3px 9px',
                                                                        fontSize: '11px',
                                                                        lineHeight: '1.2',
                                                                        borderRadius: '4px',
                                                                        border: isCopied ? '1px solid #16A34A' : '1px solid #CBD5E1',
                                                                        backgroundColor: isCopied ? '#F0FDF4' : '#FFFFFF',
                                                                        color: isCopied ? '#16A34A' : '#334155',
                                                                        cursor: 'pointer',
                                                                        transition: 'all 0.12s ease',
                                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                                                    }}
                                                                    onMouseEnter={e => {
                                                                        if (!isCopied) {
                                                                            e.currentTarget.style.backgroundColor = '#EFF6FF';
                                                                            e.currentTarget.style.borderColor = '#3B82F6';
                                                                            e.currentTarget.style.color = '#1D4ED8';
                                                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                                                            e.currentTarget.style.boxShadow = '0 2px 5px rgba(37,99,235,0.15)';
                                                                        }
                                                                    }}
                                                                    onMouseLeave={e => {
                                                                        if (!isCopied) {
                                                                            e.currentTarget.style.backgroundColor = '#FFFFFF';
                                                                            e.currentTarget.style.borderColor = '#CBD5E1';
                                                                            e.currentTarget.style.color = '#334155';
                                                                            e.currentTarget.style.transform = 'none';
                                                                            e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)';
                                                                        }
                                                                    }}
                                                                >
                                                                    <span style={{ fontWeight: 700, color: '#2563EB', flexShrink: 0 }}>{cat.value}.</span>
                                                                    <span style={{
                                                                        minWidth: 0,
                                                                        overflow: 'hidden',
                                                                        textOverflow: isRowExpanded ? 'clip' : 'ellipsis',
                                                                        whiteSpace: 'nowrap',
                                                                        paddingRight: '2px',
                                                                        letterSpacing: '0'
                                                                    }}>
                                                                        {cat.label}
                                                                    </span>
                                                                    {isCopied && <Check size={10} color="#16A34A" style={{ flexShrink: 0 }} />}
                                                                </button>
                                                            );
                                                        })}

                                                        {/* +외 N개 / 접기 버튼 (한 줄에 항상 함께 표시) */}
                                                        {hasMoreCats && (
                                                            <button
                                                                onClick={() => toggleRowExpand(item.id)}
                                                                title={isRowExpanded ? "한 줄로 접기" : "전체 보기 펼치기"}
                                                                style={{
                                                                    flexShrink: 0,
                                                                    whiteSpace: 'nowrap',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '2px',
                                                                    padding: '2px 7px',
                                                                    fontSize: '11px',
                                                                    fontWeight: 700,
                                                                    color: isRowExpanded ? '#475569' : '#2563EB',
                                                                    backgroundColor: isRowExpanded ? '#F1F5F9' : '#EFF6FF',
                                                                    border: isRowExpanded ? '1px solid #CBD5E1' : '1px solid #BFDBFE',
                                                                    borderRadius: '4px',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.12s ease'
                                                                }}
                                                                onMouseEnter={e => {
                                                                    e.currentTarget.style.backgroundColor = isRowExpanded ? '#E2E8F0' : '#DBEAFE';
                                                                    e.currentTarget.style.borderColor = '#3B82F6';
                                                                }}
                                                                onMouseLeave={e => {
                                                                    e.currentTarget.style.backgroundColor = isRowExpanded ? '#F1F5F9' : '#EFF6FF';
                                                                    e.currentTarget.style.borderColor = isRowExpanded ? '#CBD5E1' : '#BFDBFE';
                                                                }}
                                                            >
                                                                {isRowExpanded ? (
                                                                    <>
                                                                        <ChevronUp size={11} />
                                                                        <span>접기</span>
                                                                    </>
                                                                ) : (
                                                                    <span>+외 {cats.length - maxVisibleCats}개</span>
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* 4. 복사 완료 미니 토스트 */}
            {toastMessage && (
                <div style={{
                    position: 'fixed',
                    bottom: '16px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: '#0F172A',
                    color: '#FFFFFF',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    zIndex: 9999,
                    animation: 'fadeIn 0.15s ease-out'
                }}>
                    <Check size={14} color="#22C55E" />
                    <span>{toastMessage}</span>
                </div>
            )}
        </div>
    );
}
