import React from 'react';
import { Plus, Save, Search } from 'lucide-react';

const DataHeader = ({ title, onAdd, addButtonLabel = "추가", onSave, saveButtonLabel = "저장", onEdit, editButtonLabel = "수정", onSearch }) => {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 24px',
            background: '#fff',
            borderBottom: '1px solid #e0e0e0',
            height: '64px',
            boxSizing: 'border-box'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: '#333' }}>{title}</h2>
                {onSearch && (
                    <div style={{ position: 'relative', width: '240px' }}>
                        <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
                        <input
                            type="text"
                            placeholder="Search variables..."
                            onChange={(e) => onSearch(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 10px 8px 34px',
                                borderRadius: '6px',
                                border: '1px solid #ddd',
                                fontSize: '14px',
                                outline: 'none',
                                background: '#f9f9f9'
                            }}
                        />
                    </div>
                )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
                {onAdd && (
                    <button
                        onClick={onAdd}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: '1px solid #e0e0e0',
                            background: '#fff',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#333',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                    >
                        <Plus size={16} />
                        <span>{addButtonLabel}</span>
                    </button>
                )}
                {onEdit && (
                    <button
                        onClick={onEdit}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: '1px solid #e0e0e0',
                            background: '#fff',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#333',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                    >
                        <span>{editButtonLabel}</span>
                    </button>
                )}
                {onSave && (
                    <button
                        onClick={onSave}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: 'none',
                            background: 'var(--primary-color)', // Theme primary color
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#fff',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'var(--primary-color)'}
                    >
                        <Save size={16} />
                        <span>{saveButtonLabel}</span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default DataHeader;
