import React, { Fragment } from "react";
import DataHeader from "@/services/dataStatus/components/DataHeader";

const AddQuestionWrapperView = () => {
    return (
        <div className="hsrt-page" data-theme="data-dashboard" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <DataHeader title="문항추가" />
            <div style={{ padding: '24px', flex: 1 }}>
                <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <p>문항추가 기능 개발 예정입니다.</p>
                </div>
            </div>
        </div>
    );
};

export default AddQuestionWrapperView;
