import { useRef } from "react";
import { createPortal } from "react-dom";

const CompGridLoader = ({
    onDataReceived,
    dataState,
    gridId, //그리드에 id를 부여해서 해당 그리드 내부에 있는 로딩 엘리먼트를 선택하게 함.
    api, //그리드의 api
    ...options
}) => {
    // 반드시 null 체크 할것 ====================================================================

    //CompGrid에서 받아 오기 때문에 없을 수 없는 데이터들임

    // =========================================================================================

    return (({ autoLoad }) => {
        if (!api?.hasOwnProperty("mutateAsync")) return null;
        if (!autoLoad) return null;

        const lastSuccess = useRef("");
        const pending = useRef("");
        const requestDataIfNeeded = () => {
            if (pending.current || JSON.stringify(dataState) === lastSuccess.current) {
                return;
            }
            pending.current = JSON.stringify(dataState);

            api?.mutateAsync(dataState).then((response) => {
                const items = response.items;
                const total = response.totalSize;
                lastSuccess.current = pending.current;
                pending.current = "";
                if (JSON.stringify(dataState) === lastSuccess.current) {
                    onDataReceived.call(undefined, {
                        data: items,
                        total: total
                    });
                } else {
                    requestDataIfNeeded();
                }
            });
        };
        requestDataIfNeeded();
        return pending.current ? <LoadingPanel gridId={gridId} /> : null;
    })(options);
};

const LoadingPanel = ({ gridId }) => {
    const loadingPanel = (
        <div className="k-loading-mask">
            <span className="k-loading-text">Loading</span>
            <div className="k-loading-image" />
            <div className="k-loading-color" />
        </div>
    );
    const gridContent = document && document.querySelector(`#${gridId} .k-grid-content`);
    return gridContent ? createPortal(loadingPanel, gridContent) : loadingPanel;
};

export default CompGridLoader;
