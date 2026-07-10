import { useState, useMemo, useEffect } from 'react';
import { X, Sparkles, Check, HelpCircle, Search } from 'lucide-react';

const AiConditionGeneratorModal = ({ show, onClose, variables = [], onApply }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedVars, setSelectedVars] = useState([]);
    const [promptText, setPromptText] = useState('');
    const [generatedRules, setGeneratedRules] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (!show) {
            setSearchTerm('');
            setSelectedVars([]);
            setPromptText('');
            setGeneratedRules([]);
            setIsGenerating(false);
            setErrorMsg('');
        }
    }, [show]);

    const filteredVars = useMemo(() => {
        return variables.filter(v =>
            (v.id && v.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (v.label && v.label.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [variables, searchTerm]);

    const handleToggleVar = (varId) => {
        setSelectedVars(prev =>
            prev.includes(varId) ? prev.filter(x => x !== varId) : [...prev, varId]
        );
    };

    // 자연어 프롬프트를 해석하여 규칙들을 자동생성하는 스마트 파서
    const handleGenerate = () => {
        if (!promptText.trim()) {
            setErrorMsg('프롬프트를 입력해 주세요.');
            return;
        }
        setErrorMsg('');
        setIsGenerating(true);

        setTimeout(() => {
            try {
                // 프롬프트 및 선택된 변수 추출
                const prompt = promptText.trim();
                const vList = selectedVars.length > 0 ? selectedVars : (variables.map(v => v.id).filter(id => prompt.toLowerCase().includes(id.toLowerCase())) || []);

                if (vList.length === 0) {
                    // 프롬프트에서 변수명 매칭 시도 (예: q1, q250 등)
                    const matches = prompt.match(/[qQ][0-9]+(_[a-zA-Z0-9]+)*/g);
                    if (matches && matches.length > 0) {
                        // 중복 제거
                        const uniqueMatches = Array.from(new Set(matches.map(m => m.toLowerCase())));
                        variables.forEach(v => {
                            if (uniqueMatches.includes(v.id.toLowerCase())) {
                                vList.push(v.id);
                            }
                        });
                    }
                }

                if (vList.length === 0) {
                    setErrorMsg('대상 변수를 찾지 못했습니다. 왼쪽에서 변수를 선택하거나 프롬프트에 정확한 변수명(예: q1)을 포함해 주세요.');
                    setIsGenerating(false);
                    return;
                }

                let rules = [];
                
                // 간단한 스마트 매핑 로직
                const firstVarId = vList[0];
                const variableObj = variables.find(x => x.id === firstVarId);
                const varInfo = variableObj?.info || [];

                // 프롬프트 내 숫자 추출
                const numberMatches = prompt.match(/\b\d+\b/g);
                const numbers = numberMatches ? Array.from(new Set(numberMatches.map(Number))) : [];

                // 교차 생성 패턴이 포함되어 있는지 감지 (예: 교차, 곱하기, * , and)
                const isCrossPattern = prompt.includes('교차') || prompt.includes('조합') || prompt.includes('*') || prompt.includes('and') || vList.length > 1;

                if (isCrossPattern && vList.length >= 2) {
                    // 데카르트 곱 조합 생성
                    const varInfos = vList.map(vid => {
                        const v = variables.find(x => x.id === vid) || { info: [] };
                        if (!v.info || v.info.length === 0) {
                            return [{ value: "ANY", label: `Any ${vid}` }];
                        }
                        return v.info.filter(item => item.value !== null && item.value !== "");
                    });

                    const cartesian = varInfos.reduce((acc, current) => {
                        return acc.flatMap(combo => current.map(item => [...combo, item]));
                    }, [[]]);

                    let counter = 1;
                    rules = cartesian.map(comboItems => {
                        const labels = comboItems.map(item => item.label || String(item.value));
                        const logics = comboItems.map((item, idx) => {
                            const varId = vList[idx];
                            let val = item.value;
                            if (val !== 'ANY' && isNaN(Number(val))) {
                                val = `'${val}'`;
                            }
                            return `${varId} == ${val}`;
                        });

                        return {
                            label2: String(counter++),
                            label: labels.join(" * "),
                            logic: logics.join(" and ")
                        };
                    });
                } else {
                    // 단일 변수의 보기별 조건 생성
                    if (varInfo.length > 0) {
                        let targetItems = varInfo;
                        // 특정 번호가 프롬프트에 명시된 경우 필터링
                        if (numbers.length > 0) {
                            targetItems = varInfo.filter(item => numbers.includes(Number(item.value)));
                        }
                        
                        // 타겟 아이템이 없으면 프롬프트 내 숫자들로 임시 생성
                        if (targetItems.length === 0 && numbers.length > 0) {
                            targetItems = numbers.map(num => ({ value: String(num), label: `${firstVarId} 보기 ${num}` }));
                        }

                        let counter = 1;
                        rules = targetItems.map(item => {
                            let val = item.value;
                            if (val !== 'ANY' && isNaN(Number(val))) {
                                val = `'${val}'`;
                            }
                            return {
                                label2: String(counter++),
                                label: item.label || `${firstVarId} 보기 ${val}`,
                                logic: `${firstVarId} == ${val}`
                            };
                        });
                    } else {
                        // 기본 정보가 없는 경우 숫자를 기반으로 임시 뼈대 생성
                        const vals = numbers.length > 0 ? numbers : [1, 2, 3];
                        let counter = 1;
                        rules = vals.map(val => {
                            return {
                                label2: String(counter++),
                                label: `${firstVarId} 보기 ${val}`,
                                logic: `${firstVarId} == ${val}`
                            };
                        });
                    }
                }

                if (rules.length === 0) {
                    setErrorMsg('조건식을 생성할 수 없습니다. 프롬프트를 다른 단어로 변경해 보세요.');
                } else {
                    setGeneratedRules(rules);
                }
            } catch (err) {
                console.error(err);
                setErrorMsg('조건 생성 중 예측하지 못한 오류가 발생했습니다.');
            } finally {
                setIsGenerating(false);
            }
        }, 1200);
    };

    const handleApplyRules = () => {
        if (generatedRules.length === 0) return;
        onApply(generatedRules);
        onClose();
    };

    if (!show) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 100000
        }}>
            <div style={{
                width: '1000px', height: '640px', background: '#ffffff',
                borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0'
            }} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div style={{
                    padding: '16px 24px', borderBottom: '1px solid #f1f5f9',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sparkles size={18} style={{ color: '#2563eb' }} />
                        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>AI 조건식 자동생성</h3>
                    </div>
                    <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}>
                        <X size={18} />
                    </button>
                </div>

                {/* Body Content */}
                <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
                    {/* Left Panel: Variables list */}
                    <div style={{ width: '280px', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
                        <div style={{ padding: '12px' }}>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <input
                                    type="text"
                                    placeholder="변수명/라벨 검색"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{
                                        width: '100%', height: '32px', padding: '0 12px 0 32px',
                                        border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', outline: 'none'
                                    }}
                                />
                                <Search size={14} style={{ position: 'absolute', left: '10px', color: '#94a3b8' }} />
                            </div>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px 12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {filteredVars.map(v => {
                                    const isSelected = selectedVars.includes(v.id);
                                    return (
                                        <div
                                            key={v.id}
                                            onClick={() => handleToggleVar(v.id)}
                                            style={{
                                                padding: '8px 10px', borderRadius: '6px', cursor: 'pointer',
                                                border: isSelected ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                                                background: isSelected ? '#eff6ff' : '#ffffff', transition: 'all 0.1s'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '12px', fontWeight: 700, color: isSelected ? '#1d4ed8' : '#334155' }}>{v.id}</span>
                                                {isSelected && <Check size={12} style={{ color: '#2563eb' }} />}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                                {v.label || '(라벨 없음)'}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Prompt and Preview */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', gap: '16px', minWidth: 0 }}>
                        {/* Prompt Input */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                AI 조건식 생성 지시어
                                <HelpCircle size={14} style={{ color: '#94a3b8' }} title="왼쪽에서 변수를 클릭해 선택한 뒤, 아래에 원하는 조건의 규칙을 자연어로 작성해 주세요." />
                            </label>
                            <div style={{ position: 'relative' }}>
                                <textarea
                                    value={promptText}
                                    onChange={(e) => setPromptText(e.target.value)}
                                    placeholder="예시:&#10;- q1의 모든 보기에 대해 단일 조건 생성해줘&#10;- q1의 1~3번과 q2의 1~5번 보기를 서로 교차조합하여 조건식을 만들어줘"
                                    style={{
                                        width: '100%', height: '80px', padding: '12px', border: '1px solid #cbd5e1',
                                        borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', resize: 'none'
                                    }}
                                />
                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
                                    style={{
                                        position: 'absolute', bottom: '12px', right: '12px',
                                        height: '28px', padding: '0 12px', border: 'none', borderRadius: '6px',
                                        background: '#2563eb', color: '#ffffff', fontSize: '12px', fontWeight: 600,
                                        display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', opacity: isGenerating ? 0.7 : 1
                                    }}
                                >
                                    <Sparkles size={12} />
                                    {isGenerating ? '분석 중...' : '조건 생성'}
                                </button>
                            </div>
                            {errorMsg && <div style={{ fontSize: '12px', color: '#ef4444' }}>{errorMsg}</div>}
                        </div>

                        {/* Generated Rules Preview */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                                생성된 조건식 미리보기 ({generatedRules.length})
                            </div>
                            <div style={{
                                flex: 1, border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden',
                                display: 'flex', flexDirection: 'column', background: '#f8fafc', minHeight: 0
                            }}>
                                {/* Grid Header */}
                                <div style={{
                                    display: 'flex', background: '#f1f5f9', borderBottom: '1px solid #cbd5e1',
                                    padding: '8px 12px', fontSize: '12px', fontWeight: 700, color: '#475569'
                                }}>
                                    <div style={{ width: '80px' }}>할당될 값</div>
                                    <div style={{ width: '200px' }}>보기 라벨</div>
                                    <div style={{ flex: 1 }}>조건</div>
                                </div>
                                {/* Grid Rows */}
                                <div style={{ flex: 1, overflowY: 'auto' }}>
                                    {isGenerating ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px' }}>
                                            <div className="animate-spin" style={{ width: '24px', height: '24px', border: '3px solid #cbd5e1', borderTopColor: '#2563eb', borderRadius: '50%' }} />
                                            <span style={{ fontSize: '12px', color: '#64748b' }}>AI가 조건문을 파싱하고 설계하는 중입니다...</span>
                                        </div>
                                    ) : generatedRules.length === 0 ? (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: '12px' }}>
                                            생성 지시어를 입력한 뒤 &apos;조건 생성&apos; 버튼을 클릭해 주세요.
                                        </div>
                                    ) : (
                                        generatedRules.map((rule, idx) => (
                                            <div
                                                key={idx}
                                                style={{
                                                    display: 'flex', padding: '8px 12px', borderBottom: '1px solid #e2e8f0',
                                                    fontSize: '12px', color: '#334155', background: '#ffffff'
                                                }}
                                            >
                                                <div style={{ width: '80px', fontWeight: 600 }}>{rule.label2}</div>
                                                <div style={{ width: '200px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', paddingRight: '12px' }}>{rule.label}</div>
                                                <div style={{ flex: 1, fontFamily: 'monospace', color: '#0978eb' }}>{rule.logic}</div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '12px 24px', borderTop: '1px solid #f1f5f9', background: '#f8fafc',
                    display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            height: '32px', padding: '0 16px', border: '1px solid #cbd5e1',
                            borderRadius: '6px', color: '#475569', background: '#ffffff',
                            fontSize: '13px', fontWeight: 600, cursor: 'pointer'
                        }}
                    >
                        취소
                    </button>
                    <button
                        onClick={handleApplyRules}
                        disabled={generatedRules.length === 0}
                        style={{
                            height: '32px', padding: '0 16px', border: 'none', borderRadius: '6px',
                            background: '#2563eb', color: '#ffffff', fontSize: '13px', fontWeight: 600,
                            cursor: generatedRules.length === 0 ? 'not-allowed' : 'pointer', opacity: generatedRules.length === 0 ? 0.6 : 1
                        }}
                    >
                        문항에 적용
                    </button>
                </div>
            </div>
            {/* Simple CSS animation style inside react render */}
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default AiConditionGeneratorModal;
