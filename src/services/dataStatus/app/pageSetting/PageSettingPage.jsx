import React, { useState, useEffect } from 'react';
import DataHeader from '../../components/DataHeader';
import { Plus, Trash2, ChevronDown, Check } from 'lucide-react';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { VariablePageApi } from '../variable/VariablePageApi';
import { useSelector } from 'react-redux';
import '@/components/common/popup/ConditionBuilderPopup.css';
import './PageSettingPage.css';

const MultiCheckboxDropdown = ({ options = [], valueStr = '', onChange, placeholder = '선택 안함', isSingle = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = React.useRef(null);
    const selectedValues = valueStr ? valueStr.split(',').map(s => s.trim()).filter(s => s) : [];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleToggle = (val) => {
        if (isSingle) {
            if (selectedValues.includes(val)) {
                onChange('');
            } else {
                onChange(val);
                setIsOpen(false);
            }
        } else {
            let newValues;
            if (selectedValues.includes(val)) {
                newValues = selectedValues.filter(v => v !== val);
            } else {
                newValues = [...selectedValues, val];
            }
            newValues.sort((a, b) => {
                const numA = Number(a);
                const numB = Number(b);
                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                return String(a).localeCompare(String(b));
            });
            onChange(newValues.join(','));
        }
    };

    const handleToggleAll = (e) => {
        e.stopPropagation();
        if (selectedValues.length === options.length) {
            onChange('');
        } else {
            onChange(options.map(o => String(o.value)).join(','));
        }
    };

    let displayText = placeholder;
    if (selectedValues.length > 0) {
        if (selectedValues.length === options.length && options.length > 0) {
            displayText = '전체 선택됨';
        } else {
            displayText = selectedValues.join(', ');
        }
    }

    return (
        <div ref={dropdownRef} style={{ position: 'relative', flex: 1, minWidth: '120px' }}>
            <div
                className={`multi-drop-trigger-cbp ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                style={{ height: '36px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff' }}
            >
                <div className="multi-drop-val-cbp" style={{ color: selectedValues.length > 0 ? '#334155' : '#94a3b8' }} title={displayText}>{displayText}</div>
                <ChevronDown size={14} color="#64748b" style={{ flexShrink: 0, marginLeft: '4px' }} />
            </div>
            {isOpen && (
                <div className="multi-drop-menu-cbp" style={{ zIndex: 9999 }}>
                    {!isSingle && (
                        <div className="multi-drop-item-cbp all" onClick={handleToggleAll}>
                            <div className={`multi-drop-checkbox-custom ${(selectedValues.length === options.length && options.length > 0) ? 'checked' : ''}`}>
                                {(selectedValues.length === options.length && options.length > 0) && <Check size={12} color="#fff" strokeWidth={3} />}
                            </div>
                            <span className="multi-drop-item-text-cbp">전체 선택</span>
                        </div>
                    )}
                    {options.length === 0 ? (
                        <div style={{ padding: '8px 14px', fontSize: '13px', color: '#9ca3af' }}>옵션이 없습니다.</div>
                    ) : (
                        options.map(o => {
                            const isChecked = selectedValues.includes(String(o.value));
                            return (
                                <div key={String(o.value)} className="multi-drop-item-cbp" onClick={(e) => { e.stopPropagation(); handleToggle(String(o.value)); }}>
                                    <div className={`multi-drop-checkbox-custom ${isChecked ? 'checked' : ''}`}>
                                        {isChecked && <Check size={12} color="#fff" strokeWidth={3} />}
                                    </div>
                                    <span className="multi-drop-item-text-cbp" title={`${o.value}. ${o.label}`}>{`${o.value}. ${o.label}`}</span>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
};

const ColorInputItem = ({ label, defaultValue }) => {
    const [color, setColor] = useState(defaultValue);

    const isValidHex = (hex) => /^#[0-9A-Fa-f]{6}$/i.test(hex);

    return (
        <div style={{ marginBottom: '16px' }}>
            <label style={{ color: '#334155', fontSize: '13px', display: 'block', marginBottom: '6px', fontWeight: '500' }}>{label}</label>
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                border: '1px solid #cbd5e1', 
                borderRadius: '6px', 
                overflow: 'hidden', 
                backgroundColor: '#fff',
                height: '36px',
            }}>
                <div style={{ 
                    paddingLeft: '8px', 
                    display: 'flex', 
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <input 
                        type="color" 
                        value={isValidHex(color) ? color : '#ffffff'} 
                        onChange={(e) => setColor(e.target.value.toUpperCase())} 
                        style={{ 
                            width: '22px', height: '22px', padding: '0', 
                            border: 'none', outline: 'none', borderRadius: '4px', 
                            cursor: 'pointer', background: 'none' 
                        }}
                    />
                </div>
                <input 
                    type="text" 
                    value={color} 
                    onChange={(e) => setColor(e.target.value)} 
                    style={{ 
                        flex: 1, border: 'none', height: '100%', 
                        padding: '0 8px', fontSize: '13px', 
                        color: '#334155', outline: 'none', background: 'transparent',
                        fontFamily: 'monospace'
                    }}
                />
            </div>
        </div>
    );
};

const PageSettingPage = () => {
    const auth = useSelector((state) => state.auth);
    const { getOriginalVariables } = VariablePageApi();
    const [kendoVarOptions, setKendoVarOptions] = useState([]);

    const [filterSets, setFilterSets] = useState([
        { id: Date.now(), conditions: [{ id: Date.now() + 1, varName: '', operator: '==', value: '', logicOp: 'AND' }] }
    ]);

    useEffect(() => {
        const fetchVars = async () => {
            const user = auth?.user?.userId;
            const pageid = sessionStorage.getItem("pageId");
            if (!user || !pageid) return;
            try {
                const res = await getOriginalVariables.mutateAsync({ user, pageid });
                if (res?.success === "777" && res.resultjson) {
                    const activeList = Object.values(res.resultjson).map(v => typeof v === 'string' ? JSON.parse(v) : v);
                    const kendoOpts = [];
                    activeList.forEach(v => {
                        const rawType = (v.type || '').toLowerCase();
                        let color = v.color || 'default';
                        if (!v.color && v.type) {
                            if (rawType.includes('single')) color = 'single';
                            else if (rawType.includes('multi')) color = 'multi';
                            else if (rawType.includes('rank')) color = 'rank';
                            else if (rawType.includes('minrank')) color = 'minrank';
                            else if (rawType.includes('maxrank')) color = 'maxrank';
                            else if (rawType.includes('scale')) color = 'scale';
                            else if (rawType.includes('dummy')) color = 'dummy';
                            else if (rawType.includes('custom')) color = 'custom';
                            else if (rawType.includes('문자') || rawType.includes('open')) color = 'open-text';
                            else if (rawType.includes('숫자')) color = 'open-num';
                        }
                        kendoOpts.push({
                            text: v.label ? `${v.sysName || v.id} (${v.label})` : (v.sysName || v.id),
                            value: v.sysName || v.id,
                            type: v.type,
                            color: color,
                            info: v.info || v.labels
                        });
                    });
                    setKendoVarOptions(kendoOpts);
                }
            } catch (e) {
                console.error("Error fetching variables:", e);
            }
        };
        fetchVars();
    }, [auth]);

    const getOperatorOptions = (varName) => {
        const defaultOps = [
            { text: '== (같음)', value: '==' },
            { text: '!= (같지 않음)', value: '!=' },
            { text: '> (초과)', value: '>' },
            { text: '>= (이상)', value: '>=' },
            { text: '< (미만)', value: '<' },
            { text: '<= (이하)', value: '<=' },
            { text: 'in (포함)', value: 'in' },
            { text: 'not in (미포함)', value: 'not in' },
            { text: 'is not null (응답있음)', value: 'is not null' },
            { text: 'is null (응답없음)', value: 'is null' },
        ];
        if (!varName) return defaultOps;
        const matchedVar = kendoVarOptions.find(item => item.value === varName);
        if (!matchedVar) return defaultOps;
        const rawType = (matchedVar.type || '').toLowerCase();

        if (rawType.includes('single') || rawType.includes('dummy')) {
            return [
                { text: 'in (포함)', value: 'in' },
                { text: 'not in (미포함)', value: 'not in' },
                { text: '>= (이상)', value: '>=' },
                { text: '<= (이하)', value: '<=' },
                { text: '== (같다)', value: '==' },
                { text: 'is not null (응답있음)', value: 'is not null' },
                { text: 'is null (응답없음)', value: 'is null' },
            ];
        } else if (rawType.includes('multi') || rawType.includes('rank')) {
            return [
                { text: 'in (포함)', value: 'in' },
                { text: 'not in (미포함)', value: 'not in' },
                { text: 'is not null (응답있음)', value: 'is not null' },
                { text: 'is null (응답없음)', value: 'is null' },
            ];
        } else if (rawType.includes('open')) {
            return [
                { text: '== (같음)', value: '==' },
                { text: '!= (같지 않음)', value: '!=' },
                { text: '>= (이상)', value: '>=' },
                { text: '<= (이하)', value: '<=' },
                { text: 'is not null (응답있음)', value: 'is not null' },
                { text: 'is null (응답없음)', value: 'is null' },
            ];
        }
        return defaultOps;
    };

    const DropDownItemRender = (li, itemProps) => {
        const itemChildren = (
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%', gap: '8px' }}>
                <span style={{ flex: 1, wordBreak: 'keep-all', lineHeight: '1.4' }} title={itemProps.dataItem.text}>
                    {itemProps.dataItem.text}
                </span>
                {itemProps.dataItem.type && (
                    <span className={`question-type-badge ${itemProps.dataItem.color || 'default'}`} style={{ flexShrink: 0 }}>
                        {String(itemProps.dataItem.type).toLowerCase()}
                    </span>
                )}
            </div>
        );
        return React.cloneElement(li, li.props, itemChildren);
    };

    const DropDownValueRender = (element, value) => {
        if (!value) return element;
        const children = (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '4px' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={value.text}>
                    {value.text}
                </span>
                {value.type && (
                    <span className={`question-type-badge ${value.color || 'default'}`} style={{ flexShrink: 0 }}>
                        {String(value.type).toLowerCase()}
                    </span>
                )}
            </div>
        );
        let textColor = 'inherit';
        if (value.value === "") textColor = '#9ca3af';
        return React.cloneElement(element, { ...element.props, style: { ...element.props.style, display: 'flex', flex: 1, minWidth: 0, color: textColor } }, children);
    };

    const handleAddSet = () => {
        setFilterSets([...filterSets, { id: Date.now(), conditions: [{ id: Date.now() + 1, varName: '', operator: '==', value: '', logicOp: 'AND' }] }]);
    };

    const handleDeleteSet = (id) => {
        setFilterSets(filterSets.filter(s => s.id !== id));
    };

    const handleAddCondition = (setId) => {
        setFilterSets(filterSets.map(s => {
            if (s.id === setId) {
                return { ...s, conditions: [...s.conditions, { id: Date.now(), varName: '', operator: '==', value: '', logicOp: 'AND' }] };
            }
            return s;
        }));
    };

    const handleDeleteCondition = (setId, condId) => {
        setFilterSets(filterSets.map(s => {
            if (s.id === setId) {
                return { ...s, conditions: s.conditions.filter(c => c.id !== condId) };
            }
            return s;
        }).filter(s => s.conditions.length > 0)); // Remove empty sets completely
    };

    const handleChangeCondition = (setId, condId, field, value) => {
        setFilterSets(filterSets.map(s => {
            if (s.id === setId) {
                const updatedConditions = s.conditions.map(c => {
                    if (c.id === condId) {
                        const updated = { ...c, [field]: value };
                        if (field === 'operator' && updated.operator !== c.operator) {
                            updated.value = '';
                        }
                        return updated;
                    }
                    return c;
                });
                return { ...s, conditions: updatedConditions };
            }
            return s;
        }));
    };

    return (
        <div className="page-setting-page" data-theme="data-dashboard" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <DataHeader
                title="페이지 설정"
                saveButtonLabel="변경사항 저장"
                onSave={() => alert('저장 완료')}
            />

            <div className="page-setting-container">
                {/* 1. 기본 필터식 영역 */}
                <div className="filter-box-container">
                    <div className="filter-box-header">
                        <div>
                            <div className="filter-box-title">기본 필터식</div>
                            <div className="setting-section-desc" style={{ marginTop: '4px', marginBottom: 0 }}>
                                집계용 recoded 변수와 같은 DSL을 사용합니다. 순서형 multi는 `sq3[0]`, `sq3[0:1]`, `sq3[-1]` 형태를 지원합니다.
                            </div>
                        </div>
                        <button className="btn-add-set" onClick={handleAddSet}>
                            <Plus size={16} strokeWidth={2.5} /> 세트 추가
                        </button>
                    </div>

                    {filterSets.length > 0 ? filterSets.map((set, index) => {
                        return (
                            <div className="filter-set-item" key={set.id} style={{ zIndex: 100 - index }}>
                                <div className="filter-set-header">
                                    <span className="filter-set-title">SET {index + 1}</span>
                                    <span className="filter-set-meta">(AND 결합)</span>
                                    <button className="icon-btn-del" onClick={() => handleDeleteSet(set.id)} disabled={filterSets.length === 1} style={{ marginLeft: 'auto', opacity: filterSets.length === 1 ? 0.5 : 1 }}><Trash2 size={16} /></button>
                                </div>
                                <div className="filter-set-body-container" style={{ display: 'flex', flexDirection: 'column' }}>
                                    {set.conditions.map((cond, condIndex) => {
                                        const matchedVar = kendoVarOptions.find(item => item.value === cond.varName);
                                        let isOpenVar = false;
                                        let opts = [];
                                        if (matchedVar) {
                                            const rawType = (matchedVar.type || '').toLowerCase();
                                            if (rawType.includes('open')) isOpenVar = true;
                                            if (matchedVar.info && Array.isArray(matchedVar.info)) {
                                                opts = matchedVar.info.filter(o => o.label).map(o => ({ value: o.value || o.code, label: o.label }));
                                            }
                                        }

                                        return (
                                            <div className="filter-set-body" key={cond.id} style={{ borderBottom: condIndex < set.conditions.length - 1 ? '1px dashed #e2e8f0' : 'none', padding: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                {condIndex > 0 && <div style={{ minWidth: '32px', textAlign: 'center', fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>AND</div>}
                                                <div className="form-group" style={{ flex: 2 }}>
                                                    <DropDownList
                                                        data={kendoVarOptions}
                                                        textField="text"
                                                        dataItemKey="value"
                                                        defaultItem={{ text: "문항 선택", value: "" }}
                                                        itemRender={DropDownItemRender}
                                                        valueRender={DropDownValueRender}
                                                        value={cond.varName ? (kendoVarOptions.find(item => item.value === cond.varName) || { text: cond.varName, value: cond.varName }) : { text: "문항 선택", value: "" }}
                                                        onChange={(e) => {
                                                            const newVarName = e.value ? e.value.value : "";
                                                            const validOps = getOperatorOptions(newVarName);
                                                            let newOp = cond.operator;
                                                            if (newVarName && cond.operator && !validOps.find(op => op.value === cond.operator)) {
                                                                newOp = validOps.length > 0 ? validOps[0].value : "";
                                                            }
                                                            handleChangeCondition(set.id, cond.id, 'varName', newVarName);
                                                            if (newOp !== cond.operator) handleChangeCondition(set.id, cond.id, 'operator', newOp);
                                                        }}
                                                        style={{ height: '36px' }}
                                                    />
                                                </div>
                                                <div className="form-group" style={{ flex: 1.2 }}>
                                                    <DropDownList
                                                        data={getOperatorOptions(cond.varName)}
                                                        textField="text"
                                                        dataItemKey="value"
                                                        defaultItem={{ text: "연산자", value: "" }}
                                                        valueRender={DropDownValueRender}
                                                        value={cond.operator ? (getOperatorOptions(cond.varName).find(op => op.value === cond.operator) || { text: cond.operator, value: cond.operator }) : { text: "연산자", value: "" }}
                                                        onChange={(e) => handleChangeCondition(set.id, cond.id, 'operator', e.value ? e.value.value : "")}
                                                        style={{ height: '36px' }}
                                                    />
                                                </div>
                                                <div className="form-group" style={{ flex: 2 }}>
                                                    {(!['is null', 'is not null'].includes(cond.operator)) && (
                                                        <>
                                                            {(!isOpenVar && opts.length > 0) ? (
                                                                <MultiCheckboxDropdown
                                                                    options={opts}
                                                                    valueStr={cond.value}
                                                                    isSingle={cond.operator && !['in', 'not in'].includes(cond.operator)}
                                                                    onChange={(val) => handleChangeCondition(set.id, cond.id, 'value', val)}
                                                                />
                                                            ) : (
                                                                <input
                                                                    type="text"
                                                                    className="form-input"
                                                                    style={{ height: '36px' }}
                                                                    value={cond.value}
                                                                    onChange={(e) => {
                                                                        let val = e.target.value;
                                                                        if (cond.operator && !['in', 'not in'].includes(cond.operator)) {
                                                                            val = val.replace(/,/g, '');
                                                                        }
                                                                        handleChangeCondition(set.id, cond.id, 'value', val);
                                                                    }}
                                                                    placeholder="값 입력"
                                                                />
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                                <button className="icon-btn-add" onClick={() => handleAddCondition(set.id)}><Plus size={18} /></button>
                                                <button className="icon-btn-del" onClick={() => handleDeleteCondition(set.id, cond.id)} disabled={filterSets.length === 1 && set.conditions.length === 1} style={{ opacity: (filterSets.length === 1 && set.conditions.length === 1) ? 0.5 : 1 }}><Trash2 size={16} /></button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="filter-set-empty">
                            (조건 없음)
                        </div>
                    )}

                </div>

                {/* 2. 기본 변수 설정 (Grid layout) */}
                <div className="advanced-settings-container" style={{ marginTop: '16px', marginBottom: '16px' }}>
                    <div className="advanced-settings-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div className="advanced-settings-title">데이터 분석 설정</div>
                            <div className="advanced-settings-desc">통계 분석 시 기본으로 적용될 가중치, Strata 변수, PSU 변수 및 신뢰수준을 설정합니다.</div>
                        </div>
                        <div style={{ backgroundColor: '#eff6ff', color: '#3b82f6', padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', border: '1px solid #bfdbfe' }}>
                            n 84 / 신뢰수준 99% / 표본오차 +-14.05%p
                        </div>
                    </div>

                    <div className="settings-grid">
                        {/* Weight Variable Box */}
                        <div className="setting-item-box">
                            <div>
                                <label className="form-label" style={{ color: '#0f172a', display: 'block', marginBottom: '8px' }}>기본 weight 변수</label>
                            </div>
                            <input type="text" className="form-input" placeholder="예: weight_var" style={{ height: '38px', backgroundColor: '#fff' }} />
                        </div>

                        {/* Confidence Level Box */}
                        <div className="setting-item-box">
                            <div>
                                <label className="form-label" style={{ color: '#0f172a', display: 'block', marginBottom: '8px' }}>신뢰수준 (Confidence Level)</label>
                            </div>
                            <select className="form-select" defaultValue="95" style={{ height: '38px', backgroundColor: '#fff', fontSize: '13px' }}>
                                <option value="99">99%</option>
                                <option value="95">95%</option>
                                <option value="90">90%</option>
                            </select>
                        </div>

                        {/* Strata Box */}
                        <div className="setting-item-box">
                            <div>
                                <label className="form-label" style={{ color: '#0f172a', display: 'block', marginBottom: '8px' }}>기본 Strata 변수</label>
                            </div>
                            <input type="text" className="form-input" placeholder="예: region_strata" style={{ height: '38px', backgroundColor: '#fff' }} />
                        </div>

                        {/* PSU Box */}
                        <div className="setting-item-box">
                            <div>
                                <label className="form-label" style={{ color: '#0f172a', display: 'block', marginBottom: '8px' }}>기본 PSU 변수</label>
                            </div>
                            <input type="text" className="form-input" placeholder="예: cluster_id" style={{ height: '38px', backgroundColor: '#fff' }} />
                        </div>
                    </div>
                </div>

                {/* 3. UI 테마 설정 */}
                <div className="theme-config-container">
                    <div className="setting-section-title" style={{ fontSize: '15px' }}>UI 테마 설정</div>

                    <div className="grid-cols-2" style={{ marginTop: '16px' }}>
                        <div>
                            <label className="form-label">글꼴 (Font-Family)</label>
                            <input type="text" className="form-input" defaultValue="'Nanum Myeongjo', serif" />
                            <div className="font-presets">
                                <button className="font-preset-btn">기본 (Arial)</button>
                                <button className="font-preset-btn">본고딕 (Noto Sans)</button>
                                <button className="font-preset-btn">명조 (Nanum Myeongjo)</button>
                                <button className="font-preset-btn">프리텐다드 (Pretendard)</button>
                            </div>
                        </div>
                        <div>
                            <label className="form-label">표 기본 글자 크기 (px)</label>
                            <input type="text" className="form-input" defaultValue="14" />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '32px', marginTop: '32px' }}>
                        {/* 1. Primary */}
                        <div className="theme-color-section" style={{ margin: 0 }}>
                            <div className="theme-color-header" style={{ fontSize: '14px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', marginBottom: '16px', color: '#1e293b' }}>Primary (주 색상)</div>
                            <div>
                                <ColorInputItem label="대제목 / 강조" defaultValue="#3B82F6" />
                                <ColorInputItem label="헤더 텍스트 (앞글자)" defaultValue="#FFFFFF" />
                            </div>
                        </div>

                        {/* 2. Secondary */}
                        <div className="theme-color-section" style={{ margin: 0 }}>
                            <div className="theme-color-header" style={{ fontSize: '14px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', marginBottom: '16px', color: '#1e293b' }}>Secondary (보조 색상)</div>
                            <div>
                                <ColorInputItem label="서브 / 버튼" defaultValue="#BFDBFE" />
                                <ColorInputItem label="서브 보완" defaultValue="#EFF6FF" />
                            </div>
                        </div>

                        {/* 3. Background */}
                        <div className="theme-color-section" style={{ margin: 0 }}>
                            <div className="theme-color-header" style={{ fontSize: '14px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', marginBottom: '16px', color: '#1e293b' }}>Background (배경)</div>
                            <div>
                                <ColorInputItem label="기본 배경" defaultValue="#FFFFFF" />
                                <ColorInputItem label="카드 / 표 배경" defaultValue="#F8FAFC" />
                                <ColorInputItem label="교차형 (Stripe)" defaultValue="#F1F5F9" />
                            </div>
                        </div>

                        {/* 4. Text */}
                        <div className="theme-color-section" style={{ margin: 0 }}>
                            <div className="theme-color-header" style={{ fontSize: '14px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', marginBottom: '16px', color: '#1e293b' }}>Text (텍스트)</div>
                            <div>
                                <ColorInputItem label="기본 텍스트 (진한)" defaultValue="#1E293B" />
                                <ColorInputItem label="보조 텍스트 (연한)" defaultValue="#64748B" />
                            </div>
                        </div>

                        {/* 5. Status */}
                        <div className="theme-color-section" style={{ margin: 0, gridColumn: 'span 2' }}>
                            <div className="theme-color-header" style={{ fontSize: '14px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', marginBottom: '16px', color: '#1e293b' }}>Status (상태 색상)</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                                <div>
                                    <ColorInputItem label="Success (성공)" defaultValue="#10B981" />
                                    <ColorInputItem label="Error (에러)" defaultValue="#EF4444" />
                                    <ColorInputItem label="Accent (강조 / 테이블)" defaultValue="#8B5CF6" />
                                </div>
                                <div>
                                    <ColorInputItem label="Warning (경고 / 대기)" defaultValue="#F59E0B" />
                                    <ColorInputItem label="Info (정보 / Highlight)" defaultValue="#3B82F6" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="preset-container">
                        <span className="preset-label">Preset:</span>
                        <button className="preset-btn blue">블루 (기본)</button>
                        <button className="preset-btn lg">LG</button>
                        <button className="preset-btn gs">GS</button>
                        <button className="preset-btn cu">CU</button>
                        <button className="preset-btn dongsuh">동서식품</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PageSettingPage;
