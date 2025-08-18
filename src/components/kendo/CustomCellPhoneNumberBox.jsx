import { Fragment, useLayoutEffect, useState } from "react";
import { Input } from "@progress/kendo-react-inputs";
/**
 * 휴대폰 입력 컴포넌트<br />
 *
 * @author jewoo
 * @since 2024-03-28<br />
 */
const CustomCellPhoneNumberBox = ({
    inputPhoneNumber, // 입력된 휴대폰 번호
    onChangeFunc,
    style,
    ...options
}) => {
    // 반드시 null 체크 할것 ====================================================================
    inputPhoneNumber = inputPhoneNumber || null;
    // =========================================================================================
    //value state 설정
    const [value, setValue] = useState("");

    useLayoutEffect(() => {
        if (inputPhoneNumber !== null) {
            updateData();
        }
    }, [inputPhoneNumber]);

    /**
     * 데이터 업데이트 <br />
     *
     * @author jewoo
     * @since 2024-03-28<br />
     */
    const updateData = () => {
        setValue(inputPhoneNumber);
    };

    /**
     * onchange 이벤트 핸들러 <br />
     *
     * @author jewoo
     * @since 2024-03-28<br />
     */
    const onChange = (event) => {
        const value = event.value.replace(/[^0-9|-]/g, "");
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
                    placeholder={"010-1234-1234 (`-` 포함)"}
                    pattern={"01[0-9]{1}-[0-9]{3,4}-[0-9]{4}"}
                    validationMessage={"핸드폰 형식이 아니거나, '-'를 작성하지 않았습니다. 예시) 010-1234-1234"}
                    maxByte={13}
                    value={value}
                    onChange={onChange}
                    onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                    disabled={disabled}
                />
            </Fragment>
        );
    })(options);
};
export default CustomCellPhoneNumberBox;
