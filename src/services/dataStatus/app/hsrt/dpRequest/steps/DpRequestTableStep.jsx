import React, { useState, useEffect, useContext, useCallback, useMemo, forwardRef, useImperativeHandle, useRef } from 'react';
import { ChevronDown, Check, Search, X, Info, RotateCcw, ArrowDown } from 'lucide-react';
import { useSelector } from 'react-redux';
import { Popup } from '@progress/kendo-react-popup';
import { DropDownList, MultiSelect } from '@progress/kendo-react-dropdowns';
import { DpRequestPageApi } from '../DpRequestPageApi';
import KendoGridV2, { GridColumn as Column } from "@/components/kendo/KendoGridV2";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import { modalContext } from "@/components/common/Modal.jsx";
import useUpdateHistory from '@/hooks/useUpdateHistory';
import DpRequestStubSettingModal from './DpRequestStubSettingModal';
import Toast from "@/components/common/Toast";
import BulkEditLabelsModal from "./BulkEditLabelsModal";

const TableStepContext = React.createContext(null);

// 프리셋이 적용된 source_based 스터브인지 확인
const canReapplyPreset = (stub) => {
    if (!stub) return false;
    if (stub._is_custom || stub.var_type === 'summary' || stub.var_type === 'custom') return false;
    if (String(stub.recoded_var_id).includes('_copy_')) return false; // 복사된 행은 제외
    const hasPreset = stub.rank_preset_name || stub.scale_preset_name || stub.group_preset_name || stub.stat_summary;
    return !!hasPreset;
};

// --- 상수 및 유틸리티 ---
const STAT_OPTIONS = [
    { id: 'mean', label: '평균 (mean)' },
    { id: 'std', label: '표준편차 (std)' },
    { id: 'mode', label: '최빈값 (mode)' },
    { id: 'median', label: '중앙값 (median)' },
];

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
const handleGlobalPointerDownStub = (e) => {
    if (e.target) {
        const isPopup = e.target.closest('.k-popup') || e.target.closest('.k-list-container') || e.target.closest('.k-animation-container') || e.target.closest('.dp-dropdown-popup') || e.target.closest('.dp-custom-popup');
        if (isPopup) return;

        const isDragCell = e.target.closest('td[data-field="x_info"]') || e.target.closest('td[data-field="sort_mode"]');

        if (!isDragCell && !e.ctrlKey && !e.metaKey) {
            stubDragSelectedIds.clear();
            stubDragBaseSelectedIds.clear();
            stubDragStartId = null;
            document.querySelectorAll('.stub-cell-selected').forEach(el => el.classList.remove('stub-cell-selected'));
        }
    }
};

if (typeof window !== 'undefined') {
    // 중복 등록 방지를 위해 기존 것 제거
    window.removeEventListener('mouseup', handleGlobalPointerUpStub);
    window.removeEventListener('pointerup', handleGlobalPointerUpStub);
    window.removeEventListener('mousedown', handleGlobalPointerDownStub);
    window.removeEventListener('pointerdown', handleGlobalPointerDownStub);

    window.addEventListener('mouseup', handleGlobalPointerUpStub);
    window.addEventListener('pointerup', handleGlobalPointerUpStub);
    window.addEventListener('mousedown', handleGlobalPointerDownStub);
    window.addEventListener('pointerdown', handleGlobalPointerDownStub);
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
.dp-mini-dropdown .k-input-inner,
.dp-mini-dropdown .k-dropdown-wrap {
    padding: 0 2px 0 4px !important;
}
.dp-mini-dropdown .k-input-button,
.dp-mini-dropdown .k-select {
    padding: 0 2px !important;
    width: 20px !important;
    min-width: 20px !important;
}
.dp-mini-dropdown .k-button-icon,
.dp-mini-dropdown .k-icon {
    font-size: 14px !important;
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

    let displayText = <span style={{ color: '#94a3b8', fontSize: '13px' }}></span>;
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

// const VAR_TYPE_OPTIONS = ['single', 'multi', 'rank', 'minrank', 'maxrank', 'scale', 'dummy', 'custom', 'open(문자)', 'open(숫자)'];
const VAR_TYPE_OPTIONS = ['single', 'multi', 'rank', /* 'minrank', 'maxrank', */ 'scale', /* 'dummy', 'custom', */ 'open(문자)', 'open(숫자)'];

const canUseScalePreset = (type) => {
    const t = String(type || '').toLowerCase();
    if (t === 'summary' || t === 'custom') return false;
    return t === 'scale';
};

const canUseRankPreset = (type) => {
    const t = String(type || '').toLowerCase();
    if (t === 'summary' || t === 'custom') return false;
    return t === 'rank' || t === 'minrank' || t === 'maxrank' || t === 'multi';
};

const canUseStatPreset = (type) => {
    const t = String(type || '').toLowerCase();
    return t === 'open(숫자)' || t === 'double' || t === 'open-num';
};

const canUseGroupPreset = (type) => {
    const t = String(type || '').toLowerCase();
    if (t === 'summary' || t === 'custom') return false;
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
            return <span style={{ color: '#94a3b8', fontSize: '13px' }}></span>;
        }
        return React.cloneElement(element, { ...element.props }, <span style={{ fontSize: '13px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{value.text}</span>);
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
            draggable={field === 'x_info' ? true : undefined}
            onDragStart={field === 'x_info' ? e => { e.stopPropagation(); e.preventDefault(); } : undefined}
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
    const context = useContext(TableStepContext);

    // 외부에서 dataItem이 바뀔 때만 동기화 (편집 중에는 무시)
    useEffect(() => {
        if (!isEditing) setLocalVal(String(dataItem[field] ?? ''));
    }, [dataItem.source_var_id, dataItem[field], isEditing]);

    const commit = () => {
        setIsEditing(false);
        if (localVal !== String(dataItem[field] ?? '')) onUpdate(dataItem, field, localVal);
    };

    const handlePaste = (e) => {
        const clipboardData = e.clipboardData.getData('Text');
        const lines = clipboardData.split(/\r?\n/).map(l => l.trim());
        if (lines.length > 1) {
            e.preventDefault();
            if (context && context.stubs) {
                const { stubs, setStubs, onUnsavedChange } = context;
                const startIdx = stubs.findIndex(item => item._row_id === dataItem._row_id);
                if (startIdx !== -1) {
                    const updated = stubs.map((item, idx) => {
                        if (idx >= startIdx) {
                            const offset = idx - startIdx;
                            const lineVal = lines[offset];
                            if (lineVal !== undefined) {
                                return {
                                    ...item,
                                    [field]: lineVal
                                };
                            }
                        }
                        return item;
                    });
                    setStubs(updated);
                    if (onUnsavedChange) onUnsavedChange(true);
                    setIsEditing(false);
                }
            }
        }
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
                    onPaste={handlePaste}
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
            title={localVal}
            onClick={() => setIsEditing(true)}
            style={{
                padding: '0 8px', fontSize: '13px', verticalAlign: 'middle', cursor: 'text', textAlign: align,
                color: localVal ? '#1e293b' : '#94a3b8', userSelect: 'none',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '1px'
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
            return <span style={{ color: '#94a3b8', fontSize: '13px' }}></span>;
        }
        return React.cloneElement(element, { ...element.props }, <span style={{ fontSize: '13px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{value}</span>);
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
const DpRequestTableStep = forwardRef(({ onUnsavedChange, onRefresh }, ref) => {
    const loadingSpinner = useContext(loadingSpinnerContext);
    const modal = useContext(modalContext);
    const auth = useSelector((store) => store.auth);
    const { getRecodedOverview, saveRecodedOverview, getTableDetail, getBannerDetail, reapplyPreset } = DpRequestPageApi();

    const [searchTerm, setSearchTerm] = useState('');
    const [stubs, setStubs] = useState([]);
    const [banners, setBanners] = useState([]);
    const [originalRecodedIds, setOriginalRecodedIds] = useState([]);
    const [originalStubs, setOriginalStubs] = useState([]);
    const [modifiedPresetIds, setModifiedPresetIds] = useState(new Set());
    const gridRef = useRef(null);
    const [scalePresets, setScalePresets] = useState([]);
    const [rankPresets, setRankPresets] = useState([]);
    const [groupPresets, setGroupPresets] = useState([]);
    const [statPresets, setStatPresets] = useState([]);

    const [selectedStubForModal, setSelectedStubForModal] = useState(null);

    const history = useUpdateHistory('dp-table');
    const isHistoryAction = useRef(false);

    const [toast, setToast] = useState({ show: false, message: '' });
    const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);

    const handleCopyGrid = async () => {
        try {
            if (!filteredStubs || filteredStubs.length === 0) {
                setToast({ show: true, message: '복사할 데이터가 없습니다.' });
                return;
            }
            const headers = ['변수', '라벨', '유형', '조건', '배너', '그룹', '통계 설정', '척도', '순위'].join('\t');
            const rows = filteredStubs.map(item => {
                const varId = String(item.recoded_var_id ?? '').trim();
                const label = String(item.var_label ?? '').trim();
                const type = String(item.var_type ?? '').trim();
                const condition = String(item.condition ?? '').trim();
                const banner = String(item.x_info ?? '').trim();
                const group = String(item.group_preset_name ?? '').trim();
                const stat = String(item.stat_summary ?? '').trim();
                const scale = String(item.scale_preset_name ?? '').trim();
                const rank = String(item.rank_preset_name ?? '').trim();
                return `${varId}\t${label}\t${type}\t${condition}\t${banner}\t${group}\t${stat}\t${scale}\t${rank}`;
            }).join('\n');

            const text = `${headers}\n${rows}`;
            await navigator.clipboard.writeText(text);
            setToast({ show: true, message: '복사 완료 (Ctrl+V)' });
        } catch (err) {
            console.error('Failed to copy grid:', err);
            setToast({ show: true, message: '복사 실패' });
        }
    };

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
            const user = auth?.user?.userId;
            if (!pageId || !user) return;
            try {
                loadingSpinner.show();
                const requestData = {
                    pageid: pageId,
                    user: user,
                    dp_request_recoded_items: [],
                    summary_folders: [],
                    delete_ids: [],
                    auto_recode: true,
                    auto_generate_summary: false,
                    reset_to_default: true
                };
                const result = await saveRecodedOverview.mutateAsync(requestData);
                if (result?.success === "777") {
                    if (onUnsavedChange) onUnsavedChange(false);
                    await fetchOverview();
                    if (typeof onRefresh === 'function') onRefresh();
                    modal.showAlert('알림', '세팅 초기화가 완료되었습니다.');
                } else {
                    modal.showAlert('오류', '초기화 작업에 실패했습니다.');
                }
            } catch (err) {
                console.error(err);
                modal.showAlert('오류', '초기화 중 문제가 발생했습니다.');
            } finally {
                loadingSpinner.hide();
            }
        },
        /*
        reapplyDefault: async () => {
            const targetIds = stubs.filter(s => {
                const isSummary = s.var_type === 'summary';
                const isCustom = s.stub_kind === 'custom' || (!s.stub_kind && !s.source_var_id);
                const isCopied = String(s.recoded_var_id).includes('_copy_');
                const hasCustomizedFields = s.customized_fields && s.customized_fields.length > 0;

                return !isSummary && !isCustom && !isCopied && s.preset_dirty && !hasCustomizedFields;
            }).map(s => s.recoded_var_id);

            if (targetIds.length === 0) {
                modal.showAlert('알림', '기본 재적용 대상 항목이 없습니다.');
                return;
            }

            await handleSave(targetIds);
        }
        */
    }));

    const fetchOverview = useCallback(async () => {
        const pageId = sessionStorage.getItem('pageId');
        const user = auth?.user?.userId;
        if (!pageId || !user) return;

        try {
            loadingSpinner.show();
            const payload = { user: user, pageid: pageId };
            const response = await getRecodedOverview.mutateAsync(payload);
            const resultData = response?.data?.resultjson || response?.resultjson || response || {};

            const updatePresets = (data, setter) => {
                setter(Array.isArray(data) ? data : (typeof data === 'object' ? Object.values(data) : []));
            };
            updatePresets(resultData.presets?.scale || [], setScalePresets);
            updatePresets(resultData.presets?.rank || [], setRankPresets);
            updatePresets(resultData.presets?.group || [], setGroupPresets);
            updatePresets(resultData.presets?.stat || [], setStatPresets);

            let formattedBanners = [];
            try {
                // banner/detail은 banner_ids만 내려줌 → table/detail에서 label 보충
                const [bannerRes, tableRes] = await Promise.all([
                    getBannerDetail.mutateAsync({ pageid: pageId, user }),
                    getTableDetail.mutateAsync({ pageid: pageId, user })
                ]);
                const bannerIds = bannerRes?.resultjson?.banner_ids || bannerRes?.data?.resultjson?.banner_ids || [];
                const recodedVars = tableRes?.resultjson?.recoded_variables || tableRes?.data?.resultjson?.recoded_variables || {};
                const recodesArr = Array.isArray(recodedVars)
                    ? recodedVars
                    : Object.entries(recodedVars).map(([key, val]) => ({ id: val.id || key, ...val }));

                if (bannerIds.length > 0) {
                    formattedBanners = bannerIds.map(bid => {
                        const found = recodesArr.find(v => v.id === bid);
                        return { id: bid, label: found?.name || found?.label || bid };
                    });
                } else {
                    formattedBanners = recodesArr
                        .filter(v => String(v.id || '').toLowerCase().startsWith("banner"))
                        .sort((a, b) => String(a.id || '').localeCompare(String(b.id || '')))
                        .map(v => ({ id: v.id, label: v.name || v.label || v.id }));
                }
                setBanners(formattedBanners);
            } catch (e) { console.error('Failed to fetch banners', e); }

            const stubItems = resultData.stub_grid_items || [];
            const summaryFolders = resultData.summary_folders || [];
            const orderIds = (resultData.order_ids && resultData.order_ids.length > 0)
                ? resultData.order_ids
                : (resultData.default_order_ids || []);

            const variablesMap = resultData.variables || {};

            // [호환성 처리] 과거 데이터나 API에서 rank_child를 stub_grid_items에 주고 variablesMap에 안 준 경우 복원
            const tempStubIdsSet = new Set([
                ...stubItems.map(s => s.recoded_var_id).filter(Boolean),
                ...Object.keys(variablesMap)
            ]);

            const applyRankChildFallback = (id, sourceItem) => {
                if (!id) return;
                const match = id.match(/^(.*)_\((.+)\)$/);
                if (match) {
                    const parentId = match[1];
                    // 부모가 존재하는 경우에만 자식으로 인정 (예기치 않은 이름 매칭 방지)
                    if (tempStubIdsSet.has(parentId)) {
                        if (!variablesMap[id]) {
                            variablesMap[id] = {
                                id: id,
                                source_var_id: sourceItem?.source_var_id || parentId.replace(/_stub$/, ''),
                                label: sourceItem?.label || sourceItem?.var_label || '',
                                generated_kind: 'rank_child',
                                parent_stub_id: parentId,
                                rank_output: match[2],
                                condition: sourceItem?.condition || sourceItem?.filter_expression || '',
                                info: sourceItem?.info || []
                            };
                        } else {
                            variablesMap[id].generated_kind = 'rank_child';
                            variablesMap[id].parent_stub_id = parentId;
                            variablesMap[id].rank_output = variablesMap[id].rank_output || match[2];
                        }
                    }
                }
            };

            stubItems.forEach(s => applyRankChildFallback(s.recoded_var_id, s));
            Object.keys(variablesMap).forEach(k => applyRankChildFallback(k, variablesMap[k]));

            // 서버에서 혹시 rank child를 메인 배열에 내려주는 경우를 대비해 메인 목록에서 강제 제외
            const parentOnlyStubItems = stubItems.filter(s => {
                const v = variablesMap[s.recoded_var_id];
                return !(v && (v.generated_kind === 'rank_child' || v.parent_stub_id));
            });

            // variables에서 custom stub도 보완 (stub_grid_items에 없는 경우)
            const stubItemIds = new Set(parentOnlyStubItems.map(s => s.recoded_var_id).filter(Boolean));
            const extraCustomStubs = Object.values(variablesMap).filter(v =>
                v.variable_role === 'stub' &&
                (v.stub_kind === 'custom' || !v.source_var_id) &&
                !stubItemIds.has(v.id) &&
                v.generated_kind !== 'rank_child' &&
                !v.parent_stub_id
            );

            const allStubItems = [...parentOnlyStubItems, ...extraCustomStubs.map(v => ({
                recoded_var_id: v.id,
                source_var_id: null, // custom stub은 source_var_id를 null 유지
                _is_custom: true,
                label: v.label || '',
                type: v.type || 'custom',
                filter_expression: v.condition || null,
                banner: v.banner || [],
                scale_preset_id: v.scale_preset_id || null,
                rank_preset_id: v.rank_preset_id || null,
                group_preset_id: v.group_preset_id || null,
                stat_preset_id: v.stat_preset_id || null,
                info: v.info || [],
            }))];

            // 1. 모든 원본 식별자 수집 (추후 삭제 감지용)
            const allOriginalIds = new Set();
            stubItems.forEach(s => {
                if (s.recoded_var_id && variablesMap[s.recoded_var_id]?.generated_kind !== 'rank_child') {
                    allOriginalIds.add(s.recoded_var_id);
                }
            });
            Object.keys(variablesMap).forEach(k => {
                if (variablesMap[k]?.generated_kind !== 'rank_child') {
                    allOriginalIds.add(k);
                }
            });
            summaryFolders.forEach(s => s.stub_id && allOriginalIds.add(s.stub_id));
            setOriginalRecodedIds(Array.from(allOriginalIds));

            const mappedStubs = allStubItems.map(item => {
                const v = variablesMap[item.recoded_var_id] || {};
                const parentType = item.type || v.type || 'custom';
                const isRankParent = parentType === 'rank' || parentType === 'multi' || parentType === 'minrank' || parentType === 'maxrank';
                let infoArray = (item.info && item.info.length > 0) ? item.info : (v.info && v.info.length > 0 ? v.info : []);


                return {
                    ...item,
                    _row_id: `row_${Date.now()}_${Math.random()}`,
                    _is_custom: item._is_custom || false,
                    source_var_id: (() => {
                        const vObj = variablesMap[item.recoded_var_id] || {};
                        if (item._is_custom || vObj.stub_kind === 'custom' || parentType === 'custom' || String(item.recoded_var_id).startsWith('custom_stub_')) return null;

                        let sid = item.source_var_id || item.recoded_var_id;
                        if (isRankParent && String(sid).endsWith('_stub')) {
                            return String(sid).replace(/_stub$/, '');
                        }
                        return sid;
                    })(),
                    recoded_var_id: item.recoded_var_id,
                    var_label: item.label || '',
                    var_type: parentType,
                    condition: item.filter_expression || item.condition || '',
                    x_info: (() => {
                        let b = Array.isArray(item.banner) ? item.banner[0] || '' : (item.banner || item.x_info || '');
                        if (!b && formattedBanners.length > 0) return formattedBanners[0].id;
                        return b;
                    })(),
                    stat_summary: item.stat_preset_id === 'default_double' ? '' : (item.stat_preset_id || ''),
                    scale_preset_name: item.scale_preset_id === 'default_double' ? '' : (item.scale_preset_id || ''),
                    rank_preset_name: item.rank_preset_id || '',
                    group_preset_name: item.group_preset_id || '',
                    info: infoArray,
                    rank_outputs: v.rank_outputs || item.rank_outputs || []
                };
            });

            const mappedSummaries = summaryFolders.map(folder => {
                const varObj = variablesMap[folder.stub_id] || {};
                const getFallbackLabel = (id) => {
                    if (!id) return '';
                    const parts = id.split('_');
                    if (parts.length >= 3 && parts[0] === 'summary') {
                        const prefix = parts[1].toUpperCase();
                        const suffix = parts[2].toUpperCase();
                        let suffixText = suffix;
                        if (suffix === 'TOP') suffixText = 'Top';
                        if (suffix === 'MID') suffixText = 'Mid';
                        if (suffix === 'BOT') suffixText = 'Bot';
                        if (suffix === 'MEAN') suffixText = '평균';
                        return `${prefix} - ${suffixText} 요약`;
                    }
                    return id;
                };

                return {
                    ...folder,
                    _row_id: `row_${Date.now()}_${Math.random()}`,
                    source_var_id: folder.id,
                    recoded_var_id: folder.stub_id,
                    var_label: folder.label || varObj.label || folder.name || folder.var_label || getFallbackLabel(folder.stub_id),
                    var_type: 'summary',
                    condition: '',
                    x_info: (() => {
                        let bArr = folder.banner ?? folder.x_info ?? [];
                        if (!Array.isArray(bArr)) bArr = [bArr];
                        if ((!bArr || bArr.length === 0 || !bArr[0]) && formattedBanners.length > 0) return [formattedBanners[0].id];
                        return bArr;
                    })(),
                    stat_summary: '',
                    scale_preset_name: '',
                    rank_preset_name: '',
                    group_preset_name: '',
                };
            });

            const allItems = [...mappedStubs, ...mappedSummaries];
            const itemMap = new Map(allItems.map(item => [item.recoded_var_id, item]));

            const sorted = [];
            const seenParent = new Set();
            orderIds.forEach(id => {
                const childVar = variablesMap[id];
                if (childVar && childVar.generated_kind === 'rank_child' && childVar.parent_stub_id) {
                    const parentId = childVar.parent_stub_id;
                    if (!seenParent.has(parentId) && itemMap.has(parentId)) {
                        sorted.push(itemMap.get(parentId));
                        itemMap.delete(parentId);
                        seenParent.add(parentId);
                    }
                } else if (itemMap.has(id)) {
                    sorted.push(itemMap.get(id));
                    itemMap.delete(id);
                }
            });

            itemMap.forEach(item => sorted.push(item));

            setStubs(sorted);
            setOriginalStubs(sorted);
            history.reset(sorted);
            if (onUnsavedChange) onUnsavedChange(false);
        } catch (err) {
            console.error(err);
            modal.showAlert('오류', '데이터 호출 실패');
        } finally {
            loadingSpinner.hide();
        }
    }, [getRecodedOverview, history, loadingSpinner, modal, onUnsavedChange]);

    useEffect(() => {
        fetchOverview();
        const handlePageUpdate = () => fetchOverview();
        window.addEventListener("pageSelected", handlePageUpdate);
        return () => window.removeEventListener("pageSelected", handlePageUpdate);
    }, [auth?.user?.userId]);

    const filteredStubs = useMemo(() => {
        if (!searchTerm) return stubs;
        const q = searchTerm.toLowerCase();
        return stubs.filter(s => s.recoded_var_id?.toLowerCase().includes(q) || s.var_label?.toLowerCase().includes(q));
    }, [stubs, searchTerm]);

    const scrollPosToRestore = useRef(null);

    React.useLayoutEffect(() => {
        if (scrollPosToRestore.current && gridRef.current?.setScrollPosition) {
            gridRef.current.setScrollPosition(scrollPosToRestore.current);
            scrollPosToRestore.current = null;
        }
    }, [stubs]);

    // onDataChange는 행추가/삭제 시에만 호출됨 (텍스트 편집은 TextEditCell의 onBlur에서 처리)
    const handleDataChange = useCallback((newData) => {
        setStubs(newData);
        if (onUnsavedChange) onUnsavedChange(true);
    }, [onUnsavedChange]);

    const PRESET_FIELDS = ['group_preset_name', 'stat_summary', 'scale_preset_name', 'rank_preset_name'];

    const handleCellUpdate = useCallback((item, field, value) => {
        const targetId = item._row_id;
        const isPresetModified = PRESET_FIELDS.includes(field);

        if (stubDragSelectedIds.size > 1 && stubDragSelectedIds.has(String(item.source_var_id))) {
            setStubs(prev => prev.map(s => {
                if (stubDragSelectedIds.has(String(s.source_var_id))) {
                    let updated = { ...s };
                    if (field !== 'recoded_var_id') {
                        if (updated[field] !== value) {
                            updated[field] = value;
                            if (isPresetModified) {
                                setModifiedPresetIds(old => new Set(old).add(updated.recoded_var_id));
                            }
                        }
                    }
                    return updated;
                }
                return s;
            }));
        } else {
            setStubs(prev => prev.map(s => {
                if (s._row_id === targetId) {
                    if (s[field] !== value && isPresetModified) {
                        setModifiedPresetIds(old => new Set(old).add(s.recoded_var_id));
                    }
                    let updated = { ...s, [field]: value };
                    if (field === 'recoded_var_id' && updated.rank_outputs && Array.isArray(updated.rank_outputs)) {
                        updated.rank_outputs = updated.rank_outputs.map(out => {
                            const sRank = out.start_rank || 1;
                            const eRank = out.end_rank || 1;
                            let rankIdStr = `${sRank}`;
                            if (sRank !== eRank) {
                                const start = Math.min(sRank, eRank);
                                const end = Math.max(sRank, eRank);
                                rankIdStr = Array.from({ length: end - start + 1 }, (_, i) => start + i).join('+');
                            }
                            return { ...out, recoded_var_id: `${value}_(${rankIdStr})` };
                        });
                    }
                    return updated;
                }
                return s;
            }));
        }

        // 작업 후 선택 초기화
        stubDragSelectedIds.clear();
        stubDragBaseSelectedIds.clear();
        stubDragStartId = null;
        document.querySelectorAll('.stub-cell-selected').forEach(el => el.classList.remove('stub-cell-selected'));

        if (onUnsavedChange) onUnsavedChange(true);
    }, [onUnsavedChange]);
    const handleRowAdd = (insertAfterIdx) => {
        const draftId = `__draft_custom_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        const newRow = {
            _row_id: `row_${Date.now()}_${Math.random()}`,
            source_var_id: null,
            recoded_var_id: draftId,
            var_label: '새 스터브',
            var_type: 'custom',
            _is_custom: true,
            condition: '',
            x_info: banners.length > 0 ? banners[0].id : '',
            stat_summary: '',
            scale_preset_name: '',
            rank_preset_name: '',
            group_preset_name: '',
            info: [],
            banner: banners.length > 0 ? [banners[0].id] : []
        };

        const scrollPos = gridRef.current?.getScrollPosition?.();
        if (scrollPos) scrollPosToRestore.current = scrollPos;

        setStubs(prev => {
            const next = [...prev];
            if (insertAfterIdx !== undefined && insertAfterIdx !== null) {
                const targetItem = filteredStubs[insertAfterIdx];
                const realIdx = targetItem ? next.findIndex(item => item._row_id === targetItem._row_id) : -1;
                if (realIdx !== -1) {
                    next.splice(realIdx + 1, 0, newRow);
                } else {
                    next.push(newRow);
                }
            } else {
                next.push(newRow);
            }
            return next;
        });

        if (onUnsavedChange) onUnsavedChange(true);
    };

    const handleRowCopy = (idx) => {
        if (idx === undefined || idx === null) return;

        const scrollPos = gridRef.current?.getScrollPosition?.();
        if (scrollPos) scrollPosToRestore.current = scrollPos;

        setStubs(prev => {
            const targetItem = filteredStubs[idx];
            if (!targetItem) return prev;

            const realIdx = prev.findIndex(item => item._row_id === targetItem._row_id);
            if (realIdx === -1) return prev;

            const target = prev[realIdx];
            const next = [...prev];
            const newRecodedId = `${target.recoded_var_id}_copy_${Math.floor(Math.random() * 1000)}`;
            const newRow = {
                ...target,
                _row_id: `row_${Date.now()}_${Math.random()}`,
                recoded_var_id: newRecodedId,
                var_label: `${target.var_label}_copy`,
                _origin: 'copied'
            };

            // rank_outputs가 있다면 복사본에 맞게 recoded_var_id 변경
            if (newRow.rank_outputs && Array.isArray(newRow.rank_outputs)) {
                newRow.rank_outputs = newRow.rank_outputs.map(out => {
                    const sRank = out.start_rank || 1;
                    const eRank = out.end_rank || 1;
                    let rankIdStr = `${sRank}`;
                    if (sRank !== eRank) {
                        const start = Math.min(sRank, eRank);
                        const end = Math.max(sRank, eRank);
                        rankIdStr = Array.from({ length: end - start + 1 }, (_, i) => start + i).join('+');
                    }
                    return {
                        ...out,
                        recoded_var_id: `${newRecodedId}_(${rankIdStr})`,
                        parent_stub_id: newRecodedId,
                        source_var_id: target.source_var_id
                    };
                });
            }

            next.splice(realIdx + 1, 0, newRow);
            return next;
        });

        if (onUnsavedChange) onUnsavedChange(true);
    };

    const handleRowDelete = (idx) => {
        if (idx === undefined || idx === null) return;

        const scrollPos = gridRef.current?.getScrollPosition?.();
        if (scrollPos) scrollPosToRestore.current = scrollPos;

        setStubs(prev => {
            const targetItem = filteredStubs[idx];
            if (!targetItem) return prev;
            return prev.filter(item => item._row_id !== targetItem._row_id);
        });

        if (onUnsavedChange) onUnsavedChange(true);
    };

    const handleReapplyPreset = async (stubItem) => {
        const pageId = sessionStorage.getItem('pageId');
        const user = auth?.user?.userId;
        if (!pageId || !user) {
            modal.showAlert('알림', '사용자 정보나 페이지 정보를 확인할 수 없습니다.');
            return;
        }
        const varId = stubItem.recoded_var_id;
        if (!varId) return;

        modal.showConfirm('알림', `[${varId}] 설정을 재적용하시겠습니까?\n해당 스터브의 수동 수정값이 현재 프리셋 기준으로 덮어씌워집니다.`, {
            btns: [
                { title: '취소', click: () => { } },
                {
                    title: '재적용', click: async () => {
                        try {
                            const res = await reapplyPreset.mutateAsync({ pageid: pageId, user, recoded_var_ids: [varId] });
                            if (res?.success === '777' || res?.success === 777) {
                                // 성공 후 그리드 데이터 재조회 및 상단 컨텍스트 갱신
                                await fetchOverview();
                                if (typeof onRefresh === 'function') onRefresh();
                                modal.showAlert('완료', `[${varId}] 설정이 재적용되었습니다.`);
                            } else {
                                modal.showAlert('오류', res?.message || '설정 재적용에 실패했습니다.');
                            }
                        } catch (err) {
                            console.error('reapplyPreset error', err);
                            modal.showAlert('오류', err?.message || '설정 재적용 중 오류가 발생했습니다.');
                        }
                    }
                }
            ]
        });
    };

    const handleSave = async (forceReapplyIds = []) => {
        const pageId = sessionStorage.getItem('pageId');
        const user = auth?.user?.userId;
        if (!pageId || !user) {
            modal.showAlert('알림', '사용자 정보나 페이지 정보를 확인할 수 없습니다.');
            return false;
        }

        // 2. 저장용 데이터 구성 (stubs -> dp_request_recoded_items & variables)
        const stubItems = [];
        const summaryFolders = [];
        const variablesMap = {};

        for (const stub of stubs) {
            // summary 타입은 summary_folders로 분리
            if (stub.var_type === 'summary') {
                const bannerArr = stub.x_info
                    ? (Array.isArray(stub.x_info) ? stub.x_info : [stub.x_info])
                    : [];

                summaryFolders.push({
                    stub_id: stub.recoded_var_id,
                    name: stub.var_label || '',
                    label: stub.var_label || '',
                    items: Array.isArray(stub.items) ? stub.items : [],
                    banner: bannerArr
                });
                continue;
            }

            let effSourceId = stub.source_var_id;
            let effRecodedId = stub.recoded_var_id;

            // 새로 추가한 항목인 경우 (이제 API로 추가되므로 이 로직은 사실상 쓰이지 않지만 복사/수동 추가를 위해 남김)
            if (!stub.recoded_var_id || !stub.recoded_var_id.trim()) {
                modal.showAlert('알림', '모든 열의 "변수" 필드를 입력해주세요.');
                return false;
            }
            effRecodedId = stub.recoded_var_id.trim();
            effSourceId = stub.source_var_id ?? null;

            const isRankParent = stub.var_type === 'rank' || stub.var_type === 'multi' || stub.var_type === 'minrank' || stub.var_type === 'maxrank';

            // 커스텀 스터브 및 복제된 스터브는 원본 변수가 없어야 함 (에러 방지). 단, rank 계열은 제외 (백엔드 필수 검증)
            const isCustomLike = !isRankParent && (stub.var_type === 'custom' || effRecodedId.startsWith('custom_stub_') || stub._is_custom || stub._origin === 'copied');
            if (isCustomLike) {
                effSourceId = null;
            }

            let filterExp = stub.condition || null;
            let infoArray = undefined;

            if (stub.info) {
                let rankChildCount = 0;
                infoArray = stub.info.map((opt, i) => {
                    const isBase = opt.type === 'base';
                    const isStat = ["mean", "median", "mode", "min", "max", "var", "std", "sum", "variance", "rse"].includes(opt.type);
                    const rowRole = isBase ? 'base' : (isStat ? "stat" : (opt.row_role || "item"));

                    if (isBase) {
                        filterExp = opt.logic || null;
                    }

                    // ID 보정 (임시 ID 제거 및 rank parent 형식 맞춤)
                    const isTempId = opt.id && (String(opt.id).startsWith('combo-item-') || String(opt.id).startsWith('opt_'));
                    let finalId = (!isTempId && opt.id) ? opt.id : undefined;

                    if (isRankParent && opt.type === 'rank') {
                        const rankVal = opt.value !== undefined && opt.value !== null && opt.value !== '' ? opt.value : (rankChildCount + 1);
                        finalId = `${effRecodedId}_(${rankVal})`;
                        rankChildCount++;
                    } else if (!finalId) {
                        finalId = `opt_${Date.now()}_${i}`;
                    }

                    let mappedLine = null;
                    if (opt.line === "일반선") mappedLine = "thin";
                    else if (opt.line === "굵은선") mappedLine = "thick";
                    else if (opt.line === "이중선") mappedLine = "double";
                    else if (opt.line && opt.line !== "선택 안함") mappedLine = opt.line;

                    return {
                        ...opt,
                        id: finalId,
                        index: i + 1,
                        label: opt.label ? opt.label.replace(/^\s*/, '') : '',
                        type: opt.type,
                        row_role: rowRole,
                        target_var: opt.target_var || null,
                        line: mappedLine,
                        round: opt.round !== undefined && opt.round !== '' ? Number(opt.round) : (isStat ? 2 : null),
                        logic: opt.logic || '',
                        value: opt.value !== undefined && opt.value !== null && String(opt.value).trim() !== '' && !isNaN(Number(opt.value)) ? Number(opt.value) : null
                    };
                });
            }

            // banner 값: 항상 배열로
            const bannerArr = stub.x_info
                ? (Array.isArray(stub.x_info) ? stub.x_info : [stub.x_info])
                : [];

            // 1) dp_request_recoded_items: 원본 base variable 기반인 경우만
            // 주의: rank child는 dp_request_recoded_items에 들어가면 안 됩니다 (백엔드 에러 원인).
            // 안전장치로 _(숫자) 패턴인 경우 제외.
            const isRankChildFormat = /_\([0-9+]+\)$/.test(effRecodedId);
            if (effSourceId && effSourceId !== effRecodedId && !isRankChildFormat) {
                stubItems.push({
                    source_var_id: effSourceId,
                    recoded_var_id: effRecodedId,
                    scale_preset_id: stub.scale_preset_name || null,
                    rank_preset_id: stub.rank_preset_name || null,
                    group_preset_id: stub.group_preset_name || null,
                    stat_preset_id: stub.stat_summary || null,
                    filter_expression: filterExp || null,
                    banner: bannerArr,
                    sort_mode: stub.sort_mode || 'none'
                });
            }

            let finalRankOutputs = undefined;
            if (isRankParent && stub.rank_outputs && Array.isArray(stub.rank_outputs)) {
                const outputById = new Map();
                stub.rank_outputs.forEach(out => {
                    const sRank = out.start_rank || 1;
                    const eRank = out.end_rank || 1;
                    let rankIdStr = `${sRank}`;
                    if (sRank !== eRank) {
                        const start = Math.min(sRank, eRank);
                        const end = Math.max(sRank, eRank);
                        rankIdStr = Array.from({ length: end - start + 1 }, (_, i) => start + i).join('+');
                    }
                    const childId = `${effRecodedId}_(${rankIdStr})`;
                    if (!outputById.has(childId)) {
                        outputById.set(childId, {
                            ...out,
                            rank_output: rankIdStr,
                            recoded_var_id: childId,
                            parent_stub_id: effRecodedId,
                            source_var_id: effSourceId
                        });
                    }
                });
                finalRankOutputs = Array.from(outputById.values());
            }

            // 2) variables: 상세 속성 전체 (info는 base 포함 전체)
            variablesMap[effRecodedId] = {
                id: effRecodedId,
                source_var_id: effSourceId,
                label: stub.var_label || '',
                type: stub.var_type || 'single',
                stub_kind: isCustomLike ? 'custom' : 'source_based',
                variable_role: 'stub',
                managed_by: 'recoded_editor',
                metadata_status: 'explicit',
                scale_preset_id: stub.scale_preset_name || null,
                rank_preset_id: stub.rank_preset_name || null,
                group_preset_id: stub.group_preset_name || null,
                stat_preset_id: stub.stat_summary || null,
                condition: filterExp || null,
                banner: bannerArr,
                info: infoArray ? infoArray.filter(opt => !isRankParent || opt.type !== 'rank') : undefined,
                ...(finalRankOutputs ? { rank_outputs: finalRankOutputs } : {})
            };
        }

        // 3. 삭제될 ID 추출 (원본에 있었지만 현재는 없는 recoded_var_id)
        const currentRecodedIds = [];
        Object.keys(variablesMap).forEach(k => currentRecodedIds.push(k));
        summaryFolders.forEach(s => currentRecodedIds.push(s.stub_id));
        const deletedIds = originalRecodedIds.filter(id => !currentRecodedIds.includes(id));

        // 삭제된 스터브들의 source_var_id를 hidden_stub_base_var_ids로 수집
        const hiddenStubBaseVarIds = [];
        deletedIds.forEach(delId => {
            const origItem = originalStubs.find(s => s.recoded_var_id === delId);
            if (origItem && origItem.source_var_id) {
                hiddenStubBaseVarIds.push(origItem.source_var_id);
            }
        });

        // 4. 현재 순서 배열 (order_ids)
        // 자식 rank item도 순서에 명시적으로 추가해야 합니다.
        const orderIds = [];
        for (const s of stubs) {
            if (s.recoded_var_id) {
                const effRecodedId = s.recoded_var_id.trim();
                orderIds.push(effRecodedId);

                const isRankParent = s.var_type === 'rank' || s.var_type === 'multi' || s.var_type === 'minrank' || s.var_type === 'maxrank';
                if (isRankParent && s.rank_outputs && Array.isArray(s.rank_outputs)) {
                    s.rank_outputs.forEach(out => {
                        const sRank = out.start_rank || 1;
                        const eRank = out.end_rank || 1;
                        let rankIdStr = `${sRank}`;
                        if (sRank !== eRank) {
                            const start = Math.min(sRank, eRank);
                            const end = Math.max(sRank, eRank);
                            rankIdStr = Array.from({ length: end - start + 1 }, (_, i) => start + i).join('+');
                        }
                        const childId = `${effRecodedId}_(${rankIdStr})`;
                        orderIds.push(childId);
                    });
                }
            }
        }

        const requestData = {
            pageid: pageId,
            user: user,
            dp_request_recoded_items: stubItems,
            summary_folders: summaryFolders,
            order_ids: orderIds,
            delete_ids: deletedIds,
            hidden_stub_base_var_ids: hiddenStubBaseVarIds,
            variables: variablesMap,
            force_reapply_preset_ids: forceReapplyIds,
            auto_recode: true,
            auto_generate_summary: false,
            reset_to_default: false
        };

        let isSuccess = false;
        loadingSpinner.show();
        try {
            const result = await saveRecodedOverview.mutateAsync(requestData);
            if (result?.success === "777") {
                if (onUnsavedChange) onUnsavedChange(false);

                // 가이드라인 13번: 임시 스터브 ID 교체
                const payload = result?.resultjson || result?.data?.resultjson || {};
                if (payload.created_custom_stubs && Array.isArray(payload.created_custom_stubs)) {
                    const idMap = {};
                    payload.created_custom_stubs.forEach(mapping => {
                        if (mapping.client_id && mapping.recoded_var_id) {
                            idMap[mapping.client_id] = mapping.recoded_var_id;
                        }
                    });

                    setStubs(prevStubs => prevStubs.map(stub => {
                        if (idMap[stub.recoded_var_id]) {
                            return {
                                ...stub,
                                _row_id: idMap[stub.recoded_var_id],
                                recoded_var_id: idMap[stub.recoded_var_id],
                                _is_custom: false
                            };
                        }
                        return stub;
                    }));

                    if (selectedStubForModal && idMap[selectedStubForModal]) {
                        setSelectedStubForModal(idMap[selectedStubForModal]);
                    }
                }

                let idsToReapply = Array.from(modifiedPresetIds);
                if (payload.created_custom_stubs && Array.isArray(payload.created_custom_stubs)) {
                    const idMap = {};
                    payload.created_custom_stubs.forEach(mapping => {
                        if (mapping.client_id && mapping.recoded_var_id) {
                            idMap[mapping.client_id] = mapping.recoded_var_id;
                        }
                    });
                    idsToReapply = idsToReapply.map(id => idMap[id] || id);
                }

                if (idsToReapply.length > 0) {
                    const reapplyResult = await reapplyPreset.mutateAsync({
                        pageid: pageId,
                        user: user,
                        recoded_var_ids: idsToReapply
                    });
                    if (reapplyResult?.success === "777") {
                        setModifiedPresetIds(new Set());
                    } else {
                        console.error('Failed to reapply presets:', reapplyResult);
                    }
                }

                await fetchOverview(); // 저장 후 목록 최신화
                isSuccess = true;
            } else {
                modal.showAlert('오류', '저장 처리에 실패했습니다.');
                return false;
            }
        } catch (err) {
            console.error(err);
            modal.showAlert('오류', '저장 중 서버 오류가 발생했습니다.');
            return false;
        } finally {
            loadingSpinner.hide();
        }

        if (isSuccess) {
            setTimeout(() => {
                modal.showAlert('알림', '스터브가 저장되었습니다.');
            }, 100);
            return true;
        }
    };





    return (
        <TableStepContext.Provider value={{ stubs, setStubs, onUnsavedChange }}>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
                <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
                    <div style={{ padding: '8px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '13px', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div>
                                전체 <span style={{ color: '#2563eb', fontWeight: 600 }}>{filteredStubs.length}</span>건
                            </div>
                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500, userSelect: 'none' }}>
                                💡 입력창 중 하나를 선택해 엑셀 열을 붙여넣기(Ctrl+V)하면 아래로 자동 채워집니다.
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                                라벨 일괄 편집
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
                    </div>
                    <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                            <KendoGridV2
                                ref={gridRef}
                                className="dp-compact-stub-grid"
                                data={filteredStubs}
                                rowHeight={24}
                                onDataChange={handleDataChange}
                                style={{ height: '100%', width: '100%' }}
                                scrollable="virtual"
                                dataItemKey="_row_id"
                                addable={true}
                                copyable={true}
                                deletable={true}
                                reorderable={!searchTerm}
                                deletePos="start"
                                onAdd={handleRowAdd}
                                onCopy={handleRowCopy}
                                onDelete={handleRowDelete}
                            >

                                <Column field="recoded_var_id" title="변수" width="115px" headerClassName="k-text-center"
                                    cell={(p) => <TextEditCell dataItem={p.dataItem} field="recoded_var_id" onUpdate={handleCellUpdate} placeholder="" />}
                                />
                                <Column field="var_label" title="라벨" width="200px" headerClassName="k-text-center"
                                    cell={(p) => <TextEditCell dataItem={p.dataItem} field="var_label" onUpdate={handleCellUpdate} />}
                                />
                                <Column title="상세 설정" width="65px" headerClassName="k-text-center"
                                    cell={(p) => (
                                        <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '0 4px' }}>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedStubForModal(p.dataItem)}
                                                style={{
                                                    padding: '2px 8px',
                                                    border: '1px solid #3b82f6',
                                                    background: '#ffffff',
                                                    color: '#3b82f6',
                                                    borderRadius: '3px',
                                                    fontSize: '11px',
                                                    cursor: 'pointer',
                                                    fontWeight: 500,
                                                    whiteSpace: 'nowrap'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = '#eff6ff'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                                            >
                                                설정
                                            </button>
                                        </td>
                                    )}
                                />
                                <Column field="sort_mode" title="정렬" width="40px" headerClassName="k-text-center"
                                    cell={(p) => {
                                        const sortMode = p.dataItem.sort_mode || 'none';
                                        const isDesc = sortMode === 'n_desc';

                                        const handleToggleSort = (e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            const nextSort = isDesc ? 'none' : 'n_desc';
                                            handleCellUpdate(p.dataItem, 'sort_mode', nextSort);
                                        };

                                        return (
                                            <td
                                                data-field="sort_mode"
                                                data-row-id={p.dataItem.source_var_id}
                                                onPointerDownCapture={e => handleStubPointerDownCapture(e, p.dataItem.source_var_id, 'sort_mode')}
                                                onPointerEnter={e => handleStubPointerEnter(e, p.dataItem.source_var_id, 'sort_mode')}
                                                onMouseDownCapture={preventCtrlEvent}
                                                onClickCapture={preventCtrlEvent}
                                                onMouseDown={e => e.stopPropagation()}
                                                draggable={true}
                                                onDragStart={e => { e.stopPropagation(); e.preventDefault(); }}
                                                className={getStubDragClasses(p.dataItem.source_var_id)}
                                                onClick={handleToggleSort}
                                                style={{
                                                    textAlign: 'center',
                                                    verticalAlign: 'middle',
                                                    cursor: 'pointer',
                                                    userSelect: 'none',
                                                    padding: '1px 4px'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '24px' }}>
                                                    {isDesc ? <ArrowDown size={15} color="#2563eb" strokeWidth={3} /> : ''}
                                                </div>
                                            </td>
                                        );
                                    }}
                                />
                                <Column field="var_type" title="유형" width="100px" headerClassName="k-text-center"
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
                                <Column field="stat_summary" title="통계 설정" width="150px" headerClassName="k-text-center"
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

                {/* 상세설정 팝업 렌더링 */}
                {!!selectedStubForModal && (
                    <DpRequestStubSettingModal
                        show={true}
                        onClose={() => setSelectedStubForModal(null)}
                        rowData={selectedStubForModal}
                        variables={stubs} // 임시로 전체 stubs를 넘겨줍니다. 나중에 필요에 따라 수정
                        onApply={(rules, rankOutputs, sortMode) => {
                            // 그리드 내부 필드 정리 + 필수 필드 정규화
                            const STAT_TYPES = ["mean", "median", "mode", "min", "max", "var", "std", "sum", "variance", "rse"];
                            const normalizedRules = rules.map((opt, i) => {
                                const isBase = opt.type === 'base';
                                const isStat = STAT_TYPES.includes(opt.type);
                                const rowRole = isBase ? 'base' : (isStat ? 'stat' : (opt.row_role || 'option'));
                                // 그리드 내부 필드(inEdit 등) 제거, 필수 필드 보충
                                return {
                                    index: i + 1,
                                    label: opt.label || '',
                                    label2: opt.label2 || '',
                                    label3: opt.label3 || '',
                                    logic: opt.logic || '',
                                    type: opt.type || 'option',
                                    row_role: rowRole,
                                    is_internal: opt.is_internal ?? null,
                                    prefix: opt.prefix || null,
                                    postfix: opt.postfix || null,
                                    hide: opt.hide || null,
                                    round: opt.round !== undefined && opt.round !== '' ? Number(opt.round) : (isBase ? 0 : (isStat ? 2 : null)),
                                    value: opt.value !== '' && opt.value !== undefined && opt.value !== null ? opt.value : null,
                                    stat_type: opt.stat_type || null,
                                    target_var: opt.target_var || null,
                                    line: opt.line || null,
                                    color: opt.color || null,
                                };
                            });
                            // 해당 stub의 info 및 rank_outputs 업데이트
                            setStubs(prev => prev.map(s => {
                                if (s.recoded_var_id === selectedStubForModal?.recoded_var_id) {
                                    return {
                                        ...s,
                                        info: normalizedRules,
                                        sort_mode: sortMode,
                                        ...(rankOutputs ? { rank_outputs: rankOutputs } : {})
                                    };
                                }
                                return s;
                            }));
                            if (onUnsavedChange) onUnsavedChange(true);
                        }}
                    />
                )}
                <BulkEditLabelsModal
                    show={isBulkEditModalOpen}
                    currentInfo={filteredStubs}
                    onClose={() => setIsBulkEditModalOpen(false)}
                    onApply={(lines) => {
                        const updated = stubs.map(item => {
                            const idx = filteredStubs.findIndex(x => x.recoded_var_id === item.recoded_var_id);
                            if (idx !== -1 && lines[idx] !== undefined) {
                                return {
                                    ...item,
                                    var_label: lines[idx]
                                };
                            }
                            return item;
                        });
                        setStubs(updated);
                        if (onUnsavedChange) onUnsavedChange(true);
                    }}
                />
                <Toast
                    show={toast.show}
                    message={toast.message}
                    onClose={() => setToast({ ...toast, show: false })}
                />
            </div>
        </TableStepContext.Provider>
    );
});

export default DpRequestTableStep;
