import React from 'react';
import { PageHeader } from '@/components/common/layout';
import './AiDataHeader.css';

const AiDataHeader = ({
    title,
    tooltip,
    children,
    onAdd,
    addButtonLabel = "추가",
    onSave,
    saveButtonLabel = "저장",
    saveButtonDisabled = false,
    onEdit,
    editButtonLabel = "수정",
    onDelete,
    deleteButtonLabel = "삭제",
    onSearch,
    className = ""
}) => {
    return (
        <PageHeader
            className={`ai-data-header-container ${className}`}
            title={title}
            infoTooltip={tooltip}
            onAdd={onAdd}
            addLabel={addButtonLabel}
            onSave={onSave}
            saveLabel={saveButtonLabel}
            saveDisabled={saveButtonDisabled}
            onDelete={onDelete}
            deleteLabel={deleteButtonLabel}
            onSearch={onSearch}
            actions={
                onEdit ? (
                    <button
                        type="button"
                        onClick={onEdit}
                        className="cmn-btn cmn-btn-outline"
                    >
                        <span>{editButtonLabel}</span>
                    </button>
                ) : null
            }
        >
            {children}
        </PageHeader>
    );
};

export default AiDataHeader;
