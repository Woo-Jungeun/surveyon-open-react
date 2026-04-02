import React, { useState, useCallback, useMemo, useEffect, useContext } from "react";
import ReactDOM from 'react-dom';
import { X, Layout, Plus, Edit2, Check, X as XIcon, Trash2 } from 'lucide-react';
import KendoGrid from "@/components/kendo/KendoGrid.jsx";
import { GridColumn as Column } from "@progress/kendo-react-grid";
import { useSelector } from "react-redux";
import { VariablePageApi } from "./VariablePageApi";
import { modalContext } from "@/components/common/Modal.jsx";
import "./PageListPopup.css";

const TitleEditCell = (props) => {
    const { dataItem, field, className, style, editingRowId, onTitleChange } = props;
    const displayValue = dataItem[field] || dataItem.name || '';
    const [inputValue, setInputValue] = useState(displayValue);

    const isEditing = editingRowId === dataItem.pageid;

    useEffect(() => {
        if (isEditing) {
            setInputValue(dataItem[field] || dataItem.name || '');
        }
    }, [isEditing]);

    const handleChange = (e) => {
        const val = e.target.value;
        setInputValue(val); // 로컬 상태만 갱신 (한글 잘림 방지)
        onTitleChange(val); // 그리드 재렌더링 없이 부모 Ref에만 값 전달
    };

    if (isEditing) {
        return (
            <td className={className} style={{ ...style, padding: '4px 8px' }} onClick={(e) => e.stopPropagation()}>
                <input
                    type="text"
                    value={inputValue}
                    onChange={handleChange}
                    className="pl-edit-input"
                    autoFocus={dataItem.isNew}
                    placeholder="대시보드 제목을 입력하세요."
                />
            </td>
        );
    }
    return <td className={className} style={style}>{displayValue}</td>;
};

const ActionCell = (props) => {
    const { dataItem, editingRowId, onEdit, onSave, onCancel, className, style } = props;
    const isEditing = editingRowId === dataItem.pageid;

    if (isEditing) {
        return (
            <td className={className} style={{ ...style, padding: '4px 8px' }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                    <button onClick={() => onSave(dataItem)} className="pl-action-btn primary" style={{ padding: '4px 8px', fontSize: '12px' }}>저장</button>
                    <button onClick={() => onCancel(dataItem)} className="pl-action-btn" style={{ padding: '4px 8px', fontSize: '12px' }}>취소</button>
                </div>
            </td>
        );
    }
    return (
        <td className={className} style={{ ...style, padding: '4px 8px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                <button onClick={() => onEdit(dataItem)} className="pl-action-btn" style={{ padding: '4px 8px', fontSize: '12px' }} title="수정">수정</button>
                <button onClick={() => props.onDelete(dataItem)} className="pl-action-btn" style={{ padding: '4px', color: '#ef4444' }} title="삭제">
                    <Trash2 size={14} />
                </button>
            </div>
        </td>
    );
};

const PageListPopup = ({ isOpen, onClose, data, onSelect }) => {
    const auth = useSelector((store) => store.auth);
    const { pageSet, pageList, pageDelete } = VariablePageApi();
    const modal = useContext(modalContext);

    const draftTitleRef = React.useRef("");
    const [editingRowId, setEditingRowId] = useState(null);
    const [localData, setLocalData] = useState(() => {
        return (data || []).map(item => {
            const mPn = item.merge_pn || item.pn || sessionStorage.getItem("merge_pn") || "";
            return {
                ...item,
                merge_pn: mPn,
                originalTitle: item.title,
                pageid: item.page_id || item.pageid || item.id || `temp_${Math.random()}`
            };
        });
    });

    useEffect(() => {
        if (isOpen) {
            const initialData = (data || []).map(item => {
                const mPn = item.merge_pn || item.pn || sessionStorage.getItem("merge_pn") || "";
                return {
                    ...item,
                    merge_pn: mPn,
                    originalTitle: item.title,
                    pageid: item.page_id || item.pageid || item.id || `temp_${Math.random()}`
                };
            });
            setLocalData(initialData);
            setEditingRowId(null);
        }
    }, [isOpen, data]);

    const handleAddRow = () => {
        const tempId = `temp_${Date.now()}`;
        const currentMergePn = sessionStorage.getItem("merge_pn") || (localData.length > 0 ? (localData[0].merge_pn || localData[0].pn) : "");

        const newRow = {
            id: "-",
            merge_pn: currentMergePn,
            title: "",
            originalTitle: "",
            isNew: true,
            pageid: tempId
        };
        setLocalData([...localData, newRow]);
        setEditingRowId(tempId);
        draftTitleRef.current = "";
    };

    const handleTitleChange = useCallback((newValue) => {
        draftTitleRef.current = newValue;
    }, []);

    const handleEditRow = useCallback((dataItem) => {
        setEditingRowId(dataItem.pageid);
        draftTitleRef.current = dataItem.title || dataItem.name || "";
    }, []);

    const handleSaveRow = useCallback(async (dataItem) => {
        const finalTitle = draftTitleRef.current;
        try {
            const payload = {
                title: finalTitle,
                pn: dataItem.merge_pn,
                parent_id: null,
                user: auth?.user?.userId
            };

            // 기존 대시보드 수정일 경우 pageid 추가
            if (!dataItem.isNew) {
                payload.pageid = dataItem.page_id || dataItem.pageid || dataItem.id;
            }

            const result = await pageSet.mutateAsync(payload);

            if (result?.success === "777") {
                // 저장 성공 시 목록 재조회
                const refreshRes = await pageList.mutateAsync({ user: auth?.user?.userId, pn: dataItem.merge_pn });

                if (refreshRes?.success === "777" && refreshRes.resultjson) {
                    setLocalData(refreshRes.resultjson.map(item => {
                        const mPn = item.merge_pn || item.pn || sessionStorage.getItem("merge_pn") || "";
                        return {
                            ...item,
                            merge_pn: mPn,
                            originalTitle: item.title,
                            pageid: item.page_id || item.pageid || item.id || `temp_${Math.random()}`
                        };
                    }));
                } else {
                    // 재조회 실패 시 로컬 값으로 임시 대체 (Fallback)
                    setLocalData(prevData => prevData.map(item => {
                        if (item.pageid === dataItem.pageid) {
                            return {
                                ...item,
                                isNew: false,
                                title: finalTitle,
                                originalTitle: finalTitle,
                                id: dataItem.isNew ? result.resultjson?.[0]?.pageid || "-" : item.id
                            };
                        }
                        return item;
                    }));
                }

                setEditingRowId(null);
                modal.showAlert("알림", "저장되었습니다.");
            } else {
                modal.showErrorAlert("오류", result?.message || "저장에 실패했습니다.");
            }
        } catch (error) {
            console.error(error);
            modal.showErrorAlert("오류", "저장 중 오류가 발생했습니다.");
        }
    }, [auth, pageSet, modal]);

    const handleCancelRow = useCallback((dataItem) => {
        if (dataItem.isNew) {
            setLocalData(prevData => prevData.filter(item => item.pageid !== dataItem.pageid));
        } else {
            setLocalData(prevData => prevData.map(item => {
                if (item.pageid === dataItem.pageid) {
                    return { ...item, title: item.originalTitle };
                }
                return item;
            }));
        }
        setEditingRowId(null);
    }, []);

    const handleDeleteRow = useCallback((dataItem) => {
        if (dataItem.isNew) {
            // 새로 추가 중인 행이면 바로 삭제
            setLocalData(prevData => prevData.filter(item => item.pageid !== dataItem.pageid));
            if (editingRowId === dataItem.pageid) {
                setEditingRowId(null);
            }
            return;
        }

        modal.showConfirm("알림", "선택한 대시보드를 삭제하시겠습니까?", {
            btns: [
                { title: "취소", background: "#75849a" },
                {
                    title: "삭제",
                    click: async () => {
                        try {
                            const payload = {
                                pageid: dataItem.pageid || dataItem.id,
                                user: auth?.user?.userId
                            };
                            const result = await pageDelete.mutateAsync(payload);

                            if (result?.success === "777") {
                                // 삭제 성공 시 화면에서 해당 줄 제거
                                setLocalData(prevData => prevData.filter(item =>
                                    (item.pageid !== dataItem.pageid && item.id !== dataItem.id)
                                ));
                                if (editingRowId === dataItem.pageid) {
                                    setEditingRowId(null);
                                }

                                // 만약 현재 선택(작업) 중인 대시보드를 삭제했다면 세션 데이터 초기화
                                const currentSessionPageId = sessionStorage.getItem("pageId");
                                if (currentSessionPageId === payload.pageid) {
                                    sessionStorage.setItem("pageId", "");
                                    sessionStorage.setItem("pagetitle", "");
                                    window.dispatchEvent(new Event("pageSelected")); // 다른 컴포넌트(메뉴/사이드바) 업데이트용 신호
                                }

                                modal.showAlert("알림", "삭제되었습니다.");
                            } else {
                                modal.showErrorAlert("오류", result?.message || "삭제에 실패했습니다.");
                            }
                        } catch (error) {
                            console.error("삭제 중 오류 발생:", error);
                            modal.showErrorAlert("오류", "삭제 중 오류가 발생했습니다.");
                        }
                    },
                },
            ],
        });
    }, [auth, pageDelete, modal, editingRowId]);

    const ActionCellWrapper = useCallback((props) => (
        <ActionCell {...props} editingRowId={editingRowId} onEdit={handleEditRow} onSave={handleSaveRow} onCancel={handleCancelRow} onDelete={handleDeleteRow} />
    ), [editingRowId, handleEditRow, handleSaveRow, handleCancelRow, handleDeleteRow]);

    const columns = useMemo(() => [
        // { field: "id", title: "대시보드 ID", width: "300px" },
        // { field: "merge_pn", title: "대시보드 번호", width: "150px" },
        {
            field: "title",
            title: "제목",
            cell: (props) => <TitleEditCell {...props} editingRowId={editingRowId} onTitleChange={handleTitleChange} />
        },
        {
            field: "created_at",
            title: "생성일",
            width: "170px",
            cell: (props) => {
                const val = props.dataItem[props.field];
                if (!val || val === "-") return <td className={props.className}>-</td>;
                let displayVal = String(val);
                if (displayVal.includes('T')) displayVal = displayVal.replace('T', ' ');
                if (displayVal.includes('.')) displayVal = displayVal.split('.')[0];
                return <td className={props.className} style={props.style}>{displayVal}</td>;
            }
        },
        {
            title: "편집",
            width: "120px",
            headerClassName: "k-header-center",
            cell: ActionCellWrapper
        }
    ], [editingRowId, handleTitleChange, ActionCellWrapper]);

    const onRowClick = useCallback((e) => {
        if (!editingRowId) {
            onSelect(e.dataItem);
        }
    }, [onSelect, editingRowId]);

    const parentProps = useMemo(() => ({
        data: localData,
        dataItemKey: "pageid",
        style: { height: "100%", border: "none" },
        sortable: true,
        scrollable: "scrollable",
        onRowClick: onRowClick,
    }), [localData, onRowClick]);

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="pl-modal-overlay">
            <div className="pl-modal-container">
                <div className="pl-modal-header">
                    <div className="pl-header-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Layout size={20} className="pl-header-icon" />
                            <span style={{ fontSize: "20px" }}>대시보드 목록</span>
                        </div>
                        <div className="pl-header-actions">
                            <button onClick={handleAddRow} className="pl-action-btn primary" title="대시보드 추가">
                                <Plus size={14} /> 추가
                            </button>
                        </div>
                    </div>
                    <button className="pl-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <div className="pl-modal-content">
                    <div className="pl-content-wrapper">
                        <div className="cmn_grid singlehead" style={{ height: "100%" }}>
                            <KendoGrid
                                parentProps={parentProps}
                            >
                                {columns.map((c, idx) => (
                                    <Column
                                        key={c.field || `col_${idx}`}
                                        field={c.field}
                                        title={c.title}
                                        width={c.width}
                                        cell={c.cell}
                                        headerClassName="k-header-center"
                                    />
                                ))}
                            </KendoGrid>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default PageListPopup;
