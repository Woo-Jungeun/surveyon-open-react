import React, { useState, useEffect } from 'react';

const VariablePageModal = ({ variable, onClose, onSave }) => {
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        if (variable && variable.category) {
            const matches = [...variable.category.matchAll(/\{(\d+);([^}]+)\}/g)];
            if (matches.length > 0) {
                setCategories(matches.map(m => ({ code: m[1], label: m[2] })));
            } else {
                setCategories([]);
            }
        }
    }, [variable]);

    const handleLabelChange = (idx, newLabel) => {
        const newCats = [...categories];
        newCats[idx].label = newLabel;
        setCategories(newCats);
    };

    const handleSave = () => {
        const newStr = categories.map(c => `{${c.code};${c.label}}`).join('');
        onSave(variable.id, newStr);
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
                width: '400px',
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
                    <div style={{ marginBottom: '12px', fontSize: '13px', color: '#666' }}>
                        문항: <strong>{variable.name}</strong> ({variable.label})
                    </div>
                    {categories.length === 0 ? (
                        <div style={{ color: '#999', textAlign: 'center', padding: '20px' }}>수정할 보기가 없습니다.</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {categories.map((cat, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '40px', textAlign: 'center', background: '#f5f5f5', padding: '8px 0', borderRadius: '4px', fontSize: '13px', fontWeight: '600', color: '#555' }}>
                                        {cat.code}
                                    </div>
                                    <input
                                        type="text"
                                        value={cat.label}
                                        onChange={(e) => handleLabelChange(idx, e.target.value)}
                                        style={{
                                            flex: 1,
                                            padding: '8px 10px',
                                            borderRadius: '4px',
                                            border: '1px solid #ddd',
                                            fontSize: '13px'
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
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
