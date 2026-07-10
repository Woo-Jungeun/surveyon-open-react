import React, { useState, useEffect, useContext, useCallback, useMemo, memo, forwardRef, useImperativeHandle, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Save, Trash2, ChevronDown, Plus, Search, ChevronLeft, ChevronRight, GripVertical, X, Info } from 'lucide-react';
import { Popup } from '@progress/kendo-react-popup';
import { DpRequestPageApi } from '../DpRequestPageApi';
import KendoGridV3, { GridColumn as Column } from "@/components/kendo/KendoGridV3";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import { modalContext } from "@/components/common/Modal.jsx";
import useUpdateHistory from '@/hooks/useUpdateHistory';
import Toast from "@/components/common/Toast";
import BulkEditSubcategoriesModal from "./BulkEditSubcategoriesModal";

// --- 커스텀 헤더 셀 (조건 아이콘) ---
const ConditionHeaderCell = (props) => {
    const handleOpenHelp = (e) => {
        e.stopPropagation();
        const helpWin = window.open('', '_blank', 'width=800,height=700,scrollbars=yes,resizable=yes');
        if (helpWin) {
            helpWin.document.write(`
                <!DOCTYPE html>
                <html lang="ko">
                <head>
                    <meta charset="UTF-8">
                    <title>연산자 도움말</title>
                    <style>
                        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
                        * { box-sizing: border-box; }
                        body {
                            font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif;
                            margin: 0;
                            padding: 0;
                            background-color: #ffffff;
                            color: #1e293b;
                        }
                        .header {
                            display: flex;
                            align-items: center;
                            padding: 10px 16px;
                            border-bottom: 1px solid #e2e8f0;
                            background-color: #ffffff;
                            position: sticky;
                            top: 0;
                            z-index: 10;
                        }
                        .header-title-container {
                            display: flex;
                            align-items: center;
                            gap: 8px;
                        }
                        .header-icon {
                            width: 20px;
                            height: 20px;
                            background-color: #0f172a;
                            color: #ffffff;
                            border-radius: 50%;
                            display: inline-flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 12px;
                            font-weight: 700;
                        }
                        .header-title {
                            font-size: 15px;
                            font-weight: 700;
                            color: #0f172a;
                        }
                        .content {
                            padding: 12px 16px;
                            display: flex;
                            flex-direction: column;
                            gap: 10px;
                        }
                        .section-container {
                            border-radius: 6px;
                            padding: 8px 12px;
                            border: 1px solid #e2e8f0;
                        }
                        .section-compare {
                            border-color: #dbeafe;
                            background-color: #eff6ff;
                        }
                        .section-include {
                            border-color: #f3e8ff;
                            background-color: #faf5ff;
                        }
                        .section-logic {
                            border-color: #dcfce7;
                            background-color: #f0fdf4;
                        }
                        .section-range {
                            border-color: #fef3c7;
                            background-color: #fffbeb;
                        }
                        .section-group {
                            border-color: #fee2e2;
                            background-color: #fef2f2;
                        }
                        .section-rank {
                            border-color: #e0f2fe;
                            background-color: #f0f9ff;
                        }

                        .section-header {
                            display: flex;
                            align-items: center;
                            gap: 6px;
                            margin-bottom: 6px;
                        }
                        .section-badge {
                            display: inline-block;
                            padding: 1px 6px;
                            border-radius: 4px;
                            font-size: 11px;
                            font-weight: 700;
                        }
                        .badge-compare { background-color: #dbeafe; color: #2563eb; border: 1px solid #bfdbfe; }
                        .badge-include { background-color: #f3e8ff; color: #7c3aed; border: 1px solid #e9d5ff; }
                        .badge-logic { background-color: #dcfce7; color: #16a34a; border: 1px solid #bbf7d0; }
                        .badge-range { background-color: #fef3c7; color: #d97706; border: 1px solid #fde68a; }
                        .badge-group { background-color: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; }
                        .badge-rank { background-color: #e0f2fe; color: #0284c7; border: 1px solid #bae6fd; }

                        .section-desc {
                            font-size: 11px;
                            color: #64748b;
                            font-weight: 500;
                        }

                        .grid-3 {
                            display: grid;
                            grid-template-columns: repeat(3, 1fr);
                            gap: 8px;
                        }
                        .grid-2 {
                            display: grid;
                            grid-template-columns: repeat(2, 1fr);
                            gap: 8px;
                        }

                        .box {
                            background-color: #ffffff;
                            border: 1px solid #e2e8f0;
                            border-radius: 6px;
                            padding: 6px 10px;
                            display: flex;
                            align-items: center;
                        }
                        .section-compare .box { border-color: #bfdbfe; }
                        .section-include .box { border-color: #e9d5ff; }
                        .section-logic .box { border-color: #bbf7d0; }
                        .section-range .box { border-color: #fde68a; }
                        .section-group .box { border-color: #fca5a5; }
                        .section-rank .box { border-color: #bae6fd; }

                        .box-vertical {
                            flex-direction: column;
                            align-items: flex-start;
                            gap: 3px;
                        }

                        .box-top-row {
                            display: flex;
                            align-items: center;
                            width: 100%;
                        }

                        .operator {
                            font-family: monospace;
                            font-size: 13px;
                            font-weight: 700;
                            padding-right: 8px;
                            margin-right: 8px;
                            border-right: 1px solid #e2e8f0;
                            min-width: 36px;
                            text-align: center;
                            display: inline-block;
                        }
                        .section-compare .operator { color: #2563eb; min-width: 26px; }
                        .section-include .operator { color: #7c3aed; }
                        .section-logic .operator { color: #16a34a; }
                        .section-range .operator { color: #d97706; }
                        .section-group .operator { color: #dc2626; min-width: 20px; }
                        .section-rank .operator { color: #0284c7; min-width: auto; border-right: none; padding-right: 0; margin-right: 0; }

                        .operator-desc {
                            font-size: 12px;
                            color: #334155;
                            font-weight: 500;
                        }

                        .example {
                            font-family: monospace;
                            font-size: 11px;
                            color: #64748b;
                            width: 100%;
                            border-top: 1px dashed #f1f5f9;
                            padding-top: 2px;
                            margin-top: 1px;
                            word-break: break-all;
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="header-title-container">
                            <div class="header-icon">?</div>
                            <div class="header-title">연산자 도움말</div>
                        </div>
                    </div>

                    <div class="content">
                        <!-- 비교 -->
                        <div class="section-container section-compare">
                            <div class="section-header">
                                <span class="section-badge badge-compare">비교</span>
                                <span class="section-desc">값 크기·일치 비교</span>
                            </div>
                            <div class="grid-3">
                                <div class="box">
                                    <span class="operator">==</span>
                                    <span class="operator-desc">같음</span>
                                </div>
                                <div class="box">
                                    <span class="operator">!=</span>
                                    <span class="operator-desc">같지 않음</span>
                                </div>
                                <div class="box">
                                    <span class="operator">&gt;</span>
                                    <span class="operator-desc">초과</span>
                                </div>
                                <div class="box">
                                    <span class="operator">&gt;=</span>
                                    <span class="operator-desc">이상</span>
                                </div>
                                <div class="box">
                                    <span class="operator">&lt;</span>
                                    <span class="operator-desc">미만</span>
                                </div>
                                <div class="box">
                                    <span class="operator">&lt;=</span>
                                    <span class="operator-desc">이하</span>
                                </div>
                            </div>
                        </div>

                        <!-- 포함 -->
                        <div class="section-container section-include">
                            <div class="section-header">
                                <span class="section-badge badge-include">포함</span>
                                <span class="section-desc">리스트 안 값의 포함 여부</span>
                            </div>
                            <div class="grid-2">
                                <div class="box box-vertical">
                                    <div class="box-top-row">
                                        <span class="operator">in</span>
                                        <span class="operator-desc">포함</span>
                                    </div>
                                    <div class="example">region in [11,21,31]</div>
                                </div>
                                <div class="box box-vertical">
                                    <div class="box-top-row">
                                        <span class="operator">not in</span>
                                        <span class="operator-desc">미포함</span>
                                    </div>
                                    <div class="example">sq3 not in [98,99]</div>
                                </div>
                            </div>
                        </div>

                        <!-- 논리 -->
                        <div class="section-container section-logic">
                            <div class="section-header">
                                <span class="section-badge badge-logic">논리</span>
                                <span class="section-desc">여러 조건 연결</span>
                            </div>
                            <div class="grid-2">
                                <div class="box box-vertical">
                                    <div class="box-top-row">
                                        <span class="operator">and</span>
                                        <span class="operator-desc">그리고 (모두 만족)</span>
                                    </div>
                                    <div class="example">age &gt;= 20 and age &lt; 40</div>
                                </div>
                                <div class="box box-vertical">
                                    <div class="box-top-row">
                                        <span class="operator">or</span>
                                        <span class="operator-desc">또는 (하나 이상 만족)</span>
                                    </div>
                                    <div class="example">gender == 1 or gender == 2</div>
                                </div>
                            </div>
                        </div>

                        <!-- 범위 함수 -->
                        <div class="section-container section-range">
                            <div class="section-header">
                                <span class="section-badge badge-range">범위 함수</span>
                                <span class="section-desc">다중응답 범위에 사용</span>
                            </div>
                            <div class="grid-3">
                                <div class="box box-vertical">
                                    <div class="box-top-row">
                                        <span class="operator">any</span>
                                        <span class="operator-desc">하나라도 만족</span>
                                    </div>
                                    <div class="example">any(q10:q20) in [1]</div>
                                </div>
                                <div class="box box-vertical">
                                    <div class="box-top-row">
                                        <span class="operator">all</span>
                                        <span class="operator-desc">전부 만족</span>
                                    </div>
                                    <div class="example">all(q10:q20) in [1]</div>
                                </div>
                                <div class="box box-vertical">
                                    <div class="box-top-row">
                                        <span class="operator">none</span>
                                        <span class="operator-desc">모두 불만족</span>
                                    </div>
                                    <div class="example">none(q10:q20) in [1]</div>
                                </div>
                            </div>
                        </div>

                        <!-- 그룹핑 -->
                        <div class="section-container section-group">
                            <div class="section-header">
                                <span class="section-badge badge-group">그룹핑</span>
                                <span class="section-desc">조건 우선순위 지정</span>
                            </div>
                            <div class="grid-2">
                                <div class="box box-vertical">
                                    <div class="box-top-row">
                                        <span class="operator">(</span>
                                        <span class="operator-desc">그룹 시작</span>
                                    </div>
                                    <div class="example">(a == 1 or b == 1) and c == 1</div>
                                </div>
                                <div class="box box-vertical">
                                    <div class="box-top-row">
                                        <span class="operator">)</span>
                                        <span class="operator-desc">그룹 종료</span>
                                    </div>
                                    <div class="example">(a == 1 or b == 1) and c == 1</div>
                                </div>
                            </div>
                        </div>

                        <!-- 순위 -->
                        <div class="section-container section-rank">
                            <div class="section-header">
                                <span class="section-badge badge-rank">순위</span>
                                <span class="section-desc">순위 문항의 특정 순위 코드 포함</span>
                            </div>
                            <div class="grid-2">
                                <div class="box box-vertical">
                                    <div class="box-top-row">
                                        <span class="operator" style="border-right: 1px solid #e2e8f0; padding-right: 12px; margin-right: 12px;">[순위지정] in [코드]</span>
                                        <span class="operator-desc">지정 순위에 포함된 코드</span>
                                    </div>
                                    <div class="example">Q1 [1:2] in [코드]</div>
                                </div>
                                <div class="box box-vertical">
                                    <div class="box-top-row">
                                        <span class="operator" style="border-right: 1px solid #e2e8f0; padding-right: 12px; margin-right: 12px;">형식 설명</span>
                                        <span class="operator-desc">[순위지정] = 1:2 / [코드] = 응답 코드값</span>
                                    </div>
                                    <div class="example" style="border-top: none; padding-top: 0; margin-top: 0; color: transparent; user-select: none;">-</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
            `);
            helpWin.document.close();
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <span>{props.title}</span>
            <div
                onClick={handleOpenHelp}
                style={{ cursor: 'pointer', display: 'flex' }}
                title="클락하여 도움말 새창으로 열기"
            >
                <Info size={14} color="#94a3b8" />
            </div>
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

    const handlePaste = (e) => {
        e.preventDefault();
        const clipboardData = e.clipboardData.getData('Text');
        const lines = clipboardData.split(/\r?\n/).map(l => l.trim());
        if (lines.length > 0) {
            const newData = [...data];
            lines.forEach((lineVal, idx) => {
                const targetIndex = dataIndex + idx;
                if (targetIndex < newData.length) {
                    newData[targetIndex] = {
                        ...newData[targetIndex],
                        [field]: lineVal
                    };
                }
            });
            onUpdate(dataIndex, 1, field, lines[0], newData);
            setIsEditing(false);
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
                    onPaste={handlePaste}
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
                <div style={{ flex: 1, minWidth: 0, paddingLeft: level ? '2px' : '0', cursor: disableMerge ? 'text' : 'pointer', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }} onDoubleClick={() => setIsEditing(true)}>
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

const VariableItem = memo(({ v, isSelected, onDragStart, onClick }) => {
    const infoLabels = useMemo(() => {
        const list = Array.isArray(v.info) ? v.info : (Array.isArray(v.categories) ? v.categories : []);
        return list.map(item => item.label).filter(Boolean);
    }, [v.info, v.categories]);

    const tooltipText = useMemo(() => {
        const base = `${v.label || ''}${v.id ? ` (${v.id})` : ''}`;
        if (infoLabels.length > 0) {
            return `${base}\n\n[보기 목록]\n${infoLabels.map(l => `- ${l}`).join('\n')}`;
        }
        return base;
    }, [v.label, v.id, infoLabels]);

    return (
        <div
            className={`variable-item ${isSelected ? 'selected' : ''}`}
            draggable
            onDragStart={(e) => onDragStart(e, v)}
            onClick={(e) => { e.stopPropagation(); onClick(v.id); }}
            onMouseUp={(e) => {
                if (infoLabels.length > 0) {
                    console.log(`[${v.label} (${v.id})] 보기 목록:`, infoLabels);
                }
            }}
            style={{ borderRadius: '6px' }}
            title={tooltipText}
        >
            <div className="variable-item-header">
                <div className="variable-item__name">{v.label}</div>
                {v.type && <span className={`question-type-badge ${getTypeClass(v.type)}`} style={{ marginBottom: '-12.5px' }}>{v.type}</span>}
            </div>
            <div className="variable-item__label">{v.id}</div>
        </div>
    );
});

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
    const { getBannerDetail, getBaseVariableList, generateBanner, saveBannerDetail, getTableDetail, evaluateVariable } = DpRequestPageApi();
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
    const listContainerRef = useRef(null);

    const [toast, setToast] = useState({ show: false, message: '' });
    const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);

    const handleCopyGrid = async () => {
        try {
            const currentInfo = banners.find(b => b.id === selectedBanner)?.info || [];
            if (!currentInfo || currentInfo.length === 0) {
                setToast({ show: true, message: '복사할 데이터가 없습니다.' });
                return;
            }
            const headers = ['대분류', '중분류', '소분류', '조건'].join('\t');
            const rows = currentInfo.map(item => {
                const label3 = String(item.label3 ?? '').trim();
                const label2 = String(item.label2 ?? '').trim();
                const label = String(item.label ?? '').trim();
                const logic = String(item.logic ?? '').trim();
                return `${label3}\t${label2}\t${label}\t${logic}`;
            }).join('\n');

            const text = `${headers}\n${rows}`;
            await navigator.clipboard.writeText(text);
            setToast({ show: true, message: '복사 완료 (Ctrl+V)' });
        } catch (err) {
            console.error('Failed to copy grid:', err);
            setToast({ show: true, message: '복사 실패' });
        }
    };
    const draggedTypeRef = useRef(null);

    const [selectedCells, setSelectedCells] = useState([]); // [{r, c}]
    const [isSelecting, setIsSelecting] = useState(false);
    const selectionAnchorRef = useRef(null);
    const [contextMenu, setContextMenu] = useState(null); // {x, y, r, c}

    // --- 빈도 실시간 계산 및 조회 ---
    const [frequencies, setFrequencies] = useState({});
    const [isCalculatingFreq, setIsCalculatingFreq] = useState(false);
    const lastCalculatedRef = useRef('');

    const calculateFrequencies = useCallback(async (bannerId, infoList, baseVarsOverride = null) => {
        const pageId = sessionStorage.getItem('pageId');
        if (!pageId || !bannerId || !infoList || infoList.length === 0) return;

        const infoString = JSON.stringify(infoList);
        if (lastCalculatedRef.current === `${bannerId}-${infoString}`) return;
        lastCalculatedRef.current = `${bannerId}-${infoString}`;

        // API payload 구조 매핑
        const validInfo = infoList.map((it, idx) => ({
            index: idx + 1,
            value: it.value !== undefined ? it.value : (idx + 1),
            label: it.label || '',
            logic: it.logic || '',
            stat_type: it.stat_type || null,
            target_var: it.target_var || null,
            type: it.type && it.type !== "빈도" ? it.type : "single",
            prefix: it.prefix || "",
            postfix: it.postfix || "",
            hide: it.hide || "",
            round: it.round || null,
            line: it.line || "",
            color: it.color || ""
        }));

        const variablesPayload = {};
        const varsToUse = baseVarsOverride || baseVariables;
        varsToUse.forEach(bv => {
            variablesPayload[bv.id] = bv;
        });

        const activeBannerLabel = banners.find(b => b.id === bannerId)?.label || '';

        variablesPayload[bannerId] = {
            id: bannerId,
            label: currentLabel || activeBannerLabel,
            type: 'single',
            recoded_type: 'recoded',
            info: validInfo
        };

        const payload = {
            pageid: pageId,
            user: auth?.user?.userId,
            table: {
                id: `__var__${bannerId}`,
                name: currentLabel || activeBannerLabel,
                banner: [],
                stub: [bannerId]
            },
            variables: variablesPayload,
            include_stats: ["mean", "std", "min", "max", "n"]
        };

        try {
            setIsCalculatingFreq(true);
            const res = await evaluateVariable.mutateAsync(payload);
            if (res && res.success === '777' && res.resultjson) {
                const apiColumns = res.resultjson.columns || [];
                const apiRows = res.resultjson.rows || res.resultjson.data || [];

                if (apiColumns.length > 0 && apiRows.length > 0) {
                    const newFreqs = {};

                    if (apiRows.length === 1 && apiColumns.length > 0) {
                        // 백엔드가 카테고리들을 컬럼(columns)으로 내려준 경우
                        const row = apiRows[0];
                        apiColumns.forEach((col, idx) => {
                            const cellBox = row.cells ? row.cells[col.key] : row[col.key];
                            if (cellBox !== undefined && cellBox !== null) {
                                const isSingleVal = typeof cellBox !== 'object';
                                const nVal = col.column_total !== undefined
                                    ? col.column_total
                                    : (!isSingleVal
                                        ? (cellBox.count !== undefined ? cellBox.count : cellBox.n)
                                        : cellBox);
                                const pVal = col.ratio !== undefined
                                    ? col.ratio
                                    : (!isSingleVal
                                        ? (cellBox.percent !== undefined ? cellBox.percent : cellBox.p)
                                        : null);

                                newFreqs[`${bannerId}-${idx}`] = {
                                    n: nVal !== undefined ? nVal : null,
                                    p: pVal !== undefined ? pVal : null
                                };
                            }
                        });
                    } else {
                        // 백엔드가 카테고리들을 행(rows)으로 내려준 경우
                        const firstColKey = apiColumns[0].key;
                        apiRows.forEach((row, idx) => {
                            const cellBox = row.cells ? row.cells[firstColKey] : row[firstColKey];
                            if (cellBox !== undefined && cellBox !== null) {
                                const isSingleVal = typeof cellBox !== 'object';
                                const nVal = row.column_total !== undefined
                                    ? row.column_total
                                    : (row.row_total !== undefined
                                        ? row.row_total
                                        : (!isSingleVal
                                            ? (cellBox.count !== undefined ? cellBox.count : cellBox.n)
                                            : cellBox));
                                const pVal = row.ratio !== undefined
                                    ? row.ratio
                                    : (!isSingleVal
                                        ? (cellBox.percent !== undefined ? cellBox.percent : cellBox.p)
                                        : null);

                                newFreqs[`${bannerId}-${idx}`] = {
                                    n: nVal !== undefined ? nVal : null,
                                    p: pVal !== undefined ? pVal : null
                                };
                            }
                        });
                    }

                    setFrequencies(prev => ({
                        ...prev,
                        ...newFreqs
                    }));
                }
            }
        } catch (err) {
            console.error("Failed to calculate frequencies:", err);
        } finally {
            setIsCalculatingFreq(false);
        }
    }, [baseVariables, currentLabel, banners, auth?.user?.userId]);

    useEffect(() => {
        const currentBannerData = banners.find(b => b.id === selectedBanner);
        if (!currentBannerData || !currentBannerData.info || currentBannerData.info.length === 0) {
            return;
        }

        const timer = setTimeout(() => {
            calculateFrequencies(selectedBanner, currentBannerData.info);
        }, 800); // 800ms 디바운스

        return () => clearTimeout(timer);
    }, [selectedBanner, banners, calculateFrequencies]);

    // --- 삭제 관리용 스테이트 추가 ---
    const [deletedBannerIds, setDeletedBannerIds] = useState([]); // 서버에 실제 삭제 요청할 ID들
    const [originalBannerIds, setOriginalBannerIds] = useState([]); // 초기 로딩된 배너 ID 목록 (신규 구분용)

    // --- Add Variable Popup States ---
    const [isAddVarPopupOpen, setIsAddVarPopupOpen] = useState(false);
    const addVarButtonRef = useRef(null);
    const addVarPopupRef = useRef(null);
    const [addVarSearch, setAddVarSearch] = useState('');

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (isAddVarPopupOpen &&
                addVarButtonRef.current && !addVarButtonRef.current.contains(e.target) &&
                addVarPopupRef.current && !addVarPopupRef.current.contains(e.target)) {
                setIsAddVarPopupOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isAddVarPopupOpen]);

    const addVarFilteredVariables = useMemo(() => {
        const search = addVarSearch.toLowerCase();
        const allowedTypes = ['single', 'multi', 'scale', 'rank'];
        return (Array.isArray(baseVariables) ? baseVariables : []).filter(v => {
            const matchesSearch = (v.label || '').toLowerCase().includes(search) || (v.id || '').toLowerCase().includes(search);
            const isAllowedType = allowedTypes.includes((v.type || '').toLowerCase());
            return matchesSearch && isAllowedType;
        });
    }, [baseVariables, addVarSearch]);

    const handleAddVariableToGrid = useCallback((vId) => {
        const v = baseVariables.find(item => item.id === vId);
        if (!v) return;

        if (!selectedBanner) {
            modal.showAlert('알림', '선택된 배너가 없습니다.');
            return;
        }

        const cats = v.categories || v.info || [];
        if (cats.length === 0) {
            modal.showAlert('알림', '해당 문항에 보기 정보가 없습니다.');
            return;
        }

        const newItems = cats.map(cat => ({
            label3: '',
            label2: v.label || v.name || '',
            label: cat.label || cat.name || '',
            logic: `${v.id} == ${cat.value !== undefined ? cat.value : ''}`,
            inEdit: false
        }));

        setBanners(prev => prev.map(b => {
            if (b.id === selectedBanner) {
                return {
                    ...b,
                    info: [...(b.info || []), ...newItems],
                    isDirty: true
                };
            }
            return b;
        }));

        if (onUnsavedChange) onUnsavedChange(true);
        setIsAddVarPopupOpen(false);
        setAddVarSearch('');
    }, [baseVariables, selectedBanner, onUnsavedChange, modal]);

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

    // 목록 하단으로 스크롤 이동
    const scrollToBottom = useCallback(() => {
        if (listContainerRef.current) {
            listContainerRef.current.scrollTo({ top: listContainerRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, []);

    // 목록 상단으로 스크롤 이동
    const scrollToTop = useCallback(() => {
        if (listContainerRef.current) {
            listContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, []);

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
        setBanners(prev => [...prev, newBanner]);
        setTimeout(scrollToBottom, 100);
        setSelectedBanner(newId);
        setCurrentLabel('');
        if (onUnsavedChange) onUnsavedChange(true);
    };

    const handleSidebarContextMenu = useCallback((e, bannerId, bannerLabel) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            type: 'sidebar',
            bannerId,
            bannerLabel
        });
    }, []);

    const handleDuplicateBanner = useCallback((bannerId) => {
        const target = banners.find(b => b.id === bannerId);
        if (!target) return;

        let maxNum = 0;
        banners.forEach(b => {
            const match = b.id.match(/^banner_(\d+)$/);
            if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxNum) maxNum = num;
            }
        });
        const newId = `banner_${String(maxNum + 1).padStart(2, '0')}`;

        const baseLabel = target.label || '';
        let copyNum = 1;
        let newLabel = `${baseLabel}_copy${copyNum}`;
        while (banners.some(b => b.label === newLabel)) {
            copyNum += 1;
            newLabel = `${baseLabel}_copy${copyNum}`;
        }

        const newBanner = {
            ...target,
            id: newId,
            label: newLabel,
            name: newLabel,
            subId: newId,
            info: JSON.parse(JSON.stringify(target.info || [])), // deep copy
            categories: JSON.parse(JSON.stringify(target.categories || target.info || [])), // deep copy
            isNew: true
        };

        setBanners(prev => [...prev, newBanner]);
        setTimeout(scrollToBottom, 100);
        setSelectedBanner(newId);
        setCurrentLabel(newLabel);
        if (onUnsavedChange) onUnsavedChange(true);
        setContextMenu(null);
    }, [banners, onUnsavedChange, scrollToBottom]);

    // --- Interaction Logic ---
    const toggleSelection = useCallback((id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    }, []);

    const handleDragStart = useCallback((e, draggedVar) => {
        draggedTypeRef.current = 'EXTERNAL';
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
        draggedTypeRef.current = 'INTERNAL_ITEM';
        e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'INTERNAL_ITEM', gIdx, iIdx }));
    };

    const handleInternalGroupDragStart = (e, gIdx) => {
        draggedTypeRef.current = 'INTERNAL_GROUP';
        e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'INTERNAL_GROUP', gIdx }));
    };

    const handleDrop = (e, targetIdx, targetItemIdx = null) => {
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
                        if (next.length >= 300) {
                            modal.showAlert('알림', '가로축은 최대 300개 그룹까지만 구성할 수 있습니다.');
                            return prev;
                        }
                        next.push([item]);
                    } else {
                        // 만약 동일 그룹 내에서 위치 이동하는 경우
                        if (data.gIdx === targetIdx) {
                            let insertIdx = targetItemIdx !== null ? targetItemIdx : next[targetIdx].length;
                            if (data.iIdx < insertIdx) {
                                insertIdx -= 1;
                            }
                            next[targetIdx].splice(insertIdx, 0, item);
                        } else {
                            // 다른 그룹으로 이동하는 경우
                            if (!next[targetIdx].find(v => v.id === item.id)) {
                                if (next[targetIdx].length >= 3) {
                                    modal.showAlert('알림', '한 그룹에는 최대 3개 문항까지만 넣을 수 있습니다.');
                                    return prev;
                                }
                                let insertIdx = targetItemIdx !== null ? targetItemIdx : next[targetIdx].length;
                                next[targetIdx].splice(insertIdx, 0, item);
                            }
                        }
                    }
                    return next.filter(g => g.length > 0);
                }
                if (data.type === 'INTERNAL_GROUP') {
                    const group = next[data.gIdx];
                    next.splice(data.gIdx, 1);
                    if (targetIdx === 'new') {
                        if (next.length >= 300) {
                            modal.showAlert('알림', '가로축은 최대 300개 그룹까지만 구성할 수 있습니다.');
                            return prev;
                        }
                        next.push(group);
                    } else next.splice(targetIdx, 0, group);
                    return next;
                }
                if (data.type === 'EXTERNAL') {
                    const itemsToAdd = data.items;
                    if (targetIdx === 'new') {
                        if (next.length + itemsToAdd.length > 300) {
                            modal.showAlert('알림', '가로축은 최대 300개 그룹까지만 구성할 수 있습니다.');
                            return prev;
                        }
                        next.push(...itemsToAdd.map(it => [it]));
                    } else {
                        const unique = itemsToAdd.filter(it => !next[targetIdx].find(v => v.id === it.id));
                        if (next[targetIdx].length + unique.length > 3) {
                            modal.showAlert('알림', '한 그룹에는 최대 3개 문항까지만 넣을 수 있습니다.');
                            return prev;
                        }
                        let insertIdx = targetItemIdx !== null ? targetItemIdx : next[targetIdx].length;
                        next[targetIdx].splice(insertIdx, 0, ...unique);
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
                                scrollToTop();
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
            const [bannerResult, tableResult] = await Promise.all([
                getBannerDetail.mutateAsync({ pageid: pageId, user: auth.user.userId }),
                getTableDetail.mutateAsync({ pageid: pageId, user: auth.user.userId })
            ]);

            let activeBannerIds = [];
            if (bannerResult?.success === '777' && bannerResult.resultjson) {
                activeBannerIds = bannerResult.resultjson.banner_ids || [];
            }

            let loadedBaseVars = [];
            if (tableResult?.success === '777' && tableResult.resultjson) {
                if (tableResult.resultjson.base_variables) {
                    const baseVars = tableResult.resultjson.base_variables;
                    loadedBaseVars = Array.isArray(baseVars) ? baseVars : Object.values(baseVars);
                    setBaseVariables(loadedBaseVars);
                }
                if (tableResult.resultjson.recoded_variables) {
                    const raw = tableResult.resultjson.recoded_variables;
                    const recodes = Array.isArray(raw)
                        ? raw
                        : Object.entries(raw).map(([key, val]) => ({ id: val.id || key, ...val }));

                    let formatted = [];
                    if (activeBannerIds.length > 0) {
                        formatted = activeBannerIds.map((bid) => {
                            const found = recodes.find(r => r.id === bid) || {};
                            return {
                                ...found,
                                id: bid,
                                label: found.name || found.label || bid,
                                subId: bid,
                                type: 'banner',
                                info: (found.info || found.categories || []).map(item => ({ ...item, inEdit: false }))
                            };
                        });
                    } else {
                        formatted = recodes
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
                                type: 'banner',
                                info: (v.info || v.categories || []).map(item => ({ ...item, inEdit: false }))
                            }));
                    }

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
                            if (forceSelectFirst) scrollToTop();
                        }

                        // 첫 진입 시 빈도 값을 로딩 바가 떠 있는 상태에서 동기적으로 호출하여 한 번에 로드
                        const targetId = isFresh || !selectedBanner || forceSelectFirst ? target.id : selectedBanner;
                        const targetBanner = formatted.find(b => b.id === targetId) || target;
                        if (targetBanner && targetBanner.info && targetBanner.info.length > 0) {
                            await calculateFrequencies(targetId, targetBanner.info, loadedBaseVars);
                        }
                    } else if (forceSelectFirst || !selectedBanner) {
                        setSelectedBanner(null);
                        setCurrentLabel('');
                    }
                }
            }
        } catch (error) { console.error(error); }
    };

    const handleCreateBanner = async (name) => {
        if (!name?.trim()) return modal.showAlert('알림', '배너명을 입력해 주세요.');
        if (colVars.length === 0) return modal.showAlert('알림', '구성된 문항이 없습니다.');
        if (colVars.length > 300) return modal.showAlert('알림', '가로축은 최대 300개 그룹까지만 구성할 수 있습니다.');
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
        if (onUnsavedChange) onUnsavedChange(true);
    }, [selectedBanner, onUnsavedChange]);

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

    const getCellRowSpanRange = useCallback((data, dataIndex, field) => {
        if (!data || !data[dataIndex]) return { min: dataIndex, max: dataIndex };

        let deps = [];
        if (field === 'label') deps = ['label3', 'label2'];
        else if (field === 'label2') deps = ['label3'];

        let minR = dataIndex;
        // find upwards
        for (let i = dataIndex - 1; i >= 0; i--) {
            if (data[i + 1][`_unmerged_${field}`]) break;
            let isSame = data[i][field] === data[dataIndex][field];
            if (isSame && deps.length > 0) {
                for (let dep of deps) {
                    if (data[i][dep] !== data[dataIndex][dep]) {
                        isSame = false; break;
                    }
                }
            }
            if (isSame) minR = i;
            else break;
        }

        let maxR = dataIndex;
        // find downwards
        for (let i = dataIndex + 1; i < data.length; i++) {
            if (data[i][`_unmerged_${field}`]) break;
            let isSame = data[i][field] === data[dataIndex][field];
            if (isSame && deps.length > 0) {
                for (let dep of deps) {
                    if (data[i][dep] !== data[dataIndex][dep]) {
                        isSame = false; break;
                    }
                }
            }
            if (isSame) maxR = i;
            else break;
        }

        return { min: minR, max: maxR };
    }, []);

    const handleCellMouseDown = useCallback((e, rowIndex, field) => {
        setIsSelecting(true);
        selectionAnchorRef.current = { r: rowIndex, c: field };
        const currentBanner = banners.find(b => b.id === selectedBanner);
        const data = currentBanner?.info || [];
        const range = getCellRowSpanRange(data, rowIndex, field);

        const newSelection = [];
        for (let i = range.min; i <= range.max; i++) {
            newSelection.push({ r: i, c: field });
        }
        setSelectedCells(newSelection);
        setContextMenu(null);
    }, [banners, selectedBanner, getCellRowSpanRange]);

    const handleCellMouseEnter = useCallback((rowIndex, field) => {
        if (!isSelecting) return;

        setSelectedCells(prev => {
            const start = selectionAnchorRef.current;
            if (!start) return prev;

            const newSelection = [];

            const colFields = ['label3', 'label2', 'label'];
            const startColIdx = colFields.indexOf(start.c);
            const currColIdx = colFields.indexOf(field);

            if (startColIdx === -1 || currColIdx === -1) return prev;

            const minCol = Math.min(startColIdx, currColIdx);
            const maxCol = Math.max(startColIdx, currColIdx);

            const currentBanner = banners.find(b => b.id === selectedBanner);
            const data = currentBanner?.info || [];

            let expandedMinR = Math.min(start.r, rowIndex);
            let expandedMaxR = Math.max(start.r, rowIndex);
            let changing = true;

            // Expand vertically to cover the full rowSpan of any selected cells
            while (changing) {
                changing = false;
                for (let r = expandedMinR; r <= expandedMaxR; r++) {
                    for (let c = minCol; c <= maxCol; c++) {
                        const range = getCellRowSpanRange(data, r, colFields[c]);
                        if (range.min < expandedMinR) { expandedMinR = range.min; changing = true; }
                        if (range.max > expandedMaxR) { expandedMaxR = range.max; changing = true; }
                    }
                }
            }

            for (let r = expandedMinR; r <= expandedMaxR; r++) {
                for (let c = minCol; c <= maxCol; c++) {
                    newSelection.push({ r, c: colFields[c] });
                }
            }
            return newSelection;
        });
    }, [isSelecting, banners, selectedBanner, getCellRowSpanRange]);

    const handleContextMenu = useCallback((e, rowIndex, field) => {
        e.preventDefault();

        setSelectedCells(prev => {
            const isSelected = prev.some(cell => cell.r === rowIndex && cell.c === field);
            if (!isSelected) {
                const currentBanner = banners.find(b => b.id === selectedBanner);
                const data = currentBanner?.info || [];
                const range = getCellRowSpanRange(data, rowIndex, field);

                const newSelection = [];
                for (let i = range.min; i <= range.max; i++) {
                    newSelection.push({ r: i, c: field });
                }
                return newSelection;
            }
            return prev;
        });

        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            r: rowIndex,
            c: field
        });
    }, [banners, selectedBanner, getCellRowSpanRange]);

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

    const handleDeleteSelectedRows = useCallback(() => {
        if (selectedCells.length === 0) return;

        const currentBanner = banners.find(b => b.id === selectedBanner);
        if (!currentBanner || !currentBanner.info) return;

        const rowsToDelete = [...new Set(selectedCells.map(c => c.r))];
        const newData = currentBanner.info.filter((_, index) => !rowsToDelete.includes(index));

        updateBannerInfo(newData);
        setContextMenu(null);
        setSelectedCells([]);
    }, [selectedCells, banners, selectedBanner, updateBannerInfo]);

    const handleRowClick = useCallback((e) => {
        setBanners(prev => prev.map(b => b.id === selectedBanner ? { ...b, info: b.info.map(it => ({ ...it, inEdit: it === e.dataItem })) } : b));
    }, [selectedBanner]);

    const filteredVariables = useMemo(() => {
        const search = wizardSearch.toLowerCase();
        const allowedTypes = ['single', 'multi', 'scale', 'rank'];
        return (Array.isArray(baseVariables) ? baseVariables : []).filter(v => {
            const matchesSearch = (v.label || '').toLowerCase().includes(search) || (v.id || '').toLowerCase().includes(search);
            const isAllowedType = allowedTypes.includes((v.type || '').toLowerCase());
            return matchesSearch && isAllowedType;
        });
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

    // 드래그 종료 시 글로벌 초기화 및 클래스 제거
    useEffect(() => {
        const handleDragEndGlobal = () => {
            draggedTypeRef.current = null;
            document.querySelectorAll('.col-group').forEach(el => {
                el.classList.remove('drag-over-group-left', 'drag-over-item');
            });
            document.querySelectorAll('.dropped-tag.grouped').forEach(el => {
                el.classList.remove('drag-over-item-top', 'drag-over-item-bottom');
            });
        };
        window.addEventListener('dragend', handleDragEndGlobal);
        return () => window.removeEventListener('dragend', handleDragEndGlobal);
    }, []);

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
        if (!pageId) return;

        // 1. 저장할 대상 배너(신규 또는 수정된 배너)들을 모두 찾는다.
        const bannersToSave = banners.filter(b => b.isNew || b.isDirty);
        if (bannersToSave.length === 0) {
            if (onUnsavedChange) onUnsavedChange(false);
            return true;
        }

        const variablesPayload = {};
        bannersToSave.forEach(b => {
            const finalLabel = b.id === selectedBanner ? currentLabel : b.label;
            variablesPayload[b.id] = {
                id: b.id,
                label: finalLabel,
                type: "banner",
                info: (b.info || [])
                    .filter(c => (c.label && c.label.toString().trim() !== "") || (c.logic && c.logic.toString().trim() !== ""))
                    .map(it => ({
                        label3: it.label3 || '',
                        label2: it.label2 || '',
                        label: it.label || '',
                        logic: it.logic || ''
                    }))
            };
        });

        const requestData = {
            pageid: pageId,
            user: auth?.user?.userId,
            variables: variablesPayload,
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
                        <div ref={listContainerRef} className="dp-banner-list" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                            {filteredBanners.map((banner, index) => (
                                <div key={`${banner.id}-${index}`}
                                    className={`dp-banner-item ${selectedBanner === banner.id ? 'active' : ''}`}
                                    onClick={() => { setSelectedBanner(banner.id); setCurrentLabel(banner.label); }}
                                    onContextMenu={(e) => handleSidebarContextMenu(e, banner.id, banner.label)}
                                    style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', minHeight: '40px', borderRadius: '8px' }}
                                    title={`${banner.label || ''}${banner.id && !banner.isNew ? ` (${banner.id})` : ''}`}
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
                    {(banners.find(b => b.id === selectedBanner)?.isNew && (!banners.find(b => b.id === selectedBanner)?.info || banners.find(b => b.id === selectedBanner)?.info.length === 0)) ? (
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

                                {/* 우측 가로축 드롭존 (개선: 5개씩 그리드) */}
                                <div className="drop-zones-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

                                    <div className="axis-header" style={{ padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>가로축 (열)</span>
                                            <span className="group-count-badge" style={{ fontSize: '10px' }}>{colVars.length}</span>
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
                                            gap: '8px',
                                            padding: '12px',
                                            background: '#eff6ff',
                                            overflowY: 'auto',
                                            overflowX: 'hidden',
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
                                                onDragOver={(e) => {
                                                    e.preventDefault();
                                                    e.dataTransfer.dropEffect = 'move';
                                                    document.querySelectorAll('.col-group').forEach(el => {
                                                        if (el !== e.currentTarget) {
                                                            el.classList.remove('drag-over-group-left', 'drag-over-item');
                                                        }
                                                    });
                                                    const type = draggedTypeRef.current;
                                                    if (type === 'INTERNAL_GROUP') {
                                                        e.currentTarget.classList.add('drag-over-group-left');
                                                    } else if (type === 'INTERNAL_ITEM' || type === 'EXTERNAL') {
                                                        e.currentTarget.classList.add('drag-over-item');
                                                    }
                                                }}
                                                onDragLeave={(e) => {
                                                    e.currentTarget.classList.remove('drag-over-group-left', 'drag-over-item');
                                                }}
                                                onDrop={(e) => {
                                                    e.stopPropagation();
                                                    e.currentTarget.classList.remove('drag-over-group-left', 'drag-over-item');
                                                    handleDrop(e, groupIndex);
                                                }}
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
                                                            onDragOver={(e) => {
                                                                const type = draggedTypeRef.current;
                                                                if (type === 'INTERNAL_ITEM' || type === 'EXTERNAL') {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    document.querySelectorAll('.dropped-tag.grouped').forEach(el => {
                                                                        if (el !== e.currentTarget) {
                                                                            el.classList.remove('drag-over-item-top', 'drag-over-item-bottom');
                                                                        }
                                                                    });
                                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                                    const y = e.clientY - rect.top;
                                                                    if (y < rect.height / 2) {
                                                                        e.currentTarget.classList.add('drag-over-item-top');
                                                                        e.currentTarget.classList.remove('drag-over-item-bottom');
                                                                    } else {
                                                                        e.currentTarget.classList.add('drag-over-item-bottom');
                                                                        e.currentTarget.classList.remove('drag-over-item-top');
                                                                    }
                                                                }
                                                            }}
                                                            onDragLeave={(e) => {
                                                                e.currentTarget.classList.remove('drag-over-item-top', 'drag-over-item-bottom');
                                                            }}
                                                            onDrop={(e) => {
                                                                e.stopPropagation();
                                                                e.currentTarget.classList.remove('drag-over-item-top', 'drag-over-item-bottom');
                                                                const rect = e.currentTarget.getBoundingClientRect();
                                                                const y = e.clientY - rect.top;
                                                                let dropIdx = itemIndex;
                                                                if (y >= rect.height / 2) {
                                                                    dropIdx += 1;
                                                                }
                                                                handleDrop(e, groupIndex, dropIdx);
                                                            }}
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
                                    {/* <button
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

                                            // 유효한 조건식 필터링 및 깔끔한 데이터 매핑 (불필요한 내부 속성 제거)
                                            const validInfo = banner.info
                                                .filter(c => (c.label && c.label.toString().trim() !== "") || (c.logic && c.logic.toString().trim() !== ""))
                                                .map((it, idx) => ({
                                                    label3: it.label3 || '',
                                                    label2: it.label2 || '',
                                                    label: it.label || '',
                                                    logic: it.logic || '',
                                                    value: it.value !== undefined ? it.value : (idx + 1)
                                                }));

                                            if (validInfo.length === 0) {
                                                modal.showAlert('알림', '유효한 배너 조건(라벨 또는 조건식)이 없습니다.');
                                                return;
                                            }

                                            const variablesPayload = {};
                                            baseVariables.forEach(bv => {
                                                variablesPayload[bv.id] = bv;
                                            });

                                            // 저장 전 상태를 강제로 평가하게 하기 위해 임시 ID 사용
                                            const previewId = `${banner.id}_preview_temp`;

                                            variablesPayload[previewId] = {
                                                id: previewId,
                                                label: currentLabel || banner.label,
                                                type: 'single',
                                                info: validInfo
                                            };

                                            const payload = {
                                                pageid: sessionStorage.getItem('pageId') || auth.user.userId,
                                                user: auth.user.userId,
                                                table: {
                                                    id: `__var__${previewId}`,
                                                    name: currentLabel || banner.label,
                                                    banner: [previewId],
                                                    stub: baseVariables.length > 0 ? [baseVariables[0].id] : []
                                                },
                                                variables: variablesPayload,
                                                include_stats: ["mean", "std", "min", "max", "n"]
                                            };

                                            localStorage.setItem('dp_preview_payload', JSON.stringify(payload));
                                            window.open('/dp_request_preview', '_blank', 'width=1200,height=700,left=200,top=100');
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
                                    </button> */}
                                    <button
                                        ref={addVarButtonRef}
                                        onClick={() => setIsAddVarPopupOpen(!isAddVarPopupOpen)}
                                        style={{
                                            background: isAddVarPopupOpen ? '#eff6ff' : '#fff',
                                            border: '1px solid #3b82f6',
                                            color: '#3b82f6',
                                            height: '32px',
                                            padding: '0 16px',
                                            borderRadius: '6px',
                                            fontSize: '13px',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            transition: 'all 0.1s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '4px',
                                            boxShadow: isAddVarPopupOpen ? 'inset 0 2px 4px rgba(0,0,0,0.05)' : 'none'
                                        }}
                                        onMouseOver={(e) => {
                                            if (!isAddVarPopupOpen) e.currentTarget.style.background = '#eff6ff';
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.background = isAddVarPopupOpen ? '#eff6ff' : '#fff';
                                            e.currentTarget.style.transform = 'scale(1)';
                                        }}
                                        onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.96)'}
                                        onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        <span style={{ fontSize: '15px', fontWeight: 500, marginTop: '-2px' }}>+</span> 문항추가
                                    </button>
                                </div>
                            </div>

                            <Popup
                                anchor={addVarButtonRef.current}
                                show={isAddVarPopupOpen}
                                popupClass="add-var-popup"
                                anchorAlign={{ horizontal: 'right', vertical: 'bottom' }}
                                popupAlign={{ horizontal: 'right', vertical: 'top' }}
                                margin={{ horizontal: 0, vertical: 4 }}
                            >
                                <div ref={addVarPopupRef} style={{
                                    width: '280px',
                                    height: '400px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    background: '#fff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                    padding: '8px'
                                }}>
                                    <div className="dp-search-input-wrapper" style={{ marginBottom: '8px' }}>
                                        <Search size={14} className="dp-search-input-icon" />
                                        <input
                                            type="text"
                                            placeholder="변수명 검색"
                                            value={addVarSearch}
                                            onChange={(e) => setAddVarSearch(e.target.value)}
                                            className="dp-search-input"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="variable-list custom-scrollbar" style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                                        {addVarFilteredVariables.map(v => (
                                            <VariableItem
                                                key={v.id}
                                                v={v}
                                                isSelected={false}
                                                onDragStart={() => { }}
                                                onClick={handleAddVariableToGrid}
                                            />
                                        ))}
                                        {addVarFilteredVariables.length === 0 && (
                                            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px 0', fontSize: '13px' }}>
                                                검색 결과가 없습니다.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Popup>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 0 16px', flexShrink: 0 }}>
                                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500, userSelect: 'none' }}>
                                    💡 입력창 중 하나를 선택해 엑셀 열을 붙여넣기(Ctrl+V)하면 아래로 자동 채워집니다.
                                </span>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => setIsBulkEditModalOpen(true)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            height: '28px',
                                            padding: '0 12px',
                                            borderRadius: '6px',
                                            border: '1px solid #cbd5e1',
                                            color: '#475569',
                                            background: '#FFFFFF',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'all 0.15s',
                                            boxSizing: 'border-box'
                                        }}
                                        onMouseOver={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#94a3b8'; }}
                                        onMouseOut={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                    >
                                        소분류 일괄 편집
                                    </button>
                                    <button
                                        onClick={handleCopyGrid}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            height: '28px',
                                            padding: '0 12px',
                                            borderRadius: '6px',
                                            border: '1px solid #cbd5e1',
                                            color: '#475569',
                                            background: '#FFFFFF',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'all 0.15s',
                                            boxSizing: 'border-box'
                                        }}
                                        onMouseOver={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#94a3b8'; }}
                                        onMouseOut={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                    >
                                        그리드 복사
                                    </button>
                                </div>
                            </div>
                            <div className="dp-table-container" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                                <KendoGridV3
                                    data={banners.find(b => b.id === selectedBanner)?.info || []}
                                    addable={!!selectedBanner} deletable={!!selectedBanner} editField="inEdit"
                                    onDataChange={updateBannerInfo}
                                    onRowClick={handleRowClick}
                                    newRowTemplate={{ label3: '', label2: '', label: '', logic: '' }}
                                >
                                    <Column field="label3" title="대분류" width="150px" cell={(p) => <MergedTextEditCell {...p} data={banners.find(b => b.id === selectedBanner)?.info || []} onUpdate={handleMergedUpdate} level={3} handleDrop={handleReorderBlock} selectedCells={selectedCells} onCellMouseDown={handleCellMouseDown} onCellMouseEnter={handleCellMouseEnter} onContextMenu={handleContextMenu} />} />
                                    <Column field="label2" title="중분류" width="150px" cell={(p) => <MergedTextEditCell {...p} data={banners.find(b => b.id === selectedBanner)?.info || []} dependencies={['label3']} onUpdate={handleMergedUpdate} level={2} handleDrop={handleReorderBlock} selectedCells={selectedCells} onCellMouseDown={handleCellMouseDown} onCellMouseEnter={handleCellMouseEnter} onContextMenu={handleContextMenu} />} />
                                    <Column field="label" title="소분류" cell={(p) => <MergedTextEditCell {...p} data={banners.find(b => b.id === selectedBanner)?.info || []} dependencies={['label3', 'label2']} onUpdate={handleMergedUpdate} level={1} handleDrop={handleReorderBlock} selectedCells={selectedCells} onCellMouseDown={handleCellMouseDown} onCellMouseEnter={handleCellMouseEnter} onContextMenu={handleContextMenu} />} />
                                    <Column field="logic" title="조건" width="180px" headerCell={ConditionHeaderCell} headerClassName="k-text-center" cell={(p) => <MergedTextEditCell {...p} data={banners.find(b => b.id === selectedBanner)?.info || []} onUpdate={handleMergedUpdate} disableMerge={true} />} />
                                    <Column
                                        field="n"
                                        title="빈도"
                                        width="80px"
                                        headerClassName="k-text-center"
                                        cell={(p) => {
                                            const freqObj = frequencies[`${selectedBanner}-${p.dataIndex}`];
                                            const nVal = freqObj?.n;
                                            const pVal = freqObj?.p;
                                            return (
                                                <td style={{ textAlign: 'right', padding: '4px 12px', verticalAlign: 'middle', borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
                                                    {nVal !== null && nVal !== undefined ? (
                                                        <React.Fragment>
                                                            <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '13px' }}>
                                                                {nVal.toLocaleString()}
                                                            </div>
                                                            {pVal !== null && pVal !== undefined && (
                                                                <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>
                                                                    {Number(pVal).toFixed(1)}%
                                                                </div>
                                                            )}

                                                        </React.Fragment>
                                                    ) : (
                                                        <span style={{ color: '#94a3b8', fontSize: '13px' }}>-</span>
                                                    )}
                                                </td>
                                            );
                                        }}
                                    />
                                </KendoGridV3>
                            </div>
                        </>
                    )}

                    {/* Context Menu */}
                    {contextMenu && contextMenu.type === 'sidebar' && (
                        <div style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 100000, background: '#fff', border: '1px solid #ccc', borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', padding: '4px 0', minWidth: '120px' }}>
                            <div style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px' }} onClick={() => handleDuplicateBanner(contextMenu.bannerId)} onMouseEnter={e => e.target.style.background = '#f1f5f9'} onMouseLeave={e => e.target.style.background = 'transparent'}>
                                배너 복제
                            </div>
                        </div>
                    )}
                    {contextMenu && contextMenu.type !== 'sidebar' && (
                        <div style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 100000, background: '#fff', border: '1px solid #ccc', borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', padding: '4px 0', minWidth: '120px' }}>
                            <div style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px' }} onClick={handleMergeCells} onMouseEnter={e => e.target.style.background = '#f1f5f9'} onMouseLeave={e => e.target.style.background = 'transparent'}>
                                셀 병합
                            </div>
                            <div style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px' }} onClick={handleUnmergeCells} onMouseEnter={e => e.target.style.background = '#f1f5f9'} onMouseLeave={e => e.target.style.background = 'transparent'}>
                                셀 분할
                            </div>
                            <div style={{ borderTop: '1px solid #e2e8f0', margin: '4px 0' }} />
                            <div style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px', color: '#ef4444' }} onClick={handleDeleteSelectedRows} onMouseEnter={e => e.target.style.background = '#fee2e2'} onMouseLeave={e => e.target.style.background = 'transparent'}>
                                선택 행 일괄 삭제
                            </div>
                        </div>
                    )}
                    <BulkEditSubcategoriesModal
                        show={isBulkEditModalOpen}
                        currentInfo={banners.find(b => b.id === selectedBanner)?.info || []}
                        onClose={() => setIsBulkEditModalOpen(false)}
                        onApply={(lines) => {
                            const currentInfo = banners.find(b => b.id === selectedBanner)?.info || [];
                            const updatedInfo = currentInfo.map((item, idx) => {
                                if (lines[idx] !== undefined) {
                                    return {
                                        ...item,
                                        label: lines[idx]
                                    };
                                }
                                return item;
                            });
                            updateBannerInfo(updatedInfo);
                        }}
                    />
                    <Toast
                        show={toast.show}
                        message={toast.message}
                        onClose={() => setToast({ ...toast, show: false })}
                    />
                </div>
            </div>
        </div>
    );
});

export default DpRequestBannerStep;
