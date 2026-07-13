import { useState, useEffect, useContext } from 'react';
import { X, Trash2, Plus } from 'lucide-react';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { modalContext } from "@/components/common/Modal.jsx";
import '@/components/common/popup/ConditionBuilderPopup.css';

const AiConditionGeneratorModal = ({ show, onClose, onApply, autoGenerateLogic, getAiModels, user }) => {
    const modal = useContext(modalContext);
    const [promptText, setPromptText] = useState('');
    const [modelKey, setModelKey] = useState('llm-gpt-oss-120b');
    const [models, setModels] = useState([
        { text: "GTP-OSS-120B (내부로컬)", value: "llm-gpt-oss-120b" },
        { text: "GEMMA-4-31B-IT (내부로컬)", value: "llm-gemma-4-31b-it" }
    ]);
    const [generatedRules, setGeneratedRules] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (show) {
            const fetchModels = async () => {
                try {
                    const res = await getAiModels.mutateAsync({ user: user || '' });
                    if (res?.success === '777' && Array.isArray(res?.resultjson)) {
                        const mapped = res.resultjson.map(m => ({ text: m.label, value: m.value }));
                        setModels(mapped);
                        if (mapped.length > 0) {
                            setModelKey(mapped[0].value);
                        }
                    }
                } catch (e) {
                    console.error("AI 모델 조회 오류:", e);
                }
            };
            fetchModels();
        } else {
            setPromptText('');
            setModelKey('llm-gpt-oss-120b');
            setGeneratedRules([]);
            setIsGenerating(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show]);

    // AI 조건식 생성 API 호출
    const handleExecute = async () => {
        if (!promptText.trim()) {
            modal.showAlert('알림', '조건식 설명을 입력해 주세요.');
            return;
        }
        setIsGenerating(true);

        try {
            const pageId = sessionStorage.getItem('pageId');
            const res = await autoGenerateLogic.mutateAsync({
                pageId: pageId || '',
                userInput: promptText.trim(),
                modelKey: modelKey,
                user: user || ''
            });

            const rules = res?.resultjson?.rules || res?.rules;
            if (res?.success === '777' && Array.isArray(rules)) {
                setGeneratedRules(rules);
            } else {
                modal.showAlert('오류', res?.message || '조건식 생성에 실패했습니다.');
            }
        } catch (err) {
            console.error(err);
            modal.showAlert('오류', '서버와 통신 중 오류가 발생했습니다.');
        } finally {
            setIsGenerating(false);
        }
    };

    // 행 추가
    const handleAddRow = () => {
        const nextVal = String(generatedRules.length + 1);
        setGeneratedRules(prev => [
            ...prev,
            { value: nextVal, label: '', logic: '' }
        ]);
    };

    // 행 삭제
    const handleDeleteRow = (index) => {
        setGeneratedRules(prev => prev.filter((_, idx) => idx !== index));
    };

    // 값 업데이트
    const handleUpdateRule = (index, field, value) => {
        setGeneratedRules(prev => prev.map((item, idx) =>
            idx === index ? { ...item, [field]: value } : item
        ));
    };

    // 문항 등록 적용
    const handleApplyRules = () => {
        if (generatedRules.length === 0) return;
        // 문항 추가 탭이 요구하는 규칙 포맷 매핑
        const formatted = generatedRules.map(r => ({
            label2: r.value,
            label: r.label,
            logic: r.logic
        }));
        onApply(formatted);
        onClose();
    };

    if (!show) return null;

    return (
        <div className="advanced-filter-overlay-cbp theme-blue" onClick={onClose}>
            <div className="advanced-filter-content-cbp" onClick={(e) => e.stopPropagation()} style={{ width: '840px', height: '680px', display: 'flex', flexDirection: 'column' }}>

                {/* 헤더 영역 (변수조합기 팝업과 일치) */}
                <div className="filter-popup-header-cbp">
                    <div className="header-title-cbp">
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            AI 조건식 자동 생성
                        </h3>
                        <p>
                            자연어로 조건 설명을 입력하면 내부 로컬 LLM이 페이지의 문항 및 보기 라벨들을 분석하여 매핑 조건식 행을 자동으로 생성해 줍니다.
                        </p>
                    </div>
                    <div className="header-actions-cbp">
                        <button onClick={onClose} className="close-btn-cbp"><X size={20} /></button>
                    </div>
                </div>
                <div className="filter-popup-container-cbp" style={{ display: 'flex', flexDirection: 'column', padding: '16px', gap: '16px', background: '#f0f7ff', boxSizing: 'border-box', flex: 1, minHeight: 0 }}>

                    {/* 상단 컨트롤 패널 */}
                    <div style={{
                        border: '1px solid #cbd5e1', borderRadius: '6px', padding: '16px 20px',
                        background: '#ffffff', display: 'flex', gap: '16px', flexShrink: 0
                    }}>
                        {/* 조건식 설명 입력 */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>조건식 설명 입력</label>
                            <textarea
                                value={promptText}
                                onChange={(e) => setPromptText(e.target.value)}
                                placeholder="G3=1,2는 소가족이고 G3 그 외 보기는 대가족으로 구분해줘."
                                className="ai-prompt-textarea"
                                style={{
                                    width: '100%', height: '84px', padding: '12px', border: '1px solid #3b82f6',
                                    borderRadius: '4px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', resize: 'none',
                                    lineHeight: '1.5', color: '#1e293b', boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.08)'
                                }}
                            />
                        </div>

                        {/* 모델 및 실행 버튼 */}
                        <div style={{ width: '240px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>분석 LLM모델</label>
                            <DropDownList
                                data={models}
                                textField="text"
                                dataItemKey="value"
                                value={
                                    models.find(m => m.value === modelKey) || models[0] || null
                                }
                                onChange={(e) => setModelKey(e.value.value)}
                                style={{
                                    width: '100%', height: '36px', fontSize: '13px', borderRadius: '4px'
                                }}
                            />

                            <button
                                onClick={handleExecute}
                                disabled={isGenerating}
                                style={{
                                    width: '100%', height: '36px', border: 'none', borderRadius: '4px',
                                    background: '#2563eb', color: '#ffffff', fontSize: '13px', fontWeight: 600,
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    gap: '6px', transition: 'background 0.15s', marginTop: '12px'
                                }}
                                onMouseOver={(e) => { if (!isGenerating) e.currentTarget.style.background = '#1d4ed8'; }}
                                onMouseOut={(e) => { if (!isGenerating) e.currentTarget.style.background = '#2563eb'; }}
                            >
                                {isGenerating ? (
                                    <>
                                        <div className="animate-spin" style={{ width: '12px', height: '12px', border: '2px solid #ffffff', borderTopColor: 'transparent', borderRadius: '50%' }} />
                                        <span>분석 중...</span>
                                    </>
                                ) : (
                                    <span>▶ 실행</span>
                                )}
                            </button>
                        </div>
                    </div>


                    {/* 하단 결과 패널 */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, border: '1px solid #cbd5e1', borderRadius: '6px', background: '#ffffff', padding: '12px', boxSizing: 'border-box' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b' }}>분석 및 생성 결과 규칙</span>
                            <button
                                onClick={handleAddRow}
                                style={{
                                    height: '28px', padding: '0 12px', border: '1px solid #3b82f6', borderRadius: '4px',
                                    background: '#eff6ff', color: '#1d4ed8', fontSize: '12px', fontWeight: 600,
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.15s'
                                }}
                                onMouseOver={(e) => { e.currentTarget.style.background = '#dbeafe'; }}
                                onMouseOut={(e) => { e.currentTarget.style.background = '#eff6ff'; }}
                            >
                                <Plus size={12} /> 행 추가
                            </button>
                        </div>

                        {/* 결과 목록 리스트 */}
                        <div style={{
                            flex: 1, border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden',
                            display: 'flex', flexDirection: 'column', background: '#f8fafc', minHeight: 0
                        }}>
                            {/* 컬럼 헤더 */}
                            <div style={{
                                display: 'flex', background: '#f1f5f9', borderBottom: '1px solid #cbd5e1',
                                padding: '8px 16px', fontSize: '12px', fontWeight: 700, color: '#475569', gap: '12px',
                                alignItems: 'center'
                            }}>
                                <div style={{ width: '110px', textAlign: 'center' }}>할당될 값</div>
                                <div style={{ width: '220px', paddingLeft: '12px', boxSizing: 'border-box' }}>보기 라벨</div>
                                <div style={{ flex: 1, paddingLeft: '12px', boxSizing: 'border-box' }}>조건</div>
                                <div style={{ width: '40px', textAlign: 'center' }}>삭제</div>
                            </div>

                            {/* 데이터 행들 */}
                            <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                                {generatedRules.length === 0 ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: '12px' }}>
                                        조건식 설명을 작성하고 &apos;실행&apos; 버튼을 누르면 AI 분석 결과가 이곳에 생성됩니다.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {generatedRules.map((rule, idx) => (
                                            <div
                                                key={idx}
                                                style={{
                                                    display: 'flex', alignItems: 'center', background: '#ffffff',
                                                    border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 16px',
                                                    gap: '12px'
                                                }}
                                            >
                                                {/* 할당값 입력 */}
                                                <input
                                                    type="text"
                                                    value={rule.value || ''}
                                                    onChange={(e) => handleUpdateRule(idx, 'value', e.target.value)}
                                                    style={{
                                                        width: '110px', height: '32px', border: '1px solid #cbd5e1', background: '#ffffff',
                                                        borderRadius: '4px', fontSize: '13px', outline: 'none', textAlign: 'center',
                                                        fontWeight: '600', color: '#1e293b'
                                                    }}
                                                />
                                                {/* 라벨 입력 */}
                                                <input
                                                    type="text"
                                                    value={rule.label || ''}
                                                    onChange={(e) => handleUpdateRule(idx, 'label', e.target.value)}
                                                    style={{
                                                        width: '220px', height: '32px', border: '1px solid #cbd5e1', background: '#ffffff',
                                                        borderRadius: '4px', fontSize: '13px', outline: 'none', padding: '0 12px',
                                                        color: '#1e293b'
                                                    }}
                                                />
                                                {/* 조건식 입력 */}
                                                <input
                                                    type="text"
                                                    value={rule.logic || ''}
                                                    onChange={(e) => handleUpdateRule(idx, 'logic', e.target.value)}
                                                    style={{
                                                        flex: 1, height: '32px', border: '1px solid #cbd5e1', background: '#ffffff',
                                                        borderRadius: '4px', fontSize: '13px', outline: 'none', padding: '0 12px',
                                                        fontFamily: 'Consolas, Monaco, monospace', color: '#0978eb'
                                                    }}
                                                />
                                                {/* 삭제 버튼 */}
                                                <button
                                                    onClick={() => handleDeleteRow(idx)}
                                                    style={{
                                                        width: '40px', border: 'none', background: 'transparent',
                                                        cursor: 'pointer', color: '#94a3b8', display: 'flex',
                                                        alignItems: 'center', justifyContent: 'center', transition: 'color 0.15s'
                                                    }}
                                                    onMouseOver={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                                                    onMouseOut={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 푸터 영역 (변수조합기 팝업과 일치) */}
                <div className="filter-popup-footer-cbp">
                    <div className="footer-right-cbp">
                        <button className="btn-cancel-cbp" onClick={onClose}>취소</button>
                        <button
                            className="btn-apply-cbp"
                            onClick={handleApplyRules}
                            disabled={generatedRules.length === 0}
                            style={{ opacity: generatedRules.length === 0 ? 0.5 : 1 }}
                        >
                            등록
                        </button>
                    </div>
                </div>
            </div>

            {/* Spin CSS style inside react render */}
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
                .ai-prompt-textarea::placeholder {
                    color: #94a3b8 !important;
                    opacity: 0.65 !important;
                }
            `}</style>
        </div>
    );
};

export default AiConditionGeneratorModal;
