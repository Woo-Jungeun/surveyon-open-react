import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    AlertTriangle,
    Info,
    FileText,
    Code2,
    CheckCircle2,
    Check,
    Search,
    Filter,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    XCircle,
    Layers,
    ListFilter,
    ArrowRight
} from 'lucide-react';
import './WordingCompareView.css';

/**
 * 문자열 하이라이팅 헬퍼
 * docMarks / scriptMarks ([{ start, length }]) 위치 정보를 받아 해당 문자열에 <mark> 태그 적용
 */
export const renderMarkedText = (text, marks = []) => {
    if (!text) return null;
    if (!marks || !Array.isArray(marks) || marks.length === 0) return text;

    const validMarks = [...marks]
        .filter(m => m && typeof m.start === 'number' && typeof m.length === 'number' && m.length > 0)
        .sort((a, b) => a.start - b.start);

    if (validMarks.length === 0) return text;

    const elements = [];
    let lastIdx = 0;

    validMarks.forEach((m, idx) => {
        const start = Math.max(0, m.start);
        const end = Math.min(text.length, m.start + m.length);

        if (start > lastIdx) {
            elements.push(<span key={`txt-${lastIdx}-${idx}`}>{text.slice(lastIdx, start)}</span>);
        }

        if (end > start) {
            elements.push(
                <mark key={`mark-${idx}-${start}`} className="wording-mark-highlight">
                    {text.slice(start, end)}
                </mark>
            );
            lastIdx = end;
        }
    });

    if (lastIdx < text.length) {
        elements.push(<span key={`txt-end-${lastIdx}`}>{text.slice(lastIdx)}</span>);
    }

    return elements;
};

/**
 * **볼드** 마크다운 구문 안전 렌더링 헬퍼
 */
const renderFormattedMessage = (msg) => {
    if (!msg) return null;
    const parts = String(msg).split(/(\*\*.*?\*\*)/g);
    return parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={idx}>{part.slice(2, -2)}</strong>;
        }
        return part;
    });
};

const WordingCompareView = ({ data, topMessage, onResetQnumFilter }) => {
    const [activeTab, setActiveTab] = useState('questions'); // 'questions' | 'options' | 'emphasis'
    const [searchQuery, setSearchQuery] = useState('');
    const [majorOnly, setMajorOnly] = useState(false);
    const [selectedQnumFilter, setSelectedQnumFilter] = useState(null);
    const [isCollapsibleOpen, setIsCollapsibleOpen] = useState(false);

    const contentBodyRef = useRef(null);

    // 탭 변경 시 리스트 스크롤 최상단 리셋 및 검색어/필터 초기화 (각 탭 독립적 동작)
    useEffect(() => {
        if (contentBodyRef.current) {
            contentBodyRef.current.scrollTop = 0;
        }
        setSearchQuery('');
        setMajorOnly(false);
        setSelectedQnumFilter(null);
    }, [activeTab]);

    const resultjson = data || {};
    const {
        basis,
        warning,
        emphasis = {},
        source = {},
        summary = {},
        questions = [],
        options = [],
        emphasisDiffs = [],
        sourceMatchedQnums = [],
        sameQnumElsewhere = []
    } = resultjson;

    // 현재 탭의 원본 항목 개수 (리스트가 0개일 때 검색창 숨김용)
    const currentTabRawCount = useMemo(() => {
        if (activeTab === 'questions') return (questions || []).length;
        if (activeTab === 'options') return (options || []).length;
        if (activeTab === 'emphasis') return (emphasisDiffs || []).length;
        return 0;
    }, [activeTab, questions, options, emphasisDiffs]);

    // ── 안내 항목 리스트 수집 (배열/단일문자열 대응) ──
    const noticeItems = useMemo(() => {
        const list = [];
        const addMsg = (msg) => {
            if (!msg) return;
            if (Array.isArray(msg)) {
                msg.forEach(m => m && list.push(String(m)));
            } else {
                list.push(String(msg));
            }
        };

        addMsg(source?.message);
        if (emphasis?.message && (emphasis.available === false || emphasis.sameFile === false)) {
            addMsg(emphasis.message);
        }
        addMsg(resultjson.notices);

        return list;
    }, [source, emphasis, resultjson]);

    // ── 검색 및 탭별 필터링 데이터 계산 ─────────────────────
    const filteredQuestions = useMemo(() => {
        let list = questions || [];
        if (majorOnly) {
            list = list.filter(q => q.grade === 'major');
        }
        if (selectedQnumFilter) {
            list = list.filter(q => q.qnum === selectedQnumFilter || q.scriptVar === selectedQnumFilter);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            list = list.filter(item =>
                (item.qnum || '').toLowerCase().includes(q) ||
                (item.scriptVar || '').toLowerCase().includes(q) ||
                (item.doc || '').toLowerCase().includes(q) ||
                (item.script || '').toLowerCase().includes(q) ||
                (item.note || '').toLowerCase().includes(q)
            );
        }
        return list;
    }, [questions, majorOnly, selectedQnumFilter, searchQuery]);

    const filteredOptions = useMemo(() => {
        let list = options || [];
        if (selectedQnumFilter) {
            list = list.filter(o => o.qnum === selectedQnumFilter || o.scriptVar === selectedQnumFilter);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            list = list.filter(item =>
                (item.qnum || '').toLowerCase().includes(q) ||
                (item.scriptVar || '').toLowerCase().includes(q) ||
                (item.docOnly || []).some(s => String(s).toLowerCase().includes(q)) ||
                (item.scriptOnly || []).some(s => String(s).toLowerCase().includes(q)) ||
                (item.note || '').toLowerCase().includes(q)
            );
        }
        return list;
    }, [options, selectedQnumFilter, searchQuery]);

    const filteredEmphasis = useMemo(() => {
        let list = emphasisDiffs || [];
        if (selectedQnumFilter) {
            list = list.filter(e => e.qnum === selectedQnumFilter || e.scriptVar === selectedQnumFilter);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            list = list.filter(item =>
                (item.qnum || '').toLowerCase().includes(q) ||
                (item.scriptVar || '').toLowerCase().includes(q) ||
                (item.docOnly || []).some(s => String(s).toLowerCase().includes(q)) ||
                (item.scriptOnly || []).some(s => String(s).toLowerCase().includes(q))
            );
        }
        return list;
    }, [emphasisDiffs, selectedQnumFilter, searchQuery]);

    const handleQnumClick = (qnum) => {
        if (!qnum) return;
        setSelectedQnumFilter(prev => prev === qnum ? null : qnum);
    };

    const handleResetFilter = () => {
        setSelectedQnumFilter(null);
        setSearchQuery('');
        setMajorOnly(false);
    };

    return (
        <div className="wording-compare-view">
            {/* ── 0. 오류 상태 (errorcontent가 있는 경우: 예 909 설문지 인식 전) ───────────────── */}
            {resultjson.errorcontent && (
                <div className="wording-error-banner-card">
                    <div className="error-icon-circle">
                        <span>10</span>
                    </div>
                    <span className="error-banner-text">{resultjson.errorcontent}</span>
                </div>
            )}

            {!resultjson.errorcontent && (
                <>
                    {/* ── 1. 전체 경고 (warning가 있는 경우 맨 위에 눈에 띄게) ───────────────── */}
                    {warning && (
                        <div className="wording-warning-banner critical">
                            <div className="wording-warning-banner-icon">
                                <AlertTriangle size={18} />
                            </div>
                            <div className="wording-warning-banner-body">
                                <strong className="wording-warning-title">⚠️ 대조 결과 주의 안내</strong>
                                <p className="wording-warning-desc">{renderFormattedMessage(warning)}</p>
                                <span className="wording-warning-sub">※ 문항 순서 밀림 또는 설문지 구조 차이가 감지되었습니다. 아래 요약 숫자를 주의 깊게 확인해 주세요.</span>
                            </div>
                        </div>
                    )}

                    {/* ── 2. 원문 & 강조 안내 (최대 3개 노출 후 스크롤 고정) ──── */}
                    {noticeItems.length > 0 && (
                        <div className="wording-combined-notice-banner">
                            <div className="notice-banner-header">
                                <Info size={14} className="notice-banner-info-icon" />
                                <span className="notice-banner-title">대조 안내 및 참고사항</span>
                                {noticeItems.length > 3 && (
                                    <span className="notice-banner-count">({noticeItems.length}개)</span>
                                )}
                            </div>
                            <div className="notice-banner-list">
                                {noticeItems.map((msg, idx) => (
                                    <div key={idx} className="notice-banner-item">
                                        <span className="notice-bullet-icon">•</span>
                                        <span>{renderFormattedMessage(msg)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 정상 강조 정보 표시 (작게) */}
                    {emphasis?.available === true && emphasis?.sameFile === true && (
                        <div className="wording-info-meta">
                            <span className="wording-meta-badge">강조 대조 완료</span>
                            <span className="wording-meta-text">
                                {emphasis?.fileName ? `파일명: ${emphasis.fileName}` : ''}
                                {emphasis?.extractedAt ? ` (${new Date(emphasis.extractedAt).toLocaleString()})` : ''}
                            </span>
                        </div>
                    )}
                </>
            )}

            {/* ── 3. 결과 한 줄 (message) 및 기준 (basis) 정보 (초슬림 헤더 스트립) ───────────────── */}
            <div className="wording-header-strip">
                <div className="wording-strip-left">
                    <FileText size={14} className="wording-header-icon" />
                    <span className="wording-header-message">{topMessage || resultjson.message || "설문지 원문과 큐마 스크립트 대조 분석 결과입니다."}</span>
                </div>
                {basis && (
                    <div className="wording-basis-info">
                        대조 기준: 설문지 {basis.documentVersion ? `${basis.documentVersion}차 판` : ''}
                        {basis.documentUpdatedAt ? ` (${new Date(basis.documentUpdatedAt).toLocaleDateString()})` : ''}
                        {basis.scriptFetchedAt ? ` · 동기화 ${new Date(basis.scriptFetchedAt).toLocaleTimeString()}` : ''}
                    </div>
                )}
            </div>

            {/* ── 4. 요약 탭 카드 및 통계 영역 (탭 3개 + 구분선 + 참고 통계 배지) ───────────────── */}
            <div className="wording-summary-wrapper">
                <div className="wording-tabs-group">
                    {/* 문항 문구 다름 카드 */}
                    <div
                        className={`wording-summary-card card-questions ${activeTab === 'questions' ? 'active' : ''}`}
                        onClick={() => setActiveTab('questions')}
                    >
                        <div className="wording-card-left">
                            <span className="wording-card-title">질문 문구 차이</span>
                            <div className="wording-card-sub">
                                질문 문장 불일치 (차이 큼 {summary?.questionMajor ?? 0}건)
                            </div>
                        </div>
                        <span className="wording-card-val rose">
                            {summary?.questionDiff ?? (questions?.length || 0)}
                        </span>
                    </div>

                    {/* 보기 문구 한쪽에만 카드 */}
                    <div
                        className={`wording-summary-card card-options ${activeTab === 'options' ? 'active' : ''}`}
                        onClick={() => setActiveTab('options')}
                    >
                        <div className="wording-card-left">
                            <span className="wording-card-title">보기·척도 차이</span>
                            <div className="wording-card-sub">
                                한쪽에만 존재하는 보기 항목
                            </div>
                        </div>
                        <span className="wording-card-val purple">
                            {summary?.optionDiff ?? (options?.length || 0)}
                        </span>
                    </div>

                    {/* 강조 다름 카드 */}
                    <div
                        className={`wording-summary-card card-emphasis ${activeTab === 'emphasis' ? 'active' : ''}`}
                        onClick={() => setActiveTab('emphasis')}
                    >
                        <div className="wording-card-left">
                            <span className="wording-card-title">서식 강조 차이</span>
                            <div className="wording-card-sub">
                                굵게·색상 등 서식 강조 불일치
                            </div>
                        </div>
                        <span className="wording-card-val pink">
                            {summary?.emphasisDiff ?? (emphasisDiffs?.length || 0)}
                        </span>
                    </div>
                </div>

                <div className="wording-summary-divider" />

                {/* 참고 통계 (클릭 탭이 아닌 안내 정보 박스) */}
                <div className="wording-stat-box">
                    <div className="wording-card-left">
                        <span className="wording-card-title">원문 대조 동일 문항</span>
                        <div className="wording-card-sub">
                            <span className="info-tag-pill">참고 통계</span>
                            <span className="stat-sub-text">원문 평문 대조 동일 항목</span>
                        </div>
                    </div>
                    <span className="wording-card-val green">
                        {summary?.sourceMatched ?? (sourceMatchedQnums?.length || 0)}
                    </span>
                </div>
            </div>

            {/* ── 5. 서브 툴바 (설명 멘트 및 검색/필터통합) ───────────────────────── */}
            <div className="wording-sub-toolbar">
                <div className="wording-sub-title">
                    {activeTab === 'questions' && '설문지 원문과 스크립트(QM) 간 질문 문장 차이 목록입니다. (노란색: 불일치 텍스트)'}
                    {activeTab === 'options' && '설문지 또는 스크립트 한쪽에만 존재하는 보기·척도 항목 목록입니다.'}
                    {activeTab === 'emphasis' && '문구는 동일하나 굵게·밑줄 등 서식 강조가 한쪽에만 적용된 문항입니다.'}
                </div>

                {currentTabRawCount > 0 && (
                    <div className="wording-search-box">
                        <div className="wording-input-wrap">
                            <Search size={14} className="search-icon" />
                            <input
                                type="text"
                                className="wording-search-input"
                                placeholder="문항, 변수, 문구 검색..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button className="clear-btn" onClick={() => setSearchQuery('')}>×</button>
                            )}
                        </div>

                        {activeTab === 'questions' && (
                            <button
                                type="button"
                                className={`wording-checkbox-btn ${majorOnly ? 'active' : ''}`}
                                onClick={() => setMajorOnly(!majorOnly)}
                            >
                                <span className={`custom-checkbox-box ${majorOnly ? 'checked' : ''}`}>
                                    {majorOnly && <Check size={11} strokeWidth={3.5} />}
                                </span>
                                <span>차이 큰 문항만</span>
                            </button>
                        )}

                        {selectedQnumFilter && (
                            <div className="wording-focused-qnum-badge">
                                <span>선택 문항: <b>{selectedQnumFilter}</b></span>
                                <button onClick={handleResetFilter} className="btn-reset-qnum">
                                    필터 해제
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── 6. 탭 컨텐츠 영역 ──────────────────────────────────── */}
            <div className="wording-tab-content-body" ref={contentBodyRef}>

                {/* ── 탭 1: 문항 문구 ── */}
                {activeTab === 'questions' && (
                    <div className="wording-questions-list">
                        {filteredQuestions.length > 0 ? (
                            filteredQuestions.map((item, idx) => {
                                const isMajor = item.grade === 'major';
                                return (
                                    <div key={idx} className={`wording-item-card ${isMajor ? 'grade-major' : 'grade-minor'}`}>
                                        <div className="wording-item-header">
                                            <div className="wording-item-tags">
                                                <button
                                                    type="button"
                                                    className={`qnum-btn ${selectedQnumFilter === item.qnum ? 'active' : ''}`}
                                                    onClick={() => handleQnumClick(item.qnum)}
                                                    title="이 문항만 전체 탭 필터링"
                                                >
                                                    {item.qnum}
                                                </button>
                                                <span className="script-var-tag">{item.scriptVar}</span>
                                                <span className={`grade-badge ${isMajor ? 'major' : 'minor'}`}>
                                                    {isMajor ? '차이 큼' : '차이 작음'}
                                                </span>
                                                {item.similarity !== undefined && item.similarity !== null && (
                                                    <span className="similarity-badge">
                                                        문구 일치율 {item.similarity}%
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="wording-compare-box-grid">
                                            {/* 설문지 문구 (doc) */}
                                            <div className="wording-diff-pane doc-pane">
                                                <span className="pane-label">
                                                    <FileText size={13} className="pane-icon doc" />
                                                    설문지 원문
                                                </span>
                                                <div className="pane-text">
                                                    {renderMarkedText(item.doc, item.docMarks)}
                                                </div>
                                            </div>

                                            {/* 스크립트 문구 (script) */}
                                            <div className="wording-diff-pane script-pane">
                                                <span className="pane-label">
                                                    <Code2 size={13} className="pane-icon script" />
                                                    스크립트 (QM)
                                                </span>
                                                <div className="pane-text">
                                                    {renderMarkedText(item.script, item.scriptMarks)}
                                                </div>
                                            </div>
                                        </div>

                                        {item.note && (
                                            <div className="wording-note-line">
                                                💡 {item.note}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="wording-empty-tab">
                                <CheckCircle2 size={40} className="empty-icon green" />
                                <span className="empty-title">질문 문구가 일치하지 않는 문항이 없습니다.</span>
                                <span className="empty-desc">설문지와 스크립트의 모든 질문 문항이 서로 정확히 일치합니다.</span>
                            </div>
                        )}
                    </div>
                )}

                {/* ── 탭 2: 보기 문구 ── */}
                {activeTab === 'options' && (
                    <div className="wording-options-list">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((item, idx) => {
                                const hasDocOnly = Array.isArray(item.docOnly) && item.docOnly.length > 0;
                                const hasScriptOnly = Array.isArray(item.scriptOnly) && item.scriptOnly.length > 0;

                                return (
                                    <div key={idx} className="wording-option-card">
                                        <div className="wording-item-header">
                                            <div className="wording-item-tags">
                                                <button
                                                    type="button"
                                                    className={`qnum-btn ${selectedQnumFilter === item.qnum ? 'active' : ''}`}
                                                    onClick={() => handleQnumClick(item.qnum)}
                                                >
                                                    {item.qnum}
                                                </button>
                                                <span className="script-var-tag">{item.scriptVar}</span>
                                            </div>
                                        </div>

                                        <div className="wording-option-groups">
                                            {/* 설문지에만 있는 보기 */}
                                            {hasDocOnly && (
                                                <div className="option-group-block doc-only">
                                                    <span className="group-title">
                                                        <FileText size={13} className="pane-icon doc" />
                                                        설문지에만 존재
                                                    </span>
                                                    <div className="chips-wrap">
                                                        {item.docOnly.map((opt, i) => (
                                                            <span key={i} className="option-chip doc">{opt}</span>
                                                        ))}
                                                        {item.docOnlyMore > 0 && (
                                                            <span className="option-more-tag">외 {item.docOnlyMore}개 항목</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* 스크립트에만 있는 보기 */}
                                            {hasScriptOnly && (
                                                <div className="option-group-block script-only">
                                                    <span className="group-title">
                                                        <Code2 size={13} className="pane-icon script" />
                                                        스크립트에만 존재
                                                    </span>
                                                    <div className="chips-wrap">
                                                        {item.scriptOnly.map((opt, i) => (
                                                            <span key={i} className="option-chip script">{opt}</span>
                                                        ))}
                                                        {item.scriptOnlyMore > 0 && (
                                                            <span className="option-more-tag">외 {item.scriptOnlyMore}개 항목</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {item.note && (
                                            <div className="wording-note-line">
                                                💡 {item.note}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="wording-empty-tab">
                                <CheckCircle2 size={40} className="empty-icon green" />
                                <span className="empty-title">한쪽에만 존재하는 보기·척도 항목이 없습니다.</span>
                                <span className="empty-desc">모든 문항의 보기 및 척도 항목이 설문지와 스크립트에 일치되게 구성되어 있습니다.</span>
                            </div>
                        )}
                    </div>
                )}

                {/* ── 탭 3: 강조 ── */}
                {activeTab === 'emphasis' && (
                    <div className="wording-emphasis-list">
                        {filteredEmphasis.length > 0 ? (
                            filteredEmphasis.map((item, idx) => {
                                const hasDocOnly = Array.isArray(item.docOnly) && item.docOnly.length > 0;
                                const hasScriptOnly = Array.isArray(item.scriptOnly) && item.scriptOnly.length > 0;

                                return (
                                    <div key={idx} className="wording-emphasis-card">
                                        <div className="wording-item-header">
                                            <div className="wording-item-tags">
                                                <button
                                                    type="button"
                                                    className={`qnum-btn ${selectedQnumFilter === item.qnum ? 'active' : ''}`}
                                                    onClick={() => handleQnumClick(item.qnum)}
                                                >
                                                    {item.qnum}
                                                </button>
                                                <span className="script-var-tag">{item.scriptVar}</span>
                                            </div>
                                        </div>

                                        <div className="wording-emphasis-groups">
                                            {hasDocOnly && (
                                                <div className="emphasis-group-block doc">
                                                    <span className="group-title">
                                                        <FileText size={13} className="pane-icon doc" />
                                                        설문지에만 강조 적용 (스크립트 강조 없음)
                                                    </span>
                                                    <div className="chips-wrap">
                                                        {item.docOnly.map((txt, i) => (
                                                            <span key={i} className="emphasis-chip doc">{txt}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {hasScriptOnly && (
                                                <div className="emphasis-group-block script">
                                                    <span className="group-title">
                                                        <Code2 size={13} className="pane-icon script" />
                                                        스크립트에만 강조 적용 (설문지 강조 없음)
                                                    </span>
                                                    <div className="chips-wrap">
                                                        {item.scriptOnly.map((txt, i) => (
                                                            <span key={i} className="emphasis-chip script">{txt}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="wording-empty-tab">
                                {emphasis?.available === false ? (
                                    <>
                                        <Info size={40} className="empty-icon yellow" />
                                        <span className="empty-title">설문지 서식 정보가 확인되지 않아 강조 비교를 건너뛰었습니다.</span>
                                        <span className="empty-desc">
                                            {emphasis?.message || "설문지 파일(HWP, DOCX)을 등록하시면 글자 굵게·색상 등 서식 강조 대조 결과를 확인하실 수 있습니다."}
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 size={40} className="empty-icon green" />
                                        <span className="empty-title">서식 강조 설정 차이가 존재하지 않습니다.</span>
                                        <span className="empty-desc">모든 문항의 굵게, 밑줄, 색상 등 서식 강조가 서로 일치합니다.</span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── 7. 하단 접어두기 섹션 (sameQnumElsewhere & sourceMatchedQnums) ─────────── */}
            {(sameQnumElsewhere.length > 0 || sourceMatchedQnums.length > 0) && (
                <div className="wording-collapsible-section">
                    <button
                        type="button"
                        className={`wording-collapsible-toggle ${isCollapsibleOpen ? 'open' : ''}`}
                        onClick={() => setIsCollapsibleOpen(!isCollapsibleOpen)}
                    >
                        <span className="wording-collapsible-toggle-left">
                            <Info size={14} className="collapsible-icon" />
                            <span>참고 및 대조 정보</span>
                        </span>
                        {isCollapsibleOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {isCollapsibleOpen && (
                        <div className="wording-collapsible-body">
                            {/* 동일 문번 복수 존재 항목 */}
                            {sameQnumElsewhere.length > 0 && (
                                <div className="collapsible-block">
                                    <h4 className="collapsible-title">
                                        <AlertTriangle size={14} className="title-icon amber" />
                                        <span>설문지에 동일한 문항 번호가 중복 연결되어 대조에서 제외된 문항 ({sameQnumElsewhere.length}건)</span>
                                    </h4>
                                    <div className="same-qnum-list">
                                        {sameQnumElsewhere.map((item, idx) => (
                                            <div key={idx} className="same-qnum-item">
                                                <div className="same-qnum-tags">
                                                    <span className="qnum-tag">{item.qnum}</span>
                                                    <span className="script-tag">{item.scriptVar}</span>
                                                </div>
                                                <p className="same-qnum-msg">{item.message}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 원문 대조로 같다고 본 문항 */}
                            {sourceMatchedQnums.length > 0 && (
                                <div className="collapsible-block">
                                    <h4 className="collapsible-title">
                                        <CheckCircle2 size={14} className="title-icon green" />
                                        <span>원문 평문 대조 분석 결과 완전 동일하다고 확인된 문항 ({sourceMatchedQnums.length}개)</span>
                                    </h4>
                                    <div className="matched-qnums-chips">
                                        {sourceMatchedQnums.map((qnum, idx) => (
                                            <span key={idx} className="matched-qnum-chip">{qnum}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default WordingCompareView;
