import React from 'react';
import { Search } from 'lucide-react';

const SideBar = ({ items, selectedId, onItemClick, title, onSearch }) => {
    return (
        <div style={{
            width: '260px',
            height: '100%',
            background: '#fff',
            borderRight: '1px solid #e0e0e0',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0
        }}>
            <div style={{
                padding: '16px',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
            }}>
                <div style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#666'
                }}>
                    {title || "목록"}
                </div>
                <div style={{ position: 'relative', width: '100%' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
                    <input
                        type="text"
                        placeholder="검색어를 입력하세요."
                        onChange={(e) => onSearch && onSearch(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '8px 10px 8px 30px',
                            borderRadius: '6px',
                            border: '1px solid #ddd',
                            fontSize: '13px',
                            outline: 'none',
                            background: '#f9f9f9',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                {items.map((item) => (
                    <div
                        key={item.id}
                        onClick={() => onItemClick(item)}
                        style={{
                            padding: '12px',
                            marginBottom: '8px',
                            borderRadius: '8px',
                            border: selectedId === item.id ? '1px solid var(--primary-color)' : '1px solid #eee',
                            background: selectedId === item.id ? 'var(--primary-bg-light)' : '#fff',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        <div style={{ fontSize: '14px', fontWeight: '700', color: selectedId === item.id ? 'var(--primary-color)' : '#333', marginBottom: '4px' }}>
                            {item.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.label}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SideBar;
