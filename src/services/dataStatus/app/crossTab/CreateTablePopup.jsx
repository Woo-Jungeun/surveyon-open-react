import React, { useState } from 'react';
import { X } from 'lucide-react';
import './CrossTabPage.css';

const CreateTablePopup = ({ isOpen, onClose, onCreate }) => {
    const [tableName, setTableName] = useState('');

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (tableName.trim()) {
            onCreate(tableName);
            setTableName('');
            onClose();
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h3 className="modal-title">새 테이블 만들기</h3>
                    <button className="modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <div className="modal-body">
                    <label className="modal-label">테이블 ID</label>
                    <input
                        type="text"
                        className="modal-input"
                        placeholder="표 이름"
                        value={tableName}
                        onChange={(e) => setTableName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                        autoFocus
                    />
                </div>
                <div className="modal-footer">
                    <button
                        className="btn-primary"
                        onClick={handleSubmit}
                    >
                        생성
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateTablePopup;
