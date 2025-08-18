import { Button } from "@progress/kendo-react-buttons";

const GridHeaderBtnPrimary = ({ children, ...props }) => {
    return (
        <Button className="btnM" themeColor={"primary"} {...props}>
            {children}
        </Button>
    );
};

export default GridHeaderBtnPrimary;
