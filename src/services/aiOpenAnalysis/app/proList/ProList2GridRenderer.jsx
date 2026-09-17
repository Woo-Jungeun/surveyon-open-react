import React, { useRef, useMemo, useCallback, useEffect, useState } from "react";
import { Button } from "@progress/kendo-react-buttons";
import { GridColumn as Column } from "@progress/kendo-react-grid";
import KendoGrid from "@/components/kendo/KendoGrid.jsx";
import ExcelColumnMenu from '@/components/common/grid/ExcelColumnMenu';
import ProListPopup from "@/services/aiOpenAnalysis/app/proList/ProListPopup";
import ProRegisterPopup from "@/services/aiOpenAnalysis/app/proList/ProRegisterPopup";
import ProListBatchMergePopup from "./ProListBatchMergePopup";
import ProListBatchQuestionEditPopup from "./ProListBatchQuestionEditPopup";
import GridHeaderBtnPrimary from "@/components/style/button/GridHeaderBtnPrimary.jsx";
import GridHeaderBtnTxt from "@/components/style/button/GridHeaderBtnTxt.jsx";
import AiDataHeader from "@/services/aiOpenAnalysis/components/AiDataHeader.jsx";
import { PERM, hasPerm, addSortProxies, GROUP_MIN_PERM, FIELD_MIN_PERM } from "./ProListUtils";
import GridDataCount from "@/components/common/grid/GridDataCount";
import "./ProList.css";
import { process } from "@progress/kendo-data-query";
import { ChevronDown, ChevronRight, Link, Unlink, Layers, Search, X, Trash2, Plus, Minus, Edit3 } from 'lucide-react';

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
    const ctx = React.useContext(ProListGridContext);
    const isQuestionFin = cellProps.field === 'question_fin';
    const row = cellProps.dataItem;

    if (isQuestionFin && row) {
        if (row.__isGroupMaster) {
            const isExpanded = row.__isExpanded;
            const groupKey = row.__groupKey;
            const count = row.__groupCount;
            return (
                <td className="cell-wrap" style={{ padding: '0 10px', verticalAlign: 'middle', maxWidth: '350px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', overflow: 'hidden' }}>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                ctx?.toggleGroupExpand?.(groupKey);
                            }}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '3px 10px 3px 8px',
                                borderRadius: '14px',
                                border: isExpanded ? '1px solid #ea580c' : '1px solid #fdba74',
                                backgroundColor: isExpanded ? '#ea580c' : '#fff7ed',
                                color: isExpanded ? '#ffffff' : '#c2410c',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                flexShrink: 0,
                                boxShadow: isExpanded ? '0 2px 5px rgba(234, 88, 12, 0.25)' : '0 1px 2px rgba(249, 115, 22, 0.08)',
                                transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
                                userSelect: 'none'
                            }}
                            title={isExpanded ? "그룹 접기" : "그룹 펼치기"}
                            onMouseEnter={(e) => {
                                if (!isExpanded) {
                                    e.currentTarget.style.backgroundColor = '#ffedd5';
                                    e.currentTarget.style.borderColor = '#f97316';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isExpanded) {
                                    e.currentTarget.style.backgroundColor = '#fff7ed';
                                    e.currentTarget.style.borderColor = '#fdba74';
                                }
                            }}
                        >
                            <span style={{
                                display: 'inline-flex',
                                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s ease',
                                flexShrink: 0
                            }}>
                                <ChevronRight size={13} strokeWidth={2.5} />
                            </span>
                            <span>묶음 {count}</span>
                        </button>

                        <span
                            title={row.question_fin}
                            style={{
                                flex: 1,
                                minWidth: 0,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                fontWeight: '500',
                                color: '#0f172a',
                                fontSize: '12px',
                                textAlign: 'left',
                                cursor: 'default'
                            }}
                        >
                            {row.question_fin}
                        </span>
                    </div>
                </td>
            );
        }

        if (row.__isGroupChild) {
            return (
                <td className="cell-wrap" style={{ padding: '0 10px', verticalAlign: 'middle', maxWidth: '350px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', overflow: 'hidden' }}>
                        <span style={{
                            color: '#ea580c',
                            fontWeight: '800',
                            fontSize: '13px',
                            flexShrink: 0,
                            userSelect: 'none',
                            marginLeft: '12px'
                        }}>
                            └
                        </span>
                        <span style={{
                            backgroundColor: '#fff7ed',
                            color: '#c2410c',
                            fontSize: '10px',
                            fontWeight: '700',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            border: '1px solid #fed7aa',
                            flexShrink: 0
                        }}>
                            통합문항
                        </span>
                        <span
                            title={row.question_fin}
                            style={{
                                flex: 1,
                                minWidth: 0,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                fontWeight: '500',
                                color: '#334155',
                                fontSize: '12px',
                                textAlign: 'left',
                                cursor: 'default'
                            }}
                        >
                            {row.question_fin}
                        </span>
                    </div>
                </td>
            );
        }

        return (
            <td className="cell-wrap" style={{ padding: '0 10px', verticalAlign: 'middle', maxWidth: '350px' }}>
                <div style={{ display: 'flex', alignItems: 'center', width: '100%', overflow: 'hidden' }}>
                    <span
                        title={row.question_fin}
                        style={{
                            flex: 1,
                            minWidth: 0,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontWeight: '500',
                            color: '#0f172a',
                            fontSize: '12px',
                            textAlign: 'left',
                            cursor: 'default'
                        }}
                    >
                        {row.question_fin}
                    </span>
                </div>
            </td>
        );
    }

    const val = cellProps.dataItem?.[cellProps.field];
    return (
        <td className="cell-wrap" title={val} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {val}
        </td>
    );
};

const StatusTextCell = (cellProps) => {
    const ctx = React.useContext(ProListGridContext);
    const row = cellProps.dataItem;
    if (!row) return <td></td>;

    if (row.__isGroupChild) {
        return <td style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>통합 기준 처리</td>;
    }
    if (ctx?.isMergeRow(row)) return <td></td>;

    const val = String(row.status_text ?? "").trim();
    if (!val) return <td></td>;

    let badgeStyle = {
        backgroundColor: '#f1f5f9',
        color: '#475569',
        border: '1px solid #cbd5e1'
    };

    if (val.includes("진행") || val.includes("분석중")) {
        badgeStyle = {
            backgroundColor: '#f0f9ff',
            color: '#0284c7',
            border: '1px solid #bae6fd'
        };
    } else if (val.includes("완료") || val.includes("성공")) {
        badgeStyle = {
            backgroundColor: '#f0fdf4',
            color: '#15803d',
            border: '1px solid #bbf7d0'
        };
    } else if (val.includes("오류") || val.includes("실패")) {
        badgeStyle = {
            backgroundColor: '#fef2f2',
            color: '#b91c1c',
            border: '1px solid #fca5a5'
        };
    }

    return (
        <td style={{ textAlign: 'center' }}>
            <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '600',
                ...badgeStyle
            }}>
                {val}
            </span>
        </td>
    );
};

const TokensCell = (cellProps) => {
    const ctx = React.useContext(ProListGridContext);
    const row = cellProps.dataItem;
    if (!row || row.__isGroupChild || ctx?.isMergeRow(row)) return <td></td>;

    const rawVal = row.tokens_text ?? row.tokens ?? 0;
    const num = Number(rawVal) || 0;
    const formatted = num.toLocaleString();

    return (
        <td style={{ textAlign: 'center' }}>
            {num > 0 ? `${formatted} 토큰` : '0 토큰'}
        </td>
    );
};

const BlankWhenMergeCell = (cellProps) => {
    const ctx = React.useContext(ProListGridContext);
    const row = cellProps.dataItem;
    if (row?.__isGroupChild) {
        if (cellProps.field === 'status_cnt' || cellProps.field?.includes('status_cnt')) {
            return <td style={{ textAlign: 'center', color: '#64748b' }}>{row?.[cellProps.field]}</td>;
        }
        return <td></td>;
    }
    return <td>{ctx?.isMergeRow(row) ? '' : row?.[cellProps.field]}</td>;
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
    if (!row) return <td></td>;

    if (row.__isGroupChild) {
        return <td></td>;
    }

    const targetItem = row.__isGroupMaster ? (row.__masterItem || row) : row;
    const excluded = ctx.isExcluded(targetItem);
    const locked = ctx.isLocked(targetItem);
    const includeLabel = ctx.isMergeRow(targetItem) || row.__isGroupMaster ? '머지' : '분석';
    const state = excluded ? 'exclude' : (includeLabel === '머지' ? 'merge' : 'analysis');
    const label = excluded ? '제외' : includeLabel;
    const cls = `chip chip--${state} ${locked ? 'chip--disabled' : ''}`;

    return (
        <td style={{ textAlign: 'center' }} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
            <Button
                className={cls}
                disabled={locked}
                onClick={() => {
                    if (locked) return;
                    if (row.__isGroupMaster && row.__groupList) {
                        ctx.toggleGroupExcluded?.(row.__groupList, !excluded);
                    } else {
                        ctx.toggleExcluded(targetItem);
                    }
                }}
            >
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
    if (!row) return <td></td>;

    if (row.__isGroupChild) {
        return <td></td>;
    }

    const targetItem = row.__isGroupMaster ? (row.__masterItem || row) : row;
    const { merge_qnum } = targetItem;
    const excluded = ctx.isExcluded(targetItem);
    return (
        <td style={{ textAlign: 'center' }} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
            {!excluded && (
                <Button className="btnM" themeColor="primary" onClick={() => { if (!ctx.blockWhenDirty()) ctx.goOpenSetting(merge_qnum || row.__groupKey, targetItem.project_lock); }}>
                    분석보기
                </Button>
            )}
        </td>
    );
};

const EmptyHeaderCell = () => <></>;

const LockCell = (cellProps) => {
    const ctx = React.useContext(ProListGridContext);
    const { dataItem: row } = cellProps;
    if (!row) return <td></td>;

    if (row.__isGroupChild) {
        return <td></td>;
    }

    const targetItem = row.__isGroupMaster ? (row.__masterItem || row) : row;
    const locked = ctx.isLocked(targetItem);
    const excluded = ctx.isExcluded(targetItem);
    if (excluded) return <td style={{ textAlign: 'center' }}></td>;

    return (
        <td style={{ textAlign: 'center' }} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
            <div
                className={`lock-icon-btn ${locked ? 'locked' : ''}`}
                onClick={() => {
                    if (row.__isGroupMaster && row.__groupList) {
                        ctx.toggleGroupLock?.(row.__groupList, !locked);
                    } else {
                        ctx.toggleRowLock(targetItem);
                    }
                }}
                title={locked ? '잠금 해제' : '잠금'}
            >
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
    if (!row || row.__isGroupChild) return <td></td>;

    const targetItem = row.__isGroupMaster ? (row.__masterItem || row) : row;
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
                    ctx.setPopupRow(targetItem);
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

const CustomOrangeCheckbox = ({ checked, onChange, title }) => {
    return (
        <div
            onClick={(e) => {
                e.stopPropagation();
                onChange?.(!checked);
            }}
            style={{
                width: '16px',
                height: '16px',
                borderRadius: '4px',
                border: '1.5px solid #ea580c',
                backgroundColor: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxSizing: 'border-box',
                userSelect: 'none'
            }}
            title={title}
        >
            {checked && (
                <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ea580c"
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            )}
        </div>
    );
};

const CheckboxCell = (cellProps) => {
    const ctx = React.useContext(ProListGridContext);
    const row = cellProps.dataItem;
    if (!row || !ctx || !ctx.selectedRowIds) return <td style={{ textAlign: 'center' }}></td>;

    if (row.__isGroupChild) {
        return (
            <td
                style={{ textAlign: 'center', verticalAlign: 'middle', cursor: 'not-allowed' }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '4px',
                        backgroundColor: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto',
                        cursor: 'not-allowed'
                    }}
                    title="통합 하위 문항 (대표 문항으로 선택/관리됩니다)"
                >
                    <div style={{ width: '8px', height: '2px', backgroundColor: '#94a3b8', borderRadius: '1px' }} />
                </div>
            </td>
        );
    }

    if (row.__isGroupMaster) {
        const masterId = row.id ?? row.no;
        const isChecked = !!ctx.selectedRowIds.has(masterId);
        return (
            <td
                style={{ textAlign: 'center', verticalAlign: 'middle', cursor: 'pointer' }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                    e.stopPropagation();
                    ctx.toggleRowSelect(masterId, !isChecked);
                }}
            >
                <CustomOrangeCheckbox
                    checked={isChecked}
                    onChange={(nextChecked) => ctx.toggleRowSelect(masterId, nextChecked)}
                />
            </td>
        );
    }

    const rowId = row.id ?? row.no;
    const isChecked = !!ctx.selectedRowIds.has(rowId);
    return (
        <td
            style={{ textAlign: 'center', verticalAlign: 'middle', cursor: 'pointer' }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
                e.stopPropagation();
                ctx.toggleRowSelect(rowId, !isChecked);
            }}
        >
            <CustomOrangeCheckbox
                checked={isChecked}
                onChange={(nextChecked) => ctx.toggleRowSelect(rowId, nextChecked)}
            />
        </td>
    );
};

const CheckboxHeaderCell = () => {
    const ctx = React.useContext(ProListGridContext);
    if (!ctx) return null;
    return (
        <div
            style={{ textAlign: 'center', padding: '4px 0', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}
            onClick={(e) => {
                e.stopPropagation();
                ctx.toggleAllSelect(!ctx.isAllSelected);
            }}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <CustomOrangeCheckbox
                checked={!!ctx.isAllSelected}
                onChange={(nextChecked) => ctx.toggleAllSelect(nextChecked)}
                title="전체 선택 / 해제"
            />
        </div>
    );
};

const MergeDisplayCell = (cellProps) => {
    const ctx = React.useContext(ProListGridContext);
    const row = cellProps.dataItem;
    if (!row) return <td></td>;

    const norm = ctx?.norm || ((s) => String(s ?? "").trim());
    const original = norm(row?.merge_qnum ?? "");
    const cur = ctx?.getMergeVal ? ctx.getMergeVal(row) : original;
    const tdRef = React.useRef(null);
    const locked = ctx?.isLocked?.(row);
    const excluded = ctx?.isExcluded?.(row);
    const editable = ctx?.hasManagePerm;
    const disabled = locked || excluded || !editable;
    const origQnum = norm(row.qnum_text || row.qnum);

    const isMasterOfGroup = row.__isGroupMaster || ctx?.dupGroups?.firstOfGroup?.has(row.id);
    const isMergedChild = row.__isGroupChild || ctx?.dupGroups?.restOfGroup?.has(row.id);
    const isMerged = ctx?.isMergeRow?.(row) || (cur && cur !== origQnum);

    if (isMasterOfGroup) {
        const displayQnum = cur || origQnum;
        const fullTitle = `${displayQnum} (대표)\n(클릭하여 통합 문항번호 커스텀 수정 또는 그룹 해제)`;
        return (
            <td ref={tdRef} style={{ textAlign: 'center', padding: '4px 2px', overflow: 'hidden' }} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                <button
                    disabled={disabled}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!disabled && ctx?.openMasterEditPopover) {
                            ctx.openMasterEditPopover(row, e.currentTarget);
                        }
                    }}
                    style={{
                        backgroundColor: '#ffedd5',
                        border: '1px solid #f97316',
                        color: '#c2410c',
                        fontSize: '12px',
                        fontWeight: '600',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        display: 'inline-flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        whiteSpace: 'nowrap',
                        gap: '3px',
                        height: '26px',
                        maxWidth: '100%',
                        boxSizing: 'border-box',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        overflow: 'hidden'
                    }}
                    title={fullTitle}
                >
                    <span style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '85px',
                        display: 'inline-block'
                    }}>
                        {displayQnum} (대표)
                    </span>
                    <span style={{ fontSize: '10px', opacity: 0.8, flexShrink: 0 }}>✏️</span>
                </button>
            </td>
        );
    }

    if (isMergedChild || isMerged) {
        const masterQnum = row.__masterItem ? (row.__masterItem.qnum_text || row.__masterItem.qnum) : (cur || origQnum);
        const fullTitle = `↳ ${masterQnum}로 통합\n(클릭 시 통합 해제)`;
        return (
            <td ref={tdRef} style={{ textAlign: 'center', padding: '4px 2px', overflow: 'hidden' }} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                <button
                    disabled={disabled}
                    onClick={() => { if (!disabled && ctx?.unmergeRow) ctx.unmergeRow(row); }}
                    style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#475569',
                        fontSize: '11px',
                        fontWeight: '500',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        display: 'inline-flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        whiteSpace: 'nowrap',
                        gap: '2px',
                        height: '24px',
                        maxWidth: '100%',
                        boxSizing: 'border-box',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        overflow: 'hidden'
                    }}
                    title={fullTitle}
                >
                    <span style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '85px',
                        display: 'inline-block'
                    }}>
                        ↳ {masterQnum}로 통합
                    </span>
                    <span style={{ fontSize: '9px', opacity: 0.7, flexShrink: 0 }}>✕</span>
                </button>
            </td>
        );
    }

    return (
        <td ref={tdRef} title={origQnum} style={{ textAlign: 'center', padding: '4px 2px', fontSize: '13px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {origQnum}
        </td>
    );
};

const MergeHeaderCell = () => {
    const ctx = React.useContext(ProListGridContext);
    const changed = ctx?.getMergeChanges ? ctx.getMergeChanges() : {};
    const count = Object.keys(changed).length;
    const hasChanges = count > 0;

    return (
        <div style={{ textAlign: 'center', padding: '2px 0' }} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
            <style>{`
                @keyframes subtleBorderPulse {
                    0%, 100% {
                        box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.2);
                        border-color: #f97316;
                    }
                    50% {
                        box-shadow: 0 0 6px 2px rgba(249, 115, 22, 0.35);
                        border-color: #ea580c;
                    }
                }
            `}</style>
            <Button
                className="btnS"
                disabled={!ctx?.hasManagePerm}
                style={{
                    backgroundColor: "#ffffff",
                    borderColor: hasChanges ? "#f97316" : "#cbd5e1",
                    color: hasChanges ? "#ea580c" : "#475569",
                    fontWeight: hasChanges ? "600" : "500",
                    fontSize: "11px",
                    padding: "2px 6px",
                    height: "26px",
                    borderRadius: "4px",
                    animation: hasChanges ? "subtleBorderPulse 2s infinite ease-in-out" : "none",
                    transition: "all 0.2s ease"
                }}
                onClick={() => {
                    if (ctx?.sendMergeAll) ctx.sendMergeAll();
                    else if (ctx?.sendMergeAllRef?.current) ctx.sendMergeAllRef.current();
                }}
                title={hasChanges ? "클릭 시 변경된 문항통합 설정을 저장합니다." : "변경된 설정이 없습니다."}
            >
                {hasChanges ? `문항통합저장 (${count})` : "문항통합저장"}
            </Button>
        </div>
    );
};

const ProList2GridRenderer = (props) => {
    const [showRegisterPopup, setShowRegisterPopup] = useState(false);
    const [batchMergePopupShow, setBatchMergePopupShow] = useState(false);
    const [batchMergeRows, setBatchMergeRows] = useState([]);
    const [batchEditQuestionPopupShow, setBatchEditQuestionPopupShow] = useState(false);
    const [batchEditQuestionRows, setBatchEditQuestionRows] = useState([]);
    const [gridSkip, setGridSkip] = useState(0);

    const {
        selectedState, setSelectedState, idGetter, dataState, dataItemKey, selectedField, handleSearch,
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

    const pendingFlushRef = useRef(false);
    const sendMergeAllRef = useRef(null);
    const [searchText, setSearchText] = useState("");

    const getMergeVal = useCallback((row) =>
        mergeEditsById.has(row?.id) ? mergeEditsById.get(row?.id) : (row?.merge_qnum ?? ""), [mergeEditsById]);
    const setMergeVal = useCallback((row, v) =>
        setMergeEditsById(m => { const n = new Map(m); n.set(row?.id, v); return n; }), []);

    const isExcluded = useCallback((row) => !!excludedById.get(row?.id), [excludedById]);

    const { dataWithProxies, proxyField } = useMemo(
        () => addSortProxies(dataState?.data || []),
        [dataState?.data]
    );

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

    // 4번: 카운트 계산
    const { analysisCount, excludeCount } = useMemo(() => {
        let analysis = 0;
        let exclude = 0;
        (dataWithProxies || []).forEach(r => {
            if (isExcluded(r)) exclude++;
            else analysis++;
        });
        return { analysisCount: analysis, excludeCount: exclude };
    }, [dataWithProxies, isExcluded]);

    const searchFilteredData = useMemo(() => {
        let list = dataWithProxies;
        if (!searchText.trim()) return list;
        const q = norm(searchText).toLowerCase();
        return list.filter(r => {
            const qnum = norm(r.qnum).toLowerCase();
            const qnumText = norm(r.qnum_text).toLowerCase();
            const questionFin = norm(r.question_fin).toLowerCase();
            const mergeQnum = norm(getMergeVal(r)).toLowerCase();
            const model = norm(r.model).toLowerCase();
            return qnum.includes(q) || qnumText.includes(q) || questionFin.includes(q) || mergeQnum.includes(q) || model.includes(q);
        });
    }, [dataWithProxies, searchText, getMergeVal, norm]);

    const mappedSort = useMemo(() => {
        return (sort || []).map(s => ({
            ...s,
            field: proxyField?.[s.field] || s.field
        }));
    }, [sort, proxyField]);

    const sortedRawData = useMemo(() => {
        if (!mappedSort || !mappedSort.length) return searchFilteredData;
        try {
            return process(searchFilteredData, { sort: mappedSort }).data || searchFilteredData;
        } catch (e) {
            return searchFilteredData;
        }
    }, [searchFilteredData, mappedSort]);

    const [expandedGroupKeys, setExpandedGroupKeys] = useState(new Set());

    // 1번: 그룹 모두 펼치기 / 접기 토글
    const expandAllGroups = useCallback(() => {
        if (dupGroups?.map) {
            setExpandedGroupKeys(new Set(dupGroups.map.keys()));
        }
    }, [dupGroups]);

    const collapseAllGroups = useCallback(() => {
        setExpandedGroupKeys(new Set());
    }, []);

    const toggleAllGroups = useCallback(() => {
        if (expandedGroupKeys.size > 0) {
            setExpandedGroupKeys(new Set());
        } else if (dupGroups?.map) {
            setExpandedGroupKeys(new Set(dupGroups.map.keys()));
        }
    }, [dupGroups, expandedGroupKeys.size]);

    const toggleGroupExpand = useCallback((groupKey) => {
        setExpandedGroupKeys(prev => {
            const next = new Set(prev);
            if (next.has(groupKey)) next.delete(groupKey);
            else next.add(groupKey);
            return next;
        });
    }, []);

    const toggleGroupSelect = useCallback((groupIds, checked) => {
        setSelectedRowIds(prev => {
            const next = new Set(prev);
            groupIds.forEach(id => {
                if (checked) next.add(id);
                else next.delete(id);
            });
            return next;
        });
    }, []);

    const rowRender = useCallback((trElement, props) => {
        const item = props.dataItem;
        if (!item) return trElement;

        let extraClass = "";
        if (item.__isGroupMaster && item.__isExpanded) {
            extraClass = "tr-group-master-expanded";
        } else if (item.__isGroupMaster && !item.__isExpanded) {
            extraClass = "tr-group-master-collapsed";
        } else if (item.__isGroupChild) {
            extraClass = item.__isLastChild ? "tr-group-child tr-group-child-last" : "tr-group-child";
        }

        if (!extraClass) return trElement;

        const existingClass = trElement.props.className || "";
        return React.cloneElement(trElement, {
            className: `${existingClass} ${extraClass}`.trim()
        });
    }, []);

    const displayData = useMemo(() => {
        const rawList = sortedRawData || [];
        if (!rawList.length) return [];

        const groupMap = dupGroups.map;
        const firstOfGroup = dupGroups.firstOfGroup;
        const restOfGroup = dupGroups.restOfGroup;
        const rawIdSet = new Set(rawList.map(r => r.id));

        const visited = new Set();
        const result = [];

        rawList.forEach(item => {
            if (visited.has(item.id)) return;

            if (firstOfGroup.has(item.id)) {
                const groupKey = norm(getMergeVal(item));
                const fullGroup = groupMap.get(groupKey) || [item];
                visited.add(item.id);

                const totalStatusCnt = fullGroup.reduce((sum, r) => sum + (Number(r.status_cnt) || 0), 0);
                const isExpanded = expandedGroupKeys.has(groupKey);

                const masterObj = {
                    ...item,
                    __isGroupMaster: true,
                    __groupKey: groupKey,
                    __groupCount: fullGroup.length,
                    __groupList: fullGroup,
                    __isExpanded: isExpanded,
                    status_cnt: totalStatusCnt > 0 ? totalStatusCnt : item.status_cnt,
                    __masterItem: item
                };
                result.push(masterObj);

                const children = fullGroup.filter(c => c.id !== item.id);
                children.forEach((child, cIdx) => {
                    visited.add(child.id);
                    if (isExpanded) {
                        result.push({
                            ...child,
                            __isGroupChild: true,
                            __groupKey: groupKey,
                            __masterItem: item,
                            __isLastChild: cIdx === children.length - 1
                        });
                    }
                });
            } else if (restOfGroup.has(item.id)) {
                const groupKey = norm(getMergeVal(item));
                const fullGroup = groupMap.get(groupKey) || [];
                const master = fullGroup.find(r => firstOfGroup.has(r.id)) || item;
                const masterInRaw = rawIdSet.has(master.id);
                if (!masterInRaw && !visited.has(master.id)) {
                    visited.add(master.id);
                    const totalStatusCnt = fullGroup.reduce((sum, r) => sum + (Number(r.status_cnt) || 0), 0);
                    const isExpanded = expandedGroupKeys.has(groupKey);
                    const masterObj = {
                        ...master,
                        __isGroupMaster: true,
                        __groupKey: groupKey,
                        __groupCount: fullGroup.length,
                        __groupList: fullGroup,
                        __isExpanded: isExpanded,
                        status_cnt: totalStatusCnt > 0 ? totalStatusCnt : master.status_cnt,
                        __masterItem: master
                    };
                    result.push(masterObj);
                    const children = fullGroup.filter(c => c.id !== master.id);
                    children.forEach((child, cIdx) => {
                        visited.add(child.id);
                        if (isExpanded) {
                            result.push({
                                ...child,
                                __isGroupChild: true,
                                __groupKey: groupKey,
                                __masterItem: master,
                                __isLastChild: cIdx === children.length - 1
                            });
                        }
                    });
                }
            } else {
                visited.add(item.id);
                result.push(item);
            }
        });

        return result;
    }, [sortedRawData, dupGroups, getMergeVal, norm, expandedGroupKeys]);

    const toggleAllSelect = useCallback((checked) => {
        const rows = displayData || [];
        if (checked) {
            const topLevel = rows.filter(r => !r.__isGroupChild);
            setSelectedRowIds(new Set(topLevel.map(r => r.id ?? r.no)));
        } else {
            setSelectedRowIds(new Set());
        }
    }, [displayData]);

    const isAllSelected = useMemo(() => {
        const topLevel = (displayData || []).filter(r => !r.__isGroupChild);
        if (!topLevel.length) return false;
        return topLevel.every(r => selectedRowIds.has(r.id ?? r.no));
    }, [displayData, selectedRowIds]);

    const filteredCount = displayData.length;
    const isMergeRow = useCallback((row) => dupGroups.restOfGroup.has(row?.id), [dupGroups.restOfGroup]);

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

    const handleMergeSelectedFromBar = useCallback(() => {
        const rows = displayData ?? dataState?.data ?? [];
        const selectedRows = rows.filter(r => selectedRowIds.has(r.id ?? r.no));
        if (selectedRows.length < 2) {
            modal.showErrorAlert("알림", "통합할 문항을 2개 이상 선택해 주세요.");
            return;
        }

        const allItemsToMerge = [];
        selectedRows.forEach(r => {
            const list = (r.__isGroupMaster && r.__groupList) ? r.__groupList : [r];
            list.forEach(item => allItemsToMerge.push(item));
        });

        setBatchMergeRows(allItemsToMerge);
        setBatchMergePopupShow(true);
    }, [displayData, dataState?.data, selectedRowIds, modal]);

    const handleBatchMergeConfirm = useCallback((targetQnum) => {
        const nextEdits = new Map(mergeEditsById);
        batchMergeRows.forEach(r => nextEdits.set(r.id ?? r.no, targetQnum));

        setBatchMergePopupShow(false);
        setBatchMergeRows([]);
        sendMergeAllRef.current?.(nextEdits);
    }, [batchMergeRows, mergeEditsById]);

    const handleBatchEditQuestionFromBar = useCallback(() => {
        const rows = displayData ?? dataState?.data ?? [];
        const selectedRows = rows.filter(r => selectedRowIds.has(r.id ?? r.no));
        if (selectedRows.length === 0) {
            modal.showErrorAlert("알림", "수정할 문항을 선택해 주세요.");
            return;
        }

        const allItemsToEdit = [];
        selectedRows.forEach(r => {
            const list = (r.__isGroupMaster && r.__groupList) ? r.__groupList : [r];
            list.forEach(item => allItemsToEdit.push(item));
        });

        setBatchEditQuestionRows(allItemsToEdit);
        setBatchEditQuestionPopupShow(true);
    }, [displayData, dataState?.data, selectedRowIds, modal]);

    const handleBatchEditQuestionConfirm = useCallback(async (editedMap) => {
        try {
            const payload = {
                user: auth?.user?.userId || "",
                projectnum,
                gb: "update_question_fin",
                val: editedMap
            };
            const res = await editMutation.mutateAsync(payload);
            if (String(res?.success) === '777') {
                setBatchEditQuestionPopupShow(false);
                setBatchEditQuestionRows([]);
                setSelectedRowIds(new Set());
                handleSearch?.();
            } else {
                modal.showErrorAlert("에러", res?.message || "문항 수정 중 오류가 발생했습니다.");
            }
        } catch (e) {
            console.error(e);
            modal.showErrorAlert("에러", "문항 수정 중 오류가 발생했습니다.");
        }
    }, [auth?.user?.userId, projectnum, editMutation, handleSearch, modal]);

    const handleBulkSetUseYn = useCallback((shouldExclude) => {
        const rows = displayData ?? dataState?.data ?? [];
        const targetRows = rows.filter(r => selectedRowIds.has(r.id ?? r.no));
        if (targetRows.length === 0) return;

        setExcludedById(prev => {
            const next = new Map(prev);
            targetRows.forEach(r => {
                const list = (r.__isGroupMaster && r.__groupList) ? r.__groupList : [r];
                list.forEach(item => {
                    const rId = item.id ?? item.no;
                    if (!locksById.get(rId)) {
                        next.set(rId, shouldExclude);
                    }
                });
            });
            return next;
        });
        setSelectedRowIds(new Set());
    }, [displayData, dataState?.data, selectedRowIds, locksById, setExcludedById]);

    const handleBulkSetLockSelected = useCallback((shouldLock) => {
        const rows = displayData ?? dataState?.data ?? [];
        const targetRows = rows.filter(r => selectedRowIds.has(r.id ?? r.no));
        if (targetRows.length === 0) return;

        setLocksById(prev => {
            const next = new Map(prev);
            targetRows.forEach(r => {
                const list = (r.__isGroupMaster && r.__groupList) ? r.__groupList : [r];
                list.forEach(item => {
                    const rId = item.id ?? item.no;
                    next.set(rId, shouldLock);
                });
            });
            return next;
        });
        setSelectedRowIds(new Set());
    }, [displayData, dataState?.data, selectedRowIds, setLocksById]);

    const handleDeleteSelected = useCallback(async () => {
        const rows = displayData ?? dataState?.data ?? [];
        const targetRows = rows.filter(r => selectedRowIds.has(r.id ?? r.no));
        if (targetRows.length === 0) {
            modal.showErrorAlert("알림", "삭제할 문항을 선택해 주세요.");
            return;
        }

        modal.showConfirm("문항 삭제", `선택한 ${targetRows.length}개 문항을 삭제하시겠습니까?`, {
            btns: [
                { title: "취소" },
                {
                    title: "삭제",
                    click: async () => {
                        try {
                            const ids = targetRows.map(r => r.id ?? r.no);
                            const payload = {
                                user: auth?.user?.userId || "",
                                projectnum,
                                gb: "delete",
                                qid_list: ids
                            };
                            const res = await editMutation.mutateAsync(payload);
                            if (String(res?.success) === '777') {
                                setSelectedRowIds(new Set());
                                handleSearch?.();
                            } else {
                                modal.showErrorAlert("에러", res?.message || "삭제 중 오류가 발생했습니다.");
                            }
                        } catch (e) {
                            console.error(e);
                            modal.showErrorAlert("에러", "삭제 중 오류가 발생했습니다.");
                        }
                    }
                }
            ]
        });
    }, [displayData, dataState?.data, selectedRowIds, modal, auth?.user?.userId, projectnum, editMutation, handleSearch]);

    const sendMergeAll = async (overrideEditsMap = null) => {
        const activeEdits = overrideEditsMap || mergeEditsById;
        const getVal = (r) => activeEdits.has(r?.id) ? activeEdits.get(r?.id) : (r?.merge_qnum ?? "");

        const beforeEdits = new Map(activeEdits);
        rememberScroll();
        const rows = dataState?.data ?? [];

        const changesObj = {};
        rows.forEach(r => {
            if (!!locksById.get(r.id)) return;
            const base = norm(mergeSavedBaseline.get(r.id) ?? "");
            const cur = norm(getVal(r));
            if (cur !== base) changesObj[r.id] = cur;
        });

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
        const uiGroups = buildGroups(rows, r => getVal(r));

        const toCall = new Map();

        for (const id of changedIds) {
            const r = rows.find(x => Number(x.id) === id);
            if (!r) continue;
            if (String(r?.useYN ?? "").trim() === "제외") continue;
            const key = norm(getVal(r));
            const g = uiGroups.get(key) || [];
            const target = (g.length >= 2 && g[0]?.id !== r.id) ? "머지" : "분석";
            toCall.set(r.id, target);
        }

        const affectedIds = new Set();
        for (const id of changedIds) {
            const r = rows.find(x => Number(x.id) === id);
            if (!r) continue;
            const oldKey = norm(r.merge_qnum);
            const newKey = norm(getVal(r));
            (serverGroups.get(oldKey) || []).forEach(x => affectedIds.add(Number(x.id)));
            (uiGroups.get(newKey) || []).forEach(x => affectedIds.add(Number(x.id)));
        }

        for (const r of rows) {
            if (!affectedIds.has(Number(r.id))) continue;
            if (String(r?.useYN ?? "").trim() === "제외") continue;
            if (isLocked(r)) continue;

            const key = norm(getVal(r));
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
                rows.map(r => [r.id, getVal(r)])
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

            setSelectedRowIds(new Set());
            handleSearch?.();
            pendingFlushRef.current = true;
        } catch (e) {
            console.error(e);
            modal.showErrorAlert("에러", "저장 중 오류가 발생했습니다.");
        }
    };
    sendMergeAllRef.current = sendMergeAll;

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

    const bulkSetExcluded = async (excluded) => {
        const rows = dataState?.data ?? [];
        const prev = new Map(excludedById);
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

    const toggleGroupExcluded = useCallback(async (groupList, shouldExclude) => {
        if (blockWhenDirty()) return;
        for (const r of groupList) {
            if (!isLocked(r)) {
                setExcluded(r, shouldExclude);
                try {
                    await sendAnalysis({ scope: "row", excluded: shouldExclude, id: r?.id, refresh: false });
                } catch (e) {
                    console.error(e);
                }
            }
        }
    }, [blockWhenDirty, isLocked, sendAnalysis, setExcluded]);

    const toggleGroupLock = useCallback(async (groupList, shouldLock) => {
        if (blockWhenDirty()) return;
        for (const r of groupList) {
            if (!isExcluded(r)) {
                const prev = isLocked(r);
                setRowLocked(r, shouldLock);
                try {
                    await (shouldLock ? lockApi.lockOne(r?.id) : lockApi.unlockOne(r?.id));
                } catch (e) {
                    setRowLocked(r, prev);
                    console.error(e);
                }
            }
        }
    }, [blockWhenDirty, isExcluded, isLocked, lockApi, setRowLocked]);

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
                    cell={StatusTextCell}
                />
            );
        }
        if (c.field === 'tokens_text') {
            return (
                <Column
                    key={c.field}
                    field={proxyField?.[c.field] ?? `__sort__${c.field}`}
                    title={c.title}
                    width={c.width}
                    sortable
                    columnMenu={undefined}
                    cell={TokensCell}
                />
            );
        }
        if (c.field === 'status_cnt_duplicated' || c.field === 'status_cnt_fin') {
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
        if (c.field === 'merge_qnum') {
            return (
                <Column
                    key={c.field}
                    field={c.field}
                    title={c.title || "문항통합"}
                    width={c.width ?? '125px'}
                    sortable={false}
                    filterable={false}
                    columnMenu={undefined}
                    headerCell={MergeHeaderCell}
                    cell={MergeDisplayCell}
                />
            );
        }
        if (c.field === 'question_fin' || c.field === 'question_orig' || c.field === 'question') {
            return (
                <Column
                    key={`${c.group}:${c.field}`}
                    field={c.field}
                    title={c.title}
                    width={c.width}
                    sortable={false}
                    filterable={false}
                    columnMenu={undefined}
                    cell={WrapCellComponent}
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

    const startGroupingWithMaster = useCallback((masterRow) => {
        setLinkingMasterRow(masterRow);
    }, []);

    const applyGroupToRow = useCallback((targetRow, masterRow) => {
        if (!targetRow || !masterRow) return;
        const masterVal = norm(getMergeVal(masterRow) || masterRow.qnum_text || masterRow.qnum);
        setMergeEditsById(prev => {
            const next = new Map(prev);
            next.set(targetRow.id, masterVal);
            return next;
        });
    }, [getMergeVal, norm, setMergeEditsById]);

    const unmergeRow = useCallback((row) => {
        if (!row) return;
        setMergeEditsById(prev => {
            const next = new Map(prev);
            const orig = norm(row.qnum_text || row.qnum);
            next.set(row.id, orig);
            return next;
        });
    }, [norm, setMergeEditsById]);

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
        openMasterEditPopover,
        toggleGroupExpand, toggleGroupSelect, toggleGroupExcluded, toggleGroupLock,
        getMergeChanges, sendMergeAll: () => sendMergeAllRef.current?.()
    }), [isExcluded, isLocked, isMergeRow, toggleExcluded, bulkSetExcluded, goOpenSetting, blockWhenDirty, bulkSetLock, toggleRowLock, dataWithProxies.length, actions, getMergeVal, setMergeVal, mergeSavedBaseline, norm, userPerm, popupMode, popupShow, popupRow, selectedRowIds, toggleRowSelect, toggleAllSelect, isAllSelected, linkingMasterRow, setLinkingMasterRow, startGroupingWithMaster, applyGroupToRow, unmergeRow, unmergeGroup, dupGroups, openMasterEditPopover, toggleGroupExpand, toggleGroupSelect, toggleGroupExcluded, toggleGroupLock, getMergeChanges]);

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
                /* 문항통합 그룹 좌측 세로 바 및 배경 틴트 스타일 */
                .tr-group-master-expanded td {
                    background-color: #fffbf5 !important;
                }
                .tr-group-master-expanded td:first-child {
                    border-left: 4px solid #ea580c !important;
                }

                .tr-group-child td {
                    background-color: #fafaf9 !important;
                }
                .tr-group-child td:first-child {
                    border-left: 4px solid #ea580c !important;
                }
                .tr-group-child:hover td {
                    background-color: #fff7ed !important;
                }

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
                title="문항 목록"
                tooltip={`문항 목록|체크박스를 이용한 선택문항 통합 & 통합해제 및 삭제 기능`}
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

            <div className="pro-list-content" style={{ paddingBottom: selectedRowIds.size > 0 ? '48px' : '20px', transition: 'padding-bottom 0.2s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <GridDataCount total={filteredCount} />
                    </div>

                    {/* 오른쪽 컨트롤: 토글 버튼 + 실시간 검색창 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* 1번: 그룹 모두 펼치기 / 접기 토글 버튼 */}
                        {dupGroups.firstOfGroup.size > 0 && (() => {
                            const isExpanded = expandedGroupKeys.size > 0;
                            return (
                                <button
                                    type="button"
                                    onClick={toggleAllGroups}
                                    style={{
                                        height: '32px',
                                        padding: '0 10px',
                                        fontSize: '11.5px',
                                        fontWeight: isExpanded ? 500 : 600,
                                        borderRadius: '6px',
                                        border: isExpanded ? '1px solid #cbd5e1' : '1px solid #fdba74',
                                        backgroundColor: isExpanded ? '#ffffff' : '#fff7ed',
                                        color: isExpanded ? '#475569' : '#c2410c',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        transition: 'all 0.15s ease',
                                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                                    }}
                                    title={isExpanded ? "모든 통합 문항 그룹 접기" : "모든 통합 문항 그룹 펼치기"}
                                >
                                    {isExpanded ? <Minus size={13} strokeWidth={2.5} /> : <Plus size={13} strokeWidth={2.5} />}
                                    <span>{isExpanded ? "모두 접기" : "모두 펼치기"}</span>
                                </button>
                            );
                        })()}

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
            </div>

                <div className="pro-list-card">
                    <div className="cmn_gird_wrap">
                        <div id="grid_01" className="cmn_grid multihead">
                            <ProListGridContext.Provider value={ctxValue}>
                                <KendoGrid
                                    parentProps={{
                                        height: "100%",
                                        data: displayData,
                                        disableInternalSort: true,
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
                                        rowRender: rowRender,
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

            {batchMergePopupShow && (
                <ProListBatchMergePopup
                    show={batchMergePopupShow}
                    onClose={() => setBatchMergePopupShow(false)}
                    selectedRows={batchMergeRows}
                    onConfirm={handleBatchMergeConfirm}
                />
            )}

            {batchEditQuestionPopupShow && (
                <ProListBatchQuestionEditPopup
                    show={batchEditQuestionPopupShow}
                    onClose={() => setBatchEditQuestionPopupShow(false)}
                    selectedRows={batchEditQuestionRows}
                    onConfirm={handleBatchEditQuestionConfirm}
                />
            )}

            {/* 하단 마우스 오버 / 누름(Active) 절제된 미세 피드백 스타일 */}
            <style>{`
                .bulk-dock-btn {
                    transition: all 0.15s ease !important;
                }
                .bulk-dock-btn:not(:disabled):hover {
                    transform: translateY(-1px) !important;
                }
                .bulk-dock-btn:not(:disabled):active {
                    transform: scale(0.98) !important;
                }

                .bulk-dock-btn-analysis:hover {
                    background-color: #f0f9ff !important;
                    border-color: #0284c7 !important;
                    box-shadow: 0 3px 8px rgba(2, 132, 199, 0.2) !important;
                }
                .bulk-dock-btn-exclude:hover {
                    background-color: #fef2f2 !important;
                    border-color: #dc2626 !important;
                    box-shadow: 0 3px 8px rgba(220, 38, 38, 0.2) !important;
                }
                .bulk-dock-btn-merge:not(:disabled):hover {
                    background-color: #ffedd5 !important;
                    border-color: #ea580c !important;
                    box-shadow: 0 3px 10px rgba(249, 115, 22, 0.25) !important;
                }
                .bulk-dock-btn-lock:hover {
                    background-color: #f8fafc !important;
                    border-color: #334155 !important;
                    box-shadow: 0 3px 8px rgba(51, 65, 85, 0.15) !important;
                }
                .bulk-dock-btn-close:hover {
                    background-color: #e2e8f0 !important;
                    color: #0f172a !important;
                }
            `}</style>

            {/* 하단 기능 그룹별 세로 구분선 적용 일괄 처리 닥 */}
            {selectedRowIds.size > 0 && (() => {
                const canWrite = hasPerm(userPerm, PERM.WRITE);
                const canManage = hasPerm(userPerm, PERM.MANAGE);

                return (
                    <div
                        className="floating-bulk-dock-container"
                        style={{
                            position: 'fixed',
                            bottom: '32px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 100,
                            backgroundColor: '#ffffff',
                            border: '2px solid #ea580c',
                            color: '#0f172a',
                            padding: '9px 18px',
                            borderRadius: '16px',
                            boxShadow: '0 12px 32px -4px rgba(234, 88, 12, 0.35), 0 4px 16px rgba(0, 0, 0, 0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '13px',
                            fontWeight: 600,
                            animation: 'fadeInUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                            backdropFilter: 'blur(12px)'
                        }}
                    >
                        {/* 0. 선택 갯수 안내 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingRight: '10px', borderRight: (canWrite || canManage) ? '1.5px solid #fed7aa' : 'none', height: '32px' }}>
                            <span style={{ backgroundColor: '#ea580c', color: '#ffffff', borderRadius: '12px', padding: '3px 9px', fontSize: '12px', fontWeight: 800, boxShadow: '0 2px 6px rgba(234, 88, 12, 0.35)' }}>
                                {selectedRowIds.size}
                            </span>
                            <span style={{ color: '#ea580c', fontWeight: 800, fontSize: '13px', letterSpacing: '-0.3px' }}>개 선택됨</span>
                        </div>

                        {/* 1. ADMIN 그룹: 분석 지정 & 제외 지정 (WRITE 이상) */}
                        {canWrite && (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {/* ✓ 분석 지정 */}
                                    <button
                                        type="button"
                                        className="bulk-dock-btn bulk-dock-btn-analysis"
                                        onClick={() => handleBulkSetUseYn(false)}
                                        style={{
                                            height: '32px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '5px',
                                            backgroundColor: '#f0f9ff',
                                            border: '1.5px solid #0284c7',
                                            color: '#0284c7',
                                            padding: '0 12px',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            boxSizing: 'border-box'
                                        }}
                                        title="선택한 문항을 분석 대상으로 지정"
                                    >
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <polyline points="9 12 11.5 14.5 15.5 9.5"></polyline>
                                        </svg>
                                        <span>분석 지정</span>
                                    </button>

                                    {/* 🚫 제외 지정 */}
                                    <button
                                        type="button"
                                        className="bulk-dock-btn bulk-dock-btn-exclude"
                                        onClick={() => handleBulkSetUseYn(true)}
                                        style={{
                                            height: '32px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '5px',
                                            backgroundColor: '#fef2f2',
                                            border: '1.5px solid #dc2626',
                                            color: '#dc2626',
                                            padding: '0 12px',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            boxSizing: 'border-box'
                                        }}
                                        title="선택한 문항을 분석 제외 대상으로 지정"
                                    >
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                                        </svg>
                                        <span>제외 지정</span>
                                    </button>
                                </div>

                                {/* 구분 세로선 1 */}
                                <div style={{ width: '1px', height: '18px', backgroundColor: '#fed7aa', margin: '0 3px' }} />
                            </>
                        )}

                        {/* 2. 문항통합 & 문항수정 그룹 (MANAGE 이상) */}
                        {canManage && (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <button
                                        type="button"
                                        className="bulk-dock-btn bulk-dock-btn-merge"
                                        onClick={handleMergeSelectedFromBar}
                                        disabled={selectedRowIds.size < 2}
                                        style={{
                                            height: '32px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            backgroundColor: selectedRowIds.size >= 2 ? '#fff7ed' : '#f8fafc',
                                            color: selectedRowIds.size >= 2 ? '#ea580c' : '#94a3b8',
                                            border: selectedRowIds.size >= 2 ? '2px solid #ea580c' : '1px solid #cbd5e1',
                                            padding: '0 14px',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            cursor: selectedRowIds.size >= 2 ? 'pointer' : 'not-allowed',
                                            boxShadow: selectedRowIds.size >= 2 ? '0 2px 8px rgba(234, 88, 12, 0.25)' : 'none',
                                            boxSizing: 'border-box'
                                        }}
                                        title={selectedRowIds.size < 2 ? '2개 이상의 문항을 선택하면 통합(묶기)할 수 있습니다.' : '선택한 문항들을 하나의 그룹으로 통합(묶기)'}
                                    >
                                        <Link size={13} style={{ color: selectedRowIds.size >= 2 ? '#ea580c' : '#94a3b8' }} />
                                        <span>선택문항 통합 (묶기)</span>
                                    </button>

                                    <button
                                        type="button"
                                        className="bulk-dock-btn bulk-dock-btn-merge"
                                        onClick={handleBatchEditQuestionFromBar}
                                        disabled={selectedRowIds.size < 1}
                                        style={{
                                            height: '32px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            backgroundColor: selectedRowIds.size >= 1 ? '#ffffff' : '#f8fafc',
                                            color: selectedRowIds.size >= 1 ? '#ea580c' : '#94a3b8',
                                            border: selectedRowIds.size >= 1 ? '1.5px solid #ea580c' : '1px solid #cbd5e1',
                                            padding: '0 13px',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            cursor: selectedRowIds.size >= 1 ? 'pointer' : 'not-allowed',
                                            boxShadow: selectedRowIds.size >= 1 ? '0 2px 8px rgba(234, 88, 12, 0.15)' : 'none',
                                            boxSizing: 'border-box'
                                        }}
                                        title={selectedRowIds.size < 1 ? '수정할 문항을 선택해 주세요.' : '선택한 문항의 문항최종 일괄 수정'}
                                    >
                                        <Edit3 size={13} style={{ color: selectedRowIds.size >= 1 ? '#ea580c' : '#94a3b8' }} />
                                        <span>문항 수정</span>
                                    </button>
                                </div>

                                {/* 구분 세로선 2 */}
                                <div style={{ width: '1px', height: '18px', backgroundColor: '#fed7aa', margin: '0 3px' }} />
                            </>
                        )}

                        {/* 3. 수정 그룹: 잠금 & 해제 (MANAGE 이상) */}
                        {canManage && (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {/* 🔒 일괄 잠금 */}
                                    <button
                                        type="button"
                                        className="bulk-dock-btn bulk-dock-btn-lock"
                                        onClick={() => handleBulkSetLockSelected(true)}
                                        style={{
                                            height: '32px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '5px',
                                            backgroundColor: '#ffffff',
                                            border: '1.5px solid #475569',
                                            color: '#334155',
                                            padding: '0 11px',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            boxSizing: 'border-box'
                                        }}
                                        title="선택한 문항 잠금"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                        </svg>
                                        <span>잠금</span>
                                    </button>

                                    {/* 🔓 일괄 잠금 해제 */}
                                    <button
                                        type="button"
                                        className="bulk-dock-btn bulk-dock-btn-lock"
                                        onClick={() => handleBulkSetLockSelected(false)}
                                        style={{
                                            height: '32px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '5px',
                                            backgroundColor: '#ffffff',
                                            border: '1.5px solid #475569',
                                            color: '#334155',
                                            padding: '0 11px',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            boxSizing: 'border-box'
                                        }}
                                        title="선택한 문항 잠금 해제"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                            <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
                                        </svg>
                                        <span>해제</span>
                                    </button>
                                </div>

                                {/* 구분 세로선 3 */}
                                <div style={{ width: '1px', height: '18px', backgroundColor: '#fed7aa', margin: '0 3px' }} />
                            </>
                        )}

                        {/* 4. 일괄 삭제 (MANAGE 이상) */}
                        {canManage && (
                            <>
                                <button
                                    type="button"
                                    className="bulk-dock-btn bulk-dock-btn-delete"
                                    onClick={handleDeleteSelected}
                                    style={{
                                        height: '32px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '5px',
                                        backgroundColor: '#fff1f2',
                                        border: '1.5px solid #f43f5e',
                                        color: '#e11d48',
                                        padding: '0 11px',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        boxSizing: 'border-box'
                                    }}
                                    title="선택한 문항 삭제"
                                >
                                    <Trash2 size={13} style={{ color: '#e11d48' }} />
                                    <span>삭제</span>
                                </button>

                                {/* 구분 세로선 4 */}
                                <div style={{ width: '1px', height: '18px', backgroundColor: '#fed7aa', margin: '0 1px 0 3px' }} />
                            </>
                        )}

                    {/* 5. 선택 해제 */}
                    <button
                        type="button"
                        className="bulk-dock-btn bulk-dock-btn-close"
                        onClick={() => setSelectedRowIds(new Set())}
                        style={{
                            height: '32px',
                            width: '32px',
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            color: '#475569',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                            borderRadius: '50%',
                            boxSizing: 'border-box'
                        }}
                        title="선택 초기화"
                    >
                        <X size={14} />
                    </button>
                </div>
            );
        })()}
        </div>
    );
};

export default React.memo(ProList2GridRenderer);
