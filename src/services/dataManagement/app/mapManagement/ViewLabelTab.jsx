import React, { useRef, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import KendoGridV2 from '../../../../components/kendo/KendoGridV2';
import { GridColumn as Column } from "@progress/kendo-react-grid";
import { Plus, Trash2, Edit2, Info, Loader2, AlertTriangle, CheckCircle2, X, Filter } from 'lucide-react';
import { modalContext } from "@/components/common/Modal.jsx";
import { MapManagementContext } from './MapManagementUtils';

const VariableCardItem = React.memo(({
    v,
    isActive,
    isChecked,
    issueVar,
    isComposite,
    onItemClick,
    onMouseDownItem,
    onMouseEnterItem,
    onToggleSelect
}) => {
    const worstGrade = issueVar?.worst;

    let cardBg = '#ffffff';
    let cardBorder = '1px solid #cbd5e1';
    let cardShadow = '0 1px 2px rgba(0, 0, 0, 0.02)';
    let dotColor = null;
    let badgeBg = '#f1f5f9';
    let badgeColor = '#64748b';
    let badgeBorder = 'none';
    let badgeText = '';

    if (worstGrade === 'error') {
        cardBg = isActive ? '#fff5f5' : '#ffffff';
        cardBorder = isActive ? '2px solid #ef4444' : '1.5px solid #fca5a5';
        cardShadow = isActive ? '0 2px 6px rgba(239, 68, 68, 0.15)' : '0 1px 2px rgba(0, 0, 0, 0.02)';
        dotColor = '#ef4444';
        badgeBg = '#fef2f2';
        badgeColor = '#dc2626';
        badgeBorder = '1px solid #fecdd3';
        badgeText = '오류';
    } else if (worstGrade === 'warn') {
        cardBg = isActive ? '#fffbeb' : '#ffffff';
        cardBorder = isActive ? '2px solid #f59e0b' : '1.5px solid #f59e0b';
        cardShadow = isActive ? '0 2px 6px rgba(245, 158, 11, 0.15)' : '0 1px 2px rgba(0, 0, 0, 0.02)';
        dotColor = '#d97706';
        badgeBg = '#fef3c7';
        badgeColor = '#b45309';
        badgeBorder = '1px solid #fcd34d';
        badgeText = '경고';
    } else if (worstGrade === 'info') {
        cardBg = isActive ? '#eff6ff' : '#ffffff';
        cardBorder = isActive ? '2px solid #3b82f6' : '1.5px solid #93c5fd';
        cardShadow = isActive ? '0 2px 6px rgba(59, 130, 246, 0.15)' : '0 1px 2px rgba(0, 0, 0, 0.02)';
        dotColor = '#3b82f6';
        badgeBg = '#eff6ff';
        badgeColor = '#2563eb';
        badgeBorder = '1px solid #bfdbfe';
        badgeText = '참고';
    } else if (isComposite) {
        cardBg = isActive ? '#f1f5f9' : '#f8fafc';
        cardBorder = isActive ? '2px solid #64748b' : '1.5px solid #cbd5e1';
        cardShadow = isActive ? '0 2px 5px rgba(100, 116, 139, 0.12)' : '0 1px 2px rgba(0, 0, 0, 0.02)';
        badgeBg = '#f1f5f9';
        badgeColor = '#64748b';
        badgeBorder = '1px solid #e2e8f0';
        badgeText = '검사 안 함';
    } else if (isActive) {
        cardBg = 'var(--dm-primary-light)';
        cardBorder = '2px solid var(--dm-primary)';
        cardShadow = '0 2px 6px rgba(22, 163, 74, 0.15)';
    }

    return (
        <div
            className={`map-variable-item ${isActive ? 'active' : ''}`}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => {
                onMouseDownItem(v, e);
                if (e.button === 0) onItemClick(v, e);
            }}
            onMouseEnter={() => onMouseEnterItem(v)}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                userSelect: 'none',
                background: cardBg,
                border: cardBorder,
                boxShadow: cardShadow,
                opacity: isComposite ? 0.85 : 1,
                transition: 'none',
                borderRadius: '6px',
                padding: '8px 10px'
            }}
        >
            <label
                className="dm-checkbox-label"
                onClick={(e) => e.stopPropagation()}
                style={{ flexShrink: 0 }}
            >
                <input
                    type="checkbox"
                    className="dm-checkbox-input"
                    checked={isChecked}
                    onChange={(e) => onToggleSelect(v.id, e)}
                />
                <span className="dm-checkbox-box"></span>
            </label>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', marginBottom: '3px' }}>
                    <span className="v-name" style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>{v.sysName}</span>
                    {badgeText && (
                        <span style={{
                            fontSize: '10.5px',
                            fontWeight: '600',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: badgeBg,
                            color: badgeColor,
                            border: badgeBorder,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            flexShrink: 0
                        }}>
                            {dotColor && (
                                <span style={{
                                    width: '5px',
                                    height: '5px',
                                    borderRadius: '50%',
                                    background: dotColor
                                }} />
                            )}
                            {badgeText}
                        </span>
                    )}
                </div>
                <div className="v-label" style={{ fontSize: '11.5px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {v.label || '레이블 없음'}
                </div>
            </div>
        </div>
    );
});

/** 텍스트 입력 셀 - 편집 중이면 input/textarea, 아니면 읽기 전용 div (이슈 하이라이트 포함) */
const LabelInputCell = ({
    dataItem,
    field,
    style,
    className,
    editingRowId,
    setEditingRowId,
    editingField,
    setEditingField,
    onValueChange,
    issueInfo
}) => {
    const textareaRef = useRef(null);
    const isEditing = dataItem.id === editingRowId;

    // textarea 높이 자동 조정 (레이블 필드인 경우)
    const adjustHeight = () => {
        if (textareaRef.current && field === 'label') {
            textareaRef.current.style.setProperty("height", "auto", "important");
            textareaRef.current.style.setProperty("height", textareaRef.current.scrollHeight + "px", "important");
        }
    };

    useEffect(() => {
        adjustHeight();
    }, [dataItem[field], editingRowId]);

    const handleBlur = (e) => {
        const newValue = e.target.value;
        onValueChange(dataItem.id - 1, field, newValue);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.target.blur();
            setEditingRowId(null);
            setEditingField(null);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            if (textareaRef.current) {
                textareaRef.current.value = dataItem[field] || '';
            }
            setEditingRowId(null);
            setEditingField(null);
        }
    };

    const handleFocus = (e) => {
        const val = e.target.value || '';
        e.target.setSelectionRange(val.length, val.length);
    };

    // 검사 이슈 등급별 셀 배경색 및 텍스트 강조
    let bgStyle = 'transparent';
    let textColor = '#475569';
    if (issueInfo) {
        if (issueInfo.grade === 'error') {
            bgStyle = '#fff1f2';
            textColor = '#be123c';
        } else if (issueInfo.grade === 'warn') {
            bgStyle = '#fffbeb';
            textColor = '#b45309';
        } else if (issueInfo.grade === 'info') {
            bgStyle = '#eff6ff';
            textColor = '#1d4ed8';
        }
    }

    if (!isEditing) {
        return (
            <td
                style={{
                    ...style,
                    backgroundColor: bgStyle,
                    verticalAlign: 'middle',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: style?.width || '1px',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s'
                }}
                className={className}
                title={issueInfo ? `${issueInfo.message}` : (dataItem[field] ? String(dataItem[field]) : '')}
                onClick={() => {
                    setEditingField(field);
                    setEditingRowId(dataItem.id);
                }}
            >
                <div style={{
                    background: 'transparent',
                    border: 'none',
                    pointerEvents: 'none',
                    whiteSpace: 'pre-wrap',
                    fontSize: '13px',
                    color: textColor,
                    fontWeight: issueInfo ? '700' : '400',
                    padding: '2px 4px',
                    width: '100%',
                    boxSizing: 'border-box',
                    textAlign: field === 'code' ? 'center' : 'left'
                }}>
                    {dataItem[field]}
                </div>
            </td>
        );
    }

    const shouldAutoFocus = editingField === field;

    return (
        <td style={{ ...style, backgroundColor: bgStyle, verticalAlign: 'middle' }} className={className}>
            {field === 'label' ? (
                <textarea
                    ref={textareaRef}
                    defaultValue={dataItem[field]}
                    className="variable-input"
                    rows={1}
                    onInput={adjustHeight}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    onFocus={handleFocus}
                    autoFocus={shouldAutoFocus}
                    style={{
                        width: '100%',
                        resize: 'none',
                        outline: 'none',
                        border: '1px solid var(--dm-primary)',
                        borderRadius: '4px',
                        padding: '4px 6px',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                        minHeight: '24px'
                    }}
                />
            ) : (
                <input
                    ref={textareaRef}
                    type="text"
                    defaultValue={dataItem[field]}
                    className="variable-input"
                    style={{
                        width: '100%',
                        height: '24px',
                        padding: '2px 4px',
                        border: '1px solid var(--dm-primary)',
                        borderRadius: '4px',
                        fontSize: '13px',
                        textAlign: 'center',
                        outline: 'none',
                        boxSizing: 'border-box'
                    }}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    onFocus={handleFocus}
                    autoFocus={shouldAutoFocus}
                />
            )}
        </td>
    );
};

const ViewLabelTab = ({
    variables = [],
    sidebarSearchQuery,
    setSidebarSearchQuery,
    selectedVariableId,
    setSelectedVariableId,
    selectedVariableIds = [],
    setSelectedVariableIds,
    setModalTargetIds,
    selectedVariable,
    SetEditingCategoryPopupOpen,
    setAddValueModalOpen,
    handleDeleteLabel,
    auth,
    checkMapLabels,
    hasChanges
}) => {
    const { setVariables } = useContext(MapManagementContext);
    const modal = useContext(modalContext);

    const [editingRowId, setEditingRowId] = useState(null);
    const [editingField, setEditingField] = useState(null);

    const [localSelectedId, setLocalSelectedId] = useState(selectedVariableId);
    useEffect(() => {
        setLocalSelectedId(selectedVariableId);
    }, [selectedVariableId]);

    const [localAllSelected, setLocalAllSelected] = useState(null);
    useEffect(() => {
        setLocalAllSelected(null);
    }, [selectedVariableIds]);

    const [lastClickedId, setLastClickedId] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartIdRef = useRef(null);

    // ── 보기 레이블 검사 관련 상태 ──
    const [isCheckingLabels, setIsCheckingLabels] = useState(false);
    const [checkElapsedTime, setCheckElapsedTime] = useState(0);
    const [labelCheckResult, setLabelCheckResult] = useState(null);
    const [isResultStale, setIsResultStale] = useState(false);
    const [onlyShowIssues, setOnlyShowIssues] = useState(false);

    const requestPnRef = useRef(null);

    // 마우스 업 전역 이벤트 처리 (드래그 종료)
    useEffect(() => {
        const handleGlobalMouseUp = () => {
            setIsDragging(false);
            dragStartIdRef.current = null;
        };
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, []);

    // 변수가 변경될 때 편집 상태 초기화
    useEffect(() => {
        setEditingRowId(null);
        setEditingField(null);
    }, [selectedVariableId]);

    // 맵 내용(보기/변수) 변경 시 검사 결과 낡음 처리
    useEffect(() => {
        if (labelCheckResult && hasChanges) {
            setIsResultStale(true);
        }
    }, [hasChanges]);

    // 설문 번호(PN)가 변경되면 이전 검사 결과 초기화
    useEffect(() => {
        const currentPn = sessionStorage.getItem('merge_pn') || sessionStorage.getItem('projectnum') || '';
        if (requestPnRef.current && requestPnRef.current !== currentPn) {
            setLabelCheckResult(null);
            setIsResultStale(false);
        }
    }, [selectedVariableId]);

    // ── 레이블 검사 실행 핸들러 ──
    const handleRunLabelCheck = async () => {
        const pn = sessionStorage.getItem('merge_pn') || sessionStorage.getItem('projectnum') || '';
        const userId = auth?.user?.userId || '';

        if (!pn) {
            modal.showErrorAlert("알림", "프로젝트 정보가 없습니다.");
            return;
        }

        if (!checkMapLabels) {
            console.warn("checkMapLabels API mutation이 정의되지 않았습니다.");
            return;
        }

        setIsCheckingLabels(true);
        setCheckElapsedTime(0);
        setIsResultStale(false);
        requestPnRef.current = pn;

        let seconds = 0;
        const timerId = setInterval(() => {
            seconds += 1;
            setCheckElapsedTime(seconds);
        }, 1000);

        try {
            const res = await checkMapLabels.mutateAsync({
                pn,
                user: userId,
                includeTest: false // 항상 false로 요청
            });

            // 기다리는 사이 다른 설문으로 옮겼으면 결과 버림
            const currentPn = sessionStorage.getItem('merge_pn') || sessionStorage.getItem('projectnum') || '';
            if (currentPn !== requestPnRef.current) return;

            if (String(res?.success) === '777') {
                const resJson = res?.resultjson || {};
                const resultData = {
                    message: res?.message || '검사가 완료되었습니다.',
                    basis: resJson.basis || '',
                    summary: resJson.summary || { error: 0, warn: 0, info: 0 },
                    variables: resJson.variables || [],
                    compositeVariables: resJson.compositeVariables || []
                };
                setLabelCheckResult(resultData);

                if ((resJson.variables || []).length === 0) {
                    modal.showAlert("알림", res?.message || "문제를 찾지 못했습니다.");
                }
            } else if (res?.code === '900' || res?.code === '909' || String(res?.success) === '900' || String(res?.success) === '909') {
                const errMsg = res?.resultjson?.errorcontent || res?.message || '검사를 수행할 수 없습니다.';
                modal.showErrorAlert("알림", errMsg);
            } else {
                const errMsg = res?.resultjson?.errorcontent || res?.message || '보기 검사를 하지 못했습니다. 잠시 후 다시 시도해주세요.';
                modal.showErrorAlert("알림", errMsg);
            }
        } catch (err) {
            const currentPn = sessionStorage.getItem('merge_pn') || sessionStorage.getItem('projectnum') || '';
            if (currentPn !== requestPnRef.current) return;

            console.error("보기 레이블 검사 오류:", err);
            let errorMsg = '보기 검사를 하지 못했습니다. 잠시 후 다시 시도해주세요.';
            if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout') || err?.message?.includes('exceeded')) {
                errorMsg = '검사가 너무 오래 걸려 중단됐습니다. 잠시 후 다시 시도해 주세요.';
            } else if (err?.response?.status === 500) {
                errorMsg = err?.response?.data?.message || '보기 검사를 하지 못했습니다. 잠시 후 다시 시도해주세요.';
            }
            modal.showErrorAlert("오류", errorMsg);
        } finally {
            clearInterval(timerId);
            setIsCheckingLabels(false);
        }
    };

    // ── 검사 결과 맵핑 (변수별 worst 등급 및 매칭) ──
    const variableIssueMap = useMemo(() => {
        if (!labelCheckResult || !labelCheckResult.variables) return new Map();
        const map = new Map();
        labelCheckResult.variables.forEach(item => {
            map.set(item.variableId, item);
            if (item.name) map.set(item.name, item);
        });
        return map;
    }, [labelCheckResult]);

    const compositeVarSet = useMemo(() => {
        if (!labelCheckResult || !labelCheckResult.compositeVariables) return new Set();
        return new Set(labelCheckResult.compositeVariables);
    }, [labelCheckResult]);

    // 검색어 & 이슈 필터링된 변수 목록
    const filteredVariables = useMemo(() => {
        let result = variables;
        if (sidebarSearchQuery.trim()) {
            const q = sidebarSearchQuery.toLowerCase();
            result = result.filter(v =>
                v.sysName?.toLowerCase().includes(q) ||
                v.label?.toLowerCase().includes(q)
            );
        }
        if (onlyShowIssues && labelCheckResult) {
            result = result.filter(v => {
                const isIssue = variableIssueMap.has(v.id) || variableIssueMap.has(v.sysName);
                const isComp = compositeVarSet.has(v.sysName);
                return isIssue || isComp;
            });
        }
        return result;
    }, [variables, sidebarSearchQuery, onlyShowIssues, labelCheckResult, variableIssueMap, compositeVarSet]);

    // 선택한 현재 변수의 검사 이슈 정보
    const currentVarIssueInfo = useMemo(() => {
        if (!selectedVariable) return null;
        return variableIssueMap.get(selectedVariable.id) || variableIssueMap.get(selectedVariable.sysName) || null;
    }, [selectedVariable, variableIssueMap]);

    const isCurrentVarComposite = useMemo(() => {
        if (!selectedVariable) return false;
        return compositeVarSet.has(selectedVariable.sysName);
    }, [selectedVariable, compositeVarSet]);

    // 선택한 현재 변수의 보기 줄(labelId) 매칭 맵 (worst 등급 기준)
    const labelIdIssueMap = useMemo(() => {
        if (!currentVarIssueInfo || !currentVarIssueInfo.issues) return new Map();
        const map = new Map();
        const gradeRank = { error: 3, warn: 2, info: 1 };

        currentVarIssueInfo.issues.forEach(issue => {
            if (issue.labelIds && Array.isArray(issue.labelIds) && issue.labelIds.length > 0) {
                issue.labelIds.forEach(lId => {
                    const existing = map.get(lId);
                    if (!existing || (gradeRank[issue.grade] > gradeRank[existing.grade])) {
                        map.set(lId, {
                            grade: issue.grade,
                            message: issue.message,
                            type: issue.type
                        });
                    }
                });
            }
        });
        return map;
    }, [currentVarIssueInfo]);

    // 미아 코드 등 줄이 없는 이슈들 (orphan-code, code-gap, no-labels 등)
    const orphanAndLinelessIssues = useMemo(() => {
        if (!currentVarIssueInfo || !currentVarIssueInfo.issues) return [];
        return currentVarIssueInfo.issues.filter(issue => !issue.labelIds || issue.labelIds.length === 0 || issue.type === 'orphan-code');
    }, [currentVarIssueInfo]);

    // O(1) 빠른 선택 검사를 위한 Set
    const selectedSet = useMemo(() => new Set(selectedVariableIds), [selectedVariableIds]);

    const lastClickedIdRef = useRef(lastClickedId);
    useEffect(() => {
        lastClickedIdRef.current = lastClickedId;
    }, [lastClickedId]);

    const filteredVariablesRef = useRef(filteredVariables);
    useEffect(() => {
        filteredVariablesRef.current = filteredVariables;
    }, [filteredVariables]);

    // 전체 선택 처리
    const isAllSelected = useMemo(() => {
        if (localAllSelected !== null) return localAllSelected;
        if (filteredVariables.length === 0) return false;
        if (selectedVariableIds.length === filteredVariables.length) return true;
        return filteredVariables.every(v => selectedSet.has(v.id));
    }, [localAllSelected, filteredVariables, selectedVariableIds.length, selectedSet]);

    const handleToggleSelectAll = (e) => {
        const checked = e.target.checked;
        setLocalAllSelected(checked);

        const nextIds = checked ? filteredVariables.map(v => v.id) : [];
        setTimeout(() => {
            React.startTransition(() => {
                setSelectedVariableIds(nextIds);
            });
        }, 0);
    };

    const handleToggleSelect = useCallback((id, e) => {
        e.stopPropagation();
        setLocalAllSelected(null);
        React.startTransition(() => {
            setSelectedVariableIds(prev => {
                if (prev.includes(id)) {
                    return prev.filter(x => x !== id);
                } else {
                    return [...prev, id];
                }
            });
        });
        setLastClickedId(id);
    }, [setSelectedVariableIds]);

    // 카드 항목 클릭 (Shift / Ctrl / 일반 클릭 지원)
    const handleItemClick = useCallback((v, e) => {
        setLocalSelectedId(v.id);
        setSelectedVariableId(v.id);

        const isShift = e.shiftKey;
        const isCtrl = e.ctrlKey || e.metaKey;
        const lastId = lastClickedIdRef.current;
        const filteredList = filteredVariablesRef.current;

        if (isShift && lastId) {
            const anchorIdx = filteredList.findIndex(item => item.id === lastId);
            const currIdx = filteredList.findIndex(item => item.id === v.id);

            if (anchorIdx !== -1 && currIdx !== -1) {
                const start = Math.min(anchorIdx, currIdx);
                const end = Math.max(anchorIdx, currIdx);
                const rangeIds = filteredList.slice(start, end + 1).map(item => item.id);

                if (isCtrl) {
                    setSelectedVariableIds(prev => Array.from(new Set([...prev, ...rangeIds])));
                } else {
                    setSelectedVariableIds(rangeIds);
                }
            }
        } else if (isCtrl) {
            setSelectedVariableIds(prev => {
                if (prev.includes(v.id)) {
                    return prev.filter(x => x !== v.id);
                } else {
                    return [...prev, v.id];
                }
            });
            setLastClickedId(v.id);
        } else {
            setLastClickedId(v.id);
        }
    }, [setSelectedVariableId, setSelectedVariableIds]);

    // 마우스 드래그 시작
    const handleMouseDownItem = useCallback((v, e) => {
        if (e.button !== 0) return;
        setIsDragging(true);
        dragStartIdRef.current = v.id;
    }, []);

    // 마우스 드래그 이동 중 범위 선택
    const handleMouseEnterItem = useCallback((v) => {
        if (!isDragging || !dragStartIdRef.current) return;
        const filteredList = filteredVariablesRef.current;

        const startIdx = filteredList.findIndex(item => item.id === dragStartIdRef.current);
        const currIdx = filteredList.findIndex(item => item.id === v.id);

        if (startIdx !== -1 && currIdx !== -1) {
            const start = Math.min(startIdx, currIdx);
            const end = Math.max(startIdx, currIdx);
            const rangeIds = filteredList.slice(start, end + 1).map(item => item.id);
            setSelectedVariableIds(rangeIds);
        }
    }, [isDragging, setSelectedVariableIds]);

    const handleOpenBulkEditModal = () => {
        if (setModalTargetIds) {
            setModalTargetIds(selectedVariableIds.length > 0 ? selectedVariableIds : (selectedVariableId ? [selectedVariableId] : []));
        }
        setAddValueModalOpen(true);
    };

    const handleOpenSingleEditModal = () => {
        if (setModalTargetIds && selectedVariableId) {
            setModalTargetIds([selectedVariableId]);
        }
        setAddValueModalOpen(true);
    };

    const handleValueChange = (index, field, newValue) => {
        if (!selectedVariableId) return;

        const currentLabels = selectedVariable?.labels || [];
        if (currentLabels[index]?.[field] === newValue) return;

        if (field === 'code') {
            const isDuplicate = currentLabels.some((l, idx) => idx !== index && String(l.code) === String(newValue));
            if (isDuplicate) {
                modal.showErrorAlert("에러", `중복된 번호(코드)가 존재합니다: ${newValue}`);
                return;
            }
        }

        setVariables(prev => prev.map(v => {
            if (v.id !== selectedVariableId) return v;

            const updatedLabels = (v.labels || []).map((l, idx) => {
                if (idx === index) {
                    return { ...l, [field]: newValue };
                }
                return l;
            });

            const newCategoryStr = updatedLabels.map(l => `{${l.code};${l.label}}`).join('');

            return {
                ...v,
                labels: updatedLabels,
                category: newCategoryStr
            };
        }));
    };

    const currentGridData = useMemo(() => {
        return selectedVariable?.labels?.map((l, idx) => ({
            ...l,
            rowNo: idx + 1,
            id: l.id || idx + 1
        })) || [];
    }, [selectedVariable?.labels]);

    const cellRowNo = useCallback((props) => {
        const issue = labelIdIssueMap.get(props.dataItem.id);
        const bg = issue?.grade === 'error' ? '#fef2f2' : issue?.grade === 'warn' ? '#fffbeb' : issue?.grade === 'info' ? '#eff6ff' : 'transparent';
        return (
            <td style={{ ...props.style, backgroundColor: bg, textAlign: 'center', fontSize: '12px', fontWeight: 'bold' }} title={issue?.message || ''}>
                {props.dataItem.rowNo}
            </td>
        );
    }, [labelIdIssueMap]);

    const cellCode = useCallback((props) => (
        <LabelInputCell
            {...props}
            editingRowId={editingRowId}
            setEditingRowId={setEditingRowId}
            editingField={editingField}
            setEditingField={setEditingField}
            onValueChange={handleValueChange}
            issueInfo={labelIdIssueMap.get(props.dataItem.id)}
        />
    ), [editingRowId, editingField, handleValueChange, labelIdIssueMap]);

    const cellLabel = useCallback((props) => (
        <LabelInputCell
            {...props}
            editingRowId={editingRowId}
            setEditingRowId={setEditingRowId}
            editingField={editingField}
            setEditingField={setEditingField}
            onValueChange={handleValueChange}
            issueInfo={labelIdIssueMap.get(props.dataItem.id)}
        />
    ), [editingRowId, editingField, handleValueChange, labelIdIssueMap]);

    const cellDelete = useCallback((props) => {
        const issue = labelIdIssueMap.get(props.dataItem.id);
        const bg = issue?.grade === 'error' ? '#fef2f2' : issue?.grade === 'warn' ? '#fffbeb' : issue?.grade === 'info' ? '#eff6ff' : 'transparent';
        return (
            <td style={{ padding: 0, backgroundColor: bg }}>
                <button
                    type="button"
                    style={{
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteLabel(props.dataItem.code);
                    }}
                >
                    <Trash2 size={16} color="#64748b" />
                </button>
            </td>
        );
    }, [labelIdIssueMap, handleDeleteLabel]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
            {/* 상단 검사 결과 요약 바 (탭 바로 아래 전체 너비 슬림 배너) */}
            {labelCheckResult && (
                <div style={{
                    background: isResultStale ? '#fefce8' : '#ffffff',
                    borderBottom: `1px solid ${isResultStale ? '#fde68a' : '#e2e8f0'}`,
                    padding: '8px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    flexShrink: 0
                }}>
                    {/* 보기가 고쳐졌거나 맵이 바뀐 경우 낡음 경고 안내 */}
                    {isResultStale && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#b45309' }}>
                            <AlertTriangle size={14} color="#d97706" />
                            <span>보기가 바뀌었습니다 — 정확한 확인을 위해 다시 검사해 주세요</span>
                        </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                            <CheckCircle2 size={16} color={labelCheckResult.summary?.error > 0 ? '#ef4444' : '#10b981'} style={{ flexShrink: 0 }} />
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                {/* 서버가 준 message 출력 */}
                                <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                                    {labelCheckResult.message}
                                </span>
                                {/* basis가 message에 이미 포함되어 있지 않은 경우에만 표시 (중복 방지) */}
                                {labelCheckResult.basis && !labelCheckResult.message?.includes(labelCheckResult.basis) && (
                                    <span style={{ fontSize: '11.5px', color: '#64748b', marginTop: '1px' }}>
                                        {labelCheckResult.basis}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* 오류/경고/참고 요약 칩 (세련된 서브 배지) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            {labelCheckResult.summary?.error > 0 && (
                                <span style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecdd3', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px' }}>
                                    오류 {labelCheckResult.summary.error}건
                                </span>
                            )}
                            {labelCheckResult.summary?.warn > 0 && (
                                <span style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fcd34d', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px' }}>
                                    경고 {labelCheckResult.summary.warn}건
                                </span>
                            )}
                            {labelCheckResult.summary?.info > 0 && (
                                <span style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px' }}>
                                    참고 {labelCheckResult.summary.info}건
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={() => setLabelCheckResult(null)}
                                style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center' }}
                                title="결과 닫기"
                            >
                                <X size={15} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="category-label-layout" style={{ flex: 1, minHeight: 0 }}>
            {/* 변수 목록 사이드바 */}
            <div className="variable-sidebar">
                <div className="sidebar-header-box" style={{ padding: '12px 14px' }}>
                    {/* 타이틀 & 레이블 검사 버튼 (변수 목록 타이틀 옆) */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--dm-text-main)', letterSpacing: '-0.2px' }}>변수 목록</h3>
                        
                        <button
                            type="button"
                            onClick={handleRunLabelCheck}
                            disabled={isCheckingLabels}
                            style={{
                                height: '28px',
                                padding: '0 10px',
                                fontSize: '11.5px',
                                fontWeight: '700',
                                color: isCheckingLabels ? '#94a3b8' : 'var(--dm-primary)',
                                background: isCheckingLabels ? '#f1f5f9' : '#ffffff',
                                border: isCheckingLabels ? '1px solid #e2e8f0' : '1px solid var(--dm-primary)',
                                borderRadius: '6px',
                                cursor: isCheckingLabels ? 'not-allowed' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                boxShadow: isCheckingLabels ? 'none' : '0 1px 2px rgba(22, 163, 74, 0.08)',
                                transition: 'all 0.15s ease'
                            }}
                            onMouseOver={e => {
                                if (!isCheckingLabels) {
                                    e.currentTarget.style.background = 'var(--dm-primary-light)';
                                }
                            }}
                            onMouseOut={e => {
                                if (!isCheckingLabels) {
                                    e.currentTarget.style.background = '#ffffff';
                                }
                            }}
                        >
                            {isCheckingLabels ? (
                                <>
                                    <Loader2 size={12} className="animate-spin" color="var(--dm-primary)" />
                                    <span style={{ fontSize: '12px', lineHeight: 1 }}>검사 중... {checkElapsedTime}초</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 size={13} color="var(--dm-primary)" />
                                    <span style={{ fontSize: '12px', lineHeight: 1 }}>레이블 검사</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* 10초 초과 시 소요시간 안내 */}
                    {isCheckingLabels && checkElapsedTime >= 10 && (
                        <div style={{ fontSize: '11px', color: '#b45309', background: '#fefce8', border: '1px solid #fde68a', borderRadius: '6px', padding: '6px 10px', marginBottom: '8px', lineHeight: '1.4' }}>
                            ℹ 응답이 많은 설문은 1분 넘게 걸릴 수 있습니다.
                        </div>
                    )}

                    {/* 검색창 */}
                    <div className="search-box" style={{ marginBottom: '8px' }}>
                        <input
                            type="text"
                            placeholder="변수명 또는 레이블 검색"
                            value={sidebarSearchQuery}
                            onChange={e => setSidebarSearchQuery(e.target.value)}
                        />
                    </div>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '6px'
                    }}>
                        <label className="dm-checkbox-label" style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none', flexShrink: 0 }}>
                            <input
                                type="checkbox"
                                className="dm-checkbox-input"
                                checked={isAllSelected}
                                onChange={handleToggleSelectAll}
                            />
                            <span className="dm-checkbox-box"></span>
                            <span style={{ marginLeft: '6px', fontSize: '12px', fontWeight: 600, color: '#475569', lineHeight: 1 }}>전체 선택</span>
                        </label>

                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                            {/* 변수 선택이 없을 때만 오류/경고 항목 필터 칩 표시 */}
                            {labelCheckResult && selectedVariableIds.length === 0 && (
                                <button
                                    type="button"
                                    onClick={() => setOnlyShowIssues(!onlyShowIssues)}
                                    style={{
                                        height: '24px',
                                        padding: '0 8px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        borderRadius: '12px',
                                        border: `1px solid ${onlyShowIssues ? '#fcd34d' : '#cbd5e1'}`,
                                        background: onlyShowIssues ? '#fef3c7' : '#ffffff',
                                        color: onlyShowIssues ? '#b45309' : '#64748b',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        transition: 'all 0.15s ease',
                                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
                                    }}
                                >
                                    <Filter size={11} color={onlyShowIssues ? '#b45309' : '#64748b'} />
                                    <span style={{ fontSize: '12px', lineHeight: 1 }}>오류/경고 항목 {labelCheckResult?.variables?.length > 0 ? `(${labelCheckResult.variables.length})` : ''}</span>
                                </button>
                            )}

                            {/* 변수 선택 시 다중 편집 버튼만 깔끔하게 노출 */}
                            {selectedVariableIds.length > 0 && (
                                <button
                                    type="button"
                                    onClick={handleOpenBulkEditModal}
                                    style={{
                                        height: '24px',
                                        padding: '0 9px',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        color: '#fff',
                                        background: 'var(--dm-primary)',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        whiteSpace: 'nowrap',
                                        transition: 'all 0.2s ease',
                                        boxShadow: '0 1px 3px rgba(22, 163, 74, 0.2)'
                                    }}
                                >
                                    <Edit2 size={11} />
                                    <span style={{ fontSize: '12px', lineHeight: 1 }}>다중 편집 ({selectedVariableIds.length}개)</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="map-variable-list" style={{ userSelect: 'none' }}>
                    {filteredVariables.map(v => (
                        <VariableCardItem
                            key={v.id}
                            v={v}
                            isActive={(localSelectedId ?? selectedVariableId) === v.id}
                            isChecked={localAllSelected !== null ? localAllSelected : selectedSet.has(v.id)}
                            issueVar={variableIssueMap.get(v.id) || variableIssueMap.get(v.sysName)}
                            isComposite={compositeVarSet.has(v.sysName)}
                            onItemClick={handleItemClick}
                            onMouseDownItem={handleMouseDownItem}
                            onMouseEnterItem={handleMouseEnterItem}
                            onToggleSelect={handleToggleSelect}
                        />
                    ))}
                    {filteredVariables.length === 0 && (
                        <div style={{ padding: '24px 16px', color: '#94a3b8', fontSize: '13px', textAlign: 'center' }}>
                            표시할 변수가 없습니다.
                        </div>
                    )}
                </div>
            </div>

            {/* 선택된 변수의 보기 레이블 그리드 */}
            <div className="category-detail-content">
                {/* 선택 변수 헤더 */}
                <div className="detail-header">
                    <div className="v-info-title">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{selectedVariable?.sysName}</span>
                            {currentVarIssueInfo && (
                                <span style={{
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    background: currentVarIssueInfo.worst === 'error' ? '#fef2f2' : (currentVarIssueInfo.worst === 'warn' ? '#fef3c7' : '#eff6ff'),
                                    border: `1px solid ${currentVarIssueInfo.worst === 'error' ? '#fecdd3' : (currentVarIssueInfo.worst === 'warn' ? '#fcd34d' : '#bfdbfe')}`,
                                    color: currentVarIssueInfo.worst === 'error' ? '#dc2626' : (currentVarIssueInfo.worst === 'warn' ? '#b45309' : '#2563eb')
                                }}>
                                    {currentVarIssueInfo.worst === 'error' ? '오류 발견' : (currentVarIssueInfo.worst === 'warn' ? '경고 발견' : '참고')}
                                </span>
                            )}

                            {/* 오류/경고 발견 배지 바로 옆에 검사 문제 문장 내용만 직접 출력 */}
                            {currentVarIssueInfo && currentVarIssueInfo.issues && currentVarIssueInfo.issues.length > 0 && (
                                currentVarIssueInfo.issues.map((iss, idx) => {
                                    const rawMsg = iss.message || '';
                                    const cleanedMsg = rawMsg.replace(/^\[(오류|경고|참고)\]\s*/, '');
                                    const textColor = iss.grade === 'error' ? '#dc2626' : (iss.grade === 'warn' ? '#b45309' : '#2563eb');

                                    return (
                                        <span key={idx} style={{ fontSize: '12px', color: textColor, fontWeight: '600', marginLeft: '2px' }}>
                                            {cleanedMsg}
                                        </span>
                                    );
                                })
                            )}

                            {isCurrentVarComposite && (
                                <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '12px', background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#64748b' }}>
                                    복합 문항 (검사 안 함)
                                </span>
                            )}
                        </div>
                        <span className="v-info-label" style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>{selectedVariable?.label}</span>
                    </div>
                    <button
                        className="add-value-btn"
                        onClick={handleOpenSingleEditModal}
                    >
                        <Edit2 size={13} /> 레이블 편집
                    </button>
                </div>

                {/* 오른쪽 보기 표 & 줄 없는 문제(미아 코드 등) 문장 영역 */}
                <div className="category-grid-container" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

                    {/* 복합 문항 안내 카드 */}
                    {isCurrentVarComposite && (
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', color: '#64748b' }}>
                            ℹ 복합 문항(연락처, 연도/월 등)은 응답 값이 하위 값을 이어 붙인 것이므로 코드/미아 코드 검사를 건너뛰었습니다.
                        </div>
                    )}

                    {/* 보기 그리드 테이블 (줄 색칠 적용) */}
                    <div className="cmn_grid singlehead" style={{ flex: 1, minHeight: 0 }}>
                        <KendoGridV2
                            data={currentGridData}
                            height="100%"
                            scrollable="scrollable"
                        >
                            <Column field="rowNo" title="no" width="60px" cell={cellRowNo} />
                            <Column field="code" title="코드" width="70px" cell={cellCode} />
                            <Column field="label" title="레이블" cell={cellLabel} />
                            <Column field="delete" title="삭제" width="80px" cell={cellDelete} />
                        </KendoGridV2>
                    </div>

                </div>
            </div>
        </div>
    </div>
);
};

export default React.memo(ViewLabelTab);
