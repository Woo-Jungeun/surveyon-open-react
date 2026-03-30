import React, { useState, useContext } from 'react';
import { X, Info } from 'lucide-react';
import { modalContext } from "@/components/common/Modal.jsx";
import { useSelector } from 'react-redux';
import { MapManagementPageApi } from './MapManagementPageApi';
import { DropDownList } from "@progress/kendo-react-dropdowns";
import './MapManagementPage.css';

const RelabelModal = ({ isOpen, onClose, refreshData }) => {
    const modal = useContext(modalContext);
    const { generateRelabels } = MapManagementPageApi();
    const auth = useSelector((store) => store.auth);

    const [overwrite, setOverwrite] = useState(false);
    const [language, setLanguage] = useState({ label: '한글', value: 'ko' });

    const langOptions = [
        { label: '한글', value: 'ko' },
        { label: '영문', value: 'en' }
    ];

    if (!isOpen) return null;

    const handleSubmit = async () => {
        const pn = sessionStorage.getItem('merge_pn') || sessionStorage.getItem('projectnum');
        const userId = auth?.user?.userId || '';

        if (!pn) {
            modal.showErrorAlert("알림", "프로젝트 정보를 찾을 수 없습니다.");
            return;
        }

        const payload = {
            pn,
            overwrite,
            language: language.value,
            user: userId
        };

        try {
            const res = await generateRelabels.mutateAsync(payload);

            if (res?.success === '777' || res?.success === 777) {
                if (res?.resultjson && res.resultjson.processedCount !== undefined) {
                    await modal.showAlert("완료", `${res?.message || 'AI 요약본이 매핑되었습니다.'}\n(처리된 문항 건수: ${res.resultjson.processedCount}건)`);
                } else {
                    await modal.showAlert("완료", res?.message || "완료되었습니다.");
                }
                
                handleModalClose();
                if (refreshData) refreshData();
            } else {
                // 400, 404 등의 에러 코드는 "무시해도 됩니다" 규칙에 따라 별도 에러팝업 띄우지 않고 로깅만 수행가능 (혹은 기본 메시지)
                console.warn("Re-Label Not 777:", res);
                if (res?.message) {
                    await modal.showAlert("알림", res.message);
                }
                handleModalClose();
            }
        } catch (error) {
            console.error("Re-Label generation error:", error);
            // 에러 무시 가이드를 따라 팝업창은 닫고, 조용하게 넘김
            handleModalClose();
        }
    };

    const handleModalClose = () => {
        setOverwrite(false);
        setLanguage({ label: '한글', value: 'ko' });
        onClose();
    };

    return (
        <div className="variable-modal-overlay">
            <div className="variable-modal-content download-modal-content upload-modal-content relabel-modal-content" style={{ width: '445px' }}>
                <div className="variable-modal-header">
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{
                            width: '4px',
                            height: '18px',
                            backgroundColor: '#16a34a',
                            borderRadius: '4px',
                            marginRight: '8px'
                        }}></div>
                        <h3 className="variable-modal-title">Re_Label(가칭)</h3>
                    </div>
                    <button onClick={handleModalClose} className="variable-modal-close"><X size={20} /></button>
                </div>

                <div className="variable-modal-body" style={{ padding: '24px' }}>

                    {/* Re_Label(가칭) 주의사항 (상단) */}
                    <div className="update-info-box">
                        <div className="update-info-title">
                            <Info size={16} />
                            <span>Re_Label(가칭) 주의사항</span>
                        </div>
                        <ul className="update-info-list" style={{ listStyle: 'none', paddingLeft: 0, marginTop: '4px' }}>
                            <li style={{ marginBottom: '6px' }}><span style={{ color: '#16a34a', marginRight: '6px' }}>✔</span> 덮어쓰기 기능은 기존에 있던 데이터 전체를 덮어씌웁니다.</li>
                            <li style={{ marginBottom: '6px' }}><span style={{ color: '#16a34a', marginRight: '6px' }}>✔</span> 한번 덮어 씌워진 데이터는 복구되지않으니 주의부탁드립니다.</li>
                            <li style={{ marginBottom: '6px' }}><span style={{ color: '#16a34a', marginRight: '6px' }}>✔</span> 덮어쓰기가 토글되지않은경우 비어있는 케이스만 생성됩니다.</li>
                            <li style={{ marginTop: '6px' }}><span style={{ color: '#16a34a', marginRight: '6px' }}>✔</span> 영문으로 생성할경우 문번호를 임의로 변경하나 원치않으시면 수기로 수정하는걸 권장드립니다.</li>
                        </ul>
                    </div>

                    {/* 드래그 앤 드롭 및 파일업로드 영역을 토글/드롭다운 옵션으로 교체 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '24px' }}>
                        
                        {/* 덮어쓰기 토글 */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>덮어쓰기</span>
                            <label className="switch" style={{ margin: 0 }}>
                                <input 
                                    type="checkbox" 
                                    checked={overwrite} 
                                    onChange={(e) => setOverwrite(e.target.checked)} 
                                />
                                <span className="slider round"></span>
                            </label>
                        </div>

                        {/* 언어 선택 */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>언어 선택</span>
                            <DropDownList
                                data={langOptions}
                                textField="label"
                                dataItemKey="value"
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                style={{ width: '100%', height: '40px', borderRadius: '4px' }}
                                className="relabel-dropdown"
                                popupSettings={{ className: 'relabel-dropdown-popup' }}
                            />
                        </div>

                    </div>
                </div>

                <div className="variable-modal-footer" style={{ borderTop: 'none', padding: '0 24px 24px 24px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button className="upload-cancel-btn" onClick={handleModalClose}>
                        취소
                    </button>
                    <button className="upload-submit-btn" onClick={handleSubmit}>
                        변경 시작
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RelabelModal;
