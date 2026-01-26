import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';

const VariablePageModal = ({ variable, onClose, onSave }) => {
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        if (variable) {
            if (variable.category) {
                // 정규식으로 {code;label} 형태 파싱
                // 예: {1;Very Low}{2;Low}
                const matches = [...variable.category.matchAll(/\{([^;]+);([^}]+)\}/g)];
                if (matches.length > 0) {
                    setCategories(matches.map(m => ({ code: m[1], label: m[2] })));
                } else {
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
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
        }}>
            <div style={{
                background: '#fff',
                borderRadius: '8px',
                width: '500px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '80%'
            }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>보기 수정</h3>
                    <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '20px', color: '#999' }}>&times;</button>
                </div>

                <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                    <div style={{ marginBottom: '16px', fontSize: '13px', color: '#666' }}>
                        문항: <strong>{variable.name}</strong> ({variable.label})
                    </div>

                    {categories.length === 0 ? (
                        <div style={{ color: '#999', textAlign: 'center', padding: '40px 0', background: '#f9f9f9', borderRadius: '4px', marginBottom: '12px' }}>
                            등록된 보기가 없습니다.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                            {categories.map((cat, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                        type="text"
                                        value={cat.code}
                                        onChange={(e) => handleCodeChange(idx, e.target.value)}
                                        placeholder="코드"
                                        style={{
                                            width: '60px',
                                            padding: '8px',
                                            borderRadius: '4px',
                                            border: '1px solid #ddd',
                                            fontSize: '13px',
                                            textAlign: 'center'
                                        }}
                                    />
                                    <input
                                        type="text"
                                        value={cat.label}
                                        onChange={(e) => handleLabelChange(idx, e.target.value)}
                                        placeholder="보기 라벨"
                                        style={{
                                            flex: 1,
                                            padding: '8px 10px',
                                            borderRadius: '4px',
                                            border: '1px solid #ddd',
                                            fontSize: '13px'
                                        }}
                                    />
                                    <button
                                        onClick={() => handleDeleteCategory(idx)}
                                        style={{
                                            border: 'none',
                                            background: 'transparent',
                                            color: '#ccc',
                                            cursor: 'pointer',
                                            padding: '4px',
                                            display: 'flex',
                                            alignItems: 'center'
                                        }}
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
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            padding: '10px',
                            borderRadius: '6px',
                            border: '1px dashed #ddd',
                            background: '#f9f9f9',
                            color: '#666',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f0f0f0';
                            e.currentTarget.style.borderColor = '#ccc';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#f9f9f9';
                            e.currentTarget.style.borderColor = '#ddd';
                        }}
                    >
                        <Plus size={14} /> 보기 추가
                    </button>
                </div>

                <div style={{ padding: '16px 20px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button onClick={onClose} style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: '1px solid #ddd',
                        background: '#fff',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#555'
                    }}>취소</button>
                    <button onClick={handleSave} style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        background: 'var(--primary-color)',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#fff'
                    }}>저장</button>
                </div>
            </div>
        </div>
    );
};

export default VariablePageModal;
