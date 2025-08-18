import { Button } from "@progress/kendo-react-buttons";

const DetailButton = ({ gridProps, cellProps }) => {
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
            <Button className={"btnM"}
                    themeColor={"primary"}
                    onClick={() => handleDetail(cellProps, gridProps)}>보기</Button>

        </td>
    );
};

export default DetailButton;