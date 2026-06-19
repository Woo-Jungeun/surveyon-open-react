import { useState } from 'react';
import { Search, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import './SideBar.css';

const SideBar = ({ items, selectedId, onItemClick, title, totalCount, headerAction, onSearch, onDelete, displayField = 'name', searchPlaceholder = '검색어를 입력하세요.', onScrollEnd, currentPage, totalPages, onPageChange, listRef, className = '' }) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className={`sidebar-container ${className}`} style={{ width: isOpen ? '280px' : '48px' }}>
            <div className="sidebar-header" style={{ padding: 0, gap: 0, borderBottom: 'none', background: '#ffffff' }}>
                <div className="sidebar-title-row" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', height: '48px', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: isOpen ? 'space-between' : 'center' }}>
                    {isOpen && title ? (
                        <>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>{title} ({totalCount !== undefined ? totalCount : items.length})</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {headerAction}
                                <button
                                    onClick={() => setIsOpen(!isOpen)}
                                    className="dp-sidebar-toggle-btn-compact"
                                    style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}
                                >
                                    <ChevronLeft size={16} />
                                </button>
                            </div>
                        </>
                    ) : (
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="dp-sidebar-toggle-btn-compact"
                            style={{ flexShrink: 0, margin: '0 auto', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}
                        >
                            <ChevronRight size={16} />
                        </button>
                    )}
                </div>
                {isOpen && (
                    <div className="sidebar-search" style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
                        <div style={{ position: 'relative', width: '100%' }}>
                            <Search size={14} className="sidebar-search-icon" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type="text"
                                placeholder={searchPlaceholder}
                                onChange={(e) => onSearch && onSearch(e.target.value)}
                                className="sidebar-search-input"
                            />
                        </div>
                    </div>
                )}
            </div>
            {isOpen && (
                <div
                    className="sidebar-list"
                    ref={listRef}
                    onScroll={(e) => {
                        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
                        if (scrollHeight - scrollTop - clientHeight < 80 && onScrollEnd) {
                            onScrollEnd();
                        }
                    }}
                >
                    {items.length === 0 ? (
                        <div className="sidebar-no-data">
                            데이터가 없습니다.
                        </div>
                    ) : (
                        items.map((item) => (
                            <div
                                key={item.id}
                                id={`sidebar-item-${item.id}`}
                                onClick={() => onItemClick(item)}
                                className={`sidebar-item ${selectedId === item.id ? 'selected' : ''}`}
                                title={`${item.label || item[displayField] || ''}${item.label && item[displayField] ? ` (${item[displayField]})` : ''}`}
                            >
                                <div className="sidebar-item-content" style={{ flex: 1, minWidth: 0 }}>
                                    <div className="sidebar-item-header" style={{ marginBottom: '0' }}>
                                        <div className="sidebar-item-name" style={{ wordBreak: 'break-all', lineHeight: 1.3, marginBottom: 0 }}>
                                            {item.label || item[displayField]}
                                            {!item.label && item.isDirty && <span style={{ color: '#DC2626', fontSize: '11px', marginLeft: '6px', fontWeight: 'normal' }}>(수정됨)</span>}
                                        </div>
                                    </div>
                                    {item.label && (
                                        <div className="sidebar-item-label" style={{ marginTop: '4px', wordBreak: 'break-all' }}>
                                            {item[displayField]}
                                            {item.isDirty && <span style={{ color: '#DC2626', fontSize: '11px', marginLeft: '4px' }}>(수정됨)</span>}
                                        </div>
                                    )}
                                </div>
                                {item.type && (() => {
                                    const t = String(item.type).toLowerCase();
                                    let badgeClass = item.color || 'gray';
                                    if (t === 'single') badgeClass = 'single';
                                    else if (t === 'multi') badgeClass = 'multi';
                                    else if (t === 'rank') badgeClass = 'rank';
                                    else if (t === 'minrank') badgeClass = 'minrank';
                                    else if (t === 'maxrank') badgeClass = 'maxrank';
                                    else if (t === 'scale') badgeClass = 'scale';
                                    else if (t === 'open(문자)') badgeClass = 'open-text';
                                    else if (t === 'open(숫자)') badgeClass = 'open-num';
                                    else if (t === 'dummy') badgeClass = 'dummy';
                                    else if (t === 'custom') badgeClass = 'custom';
                                    return (
                                        <span className={`question-type-badge ${badgeClass}`} style={{ flexShrink: 0, marginLeft: '8px' }}>
                                            {String(item.type).toLowerCase()}
                                        </span>
                                    );
                                })()}

                                {onDelete && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(item.id);
                                        }}
                                        className="sidebar-delete-btn"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
            {isOpen && currentPage !== undefined && totalPages !== undefined && (
                <div className="sidebar-pagination">
                    <button
                        className="sidebar-page-btn"
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <div className="sidebar-page-info">
                        <span>{currentPage}</span> / <span>{totalPages}</span>
                    </div>
                    <button
                        className="sidebar-page-btn"
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default SideBar;
