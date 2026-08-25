import React, { useRef, useMemo, useCallback, useEffect, useState } from "react";
import { Button } from "@progress/kendo-react-buttons";
import { GridColumn as Column } from "@progress/kendo-react-grid";
import KendoGrid from "@/components/kendo/KendoGrid.jsx";
import ExcelColumnMenu from '@/components/common/grid/ExcelColumnMenu';
import ProListPopup from "@/services/aiOpenAnalysis/app/proList/ProListPopup";
import ProRegisterPopup from "@/services/aiOpenAnalysis/app/proList/ProRegisterPopup";
import GridHeaderBtnPrimary from "@/components/style/button/GridHeaderBtnPrimary.jsx";
import GridHeaderBtnTxt from "@/components/style/button/GridHeaderBtnTxt.jsx";
import AiDataHeader from "@/services/aiOpenAnalysis/components/AiDataHeader.jsx";
import { PERM, hasPerm, addSortProxies, GROUP_MIN_PERM, FIELD_MIN_PERM } from "./ProListUtils";
import GridDataCount from "@/components/common/grid/GridDataCount";
import "./ProList.css";
import { process } from "@progress/kendo-data-query";
import { ChevronDown, Link, Unlink, Layers, Search, X } from 'lucide-react';

const DropdownMenu = ({ label, items, isPrimary }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);
    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button
                onClick={() => setOpen(!open)}
                className={`ai-data-header-btn ${isPrimary ? 'ai-data-header-btn-primary' : 'ai-data-header-btn-secondary'}`}
                style={isPrimary ? {
                    backgroundColor: '#FFB74D',
                    borderColor: '#FFB74D',
                    color: '#fff',
                    height: '32px',
                    fontSize: '13px',
                    padding: '0 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                } : {
                    height: '32px',
                    fontSize: '13px',
                    padding: '0 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                }}
            >
                {label} <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
            {open && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    right: 0,
                    background: '#fff',
                    border: '1px solid #f1f5f9',
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                    minWidth: '160px',
                    zIndex: 100,
                    padding: '6px'
                }}>
                    {items.map((it, i) => it.divider ? (
                        <div key={i} style={{ height: '1px', background: '#f1f5f9', margin: '4px 0' }} />
                    ) : (
                        <div
                            key={i}
                            onClick={() => { setOpen(false); it.onClick(); }}
                            style={{
                                padding: '8px 12px',
                                fontSize: '13px',
                                cursor: 'pointer',
                                color: '#475569',
                                transition: 'all 0.2s ease',
                                textAlign: 'left',
                                fontWeight: '400',
                                borderRadius: '4px'
                            }}
                            onMouseOver={e => {
                                e.currentTarget.style.background = '#fff7ed';
                                e.currentTarget.style.color = '#ea580c';
                            }}
                            onMouseOut={e => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = '#475569';
                            }}
                        >
                            {it.text}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const HeaderBtnGroup = ({ buttons, disabled }) => (
    <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
        {buttons.map((b, i) => (
            <Button
                key={i}
                className={b.className ?? 'btnS'}
                onClick={(e) => {
                    e.stopPropagation();
                    if (!disabled && b.onClick) b.onClick(e);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                    opacity: disabled ? 0.5 : 1,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    pointerEvents: disabled ? 'none' : 'auto'
                }}
            >
                {b.text}
            </Button>
        ))}
    </div>
);

const HeaderLabeledBtnGroup = ({ label, buttons, disabled }) => (
    <div
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginBottom: '5px' }}
    >
        <span style={{ fontWeight: 500, fontSize: '12px' }}>{label}</span>
        <HeaderBtnGroup buttons={buttons} disabled={disabled} />
    </div>
);

const WrapCellComponent = (cellProps) => {
    const isQuestionFin = cellProps.field === 'question_fin';
    const style = isQuestionFin ? { padding: '0 10px' } : undefined;
    return <td className="cell-wrap" style={style}>{cellProps.dataItem?.[cellProps.field]}</td>;
};

const BlankWhenMergeCell = (cellProps) => {
    const ctx = React.useContext(ProListGridContext);
    const row = cellProps.dataItem;
    return <td>{ctx.isMergeRow(row) ? '' : row?.[cellProps.field]}</td>;
};

const DefaultTextCell = (cellProps) => {
    return <td title={cellProps.dataItem?.[cellProps.field]}>{cellProps.dataItem?.[cellProps.field]}</td>;
};

const WrapCellBreakAllComponent = (cellProps) => {
    return <td className="cell-wrap" style={{ wordBreak: 'break-all' }}>{cellProps.dataItem?.[cellProps.field]}</td>;
};

const norm = (s) => String(s ?? "").trim();

export const ProListGridContext = React.createContext(null);

const UseYnCell = (cellProps) => {
    const ctx = React.useContext(ProListGridContext);
    const row = cellProps.dataItem;
    const excluded = ctx.isExcluded(row);
    const locked = ctx.isLocked(row);
    const includeLabel = ctx.isMergeRow(row) ? '머지' : '분석';
    const state = excluded ? 'exclude' : (includeLabel === '머지' ? 'merge' : 'analysis');
    const label = excluded ? '제외' : includeLabel;
    const cls = `chip chip--${state} ${locked ? 'chip--disabled' : ''}`;

    return (
        <td style={{ textAlign: 'center' }} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
            <Button className={cls} disabled={locked} onClick={() => { if (!locked) ctx.toggleExcluded(row); }}>
                <span className="chip-check" aria-hidden>✓</span>
                <span className="chip-label">{label}</span>
            </Button>
        </td>
    );
};

const UseYnHeaderCell = () => {
    const ctx = React.useContext(ProListGridContext);
    return (
        <HeaderLabeledBtnGroup
            buttons={[
                { text: '분석', className: 'btnS', onClick: ctx.actions.onHeaderUseYN },
                { text: '제외', className: 'btnS btnTxt type01', onClick: ctx.actions.onHeaderExclude },
            ]}
            disabled={ctx.dataWithProxiesLength === 0}
        />
    );
};

const ExcludeCell = (cellProps) => {
    const ctx = React.useContext(ProListGridContext);
    const row = cellProps.dataItem;
    const { merge_qnum } = row;
    const excluded = ctx.isExcluded(row);
    return (
        <td style={{ textAlign: 'center' }} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
            {!excluded && !ctx.isMergeRow(row) && (
                <Button className="btnM" themeColor="primary" onClick={() => { if (!ctx.blockWhenDirty()) ctx.goOpenSetting(merge_qnum, row.project_lock); }}>
                    분석보기
                </Button>
            )}
        </td>
    );
};

const EmptyHeaderCell = () => <></>;

const LockCell = (cellProps) => {
    const ctx = React.useContext(ProListGridContext);
    const { dataItem } = cellProps;
    const locked = ctx.isLocked(dataItem);
    const excluded = ctx.isExcluded(dataItem);
    if (excluded) return <td style={{ textAlign: 'center' }}></td>;
    return (
        <td style={{ textAlign: 'center' }} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
            <div className={`lock-icon-btn ${locked ? 'locked' : ''}`} onClick={() => ctx.toggleRowLock(dataItem)} title={locked ? '잠금 해제' : '잠금'}>
                <span style={{ fontSize: 16, lineHeight: 1 }} aria-hidden="true">
                    {locked ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
                        </svg>
                    )}
                </span>
            </div>
        </td>
    );
};

const LockHeaderCell = () => {
    const ctx = React.useContext(ProListGridContext);
    return (
        <HeaderLabeledBtnGroup
            label="수정"
            buttons={[
                { text: 'X', className: 'btnS btnTxt type02', onClick: () => ctx.bulkSetLock(true) },
                { text: 'O', className: 'btnS btnType02', onClick: () => ctx.bulkSetLock(false) },
            ]}
            disabled={ctx.dataWithProxiesLength === 0}
        />
    );
};

const FilterSettingCell = (cellProps) => {
    const ctx = React.useContext(ProListGridContext);
    const row = cellProps.dataItem;
    return (
        <td style={{ textAlign: 'center' }} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
            <Button
                className="btnS"
                style={{
                    backgroundColor: '#fff',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    fontSize: '11px',
                    padding: '2px 6px',
                    height: '24px',
                    lineHeight: '1',
                    borderRadius: '4px'
                }}
                onClick={() => {
                    ctx.setPopupMode("single");
                    ctx.setPopupRow(row);
                    ctx.setPopupShow(true);
                }}
            >
                설정
            </Button>
        </td>
    );
};

const FilterSettingHeaderCell = () => {
    const ctx = React.useContext(ProListGridContext);
    return (
        <HeaderLabeledBtnGroup
            label={<React.Fragment>필터문항<br />설정</React.Fragment>}
            buttons={[{ text: '전체설정', className: 'btnS', onClick: () => { ctx.setPopupMode("all"); ctx.setPopupRow(null); ctx.setPopupShow(true); } }]}
            disabled={ctx.dataWithProxiesLength === 0}
        />
    );
};

// 체크박스 행 셀
const CheckboxCell = (cellProps) => {
    const ctx = React.useContext(ProListGridContext);
    const row = cellProps.dataItem;
    const isChecked = !!ctx.selectedRowIds.has(row.id);
    return (
        <td style={{ textAlign: 'center' }} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
            <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => ctx.toggleRowSelect(row.id, e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#ea580c' }}
            />
        </td>
    );
};

// 체크박스 전체선택 헤더 셀
const CheckboxHeaderCell = () => {
    const ctx = React.useContext(ProListGridContext);
    return (
        <div style={{ textAlign: 'center', padding: '4px 0' }} onClick={(e) => e.stopPropagation()}>
            <input
                type="checkbox"
                checked={ctx.isAllSelected}
                onChange={(e) => ctx.toggleAllSelect(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#ea580c' }}
                title="전체 선택 / 해제"
            />
        </div>
    );
};

// 문항통합 뱃지/표시 셀
const MergeDisplayCell = (cellProps) => {
    const ctx = React.useContext(ProListGridContext);
    const row = cellProps.dataItem;
    if (!row) return <td></td>;

    const original = ctx.norm(row?.merge_qnum ?? "");
    const cur = ctx.getMergeVal(row);
    const tdRef = React.useRef(null);
    const locked = ctx.isLocked(row);
    const excluded = ctx.isExcluded(row);
    const editable = ctx.hasManagePerm;
    const disabled = locked || excluded || !editable;
    const origQnum = ctx.norm(row.qnum_text || row.qnum);
    const baseline = ctx.mergeSavedBaseline.get(row.id) ?? original;
    const isChanged = !disabled && ctx.norm(cur) !== baseline;
    const isMerged = ctx.isMergeRow(row) || (cur && cur !== origQnum);

    // 1. If row is master of current linking session:
    if (ctx.linkingMasterRow && ctx.linkingMasterRow.id === row.id) {
        const masterQnum = ctx.norm(ctx.getMergeVal(ctx.linkingMasterRow) || ctx.linkingMasterRow.qnum_text || ctx.linkingMasterRow.qnum);
        return (
            <td style={{ textAlign: 'center', padding: '4px' }} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                <span
                    onClick={() => ctx.setLinkingMasterRow(null)}
                    style={{
                        backgroundColor: '#ffedd5',
                        border: '1px solid #f97316',
                        color: '#c2410c',
                        fontSize: '12px',
                        fontWeight: '600',
                        padding: '3px 12px',
                        borderRadius: '12px',
                        display: 'inline-flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        whiteSpace: 'nowrap',
                        gap: '4px',
                        height: '26px',
                        boxSizing: 'border-box',
                        cursor: 'pointer'
                    }}
                    title="클릭하여 대표 선택 해제"
                >
                    {masterQnum} (대표)
                </span>
            </td>
        );
    }

    // 2. If row is merged with current active linking master:
    if (ctx.linkingMasterRow) {
        const masterQnum = ctx.norm(ctx.getMergeVal(ctx.linkingMasterRow) || ctx.linkingMasterRow.qnum_text || ctx.linkingMasterRow.qnum);
        const curQnum = ctx.norm(ctx.getMergeVal(row));
        if (curQnum === masterQnum && masterQnum !== "") {
            return (
                <td style={{ textAlign: 'center', padding: '4px' }} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                    <button
                        disabled={disabled}
                        onClick={() => {
                            if (!disabled) {
                                ctx.unmergeRow(row);
                            }
                        }}
                        style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #f97316',
                            color: '#ea580c',
                            fontSize: '12px',
                            fontWeight: '600',
                            padding: '3px 12px',
                            borderRadius: '12px',
                            display: 'inline-flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            whiteSpace: 'nowrap',
                            gap: '4px',
                            height: '26px',
                            boxSizing: 'border-box',
                            cursor: 'pointer'
                        }}
                        title={`클릭하여 ${masterQnum} 통합 해제`}
                    >
                        <Link size={12} style={{ color: '#ea580c', flexShrink: 0 }} />
                        <span>{masterQnum}로 통합</span>
                    </button>
                </td>
            );
        }
    }

    // 3. Normal or existing merged row (preserves previously merged groups like C1-1 master or child)
    const isMasterOfGroup = ctx.dupGroups?.firstOfGroup?.has(row.id);
    const isMergedChild = ctx.dupGroups?.restOfGroup?.has(row.id);

    if (isMasterOfGroup) {
        const displayQnum = cur || origQnum;
        return (
            <td ref={tdRef} className={isChanged ? 'cell-merge-diff' : ''} style={{ textAlign: 'center', padding: '4px' }} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                <button
                    disabled={disabled}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!disabled && ctx.openMasterEditPopover) {
                            ctx.openMasterEditPopover(row, e.currentTarget);
                        }
                    }}
                    style={{
                        backgroundColor: '#ffedd5',
                        border: '1px solid #f97316',
                        color: '#c2410c',
                        fontSize: '12px',
                        fontWeight: '600',
                        padding: '3px 10px 3px 12px',
                        borderRadius: '12px',
                        display: 'inline-flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        whiteSpace: 'nowrap',
                        gap: '4px',
                        height: '26px',
                        boxSizing: 'border-box',
                        cursor: disabled ? 'not-allowed' : 'pointer'
                    }}
                    title="클릭하여 통합 문항번호 커스텀 수정 또는 그룹 해제"
                >
                    <span>{displayQnum} (대표)</span>
                    <span style={{ fontSize: '10px', opacity: 0.8 }}>✏️</span>
                </button>
            </td>
        );
    }

    if (isMergedChild || isMerged) {
        return (
            <td ref={tdRef} className={isChanged ? 'cell-merge-diff' : ''} style={{ textAlign: 'center', padding: '4px' }} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                <button
                    disabled={disabled}
                    onClick={() => { if (!disabled) ctx.unmergeRow(row); }}
                    style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #f97316',
                        color: '#ea580c',
                        fontSize: '12px',
                        fontWeight: '600',
                        padding: '3px 12px',
                        borderRadius: '12px',
                        display: 'inline-flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        whiteSpace: 'nowrap',
                        gap: '4px',
                        height: '26px',
                        boxSizing: 'border-box',
                        cursor: disabled ? 'not-allowed' : 'pointer'
                    }}
                    title={`클릭 시 ${cur || origQnum} 통합 해제 (풀기)`}
                >
                    <Link size={12} style={{ color: '#ea580c', flexShrink: 0 }} />
                    <span>{cur || origQnum}로 통합</span>
                </button>
            </td>
        );
    }

    // 4. Unmerged row while linkingMasterRow is active: show "묶기" button for master
    if (ctx.linkingMasterRow) {
        return (
            <td style={{ textAlign: 'center', padding: '4px' }} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                <button
                    disabled={disabled}
                    onClick={() => ctx.applyGroupToRow(row, ctx.linkingMasterRow)}
                    style={{
                        backgroundColor: '#ffffff',
                        border: '1px dashed #cbd5e1',
                        color: '#64748b',
                        fontSize: '12px',
                        fontWeight: '500',
                        padding: '3px 12px',
                        borderRadius: '12px',
                        display: 'inline-flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        whiteSpace: 'nowrap',
                        gap: '4px',
                        height: '26px',
                        boxSizing: 'border-box',
                        cursor: 'pointer'
                    }}
                >
                    <Link size={12} style={{ color: '#64748b', flexShrink: 0 }} />
                    <span>묶기</span>
                </button>
            </td>
        );
    }

    // Normal mode: Merged row
    if (isMerged) {
        return (
            <td ref={tdRef} className={isChanged ? 'cell-merge-diff' : ''} style={{ textAlign: 'center', padding: '4px' }} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center', whiteSpace: 'nowrap' }}>
                    <span style={{
                        backgroundColor: '#fff7ed',
                        border: '1px solid #ffedd5',
                        color: '#ea580c',
                        fontSize: '12px',
                        fontWeight: '600',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        whiteSpace: 'nowrap'
                    }}>
                        {cur || origQnum}
                    </span>
                    <button
                        disabled={disabled}
                        onClick={() => ctx.unmergeRow(row)}
                        style={{
                            backgroundColor: '#ffffff',
                            border: '1px dashed #cbd5e1',
                            color: '#475569',
                            fontSize: '11px',
                            fontWeight: '500',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            display: 'inline-flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            whiteSpace: 'nowrap',
                            height: '24px',
                            boxSizing: 'border-box',
                            cursor: 'pointer'
                        }}
                    >
                        ↶ 풀기
                    </button>
                </div>
            </td>
        );
    }

    // Normal mode: Unmerged row -> show "묶기" button
    return (
        <td ref={tdRef} className={isChanged ? 'cell-merge-diff' : ''} style={{ textAlign: 'center', padding: '4px' }} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
            <button
                disabled={disabled}
                onClick={() => ctx.startGroupingWithMaster(row)}
                style={{
                    backgroundColor: '#ffffff',
                    border: '1px dashed #cbd5e1',
                    color: '#64748b',
                    fontWeight: '500',
                    fontSize: '12px',
                    padding: '3px 12px',
                    borderRadius: '12px',
                    display: 'inline-flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    whiteSpace: 'nowrap',
                    gap: '4px',
                    height: '26px',
                    boxSizing: 'border-box',
                    cursor: 'pointer'
                }}
            >
                <Link size={12} style={{ color: '#64748b', flexShrink: 0 }} />
                <span>묶기</span>
            </button>
        </td>
    );
};

const ProList2GridRenderer = (props) => {
    const [showRegisterPopup, setShowRegisterPopup] = useState(false);
    const [gridSkip, setGridSkip] = useState(0);

    const {
        // GridData props
        selectedState, setSelectedState, idGetter, dataState, dataItemKey, selectedField, handleSearch,
        // ProList props
        auth, projectnum, userPerm, modal, navigate,
        editMutation,
        scrollTopRef,
        mergeEditsById, setMergeEditsById,
        mergeSavedBaseline, setMergeSavedBaseline,
        locksById, setLocksById,
        excludedById, setExcludedById,
        columns, setColumns,
        columnsForPerm,
        filter, setFilter,
        sort, setSort,
        popupShow, setPopupShow,
        popupMode, setPopupMode,
        popupRow, setPopupRow,
        goOpenSetting,
        handleExportExcelDev,
        handleExportExcelDP,
        handleImportExcel,
        handleExportRaw,
        fileInputRef,
        userAuth
    } = props;

    // 선택된 행 ID 목록 관리 (체크박스 다중 선택)
    const [selectedRowIds, setSelectedRowIds] = useState(new Set());
    const [linkingMasterRow, setLinkingMasterRow] = useState(null);

    const toggleRowSelect = useCallback((id, checked) => {
        setSelectedRowIds(prev => {
            const next = new Set(prev);
            if (checked) next.add(id);
            else next.delete(id);
            return next;
        });
    }, []);

    const toggleAllSelect = useCallback((checked) => {
        const rows = dataState?.data || [];
        if (checked) {
            setSelectedRowIds(new Set(rows.map(r => r.id)));
        } else {
            setSelectedRowIds(new Set());
        }
    }, [dataState?.data]);

    const isAllSelected = useMemo(() => {
        const rows = dataState?.data || [];
        if (!rows.length) return false;
        return rows.every(r => selectedRowIds.has(r.id));
    }, [dataState?.data, selectedRowIds]);

    const pendingFlushRef = useRef(false);
    const [searchText, setSearchText] = useState("");

    const getMergeVal = useCallback((row) =>
        mergeEditsById.has(row?.id) ? mergeEditsById.get(row?.id) : (row?.merge_qnum ?? ""), [mergeEditsById]);
    const setMergeVal = useCallback((row, v) =>
        setMergeEditsById(m => { const n = new Map(m); n.set(row?.id, v); return n; }), []);

    const { dataWithProxies, proxyField } = useMemo(
        () => addSortProxies(dataState?.data || []),
        [dataState?.data]
    );

    const searchFilteredData = useMemo(() => {
        if (!searchText.trim()) return dataWithProxies;
        const q = norm(searchText).toLowerCase();
        return dataWithProxies.filter(r => {
            const qnum = norm(r.qnum).toLowerCase();
            const qnumText = norm(r.qnum_text).toLowerCase();
            const questionFin = norm(r.question_fin).toLowerCase();
            const mergeQnum = norm(getMergeVal(r)).toLowerCase();
            const model = norm(r.model).toLowerCase();
            return qnum.includes(q) || qnumText.includes(q) || questionFin.includes(q) || mergeQnum.includes(q) || model.includes(q);
        });
    }, [dataWithProxies, searchText, getMergeVal, norm]);

    const mappedSort = useMemo(
        () => (sort || []).map(s => ({ ...s, field: proxyField[s.field] ?? s.field })),
        [sort, proxyField]
    );

    const processedData = useMemo(
        () => process(searchFilteredData, { filter }),
        [searchFilteredData, filter]
    );
    const filteredCount = processedData.total;

    const getMergeChanges = useCallback(() => {
        const rows = dataState?.data ?? [];
        const changed = {};
        rows.forEach(r => {
            if (!!locksById.get(r.id)) return;
            const base = norm(mergeSavedBaseline.get(r.id) ?? "");
            const cur = norm(getMergeVal(r));
            if (cur !== base) changed[r.id] = cur;
        });
        return changed;
    }, [dataState?.data, locksById, mergeSavedBaseline, getMergeVal]);

    const blockWhenDirty = useCallback(() => {
        const changed = getMergeChanges();
        const hasChanged = Object.keys(changed).length > 0;
        const gridEl = document.getElementById('grid_01');
        const hasDirtyCell = !!(gridEl && gridEl.querySelector('.cell-merge-diff'));
        if (hasChanged || hasDirtyCell) {
            modal.showErrorAlert("알림", "문항통합 입력에 저장되지 않은 내용이 있습니다.\n[문항통합저장]을 먼저 눌러 저장해 주세요.");
            return true;
        }
        return false;
    }, [getMergeChanges, modal]);

    const mergedCountInGroup = useMemo(() => {
        if (!linkingMasterRow) return 0;
        const rows = dataState?.data || [];
        const masterQnum = norm(getMergeVal(linkingMasterRow) || linkingMasterRow.qnum_text || linkingMasterRow.qnum);
        return rows.filter(r => norm(getMergeVal(r)) === masterQnum).length;
    }, [linkingMasterRow, dataState?.data, getMergeVal]);

    const startGroupingWithMaster = useCallback((row) => {
        setLinkingMasterRow(row);
    }, []);

    const applyGroupToRow = useCallback((targetRow, masterRow) => {
        const masterQnum = norm(getMergeVal(masterRow) || masterRow.qnum_text || masterRow.qnum);
        setMergeEditsById(prev => {
            const next = new Map(prev);
            next.set(targetRow.id, masterQnum);
            next.set(masterRow.id, masterQnum);
            return next;
        });
    }, [getMergeVal, setMergeEditsById]);

    const unmergeRow = useCallback((row) => {
        const origQnum = norm(row.qnum_text || row.qnum);
        setMergeEditsById(prev => {
            const next = new Map(prev);
            next.set(row.id, origQnum);
            return next;
        });
    }, [setMergeEditsById]);

    const dupGroups = useMemo(() => {
        const rows = dataState?.data ?? [];
        const map = new Map();
        rows.forEach(r => {
            const key = norm(getMergeVal(r));
            if (!key) return;
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(r);
        });
        const firstOfGroup = new Set();
        const restOfGroup = new Set();
        for (const [key, arr] of map) {
            if (arr.length >= 2) {
                // Find true master row: 1. qnum_text matches key, 2. useYN === '분석', 3. fallback arr[0]
                let master = arr.find(r => norm(r.qnum_text || r.qnum) === key);
                if (!master) {
                    master = arr.find(r => String(r?.useYN ?? '').trim() === '분석');
                }
                if (!master) {
                    master = arr[0];
                }
                firstOfGroup.add(master.id);
                for (const r of arr) {
                    if (r.id !== master.id) restOfGroup.add(r.id);
                }
            }
        }
        return { firstOfGroup, restOfGroup, map };
    }, [dataState?.data, mergeEditsById, getMergeVal, norm]);

    const isMergeRow = useCallback((row) => dupGroups.restOfGroup.has(row?.id), [dupGroups.restOfGroup]);

    const selectedRowKeys = useMemo(() => {
        if (!selectedState) return [];
        return Object.keys(selectedState).filter(k => !!selectedState[k]);
    }, [selectedState]);

    const selectedCount = selectedRowKeys.length;

    // ✨ [선택문항 통합] 실행 함수
    const handleMergeSelected = useCallback(() => {
        const rows = dataState?.data ?? [];
        const keysSet = new Set(Object.keys(selectedState || {}).filter(k => !!selectedState[k]));
        const selectedRows = rows.filter(r => keysSet.has(String(r.no)) || keysSet.has(String(r.id)) || (idGetter && keysSet.has(String(idGetter(r)))));
        if (selectedRows.length < 2) {
            modal.showErrorAlert("알림", "통합할 문항을 2개 이상 체크박스로 선택해 주세요.");
            return;
        }

        // 선택된 문항 중 첫 번째 문항의 merge_qnum (없으면 qnum_text)을 대표 값으로 사용
        const targetQnum = norm(getMergeVal(selectedRows[0]) || selectedRows[0].qnum_text || selectedRows[0].qnum);

        setMergeEditsById(prev => {
            const next = new Map(prev);
            selectedRows.forEach(r => {
                next.set(r.id, targetQnum);
            });
            return next;
        });

        modal.showAlert("성공", `선택된 ${selectedRows.length}개 문항이 [${targetQnum}]으로 통합 설정되었습니다.\n상단의 [문항통합저장] 버튼을 눌러 확정해 주세요.`);
    }, [dataState?.data, selectedState, getMergeVal, idGetter, modal, setMergeEditsById]);

    // ✨ [선택문항 통합해제] 실행 함수
    const handleUnmergeSelected = useCallback(() => {
        const rows = dataState?.data ?? [];
        const keysSet = new Set(Object.keys(selectedState || {}).filter(k => !!selectedState[k]));
        const selectedRows = rows.filter(r => keysSet.has(String(r.no)) || keysSet.has(String(r.id)) || (idGetter && keysSet.has(String(idGetter(r)))));
        if (selectedRows.length === 0) {
            modal.showErrorAlert("알림", "통합해제할 문항을 체크박스로 선택해 주세요.");
            return;
        }

        setMergeEditsById(prev => {
            const next = new Map(prev);
            selectedRows.forEach(r => {
                // 원래 문항번호(qnum_text 또는 qnum)로 복원
                const origQnum = norm(r.qnum_text || r.qnum);
                next.set(r.id, origQnum);
            });
            return next;
        });

        modal.showAlert("성공", `선택된 ${selectedRows.length}개 문항의 통합 설정이 해제되었습니다.\n상단의 [문항통합저장] 버튼을 눌러 확정해 주세요.`);
    }, [dataState?.data, selectedState, idGetter, modal, setMergeEditsById]);

    const sendMergeAll = async () => {
        const beforeEdits = new Map(mergeEditsById);
        rememberScroll();
        const rows = dataState?.data ?? [];
        const changesObj = getMergeChanges();
        const changedIds = new Set(Object.keys(changesObj).map(n => Number(n)));

        if (changedIds.size === 0) {
            modal.showErrorAlert("알림", "변경된 항목이 없습니다.");
            return;
        }

        const idToNo = new Map(rows.map(r => [String(r.id), r.no]));
        const blankIds = [...changedIds].filter((qid) => norm(changesObj[qid]) === "");
        if (blankIds.length > 0) {
            const blankNos = blankIds.map((qid) => idToNo.get(String(qid))).filter(Boolean);
            modal.showErrorAlert("알림", `[행: ${blankNos.join(", ")}] 분석을 위해 '문항통합'란을 입력해 주세요.`);
            setMergeEditsById(beforeEdits);
            return;
        }

        const buildGroups = (items, getter) => {
            const m = new Map();
            items.forEach(r => {
                const key = norm(getter(r));
                if (!key) return;
                if (!m.has(key)) m.set(key, []);
                m.get(key).push(r);
            });
            return m;
        };
        const serverGroups = buildGroups(rows, r => r.merge_qnum);
        const uiGroups = buildGroups(rows, r => getMergeVal(r));

        const toCall = new Map();

        for (const id of changedIds) {
            const r = rows.find(x => Number(x.id) === id);
            if (!r) continue;
            if (String(r?.useYN ?? "").trim() === "제외") continue;
            const key = norm(getMergeVal(r));
            const g = uiGroups.get(key) || [];
            const target = (g.length >= 2 && g[0]?.id !== r.id) ? "머지" : "분석";
            toCall.set(r.id, target);
        }

        const affectedIds = new Set();
        for (const id of changedIds) {
            const r = rows.find(x => Number(x.id) === id);
            if (!r) continue;
            const oldKey = norm(r.merge_qnum);
            const newKey = norm(getMergeVal(r));
            (serverGroups.get(oldKey) || []).forEach(x => affectedIds.add(Number(x.id)));
            (uiGroups.get(newKey) || []).forEach(x => affectedIds.add(Number(x.id)));
        }

        for (const r of rows) {
            if (!affectedIds.has(Number(r.id))) continue;
            if (String(r?.useYN ?? "").trim() === "제외") continue;
            if (isLocked(r)) continue;

            const key = norm(getMergeVal(r));
            const g = uiGroups.get(key) || [];
            const target = (g.length >= 2 && g[0]?.id !== r.id) ? "머지" : "분석";

            if (normalizeUseYN(r) !== target) {
                toCall.set(r.id, target);
            }
        }

        try {
            const payload = {
                user: auth?.user?.userId || "",
                projectnum,
                gb: "allmerge",
                val: changesObj,
            };
            const res = await editMutation.mutateAsync(payload);
            if (String(res?.success) !== '777') throw new Error("merge 저장 실패");
            pendingFlushRef.current = true;
            setLinkingMasterRow(null);
            setMergeSavedBaseline(new Map(
                rows.map(r => [r.id, getMergeVal(r)])
            ));
            setMergeEditsById(new Map());
            requestAnimationFrame(() => {
                const grid = document.getElementById("grid_01");
                if (grid) {
                    grid.querySelectorAll(".cell-merge-diff").forEach(el => {
                        el.classList.remove("cell-merge-diff");
                    });
                }
            });
            for (const r of rows) {
                if (!affectedIds.has(Number(r.id))) continue;
                if (String(r?.useYN ?? "").trim() === "제외") continue;
                if (isLocked(r)) continue;
                await sendAnalysis({ scope: "row", id: r.id, excluded: false, refresh: false });
            }

            setSelectedRowIds(new Set()); // 선택 초기화
            handleSearch?.();
            pendingFlushRef.current = true;
        } catch (e) {
            console.error(e);
            modal.showErrorAlert("에러", "저장 중 오류가 발생했습니다.");
        }
    };

    const isExcluded = useCallback((row) => !!excludedById.get(row?.id), [excludedById]);
    const setExcluded = (row, excluded) =>
        setExcludedById(m => { const n = new Map(m); n.set(row.id, excluded); return n; });

    const sendAnalysis = async ({ scope, id, excluded, refresh = true }) => {
        const payload = {
            user: auth?.user?.userId || "",
            projectnum,
            gb: scope === "row" ? "analysis" : "allanalysis",
            columnname: "useyn",
            val: excluded ? "제외" : "분석",
            ...(scope === "row" ? { qid: id } : {}),
        };
        rememberScroll();
        const res = await editMutation.mutateAsync(payload);
        if (String(res?.success) !== '777') {
            modal.showErrorAlert("에러", "오류가 발생했습니다.");
        }
    };

    const guard = (need, fn) => (...args) => {
        if (!hasPerm(userPerm, need)) return;
        return fn?.(...args);
    };

    const toggleExcluded = guard(PERM.WRITE, async (row) => {
        if (blockWhenDirty()) return;
        const prev = isExcluded(row);
        setExcluded(row, !prev);
        try {
            await sendAnalysis({ scope: "row", excluded: !prev, id: row?.id });
        } catch (e) {
            setExcluded(row, prev);
            console.error(e);
        }
    });

    // 전체 토글
    const bulkSetExcluded = async (excluded) => {
        const rows = dataState?.data ?? [];
        const prev = new Map(excludedById);

        // 머지 행은 기존 상태 유지
        const next = new Map(
            rows.map((r) => [r?.id, isMergeRow(r) ? isExcluded(r) : excluded])
        );
        setExcludedById(next);

        try {
            await sendAnalysis({ scope: 'all', excluded });
        } catch (e) {
            setExcludedById(prev);
            console.error(e);
        }
    };

    const normalizeUseYN = (row) => {
        const u = String(row?.useYN ?? '').trim();
        if (u === '제외') return '제외';
        if (u === '머지') return '머지';
        return '분석';
    };

    const isLocked = (row) => !!locksById.get(row?.id);
    const setRowLocked = (row, locked) =>
        setLocksById((m) => {
            const next = new Map(m);
            next.set(row?.id, locked);
            return next;
        });

    const rememberScroll = () => {
        const grid = document.querySelector("#grid_01 .k-grid-content");
        if (grid) {
            scrollTopRef.current = grid.scrollTop;
        }
    };

    useEffect(() => {
        if (!dataState?.data?.length) return;
        const saved = scrollTopRef.current;
        const timer = setTimeout(() => {
            const grid = document.querySelector("#grid_01 .k-grid-content");
            if (grid) {
                grid.scrollTop = saved;
            }
        }, 30);
        return () => clearTimeout(timer);
    }, [dataState?.data]);

    const sendLock = async (gbVal, lockVal, id) => {
        const payload = {
            user: auth?.user?.userId || "",
            projectnum,
            gb: gbVal,
            columnname: "project_lock",
            val: lockVal,
            ...(gbVal === "rowEdit" ? { qid: id } : {}),
        };
        rememberScroll();
        const res = await editMutation.mutateAsync(payload);
        if (String(res?.success) !== '777') {
            modal.showErrorAlert("에러", "오류가 발생했습니다.");
        }
    };

    const lockApi = {
        lockOne: (id) => sendLock("rowEdit", "수정불가", id),
        unlockOne: (id) => sendLock("rowEdit", "수정", id),
        lockAll: () => sendLock("allEdit", "수정불가"),
        unlockAll: () => sendLock("allEdit", "수정"),
    };

    const toggleRowLock = guard(PERM.MANAGE, async (row) => {
        if (blockWhenDirty()) return;
        if (isExcluded(row)) return;
        const prev = isLocked(row);
        setRowLocked(row, !prev);
        try {
            await (prev ? lockApi.unlockOne(row?.id) : lockApi.lockOne(row?.id));
        } catch (e) {
            setRowLocked(row, prev);
            console.error(e);
        }
    });

    const bulkSetLock = async (locked) => {
        if (blockWhenDirty()) return;
        const ids = (dataState?.data ?? []).map((r) => r.id);
        const prev = new Map(locksById);
        setLocksById(new Map(ids.map((id) => [id, locked])));
        rememberScroll();
        try {
            await (locked ? lockApi.lockAll() : lockApi.unlockAll());
        } catch (e) {
            setLocksById(prev);
            console.error(e);
        }
    };

    const latestActionsRef = useRef({ sendMergeAll, bulkSetExcluded, bulkSetLock, blockWhenDirty, userPerm });
    latestActionsRef.current = { sendMergeAll, bulkSetExcluded, bulkSetLock, blockWhenDirty, userPerm };

    const actions = useMemo(() => ({
        onHeaderUseYN: () => { if (hasPerm(latestActionsRef.current.userPerm, PERM.WRITE) && !latestActionsRef.current.blockWhenDirty()) latestActionsRef.current.bulkSetExcluded(false); },
        onHeaderExclude: () => { if (hasPerm(latestActionsRef.current.userPerm, PERM.WRITE) && !latestActionsRef.current.blockWhenDirty()) latestActionsRef.current.bulkSetExcluded(true); },
        onHeaderMergeSave: () => { if (hasPerm(latestActionsRef.current.userPerm, PERM.MANAGE)) latestActionsRef.current.sendMergeAll(); },
        onHeaderEditLockAll: () => { if (hasPerm(latestActionsRef.current.userPerm, PERM.MANAGE) && !latestActionsRef.current.blockWhenDirty()) latestActionsRef.current.bulkSetLock(true); },
        onHeaderEditUnlockAll: () => { if (hasPerm(latestActionsRef.current.userPerm, PERM.MANAGE) && !latestActionsRef.current.blockWhenDirty()) latestActionsRef.current.bulkSetLock(false); },
    }), []);

    const columnMenu = useMemo(() => {
        const handleColumnsChange = (updated) => {
            const map = new Map(updated.map(c => [c.field, c]));
            setColumns(prev => prev.map(c => map.get(c.field) ? { ...c, ...map.get(c.field) } : c));
        };
        return (menuProps) => (
            <ExcelColumnMenu
                {...menuProps}
                columns={columnsForPerm}
                onColumnsChange={handleColumnsChange}
                filter={filter}
                onFilterChange={(e) => setFilter(e ?? null)}
                onSortChange={(e) => setSort(e ?? [])}
            />
        );
    }, [columnsForPerm, filter, setColumns, setFilter, setSort]);

    const renderLeafColumn = useCallback((c) => {
        // 체크박스 선택 컬럼
        if (c.field === 'chk') {
            return (
                <Column
                    key={c.field}
                    field={c.field}
                    title=""
                    width={c.width ?? '40px'}
                    sortable={false}
                    filterable={false}
                    columnMenu={undefined}
                    headerCell={CheckboxHeaderCell}
                    cell={CheckboxCell}
                />
            );
        }
        if (c.field === 'useYN') {
            return (
                <Column
                    key={c.field}
                    field={c.field}
                    title={c.title}
                    width={c.width ?? '130px'}
                    sortable={false}
                    filterable={false}
                    columnMenu={undefined}
                    headerCell={UseYnHeaderCell}
                    cell={UseYnCell}
                />
            );
        }
        if (c.field === 'exclude') {
            return (
                <Column
                    key={c.field}
                    field={c.field}
                    title=""
                    width={c.width ?? '90px'}
                    sortable={false}
                    filterable={false}
                    columnMenu={undefined}
                    headerCell={EmptyHeaderCell}
                    cell={ExcludeCell}
                />
            );
        }
        if (c.field === 'project_lock') {
            return (
                <Column
                    key={c.field}
                    field={c.field}
                    width={c.width ?? '90px'}
                    sortable={false}
                    filterable={false}
                    columnMenu={undefined}
                    headerCell={LockHeaderCell}
                    cell={LockCell}
                />
            );
        }
        if (c.field === 'filterSetting') {
            return (
                <Column
                    key={c.field}
                    field={c.field}
                    title={c.title}
                    width={c.width}
                    sortable={false}
                    columnMenu={undefined}
                    headerCell={FilterSettingHeaderCell}
                    cell={FilterSettingCell}
                />
            );
        }
        if (c.noLeafHeader && c.subgroup === "문항최종") {
            return (
                <Column
                    key={c.field}
                    field={c.field}
                    width={c.width}
                    title=""
                    editable={c.editable}
                    sortable={false}
                    filterable={false}
                    columnMenu={undefined}
                    headerCell={EmptyHeaderCell}
                    headerClassName="no-leaf-header"
                    cell={c.wrap ? WrapCellComponent : undefined}
                />
            );
        }
        if (c.field === 'status_text') {
            return (
                <Column
                    key={c.field}
                    field={c.field}
                    title={c.title}
                    width={c.width}
                    columnMenu={undefined}
                    cell={BlankWhenMergeCell}
                />
            );
        }
        if (c.field === 'status_cnt_duplicated' || c.field === 'status_cnt_fin' || c.field === 'tokens_text') {
            return (
                <Column
                    key={c.field}
                    field={proxyField?.[c.field] ?? `__sort__${c.field}`}
                    title={c.title}
                    width={c.width}
                    sortable
                    columnMenu={undefined}
                    cell={BlankWhenMergeCell}
                />
            );
        }
        if (c.field === 'status_cnt') {
            return (
                <Column
                    key={c.field}
                    field={proxyField?.[c.field] ?? `__sort__${c.field}`}
                    title={c.title}
                    width={c.width}
                    sortable
                    columnMenu={undefined}
                    cell={DefaultTextCell}
                />
            );
        }
        if (c.field === 'qnum_text' && c.group === 'EDIT') {
            return (
                <Column
                    key={`${c.group}:${c.field}`}
                    field={c.field}
                    title=""
                    width={c.width}
                    sortable={false}
                    filterable={false}
                    columnMenu={undefined}
                    headerCell={EmptyHeaderCell}
                    cell={c.wrap ? WrapCellComponent : undefined}
                />
            );
        }
        if (c.field === 'qnum_text') {
            return (
                <Column
                    key={`${c.group}:${c.field}`}
                    field={c.field}
                    title={c.title || "문항번호"}
                    width={c.width}
                    sortable={false}
                    filterable={false}
                    columnMenu={undefined}
                    cell={c.wrap ? WrapCellComponent : undefined}
                />
            );
        }
        // 문항통합 뱃지 컬럼 (직접 텍스트 입력 대신 뱃지로 표출)
        if (c.field === 'merge_qnum') {
            return (
                <Column
                    key={c.field}
                    field={c.field}
                    title=""
                    width={c.width}
                    sortable={false}
                    filterable={false}
                    columnMenu={undefined}
                    headerCell={EmptyHeaderCell}
                    cell={MergeDisplayCell}
                />
            );
        }
        return (
            <Column
                key={c.field}
                field={c.field}
                title={c.title}
                width={c.width}
                editable={c.editable}
                columnMenu={undefined}
                cell={c.wrap ? WrapCellBreakAllComponent : undefined}
            />
        );
    }, [columnMenu, proxyField]);

    const { visible, roots, groups } = useMemo(() => {
        const vis = columnsForPerm.filter(c => c.show !== false);
        const rts = vis.filter(c => !c.group);
        const grps = [];
        vis.forEach(c => {
            if (!c.group) return;
            const lastGrp = grps[grps.length - 1];
            if (lastGrp && lastGrp.name === c.group) {
                lastGrp.inGroup.push(c);
                if (c.subgroup && !lastGrp.subgroups.includes(c.subgroup)) {
                    lastGrp.subgroups.push(c.subgroup);
                }
            } else {
                grps.push({
                    key: `${c.group}_${grps.length}`,
                    name: c.group,
                    inGroup: [c],
                    subgroups: c.subgroup ? [c.subgroup] : []
                });
            }
        });
        return { visible: vis, roots: rts, groups: grps };
    }, [columnsForPerm]);

    const unmergeGroup = useCallback((groupKey) => {
        const rows = dataState?.data || [];
        const masterKey = norm(groupKey);
        setMergeEditsById(prev => {
            const next = new Map(prev);
            rows.forEach(r => {
                if (norm(getMergeVal(r)) === masterKey) {
                    const orig = norm(r.qnum_text || r.qnum);
                    next.set(r.id, orig);
                }
            });
            return next;
        });
    }, [dataState?.data, getMergeVal, setMergeEditsById]);

    const [masterEditPopover, setMasterEditPopover] = useState(null);
    const [masterEditInput, setMasterEditInput] = useState("");

    const openMasterEditPopover = useCallback((row, targetEl) => {
        if (!targetEl) return;
        const rect = targetEl.getBoundingClientRect();
        const curVal = norm(getMergeVal(row) || row.qnum_text || row.qnum);
        setMasterEditInput(curVal);

        const popoverWidth = 250;
        const leftPos = Math.max(10, Math.min(rect.left - 20, window.innerWidth - popoverWidth - 20));
        const topPos = rect.bottom + 6;

        setMasterEditPopover({
            row,
            groupKey: curVal,
            top: topPos,
            left: leftPos,
        });
    }, [getMergeVal, norm]);

    const applyMasterCustomQnum = useCallback((targetRow, oldGroupKey, newQnum) => {
        const cleanNew = norm(newQnum);
        if (!cleanNew) {
            modal.showErrorAlert("알림", "통합 문항번호를 입력해 주세요.");
            return;
        }
        const rows = dataState?.data || [];
        setMergeEditsById(prev => {
            const next = new Map(prev);
            rows.forEach(r => {
                if (norm(getMergeVal(r)) === oldGroupKey || r.id === targetRow.id) {
                    next.set(r.id, cleanNew);
                }
            });
            return next;
        });
        setMasterEditPopover(null);
    }, [dataState?.data, getMergeVal, norm, modal, setMergeEditsById]);

    const unmergeGroupFromPopover = useCallback((groupKey) => {
        unmergeGroup(groupKey);
        setMasterEditPopover(null);
    }, [unmergeGroup]);

    useEffect(() => {
        if (!masterEditPopover) return;
        const handleOutsideClick = () => {
            setMasterEditPopover(null);
        };
        const handleScroll = () => {
            setMasterEditPopover(null);
        };
        const timer = setTimeout(() => {
            document.addEventListener('click', handleOutsideClick);
            window.addEventListener('scroll', handleScroll, true);
        }, 10);
        return () => {
            clearTimeout(timer);
            document.removeEventListener('click', handleOutsideClick);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [masterEditPopover]);

    const ctxValue = useMemo(() => ({
        isExcluded, isLocked, isMergeRow, toggleExcluded, bulkSetExcluded,
        goOpenSetting, blockWhenDirty, bulkSetLock, toggleRowLock,
        dataWithProxiesLength: dataWithProxies.length,
        actions, getMergeVal, setMergeVal, mergeSavedBaseline, norm,
        hasManagePerm: hasPerm(userPerm, PERM.MANAGE),
        popupMode, setPopupMode, popupRow, setPopupRow, popupShow, setPopupShow,
        selectedRowIds, toggleRowSelect, toggleAllSelect, isAllSelected,
        linkingMasterRow, setLinkingMasterRow, startGroupingWithMaster, applyGroupToRow, unmergeRow, unmergeGroup, dupGroups,
        openMasterEditPopover
    }), [isExcluded, isLocked, isMergeRow, toggleExcluded, bulkSetExcluded, goOpenSetting, blockWhenDirty, bulkSetLock, toggleRowLock, dataWithProxies.length, actions, getMergeVal, setMergeVal, mergeSavedBaseline, norm, userPerm, popupMode, popupShow, popupRow, selectedRowIds, toggleRowSelect, toggleAllSelect, isAllSelected, linkingMasterRow, setLinkingMasterRow, startGroupingWithMaster, applyGroupToRow, unmergeRow, unmergeGroup, dupGroups, openMasterEditPopover]);

    const hasMergeChanges = useMemo(() => {
        return Object.keys(getMergeChanges()).length > 0 || !!linkingMasterRow;
    }, [getMergeChanges, linkingMasterRow, mergeEditsById]);

    const gridColumns = useMemo(() => {
        return [
            ...roots.map(renderLeafColumn),
            ...groups.map(g => {
                const inGroup = g.inGroup;
                const bySub = new Map();

                inGroup.forEach((c, idx) => {
                    const key = c.subgroup || "__root__";
                    const entry = bySub.get(key) || { cols: [], order: Number.POSITIVE_INFINITY, _idx: idx };
                    entry.cols.push(c);
                    const ord = Number.isFinite(c.order) ? c.order : 1e6;
                    entry.order = Math.min(entry.order, ord);
                    bySub.set(key, entry);
                });

                const items = [];
                const root = bySub.get("__root__");
                if (root) {
                    root.cols.forEach((c, i) => {
                        items.push({ type: "col", order: Number.isFinite(c.order) ? c.order : 1e6, _idx: i, col: c });
                    });
                    bySub.delete("__root__");
                }

                for (const [sub, entry] of bySub.entries()) {
                    const colsSorted = entry.cols.slice().sort((a, b) =>
                        (a.leafOrder ?? 0) - (b.leafOrder ?? 0)
                    );
                    items.push({ type: "sub", order: entry.order, _idx: entry._idx, sub, cols: colsSorted });
                }

                items.sort((a, b) => (a.order - b.order) || (a._idx - b._idx));
                return (
                    <Column
                        key={`grp:${g.key}`}
                        title={g.name}
                        headerCell={() => (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                                {g.name}
                                {g.name === "ADMIN" && (
                                    <span
                                        className="info-icon"
                                        data-tooltip={`ADMIN|• ✓분석: 분석 할 문항만 체크\n• ✓제외: 분석 안 할 문항 체크\n• 분석보기 버튼: 각 문항별 카테고리 자동분류 페이지로 이동`}
                                    ></span>
                                )}
                                {g.name === "EDIT" && (
                                    <span
                                        className="info-icon"
                                        data-tooltip={`EDIT|• 체크박스 다중 선택 후 선택문항통합 또는 통합해제\n• 문항통합저장 버튼: 설정된 통합값을 서버에 최종 저장`}
                                    ></span>
                                )}
                            </div>
                        )}
                    >
                        {items.map(it =>
                            it.type === "col"
                                ? renderLeafColumn(it.col)
                                : (
                                    <Column
                                        key={`sub:${g.name}:${it.sub}`}
                                        title={it.sub === "문항최종" ? "문항최종" : ""}
                                        headerClassName={[
                                            (it.sub === "문항최종" || it.sub === "문항통합저장")
                                                ? "sub-no-bottom-border"
                                                : "",
                                        ].filter(Boolean).join(" ")}
                                        headerCell={
                                            it.sub === "문항통합저장"
                                                ? () => (
                                                    <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", justifyContent: "center" }}>
                                                        <Button
                                                            className={hasMergeChanges ? "btnS btnType04 btn-merge-save-active" : "btnS btnType04"}
                                                            onClick={dataWithProxies.length === 0 ? undefined : actions.onHeaderMergeSave}
                                                            style={hasMergeChanges ? {
                                                                backgroundColor: '#fff7ed',
                                                                border: '1px solid #f97316',
                                                                color: '#ea580c',
                                                                fontWeight: '600',
                                                                fontSize: '12px',
                                                                cursor: 'pointer'
                                                            } : {
                                                                opacity: dataWithProxies.length === 0 ? 0.5 : 1,
                                                                cursor: dataWithProxies.length === 0 ? 'not-allowed' : 'pointer',
                                                                pointerEvents: dataWithProxies.length === 0 ? 'none' : 'auto'
                                                            }}
                                                        >
                                                            문항통합저장
                                                        </Button>
                                                    </div>
                                                )
                                                : undefined
                                        }
                                    >
                                        {it.cols.map(renderLeafColumn)}
                                    </Column>
                                )
                        )}
                    </Column>
                );
            })
        ];
    }, [roots, groups, visible, dataWithProxies.length, actions.onHeaderMergeSave, renderLeafColumn, hasMergeChanges]);

    return (
        <div className="pro-list-page">
            <style>{`
                .btn-merge-save-active {
                    background-color: #fff7ed !important;
                    border: 1px solid #f97316 !important;
                    color: #ea580c !important;
                    font-weight: 600 !important;
                    animation: mergeSaveActivePulse 2s infinite !important;
                    cursor: pointer !important;
                }
                @keyframes mergeSaveActivePulse {
                    0% {
                        box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.5);
                    }
                    70% {
                        box-shadow: 0 0 0 6px rgba(249, 115, 22, 0);
                    }
                    100% {
                        box-shadow: 0 0 0 0 rgba(249, 115, 22, 0);
                    }
                }
            `}</style>
            <AiDataHeader
                title="문항 목록 (UI 고도화)"
                tooltip={`문항 목록2|체크박스를 이용한 선택문항 통합 & 통합해제 고도화 버전`}
            >
                {(!userAuth.includes("고객") && !userAuth.includes("일반") && !userAuth.includes("연구원")) && (
                    <DropdownMenu
                        label="데이터추출"
                        isPrimary={false}
                        items={[
                            { text: '보기추출(개발자용)', onClick: handleExportExcelDev },
                            { text: '보기추출(DP용)', onClick: handleExportExcelDP },
                            { divider: true },
                            { text: '응답추출(전체문항)', onClick: handleExportRaw }
                        ]}
                    />
                )}
                {(!userAuth.includes("고객") && !userAuth.includes("일반")) && (() => {
                    const registerItems = [
                        { text: '문항등록', onClick: () => setShowRegisterPopup(true) }
                    ];
                    if (!userAuth.includes("연구원")) {
                        registerItems.push({ text: '보기등록(전체문항)', onClick: () => fileInputRef.current?.click() });
                    }
                    return (
                        <DropdownMenu
                            label="데이터등록"
                            isPrimary={true}
                            items={registerItems}
                        />
                    );
                })()}
            </AiDataHeader>

            <div className="pro-list-content">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <GridDataCount total={filteredCount} />

                    {/* 실시간 검색창 */}
                    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                        <Search
                            size={14}
                            style={{
                                position: 'absolute',
                                left: '10px',
                                color: '#94a3b8',
                                pointerEvents: 'none'
                            }}
                        />
                        <input
                            type="text"
                            placeholder="문번호, 문항번호, 문항명 검색"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            style={{
                                width: '250px',
                                height: '32px',
                                padding: '0 30px 0 30px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                fontSize: '12px',
                                color: '#1e293b',
                                backgroundColor: '#ffffff',
                                outline: 'none',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#f97316'}
                            onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                        />
                        {searchText && (
                            <button
                                onClick={() => setSearchText("")}
                                style={{
                                    position: 'absolute',
                                    right: '8px',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#94a3b8',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '2px'
                                }}
                                title="검색어 지우기"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="pro-list-card">
                    <div className="cmn_gird_wrap">
                        <div id="grid_01" className="cmn_grid multihead">
                            <ProListGridContext.Provider value={ctxValue}>
                                <KendoGrid
                                    parentProps={{
                                        height: "100%",
                                        data: searchFilteredData,
                                        dataItemKey: dataItemKey,
                                        selectedState,
                                        setSelectedState,
                                        selectedField,
                                        idGetter,
                                        multiSelect: false,
                                        sortable: { mode: "multiple", allowUnsort: true },
                                        filterable: false,
                                        sortChange: ({ sort: next }) => {
                                            const nextRaw = (next || []).map(d => {
                                                const orig = Object.keys(proxyField).find(k => proxyField[k] === d.field);
                                                return { ...d, field: orig || d.field };
                                            });
                                            setSort(nextRaw ?? []);
                                            setGridSkip(0);
                                        },
                                        filterChange: ({ filter }) => {
                                            setFilter(filter ?? null);
                                            setGridSkip(0);
                                        },
                                        sort: mappedSort,
                                        filter: filter,
                                        columnVirtualization: false,
                                        scrollable: "virtual",
                                        rowHeight: 45,
                                        pageSize: 50,
                                        skip: gridSkip,
                                        onPageChange: (e) => setGridSkip(e.page.skip),
                                    }}
                                >
                                    {gridColumns}
                                </KendoGrid>
                            </ProListGridContext.Provider>
                        </div>
                    </div>
                </div>
            </div>

            {masterEditPopover && (
                <div
                    style={{
                        position: 'fixed',
                        top: `${masterEditPopover.top}px`,
                        left: `${masterEditPopover.left}px`,
                        zIndex: 999999,
                        backgroundColor: '#ffffff',
                        border: '1px solid #f97316',
                        borderRadius: '10px',
                        padding: '12px 14px',
                        boxShadow: '0 10px 25px -5px rgba(249, 115, 22, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                        width: '250px',
                        boxSizing: 'border-box'
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#ea580c' }}>✏️ 통합 문항번호 수정</span>
                        <button
                            onClick={() => setMasterEditPopover(null)}
                            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '14px', cursor: 'pointer', padding: '0 2px' }}
                        >
                            ✕
                        </button>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px', lineHeight: '1.4' }}>
                        통합 문항번호를 커스텀 수정하거나 그룹을 해제합니다.
                    </div>
                    <input
                        autoFocus
                        type="text"
                        value={masterEditInput}
                        onChange={(e) => setMasterEditInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') applyMasterCustomQnum(masterEditPopover.row, masterEditPopover.groupKey, masterEditInput);
                            if (e.key === 'Escape') setMasterEditPopover(null);
                        }}
                        style={{
                            width: '100%',
                            height: '30px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '0 8px',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#1e293b',
                            outline: 'none',
                            boxSizing: 'border-box',
                            marginBottom: '10px'
                        }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <button
                            onClick={() => unmergeGroupFromPopover(masterEditPopover.groupKey)}
                            style={{
                                backgroundColor: '#fef2f2',
                                border: '1px solid #fca5a5',
                                color: '#dc2626',
                                fontSize: '11px',
                                fontWeight: '600',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                cursor: 'pointer'
                            }}
                        >
                            ↶ 전체 풀기
                        </button>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                                onClick={() => setMasterEditPopover(null)}
                                style={{
                                    backgroundColor: '#f1f5f9',
                                    border: '1px solid #cbd5e1',
                                    color: '#475569',
                                    fontSize: '11px',
                                    fontWeight: '500',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                }}
                            >
                                취소
                            </button>
                            <button
                                onClick={() => applyMasterCustomQnum(masterEditPopover.row, masterEditPopover.groupKey, masterEditInput)}
                                style={{
                                    backgroundColor: '#f97316',
                                    border: '1px solid #ea580c',
                                    color: '#ffffff',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    padding: '4px 12px',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                }}
                            >
                                적용
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {popupShow && (
                <ProListPopup
                    popupShow={popupShow}
                    setPopupShow={setPopupShow}
                    popupMode={popupMode}
                    popupRow={popupRow}
                    firstQnum={dataState?.data?.[0]?.merge_qnum}
                    onRefresh={handleSearch}
                />
            )}

            {showRegisterPopup && (
                <ProRegisterPopup
                    popupShow={showRegisterPopup}
                    setPopupShow={setShowRegisterPopup}
                    onRefresh={handleSearch}
                />
            )}
        </div>
    );
};

export default React.memo(ProList2GridRenderer);
