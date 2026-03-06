import React, { useState, useEffect, useContext } from 'react';
import { Trash2, Plus, Sparkles, HelpCircle } from 'lucide-react';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { modalContext } from "@/components/common/Modal.jsx";
import './MapManagementPage.css';

const LogicEditPopup = ({ variable, variablesList, onClose, onSave }) => {
    const modal = useContext(modalContext);
    const [conditionSets, setConditionSets] = useState([
        { id: Date.now(), logicOp: 'AND', connectorOp: 'AND', conditions: [{ varName: '', operator: '==', value: '' }] }
    ]);
    const [aiPrompt, setAiPrompt] = useState('');
    const [showGuide, setShowGuide] = useState(false);

    const parseLogicString = (logicStr) => {
        const defaultState = [
            { id: Date.now(), logicOp: 'AND', connectorOp: 'AND', conditions: [{ varName: '', operator: '==', value: '' }] }
        ];
        if (!logicStr || logicStr.trim() === '') return defaultState;

        const newSets = [];
        let currentSetStr = '';
        let depth = 0;
        let lastConnector = 'AND';

        // 최상위 AND / OR 를 기준으로 조건 세트(Set) 분리
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
            // "(A = 1 AND B = 2)" 형태의 괄호 벗기기
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
                // IN, NOT IN 연산자 포함 파싱 정규식
                const match = t.match(/^(.+?)\s*(>=|<=|!=|==|=|>|<|IN|NOT\s+IN)\s*(.+)$/i);
                if (match) {
                    let op = match[2].toUpperCase().trim();
                    if (op === '==') op = '=';

                    return {
                        varName: match[1].replace(/[()]/g, '').trim(), // 불필요한 괄호 찌꺼기 제거
                        operator: op,
                        value: match[3].replace(/\)+$/, '').trim() // 끝에 남은 괄호 제거
                    };
                }
                return { varName: t.replace(/[()]/g, '').trim(), operator: '==', value: '' };
            }).filter(c => c.varName !== '');

            if (parsedConditions.length === 0) {
                parsedConditions.push({ varName: '', operator: '=', value: '' });
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

    useEffect(() => {
        if (variable) {
            const parsedSets = parseLogicString(variable.logic);
            setConditionSets(parsedSets);
        }
    }, [variable]);

    // Handle updates inside a single condition rule
    const handleConditionChange = (setIndex, condIndex, field, value) => {
        const newSets = [...conditionSets];
        newSets[setIndex].conditions[condIndex][field] = value;
        setConditionSets(newSets);
    };

    const handleAddCondition = (setIndex, condIndex) => {
        const newSets = [...conditionSets];
        newSets[setIndex].conditions.splice(condIndex + 1, 0, { varName: '', operator: '==', value: '' });
        setConditionSets(newSets);
    };

    const handleDeleteCondition = (setIndex, condIndex) => {
        const newSets = [...conditionSets];
        if (newSets[setIndex].conditions.length === 1) {
            newSets[setIndex].conditions = [{ varName: '', operator: '==', value: '' }];
        } else {
            newSets[setIndex].conditions.splice(condIndex, 1);
        }
        setConditionSets(newSets);
    };

    const handleChangeSetLogicOp = (setIndex, newOp) => {
        const newSets = [...conditionSets];
        newSets[setIndex].logicOp = newOp;
        setConditionSets(newSets);
    };

    const handleChangeConnectorOp = (setIndex, newOp) => {
        const newSets = [...conditionSets];
        newSets[setIndex].connectorOp = newOp;
        setConditionSets(newSets);
    };

    const handleAddConditionSet = () => {
        setConditionSets([
            ...conditionSets,
            { id: Date.now(), logicOp: 'AND', connectorOp: 'AND', conditions: [{ varName: '', operator: '==', value: '' }] }
        ]);
    };

    const handleDeleteSet = (setIndex) => {
        if (conditionSets.length === 1) {
            // Just reset the single set if it's the only one left
            setConditionSets([
                { id: Date.now(), logicOp: 'AND', connectorOp: 'AND', conditions: [{ varName: '', operator: '==', value: '' }] }
            ]);
            return;
        }
        setConditionSets(conditionSets.filter((_, i) => i !== setIndex));
    };

    const handleSave = () => {
        let logicString = '';
        conditionSets.forEach((set, i) => {
            const validConds = set.conditions
                .filter(c => c.varName && c.value)
                .map(c => `${c.varName} ${c.operator} ${c.value}`);

            if (validConds.length > 0) {
                const logicOpLower = (set.logicOp || 'AND').toLowerCase();
                const connectorOpLower = (set.connectorOp || 'AND').toLowerCase();
                let setStr = validConds.length === 1 ? validConds[0] : `(${validConds.join(` ${logicOpLower} `).trim()})`;
                if (logicString === '') {
                    logicString = setStr;
                } else {
                    logicString += ` ${connectorOpLower} ${setStr}`;
                }
            }
        });

        const finalLogicString = logicString.trim();

        if (finalLogicString === '') {
            modal.showConfirm("알림", "설정된 조건이 없습니다.\n로직을 초기화(삭제)하시겠습니까?", {
                btns: [
                    { title: "취소", click: () => { } },
                    { title: "확인", click: () => { onSave(variable?.id, ''); } }
                ]
            });
        } else {
            modal.showConfirm("알림", `${finalLogicString}\n\n위 로직을 적용하시겠습니까?`, {
                btns: [
                    { title: "취소", click: () => { } },
                    { title: "확인", click: () => { onSave(variable?.id, finalLogicString); } }
                ]
            });
        }
    };

    const varOptions = variablesList || [];
    const kendoVarOptions = varOptions.map(v => ({
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
        // { text: '= (같음)', value: '=' },
        // { text: '≠ (같지않음)', value: '!=' },
        // { text: '> (초과)', value: '>' },
        // { text: '≥ (이상)', value: '>=' },
        // { text: '< (미만)', value: '<' },
        // { text: '≤ (이하)', value: '<=' },
        // { text: 'IN (포함)', value: 'IN' },
        // { text: 'NOT IN (미포함)', value: 'NOT IN' }
    ];

    return (
        <div className="variable-modal-overlay">
            <div className="variable-modal-content logic-popup-content-new" onClick={(e) => e.stopPropagation()}>
                <div className="logic-popup-header-v2">
                    <div className="logic-popup-title-area">
                        <h3>로직 검수 설정 - {variable?.sysName}</h3>
                        <p>데이터 검수를 위한 로직 조건을 설정하고 조건에 따라 응답 데이터를 필터링합니다.</p>
                    </div>
                    <div className="logic-popup-actions">
                        <button className="logic-guide-btn" onClick={() => setShowGuide(!showGuide)}>
                            <HelpCircle size={14} /> {showGuide ? '가이드 닫기' : '가이드 보기'}
                        </button>
                        <button onClick={onClose} className="logic-close-btn">&times;</button>
                    </div>
                </div>

                {showGuide && (
                    <div className="logic-guide-container">
                        <div className="logic-guide-card">
                            <div className="logic-guide-title">조건 설정</div>
                            <div className="logic-guide-text">
                                <p>각 조건은 <b>변수 + 연산자 + 값</b>으로 구성됩니다.</p>
                                <p>조건 세트 내에서 <b>AND</b> 또는 <b>OR</b>로 연결할 수 있습니다.</p>
                                <p><b>AND</b>: 모든 조건 만족 | <b>OR</b>: 하나 이상 만족</p>
                            </div>
                        </div>
                        <div className="logic-guide-card">
                            <div className="logic-guide-title">조건 세트</div>
                            <div className="logic-guide-text">
                                <p>복잡한 로직을 위해 여러 조건 세트를 생성 가능합니다.</p>
                                <p>조건 세트 간에도 <b>AND</b> 또는 <b>OR</b>로 연결됩니다.</p>
                                <p>예시: (Q1=1 OR Q2=2) AND (Q3&gt;5 OR Q4&lt;10)</p>
                            </div>
                        </div>
                        <div className="logic-guide-card">
                            <div className="logic-guide-title">연산자</div>
                            <div className="logic-guide-text">
                                <p><b>=</b>: 같음 | <b>!=</b>: 같지 않음</p>
                                <p><b>&gt;, &gt;=, &lt;, &lt;=</b>: 크기 비교 (숫자)</p>
                                <p><b>IN</b>: 여러 값 중 하나 (예: 1,2,3)</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="logic-popup-body-v2">
                    {/* AI Box */}
                    {/* <div className="logic-ai-box">
                        <div className="logic-ai-header">
                            <Sparkles size={16} className="text-blue-500" /> <strong>AI 로직 변환</strong>
                        </div>
                        <div className="logic-ai-input-row">
                            <input
                                type="text"
                                className="logic-ai-input"
                                placeholder="서술형 로직을 입력하세요. 예: Q1이 1이고 Q2가 2 또는 3이면 그리고 Q3이 5보다 크다"
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                            />
                            <button className="logic-ai-convert-btn">
                                <Sparkles size={14} /> 변환하기
                            </button>
                        </div>
                        <div className="logic-ai-hint">
                            <span style={{ color: '#eab308' }}>💡</span> 예시: "Q1이 1이다 또는 Q2가 2보다 크다", "Q3 = 5 그리고 Q4가 10이하", "Q5가 1,2,3 중 하나"
                        </div>
                    </div> */}

                    {/* Conditions Settings Title */}
                    {/* <div className="logic-rules-header">
                        로직 검수 조건 설정
                    </div> */}

                    <div className="logic-rules-wrapper">
                        {conditionSets.map((set, setIndex) => (
                            <React.Fragment key={set.id}>
                                {/* Global Connector showing AND/OR logic between sets */}
                                {setIndex > 0 && (
                                    <div className="logic-global-connector">
                                        <div className="logic-connector-line"></div>
                                        <div className="logic-global-toggle-box">
                                            <div className="logic-toggle-group">
                                                <button
                                                    className={`logic-toggle-btn ${set.connectorOp === 'AND' ? 'active' : ''}`}
                                                    onClick={() => handleChangeConnectorOp(setIndex, 'AND')}
                                                >
                                                    AND
                                                </button>
                                                <button
                                                    className={`logic-toggle-btn ${set.connectorOp === 'OR' ? 'active' : ''}`}
                                                    onClick={() => handleChangeConnectorOp(setIndex, 'OR')}
                                                >
                                                    OR
                                                </button>
                                            </div>
                                            <div className="logic-global-desc">
                                                {set.connectorOp === 'AND'
                                                    ? '모든 조건 세트는 AND로 연결됩니다.'
                                                    : '하나 이상의 조건 세트를 만족하면 됩니다.'}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Condition Set Block */}
                                <div className="logic-rules-container">
                                    <div className="logic-rules-top">
                                        <div className="logic-toggle-group">
                                            <button
                                                className={`logic-toggle-btn ${set.logicOp === 'AND' ? 'active' : ''}`}
                                                onClick={() => handleChangeSetLogicOp(setIndex, 'AND')}
                                            >
                                                AND
                                            </button>
                                            <button
                                                className={`logic-toggle-btn ${set.logicOp === 'OR' ? 'active' : ''}`}
                                                onClick={() => handleChangeSetLogicOp(setIndex, 'OR')}
                                            >
                                                OR
                                            </button>
                                        </div>
                                        <button className="logic-group-delete-btn" onClick={() => handleDeleteSet(setIndex)} title="조건 세트 삭제">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    <div className="logic-rules-inner">
                                        {set.conditions.map((cond, condIndex) => (
                                            <div key={condIndex} className="logic-rule-row">
                                                <DropDownList
                                                    className="logic-kendo-dropdown var-select"
                                                    data={kendoVarOptions}
                                                    textField="text"
                                                    dataItemKey="value"
                                                    defaultItem={{ text: "문항 선택", value: "" }}
                                                    value={cond.varName ? (kendoVarOptions.find(item => item.value === cond.varName) || { text: cond.varName, value: cond.varName }) : null}
                                                    onChange={(e) => handleConditionChange(setIndex, condIndex, 'varName', e.value ? e.value.value : "")}
                                                    popupSettings={{ className: 'logic-dropdown-popup' }}
                                                />

                                                <DropDownList
                                                    className="logic-kendo-dropdown op-select"
                                                    data={operatorOptions}
                                                    textField="text"
                                                    dataItemKey="value"
                                                    defaultItem={{ text: "연산자", value: "" }}
                                                    value={cond.operator ? (operatorOptions.find(op => op.value === cond.operator) || { text: cond.operator, value: cond.operator }) : null}
                                                    onChange={(e) => handleConditionChange(setIndex, condIndex, 'operator', e.value ? e.value.value : "")}
                                                    popupSettings={{ className: 'logic-dropdown-popup' }}
                                                />

                                                <input
                                                    type="text"
                                                    className="logic-rule-input"
                                                    value={cond.value}
                                                    onChange={(e) => handleConditionChange(setIndex, condIndex, 'value', e.target.value)}
                                                    placeholder="값 입력"
                                                />

                                                <button
                                                    className="logic-rule-action-btn logic-rule-add"
                                                    onClick={() => handleAddCondition(setIndex, condIndex)}
                                                    title="조건 추가"
                                                >
                                                    <Plus size={16} />
                                                </button>

                                                <button
                                                    className="logic-rule-action-btn logic-rule-delete"
                                                    onClick={() => handleDeleteCondition(setIndex, condIndex)}
                                                    title="조건 삭제"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </React.Fragment>
                        ))}
                    </div>

                    <div className="logic-add-set-wrapper">
                        <button className="logic-add-set-btn" onClick={handleAddConditionSet}>
                            <Plus size={14} /> 조건 세트 추가
                        </button>
                    </div>
                </div>

                <div className="variable-modal-footer" style={{ borderTop: 'none', padding: '0 24px 24px' }}>
                    <button onClick={onClose} className="btn-cancel">취소</button>
                    <button onClick={handleSave} className="btn-save">적용</button>
                </div>
            </div>
        </div>
    );
};

export default LogicEditPopup;
