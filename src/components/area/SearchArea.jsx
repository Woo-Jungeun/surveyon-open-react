import CustomSearch from "@/components/kendo/CustomSearch";
import { Button } from "@progress/kendo-react-buttons";
import { Fragment } from "react";

const SearchArea = ({ columns, ...options }) => {
    return (({ onSearch, onChange }) => {
        return (
            <Fragment>
                <CustomSearch columns={columns} onChange={onChange} />
                <Button className={"wfull btnL"} themeColor={"primary"} onClick={onSearch}>
                    조회
                </Button>
            </Fragment>
        );
    })(options);
};

export default SearchArea;
