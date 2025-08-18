import CustomGrid from "@/components/kendo/CustomGrid";

const GridArea = (props) => {
    return (
        <div className="cmn_gird_wrap">
            <CustomGrid {...props} />
        </div>
    );
};

export default GridArea;
