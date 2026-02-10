import React from 'react';
import { Plus, Save, Search, Trash2 } from 'lucide-react';
import './AiDataHeader.css';

const AiDataHeader = ({ title, tooltip, children, onAdd, addButtonLabel = "추가", onSave, saveButtonLabel = "저장", saveButtonDisabled = false, onEdit, editButtonLabel = "수정", onDelete, deleteButtonLabel = "삭제", onSearch }) => {
    return (
        <div className="ai-data-header-container">
            <div className="ai-data-header-left">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 className="ai-data-header-title">{title}</h2>
                    {tooltip && (
                        <span className="info-icon" data-tooltip={tooltip} style={{ marginTop: '2px' }}></span>
                    )}
                </div>
                {onSearch && (
                    <div className="ai-data-header-search">
                        <Search size={16} className="ai-data-header-search-icon" />
                        <input
                            type="text"
                            placeholder="Search variables..."
                            onChange={(e) => onSearch(e.target.value)}
                            className="ai-data-header-search-input"
                        />
                    </div>
                )}
            </div>
            <div className="ai-data-header-actions">
                {children}
                {onAdd && (
                    <button
                        onClick={onAdd}
                        className="ai-data-header-btn"
                    >
                        <Plus size={16} />
                        <span>{addButtonLabel}</span>
                    </button>
                )}
                {onEdit && (
                    <button
                        onClick={onEdit}
                        className="ai-data-header-btn"
                    >
                        <span>{editButtonLabel}</span>
                    </button>
                )}
                {onDelete && (
                    <button
                        onClick={onDelete}
                        className="ai-data-header-btn"
                    >
                        <Trash2 size={16} />
                        <span>{deleteButtonLabel}</span>
                    </button>
                )}
                {onSave && (
                    <button
                        onClick={saveButtonDisabled ? undefined : onSave}
                        disabled={saveButtonDisabled}
                        className={`ai-data-header-btn ${saveButtonDisabled ? '' : 'ai-data-header-btn-primary'}`}
                        style={saveButtonDisabled ? { backgroundColor: '#e2e8f0', color: '#94a3b8', cursor: 'not-allowed' } : {}}
                    >
                        <Save size={16} />
                        <span>{saveButtonLabel}</span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default AiDataHeader;
