import React from 'react';
import { Plus, Save, Search, Trash2 } from 'lucide-react';
import './DataHeader.css';

const DataHeader = ({ title, children, onAdd, addButtonLabel = "추가", onSave, saveButtonLabel = "저장", saveButtonDisabled = false, onEdit, editButtonLabel = "수정", onDelete, deleteButtonLabel = "삭제", onSearch }) => {
    return (
        <div className="data-header-container">
            <div className="data-header-left">
                <h2 className="data-header-title">{title}</h2>
                {onSearch && (
                    <div className="data-header-search">
                        <Search size={16} className="data-header-search-icon" />
                        <input
                            type="text"
                            placeholder="Search variables..."
                            onChange={(e) => onSearch(e.target.value)}
                            className="data-header-search-input"
                        />
                    </div>
                )}
            </div>
            <div className="data-header-actions">
                {children}
                {onAdd && (
                    <button
                        onClick={onAdd}
                        className="data-header-btn"
                    >
                        <Plus size={16} />
                        <span>{addButtonLabel}</span>
                    </button>
                )}
                {onEdit && (
                    <button
                        onClick={onEdit}
                        className="data-header-btn"
                    >
                        <span>{editButtonLabel}</span>
                    </button>
                )}
                {onDelete && (
                    <button
                        onClick={onDelete}
                        className="data-header-btn"
                    // style={{ color: '#ef4444' }}
                    >
                        <Trash2 size={16} />
                        <span>{deleteButtonLabel}</span>
                    </button>
                )}
                {onSave && (
                    <button
                        onClick={saveButtonDisabled ? undefined : onSave}
                        disabled={saveButtonDisabled}
                        className={`data-header-btn ${saveButtonDisabled ? '' : 'data-header-btn-primary'}`}
                        style={saveButtonDisabled ? { backgroundColor: '#e2e8f0', color: '#94a3b8', cursor: 'default' } : {}}
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
