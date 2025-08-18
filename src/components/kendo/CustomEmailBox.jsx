import { Fragment, useLayoutEffect, useState } from "react";
import { Input } from "@progress/kendo-react-inputs";

/**
 * 이메일 입력 컴포넌트<br />
 *
 * @author dhwon
 * @since 2024-05-14<br />
 */
const CustomEmailBox = ({
    inputEmailValue = "", // 입력된 이메일
    onChangeFunc,
    style,
    ...options
}) => {

    //value state 설정
    const [value, setValue] = useState("");

    useLayoutEffect(() => {
        updateData();
    }, [inputEmailValue]);

    //데이터 업데이트
    const updateData = () => {
        setValue(inputEmailValue);
    };

    //onchange 이벤트 핸들러 
    const onChange = (event) => {
        setValue(value);
        if (onChangeFunc && onChangeFunc instanceof Function) {
            onChangeFunc(event);
        }
    };

    return (({ className, disabled }) => {
        return (
            <Fragment>
                <Input
                    style={style}
                    className={className}
                    placeholder={"myid@gmail.com"}
                    pattern={"[^@]*@[^@]*\\.[a-zA-Z]{2,3}"}
                    validationMessage={"이메일 형식으로 작성하지 않았습니다."}
                    maxByte={50}
                    value={value}
                    onChange={onChange}
                    onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                    disabled={disabled}
                />
            </Fragment>
        );
    })(options);
};
export default CustomEmailBox;
