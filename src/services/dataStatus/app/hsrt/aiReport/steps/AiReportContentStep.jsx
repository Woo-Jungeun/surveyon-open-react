
import { Sparkles, RotateCcw, Plus, Trash2, Info } from 'lucide-react';
import { DropDownList } from '@progress/kendo-react-dropdowns';

const CATEGORY_COLORS = [
    '#3b82f6', // Blue
    '#a855f7', // Purple
    '#6366f1', // Indigo
    '#f97316', // Orange
    '#10b981', // Emerald Green
    '#f43f5e', // Rose Pink
    '#06b6d4', // Cyan
    '#f59e0b', // Amber/Gold
    '#ec4899', // Pink
    '#14b8a6', // Teal
    '#84cc16', // Lime Green
    '#8b5cf6', // Violet
    '#0284c7', // Sky Blue
    '#d946ef'  // Fuchsia
];

const formatOptionsTooltip = (options) => {
    if (!options || options.length === 0) return '등록된 보기가 없습니다.';
    return options.map(opt => {
        const val = opt.value !== undefined ? opt.value : (opt.Value !== undefined ? opt.Value : (opt.code !== undefined ? opt.code : ''));
        const txt = opt.label || opt.Label || opt.text || opt.Text || '';
        return `${val}: ${txt}`;
    }).join('\n');
};

const AiReportContentStep = ({
    categories,
    selectedCategoryId,
    setSelectedCategoryId,
    questions,
    newKpiQuestionId,
    setNewKpiQuestionId,
    isAdding,
    newCategoryName,
    setNewCategoryName,
    newHypothesis,
    setNewHypothesis,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    handleSelectAllQuestions,
    handleToggleQuestion,
    handleAiAutoCategorize,
    isAiCategorized,
    handleRestoreOriginalCategories,
    handleAddCategory,
    handleCancelNewCategory,
    handleSaveNewCategory,
    handleDeleteCategory
}) => {
    const selectedCat = categories.find(c => c.id === selectedCategoryId);
    const isQChecked = (q) => q.checked || !!(selectedCat && selectedCat.qnums?.some(qk => q.id === qk || q.qnum === qk));
    const currentKpiId = isAdding ? newKpiQuestionId : (selectedCat ? selectedCat.kpi_question_id : null);

    return (
        <div className="ai-step-content-container ai-split-layout">
            {/* Left: 문항 목록 */}
            <div className="ai-card ai-left-column">
                <div className="ai-card-title-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="ai-panel-title">문항 목록</span>
                        <span className="ai-panel-help-icon" title="교차표 & 설문지를 분석하여 문항별 카테고리를 자동 부여">?</span>
                    </div>
                    <span className="ai-panel-total">전체 {questions.length}문항</span>
                </div>

                <div className="ai-filter-search-row">
                    <div className="ai-search-wrapper">
                        <input
                            type="text"
                            className="ai-search-input"
                            placeholder="문항 ID 또는 텍스트 검색"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="ai-dropdown-small-wrapper">
                        <DropDownList
                            data={["전체 유형", "single", "scale", "multi", "rank", "open(문자)", "open(숫자)"]}
                            valuePrimitive={true}
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.value)}
                            style={{ width: '100%', height: '100%', fontSize: '12px' }}
                        />
                    </div>
                </div>

                {/* Questions checklist table */}
                <div className="ai-question-table-wrap">
                    <div className="ai-table-header" style={{ display: 'flex', alignItems: 'center' }}>
                        <div className="ai-th-col select-col" style={{ width: '32px', minWidth: '32px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <input
                                type="checkbox"
                                checked={questions.length > 0 && questions.every(q => isQChecked(q))}
                                onChange={(e) => handleSelectAllQuestions(e.target.checked)}
                                style={{ cursor: 'pointer', margin: 0, width: '13px', height: '13px', flexShrink: 0, appearance: 'checkbox', WebkitAppearance: 'checkbox', opacity: 1, display: 'inline-block', position: 'relative' }}
                            />
                        </div>
                        <div className="ai-th-col id-col" style={{ width: '130px', minWidth: '130px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>ID</div>
                        <div className="ai-th-col label-col" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>문항명</div>
                        <div className="ai-th-col type-col" style={{ width: '70px', minWidth: '70px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>유형</div>
                        <div className="ai-th-col view-col" style={{ width: '65px', minWidth: '65px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '4px', gap: '4px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>보기</span>
                            <span title="각 문항의 보기 개수에 마우스를 올리면 보기 목록을 볼 수 있습니다." style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                                <Info size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
                            </span>
                        </div>
                    </div>

                    <div className="ai-table-body" style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
                        {questions
                            .filter(q => {
                                const matchesSearch = searchQuery === "" || (q.label || "").toLowerCase().includes(searchQuery.toLowerCase()) || (q.qnum || "").toLowerCase().includes(searchQuery.toLowerCase());
                                const matchesType = typeFilter === "전체 유형" ||
                                    (q.type || "").toLowerCase() === typeFilter.toLowerCase() ||
                                    (q.subtype || "").toLowerCase() === typeFilter.toLowerCase();
                                return matchesSearch && matchesType;
                            })
                            .map((q) => {
                                const isKpi = currentKpiId === q.id;
                                const isHighlighted = selectedCat && selectedCat.qnums?.some(qk => q.id === qk || q.qnum === qk);
                                const highlightStyle = isKpi ? {
                                    backgroundColor: '#fffbeb',
                                    borderLeft: '4px solid #f59e0b',
                                    paddingLeft: '8px'
                                } : (isHighlighted ? {
                                    backgroundColor: `${selectedCat.color}12`,
                                    borderLeft: `4px solid ${selectedCat.color}`,
                                    paddingLeft: '8px'
                                } : {});

                                return (
                                    <div
                                        key={q.id}
                                        id={`q_row_${q.id}`}
                                        className={`ai-table-row ${isQChecked(q) ? 'selected' : ''}`}
                                        onClick={() => handleToggleQuestion(q.id)}
                                        style={highlightStyle}
                                    >
                                        <div className="ai-td select-col" onClick={(e) => e.stopPropagation()} style={{ width: '32px', minWidth: '32px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <input
                                                type="checkbox"
                                                checked={isQChecked(q)}
                                                onChange={() => handleToggleQuestion(q.id)}
                                                style={{ cursor: 'pointer', margin: 0, width: '13px', height: '13px', flexShrink: 0, appearance: 'checkbox', WebkitAppearance: 'checkbox', opacity: 1, display: 'inline-block', position: 'relative' }}
                                            />
                                        </div>
                                        <div className="ai-td id-col" style={{ width: '130px', minWidth: '130px', flexShrink: 0, display: 'flex', alignItems: 'center', paddingRight: '8px', gap: '4px' }}>
                                            {isKpi && <span style={{ color: '#f59e0b', fontSize: '11px', fontWeight: 'bold' }} title="기준 KPI 문항">⭐</span>}
                                            <span className="ai-q-id-badge" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '100%', display: 'inline-block' }} title={q.id}>{q.id}</span>
                                        </div>
                                        <div className="ai-td label-col">
                                            {q.qnum && <span className="ai-q-num-label">{q.qnum}.</span>}
                                            <span className="ai-q-text-label">{q.label}</span>
                                        </div>
                                        <div className="ai-td type-col" style={{ width: '70px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                                            <span style={{
                                                fontSize: '11px',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                whiteSpace: 'nowrap',
                                                fontWeight: '800',
                                                textTransform: 'lowercase',
                                                ...((q.type || '').toLowerCase() === 'single' ? { background: '#fff7ed', color: '#c2410c', border: '1px solid #ffedd5' } :
                                                    ((q.type || '').toLowerCase() === 'double' || (q.type || '').toLowerCase() === 'multi') ? { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #dbeafe' } :
                                                        (q.type || '').toLowerCase() === 'scale' ? { background: '#f0fdf4', color: '#15803d', border: '1px solid #dcfce7' } :
                                                            (q.type || '').toLowerCase() === 'rank' ? { background: '#fdf4ff', color: '#a21caf', border: '1px solid #fae8ff' } :
                                                                ((q.type || '').toLowerCase() === 'open(문자)' || (q.type || '').toLowerCase() === 'open-text') ? { background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' } :
                                                                    ((q.type || '').toLowerCase() === 'open(숫자)' || (q.type || '').toLowerCase() === 'open-num') ? { background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' } :
                                                                        { background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' })
                                            }}>
                                                {(q.type || '').toLowerCase() === 'double' ? 'multi' : q.type}
                                            </span>
                                        </div>
                                        <div className="ai-td view-col" style={{ width: '65px', minWidth: '65px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '4px' }}>
                                            <span className="ai-view-link" title={formatOptionsTooltip(q.options)} onClick={(e) => e.stopPropagation()}>{q.viewCount}개</span>
                                        </div>
                                    </div>
                                );
                            })
                        }
                    </div>
                </div>
            </div>

            {/* Right: 생성된 카테고리 */}
            <div className="ai-card ai-right-column">
                <div className="ai-card-title-row" style={{ flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="ai-panel-title">생성된 카테고리</span>
                        <span className="ai-category-badge-count">{categories.length}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {!isAdding && (
                            <>
                                <button className="ai-action-btn-compact blue" onClick={handleAiAutoCategorize}>
                                    <Sparkles size={12} />
                                    <span>AI 자동 분류</span>
                                </button>
                                {isAiCategorized && (
                                    <button className="ai-action-btn-compact" onClick={handleRestoreOriginalCategories}>
                                        <RotateCcw size={12} />
                                        <span>기존 카테고리</span>
                                    </button>
                                )}
                                <button className="ai-add-category-btn" onClick={handleAddCategory}>
                                    <Plus size={12} />
                                    <span>추가</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Category Cards List */}
                <div className="ai-category-cards-container">
                    {isAdding && (() => {
                        const nextCategoryId = categories.length > 0 ? Math.max(...categories.map(c => c.id)) + 1 : 1;
                        const activeColor = CATEGORY_COLORS[(nextCategoryId - 1) % CATEGORY_COLORS.length];
                        const selectedQuestions = questions.filter(q => q.checked);
                        return (
                            <div
                                className="ai-category-card active"
                                style={{
                                    padding: '16px',
                                    borderColor: activeColor,
                                    backgroundColor: '#ffffff',
                                    boxShadow: `0 10px 25px -5px ${activeColor}15, 0 8px 20px -6px rgba(0, 0, 0, 0.02)`,
                                    flexDirection: 'column',
                                    alignItems: 'stretch',
                                    gap: '12px',
                                    display: 'flex',
                                    cursor: 'default',
                                    transition: 'all 0.25s ease'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', width: '100%' }}>
                                    <span style={{
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        backgroundColor: activeColor,
                                        flexShrink: 0,
                                        marginTop: '12px'
                                    }} />
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <input
                                            type="text"
                                            value={newCategoryName}
                                            onChange={(e) => setNewCategoryName(e.target.value)}
                                            placeholder="카테고리명 입력"
                                            style={{
                                                width: '100%',
                                                padding: '8px 12px',
                                                fontSize: '12px',
                                                color: '#1e293b',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '8px',
                                                backgroundColor: '#f8fafc',
                                                boxSizing: 'border-box',
                                                outline: 'none',
                                                transition: 'all 0.2s ease-in-out'
                                            }}
                                            onFocus={(e) => {
                                                e.target.style.borderColor = '#2563eb';
                                                e.target.style.backgroundColor = '#ffffff';
                                                e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.15)';
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = '#cbd5e1';
                                                e.target.style.backgroundColor = '#f8fafc';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                        />
                                        <textarea
                                            value={newHypothesis}
                                            onChange={(e) => setNewHypothesis(e.target.value)}
                                            placeholder="가설 문구 입력"
                                            rows={2}
                                            style={{
                                                width: '100%',
                                                padding: '8px 12px',
                                                fontSize: '12px',
                                                color: '#475569',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '8px',
                                                backgroundColor: '#f8fafc',
                                                resize: 'none',
                                                boxSizing: 'border-box',
                                                outline: 'none',
                                                lineHeight: '1.5',
                                                transition: 'all 0.2s ease-in-out'
                                            }}
                                            onFocus={(e) => {
                                                e.target.style.borderColor = '#2563eb';
                                                e.target.style.backgroundColor = '#ffffff';
                                                e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.15)';
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = '#cbd5e1';
                                                e.target.style.backgroundColor = '#f8fafc';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Divider */}
                                <div style={{ height: '1px', backgroundColor: '#e2e8f0', margin: '4px 0' }} />

                                {/* 1. 연동될 문항 목록 */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#475569' }}>
                                        <span>연동될 문항 목록</span>
                                        <span style={{
                                            backgroundColor: '#eff6ff',
                                            color: '#2563eb',
                                            border: '1px solid #dbeafe',
                                            padding: '2px 8px',
                                            borderRadius: '20px',
                                            fontWeight: 700,
                                            fontSize: '11px',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {selectedQuestions.length}문항
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {selectedQuestions.length > 0 ? (
                                            selectedQuestions.map(q => {
                                                const isKpi = newKpiQuestionId === q.id;
                                                return (
                                                    <span key={q.id} style={{
                                                        backgroundColor: isKpi ? '#fffbeb' : '#ffffff',
                                                        color: isKpi ? '#d97706' : '#2563eb',
                                                        border: isKpi ? '1.5px solid #f59e0b' : '1px solid #dbeafe',
                                                        borderRadius: '6px',
                                                        padding: '2px 8px',
                                                        fontSize: '11px',
                                                        fontWeight: 600,
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        boxShadow: isKpi ? '0 1px 3px rgba(245, 158, 11, 0.2)' : 'none',
                                                        transition: 'all 0.15s ease'
                                                    }}>
                                                        {isKpi && <span style={{ color: '#f59e0b', fontSize: '11px' }}>⭐</span>}
                                                        {q.id}
                                                    </span>
                                                );
                                            })
                                        ) : (
                                            <span style={{ color: '#94a3b8', fontSize: '12px' }}>좌측 문항 목록에서 체크박스를 선택해주세요.</span>
                                        )}
                                    </div>
                                </div>

                                {/* 2. 기준 KPI 문항 지정 (선택된 문항이 있을 때만 표시) */}
                                {selectedQuestions.length > 0 && (
                                    <>
                                        {/* Divider */}
                                        <div style={{ height: '1px', backgroundColor: '#e2e8f0', margin: '4px 0' }} />

                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '8px',
                                            fontSize: '12px'
                                        }}>
                                            <div style={{ fontWeight: 700, color: '#475569' }}>
                                                <span>기준 KPI 문항 지정</span>
                                            </div>
                                            <DropDownList
                                                data={[
                                                    { text: "-- KPI 문항 선택 (선택 사항) --", value: "" },
                                                    ...selectedQuestions.map(q => ({
                                                        text: `${q.id} ${q.qnum ? `(${q.qnum})` : ''} - ${q.label.length > 30 ? q.label.substring(0, 30) + '...' : q.label}`,
                                                        value: q.id
                                                    }))
                                                ]}
                                                textField="text"
                                                valueField="value"
                                                valuePrimitive={true}
                                                value={newKpiQuestionId || ''}
                                                onChange={(e) => setNewKpiQuestionId(e.value || null)}
                                                className="ai-kendo-dropdown-compact"
                                                style={{
                                                    width: '100%',
                                                    fontSize: '12px'
                                                }}
                                            />
                                        </div>
                                    </>
                                )}

                                {/* 취소/저장 버튼 행 */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                                    <button
                                        onClick={handleCancelNewCategory}
                                        style={{
                                            height: '28px',
                                            padding: '0 12px',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            backgroundColor: '#ffffff',
                                            color: '#475569',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                        }}
                                        onMouseOver={(e) => { e.target.style.backgroundColor = '#f8fafc'; }}
                                        onMouseOut={(e) => { e.target.style.backgroundColor = '#ffffff'; }}
                                    >
                                        취소
                                    </button>
                                    <button
                                        onClick={handleSaveNewCategory}
                                        style={{
                                            height: '28px',
                                            padding: '0 12px',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            backgroundColor: '#2563eb',
                                            color: '#ffffff',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                        }}
                                        onMouseOver={(e) => { e.target.style.backgroundColor = '#1d4ed8'; }}
                                        onMouseOut={(e) => { e.target.style.backgroundColor = '#2563eb'; }}
                                    >
                                        저장
                                    </button>
                                </div>
                            </div>
                        );
                    })()}
                    {categories.map((cat) => {
                        const isSelected = selectedCategoryId === cat.id;
                        return (
                            <div
                                key={cat.id}
                                className={`ai-category-card ${isSelected ? 'active' : ''}`}
                                onClick={() => {
                                    const isCurrentlySelected = selectedCategoryId === cat.id;
                                    if (isCurrentlySelected) {
                                        setSelectedCategoryId(null);
                                    } else {
                                        setSelectedCategoryId(cat.id);
                                        const firstMatched = questions.find(q => cat.qnums?.some(qk => q.id === qk || q.qnum === qk));
                                        if (firstMatched) {
                                            setTimeout(() => {
                                                const element = document.getElementById(`q_row_${firstMatched.id}`);
                                                if (element) {
                                                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                }
                                            }, 80);
                                        }
                                    }
                                }}
                                style={{
                                    paddingLeft: '16px',
                                    cursor: 'pointer',
                                    borderColor: isSelected ? cat.color : '#cbd5e1',
                                    backgroundColor: isSelected ? `${cat.color}08` : '#ffffff',
                                    boxShadow: isSelected ? `0 4px 12px ${cat.color}12` : 'none'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1 }}>
                                    {/* Left: Clean Bullet Dot */}
                                    <span style={{
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        backgroundColor: cat.color,
                                        flexShrink: 0,
                                        marginTop: '6px'
                                    }} />
                                    {/* Right: Text box */}
                                    <div className="ai-cat-card-left" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <h4 className="ai-cat-card-title" style={{ display: 'block' }}>{cat.title}</h4>
                                        <p className="ai-cat-card-desc">{cat.desc}</p>
                                    </div>
                                </div>
                                <div className="ai-cat-card-right" style={{ marginLeft: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className="ai-cat-card-count" style={{
                                        backgroundColor: isSelected ? cat.color : '#eff6ff',
                                        color: isSelected ? '#ffffff' : '#4B7CF3',
                                        border: isSelected ? `1px solid ${cat.color}` : '1px solid #dbeafe'
                                    }}>{cat.count}문항</span>
                                    <button
                                        onClick={(e) => handleDeleteCategory(cat.id, e)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            padding: '4px',
                                            cursor: 'pointer',
                                            color: '#94a3b8',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: '4px',
                                            transition: 'all 0.15s ease'
                                        }}
                                        onMouseOver={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.backgroundColor = '#fef2f2'; }}
                                        onMouseOut={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                                        title="카테고리 삭제"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default AiReportContentStep;
