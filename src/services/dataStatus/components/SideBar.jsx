import { useState } from 'react';
import { Search, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import './SideBar.css';

const SideBar = ({ items, selectedId, onItemClick, title, onSearch, onDelete, displayField = 'name' }) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="sidebar-container" style={{ width: isOpen ? '280px' : '48px' }}>
            <div className="sidebar-header">
                <div className="sidebar-title-row" style={{ justifyContent: isOpen ? 'space-between' : 'center' }}>
                    {isOpen && (
                        <div className="sidebar-title">
                            {title || "목록"}
                        </div>
                    )}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="sidebar-toggle-btn"
                    >
                        {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                    </button>
                </div>
                {isOpen && (
                    <div className="sidebar-search">
                        <Search size={14} className="sidebar-search-icon" />
                        <input
                            type="text"
                            placeholder="검색어를 입력하세요."
                            onChange={(e) => onSearch && onSearch(e.target.value)}
                            className="sidebar-search-input"
                        />
                    </div>
                )}
            </div>
            {isOpen && (
                <div className="sidebar-list">
                    {items.map((item) => (
                        <div
                            key={item.id}
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
        </div>
    );
};

export default SideBar;
