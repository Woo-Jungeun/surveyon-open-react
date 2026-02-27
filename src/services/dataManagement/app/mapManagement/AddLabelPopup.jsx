import React, { useState, useEffect, useContext } from 'react';
import { modalContext } from "@/components/common/Modal.jsx";

const AddLabelPopup = ({ isOpen, onClose, onSave, initialLabels }) => {
    const [addValueText, setAddValueText] = useState("");
    const modal = useContext(modalContext);

    useEffect(() => {
        if (isOpen) {
            if (initialLabels && initialLabels.length > 0) {
                const initText = initialLabels.map(l => `${l.code}. ${l.label}`).join('\n');
                setAddValueText(initText);
            } else {
                setAddValueText("");
            }
        }
    }, [isOpen, initialLabels]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!addValueText.trim()) {
            onSave([]); // 비어 있으면 빈 배열 전달
            setAddValueText("");
            return;
        }

        const lines = addValueText.split('\n').filter(line => line.trim() !== '');

        let lastCodeNum = 0;
        const newLabels = [];
        const codeSet = new Set();
        let duplicateCode = null;

        for (const line of lines) {
            const trimmed = line.trim();
            const match = trimmed.match(/^(\d+)[\.\s-]+(.*)$/);

            let code;
            let labelText;

            if (match && match[2].trim()) {
                code = String(match[1]);
                labelText = match[2].trim();
                lastCodeNum = Math.max(lastCodeNum, parseInt(match[1], 10) || 0);
            } else {
                lastCodeNum += 1;
                code = String(lastCodeNum);
                labelText = trimmed;
            }

            if (codeSet.has(code)) {
                duplicateCode = code;
                break;
            }
            codeSet.add(code);
            newLabels.push({ code, label: labelText });
        }

        if (duplicateCode) {
            modal.showErrorAlert("에러", `중복된 번호(코드)가 존재합니다: ${duplicateCode}`);
            return;
        }

        onSave(newLabels);
        setAddValueText("");
    };

    const handleClose = () => {
        setAddValueText("");
        onClose();
    };

    return (
        <div className="variable-modal-overlay">
            <div className="variable-modal-content" style={{ width: '480px' }}>
                <div className="variable-modal-header">
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ width: '4px', height: '18px', backgroundColor: 'var(--dm-primary)', borderRadius: '4px', marginRight: '8px' }}></div>
                        <h3 className="variable-modal-title">보기 레이블 편집</h3>
                    </div>
                    <button onClick={handleClose} className="variable-modal-close">&times;</button>
                </div>
                <div className="variable-modal-body">
                    <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '10px' }}>
                        한 줄에 하나의 보기를 입력하세요. (예: 1. 첫번째 보기)<br />
                        번호 없이 입력하면 자동으로 코드가 부여되며, 기존 내용은 덮어씌워집니다.
                    </p>
                    <textarea
                        value={addValueText}
                        onChange={(e) => setAddValueText(e.target.value)}
                        placeholder="1. 전혀 그렇지 않다&#13;&#10;2. 그렇지 않은 편이다&#13;&#10;3. 보통이다"
                        style={{
                            width: '100%',
                            height: '240px',
                            padding: '12px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            resize: 'none',
                            outline: 'none',
                            fontSize: '14px',
                            fontFamily: 'inherit',
                            lineHeight: '1.5',
                            boxSizing: 'border-box'
                        }}
                        autoFocus
                    />
                </div>
                <div className="variable-modal-footer">
                    <button onClick={handleClose} className="btn-cancel">취소</button>
                    <button onClick={handleSave} className="btn-save">등록하기</button>
                </div>
            </div>
        </div>
    );
};

export default AddLabelPopup;
