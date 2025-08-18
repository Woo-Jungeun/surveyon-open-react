import { Button } from "@progress/kendo-react-buttons";

const GridHeaderBtnTxt = ({ children, ...props }) => {
    return (
        <Button className="btnM btnTxt" {...props}>
            {children}
        </Button>
    );
};

export default GridHeaderBtnTxt;
