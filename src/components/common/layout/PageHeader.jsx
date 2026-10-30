import React, { useState, useRef, useEffect } from 'react';
import { Search, Save, Plus, Trash2, Info } from 'lucide-react';
import './PageLayout.css';

/**
 * 설문온 공통 페이지 헤더 컴포넌트 (2번 영역)
 *
 * @param {string|React.ReactNode} title - 페이지 제목 (문자열 또는 JSX 노드)
 * @param {string|React.ReactNode} [infoTooltip] - 제목 옆 정보 안내 툴팁 텍스트/노드 (있을 경우 Info 아이콘과 팝오버 자동 생성)
 * @param {React.ReactNode} [actions] - 우측 액션 버튼들
 * @param {React.ReactNode} [children] - actions 대체 또는 추가 액션 노드
 * @param {Function} [onSearch] - 검색 입력 시 콜백 (e.target.value)
 * @param {string} [searchPlaceholder="검색..."] - 검색창 placeholder
 * @param {Function} [onSave] - 저장 버튼 클릭 핸들러 (지정 시 자동 렌더링)
 * @param {string} [saveLabel="저장"] - 저장 버튼 텍스트
 * @param {boolean} [saveDisabled=false] - 저장 버튼 비활성화 여부
 * @param {Function} [onAdd] - 추가 버튼 클릭 핸들러 (지정 시 자동 렌더링)
 * @param {string} [addLabel="추가"] - 추가 버튼 텍스트
 * @param {Function} [onDelete] - 삭제 버튼 클릭 핸들러 (지정 시 자동 렌더링)
 * @param {string} [deleteLabel="삭제"] - 삭제 버튼 텍스트
 * @param {string} [className=""] - 추가 커스텀 클래스
 * @param {React.CSSProperties} [style] - 인라인 스타일
 */
const PageHeader = ({
    id = "page-header",
    title,
    infoTooltip,
    actions,
    children,
    onSearch,
    searchPlaceholder = "검색...",
    onSave,
    saveLabel = "저장",
    saveDisabled = false,
    onAdd,
    addLabel = "추가",
    onDelete,
    deleteLabel = "삭제",
    className = "",
    style = {},
    ...rest
}) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const tooltipRef = useRef(null);

    // 툴팁 외부 클릭 시 닫기
    useEffect(() => {
        if (!showTooltip) return;
        const handleClickOutside = (e) => {
            if (tooltipRef.current && !tooltipRef.current.contains(e.target)) {
                setShowTooltip(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showTooltip]);

    return (
        <header id={id} className={`page-header ${className}`} style={style} {...rest}>
            {/* 좌측 영역: 타이틀 + 툴팁 + 검색 */}
            <div id="page-header-left" className="page-header-left">
                <h2 className="page-header-title">
                    {title}
                    {infoTooltip && (
                        <div
                            ref={tooltipRef}
                            style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
                        >
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowTooltip(!showTooltip);
                                }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: '2px',
                                    cursor: 'pointer',
                                    color: '#64748b',
                                    display: 'flex',
                                    outline: 'none',
                                    borderRadius: '4px'
                                }}
                                title="도움말 보기"
                            >
                                <Info size={16} />
                            </button>
                            {showTooltip && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: '-8px',
                                        marginTop: '8px',
                                        backgroundColor: '#ffffff',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '8px',
                                        padding: '12px 14px',
                                        width: 'max-content',
                                        maxWidth: '360px',
                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                        zIndex: 1000,
                                        fontSize: '13px',
                                        color: '#334155',
                                        lineHeight: '1.5',
                                        fontWeight: 400,
                                        whiteSpace: 'normal',
                                        wordBreak: 'keep-all',
                                        letterSpacing: '-0.3px',
                                        cursor: 'default'
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {/* 말풍선 꼬리 */}
                                    <div
                                        style={{
                                            position: 'absolute',
                                            top: '-6px',
                                            left: '12px',
                                            width: '10px',
                                            height: '10px',
                                            backgroundColor: '#ffffff',
                                            borderTop: '1px solid #cbd5e1',
                                            borderLeft: '1px solid #cbd5e1',
                                            transform: 'rotate(45deg)'
                                        }}
                                    />
                                    <div style={{ position: 'relative', zIndex: 2 }}>
                                        {infoTooltip}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </h2>

                {/* 검색창 */}
                {onSearch && (
                    <div className="page-header-search">
                        <Search size={15} className="page-header-search-icon" />
                        <input
                            id="page-search-input"
                            type="text"
                            placeholder={searchPlaceholder}
                            onChange={(e) => onSearch(e.target.value)}
                            className="page-header-search-input"
                        />
                    </div>
                )}
            </div>

            {/* 우측 영역: 액션 버튼 그룹 */}
            <div id="page-header-actions" className="page-header-actions">
                {actions}
                {children}

                {onAdd && (
                    <button
                        id="page-header-add-btn"
                        type="button"
                        onClick={onAdd}
                        className="cmn-btn cmn-btn-outline"
                    >
                        <Plus size={15} />
                        <span>{addLabel}</span>
                    </button>
                )}

                {onDelete && (
                    <button
                        id="page-header-delete-btn"
                        type="button"
                        onClick={onDelete}
                        className="cmn-btn cmn-btn-danger"
                    >
                        <Trash2 size={15} />
                        <span>{deleteLabel}</span>
                    </button>
                )}

                {onSave && (
                    <button
                        id="page-header-save-btn"
                        type="button"
                        onClick={saveDisabled ? undefined : onSave}
                        disabled={saveDisabled}
                        className="cmn-btn cmn-btn-primary"
                        style={
                            saveDisabled
                                ? { backgroundColor: '#e2e8f0', color: '#94a3b8', cursor: 'not-allowed', border: 'none', boxShadow: 'none' }
                                : { backgroundColor: 'var(--ds-primary, var(--srt-primary-500, #3b82f6))', color: '#ffffff', border: 'none' }
                        }
                    >
                        <Save size={15} style={saveDisabled ? { stroke: '#94a3b8', color: '#94a3b8' } : { stroke: '#ffffff', color: '#ffffff' }} />
                        <span style={saveDisabled ? { color: '#94a3b8' } : { color: '#ffffff' }}>{saveLabel}</span>
                    </button>
                )}
            </div>
        </header>
    );
};

export default PageHeader;
