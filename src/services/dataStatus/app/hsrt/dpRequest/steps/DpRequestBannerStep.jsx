import React, { useState, useEffect, useContext, useCallback, useMemo, memo, forwardRef, useImperativeHandle, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Save, Trash2, ChevronDown, Plus, Search, ChevronLeft, ChevronRight, GripVertical, X, Info } from 'lucide-react';
import { Popup } from '@progress/kendo-react-popup';
import { DpRequestPageApi } from '../DpRequestPageApi';
import KendoGridV3, { GridColumn as Column } from "@/components/kendo/KendoGridV3";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import { modalContext } from "@/components/common/Modal.jsx";
import useUpdateHistory from '@/hooks/useUpdateHistory';

// --- 커스텀 헤더 셀 (조건 아이콘) ---
const ConditionHeaderCell = (props) => {
    const anchorRef = useRef(null);
    const [show, setShow] = useState(false);

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <span>{props.title}</span>
            <div
                ref={anchorRef}
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
                style={{ cursor: 'pointer', display: 'flex' }}
                onClick={(e) => e.stopPropagation()}
            >
                <Info size={14} color="#94a3b8" />
            </div>

            <Popup
                anchor={anchorRef.current}
                show={show}
                animate={false}
                popupClass="condition-tooltip-popup"
                style={{ zIndex: 100000 }} // Grid header 위에 잘 보이도록 z-index 높임
            >
                <div style={{
                    padding: '12px 16px',
                    background: '#ffffff',
                    width: 'max-content',
                    minWidth: '160px',
                    lineHeight: '1.6',
                    color: '#334155',
                    textAlign: 'left' // 헤더 중앙정렬 영향을 받지 않도록 분리
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <div style={{
                            width: '18px', height: '18px', borderRadius: '50%',
                            background: '#e2e8f0', color: '#64748b',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '11px', fontWeight: 'bold'
                        }}>i</div>
                        <span style={{ color: '#2563eb', fontWeight: '800', fontSize: '13px' }}>조건</span>
                    </div>
                    <div style={{ fontSize: '13px', letterSpacing: '-0.3px', marginLeft: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div><span style={{ fontWeight: 600 }}>• 동등 대조:</span> <span>GENDER == 1, REGION == 'A'</span></div>
                        <div><span style={{ fontWeight: 600 }}>• 비교 대조:</span> <span>AGE &gt;= 20, AGE &lt; 30</span></div>
                        <div><span style={{ fontWeight: 600 }}>• IN 연산:</span> <span>AGE_GROUP in [2, 3, 4]</span></div>
                        <div><span style={{ fontWeight: 600 }}>• 다중 조건:</span> <span>(SQ1 == 1 or SQ1 == 2) and SQ2 == 1</span></div>
                    </div>
                </div>
            </Popup>
        </div>
    );
};

// 드래그 상태를 React State가 아닌 전역 변수로 관리 (리렌더링으로 인한 드래그 취소 방지)
let currentDragState = null;
const lastClickTracker = new Map(); // 더블 클릭 수동 감지용

// --- 로컬 상태 기반 병합 편집 셀 ---
const MergedTextEditCell = React.memo(({ dataItem, field, onUpdate, dataIndex, data, dependencies = [], align = 'left', placeholder = '', disableMerge = false, level, handleDrop, selectedCells = [], onCellMouseDown, onCellMouseEnter, onContextMenu }) => {
    // 1. 병합(rowSpan) 계산 로직
    let rowSpan = 1;
    let isHidden = false;

    if (!disableMerge && dataIndex > 0) {
        let isSameAsPrev = data[dataIndex][field] === data[dataIndex - 1][field];
        if (isSameAsPrev && dependencies.length > 0) {
            for (let dep of dependencies) {
                if (data[dataIndex][dep] !== data[dataIndex - 1][dep]) {
                    isSameAsPrev = false;
                    break;
                }
            }
        } // ADDED MISSING BRACE HERE
        
        if (isSameAsPrev && data[dataIndex][`_unmerged_${field}`]) {
            isSameAsPrev = false;
        }
        if (isSameAsPrev) {
            isHidden = true;
            rowSpan = 0;
        }
    }

    if (!disableMerge && !isHidden) {
        for (let i = dataIndex + 1; i < data.length; i++) {
            let isSame = data[i][field] === data[dataIndex][field];
            if (isSame && dependencies.length > 0) {
                for (let dep of dependencies) {
                    if (data[i][dep] !== data[dataIndex][dep]) {
                        isSame = false;
                        break;
                    }
                }
            }
            if (isSame && data[i][`_unmerged_${field}`]) {
                isSame = false;
            }
            if (isSame) rowSpan++;
            else break;
        }
    }

    const getInitialVal = () => {
        let val = String(dataItem[field] ?? '').trim();
        if (field === 'logic' && (val === '0-' || val === '0')) return '';
        return val;
    };

    const [isEditing, setIsEditing] = useState(false);
    const [localVal, setLocalVal] = useState(getInitialVal());
    const inputRef = useRef(null);

    useEffect(() => {
        if (!isEditing) {
            setLocalVal(getInitialVal());
        } else {
            // 그리드의 focus stealing을 피하기 위해 약간 지연 후 포커스
            setTimeout(() => {
                if (inputRef.current) inputRef.current.focus();
            }, 50);
        }
    }, [dataItem[field], isEditing]);

    if (isHidden) return null; // 병합되어 숨겨지는 셀

    const commit = () => {
        setIsEditing(false);
        // 원래 값이 '0-' 였는데 우리가 ''로 보여준 경우, 그대로 ''로 유지하게 됨 (0- 도 빈 값으로 취급하므로)
        if (localVal !== String(dataItem[field] ?? '')) {
            // 만약 아무것도 안치고 닫았는데 기존이 '0-' 라면 ''로 업데이트 됨
            onUpdate(dataIndex, rowSpan, field, localVal, data);
        }
    };

    if (isEditing) {
        return (
            <td rowSpan={rowSpan} style={{ padding: '1px 4px', verticalAlign: 'middle', background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
                <input
                    ref={inputRef}
                    placeholder={placeholder}
                    value={localVal}
                    onChange={e => setLocalVal(e.target.value)}
                    onMouseDown={e => e.stopPropagation()}
                    onClick={e => e.stopPropagation()}
                    onBlur={commit}
                    onKeyDown={e => {
                        e.stopPropagation();
                        if (e.key === 'Enter') commit();
                        if (e.key === 'Escape') { setLocalVal(String(dataItem[field] ?? '')); setIsEditing(false); }
                    }}
                    style={{ width: '100%', height: '22px', fontSize: '13px', border: '1px solid #3b82f6', outline: 'none', padding: '0 4px', borderRadius: '2px', textAlign: align, boxSizing: 'border-box' }}
                />
            </td>
        );
    }

    const isSelected = selectedCells.some(c => c.r >= dataIndex && c.r < dataIndex + rowSpan && c.c === field);

    return (
        <td
            rowSpan={rowSpan}
            style={{ 
                padding: '1px 4px', 
                verticalAlign: 'middle', 
                background: isSelected ? '#e0f2fe' : '#fff', // Selected state background
                textAlign: align, 
                borderBottom: rowSpan > 1 ? '1px solid #e2e8f0' : undefined, 
                position: 'relative',
                userSelect: 'none' // 텍스트 드래그 선택 방지
            }}
            onMouseDown={(e) => {
                if (isEditing) return;
                if (e.button === 2) {
                    onContextMenu && onContextMenu(e, dataIndex, field);
                } else if (e.button === 0) {
                    const cellKey = `${dataIndex}-${field}`;
                    const now = Date.now();
                    const lastClick = lastClickTracker.get(cellKey) || 0;
                    
                    if (now - lastClick < 500) { // 500ms로 시간 연장
                        // Double click detected manually!
                        setIsEditing(true);
                        lastClickTracker.delete(cellKey);
                    } else {
                        lastClickTracker.set(cellKey, now);
                        // 그리드 리렌더링으로 인해 기존 편집 셀의 input이 onBlur를 발생시키기 전에 파괴되는 것을 방지하기 위해 지연 실행
                        setTimeout(() => {
                            onCellMouseDown && onCellMouseDown(e, dataIndex, field);
                        }, 0);
                    }
                }
            }}
            onMouseEnter={() => {
                if (!isEditing) {
                    onCellMouseEnter && onCellMouseEnter(dataIndex, field);
                }
            }}
            onContextMenu={(e) => e.preventDefault()}
            onDragOver={(e) => {
                if (!currentDragState || currentDragState.level !== level) return;
                
                // 제약조건 검사
                if (level === 2 && dataItem.label3 !== currentDragState.parentLabel3) return;
                if (level === 1 && (dataItem.label3 !== currentDragState.parentLabel3 || dataItem.label2 !== currentDragState.parentLabel2)) return;

                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = "move";
                const rect = e.currentTarget.getBoundingClientRect();
                const y = e.clientY - rect.top;
                
                if (y < rect.height / 2) {
                    e.currentTarget.classList.add("dp-drop-top");
                    e.currentTarget.classList.remove("dp-drop-bottom");
                } else {
                    e.currentTarget.classList.add("dp-drop-bottom");
                    e.currentTarget.classList.remove("dp-drop-top");
                }
            }}
            onDragLeave={(e) => {
                e.currentTarget.classList.remove("dp-drop-top");
                e.currentTarget.classList.remove("dp-drop-bottom");
            }}
            onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.classList.remove("dp-drop-top");
                e.currentTarget.classList.remove("dp-drop-bottom");
                const rect = e.currentTarget.getBoundingClientRect();
                const y = e.clientY - rect.top;
                const position = y < rect.height / 2 ? 'top' : 'bottom';
                handleDrop(level, dataIndex, position, rowSpan);
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', height: '100%', minHeight: '26px' }}>
                {level > 0 && (
                    <div 
                        draggable
                        onMouseDown={(e) => e.stopPropagation()}
                        onDragStart={(e) => {
                            e.stopPropagation();
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData("text/plain", String(level));
                            currentDragState = {
                                level,
                                startIndex: dataIndex,
                                rowSpan,
                                parentLabel3: dataItem.label3,
                                parentLabel2: dataItem.label2
                            };
                        }}
                        onDragEnd={() => {
                            currentDragState = null;
                        }}
                        style={{ cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', color: '#94a3b8' }}
                        title="드래그하여 순서 변경"
                    >
                        <GripVertical size={14} />
                    </div>
                )}
                <div style={{ flex: 1, minWidth: 0, paddingLeft: level ? '2px' : '0', cursor: 'text' }} onDoubleClick={() => setIsEditing(true)}>
                    {localVal || (placeholder ? <span style={{ fontSize: '11px', opacity: 0.7 }}>{placeholder}</span> : (field === 'logic' ? '' : '-'))}
                </div>
            </div>
        </td>
    );
});

// --- (성능 개선) 개별 아이템 메모이제이션 ---
const getTypeClass = (type) => {
    if (!type) return '';
    const lower = String(type).toLowerCase();
    if (lower === 'open(문자)') return 'open-text';
    if (lower === 'open(숫자)') return 'open-num';
    return lower;
};

const VariableItem = memo(({ v, isSelected, onDragStart, onClick }) => (
    <div
        className={`variable-item ${isSelected ? 'selected' : ''}`}
        draggable
        onDragStart={(e) => onDragStart(e, v)}
        onClick={(e) => { e.stopPropagation(); onClick(v.id); }}
        style={{ borderRadius: '6px' }}
    >
        <div className="variable-item-header">
            <div className="variable-item__name">{v.label}</div>
            {v.type && <span className={`question-type-badge ${getTypeClass(v.type)}`} style={{ marginBottom: '-12.5px' }}>{v.type}</span>}
        </div>
        <div className="variable-item__label">{v.id}</div>
    </div>
));

// --- (컴팩트 디자인 & 여유로운 패딩) 배너 생성 전용 푸터 바 ---
const BannerActionFooter = memo(({ onCreateBanner, name, onNameChange }) => {
    return (
        <div style={{
            padding: '14px 16px 0px',
            background: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>배너명</span>
                <input
                    type="text"
                    placeholder="배너명을 입력하세요"
                    value={name}
                    onChange={(e) => onNameChange(e.target.value)}
                    className="dp-input"
                    style={{ flex: 1, maxWidth: '500px' }}
                />
            </div>
            <button
                className="dp-primary-btn"
                onClick={() => onCreateBanner(name)}
                style={{
                    height: '32px',
                    padding: '0 20px',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    background: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                배너 생성
            </button>
        </div>
    );
});

const DpRequestBannerStep = forwardRef(({ onUnsavedChange }, ref) => {
    const auth = useSelector((store) => store.auth);
    const { getBannerDetail, getBaseVariableList, generateBanner, saveBannerDetail } = DpRequestPageApi();
    const loadingSpinner = useContext(loadingSpinnerContext);
    const modal = useContext(modalContext);

    // --- 히스토리 관리 (Undo/Redo) ---
    const history = useUpdateHistory('dp-banner');
    const isHistoryAction = useRef(false);

    // 부모 컴포넌트에서 호출할 수 있도록 기능 노출
    useImperativeHandle(ref, () => ({
        save: async () => {
            return await handleSaveBanner();
        }
    }));

    const [banners, setBanners] = useState([]);
    const [selectedBanner, setSelectedBanner] = useState(null); // id
    const [baseVariables, setBaseVariables] = useState([]);
    const [currentLabel, setCurrentLabel] = useState('');
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [isVariablePanelOpen, setIsVariablePanelOpen] = useState(true);
    const [isBannerSidebarOpen, setIsBannerSidebarOpen] = useState(true);
    const [wizardSearch, setWizardSearch] = useState('');
    const [bannerSearch, setBannerSearch] = useState('');
    const [colVars, setColVars] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);

    const [selectedCells, setSelectedCells] = useState([]); // [{r, c}]
    const [isSelecting, setIsSelecting] = useState(false);
    const [contextMenu, setContextMenu] = useState(null); // {x, y, r, c}

    // --- 삭제 관리용 스테이트 추가 ---
    const [deletedBannerIds, setDeletedBannerIds] = useState([]); // 서버에 실제 삭제 요청할 ID들
    const [originalBannerIds, setOriginalBannerIds] = useState([]); // 초기 로딩된 배너 ID 목록 (신규 구분용)

    // 키보드 이벤트 (Undo/Redo)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key.toLowerCase() === 'z') {
                    if (e.shiftKey) { // Redo (Ctrl+Shift+Z)
                        const redoData = history.redo();
                        if (redoData) {
                            isHistoryAction.current = true;
                            setBanners([...redoData]);
                        }
                    } else { // Undo (Ctrl+Z)
                        const undoData = history.undo();
                        if (undoData) {
                            isHistoryAction.current = true;
                            setBanners([...undoData]);
                        }
                    }
                } else if (e.key.toLowerCase() === 'y') { // Redo (Ctrl+Y)
                    const redoData = history.redo();
                    if (redoData) {
                        isHistoryAction.current = true;
                        setBanners([...redoData]);
                    }
                }
            }
        };

        const handleGlobalMouseUp = () => setIsSelecting(false);
        const handleGlobalClick = () => setContextMenu(null);

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('mouseup', handleGlobalMouseUp);
        window.addEventListener('click', handleGlobalClick);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
            window.removeEventListener('click', handleGlobalClick);
        };
    }, [history]);

    // 데이터 변경 감지 및 히스토리 커밋
    useEffect(() => {
        if (isHistoryAction.current) {
            isHistoryAction.current = false;
            return;
        }
        if (banners.length > 0) {
            history.commit(banners);
        }
    }, [banners, history]);

    // --- Banner Management ---
    const handleAddBanner = () => {
        let maxNum = 0;
        banners.forEach(b => {
            const match = b.id.match(/^banner_(\d+)$/);
            if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxNum) maxNum = num;
            }
        });
        const newId = `banner_${String(maxNum + 1).padStart(2, '0')}`;

        const newBanner = {
            id: newId,
            label: '',
            info: [],
            isNew: true
        };
        setBanners(prev => [newBanner, ...prev]);
        setSelectedBanner(newId);
        setCurrentLabel('');
        if (onUnsavedChange) onUnsavedChange(true);
    };

    // --- Interaction Logic ---
    const toggleSelection = useCallback((id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    }, []);

    const handleDragStart = useCallback((e, draggedVar) => {
        let targets = [];
        if (selectedIds.includes(draggedVar.id)) {
            targets = baseVariables.filter(v => selectedIds.includes(v.id));
        } else {
            targets = [draggedVar];
            setSelectedIds([draggedVar.id]);
        }
        e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'EXTERNAL', items: targets }));
    }, [selectedIds, baseVariables]);

    const handleInternalItemDragStart = (e, gIdx, iIdx) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'INTERNAL_ITEM', gIdx, iIdx }));
    };

    const handleInternalGroupDragStart = (e, gIdx) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'INTERNAL_GROUP', gIdx }));
    };

    const handleDrop = (e, targetIdx) => {
        e.preventDefault();
        try {
            const dataStr = e.dataTransfer.getData('text/plain');
            if (!dataStr) return;
            const data = JSON.parse(dataStr);

            setColVars(prev => {
                let next = [...prev.map(g => [...g])];
                if (data.type === 'INTERNAL_ITEM') {
                    const item = next[data.gIdx][data.iIdx];
                    next[data.gIdx].splice(data.iIdx, 1);
                    if (targetIdx === 'new') {
                        if (next.length >= 10) {
                            modal.showAlert('알림', '최대 10개 그룹까지만 구성할 수 있습니다.');
                            return prev;
                        }
                        next.push([item]);
                    } else {
                        if (!next[targetIdx].find(v => v.id === item.id)) {
                            if (next[targetIdx].length >= 3) {
                                modal.showAlert('알림', '한 그룹에는 최대 3개 문항까지만 넣을 수 있습니다.');
                                return prev;
                            }
                            next[targetIdx].push(item);
                        } else if (data.gIdx === targetIdx) {
                            next[targetIdx].splice(data.iIdx, 0, item);
                        }
                    }
                    return next.filter(g => g.length > 0);
                }
                if (data.type === 'INTERNAL_GROUP') {
                    const group = next[data.gIdx];
                    next.splice(data.gIdx, 1);
                    if (targetIdx === 'new') {
                        if (next.length >= 10) {
                            modal.showAlert('알림', '최대 10개 그룹까지만 구성할 수 있습니다.');
                            return prev;
                        }
                        next.push(group);
                    } else next.splice(targetIdx, 0, group);
                    return next;
                }
                if (data.type === 'EXTERNAL') {
                    const itemsToAdd = data.items;
                    if (targetIdx === 'new') {
                        // 새로 추가되면서 10개를 넘는지 체크
                        if (next.length + itemsToAdd.length > 10) {
                            modal.showAlert('알림', '최대 10개 그룹까지만 구성할 수 있습니다.');
                            // 가능힌 부분까지만 추가하거나 아예 안하거나 결정 (여기서는 안전하게 경고 후 중단)
                            return prev;
                        }
                        next.push(...itemsToAdd.map(it => [it]));
                    } else {
                        const unique = itemsToAdd.filter(it => !next[targetIdx].find(v => v.id === it.id));
                        if (next[targetIdx].length + unique.length > 3) {
                            modal.showAlert('알림', '한 그룹에는 최대 3개 문항까지만 넣을 수 있습니다.');
                            return prev;
                        }
                        next[targetIdx] = [...next[targetIdx], ...unique];
                    }
                }
                return next;
            });
            setSelectedIds([]);
        } catch (err) { console.error(err); }
    };

    const removeVar = (varId, groupIndex) => {
        setColVars(prev => {
            const next = prev.map(g => [...g]);
            next[groupIndex] = next[groupIndex].filter(v => v.id !== varId);
            return next.filter(g => g.length > 0);
        });
    };

    const handleDeleteBanner = (e, bannerId) => {
        e.stopPropagation();
        const bannerToDelete = banners.find(b => b.id === bannerId);

        modal.showConfirm('삭제 확인', `배너(${bannerToDelete?.label || bannerId})를 삭제하시겠습니까?`, {
            btns: [
                { title: "취소", click: () => { } },
                {
                    title: "삭제",
                    click: async () => {
                        // 1. 만약 저장되지 않은 새 배너라면 로컬에서만 제거
                        if (bannerToDelete?.isNew) {
                            setBanners(prev => prev.filter(b => b.id !== bannerId));
                            const nextBanners = banners.filter(b => b.id !== bannerId);
                            if (nextBanners.length > 0) {
                                setSelectedBanner(nextBanners[0].id);
                                setCurrentLabel(nextBanners[0].label);
                            } else {
                                setSelectedBanner(null);
                                setCurrentLabel('');
                            }
                            return;
                        }

                        // 2. 서버에 저장된 배너라면 API 호출
                        const pageId = sessionStorage.getItem('pageId');
                        if (!pageId) return;

                        try {
                            loadingSpinner.show();
                            const requestData = {
                                pageid: pageId,
                                user: auth?.user?.userId,
                                variables: {},
                                delete_ids: [bannerId]
                            };

                            const result = await saveBannerDetail.mutateAsync(requestData);
                            if (result?.success === "777") {
                                modal.showAlert('알림', '배너가 삭제되었습니다.');
                                if (onUnsavedChange) onUnsavedChange(false);
                                await fetchBannerData(false, true); // 삭제 시 무조건 첫 번째 배너 선택
                            }
                        } catch (error) {
                            console.error('Delete error:', error);
                            modal.showAlert('오류', '배너 삭제 중 문제가 발생했습니다.');
                        } finally {
                            loadingSpinner.hide();
                        }
                    }
                }
            ]
        });
    };

    // --- 데이터 로직 ---
    const fetchBannerData = async (isFresh = false, forceSelectFirst = false) => {
        const pageId = sessionStorage.getItem('pageId');
        if (!pageId || !auth?.user?.userId) return;
        try {
            loadingSpinner.show();
            const result = await getBannerDetail.mutateAsync({ pageid: pageId, user: auth.user.userId });
            if (result?.success === '777' && result.resultjson) {
                if (result.resultjson.base_variables) {
                    const baseVars = result.resultjson.base_variables;
                    setBaseVariables(Array.isArray(baseVars) ? baseVars : Object.values(baseVars));
                }
                if (result.resultjson.recoded_variables) {
                    const raw = result.resultjson.recoded_variables;
                    const recodes = Array.isArray(raw)
                        ? raw
                        : Object.entries(raw).map(([key, val]) => ({ id: val.id || key, ...val }));

                    const formatted = recodes
                        .filter(v => String(v.id || '').toLowerCase().startsWith("banner"))
                        .sort((a, b) => {
                            const orderA = typeof a.recoded_order === 'number' ? a.recoded_order : 999999;
                            const orderB = typeof b.recoded_order === 'number' ? b.recoded_order : 999999;
                            if (orderA !== orderB) return orderA - orderB;
                            return String(a.id || '').localeCompare(String(b.id || ''));
                        })
                        .map((v, i) => ({
                            ...v,
                            id: v.id || `var_${i}`,
                            label: v.name || v.label,
                            subId: v.id || `banner_0${i + 1}`,
                            info: (v.info || v.categories || []).map(item => ({ ...item, inEdit: false }))
                        }));
                    setBanners(formatted);
                    history.reset(formatted); // 초기 히스토리 기준점을 서버 데이터로 설정
                    setSelectedCells([]); // 데이터 재조회 시 셀 선택 초기화

                    // 서버에서 온 원본 ID들 보관
                    const ids = formatted.map(b => b.id);
                    setOriginalBannerIds(ids);
                    setDeletedBannerIds([]); // 삭제 목록 초기화

                    if (formatted.length > 0) {
                        const target = isFresh ? formatted[formatted.length - 1] : formatted[0];
                        if (isFresh || !selectedBanner || forceSelectFirst) {
                            setSelectedBanner(target.id);
                            setCurrentLabel(target.label);
                        }
                    } else if (forceSelectFirst || !selectedBanner) {
                        setSelectedBanner(null);
                        setCurrentLabel('');
                    }
                }
            }
        } catch (error) { console.error(error); }
        finally { loadingSpinner.hide(); }
    };

    const handleCreateBanner = async (name) => {
        if (!name?.trim()) return modal.showAlert('알림', '배너명을 입력해 주세요.');
        if (colVars.length === 0) return modal.showAlert('알림', '구성된 문항이 없습니다.');
        const pageId = sessionStorage.getItem('pageId');
        const formula = colVars.map(group => group.map(v => v.id).join('*')).join('+');
        try {
            loadingSpinner.show();
            // 1. Generate (미리보기 연산)
            const result = await generateBanner.mutateAsync({ pageid: pageId, formula, label: name, user: auth?.user?.userId });

            if (result?.success === "777" && result?.resultjson?.variable) {
                const generatedVar = result.resultjson.variable;

                // 2. 받은 variable 객체를 그대로 사용하여 Save (실제 DB 저장)
                const saveRequestData = {
                    pageid: pageId,
                    user: auth?.user?.userId,
                    variables: {
                        [generatedVar.id]: generatedVar
                    },
                    delete_ids: []
                };

                const saveResult = await saveBannerDetail.mutateAsync(saveRequestData);

                if (saveResult?.success === "777") {
                    // 3. 완료 후 재조회
                    await fetchBannerData(false);
                    setSelectedBanner(generatedVar.id);
                    setCurrentLabel(generatedVar.name || generatedVar.label);
                    setColVars([]);
                    setIsWizardOpen(false);
                    if (onUnsavedChange) onUnsavedChange(false); // 생성 성공 시 더티 해제
                    modal.showAlert('알림', '배너가 정상적으로 생성 및 저장되었습니다.');
                } else {
                    modal.showAlert('오류', '배너 저장에 실패했습니다.');
                }
            } else {
                modal.showAlert('오류', '배너 정보를 생성할 수 없습니다.');
            }
        } catch (error) {
            console.error(error);
            modal.showAlert('오류', '배너 생성 중 오류가 발생했습니다.');
        } finally {
            loadingSpinner.hide();
        }
    };

    const updateBannerInfo = useCallback((newInfo) => {
        setBanners(prev => prev.map(b => b.id === selectedBanner ? { ...b, info: newInfo, isDirty: true } : b));
    }, [selectedBanner]);

    const handleMergedUpdate = useCallback((dataIndex, rowSpan, field, value, data) => {
        const newData = [...data];
        for (let i = 0; i < rowSpan; i++) {
            newData[dataIndex + i] = { ...newData[dataIndex + i], [field]: value };
        }
        updateBannerInfo(newData);
    }, [updateBannerInfo]);

    const handleReorderBlock = useCallback((level, targetIndex, position, targetRowSpan) => {
        if (!currentDragState) return;
        const { startIndex, rowSpan } = currentDragState;
        
        let actualTargetIndex = targetIndex;
        if (position === 'bottom') {
            actualTargetIndex = targetIndex + targetRowSpan;
        }

        // 목적지가 자신이 속한 블록 내부인 경우 무시
        if (actualTargetIndex > startIndex && actualTargetIndex < startIndex + rowSpan) return;
        // 목적지가 현재 위치와 완전히 동일한 경우 무시
        if (actualTargetIndex === startIndex || actualTargetIndex === startIndex + rowSpan) return;

        const currentBanner = banners.find(b => b.id === selectedBanner);
        if (!currentBanner || !currentBanner.info) return;

        const newData = [...currentBanner.info];
        const block = newData.splice(startIndex, rowSpan);
        
        // 블록이 빠져나갔으므로 타겟 인덱스 조정 (아래쪽에서 위로 올릴 때)
        if (actualTargetIndex > startIndex) {
            actualTargetIndex -= rowSpan;
        }
        
        newData.splice(actualTargetIndex, 0, ...block);
        updateBannerInfo(newData);
    }, [banners, selectedBanner, updateBannerInfo]);

    const handleCellMouseDown = useCallback((e, rowIndex, field) => {
        setIsSelecting(true);
        setSelectedCells([{ r: rowIndex, c: field }]);
        setContextMenu(null);
    }, []);

    const handleCellMouseEnter = useCallback((rowIndex, field) => {
        if (!isSelecting) return;
        
        setSelectedCells(prev => {
            if (prev.length === 0) return [{ r: rowIndex, c: field }];
            const start = prev[0];
            const newSelection = [];
            
            const colFields = ['label3', 'label2', 'label'];
            const startColIdx = colFields.indexOf(start.c);
            const currColIdx = colFields.indexOf(field);
            
            if (startColIdx === -1 || currColIdx === -1) return prev;

            const minRow = Math.min(start.r, rowIndex);
            const maxRow = Math.max(start.r, rowIndex);
            const minCol = Math.min(startColIdx, currColIdx);
            const maxCol = Math.max(startColIdx, currColIdx);

            for (let r = minRow; r <= maxRow; r++) {
                for (let c = minCol; c <= maxCol; c++) {
                    newSelection.push({ r, c: colFields[c] });
                }
            }
            return newSelection;
        });
    }, [isSelecting]);

    const handleContextMenu = useCallback((e, rowIndex, field) => {
        e.preventDefault();
        
        setSelectedCells(prev => {
            const isSelected = prev.some(cell => cell.r === rowIndex && cell.c === field);
            if (!isSelected) {
                return [{ r: rowIndex, c: field }];
            }
            return prev;
        });
        
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            r: rowIndex,
            c: field
        });
    }, []);

    const handleMergeCells = useCallback(() => {
        if (selectedCells.length < 2) return;
        
        const currentBanner = banners.find(b => b.id === selectedBanner);
        if (!currentBanner || !currentBanner.info) return;

        const newData = [...currentBanner.info];
        const colFields = ['label3', 'label2', 'label'];
        
        let changed = false;
        colFields.forEach(field => {
            const cellsInCol = selectedCells.filter(c => c.c === field).map(c => c.r);
            if (cellsInCol.length < 2) return;
            
            const minRow = Math.min(...cellsInCol);
            const maxRow = Math.max(...cellsInCol);
            const targetValue = newData[minRow][field];
            
            for (let i = minRow; i <= maxRow; i++) {
                newData[i] = { ...newData[i], [field]: targetValue };
                delete newData[i][`_unmerged_${field}`];
                changed = true;
            }
        });
        
        if (changed) updateBannerInfo(newData);
        setContextMenu(null);
    }, [selectedCells, banners, selectedBanner, updateBannerInfo]);

    const handleUnmergeCells = useCallback(() => {
        if (selectedCells.length === 0) return;
        
        const currentBanner = banners.find(b => b.id === selectedBanner);
        if (!currentBanner || !currentBanner.info) return;

        const newData = [...currentBanner.info];
        let changed = false;
        
        selectedCells.forEach(cell => {
            const r = cell.r;
            const field = cell.c;
            
            let val = newData[r][field];
            newData[r] = { ...newData[r] };
            
            for (let i = r + 1; i < newData.length; i++) {
                if (newData[i][field] === val) {
                    newData[i] = { ...newData[i], [`_unmerged_${field}`]: true };
                    changed = true;
                } else {
                    break;
                }
            }
        });
        
        if (changed) updateBannerInfo(newData);
        setContextMenu(null);
    }, [selectedCells, banners, selectedBanner, updateBannerInfo]);

    const handleRowClick = useCallback((e) => {
        setBanners(prev => prev.map(b => b.id === selectedBanner ? { ...b, info: b.info.map(it => ({ ...it, inEdit: it === e.dataItem })) } : b));
    }, [selectedBanner]);

    const filteredVariables = useMemo(() => {
        const search = wizardSearch.toLowerCase();
        return (Array.isArray(baseVariables) ? baseVariables : []).filter(v =>
            (v.label || '').toLowerCase().includes(search) || (v.id || '').toLowerCase().includes(search)
        );
    }, [baseVariables, wizardSearch]);

    // 배너 목록 필터링
    const filteredBanners = useMemo(() => {
        const search = bannerSearch.toLowerCase();
        return banners.filter(b =>
            (b.label || '').toLowerCase().includes(search) || (b.id || '').toLowerCase().includes(search)
        );
    }, [banners, bannerSearch]);

    // 배너 탭이 변경될 때 셀 선택 상태 초기화
    useEffect(() => {
        setSelectedCells([]);
    }, [selectedBanner]);

    useEffect(() => {
        fetchBannerData();
        const handlePageUpdate = () => fetchBannerData();
        window.addEventListener("pageSelected", handlePageUpdate);
        return () => window.removeEventListener("pageSelected", handlePageUpdate);
    }, [auth?.user?.userId]);

    useEffect(() => {
        const fetchBaseVariables = async () => {
            const pageId = sessionStorage.getItem('pageId');
            if (!pageId || !auth?.user?.userId) return;
            try {
                const result = await getBaseVariableList.mutateAsync({ pageid: pageId, user: auth.user.userId });
                if (result?.success === '777' && result.resultjson) setBaseVariables(Object.values(result.resultjson));
            } catch (error) { }
        };
        fetchBaseVariables();

        const handlePageUpdate = () => fetchBaseVariables();
        window.addEventListener("pageSelected", handlePageUpdate);
        return () => window.removeEventListener("pageSelected", handlePageUpdate);
    }, [auth?.user?.userId]);

    const handleSaveBanner = async () => {
        const pageId = sessionStorage.getItem('pageId');
        if (!selectedBanner || !pageId) return;

        const currentBannerData = banners.find(b => b.id === selectedBanner);
        if (!currentBannerData) return;

        // API 명세서 형식에 맞게 데이터 가공
        const requestData = {
            pageid: pageId,
            user: auth?.user?.userId, // 사용자ID 추가
            variables: {
                [currentBannerData.id]: {
                    id: currentBannerData.id,
                    label: currentLabel, // 수정된 라벨 사용
                    type: "single", // 기본값
                    recoded_type: "recoded",
                    info: currentBannerData.info.map(it => ({
                        label3: it.label3,
                        label2: it.label2,
                        label: it.label,
                        logic: it.logic
                    }))
                }
            },
            delete_ids: []
        };

        try {
            loadingSpinner.show();
            const result = await saveBannerDetail.mutateAsync(requestData);
            if (result?.success === "777") {
                modal.showAlert('알림', '배너 정보가 저장되었습니다.');
                if (onUnsavedChange) onUnsavedChange(false); // 저장 성공 시 더티 해제
                await fetchBannerData();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Save error:', error);
            modal.showAlert('오류', '배너 저장 중 문제가 발생했습니다.');
            return false;
        } finally {
            loadingSpinner.hide();
        }
    };

    return (
        <div className="dp-request-container" style={{ gap: '12px' }} onClick={() => setBanners(prev => prev.map(b => b.id === selectedBanner ? { ...b, info: b.info.map(it => ({ ...it, inEdit: false })) } : b))}>
            {/* 2. 메인 레이아웃 */}
            <div className="dp-main-layout" onClick={(e) => { e.stopPropagation(); setContextMenu(null); }} style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
                <div className={`dp-sidebar-container ${!isBannerSidebarOpen ? 'collapsed' : ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
                    {!isBannerSidebarOpen && (
                        <div className="dp-sidebar-collapsed-bar" onClick={() => setIsBannerSidebarOpen(true)}>
                            <div className="dp-collapsed-header">
                                <ChevronRight size={16} />
                            </div>
                        </div>
                    )}
                    <div className="dp-sidebar custom-scrollbar" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                        <div className="dp-sidebar-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '8px' }}>
                            <span>생성된 배너 목록 ({filteredBanners.length})</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button
                                    onClick={handleAddBanner}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '4px',
                                        padding: '4px 8px', borderRadius: '4px',
                                        border: '1px solid #3b82f6', background: '#eff6ff',
                                        color: '#3b82f6', fontSize: '12px', fontWeight: 600, cursor: 'pointer'
                                    }}
                                >
                                    <Plus size={14} strokeWidth={3} /> 추가
                                </button>
                                <button className="dp-sidebar-toggle-btn-compact" onClick={() => setIsBannerSidebarOpen(false)}>
                                    <ChevronLeft size={16} />
                                </button>
                            </div>
                        </div>
                        <div className="dp-sidebar-header" style={{ display: 'flex', alignItems: 'center', padding: '12px', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
                            <div className="dp-search-input-wrapper" style={{ flex: 1, width: '100%' }}>
                                <Search size={14} className="dp-search-input-icon" />
                                <input
                                    type="text"
                                    placeholder="배너명 또는 ID 검색"
                                    value={bannerSearch}
                                    onChange={(e) => setBannerSearch(e.target.value)}
                                    className="dp-search-input"
                                />
                            </div>
                        </div>
                        <div className="dp-banner-list" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                            {filteredBanners.map((banner, index) => (
                                <div key={`${banner.id}-${index}`}
                                    className={`dp-banner-item ${selectedBanner === banner.id ? 'active' : ''}`}
                                    onClick={() => { setSelectedBanner(banner.id); setCurrentLabel(banner.label); }}
                                    style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', minHeight: '40px', borderRadius: '8px' }}
                                >
                                    <div className="dp-banner-item-info" style={{ flex: 1, paddingRight: '8px' }}>
                                        <span className="dp-banner-label" style={{ display: 'block', marginBottom: '1px', lineHeight: 1.3, fontSize: '12px', wordBreak: 'break-all', fontWeight: banner.isNew ? 700 : 'normal' }}>
                                            {banner.isNew ? (banner.label || '(새 배너 작성중)') : banner.label}
                                        </span>
                                        <span className="dp-banner-sub" style={{ display: 'block', fontSize: '11px', opacity: 0.6, wordBreak: 'break-all', lineHeight: 1.3, fontWeight: banner.isNew ? 600 : 'normal' }}>
                                            {banner.isNew ? '저장 대기' : banner.id}
                                            {!banner.isNew && banner.isDirty && (
                                                <span style={{ color: '#DC2626', fontSize: '11px', marginLeft: '4px' }}>(수정됨)</span>
                                            )}
                                        </span>
                                    </div>
                                    <button className="dp-banner-delete"
                                        onClick={(e) => handleDeleteBanner(e, banner.id)}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="dp-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    {banners.find(b => b.id === selectedBanner)?.isNew ? (
                        <>
                            <div className="dp-content-header" style={{ height: '48px', display: 'flex', alignItems: 'center', flexShrink: 0, padding: '0 16px', borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
                                <div className="dp-content-label-edit" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>배너명</span>
                                    <input
                                        type="text"
                                        value={currentLabel}
                                        placeholder="배너명을 입력하세요"
                                        onChange={(e) => {
                                            setCurrentLabel(e.target.value);
                                            setBanners(prev => prev.map(b => b.id === selectedBanner ? { ...b, label: e.target.value } : b));
                                            if (onUnsavedChange) onUnsavedChange(true);
                                        }}
                                        className="dp-input"
                                        style={{ width: '800px' }}
                                    />
                                </div>
                                <div className="dp-content-actions" style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => handleCreateBanner(currentLabel)}
                                        className="dp-primary-btn"
                                        style={{ height: '32px', padding: '0 20px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                    >
                                        배너 생성
                                    </button>
                                </div>
                            </div>
                            <div className="dp-wizard-setup" style={{ height: '100%', flex: 1, minHeight: 0 }}>
                                {/* 좌측 변수 목록 */}
                                <div className={`variable-panel ${!isVariablePanelOpen ? 'collapsed' : ''}`}>
                                    <div className="variable-panel-header">
                                        {isVariablePanelOpen && (
                                            <div className="dp-search-input-wrapper">
                                                <Search size={14} className="dp-search-input-icon" />
                                                <input
                                                    type="text"
                                                    placeholder="변수명 검색"
                                                    value={wizardSearch}
                                                    onChange={(e) => setWizardSearch(e.target.value)}
                                                    className="dp-search-input"
                                                />
                                            </div>
                                        )}
                                        <button onClick={() => setIsVariablePanelOpen(prev => !prev)} className="dp-sidebar-toggle-btn-compact">
                                            {isVariablePanelOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                                        </button>
                                    </div>
                                    {isVariablePanelOpen && (
                                        <div className="variable-list custom-scrollbar" style={{ paddingTop: '6px' }}>
                                            {filteredVariables.map((v, index) => (
                                                <VariableItem
                                                    key={`${v.id}-${index}`}
                                                    v={v}
                                                    isSelected={selectedIds.includes(v.id)}
                                                    onDragStart={handleDragStart}
                                                    onClick={toggleSelection}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* 우측 가로축 드롭존 (개선: 5개씩 2줄 그리드) */}
                                <div className="drop-zones-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

                                    <div className="axis-header" style={{ padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>가로축 (열)</span>
                                            <span className="group-count-badge" style={{ fontSize: '10px' }}>{colVars.length} / 10</span>
                                        </div>
                                        <button onClick={() => setColVars([])} className="axis-clear-btn" title="모두 비우기" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                            <X size={14} color="#94a3b8" />
                                        </button>
                                    </div>

                                    <div className="drop-zone-scroll-area custom-scrollbar"
                                        style={{
                                            flex: 1,
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(5, 1fr)',
                                            gap: '12px',
                                            padding: '16px',
                                            background: '#eff6ff',
                                            overflowY: 'auto',
                                            alignContent: 'start',
                                            position: 'relative'
                                        }}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={(e) => handleDrop(e, 'new')}
                                    >
                                        {colVars.map((group, groupIndex) => (
                                            <div
                                                key={groupIndex}
                                                className="col-group"
                                                draggable
                                                onDragStart={(e) => handleInternalGroupDragStart(e, groupIndex)}
                                                onDragOver={(e) => e.preventDefault()}
                                                onDrop={(e) => { e.stopPropagation(); handleDrop(e, groupIndex); }}
                                                style={{ width: '100%', marginBottom: '0', borderRadius: '8px' }}
                                            >
                                                <div className="group-drag-handle" style={{ padding: '2px 0' }}><GripVertical size={14} /></div>
                                                <div className="col-group-items" style={{ minHeight: '30px', paddingBottom: '4px' }}>
                                                    {group.map((v, itemIndex) => (
                                                        <div
                                                            key={`${v.id}-${itemIndex}`}
                                                            className="dropped-tag grouped"
                                                            draggable
                                                            onDragStart={(e) => { e.stopPropagation(); handleInternalItemDragStart(e, groupIndex, itemIndex); }}
                                                            style={{ marginBottom: '3px', borderRadius: '4px', height: 'auto', minHeight: '26px', alignItems: 'flex-start', padding: '6px 4px' }}
                                                        >
                                                            <div className="item-drag-handle" style={{ marginTop: '2px' }}><GripVertical size={10} /></div>
                                                            <span className="tag-text" style={{ fontSize: '11px', whiteSpace: 'normal', wordBreak: 'break-all', lineHeight: 1.3, flex: 1 }}>{v.label}</span>
                                                            <X size={12} className="remove" onClick={() => removeVar(v.id, groupIndex)} style={{ marginTop: '2px', flexShrink: 0 }} />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                        {colVars.length === 0 && (
                                            <div style={{
                                                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8'
                                            }}>
                                                <Plus size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                                                <div style={{ fontSize: '13px', fontWeight: 600 }}>여기에 문항을 끌어다 놓으세요</div>
                                            </div>
                                        )}
                                    </div>

                                    {/* 하단 스티키 액션 바 제거됨 (상단 헤더로 이동) */}
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="dp-content-header" style={{ height: '48px', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                <div className="dp-content-label-edit" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 700 }}>배너명</span>
                                    <input
                                        type="text"
                                        value={currentLabel}
                                        placeholder="배너명을 입력하세요"
                                        onChange={(e) => {
                                            setCurrentLabel(e.target.value);
                                            setBanners(prev => prev.map(b => b.id === selectedBanner ? { ...b, label: e.target.value, isDirty: true } : b));
                                            if (onUnsavedChange) onUnsavedChange(true); // 라벨 변경 시 더티 표시
                                        }}
                                        className="dp-input"
                                        style={{ width: '800px' }}
                                    />
                                </div>
                                <div className="dp-content-actions" style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => {
                                            const banner = banners.find(b => b.id === selectedBanner);
                                            if (!banner) {
                                                modal.showAlert('알림', '선택된 배너가 없습니다.');
                                                return;
                                            }
                                            if (!banner.info || banner.info.length === 0) {
                                                modal.showAlert('알림', '배너 조건이 없습니다.');
                                                return;
                                            }

                                            // 유효한 조건식 필터링 (HSRTapi 방식 적용)
                                            const validInfo = banner.info.filter(c =>
                                                (c.label && c.label.toString().trim() !== "") ||
                                                (c.logic && c.logic.toString().trim() !== "") ||
                                                (typeof c.value === "number" && !Number.isNaN(c.value))
                                            );

                                            if (validInfo.length === 0) {
                                                modal.showAlert('알림', '유효한 배너 조건(라벨 또는 조건식)이 없습니다.');
                                                return;
                                            }

                                            const variablesPayload = {};
                                            baseVariables.forEach(bv => {
                                                variablesPayload[bv.id] = bv;
                                            });
                                            variablesPayload[banner.id] = {
                                                id: banner.id,
                                                label: currentLabel || banner.label,
                                                type: 'single',
                                                info: validInfo
                                            };

                                            const payload = {
                                                pageid: sessionStorage.getItem('pageId') || auth.user.userId,
                                                user: auth.user.userId,
                                                table: {
                                                    id: `__var__${banner.id}`,
                                                    name: currentLabel || banner.label,
                                                    x_info: [],
                                                    y_info: [banner.id]
                                                },
                                                variables: variablesPayload,
                                                include_stats: ["mean", "std", "min", "max", "n"]
                                            };

                                            localStorage.setItem('dp_preview_payload', JSON.stringify(payload));
                                            window.open('/dp_request_preview', '_blank', 'width=600,height=700,left=200,top=100');
                                        }}
                                        style={{
                                            background: '#fff',
                                            border: '1px solid #3b82f6',
                                            color: '#3b82f6',
                                            height: '32px',
                                            padding: '0 16px',
                                            borderRadius: '4px',
                                            fontSize: '13px',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = '#eff6ff'}
                                        onMouseOut={(e) => e.currentTarget.style.background = '#fff'}
                                    >
                                        미리보기 계산
                                    </button>
                                </div>
                            </div>
                            <div className="dp-table-container" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                                <KendoGridV3
                                    data={banners.find(b => b.id === selectedBanner)?.info || []}
                                    addable deletable editField="inEdit"
                                    onDataChange={updateBannerInfo}
                                    onRowClick={handleRowClick}
                                    newRowTemplate={{ label3: '', label2: '', label: '', logic: '' }}
                                >
                                    <Column field="label3" title="대분류" width="150px" cell={(p) => <MergedTextEditCell {...p} data={banners.find(b => b.id === selectedBanner)?.info || []} onUpdate={handleMergedUpdate} level={3} handleDrop={handleReorderBlock} selectedCells={selectedCells} onCellMouseDown={handleCellMouseDown} onCellMouseEnter={handleCellMouseEnter} onContextMenu={handleContextMenu} />} />
                                    <Column field="label2" title="중분류" width="150px" cell={(p) => <MergedTextEditCell {...p} data={banners.find(b => b.id === selectedBanner)?.info || []} dependencies={['label3']} onUpdate={handleMergedUpdate} level={2} handleDrop={handleReorderBlock} selectedCells={selectedCells} onCellMouseDown={handleCellMouseDown} onCellMouseEnter={handleCellMouseEnter} onContextMenu={handleContextMenu} />} />
                                    <Column field="label" title="소분류" cell={(p) => <MergedTextEditCell {...p} data={banners.find(b => b.id === selectedBanner)?.info || []} dependencies={['label3', 'label2']} onUpdate={handleMergedUpdate} level={1} handleDrop={handleReorderBlock} selectedCells={selectedCells} onCellMouseDown={handleCellMouseDown} onCellMouseEnter={handleCellMouseEnter} onContextMenu={handleContextMenu} />} />
                                    <Column field="logic" title="조건" width="180px" headerCell={ConditionHeaderCell} headerClassName="k-text-center" cell={(p) => <MergedTextEditCell {...p} data={banners.find(b => b.id === selectedBanner)?.info || []} onUpdate={handleMergedUpdate} disableMerge={true} />} />
                                </KendoGridV3>
                            </div>
                        </>
                    )}
                    
                    {/* Context Menu */}
                    {contextMenu && (
                        <div style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 100000, background: '#fff', border: '1px solid #ccc', borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', padding: '4px 0', minWidth: '120px' }}>
                            <div style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px' }} onClick={handleMergeCells} onMouseEnter={e => e.target.style.background = '#f1f5f9'} onMouseLeave={e => e.target.style.background = 'transparent'}>
                                셀 병합
                            </div>
                            <div style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px' }} onClick={handleUnmergeCells} onMouseEnter={e => e.target.style.background = '#f1f5f9'} onMouseLeave={e => e.target.style.background = 'transparent'}>
                                셀 분할
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

export default DpRequestBannerStep;
