import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import './VariablePage.css';

const VariablePageModal = ({ variable, onClose, onSave }) => {
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        if (variable) {
            if (variable.category && typeof variable.category === 'string') {
                // 정규식으로 {code;label} 형태 파싱
                // 예: {1;Very Low}{2;Low}
                try {
                    const matches = [...variable.category.matchAll(/\{([^;]+);([^}]+)\}/g)];
                    if (matches.length > 0) {
                        setCategories(matches.map(m => ({ code: m[1], label: m[2] })));
                    } else {
                        setCategories([]);
                    }
                } catch (e) {
                    console.error("Category parsing error:", e);
                    setCategories([]);
                }
            } else {
                setCategories([]);
            }
        }
    }, [variable]);

    const handleCodeChange = (idx, newCode) => {
        const newCats = [...categories];
        newCats[idx].code = newCode;
        setCategories(newCats);
    };

    const handleLabelChange = (idx, newLabel) => {
        const newCats = [...categories];
        newCats[idx].label = newLabel;
        setCategories(newCats);
    };

    const handleAddCategory = () => {
        setCategories([...categories, { code: '', label: '' }]);
    };

    const handleDeleteCategory = (idx) => {
        const newCats = categories.filter((_, i) => i !== idx);
        setCategories(newCats);
    };

    const handleSave = () => {
        // 빈 값 필터링 (선택 사항)
        const validCats = categories.filter(c => c.code.trim() !== '' || c.label.trim() !== '');
        const newStr = validCats.map(c => `{${c.code};${c.label}}`).join('');
        onSave(variable.id, newStr);
        onClose();
    };

    if (!variable) return null;

    return (
        <div className="variable-modal-overlay">
            <div className="variable-modal-content">
                <div className="variable-modal-header">
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{
                            width: '4px',
                            height: '18px',
                            backgroundColor: '#3b82f6',
                            borderRadius: '4px',
                            marginRight: '8px'
                        }}></div>
                        <h3 className="variable-modal-title">보기 수정</h3>
                    </div>
                    <button onClick={onClose} className="variable-modal-close">&times;</button>
                </div>

                <div className="variable-modal-body">
                    <div className="variable-info">
                        문항: <strong>{variable.name}</strong> ({variable.label})
                    </div>

                    {categories.length === 0 ? (
                        <div className="empty-message">
                            등록된 보기가 없습니다.
                        </div>
                    ) : (
                        <div className="category-list">
                            {categories.map((cat, idx) => (
                                <div key={idx} className="category-item">
                                    <input
                                        type="text"
                                        value={cat.code}
                                        onChange={(e) => handleCodeChange(idx, e.target.value)}
                                        placeholder="코드"
                                        className="category-code-input"
                                    />
                                    <input
                                        type="text"
                                        value={cat.label}
                                        onChange={(e) => handleLabelChange(idx, e.target.value)}
                                        placeholder="보기 라벨"
                                        className="category-label-input"
                                    />
                                    <button
                                        onClick={() => handleDeleteCategory(idx)}
                                        className="category-delete-btn"
                                        title="삭제"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <button
                        onClick={handleAddCategory}
                        className="category-add-btn"
                    >
                        <Plus size={14} /> 보기 추가
                    </button>
                </div>

                <div className="variable-modal-footer">
                    <button onClick={onClose} className="btn-cancel">취소</button>
                    <button onClick={handleSave} className="btn-save">저장</button>
                </div>
            </div>
        </div>
    );
};

export default VariablePageModal;
