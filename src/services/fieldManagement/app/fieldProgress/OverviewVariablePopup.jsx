import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Search, CheckCircle2, ChevronRight, Play, HelpCircle, Settings } from 'lucide-react';
import { RecodingPageApi } from '@/services/dataStatus/app/recoding/RecodingPageApi';
import './OverviewVariablePopup.css';

const OverviewVariablePopup = ({ isOpen, onClose, auth, pageId, onSaved }) => {
    const { getRecodedList, getRecodedVariables, setRecodedVariable, deleteRecodedVariable, verifyRecodeLogic } = RecodingPageApi();

    const [variables, setVariables] = useState([]);
    const [selectedVarId, setSelectedVarId] = useState(null);
    const [varName, setVarName] = useState('');
    const [varLabel, setVarLabel] = useState('');
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [checkedResults, setCheckedResults] = useState({});

    // Fetch overview variables list
    const fetchList = async () => {
        if (!auth?.user?.userId || !pageId) return;
        try {
            const result = await getRecodedList.mutateAsync({ user: auth.user.userId, pageid: pageId });
            if (result?.success === "777" && result.resultjson) {
                // Filter variables starting with overview_
                const overviewVars = Object.values(result.resultjson)
                    .filter(v => v.id.startsWith('overview_'))
                    .map(v => ({ id: v.id, label: v.label }));
                setVariables(overviewVars);

                if (overviewVars.length > 0 && !selectedVarId) {
                    handleSelectVariable(overviewVars[0].id);
                }
            }
        } catch (error) {
            console.error("Failed to fetch recoded list:", error);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchList();
        }
    }, [isOpen]);

    const handleSelectVariable = async (id) => {
        setSelectedVarId(id);
        setIsLoading(true);
        try {
            const result = await getRecodedVariables.mutateAsync({ user: auth.user.userId, pageid: pageId });
            if (result?.success === "777" && result.resultjson) {
                const varData = result.resultjson[id];
                if (varData) {
                    setVarName(varData.id.replace('overview_', ''));
                    setVarLabel(varData.label || '');
                    setCategories((varData.info || []).map((item, idx) => ({
                        id: Date.now() + idx,
                        logic: item.logic || '',
                        label: item.label || '',
                        label2: item.label2 || '',
                        logic2: item.logic2 || '',
                        value: item.value ?? ''
                    })));
                } else {
                    // If not found, treat as new
                    handleAddNew();
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
        setCategories([{ id: Date.now(), logic: '', label: '', label2: '', logic2: '', value: '' }]);
        setCheckedResults({});
    };

    const handleAddCategory = () => {
        setCategories([...categories, { id: Date.now(), logic: '', label: '', label2: '', logic2: '', value: '' }]);
    };

    const handleRemoveCategory = (id) => {
        setCategories(categories.filter(c => c.id !== id));
    };

    const handleUpdateCategory = (id, field, value) => {
        setCategories(categories.map(c => c.id === id ? { ...c, [field]: value } : c));
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
                    info: categories.map((c, idx) => ({
                        index: idx + 1,
                        label: c.label,
                        label2: c.label2,
                        logic: c.logic,
                        logic2: c.logic2,
                        value: Number(c.value) || 0,
                        type: "categorical"
                    }))
                }
            }
        };

        try {
            const result = await setRecodedVariable.mutateAsync(payload);
            if (result?.success === "777") {
                alert("저장되었습니다.");
                fetchList();
                if (onSaved) onSaved();
            } else {
                alert(result?.message || "저장 실패");
            }
        } catch (error) {
            console.error("Save error:", error);
            alert("저장 중 오류가 발생했습니다.");
        }
    };

    const handleDelete = async () => {
        if (!selectedVarId) return;
        if (!window.confirm("정말 삭제하시겠습니까?")) return;

        try {
            const result = await deleteRecodedVariable.mutateAsync({
                user: auth.user.userId,
                pageid: pageId,
                variables: [selectedVarId]
            });
            if (result?.success === "777") {
                alert("삭제되었습니다.");
                setSelectedVarId(null);
                fetchList();
                handleAddNew();
                if (onSaved) onSaved();
            }
        } catch (error) {
            console.error("Delete error:", error);
        }
    };

    const handleVerify = async () => {
        if (!auth?.user?.userId || !varName) return;

        const fullId = `overview_${varName.trim()}`;
        const variablesPayload = {
            [fullId]: {
                id: fullId,
                label: varLabel,
                type: "categorical",
                info: categories.map((c, idx) => ({
                    index: idx + 1,
                    label: c.label,
                    logic: c.logic,
                    type: "categorical",
                    value: Number(c.value) || 0
                }))
            }
        };

        try {
            const payload = {
                pageid: pageId,
                user: auth.user.userId,
                filter_expression: "",
                weight_col: null,
                table: { x_info: [], y_info: [fullId] },
                include_stats: ["n"],
                variables: variablesPayload
            };
            const result = await verifyRecodeLogic.mutateAsync(payload);
            if (result?.success === "777") {
                const data = result.resultjson || {};
                const rows = data.rows || [];
                const newResults = {};
                categories.forEach(cat => {
                    const matchedRow = rows.find(r => String(r.value) === String(cat.value));
                    if (matchedRow && matchedRow.cells?.total_auto) {
                        newResults[cat.id] = `${matchedRow.cells.total_auto.count}명`;
                    } else {
                        newResults[cat.id] = "0명";
                    }
                });
                setCheckedResults(newResults);
            }
        } catch (error) {
            console.error("Verify error:", error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="variable-modal-overlay overview-popup-v2" data-theme="data-dashboard">
            <div className="variable-modal-content overview-container-v2" onClick={(e) => e.stopPropagation()}>
                <div className="logic-popup-header-v2">
                    <div className="logic-popup-title-area">
                        <h3>집계용 recoded 변수</h3>
                        <p>여기서 만드는 변수 ID는 항상 overview_* 형태로 저장됩니다. 저장 후 결과 탭의 X 정보에서 선택 가능합니다.</p>
                    </div>
                    <div className="logic-popup-actions">
                        <button onClick={onClose} className="logic-close-btn">&times;</button>
                    </div>
                </div>

                <div className="overview-content-v2">
                    {/* Sidebar */}
                    <div className="overview-sidebar-v2">
                        <div className="sidebar-header-v2">
                            <span>리스트 ({variables.length})</span>
                            <button className="add-new-mini" onClick={handleAddNew} title="새 변수">
                                <Plus size={14} />
                            </button>
                        </div>
                        <div className="var-list-v2">
                            {variables.map(v => (
                                <div
                                    key={v.id}
                                    className={`var-item-v2 ${selectedVarId === v.id ? 'active' : ''}`}
                                    onClick={() => handleSelectVariable(v.id)}
                                >
                                    <div className="var-id-v2">{v.id}</div>
                                    <div className="var-label-v2">{v.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Main Area */}
                    <div className="overview-main-v2">
                        <div className="config-grid-v2">
                            <div className="input-group-v2">
                                <label>변수 이름</label>
                                <div className="id-wrapper-v2">
                                    <span className="prefix-v2">overview_</span>
                                    <input
                                        type="text"
                                        value={varName}
                                        onChange={(e) => setVarName(e.target.value)}
                                        placeholder="변수명"
                                    />
                                </div>
                            </div>
                            <div className="input-group-v2">
                                <label>변수 라벨</label>
                                <input
                                    type="text"
                                    value={varLabel}
                                    onChange={(e) => setVarLabel(e.target.value)}
                                    placeholder="라벨 입력"
                                />
                            </div>
                        </div>

                        <div className="category-card-v2">
                            <div className="card-header-v2">
                                <div className="card-title-v2">
                                    <h4>카테고리</h4>
                                    <p>logic에는 원본 변수나 기존 recoded 변수를 사용할 수 있습니다.</p>
                                </div>
                                <div className="card-actions-v2">
                                    <button className="add-category-header-btn" onClick={handleAddCategory}>
                                        <Plus size={14} /> 카테고리 추가
                                    </button>
                                    <button className="verify-btn-v2" onClick={handleVerify}>
                                        <Play size={14} strokeWidth={3} /> 검사
                                    </button>
                                </div>
                            </div>

                            <div className="category-list-v2">
                                <div className="grid-body-v2">
                                    {categories.map((cat) => (
                                        <div key={cat.id} className="grid-row-v2">
                                            <input
                                                className="grid-field-v2 logic-field"
                                                value={cat.logic}
                                                onChange={(e) => handleUpdateCategory(cat.id, 'logic', e.target.value)}
                                                placeholder="logic"
                                            />
                                            <input
                                                className="grid-field-v2"
                                                value={cat.label}
                                                onChange={(e) => handleUpdateCategory(cat.id, 'label', e.target.value)}
                                                placeholder="라벨2"
                                            />
                                            <input
                                                className="grid-field-v2"
                                                value={cat.label2}
                                                onChange={(e) => handleUpdateCategory(cat.id, 'label2', e.target.value)}
                                                placeholder="라벨3"
                                            />
                                            <input
                                                className="grid-field-v2 logic-field"
                                                value={cat.logic2}
                                                onChange={(e) => handleUpdateCategory(cat.id, 'logic2', e.target.value)}
                                                placeholder="logic2"
                                            />
                                            <div className="value-cell-v2">
                                                <input
                                                    className="grid-field-v2 value-field"
                                                    value={cat.value}
                                                    onChange={(e) => handleUpdateCategory(cat.id, 'value', e.target.value)}
                                                    placeholder="값"
                                                />
                                                {checkedResults[cat.id] && <div className="verify-badge">{checkedResults[cat.id]}</div>}
                                            </div>
                                            <button className="row-del-btn" onClick={() => handleRemoveCategory(cat.id)}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="variable-modal-footer overview-footer-v2">
                    <div className="footer-left">
                        {selectedVarId && (
                            <button className="btn-delete-v2" onClick={handleDelete}>
                                <Trash2 size={14} /> 삭제
                            </button>
                        )}
                    </div>
                    <div className="footer-right">
                        <button onClick={onClose} className="btn-cancel">취소</button>
                        <button onClick={handleSave} className="btn-save">적용</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OverviewVariablePopup;
