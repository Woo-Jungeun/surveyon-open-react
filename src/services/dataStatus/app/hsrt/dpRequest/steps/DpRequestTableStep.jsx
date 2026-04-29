import React, { useState, useEffect, useContext, useCallback, useMemo, forwardRef, useImperativeHandle, useRef } from 'react';
import { ChevronDown, Check, Search, X, Info } from 'lucide-react';
import { useSelector } from 'react-redux';
import { Popup } from '@progress/kendo-react-popup';
import { DropDownList, MultiSelect } from '@progress/kendo-react-dropdowns';
import { DpRequestPageApi } from '../DpRequestPageApi';
import KendoGridV2, { GridColumn as Column } from "@/components/kendo/KendoGridV2";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import { modalContext } from "@/components/common/Modal.jsx";
import useUpdateHistory from '@/hooks/useUpdateHistory';

// --- 상수 및 유틸리티 ---
const STAT_OPTIONS = [
    { id: 'mean', label: '평균 (mean)' },
    { id: 'std', label: '표준편차 (std)' },
    { id: 'mode', label: '최빈값 (mode)' },
    { id: 'median', label: '중앙값 (median)' },
];

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

// ============================================================================
// [커스텀 셀 다중 선택(드래그) 및 일괄 변경 제어 모듈]
// React 상태(useState) 렌더링으로 인한 표(Grid) 전체 렉(Lag) 현상을 방지하기 위해,
// 순수 자바스크립트 전역 변수와 DOM 직접 제어(classList)를 활용해 60fps의 부드러운 드래그를 구현합니다.
// ============================================================================
let isDraggingStubGrid = false;           // 현재 마우스를 클릭한 채로 드래그(Drag) 중인지 여부
let stubDragStartId = null;               // 드래그를 처음 시작한 최초 셀의 행(Row) ID
let stubDragLastEnteredId = null;         // 드래그 도중, 가장 마지막에 마우스가 도착한 셀의 행 ID
let stubDragLastEnteredField = null;      // 현재 조작 중인 컬럼(Field) 이름 (예: var_type, x_info 등)
let stubDragHasMoved = false;             // 단순 0.1초 클릭이 아니라, '실제로 다른 셀로 마우스가 이동'했는지 판별
const stubDragSelectedIds = new Set();    // 현재 하늘색으로 강조(하이라이트)된 모든 행 ID 보관
let stubDragBaseSelectedIds = new Set();  // Ctrl 키를 누르고 추가 다중 선택 시, 기존에 이미 선택된 영역을 날리지 않고 보존하는 징검다리 셋

// 마우스를 뗐을 때 (드래그 종료) 처리하는 전역 이벤트
const handleGlobalPointerUpStub = (e) => {
    if (isDraggingStubGrid) {
        // [자동 열기 로직]
        // 단순 클릭이 아니라 실제 화면 상 '드래그(이동)'를 한 직후 마우스 버튼을 떼면,
        // 마지막 셀의 드롭다운을 즉시 자동으로 열어주어 사용자가 바로 일괄 변경을 선택할 수 있게 돕습니다.
        if (stubDragHasMoved && e && !e.ctrlKey && !e.metaKey && stubDragLastEnteredId && stubDragLastEnteredField) {
            const targetCell = document.querySelector(`td[data-row-id="${stubDragLastEnteredId}"][data-field="${stubDragLastEnteredField}"]`);
            if (targetCell) {
                const dropdown = targetCell.querySelector('.dp-mini-dropdown');
                if (dropdown) {
                    setTimeout(() => dropdown.click(), 50); // React 렌더링 사이클을 배려하여 50ms 후 클릭 트리거
                }
            }
        }
    }
    // 상태 초기화
    isDraggingStubGrid = false;
    stubDragStartId = null;
    stubDragHasMoved = false;
};
if (typeof window !== 'undefined') {
    // 중복 등록 방지를 위해 기존 것 제거
    window.removeEventListener('mouseup', handleGlobalPointerUpStub);
    window.removeEventListener('pointerup', handleGlobalPointerUpStub);
    window.addEventListener('mouseup', handleGlobalPointerUpStub);
    window.addEventListener('pointerup', handleGlobalPointerUpStub);
}

const STUB_INLINE_STYLE = `
.stub-cell-selected {
    background-color: #e0f2fe !important;
}
.dp-mini-dropdown-popup .k-list-item,
.dp-mini-dropdown-popup .k-list-optionlabel {
    font-size: 12px !important;
    min-height: 24px !important;
}
.dp-custom-popup {
    border-radius: 8px !important;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1) !important;
    padding: 4px 0 !important;
    border: 1px solid var(--primary-color, #4f46e5) !important;
}
.dp-custom-list-item {
    font-size: 12px !important;
    padding: 4px 12px !important;
    min-height: 24px !important;
    display: flex !important;
    align-items: center !important;
    cursor: pointer !important;
}
.dp-custom-list-item:hover {
    background-color: #f1f5f9 !important;
}
`;
if (typeof document !== 'undefined') {
    let style = document.getElementById('stub-inline-style');
    if (!style) {
        style = document.createElement('style');
        style.id = 'stub-inline-style';
        document.head.appendChild(style);
    }
    if (style.innerHTML !== STUB_INLINE_STYLE) {
        style.innerHTML = STUB_INLINE_STYLE;
    }
}

// 자식 요소(Kendo DropdownList 등)가 클릭 이벤트를 받아 팝업을 여는 것을 막기 위한 캡처 핸들러
// td 래퍼에 부착되어 이벤트가 아래로(자식으로) 내려가기 전(Capture Phase)에 미리 낚아챕니다.
const preventCtrlEvent = (e) => {
    if (e.ctrlKey || e.metaKey) {
        e.stopPropagation(); // 이벤트를 낚아채서 소멸시킴 (자식은 클릭이 된지 모름)
        e.preventDefault();
    }
};

// 마우스를 클릭했을 때 (Capture 단계에서 수신)
const handleStubPointerDownCapture = (e, rowId, field) => {
    // 1. [포탈 버블링 방어] 
    // Kendo 드롭다운 팝업 리스트는 React Portal을 사용해 document.body 끝에 렌더링되지만, 
    // 이벤트는 React 트리를 따라 td까지 거슬러 올라옵니다. 이 경우를 무시합니다.
    if (e.target && (e.target.closest('.k-popup') || e.target.closest('.k-list-container') || e.target.closest('.k-animation-container') || e.target.closest('.dp-dropdown-popup'))) {
        return;
    }

    // 2. [캡처 차단]
    // 사용자가 Ctrl 클릭 시 단순 다중 선택만 하고 싶어 하므로, 드롭다운이 열리지 않게 자식으로 전파를 끊어냅니다.
    if (e.ctrlKey || e.metaKey) {
        e.stopPropagation();
    }

    // 3. 상태 저장 및 초기화
    const idStr = String(rowId);
    isDraggingStubGrid = true;
    stubDragStartId = idStr;
    stubDragLastEnteredId = idStr;
    stubDragLastEnteredField = field;
    stubDragHasMoved = false;

    // 4. 단일 / 다중 선택 로직 분기
    const isMultiSelect = e.ctrlKey || e.metaKey;
    if (!isMultiSelect) {
        // [단일 클릭의 경우] - 이미 다중선택으로 칠해진 영역 안에서 드롭다운을 열기 위해 클릭한 경우는 초기화 우회
        if (!stubDragSelectedIds.has(idStr)) {
            stubDragSelectedIds.clear();
            document.querySelectorAll('.stub-cell-selected').forEach(el => el.classList.remove('stub-cell-selected'));
        }
    } else if (stubDragSelectedIds.has(idStr)) {
        // [다중 클릭의 경우] - Ctrl 누르고 이미 파랗게 칠해진 것을 클릭하면 토글(해제) 처리
        stubDragSelectedIds.delete(idStr);
        e.currentTarget.classList.remove('stub-cell-selected');
        isDraggingStubGrid = false;
        stubDragBaseSelectedIds = new Set(stubDragSelectedIds);
        return;
    }

    // 5. 선택 상태 갱신
    stubDragBaseSelectedIds = new Set(stubDragSelectedIds);
    stubDragSelectedIds.add(idStr);
    e.currentTarget.classList.add('stub-cell-selected');
};

// 마우스가 눌린 상태로 다른 셀을 훑고 지나갈 때 (드래그 다중 범위 선택)
const handleStubPointerEnter = (e, rowId, field) => {
    if (isDraggingStubGrid && stubDragStartId && e.currentTarget) {
        if (String(rowId) !== stubDragStartId) {
            stubDragHasMoved = true; // 최초 클릭 지점을 벗어났음을 기록 (= 단순 클릭이 아님)
        }
        stubDragLastEnteredId = String(rowId);
        stubDragLastEnteredField = field;

        // 1. 현재 컬럼(Field) 전체 셀을 찾아서 시작점과 현재 위치(끝점)의 인덱스를 파악
        const cells = Array.from(document.querySelectorAll(`td[data-field="${field}"]`));
        const startIndex = cells.findIndex(c => c.getAttribute('data-row-id') === String(stubDragStartId));
        const currentIndex = cells.findIndex(c => c.getAttribute('data-row-id') === String(rowId));

        if (startIndex !== -1 && currentIndex !== -1) {
            const min = Math.min(startIndex, currentIndex);
            const max = Math.max(startIndex, currentIndex);

            // 2. 범위를 벗어난 셀들의 시각적 효과 제거 (이전 베이스 스냅샷 제외)
            document.querySelectorAll(`td[data-field="${field}"]`).forEach(el => {
                const idStr = el.getAttribute('data-row-id');
                if (!stubDragBaseSelectedIds.has(idStr)) {
                    el.classList.remove('stub-cell-selected');
                }
            });

            // 3. Set 데이터 롤백 및 동기화
            stubDragSelectedIds.clear();
            stubDragBaseSelectedIds.forEach(id => stubDragSelectedIds.add(id));

            // 4. 새로운 드래그 범위 내 셀들에 시각적 효과 및 Set 추가
            for (let i = min; i <= max; i++) {
                const targetCell = cells[i];
                if (targetCell) {
                    targetCell.classList.add('stub-cell-selected');
                    const rowIdStr = targetCell.getAttribute('data-row-id');
                    stubDragSelectedIds.add(rowIdStr);
                }
            }
        }
    }
};

const getStubDragClasses = (rowId) => {
    return stubDragSelectedIds.has(String(rowId)) ? 'stub-cell-selected' : '';
};

const StatSettingCell = React.memo(({ dataItem, selectedValues, onUpdate }) => {
    // 1. Parse outer props
    const getParsedValues = useCallback((vals) => {
        return Array.isArray(vals) ? vals : (vals ? String(vals).split(',').map(s => s.trim()).filter(Boolean) : []);
    }, []);

    // 2. Local state for fast toggling without triggering KendoGrid renders
    const [selected, setSelected] = useState(() => getParsedValues(selectedValues));
    const [show, setShow] = useState(false);
    const anchor = useRef(null);
    const latestSelectedRef = useRef(selected);

    // Sync from parent if changed externally while closed
    useEffect(() => {
        if (!show) {
            const parsed = getParsedValues(selectedValues);
            setSelected(parsed);
            latestSelectedRef.current = parsed;
        }
    }, [selectedValues, show, getParsedValues]);

    // Handle local toggle lightning-fast!
    const handleChange = (id, checked) => {
        setSelected(prev => {
            const next = checked ? [...prev, id] : prev.filter(v => v !== id);
            latestSelectedRef.current = next;
            return next;
        });
    };

    // Flush changes to parent
    const handleClose = useCallback(() => {
        setShow(false);
        const currentStr = latestSelectedRef.current.join(',');
        const originalStr = getParsedValues(selectedValues).join(',');
        if (currentStr !== originalStr) {
            onUpdate(dataItem, 'stat_summary', currentStr);
        }
    }, [selectedValues, getParsedValues, dataItem, onUpdate]);

    // 팝업 외부 클릭 시 닫기
    useEffect(() => {
        if (!show) return;
        const handleClickOutside = (e) => {
            if (e.target.closest('.k-popup')) return;
            if (anchor.current && !anchor.current.contains(e.target)) {
                handleClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside, true);
        document.addEventListener('pointerdown', handleClickOutside, true);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside, true);
            document.removeEventListener('pointerdown', handleClickOutside, true);
        };
    }, [show, handleClose]);

    let displayText = <span style={{ color: '#94a3b8', fontSize: '13px' }}>미설정</span>;
    if (selected.length > 0) {
        displayText = <span style={{ color: '#1e293b', fontSize: '13px' }}>{selected.join(',')}</span>;
    }

    return (
        <td
            data-field="stat_summary"
            data-row-id={dataItem.source_var_id}
            style={{ padding: '1px 4px', verticalAlign: 'middle', userSelect: 'none' }}
        >
            <div
                ref={anchor}
                className={`dp-mini-dropdown k-dropdownlist k-picker k-picker-md k-rounded-md k-picker-solid ${show ? 'k-focus' : ''}`}
                style={{ width: '100%', height: '22px', cursor: 'pointer', display: 'flex' }}
                onClick={(e) => {
                    e.preventDefault();
                    if (show) handleClose();
                    else setShow(true);
                }}
            >
                <div className="k-input-inner" style={{ flex: 1, padding: '0 8px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', overflow: 'hidden' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', width: '100%', textAlign: 'left' }}>
                        {displayText}
                    </span>
                </div>
                <button className="k-select k-input-button k-button k-icon-button" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
            </div>
            {show && (
                <Popup anchor={anchor.current} show={show} popupClass="k-list-container k-popup k-group k-reset dp-custom-popup" style={{ minWidth: anchor.current?.offsetWidth, marginTop: '4px' }}>
                    <div className="k-list-scroller" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        <ul className="k-list k-reset">
                            {STAT_OPTIONS.map(itemData => {
                                const isChecked = selected.includes(itemData.id);
                                return (
                                    <li
                                        key={itemData.id}
                                        className="k-list-item dp-custom-list-item"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleChange(itemData.id, !isChecked);
                                        }}
                                    >
                                        <label className="dp-checkbox-label" style={{ margin: '0 8px 0 0', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                                            <input type="checkbox" className="dp-checkbox-input" checked={isChecked} readOnly />
                                            <span className="dp-checkbox-box" />
                                        </label>
                                        <span style={{ fontSize: '12px', color: '#1e293b' }}>{itemData.label}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </Popup>
            )}
        </td>
    );
});

const getQuestionTypeInfo = (type) => {
    const rawType = type?.toLowerCase() || '';
    let color = 'dummy';
    let displayType = type;

    if (rawType === 'single') { color = 'single'; }
    else if (rawType === 'multi') { color = 'multi'; }
    else if (rawType === 'rank') { color = 'rank'; }
    else if (rawType === 'minrank') { color = 'minrank'; }
    else if (rawType === 'maxrank') { color = 'maxrank'; }
    else if (rawType === 'scale') { color = 'scale'; }
    else if (rawType === 'dummy') { color = 'dummy'; }
    else if (rawType === 'custom') { color = 'custom'; }
    else if (rawType.includes('문자')) { color = 'open-text'; displayType = 'open(문자)'; }
    else if (rawType.includes('숫자')) { color = 'open-num'; displayType = 'open(숫자)'; }
    else if (rawType.includes('open')) { color = 'open-text'; displayType = 'open'; }

    return { color, displayType };
};

const VAR_TYPE_OPTIONS = ['single', 'multi', 'rank', 'minrank', 'maxrank', 'scale', 'dummy', 'custom', 'open(문자)', 'open(숫자)'];

const canUseScalePreset = (type) => {
    const t = String(type || '').toLowerCase();
    return t === 'scale';
};

const canUseRankPreset = (type) => {
    const t = String(type || '').toLowerCase();
    return t === 'rank' || t === 'minrank' || t === 'maxrank' || t === 'multi';
};

const canUseStatPreset = (type) => {
    const t = String(type || '').toLowerCase();
    return t === 'scale' || t === 'open(숫자)' || t === 'double' || t === 'open-num' || t === 'dummy' || t === 'custom';
};

const canUseGroupPreset = (type) => {
    const t = String(type || '').toLowerCase();
    if (t === 'open(숫자)' || t === 'double' || t === 'open-num') return false;
    return true;
};

// 막혀있는 셀을 위한 스타일
const DISABLED_CELL_STYLE = {
    textAlign: 'center',
    verticalAlign: 'middle',
    backgroundColor: '#eaedf1',
    color: '#94a3b8',
    userSelect: 'none'
};

// --- 공통 컴포넌트: 프리셋 드롭다운 셀 (단일 선택 Kendo DropDownList) ---
const PresetDropdownCell = React.memo(({ field, dataItem, presets, onChange }) => {
    const val = dataItem[field];

    const options = useMemo(() => {
        if (!presets) return [];
        return presets.map(p => {
            const text = typeof p === 'object' ? (p.label || p.name || p.id || 'Unknown') : p;
            const id = typeof p === 'object' ? (p.id || p.value || text) : p;
            return { text: String(text), id: String(id) };
        });
    }, [presets]);

    const valueItem = options.find(o => o.id === String(val) || o.text === String(val)) || null;

    const isEmpty = !valueItem || !valueItem.id;

    const valueRender = (element, value) => {
        if (!value || !value.id) {
            return <span style={{ color: '#94a3b8', fontSize: '13px' }}>미설정</span>;
        }
        return React.cloneElement(element, { ...element.props }, <span style={{ fontSize: '13px' }}>{value.text}</span>);
    };

    const itemRender = (li, itemProps) => {
        return React.cloneElement(li, li.props, <span style={{ fontSize: '12px' }}>{itemProps.dataItem.text}</span>);
    };

    return (
        <td
            data-field={field}
            data-row-id={dataItem.source_var_id}
            onPointerDownCapture={field === 'x_info' ? e => handleStubPointerDownCapture(e, dataItem.source_var_id, field) : undefined}
            onPointerEnter={field === 'x_info' ? e => handleStubPointerEnter(e, dataItem.source_var_id, field) : undefined}
            onMouseDownCapture={field === 'x_info' ? preventCtrlEvent : undefined}
            onClickCapture={field === 'x_info' ? preventCtrlEvent : undefined}
            onMouseDown={field === 'x_info' ? e => e.stopPropagation() : undefined}
            className={field === 'x_info' ? getStubDragClasses(dataItem.source_var_id) : ''}
            style={{ padding: '1px 4px', verticalAlign: 'middle', userSelect: 'none' }}
        >
            <DropDownList
                className="k-dropdown-solid dp-mini-dropdown"
                popupSettings={{ className: "dp-mini-dropdown-popup" }}
                data={options}
                textField="text"
                dataItemKey="id"
                value={valueItem}
                onChange={(e) => {
                    const selectedId = e.value ? e.value.id : '';
                    onChange(dataItem, field, selectedId);
                }}
                defaultItem={{ text: "미설정", id: "" }}
                valueRender={valueRender}
                itemRender={itemRender}
                style={{ width: '100%', height: '22px', fontSize: '13px' }}
            />
        </td>
    );
});

// --- 텍스트 편집 셀: 자체 로컬 state로 타이핑 즉각 반응, onBlur에만 stubs 업데이트 ---
const TextEditCell = React.memo(({ dataItem, field, onUpdate, align = 'left', placeholder = '' }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [localVal, setLocalVal] = useState(String(dataItem[field] ?? ''));

    // 외부에서 dataItem이 바뀔 때만 동기화 (편집 중에는 무시)
    useEffect(() => {
        if (!isEditing) setLocalVal(String(dataItem[field] ?? ''));
    }, [dataItem.source_var_id, dataItem[field], isEditing]);

    const commit = () => {
        setIsEditing(false);
        if (localVal !== String(dataItem[field] ?? '')) onUpdate(dataItem, field, localVal);
    };

    if (isEditing) {
        return (
            <td style={{ padding: '1px 4px', verticalAlign: 'middle' }}>
                <input
                    autoFocus
                    placeholder={placeholder}
                    value={localVal}
                    onChange={e => setLocalVal(e.target.value)}
                    onBlur={commit}
                    onKeyDown={e => {
                        if (e.key === 'Enter') e.target.blur();
                        if (e.key === 'Escape') { setLocalVal(String(dataItem[field] ?? '')); setIsEditing(false); }
                    }}
                    style={{ width: '100%', border: '1px solid #3b82f6', borderRadius: '2px', padding: '0 5px', fontSize: '13px', height: '22px', outline: 'none', boxSizing: 'border-box' }}
                />
            </td>
        );
    }

    return (
        <td
            onClick={() => setIsEditing(true)}
            style={{
                padding: '0 8px', fontSize: '13px', verticalAlign: 'middle', cursor: 'text', textAlign: align,
                color: localVal ? '#1e293b' : '#94a3b8', userSelect: 'none'
            }}
        >
            {localVal || (placeholder ? <span style={{ fontSize: '11px', opacity: 0.7 }}>{placeholder}</span> : '-')}
        </td>
    );
});

// --- 유형 선택 드롭다운 셀 (Kendo DropDownList 연동) ---
const TypeEditCell = React.memo(({ dataItem, onUpdate }) => {
    const val = dataItem.var_type || '';
    const isNew = String(dataItem.source_var_id).startsWith('new_');

    const handleChange = (e) => {
        onUpdate(dataItem, 'var_type', e.value);
    };

    const valueRender = (element, value) => {
        if (!value) {
            return <span style={{ color: '#94a3b8', fontSize: '13px' }}>미설정</span>;
        }
        return React.cloneElement(element, { ...element.props }, <span style={{ fontSize: '13px' }}>{value}</span>);
    };

    const itemRender = (li, itemProps) => {
        return React.cloneElement(li, li.props, <span style={{ fontSize: '12px' }}>{itemProps.dataItem}</span>);
    };

    if (isNew) {
        return (
            <td
                data-field="var_type"
                data-row-id={dataItem.source_var_id}
                style={{ padding: '1px 4px', verticalAlign: 'middle', userSelect: 'none' }}
            >
                <DropDownList
                    className="k-dropdown-solid dp-mini-dropdown"
                    popupSettings={{ className: "dp-mini-dropdown-popup" }}
                    data={VAR_TYPE_OPTIONS}
                    value={val}
                    onChange={handleChange}
                    itemRender={itemRender}
                    valueRender={valueRender}
                    style={{ width: '100%', height: '22px', fontSize: '13px' }}
                />
            </td>
        );
    }

    const { color, displayType } = getQuestionTypeInfo(val);
    return (
        <td
            data-field="var_type"
            data-row-id={dataItem.source_var_id}
            style={{ textAlign: 'center', verticalAlign: 'middle', userSelect: 'none' }}
        >
            <span className={`question-type-badge ${color}`}>{displayType}</span>
        </td>
    );
});

// --- 메인 컴포넌트 ---
const DpRequestTableStep = forwardRef(({ onUnsavedChange }, ref) => {
    const loadingSpinner = useContext(loadingSpinnerContext);
    const modal = useContext(modalContext);
    const auth = useSelector((store) => store.auth);
    const { getRecodedOverview, saveRecodedOverview, getBannerDetail } = DpRequestPageApi();

    const [searchTerm, setSearchTerm] = useState('');
    const [stubs, setStubs] = useState([]);
    const [banners, setBanners] = useState([]);
    const [originalRecodedIds, setOriginalRecodedIds] = useState([]);
    const [scalePresets, setScalePresets] = useState([]);
    const [rankPresets, setRankPresets] = useState([]);
    const [groupPresets, setGroupPresets] = useState([]);
    const [statPresets, setStatPresets] = useState([]);

    const history = useUpdateHistory('dp-table');
    const isHistoryAction = useRef(false);

    // 키보드 이벤트 (Undo/Redo)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key.toLowerCase() === 'z') {
                    if (e.shiftKey) { // Redo (Ctrl+Shift+Z)
                        const redoData = history.redo();
                        if (redoData) {
                            isHistoryAction.current = true;
                            setStubs([...redoData]);
                        }
                    } else { // Undo (Ctrl+Z)
                        const undoData = history.undo();
                        if (undoData) {
                            isHistoryAction.current = true;
                            setStubs([...undoData]);
                        }
                    }
                } else if (e.key.toLowerCase() === 'y') { // Redo (Ctrl+Y)
                    const redoData = history.redo();
                    if (redoData) {
                        isHistoryAction.current = true;
                        setStubs([...redoData]);
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [history]);

    // 데이터 변경 감지 및 히스토리 커밋
    useEffect(() => {
        if (isHistoryAction.current) {
            isHistoryAction.current = false;
            return;
        }
        if (stubs.length > 0) {
            history.commit(stubs);
        }
    }, [stubs, history]);

    useImperativeHandle(ref, () => ({
        save: async () => await handleSave(),
        reset: async () => {
            const pageId = sessionStorage.getItem('pageId');
            if (!pageId || !auth?.user?.userId) return;
            try {
                loadingSpinner.show();
                const requestData = {
                    pageid: pageId,
                    user: auth.user.userId,
                    variables: {},
                    dp_request_recoded_items: [],
                    delete_ids: originalRecodedIds,
                    auto_recode: false
                };
                const result = await saveRecodedOverview.mutateAsync(requestData);
                if (result?.success === "777") {
                    modal.showAlert('알림', '스터브 초기화가 완료되었습니다.');
                    if (onUnsavedChange) onUnsavedChange(false);
                    await fetchOverview();
                } else {
                    modal.showAlert('오류', '초기화 작업에 실패했습니다.');
                }
            } catch (err) {
                console.error(err);
                modal.showAlert('오류', '초기화 중 문제가 발생했습니다.');
            } finally {
                loadingSpinner.hide();
            }
        }
    }));

    const fetchOverview = useCallback(async () => {
        const pageId = sessionStorage.getItem('pageId');
        if (!pageId) return;
        try {
            loadingSpinner.show();
            const payload = { user: auth?.user?.userId || '', pageid: pageId };
            const response = await getRecodedOverview.mutateAsync(payload);
            const resultData = response?.data?.resultjson || response?.resultjson || response || {};

            const updatePresets = (data, setter) => {
                setter(Array.isArray(data) ? data : (typeof data === 'object' ? Object.values(data) : []));
            };
            updatePresets(resultData.scale_presets, setScalePresets);
            updatePresets(resultData.rank_presets, setRankPresets);
            updatePresets(resultData.group_presets, setGroupPresets);
            updatePresets(resultData.stat_presets, setStatPresets);

            try {
                const bannerRes = await getBannerDetail.mutateAsync(payload);
                if (bannerRes?.resultjson?.recoded_variables || bannerRes?.data?.resultjson?.recoded_variables) {
                    const raw = bannerRes?.resultjson?.recoded_variables || bannerRes?.data?.resultjson?.recoded_variables;
                    const recodes = Array.isArray(raw) ? raw : Object.values(raw);

                    const bannerRecodes = recodes.filter(v => v.id && v.id.startsWith('banner'));

                    const formattedBanners = bannerRecodes.map((v, i) => {
                        const labelString = v.name || v.label || v.id || `banner_0${i + 1}`;
                        return { id: v.id, label: labelString };
                    });
                    setBanners(formattedBanners);
                }
            } catch (e) { console.error('Failed to fetch banners', e); }

            const baseVars = resultData.base_variables || {};
            const savedItems = resultData.dp_request_recoded_items || [];
            const savedMap = new Map(savedItems.map(item => [String(item.source_var_id), item]));

            // 삭제 처리용 원본 ID 보관
            setOriginalRecodedIds(savedItems.map(item => item.recoded_var_id).filter(Boolean));

            const merged = Object.entries(baseVars).map(([id, base]) => {
                const saved = savedMap.get(id);
                if (saved) savedMap.delete(String(id));
                return {
                    ...base, ...saved,
                    source_var_id: id,
                    recoded_var_id: saved?.recoded_var_id || id,
                    var_label: base.label || id,
                    var_type: base.type || 'unknown',
                    condition: saved?.filter_expression || '',
                    x_info: saved?.x_info || [],
                    stat_summary: saved?.stat_preset_id || '',
                    scale_preset_name: saved?.scale_preset_id || '',
                    rank_preset_name: saved?.rank_preset_id || '',
                    group_preset_name: saved?.group_preset_id || '',
                };
            });

            // baseVars에 없는, 순수하게 추가된 파생 항목(커스텀 스터브) 병합
            savedMap.forEach((saved, id) => {
                merged.push({
                    ...saved,
                    source_var_id: id,
                    recoded_var_id: saved.recoded_var_id || id,
                    var_label: saved.var_label || id,
                    var_type: saved.var_type || 'unknown',
                    condition: saved.filter_expression || '',
                    x_info: saved.x_info || [],
                    stat_summary: saved.stat_preset_id || '',
                    scale_preset_name: saved.scale_preset_id || '',
                    rank_preset_name: saved.rank_preset_id || '',
                    group_preset_name: saved.group_preset_id || '',
                });
            });

            setStubs(merged);
            history.reset(merged);
            if (onUnsavedChange) onUnsavedChange(false);
        } catch (err) {
            console.error(err);
            modal.showAlert('오류', '데이터 호출 실패');
        } finally {
            loadingSpinner.hide();
        }
    }, [getRecodedOverview, history, loadingSpinner, modal, onUnsavedChange]);

    useEffect(() => { fetchOverview(); }, []);

    const filteredStubs = useMemo(() => {
        if (!searchTerm) return stubs;
        const q = searchTerm.toLowerCase();
        return stubs.filter(s => s.recoded_var_id?.toLowerCase().includes(q) || s.var_label?.toLowerCase().includes(q));
    }, [stubs, searchTerm]);

    // onDataChange는 행추가/삭제 시에만 호출됨 (텍스트 편집은 TextEditCell의 onBlur에서 처리)
    const handleDataChange = useCallback((newData) => {
        setStubs(newData);
        if (onUnsavedChange) onUnsavedChange(true);
    }, [onUnsavedChange]);

    const handleCellUpdate = useCallback((item, field, value) => {
        const targetIdStr = String(item.source_var_id);

        if (stubDragSelectedIds.size > 1 && stubDragSelectedIds.has(targetIdStr)) {
            setStubs(prev => prev.map(s => stubDragSelectedIds.has(String(s.source_var_id)) ? { ...s, [field]: value } : s));
        } else {
            setStubs(prev => prev.map(s => s.source_var_id === item.source_var_id ? { ...s, [field]: value } : s));
        }

        // 작업 후 선택 초기화
        stubDragSelectedIds.clear();
        stubDragBaseSelectedIds.clear();
        stubDragStartId = null;
        document.querySelectorAll('.stub-cell-selected').forEach(el => el.classList.remove('stub-cell-selected'));

        if (onUnsavedChange) onUnsavedChange(true);
    }, [onUnsavedChange]);
    // 행 추가 시 고유 ID 생성 (counter 방식으로 중복 방지)
    const newRowIdRef = useRef(0);
    const newRowTemplate = useMemo(() => ({
        get source_var_id() { return `new_${Date.now()}_${newRowIdRef.current++}`; },
        recoded_var_id: '',
        var_label: '',
        var_type: '',
        condition: '',
        x_info: [],
        stat_summary: '',
        scale_preset_name: '',
        rank_preset_name: '',
        group_preset_name: '',
    }), []);


    const duplicateRowTemplate = useCallback((targetRow) => {
        return {
            ...targetRow,
            source_var_id: `new_${Date.now()}_${newRowIdRef.current++}`
        };
    }, []);


    const handleSave = async () => {
        const pageId = sessionStorage.getItem('pageId');
        if (!pageId || !auth?.user?.userId) {
            modal.showAlert('알림', '사용자 정보나 페이지 정보를 확인할 수 없습니다.');
            return false;
        }

        // 2. Variables 객체 구성
        const variables = {};
        for (const stub of stubs) {
            let effSourceId = stub.source_var_id;
            let effRecodedId = stub.recoded_var_id;

            // 새로 추가한 항일 경우, 사용자가 입력한 변수(recoded_var_id)값을 source_var_id로도 사용합니다.
            if (String(stub.source_var_id).startsWith('new_')) {
                if (!stub.recoded_var_id || !stub.recoded_var_id.trim()) {
                    modal.showAlert('알림', '새로 추가한 열의 "변수" 필드를 입력해주세요.');
                    return false;
                }
                effSourceId = stub.recoded_var_id.trim();
                effRecodedId = stub.recoded_var_id.trim();
            }

            variables[effSourceId] = {
                source_var_id: effSourceId,
                recoded_var_id: effRecodedId,
                var_label: stub.var_label,
                var_type: stub.var_type,
                filter_expression: stub.condition || '',
                x_info: Array.isArray(stub.x_info) ? stub.x_info : (stub.x_info ? [stub.x_info] : []),
                stat_preset_id: stub.stat_summary || '',
                scale_preset_id: stub.scale_preset_name || '',
                rank_preset_id: stub.rank_preset_name || '',
                group_preset_id: stub.group_preset_name || ''
            };
        }

        // 3. 삭제될 ID 추출 (원본에 있었지만 현재는 없는 recoded_var_id)
        const currentRecodedIds = stubs.map(s => s.recoded_var_id).filter(Boolean);
        const deletedIds = originalRecodedIds.filter(id => !currentRecodedIds.includes(id));

        const requestData = {
            pageid: pageId,
            user: auth?.user?.userId || '',
            variables: variables,
            delete_ids: deletedIds
        };

        loadingSpinner.show();
        try {
            const result = await saveRecodedOverview.mutateAsync(requestData);
            if (result?.success === "777") {
                modal.showAlert('알림', '스터브가 저장되었습니다.');
                if (onUnsavedChange) onUnsavedChange(false);
                await fetchOverview(); // 저장 후 목록 최신화
                return true;
            } else {
                modal.showAlert('오류', '저장 처리에 실패했습니다.');
                return false;
            }
        } catch (err) {
            console.error(err);
            modal.showAlert('오류', '저장 중 서류 오류가 발생했습니다.');
            return false;
        } finally {
            loadingSpinner.hide();
        }
    };





    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
                <div style={{ padding: '8px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '13px', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        전체 <span style={{ color: '#2563eb', fontWeight: 600 }}>{filteredStubs.length}</span>건
                    </div>
                    <div style={{ position: 'relative', width: '300px' }}>
                        <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            type="text"
                            placeholder="변수 또는 라벨 검색"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%', height: '28px', padding: '0 30px',
                                border: '1px solid #cbd5e1', borderRadius: '4px',
                                fontSize: '12px', outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                style={{
                                    position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                                    display: 'flex', alignItems: 'center', color: '#94a3b8'
                                }}
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>
                <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                        <KendoGridV2
                            className="dp-compact-stub-grid"
                            data={filteredStubs}
                            rowHeight={24}
                            onDataChange={handleDataChange}
                            style={{ height: '100%', width: '100%' }}
                            scrollable="virtual"
                            addable
                            copyable
                            deletable
                            newRowTemplate={newRowTemplate}
                            duplicateRowTemplate={duplicateRowTemplate}
                        >
                            <Column field="recoded_var_id" title="변수" width="100px" headerClassName="k-text-center"
                                cell={(p) => <TextEditCell dataItem={p.dataItem} field="recoded_var_id" onUpdate={handleCellUpdate} placeholder="(작성가능)" />}
                            />
                            <Column field="var_label" title="라벨" width="250px" headerClassName="k-text-center"
                                cell={(p) => <TextEditCell dataItem={p.dataItem} field="var_label" onUpdate={handleCellUpdate} />}
                            />
                            <Column field="var_type" title="유형" width="140px" headerClassName="k-text-center"
                                cell={(p) => <TypeEditCell dataItem={p.dataItem} onUpdate={handleCellUpdate} />}
                            />
                            <Column field="condition" title="조건" width="150px" headerClassName="k-text-center"
                                headerCell={ConditionHeaderCell}
                                cell={(p) => <TextEditCell dataItem={p.dataItem} field="condition" onUpdate={handleCellUpdate} />}
                            />
                            <Column field="x_info" title="배너" width="150px" headerClassName="k-text-center"
                                cell={(p) => <PresetDropdownCell field="x_info" dataItem={p.dataItem} presets={banners} onChange={handleCellUpdate} />}
                            />
                            <Column field="group_preset_name" title="그룹" width="150px" headerClassName="k-text-center"
                                cell={(p) => {
                                    if (!canUseGroupPreset(p.dataItem.var_type)) {
                                        return <td style={DISABLED_CELL_STYLE}>-</td>;
                                    }
                                    return <PresetDropdownCell field="group_preset_name" dataItem={p.dataItem} presets={groupPresets} onChange={handleCellUpdate} />;
                                }}
                            />
                            <Column field="stat_summary" title="통계 설정" width="215px" headerClassName="k-text-center"
                                cell={(p) => {
                                    if (!canUseStatPreset(p.dataItem.var_type)) {
                                        return <td style={DISABLED_CELL_STYLE}>-</td>;
                                    }
                                    return <StatSettingCell dataItem={p.dataItem} selectedValues={p.dataItem.stat_summary} onUpdate={handleCellUpdate} />;
                                }}
                            />
                            <Column field="scale_preset_name" title="척도" width="150px" headerClassName="k-text-center"
                                cell={(p) => {
                                    if (!canUseScalePreset(p.dataItem.var_type)) {
                                        return <td style={DISABLED_CELL_STYLE}>-</td>;
                                    }
                                    return <PresetDropdownCell field="scale_preset_name" dataItem={p.dataItem} presets={scalePresets} onChange={handleCellUpdate} />;
                                }}
                            />
                            <Column field="rank_preset_name" title="순위" width="150px" headerClassName="k-text-center"
                                cell={(p) => {
                                    if (!canUseRankPreset(p.dataItem.var_type)) {
                                        return <td style={DISABLED_CELL_STYLE}>-</td>;
                                    }
                                    return <PresetDropdownCell field="rank_preset_name" dataItem={p.dataItem} presets={rankPresets} onChange={handleCellUpdate} />;
                                }}
                            />
                        </KendoGridV2>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default DpRequestTableStep;
