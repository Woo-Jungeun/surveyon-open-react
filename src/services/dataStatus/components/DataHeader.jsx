import React from 'react';
import { Plus, Save, Search } from 'lucide-react';
import './DataHeader.css';

const DataHeader = ({ title, children, onAdd, addButtonLabel = "추가", onSave, saveButtonLabel = "저장", onEdit, editButtonLabel = "수정", onSearch }) => {
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
                {onSave && (
                    <button
                        onClick={onSave}
                        className="data-header-btn data-header-btn-primary"
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
