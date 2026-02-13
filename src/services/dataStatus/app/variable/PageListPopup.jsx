import React, { useState } from "react";
import ReactDOM from 'react-dom';
import { X, Layout } from 'lucide-react';
import KendoGrid from "@/components/kendo/KendoGrid.jsx";
import { GridColumn as Column } from "@progress/kendo-react-grid";
import "./PageListPopup.css";

const PageListPopup = ({ isOpen, onClose, data, onSelect }) => {
    if (!isOpen) return null;

    const [columns] = useState([
        { field: "id", title: "페이지 ID", width: "300px" },
        { field: "merge_pn", title: "페이지 번호", width: "150px" },
        { field: "title", title: "제목" }
    ]);

    const onRowClick = (e) => {
        onSelect(e.dataItem);
    };

    return ReactDOM.createPortal(
        <div className="pl-modal-overlay">
            <div className="pl-modal-container">
                <div className="pl-modal-header">
                    <div className="pl-header-title">
                        <Layout size={20} className="pl-header-icon" />
                        <span style={{ fontSize: "20px" }}>페이지 목록</span>
                    </div>
                    <button className="pl-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <div className="pl-modal-content">
                    <div className="pl-content-wrapper">
                        <div className="cmn_grid singlehead" style={{ height: "100%" }}>
                            <KendoGrid
                                parentProps={{
                                    data: data,
                                    dataItemKey: "pageid",
                                    style: { height: "100%", border: "none" },
                                    sortable: true,
                                    scrollable: "scrollable",
                                    onRowClick: onRowClick,
                                }}
                            >
                                {columns.map((c) => (
                                    <Column
                                        key={c.field}
                                        field={c.field}
                                        title={c.title}
                                        width={c.width}
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
