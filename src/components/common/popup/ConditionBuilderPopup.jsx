import React, { useState, useEffect } from 'react';
import { Trash2, Plus, X, HelpCircle, Filter, Check, ChevronDown } from 'lucide-react';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { RecodingPageApi } from '@/services/dataStatus/app/recoding/RecodingPageApi';
import { VariablePageApi } from '@/services/dataStatus/app/variable/VariablePageApi';
import { modalContext } from "@/components/common/Modal.jsx";
import './ConditionBuilderPopup.css';

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
            // 오름차순 정렬 (숫자형 문자열일 경우 숫자 크기대로, 아닐 경우 사전순)
            newValues.sort((a, b) => {
                const numA = Number(a);
                const numB = Number(b);
                if (!isNaN(numA) && !isNaN(numB)) {
                    return numA - numB;
                }
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
            >
                <div className="multi-drop-val-cbp" style={{ color: selectedValues.length > 0 ? '#424242' : '#9ca3af' }} title={displayText}>{displayText}</div>
                <ChevronDown size={14} color="#64748b" style={{ flexShrink: 0, marginLeft: '4px' }} />
            </div>
            {isOpen && (
                <div className="multi-drop-menu-cbp">
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

const ConditionBuilderPopup = ({ variablesList = [], initialVariables = [], onClose, onSave, auth, pageId, onSaved, activeVariableId, onDeleteActive, hideSidebar = false, theme = 'default', title, initialLogic, saveMode = 'api', initialInfo }) => {
    const modal = React.useContext(modalContext);
    const { getRecodedList, getRecodedVariables, setRecodedVariable, deleteRecodedVariable } = RecodingPageApi();
    const { getOriginalVariables } = VariablePageApi();

    const [variables, setVariables] = useState(initialVariables);
    const [originalVars, setOriginalVars] = useState(variablesList);
    const [selectedVarId, setSelectedVarId] = useState(null);
    const [varName, setVarName] = useState('');
    const [varLabel, setVarLabel] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFirstLoad, setIsFirstLoad] = useState(true);
    const [showGuide, setShowGuide] = useState(false);
    const [selectedCatIndex, setSelectedCatIndex] = useState(0);

    const [categories, setCategories] = useState([
        {
            id: Date.now(),
            label: '',
            conditionSets: [{ id: Date.now(), logicOp: 'AND', conditions: [{ varName: '', operator: '==', value: '' }] }]
        }
    ]);
    const [categoryLogicOp, setCategoryLogicOp] = useState('AND');

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
                const matchNull = t.match(/^(.+?)\s+(IS\s+NOT\s+NULL|IS\s+NULL)$/i);
                if (matchNull) {
                    const op = matchNull[2].toLowerCase().replace(/\s+/g, ' ');
                    let rawVarName = matchNull[1].replace(/[()]/g, '').trim();
                    let ranks = [];
                    const rankMatch = rawVarName.match(/\[(.*?)\]$/);

                    if (rankMatch) {
                        const innerRanks = rankMatch[1].split(',').map(r => r.trim()).filter(r => r);
                        if (innerRanks.length > 0) {
                            ranks = innerRanks.map(r => `[${r}]`);
                            rawVarName = rawVarName.replace(/\[.*?\]$/, '');
                        }
                    }
                    return {
                        varName: rawVarName,
                        operator: op,
                        value: '',
                        ranks: ranks.length > 0 ? ranks : undefined
                    };
                }

                const match = t.match(/^(.+?)\s*(>=|<=|!=|==|=|>|<|IN|NOT\s+IN)\s*(.+)$/i);
                if (match) {
                    let op = match[2].toLowerCase().trim();
                    if (op === '=') op = '==';

                    let val = match[3].trim();
                    // in, not in인 경우 괄호/대괄호 완벽히 제거 후 표출
                    if (op === 'in' || op === 'not in') {
                        while ((val.startsWith('(') && val.endsWith(')')) || (val.startsWith('[') && val.endsWith(']'))) {
                            val = val.slice(1, -1).trim();
                        }
                    } else {
                        val = val.replace(/\)+$/, '').replace(/\]+$/, '').trim();
                    }

                    let rawVarName = match[1].replace(/[()]/g, '').trim();
                    let ranks = [];
                    const rankMatch = rawVarName.match(/\[(.*?)\]$/);

                    if (rankMatch) {
                        const innerRanks = rankMatch[1].split(',').map(r => r.trim()).filter(r => r);
                        if (innerRanks.length > 0) {
                            ranks = innerRanks.map(r => `[${r}]`);
                            rawVarName = rawVarName.replace(/\[.*?\]$/, '');
                        }
                    }

                    return {
                        varName: rawVarName,
                        operator: op,
                        value: val,
                        ranks: ranks.length > 0 ? ranks : undefined
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

        if (newSets.length === 0) return defaultState;

        const mergedSets = [];
        for (let i = 0; i < newSets.length; i++) {
            const currentSet = newSets[i];
            let merged = false;

            if (mergedSets.length > 0) {
                const prevSet = mergedSets[mergedSets.length - 1];
                if (currentSet.conditions.length === 1 &&
                    (prevSet.conditions.length === 1 || prevSet.logicOp === currentSet.connectorOp)) {

                    if (prevSet.conditions.length === 1) {
                        prevSet.logicOp = currentSet.connectorOp;
                    }

                    if (prevSet.logicOp === currentSet.connectorOp) {
                        prevSet.conditions.push(currentSet.conditions[0]);
                        merged = true;
                    }
                }
            }
            if (!merged) {
                mergedSets.push(currentSet);
            }
        }

        return mergedSets.length > 0 ? mergedSets : defaultState;
    };

    // Fetch variables list for sidebar
    const fetchList = async () => {
        if (!auth?.user?.userId || !pageId) return;
        try {
            const result = await getRecodedList.mutateAsync({ user: auth.user.userId, pageid: pageId });
            if (result?.success === "777" && result.resultjson) {
                const overviewVars = Object.values(result.resultjson)
                    .filter(v => v.id.startsWith('overview_'))
                    .map(v => ({ ...v, label: v.label || v.id }));
                setVariables(overviewVars);
            }
        } catch (error) {
            console.error("Failed to fetch recoded list:", error);
        }
    };

    useEffect(() => {
        if (initialVariables) {
            setVariables(initialVariables);
        }
    }, [initialVariables]);

    useEffect(() => {
        if (isFirstLoad && variables.length > 0) {
            handleSelectVariable(variables[0].id);
            setIsFirstLoad(false);
        } else if (hideSidebar && isFirstLoad && (initialLogic !== undefined || initialInfo !== undefined)) {
            setSelectedVarId('local_logic');
            setVarName('filter');

            let initialCategories = [];
            let initLogicOp = 'AND';

            if (initialLogic && typeof initialLogic === 'string') {
                if (initialLogic.includes(') or (') || initialLogic.includes(') OR (')) {
                    initLogicOp = 'OR';
                }
            }

            if (initialInfo && initialInfo.length > 0) {
                initialCategories = initialInfo.map((item, idx) => ({
                    id: Date.now() + idx + Math.random(),
                    label: item.label || '',
                    conditionSets: parseLogicString(item.logic || '')
                }));
            } else {
                const parsedSets = parseLogicString(initialLogic || '');
                if (parsedSets.length > 0) {
                    if (parsedSets.length > 1) initLogicOp = parsedSets[1].connectorOp || 'AND';
                    initialCategories = parsedSets.map((set, idx) => ({
                        id: Date.now() + idx + Math.random(),
                        label: parsedSets.length > 1 ? `필터 조건 ${idx + 1}` : '필터 조건',
                        conditionSets: [set]
                    }));
                } else {
                    initialCategories = [{
                        id: Date.now(),
                        label: '필터 조건',
                        conditionSets: [{ id: Date.now(), logicOp: 'AND', conditions: [{ varName: '', operator: '==', value: '' }] }]
                    }];
                }
            }

            setCategoryLogicOp(initLogicOp);
            setCategories(initialCategories);
            setIsFirstLoad(false);
        }
    }, [variables, isFirstLoad, hideSidebar, initialLogic, initialInfo]);

    const handleSelectVariable = async (id) => {
        if (!id || id === 'new') return;
        if (selectedVarId === id) return; // Prevent resetting ongoing edits
        setSelectedVarId(id);

        // Find in local state first to see if we already have the information (to avoid redundant API calls)
        const localData = variables.find(v => v.id === id);
        if (localData && localData.info && localData.info.length > 0) {
            setVarName(localData.id.replace('overview_', ''));
            setVarLabel(localData.label || '');
            const newCategories = localData.info.map((item, idx) => ({
                id: Date.now() + idx + Math.random(),
                label: item.label || '',
                conditionSets: parseLogicString(item.logic || '')
            }));
            setCategories(newCategories);
            return;
        }

        setIsLoading(true);
        try {
            const result = await getRecodedVariables.mutateAsync({ user: auth.user.userId, pageid: pageId, variable_id: [id] });
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
        setSelectedCatIndex(0);
        setCategories([{
            id: Date.now(),
            label: '',
            conditionSets: [{ id: Date.now(), logicOp: 'AND', connectorOp: 'AND', conditions: [{ varName: '', operator: '==', value: '' }] }]
        }]);
    };

    const handleDeleteVariable = (varId, filterLabel) => {
        const displayName = filterLabel || varId;
        modal.showConfirm("삭제", `'${displayName}' 필터를 삭제하시겠습니까?`, {
            btns: [
                { title: "취소", click: () => { } },
                {
                    title: "삭제", click: async () => {
                        try {
                            const result = await deleteRecodedVariable.mutateAsync({
                                user: auth.user.userId,
                                pageid: pageId,
                                variables: [varId]
                            });
                            if (result?.success === "777") {
                                modal.showAlert("성공", "삭제되었습니다.");
                                if (onSaved) onSaved();

                                const remainingVars = variables.filter(v => v.id !== varId);
                                setVariables(remainingVars);
                                if (remainingVars.length > 0) {
                                    handleSelectVariable(remainingVars[0].id);
                                } else {
                                    handleAddNew();
                                }

                                if (activeVariableId === varId && onDeleteActive) {
                                    onDeleteActive();
                                }
                            } else {
                                modal.showAlert("오류", result?.message || "삭제 실패");
                            }
                        } catch (error) {
                            console.error("Delete error:", error);
                            modal.showAlert("오류", "삭제 중 오류가 발생했습니다.");
                        }
                    }
                }
            ]
        });
    };

    const handleToggleGuide = () => {
        setShowGuide(!showGuide);
    };

    const handleAddCategory = () => {
        setCategories([...categories, { id: Date.now(), label: '', conditionSets: [{ id: Date.now(), logicOp: 'AND', conditions: [{ varName: '', operator: '==', value: '' }] }] }]);
        setSelectedCatIndex(categories.length);
    };

    const handleRemoveCategory = (catId) => {
        setCategories(categories.filter(c => c.id !== catId));
        setSelectedCatIndex(0);
    };

    const handleUpdateCategoryLabel = (catIndex, label) => {
        const newCats = [...categories];
        newCats[catIndex].label = label;
        setCategories(newCats);
    };

    const handleConditionChange = (catIndex, setIndex, condIndex, field, value) => {
        const newCats = [...categories];
        if (field === 'operator' && newCats[catIndex].conditionSets[setIndex].conditions[condIndex].operator !== value) {
            newCats[catIndex].conditionSets[setIndex].conditions[condIndex].value = '';
        }
        newCats[catIndex].conditionSets[setIndex].conditions[condIndex][field] = value;
        setCategories(newCats);
    };

    const handleToggleRank = (catIndex, setIndex, condIndex, rankVal) => {
        const newCats = [...categories];
        const cond = newCats[catIndex].conditionSets[setIndex].conditions[condIndex];

        let baseName = cond.varName;
        if (!cond.ranks) {
            cond.ranks = [];
            const match = cond.varName.match(/\[.*\]$/);
            if (match) {
                cond.ranks.push(match[0]);
                baseName = cond.varName.replace(/\[.*\]$/, '');
                cond.varName = baseName;
            }
        }

        if (cond.ranks.includes(rankVal)) {
            cond.ranks = cond.ranks.filter(r => r !== rankVal);
        } else {
            cond.ranks.push(rankVal);
            cond.ranks.sort();
        }
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
        newCats[catIndex].conditionSets.push({
            id: Date.now(),
            logicOp: 'AND',
            connectorOp: 'AND',
            conditions: [{ varName: '', operator: '==', value: '' }]
        });
        setCategories(newCats);
    };

    const handleChangeConnectorOp = (catIndex, setIndex, newOp) => {
        const newCats = [...categories];
        newCats[catIndex].conditionSets[setIndex].connectorOp = newOp;
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
        if (saveMode === 'api' && !varLabel.trim()) {
            modal.showAlert("알림", "필터명을 입력해 주세요.");
            return;
        }

        const missingCatLabel = categories.some(cat => !cat.label.trim());
        if (missingCatLabel) {
            modal.showAlert("알림", "모든 그룹명을 입력해 주세요.");
            return;
        }

        let currentVarName = varName;
        if (saveMode === 'api' && !currentVarName.trim()) {
            currentVarName = `var_${Date.now()}`;
            setVarName(currentVarName);
        }

        const hasValidCondition = categories.some(cat =>
            cat.conditionSets.some(set =>
                set.conditions.some(c => c.varName && (c.value || c.operator.toLowerCase().includes('null')))
            )
        );
        if (!hasValidCondition) {
            if (saveMode === 'callback') {
                modal.showConfirm("알림", "설정된 조건이 없습니다.\n로직을 초기화(삭제)하시겠습니까?", {
                    btns: [
                        { title: "취소", click: () => { } },
                        { title: "확인", click: () => { if (onSave) onSave('filter', '', varLabel); } }
                    ]
                });
                return;
            } else {
                modal.showAlert("알림", "설정된 조건이 없습니다.");
                return;
            }
        }

        const fullId = `overview_${currentVarName.trim()}`;

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
                        cat.conditionSets.forEach((set, setIndex) => {
                            const validConds = set.conditions
                                .filter(c => c.varName && (c.value || c.operator.toLowerCase().includes('null')))
                                .map(c => {
                                    const opLower = c.operator.toLowerCase();
                                    let val = (c.value || '').trim();
                                    // in, not in인 경우 대괄호 감싸기
                                    if (opLower === 'in' || opLower === 'not in') {
                                        let cleanVal = val;
                                        while ((cleanVal.startsWith('(') && cleanVal.endsWith(')')) || (cleanVal.startsWith('[') && cleanVal.endsWith(']'))) {
                                            cleanVal = cleanVal.slice(1, -1).trim();
                                        }
                                        val = `[${cleanVal}]`;
                                    }

                                    let currentRanks = c.ranks;
                                    let baseName = c.varName;
                                    if (!currentRanks) {
                                        const match = c.varName.match(/\[.*\]$/);
                                        if (match) {
                                            currentRanks = [match[0]];
                                            baseName = c.varName.replace(/\[.*\]$/, '');
                                        } else {
                                            currentRanks = [];
                                        }
                                    } else {
                                        baseName = c.varName.replace(/\[.*\]$/, '');
                                    }

                                    if (currentRanks && currentRanks.length > 0) {
                                        // "q70[0,1] in [10]" 형태로 포맷
                                        const combinedRanks = currentRanks.map(r => r.replace('[', '').replace(']', '')).join(',');
                                        return `${baseName}[${combinedRanks}] ${opLower}${val ? ` ${val}` : ''}`;
                                    }

                                    return `${baseName} ${opLower}${val ? ` ${val}` : ''}`;
                                });

                            if (validConds.length > 0) {
                                const logicOpLower = (set.logicOp || 'AND').toLowerCase();
                                let setStr = validConds.length === 1 ? validConds[0] : `(${validConds.join(` ${logicOpLower} `).trim()})`;

                                if (categoryLogic === '') {
                                    categoryLogic = setStr;
                                } else {
                                    const connector = (set.connectorOp || 'AND').toLowerCase();

                                    // If we are combining condition sets, wrap the entire expression in ()
                                    // only if the leftPart isn't ALREADY fully wrapped, or if we want to build a flat list
                                    // The user requested: ((q20 not in [10] and q35 == 70) or (q55 <= 70 or q40 == 140)) and q50 == 20
                                    // Let's create `(A connector B)`
                                    categoryLogic = `(${categoryLogic} ${connector} ${setStr})`;
                                }
                            }
                        });

                        let finalLogic = categoryLogic.trim();
                        let unwrap = false;
                        if (finalLogic.startsWith('(') && finalLogic.endsWith(')')) {
                            let openCount = 0;
                            unwrap = true;
                            for (let i = 0; i < finalLogic.length - 1; i++) {
                                if (finalLogic[i] === '(') openCount++;
                                else if (finalLogic[i] === ')') openCount--;
                                if (openCount === 0) {
                                    unwrap = false;
                                    break;
                                }
                            }
                        }
                        if (unwrap) {
                            finalLogic = finalLogic.slice(1, -1).trim();
                        }

                        return {
                            index: idx + 1,
                            value: idx + 1,
                            label: cat.label,
                            label2: "",
                            label3: "",
                            logic: finalLogic,
                            type: "categorical"
                        };
                    })
                }
            }
        };

        const totalLogic = payload.variables[fullId].info
            .map(item => item.logic)
            .filter(logic => logic !== '')
            .map(logic => `(${logic})`)
            .join(` ${categoryLogicOp.toLowerCase()} `);

        modal.showConfirm("확인",
            `다음 로직으로 ${saveMode === 'callback' ? '적용' : '저장'}하시겠습니까?\n\n${totalLogic || "조건 없음"}`,
            {
                btns: [
                    { title: "취소", click: () => { } },
                    {
                        title: saveMode === 'callback' ? "적용" : "저장", click: async () => {
                            if (saveMode === 'callback') {
                                if (onSave) onSave('filter', totalLogic, varLabel, payload.variables[fullId].info);
                                return;
                            }
                            try {
                                const result = await setRecodedVariable.mutateAsync(payload);
                                if (result?.success === "777") {
                                    modal.showAlert("알림", "저장되었습니다.");
                                    setSelectedVarId(fullId); // 신규 저장 후 해당 변수 선택 상태로 변경

                                    if (onSave) {
                                        onSave(fullId, totalLogic, varLabel);
                                    } else if (onSaved) {
                                        onSaved();
                                    }
                                } else {
                                    modal.showAlert("알림", result?.message || "저장 실패");
                                }
                            } catch (error) {
                                console.error("Save error:", error);
                                modal.showAlert("알림", "저장 중 오류가 발생했습니다.");
                            }
                        }
                    }
                ]
            }
        );
    };

    const activeList = variablesList;
    const kendoVarOptions = [];
    activeList.forEach(v => {
        const rawType = (v.type || '').toLowerCase();
        let color = v.color || 'default';
        if (!v.color && v.type) {
            if (rawType.includes('single')) color = 'single';
            else if (rawType.includes('multi')) color = 'multi';
            else if (rawType.includes('dummy')) color = 'dummy';
            else if (rawType.includes('open')) color = 'open';
        }

        kendoVarOptions.push({
            text: v.label ? `${v.sysName || v.id} (${v.label})` : (v.sysName || v.id),
            value: v.sysName || v.id,
            type: v.type,
            color: color,
            info: v.info || v.labels
        });
    });

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

    return (
        <div className={`advanced-filter-overlay-cbp theme-${theme}`}>
            <div className="advanced-filter-content-cbp" onClick={(e) => e.stopPropagation()}>
                <div className="filter-popup-header-cbp">
                    <div className="header-title-cbp">
                        <h3>{title || '필터 문항 설정'}</h3>
                        {saveMode === 'api' && (
                            <p>이곳에서 만드는 변수 ID는 항상 overview_* 형태로 저장됩니다. 저장 후 필터 문항 선택에서 바로 선택할 수 있습니다.</p>
                        )}
                    </div>
                    <div className="header-actions-cbp">
                        {/* <button className={`guide-btn-cbp ${showGuide ? 'active' : ''}`} onClick={handleToggleGuide}>
                            <HelpCircle size={16} /> {showGuide ? '가이드 닫기' : '가이드 보기'}
                        </button> */}
                        <button onClick={onClose} className="close-btn-cbp"><X size={20} /></button>
                    </div>
                </div>

                {showGuide && (
                    <div className="guide-section-wrap-cbp">
                        <div className="guide-section-cbp">
                            <div className="guide-card-cbp">
                                <h5>조건 설정</h5>
                                <p>각 조건은 <strong>변수 + 연산자 + 값</strong>으로 구성됩니다.</p>
                                <p>조건 세트 내에서 <strong>AND</strong> 또는 <strong>OR</strong>로 연결할 수 있습니다.</p>
                                <p className="guide-tip-cbp">AND: 모든 조건 만족 | OR: 하나 이상 만족</p>
                            </div>
                            <div className="guide-card-cbp">
                                <h5>조건 세트</h5>
                                <p>복잡한 로직을 위해 여러 조건 세트를 생성 가능합니다.</p>
                                <p>조건 세트 간에도 <strong>AND</strong> 또는 <strong>OR</strong>로 연결됩니다.</p>
                                <p className="guide-tip-cbp">예시: (Q1=1 OR Q2=2) AND (Q3&gt;5 OR Q4&lt;10)</p>
                            </div>
                            <div className="guide-card-cbp">
                                <h5>연산자</h5>
                                <p><strong>==</strong>: 같음 | <strong>!=</strong>: 같지 않음</p>
                                <p><strong>&gt;, &gt;=, &lt;, &lt;=</strong>: 크기 비교 (숫자)</p>
                                <p><strong>in / not in</strong>: 여러 값 포함/제외 (예: 1,2,3)</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="filter-popup-container-cbp">
                    {/* Column 1: 필터문항목록 (Variables) */}
                    {!hideSidebar && (
                        <div className="col-cbp col-vars">
                            <div className="col-header-cbp">
                                <span>필터 문항 목록</span>
                                <button className="add-btn-cbp" onClick={handleAddNew}><Plus size={16} /></button>
                            </div>
                            <div className="col-list-cbp">
                                {variables.map(v => {
                                    const infoLength = v.info ? v.info.length : 1;
                                    const isSelected = selectedVarId === v.id;
                                    const displayLabel = isSelected && varLabel ? varLabel : (v.label || v.id);
                                    const displayGroupsCount = isSelected ? categories.length : infoLength;

                                    return (
                                        <div
                                            key={v.id}
                                            className={`list-item-cbp ${isSelected ? 'active' : ''}`}
                                            onClick={() => handleSelectVariable(v.id)}
                                        >
                                            <div className="item-text-cbp">
                                                {isSelected ? (
                                                    <>
                                                        <div className="item-title-cbp" style={{ fontSize: '11px', color: '#64748b', fontWeight: '500', marginBottom: '4px' }}>
                                                            {/* {v.id || '새 변수'} */}
                                                        </div>
                                                        <input
                                                            className="inline-input-cbp"
                                                            value={varLabel}
                                                            onChange={e => setVarLabel(e.target.value)}
                                                            onClick={e => e.stopPropagation()}
                                                            placeholder="필터명 입력"
                                                        />
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="item-title-cbp" style={{ fontSize: '11px', color: '#64748b', fontWeight: '500', marginBottom: '2px' }}>
                                                            {/* {v.id} */}
                                                        </div>
                                                        <div className="item-title-cbp">{v.label}</div>
                                                    </>
                                                )}
                                                <div className="item-info-cbp">{displayGroupsCount}개 그룹</div>
                                            </div>
                                            <button className="del-btn-cbp" onClick={(e) => { e.stopPropagation(); handleDeleteVariable(v.id, v.label); }}><X size={14} color="#94a3b8" /></button>
                                        </div>
                                    );
                                })}
                                {(!selectedVarId && (!isFirstLoad || variables.length === 0)) && (
                                    <div className="list-item-cbp active">
                                        <div className="item-text-cbp">
                                            <input
                                                autoFocus
                                                className="inline-input-cbp"
                                                value={varLabel}
                                                onChange={e => setVarLabel(e.target.value)}
                                                placeholder="필터명 입력"
                                            />
                                            <div className="item-info-cbp">{categories.length}개 그룹</div>
                                        </div>
                                        <button className="del-btn-cbp" onClick={(e) => {
                                            e.stopPropagation();
                                            if (variables.length > 0) {
                                                handleSelectVariable(variables[0].id);
                                            } else {
                                                handleAddNew();
                                            }
                                        }}><X size={14} color="#ef4444" /></button>
                                    </div>
                                )}
                            </div>
                            {/* <div className="col-footer-cbp">
                            <button className="dash-add-btn-cbp" onClick={handleAddNew}>
                                <Plus size={14} /> 그룹 추가 ({variables.length}/10)
                            </button>
                        </div> */}
                        </div>
                    )}

                    {/* Column 2: 필터 그룹 (Categories) */}
                    <div className="col-cbp col-cats">
                        <div className="col-header-cbp cats-header-cbp">
                            <span>필터 그룹</span>
                            <div className="cats-header-actions-cbp">
                                <div className="cond-logic-toggle-cbp mini">
                                    <button
                                        className={categoryLogicOp === 'AND' ? 'active' : ''}
                                        onClick={() => setCategoryLogicOp('AND')}
                                    >AND</button>
                                    <button
                                        className={categoryLogicOp === 'OR' ? 'active' : ''}
                                        onClick={() => setCategoryLogicOp('OR')}
                                    >OR</button>
                                </div>
                                <button className="add-btn-cbp" onClick={handleAddCategory}><Plus size={16} /></button>
                            </div>
                        </div>
                        <div className="col-list-cbp pad-inside">
                            {isLoading ? (
                                <div className="loading-cbp">데이터를 불러오는 중...</div>
                            ) : (
                                categories.map((cat, idx) => (
                                    <div
                                        key={cat.id}
                                        className={`list-item-cbp cat-item-cbp ${selectedCatIndex === idx ? 'active' : ''}`}
                                        onClick={() => setSelectedCatIndex(idx)}
                                    >
                                        <div className="item-text-cbp">
                                            {selectedCatIndex === idx ? (
                                                <input
                                                    className="inline-input-cbp"
                                                    value={cat.label}
                                                    onChange={e => handleUpdateCategoryLabel(idx, e.target.value)}
                                                    placeholder="그룹명 입력"
                                                />
                                            ) : (
                                                <div className="item-title-cbp">{cat.label || `새 그룹 ${idx + 1}`}</div>
                                            )}
                                            <div className="item-info-cbp count-text">{cat.conditionSets.reduce((acc, set) => acc + set.conditions.length, 0)}개</div>
                                        </div>
                                        <button className="del-btn-cbp" onClick={(e) => { e.stopPropagation(); handleRemoveCategory(cat.id); }}>
                                            <X size={14} color="#94a3b8" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Column 3: 조건 설정 (Condition Sets) */}
                    <div className="col-cbp col-conds">
                        {isLoading ? (
                            <div className="loading-cbp">데이터를 불러오는 중...</div>
                        ) : categories[selectedCatIndex] ? (
                            <>
                                <div className="cond-header-cbp">
                                    <div className="cond-title-cbp">
                                        <h3>{categories[selectedCatIndex].label || `새 그룹 ${selectedCatIndex + 1}`}</h3>
                                        <p>조건을 입력하여 데이터를 필터링합니다.</p>
                                    </div>
                                    <div className="cond-logic-toggle-cbp">
                                        <button
                                            className={categories[selectedCatIndex].conditionSets[0]?.logicOp === 'AND' ? 'active' : ''}
                                            onClick={() => handleChangeSetLogicOp(selectedCatIndex, 0, 'AND')}
                                        >AND</button>
                                        <button
                                            className={categories[selectedCatIndex].conditionSets[0]?.logicOp === 'OR' ? 'active' : ''}
                                            onClick={() => handleChangeSetLogicOp(selectedCatIndex, 0, 'OR')}
                                        >OR</button>
                                    </div>
                                </div>

                                <div className="cond-body-cbp">
                                    {categories[selectedCatIndex].conditionSets.map((set, setIndex) => (
                                        <div key={set.id} className="cond-set-box-cbp">
                                            {setIndex > 0 && (
                                                <div className="set-connector-cbp">
                                                    <div className="connector-toggle-cbp">
                                                        <span className={set.connectorOp === 'AND' ? 'active' : ''} onClick={() => handleChangeConnectorOp(selectedCatIndex, setIndex, 'AND')}>AND</span>
                                                        <span className={set.connectorOp === 'OR' ? 'active' : ''} onClick={() => handleChangeConnectorOp(selectedCatIndex, setIndex, 'OR')}>OR</span>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="cond-wrapper-cbp">
                                                {set.conditions.map((cond, condIndex) => (
                                                    <div key={condIndex} className="cond-row-cbp">
                                                        {(() => {
                                                            const matchedVar = kendoVarOptions.find(item => item.value === cond.varName);
                                                            let showRankToggles = false;
                                                            let isOpenVar = false;
                                                            let opts = [];
                                                            if (matchedVar) {
                                                                const rawType = (matchedVar.type || '').toLowerCase();
                                                                if ((rawType.includes('multi') || rawType.includes('rank')) && ['in', 'not in'].includes(cond.operator)) {
                                                                    showRankToggles = true;
                                                                }
                                                                if (rawType.includes('open')) {
                                                                    isOpenVar = true;
                                                                }
                                                                if (matchedVar.info && Array.isArray(matchedVar.info)) {
                                                                    opts = matchedVar.info.filter(o => o.label).map(o => ({ value: o.value || o.code, label: o.label }));
                                                                }
                                                            }
                                                            return (
                                                                <>
                                                                    <div className="cond-var">
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
                                                                                const newCats = [...categories];
                                                                                newCats[selectedCatIndex].conditionSets[setIndex].conditions[condIndex].varName = newVarName;

                                                                                const currentOp = cond.operator;
                                                                                const validOps = getOperatorOptions(newVarName);
                                                                                if (newVarName && currentOp && !validOps.find(op => op.value === currentOp)) {
                                                                                    newCats[selectedCatIndex].conditionSets[setIndex].conditions[condIndex].operator = validOps.length > 0 ? validOps[0].value : "";
                                                                                }
                                                                                setCategories(newCats);
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <div className="cond-op" style={{ flex: showRankToggles ? 1.7 : 2, minWidth: showRankToggles ? '120px' : '160px', transition: 'all 0.2s' }}>
                                                                        <DropDownList
                                                                            data={getOperatorOptions(cond.varName)}
                                                                            textField="text"
                                                                            dataItemKey="value"
                                                                            defaultItem={{ text: "연산자", value: "" }}
                                                                            valueRender={DropDownValueRender}
                                                                            value={cond.operator ? (getOperatorOptions(cond.varName).find(op => op.value === cond.operator) || { text: cond.operator, value: cond.operator }) : { text: "연산자", value: "" }}
                                                                            onChange={(e) => handleConditionChange(selectedCatIndex, setIndex, condIndex, 'operator', e.value ? e.value.value : "")}
                                                                        />
                                                                    </div>
                                                                    <div className="cond-val" style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: showRankToggles ? 3.5 : 2, transition: 'all 0.2s' }}>
                                                                        {!['is null', 'is not null'].includes(cond.operator) && (
                                                                            <>
                                                                                {(!isOpenVar && opts.length > 0) ? (
                                                                                    <MultiCheckboxDropdown
                                                                                        options={opts}
                                                                                        valueStr={cond.value}
                                                                                        isSingle={cond.operator && !['in', 'not in'].includes(cond.operator)}
                                                                                        onChange={(val) => handleConditionChange(selectedCatIndex, setIndex, condIndex, 'value', val)}
                                                                                    />
                                                                                ) : (
                                                                                    <input
                                                                                        type="text"
                                                                                        style={{ flex: 1, minWidth: '80px', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0 8px', height: '36px', boxSizing: 'border-box', outline: 'none' }}
                                                                                        value={cond.value}
                                                                                        onChange={(e) => {
                                                                                            let val = e.target.value;
                                                                                            if (cond.operator && !['in', 'not in'].includes(cond.operator)) {
                                                                                                val = val.replace(/,/g, '');
                                                                                            }
                                                                                            handleConditionChange(selectedCatIndex, setIndex, condIndex, 'value', val);
                                                                                        }}
                                                                                        placeholder="값 입력"
                                                                                    />
                                                                                )}
                                                                                {showRankToggles && (() => {
                                                                                    let currentRanks = cond.ranks || [];
                                                                                    if (!cond.ranks) {
                                                                                        const match = cond.varName.match(/\[.*\]$/);
                                                                                        if (match) currentRanks = [match[0]];
                                                                                    }
                                                                                    return (
                                                                                        <div className="rank-toggles-cbp" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px 4px 12px', borderRadius: '20px', flexShrink: 0 }}>
                                                                                            <span className="rank-toggles-label-cbp" style={{ fontSize: '11px', fontWeight: '700' }}>순위</span>
                                                                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                                                                <button
                                                                                                    className={`rank-circle-btn-cbp ${currentRanks.includes('[0]') ? 'active' : ''}`}
                                                                                                    onClick={() => handleToggleRank(selectedCatIndex, setIndex, condIndex, '[0]')}
                                                                                                >1</button>
                                                                                                <button
                                                                                                    className={`rank-circle-btn-cbp ${currentRanks.includes('[1]') ? 'active' : ''}`}
                                                                                                    onClick={() => handleToggleRank(selectedCatIndex, setIndex, condIndex, '[1]')}
                                                                                                >2</button>
                                                                                                <button
                                                                                                    className={`rank-circle-btn-cbp ${currentRanks.includes('[2]') ? 'active' : ''}`}
                                                                                                    onClick={() => handleToggleRank(selectedCatIndex, setIndex, condIndex, '[2]')}
                                                                                                >3</button>
                                                                                                <button
                                                                                                    className={`rank-circle-btn-cbp ${currentRanks.includes('[-1]') ? 'active' : ''}`}
                                                                                                    style={{ width: 'auto', padding: '0 8px', borderRadius: '12px' }}
                                                                                                    onClick={() => handleToggleRank(selectedCatIndex, setIndex, condIndex, '[-1]')}
                                                                                                >마지막</button>
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })()}
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                    <div className="cond-actions">
                                                                        <button className="icon-btn-cbp add" onClick={() => handleAddCondition(selectedCatIndex, setIndex, condIndex)}>
                                                                            <Plus size={14} color="#3b82f6" strokeWidth={3} />
                                                                        </button>
                                                                        <button className="icon-btn-cbp delete" onClick={() => handleDeleteCondition(selectedCatIndex, setIndex, condIndex)}>
                                                                            <X size={14} color="#ef4444" strokeWidth={3} />
                                                                        </button>
                                                                    </div>
                                                                </>
                                                            );
                                                        })()
                                                        }
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="empty-cond-cbp">필터 그룹을 선택해주세요.</div>
                        )}
                    </div>
                </div>

                <div className="filter-popup-footer-cbp">
                    {/* <button className="btn-delete-all-cbp" onClick={() => selectedVarId && handleDeleteVariable(selectedVarId)}>전체 삭제</button> */}
                    <div className="footer-right-cbp">
                        <button className="btn-cancel-cbp" onClick={onClose}>취소</button>
                        <button className="btn-apply-cbp" onClick={handleSave}>저장</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConditionBuilderPopup;
