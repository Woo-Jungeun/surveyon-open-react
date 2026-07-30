import AiReportPage from "@/services/dataStatus/app/hsrt/aiReport/AiReportPage";

const AiReportWrapperView = () => {
    return (
        <div className="hsrt-page" data-theme="data-dashboard" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <AiReportPage />
        </div>
    );
};

export default AiReportWrapperView;
