import { useState } from 'react';
import { Search, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import './SideBar.css';

const SideBar = ({ items, selectedId, onItemClick, title, onSearch, onDelete, displayField = 'name', searchPlaceholder = '검색어를 입력하세요.', onScrollEnd, currentPage, totalPages, onPageChange }) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="sidebar-container" style={{ width: isOpen ? '280px' : '48px' }}>
            <div className="sidebar-header">
                <div className="sidebar-title-row" style={{ justifyContent: isOpen ? 'space-between' : 'center', gap: '8px' }}>
                    {isOpen && (
                        <div className="sidebar-search" style={{ flex: 1 }}>
                            <Search size={14} className="sidebar-search-icon" />
                            <input
                                type="text"
                                placeholder={searchPlaceholder}
                                onChange={(e) => onSearch && onSearch(e.target.value)}
                                className="sidebar-search-input"
                            />
                        </div>
                    )}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="sidebar-toggle-btn"
                        style={{ flexShrink: 0 }}
                    >
                        {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                    </button>
                </div>
            </div>
            {isOpen && (
                <div
                    className="sidebar-list"
                    onScroll={(e) => {
                        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
                        if (scrollHeight - scrollTop - clientHeight < 80 && onScrollEnd) {
                            onScrollEnd();
                        }
                    }}
                >
                    {items.map((item) => (
                        <div
                            key={item.id}
                            id={`sidebar-item-${item.id}`}
                            onClick={() => onItemClick(item)}
                            className={`sidebar-item ${selectedId === item.id ? 'selected' : ''}`}
                        >
                            <div className="sidebar-item-content">
                                <div className="sidebar-item-name">
                                    {item[displayField]}
                                </div>
                                <div className="sidebar-item-label">
                                    {item.label}
                                </div>
                            </div>
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
                    ))}
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
