import { Button } from "@progress/kendo-react-buttons";
import { Link } from "react-router-dom";

const DetailLink = ({ gridProps, cellProps, to }) => {
    const handleDetail = (cellProps, { setPopupShow, setMode, setPopupValue }) => {
        setPopupShow(true);
        const newPopupValue = Object.entries(cellProps.dataItem).reduce((acc, entry) => {
            const [key, value] = entry;
            return { ...acc, [key]: value };
        }, {});
        setPopupValue(newPopupValue);
    };

    return (
        <td>
            <Link onClick={() => handleDetail(cellProps, gridProps)} to={to}>
                보기
            </Link>
        </td>
    );
};

export default DetailLink;
