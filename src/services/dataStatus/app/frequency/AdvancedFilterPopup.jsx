import React, { useState, useEffect } from 'react';
import { Trash2, Plus, X } from 'lucide-react';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { RecodingPageApi } from '../recoding/RecodingPageApi';
import './AdvancedFilterPopup.css';

const AdvancedFilterPopup = ({ variablesList = [], initialVariables = [], onClose, onSave, auth, pageId, onSaved }) => {
    const { getRecodedList, getRecodedVariables, setRecodedVariable } = RecodingPageApi();

    const [variables, setVariables] = useState(initialVariables);
    const [selectedVarId, setSelectedVarId] = useState(null);
    const [varName, setVarName] = useState('');
    const [varLabel, setVarLabel] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFirstLoad, setIsFirstLoad] = useState(true);

    // Categories structure: [{ id, label, conditionSets: [{ id, logicOp, conditions: [...] }] }]
    const [categories, setCategories] = useState([
        {
            id: Date.now(),
            label: '',
            conditionSets: [{ id: Date.now(), logicOp: 'AND', conditions: [{ varName: '', operator: '==', value: '' }] }]
        }
    ]);

    const parseLogicString = (logicStr) => {
        const defaultState = [
            { id: Date.now(), logicOp: 'AND', conditions: [{ varName: '', operator: '==', value: '' }] }
        ];
        if (!logicStr || logicStr.trim() === '') return defaultState;

        const newSets = [];
        let currentSetStr = '';
        let depth = 0;
        let lastConnector = 'AND';

        let i = 0;
        while (i < logicStr.length) {
            const char = logicStr[i];
            if (char === '(') depth++;
            else if (char === ')') depth--;

            if (depth === 0) {
                const remainder = logicStr.slice(i);
                const match = remainder.match(/^\s+(AND|OR)\s+/i);
                if (match) {
                    addSet(currentSetStr, lastConnector);
                    lastConnector = match[1].toUpperCase();
                    currentSetStr = '';
                    i += match[0].length;
                    continue;
                }
            }
            currentSetStr += char;
            i++;
        }

        if (currentSetStr.trim()) {
            addSet(currentSetStr, lastConnector);
        }

        function addSet(str, connector) {
            str = str.trim();
            while (str.startsWith('(') && str.endsWith(')')) {
                str = str.slice(1, -1).trim();
            }
            if (!str) return;

            const upperStr = str.toUpperCase();
            const isOr = upperStr.includes(' OR ');
            const logicOp = isOr ? 'OR' : 'AND';
            const splitRegex = isOr ? /\s+OR\s+/i : /\s+AND\s+/i;
            const conditionStrs = str.split(splitRegex);

            const parsedConditions = conditionStrs.map(cStr => {
                const t = cStr.trim();
                const match = t.match(/^(.+?)\s*(>=|<=|!=|==|=|>|<|IN|NOT\s+IN)\s*(.+)$/i);
                if (match) {
                    let op = match[2].toUpperCase().trim();
                    if (op === '=') op = '==';
                    return {
                        varName: match[1].replace(/[()]/g, '').trim(),
                        operator: op,
                        value: match[3].replace(/\)+$/, '').trim()
                    };
                }
                return { varName: t.replace(/[()]/g, '').trim(), operator: '==', value: '' };
            }).filter(c => c.varName !== '');

            if (parsedConditions.length === 0) {
                parsedConditions.push({ varName: '', operator: '==', value: '' });
            }

            newSets.push({
                id: Date.now() + Math.random(),
                logicOp: logicOp,
                connectorOp: connector,
                conditions: parsedConditions
            });
        }
        return newSets.length > 0 ? newSets : defaultState;
    };

    // Fetch variables list for sidebar
    const fetchList = async () => {
        if (!auth?.user?.userId || !pageId) return;
        try {
            const result = await getRecodedList.mutateAsync({ user: auth.user.userId, pageid: pageId });
            if (result?.success === "777" && result.resultjson) {
                const overviewVars = Object.values(result.resultjson)
                    .filter(v => v.id.startsWith('overview_'))
                    .map(v => ({ id: v.id, label: v.label }));
                setVariables(overviewVars);
            }
        } catch (error) {
            console.error("Failed to fetch recoded list:", error);
        }
    };

    useEffect(() => {
        const init = async () => {
            if (variables.length === 0) {
                await fetchList();
            }
        };
        init();
    }, []);

    useEffect(() => {
        if (isFirstLoad && variables.length > 0) {
            handleSelectVariable(variables[0].id);
            setIsFirstLoad(false);
        }
    }, [variables, isFirstLoad]);

    const handleSelectVariable = async (id) => {
        if (selectedVarId === id && !isFirstLoad) return;
        setSelectedVarId(id);
        setIsLoading(true);
        try {
            const result = await getRecodedVariables.mutateAsync({ user: auth.user.userId, pageid: pageId });
            if (result?.success === "777" && result.resultjson) {
                const varData = result.resultjson[id];
                if (varData) {
                    setVarName(varData.id.replace('overview_', ''));
                    setVarLabel(varData.label || '');

                    if (varData.info && varData.info.length > 0) {
                        const newCategories = varData.info.map((item, idx) => ({
                            id: Date.now() + idx + Math.random(),
                            label: item.label || '',
                            conditionSets: parseLogicString(item.logic || '')
                        }));
                        setCategories(newCategories);
                    } else {
                        setCategories([{ id: Date.now(), label: '', conditionSets: [{ id: Date.now(), logicOp: 'AND', conditions: [{ varName: '', operator: '==', value: '' }] }] }]);
                    }
                }
            }
        } catch (error) {
            console.error("Failed to fetch variable details:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddNew = () => {
        setSelectedVarId(null);
        setVarName('');
        setVarLabel('');
        setCategories([{ id: Date.now(), label: '', conditionSets: [{ id: Date.now(), logicOp: 'AND', conditions: [{ varName: '', operator: '==', value: '' }] }] }]);
    };

    const handleAddCategory = () => {
        setCategories([...categories, { id: Date.now(), label: '', conditionSets: [{ id: Date.now(), logicOp: 'AND', conditions: [{ varName: '', operator: '==', value: '' }] }] }]);
    };

    const handleRemoveCategory = (catId) => {
        if (categories.length > 1) {
            setCategories(categories.filter(c => c.id !== catId));
        }
    };

    const handleUpdateCategoryLabel = (catIndex, label) => {
        const newCats = [...categories];
        newCats[catIndex].label = label;
        setCategories(newCats);
    };

    const handleConditionChange = (catIndex, setIndex, condIndex, field, value) => {
        const newCats = [...categories];
        newCats[catIndex].conditionSets[setIndex].conditions[condIndex][field] = value;
        setCategories(newCats);
    };

    const handleAddCondition = (catIndex, setIndex, condIndex) => {
        const newCats = [...categories];
        newCats[catIndex].conditionSets[setIndex].conditions.splice(condIndex + 1, 0, { varName: '', operator: '==', value: '' });
        setCategories(newCats);
    };

    const handleDeleteCondition = (catIndex, setIndex, condIndex) => {
        const newCats = [...categories];
        if (newCats[catIndex].conditionSets[setIndex].conditions.length === 1) {
            newCats[catIndex].conditionSets[setIndex].conditions = [{ varName: '', operator: '==', value: '' }];
        } else {
            newCats[catIndex].conditionSets[setIndex].conditions.splice(condIndex, 1);
        }
        setCategories(newCats);
    };

    const handleChangeSetLogicOp = (catIndex, setIndex, newOp) => {
        const newCats = [...categories];
        newCats[catIndex].conditionSets[setIndex].logicOp = newOp;
        setCategories(newCats);
    };

    const handleAddSet = (catIndex) => {
        const newCats = [...categories];
        newCats[catIndex].conditionSets.push({ id: Date.now(), logicOp: 'AND', conditions: [{ varName: '', operator: '==', value: '' }] });
        setCategories(newCats);
    };

    const handleDeleteSet = (catIndex, setIndex) => {
        const newCats = [...categories];
        if (newCats[catIndex].conditionSets.length > 1) {
            newCats[catIndex].conditionSets.splice(setIndex, 1);
            setCategories(newCats);
        }
    };

    const handleSave = async () => {
        if (!varName.trim()) {
            alert("변수 이름을 입력해주세요.");
            return;
        }
        const fullId = `overview_${varName.trim()}`;

        const payload = {
            user: auth.user.userId,
            pageid: pageId,
            variables: {
                [fullId]: {
                    id: fullId,
                    label: varLabel,
                    type: "categorical",
                    info: categories.map((cat, idx) => {
                        let categoryLogic = '';
                        cat.conditionSets.forEach((set) => {
                            const validConds = set.conditions
                                .filter(c => c.varName && c.value)
                                .map(c => `${c.varName} ${c.operator} ${c.value}`);

                            if (validConds.length > 0) {
                                const logicOpLower = (set.logicOp || 'AND').toLowerCase();
                                let setStr = validConds.length === 1 ? validConds[0] : `(${validConds.join(` ${logicOpLower} `).trim()})`;
                                if (categoryLogic === '') {
                                    categoryLogic = setStr;
                                } else {
                                    categoryLogic += ` AND ${setStr}`;
                                }
                            }
                        });

                        return {
                            index: idx + 1,
                            label: cat.label,
                            logic: categoryLogic.trim(),
                            value: idx + 1,
                            type: "categorical"
                        };
                    })
                }
            }
        };

        try {
            const result = await setRecodedVariable.mutateAsync(payload);
            if (result?.success === "777") {
                alert("저장되었습니다.");
                if (onSaved) onSaved();
                onSave(fullId, payload.variables[fullId].info[0]?.logic || '', varLabel);
            } else {
                alert(result?.message || "저장 실패");
            }
        } catch (error) {
            console.error("Save error:", error);
            alert("저장 중 오류가 발생했습니다.");
        }
    };

    const kendoVarOptions = variablesList.map(v => ({
        text: v.label ? `${v.sysName} (${v.label})` : v.sysName,
        value: v.sysName
    }));

    const operatorOptions = [
        { text: '== (같음)', value: '==' },
        { text: '!= (같지 않음)', value: '!=' },
        { text: '> (초과)', value: '>' },
        { text: '>= (이상)', value: '>=' },
        { text: '< (미만)', value: '<' },
        { text: '<= (이하)', value: '<=' },
        { text: 'in (포함)', value: 'in' },
        { text: 'not in (미포함)', value: 'not in' },
    ];

    return (
        <div className="advanced-filter-overlay-v4">
            <div className="advanced-filter-content-v4" onClick={(e) => e.stopPropagation()}>
                <div className="filter-popup-header-v4">
                    <div className="header-title-v4">
                        <h3>고급 필터</h3>
                        <p>데이터 검수를 위한 로직 조건을 설정하고 조건에 따라 응답 데이터를 필터링합니다.</p>
                    </div>
                    <div className="header-actions-v4">
                        <button className="guide-btn-v4">
                            가이드 보기
                        </button>
                        <button onClick={onClose} className="close-btn-v4"><X size={20} /></button>
                    </div>
                </div>

                <div className="filter-popup-container-v4">
                    {/* Sidebar */}
                    <div className="filter-sidebar-v4">
                        <div className="sidebar-header-v4">
                            <span>overview 변수 ({variables.length})</span>
                            <button className="add-new-btn-v4" onClick={handleAddNew}>
                                <Plus size={14} /> 새 변수
                            </button>
                        </div>
                        <div className="variable-list-v4">
                            {variables.map(v => (
                                <div
                                    key={v.id}
                                    className={`variable-item-v4 ${selectedVarId === v.id ? 'active' : ''}`}
                                    onClick={() => handleSelectVariable(v.id)}
                                >
                                    <div className="v-id">{v.id}</div>
                                    <div className="v-label">{v.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="filter-main-v4">
                        {isLoading ? (
                            <div className="filter-loading-v4">데이터를 불러오는 중...</div>
                        ) : (
                            <>
                                {/* Meta Fields */}
                                <div className="meta-config-v4">
                                    <div className="meta-input-group-v4">
                                        <label>변수 이름</label>
                                        <div className="id-input-v4">
                                            <span className="prefix">overview_</span>
                                            <input
                                                type="text"
                                                value={varName}
                                                onChange={(e) => setVarName(e.target.value)}
                                                placeholder="변수명"
                                            />
                                        </div>
                                    </div>
                                    <div className="meta-input-group-v4">
                                        <label>라벨</label>
                                        <input
                                            type="text"
                                            className="full-input-v4"
                                            value={varLabel}
                                            onChange={(e) => setVarLabel(e.target.value)}
                                            placeholder="라벨 입력"
                                        />
                                    </div>
                                </div>

                                {/* Filter Section */}
                                <div className="filter-card-v4">
                                    <div className="card-header-v4">
                                        <span className="card-title-v4">필터</span>
                                        <p className="card-desc-v4">필터 라벨과 조건을 입력하세요. 값은 저장 시 자동으로 순번이 부여됩니다.</p>
                                    </div>

                                    <div className="categories-list-area-v4">
                                        {categories.map((cat, catIndex) => (
                                            <div key={cat.id} className="filter-category-block-v4">
                                                <div className="category-meta-row-v4">
                                                    <div className="category-label-group-v4">
                                                        <label>필터 라벨</label>
                                                        <div className="category-input-wrapper-v4">
                                                            <input
                                                                type="text"
                                                                value={cat.label}
                                                                onChange={(e) => handleUpdateCategoryLabel(catIndex, e.target.value)}
                                                                placeholder="카테고리 라벨"
                                                            />
                                                            <button className="category-del-btn-v4" onClick={() => handleRemoveCategory(cat.id)}>
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="filter-logic-area-v4">
                                                    {cat.conditionSets.map((set, setIndex) => (
                                                        <div key={set.id} className="logic-set-box-v4">
                                                            <div className="set-header-v4">
                                                                <div className="logic-toggle-v4">
                                                                    <button
                                                                        className={set.logicOp === 'AND' ? 'active' : ''}
                                                                        onClick={() => handleChangeSetLogicOp(catIndex, setIndex, 'AND')}
                                                                    >AND</button>
                                                                    <button
                                                                        className={set.logicOp === 'OR' ? 'active' : ''}
                                                                        onClick={() => handleChangeSetLogicOp(catIndex, setIndex, 'OR')}
                                                                    >OR</button>
                                                                </div>
                                                                <div className="set-actions-v4">
                                                                    {cat.conditionSets.length > 1 && (
                                                                        <button className="set-del-btn-v4" onClick={() => handleDeleteSet(catIndex, setIndex)}>
                                                                            <Trash2 size={16} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="set-rules-v4">
                                                                {set.conditions.map((cond, condIndex) => (
                                                                    <div key={condIndex} className="condition-row-v4">
                                                                        <div className="field-var-v4">
                                                                            <DropDownList
                                                                                data={kendoVarOptions}
                                                                                textField="text"
                                                                                dataItemKey="value"
                                                                                placeholder="문항 선택"
                                                                                value={cond.varName ? (kendoVarOptions.find(item => item.value === cond.varName) || { text: cond.varName, value: cond.varName }) : null}
                                                                                onChange={(e) => handleConditionChange(catIndex, setIndex, condIndex, 'varName', e.value ? e.value.value : "")}
                                                                            />
                                                                        </div>
                                                                        <div className="field-op-v4">
                                                                            <DropDownList
                                                                                data={operatorOptions}
                                                                                textField="text"
                                                                                dataItemKey="value"
                                                                                placeholder="연산자"
                                                                                value={cond.operator ? (operatorOptions.find(op => op.value === cond.operator) || { text: cond.operator, value: cond.operator }) : null}
                                                                                onChange={(e) => handleConditionChange(catIndex, setIndex, condIndex, 'operator', e.value ? e.value.value : "")}
                                                                            />
                                                                        </div>
                                                                        <div className="field-val-v4">
                                                                            <input
                                                                                type="text"
                                                                                value={cond.value}
                                                                                onChange={(e) => handleConditionChange(catIndex, setIndex, condIndex, 'value', e.target.value)}
                                                                                placeholder="값 입력"
                                                                            />
                                                                        </div>
                                                                        <div className="row-actions-v4">
                                                                            <button className="icon-btn-v4 add" onClick={() => handleAddCondition(catIndex, setIndex, condIndex)}>
                                                                                <Plus size={16} />
                                                                            </button>
                                                                            <button className="icon-btn-v4 delete" onClick={() => handleDeleteCondition(catIndex, setIndex, condIndex)}>
                                                                                <Trash2 size={16} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <div className="add-set-row-v4">
                                                        <button className="add-set-btn-v4" onClick={() => handleAddSet(catIndex)}>
                                                            <Plus size={14} /> 조건 세트 추가
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="add-category-footer-v4">
                                        <button className="add-category-btn-v4" onClick={handleAddCategory}>
                                            <Plus size={16} /> 필터(카테고리) 추가
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="filter-popup-footer-v4">
                    <button onClick={onClose} className="btn-cancel-v4">취소</button>
                    <button onClick={handleSave} className="btn-apply-v4">적용</button>
                </div>
            </div>
        </div>
    );
};

export default AdvancedFilterPopup;
