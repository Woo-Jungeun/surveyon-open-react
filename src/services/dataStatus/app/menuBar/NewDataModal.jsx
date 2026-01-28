import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { X, ChevronLeft } from 'lucide-react';
import './NewDataModal.css';

const NewDataModal = ({ onClose, onConfirm }) => {
    const [step, setStep] = useState('select'); // select, qmaster, external
    const [projectName, setProjectName] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const fileInputRef = useRef(null);

    const handleQMasterClick = () => setStep('qmaster');
    const handleExternalClick = () => setStep('external');
    const handleBack = () => {
        setStep('select');
        setProjectName('');
        setSelectedFile(null);
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleConfirm = () => {
        if (step === 'qmaster') {
            onConfirm({ type: 'qmaster', projectName });
        } else if (step === 'external') {
            onConfirm({ type: 'external', file: selectedFile });
        }
    };

    return ReactDOM.createPortal(
        <div className="nd-modal-overlay">
            <div className="nd-modal-container">
                <div className="nd-modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {step !== 'select' && (
                            <button className="nd-back-btn" onClick={handleBack}>
                                <ChevronLeft size={22} />
                            </button>
                        )}
                        <h3 className={step === 'select' ? 'with-bar' : ''}>데이터 불러오기</h3>
                    </div>
                    <button className="nd-close-btn" onClick={onClose}><X size={20} /></button>
                </div>

                {step === 'select' && (
                    <div className="nd-modal-body">
                        <p>가져올 데이터 경로를 선택하세요.</p>
                        <button className="nd-select-btn" onClick={handleQMasterClick}>Q-Master 데이터</button>
                        <button className="nd-select-btn" onClick={handleExternalClick}>외부 데이터</button>
                    </div>
                )}

                {step === 'qmaster' && (
                    <div className="nd-modal-body">
                        <p>프로젝트 이름을 입력하세요.</p>
                        <input
                            type="text"
                            className="nd-input"
                            placeholder="프로젝트 이름"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                        />
                        <div className="nd-footer">
                            <button className="nd-btn nd-btn-cancel" onClick={onClose}>닫기</button>
                            <button className="nd-btn nd-btn-confirm" onClick={handleConfirm}>확인</button>
                        </div>
                    </div>
                )}

                {step === 'external' && (
                    <div className="nd-modal-body">
                        <p>csv, sav 또는 excel 파일을 업로드하세요.</p>
                        <div className="nd-file-input-box" onClick={() => fileInputRef.current.click()}>
                            <span className="nd-file-btn-label">파일 선택</span>
                            <span className="nd-file-name-text">{selectedFile ? selectedFile.name : '선택된 파일 없음'}</span>
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                accept=".csv,.sav,.xlsx,.xls"
                                onChange={handleFileChange}
                            />
                        </div>
                        <div className="nd-footer">
                            <button className="nd-btn nd-btn-cancel" onClick={onClose}>닫기</button>
                            {/* 이미지 3번째에는 닫기 버튼만 보이지만, 기능상 확인 버튼이 필요할 수 있음. 일단 닫기만 둠 (사용자 요청 이미지 준수) */}
                            {/* 하지만 파일 선택 후 아무 액션도 없으면 안되므로 확인 버튼 추가 */}
                            <button className="nd-btn nd-btn-confirm" onClick={handleConfirm}>확인</button>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default NewDataModal;
