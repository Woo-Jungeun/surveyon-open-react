import React from "react";
import DpRequestPage from "@/services/dataStatus/app/hsrt/dpRequest/DpRequestPage";

const DpRequestWrapperView = () => {
    return (
        <div className="hsrt-page" data-theme="data-dashboard" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <DpRequestPage />
        </div>
    );
};

export default DpRequestWrapperView;
