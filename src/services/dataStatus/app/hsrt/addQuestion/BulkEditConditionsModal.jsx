import { useEffect, useRef, useContext } from 'react';
import { X } from 'lucide-react';
import { modalContext } from "@/components/common/Modal.jsx";

const BulkEditConditionsModal = ({ show, currentInfo, onClose, onApply }) => {
    const textareaRef = useRef(null);
    const modal = useContext(modalContext);

    useEffect(() => {
        if (show && currentInfo && textareaRef.current) {
            const initialText = currentInfo.map(item => {
                const label = String(item.label ?? '').trim();
                const logic = String(item.logic ?? '').trim();
                return `${label}\t${logic}`;
            }).join('\n');
            textareaRef.current.value = initialText;
        }
    }, [show, currentInfo]);

    if (!show) return null;

    const handleApply = () => {
        if (textareaRef.current) {
            const lines = textareaRef.current.value.split('\n');
            const parsedLines = lines.map(line => {
                if (line.includes('\t')) {
                    const parts = line.split('\t');
                    return {
                        label: parts[0].trim(),
                        logic: parts.slice(1).join('\t').trim()
                    };
                } else {
                    return {
                        label: line.trim(),
                        logic: ''
                    };
                }
            });

            // 중복 보기라벨 체크
            const seenLabels = new Set();
            const duplicates = [];
            parsedLines.forEach(item => {
                if (item.label) {
                    if (seenLabels.has(item.label)) {
                        if (!duplicates.includes(item.label)) {
                            duplicates.push(item.label);
                        }
                    }
                    seenLabels.add(item.label);
                }
            });

            if (duplicates.length > 0) {
                modal.showAlert('알림', (
                    <div style={{ lineHeight: '1.6', fontSize: '13px' }}>
                        <div>입력된 보기라벨 중 중복된 항목이 존재합니다:</div>
                        <div style={{ margin: '8px 0', padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', maxHeight: '120px', overflowY: 'auto', fontFamily: 'monospace' }}>
                            {duplicates.map((dup, i) => <div key={i}>• {dup}</div>)}
                        </div>
                        <div>중복된 라벨명을 수정하거나 제거한 후 다시 적용해 주세요.</div>
                    </div>
                ), { zIndex: 200000 });
                return;
            }

            onApply(parsedLines);
        }
        onClose();
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000
        }}>
            <div style={{
                width: '700px',
                background: '#ffffff',
                borderRadius: '12px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                border: '1px solid #e2e8f0'
            }} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    position: 'relative'
                }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '3px', height: '16px', background: '#2563eb', borderRadius: '2px' }} />
                            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>일괄 문구 수정</h3>
                        </div>
                        <p style={{ fontSize: '12px', color: '#475569', margin: '8px 0 0 0', lineHeight: 1.5 }}>
                            줄바꿈 단위로 편집하거나, 엑셀 데이터를 복사해서 붙여넣으면 일괄 반영됩니다.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            padding: '4px',
                            color: '#94a3b8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '4px',
                            transition: 'background 0.15s'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '20px 24px', background: '#ffffff' }}>
                    <div style={{
                        border: '1px solid #3b82f6',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        {/* Table Header inside textarea border */}
                        <div style={{
                            display: 'flex',
                            background: '#f8fafc',
                            borderBottom: '1px solid #e2e8f0',
                            padding: '8px 16px',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#475569',
                            userSelect: 'none'
                        }}>
                            <div style={{ width: '150px' }}>보기라벨</div>
                            <div>조건</div>
                        </div>
                        {/* Text Area */}
                        <textarea
                            ref={textareaRef}
                            placeholder="예시:&#10;라벨1	조건식1&#10;라벨2	조건식2"
                            style={{
                                width: '100%',
                                height: '280px',
                                padding: '12px 16px',
                                border: 'none',
                                outline: 'none',
                                resize: 'none',
                                fontSize: '13px',
                                fontFamily: 'Consolas, Monaco, monospace',
                                tabSize: 8,
                                MozTabSize: 8,
                                lineHeight: '1.6',
                                color: '#334155',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px 24px',
                    borderTop: '1px solid #f1f5f9',
                    background: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '8px'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            height: '32px',
                            padding: '0 16px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            color: '#475569',
                            background: '#ffffff',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = '#ffffff'; }}
                    >
                        취소
                    </button>
                    <button
                        onClick={handleApply}
                        style={{
                            height: '32px',
                            padding: '0 16px',
                            border: 'none',
                            borderRadius: '6px',
                            color: '#ffffff',
                            background: '#2563eb',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#1d4ed8'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = '#2563eb'; }}
                    >
                        일괄 적용
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkEditConditionsModal;
