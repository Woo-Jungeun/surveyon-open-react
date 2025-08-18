import { useCallback, useEffect } from "react";
import { Input } from "@progress/kendo-react-inputs";
import { Error } from "@progress/kendo-react-labels";

export const RegExpTypes = Object.freeze({
    ID: new RegExp(/^[a-z][a-z0-9]{3,11}$/),
    PW: new RegExp(/^([a-z]+)([a-z0-9]){4,15}$/),
    NUMBER: new RegExp(/[^0-9]/, "g"),
    DECIMAL: new RegExp(/^\d*[.]\d{2}$/),
    EMAIL_DOMAIN: new RegExp(/[0-9a-zA-Z]([-_.]?[0-9a-zA-Z])*.[a-zA-Z]{2,3}$/, "i"),
    KOREAN: new RegExp(/^[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]*$/, "g"),
    NOT_ALPHABET: new RegExp(/[^A-Za-z]+/, "g")
});

/**
 * @className : CommonValidator
 * @description : validate를 실행한다.
 * @param value : 값
 * @param pattern : RegExp 정규식
 * @param message : string 에러메시지
 * @date : 2021-05-17 오후 5:32
 * @author : parksujin
 * @version : 1.0.0
 * @see
 * @history :
 **/
export const CommonValidator = (value, pattern, message) => pattern.test(value) && value ? "" : message;

/**
 * @className : CommonValidatedInput
 * @description : 커스텀 Input
 * @date : 2021-05-17 오후 5:33
 * @author : parksujin
 * @version : 1.0.0
 * @see
 * @history :
 **/
export const CommonValidatedInput = (FieldRenderProps) => {

    const {validationMessage, visited, name, value, defaultValue, flag, ...others} = FieldRenderProps;

    //useCallback : deps안의 state의 변경이 있을때만 실행된다.
    const onValueChange = useCallback(
        (event) => {
            FieldRenderProps.onChange(event.target.value)
        },
        [FieldRenderProps.onChange]
    );

    useEffect(() => {
        if (FieldRenderProps.formref) {
            FieldRenderProps.formref.current
                ? FieldRenderProps.formref.current.valueSetter(name, defaultValue)
                : FieldRenderProps.formref.valueSetter(name, defaultValue);
        }
    }, [FieldRenderProps.defaultValue]);

    return (
        <div>
            <Input
                name={name}
                value={defaultValue !== undefined && defaultValue !== "" ? defaultValue : value}
                onChange={onValueChange}
                {...others}/>
            {
                visited && flag && value &&
                (<Error>{validationMessage}</Error>)
            }
        </div>
    );
};

/**
 * @className : EngKrValidatedInput
 * @description : 한글 또는 영소문자만 유효한 커스텀 Input ex)구성원이름
 * @date : 2022-03-02 오후 1:33
 * @author : parksujin
 * @version : 1.0.0
 * @see
 * @history :
 **/
export const EngKrValidatedInput = (value) => {
    const regEng = /^[a-z]+$/;
    const regKr = /^[가-힣]+$/;
    if (regEng.test(value) || regKr.test(value) || value !== "" || value !== null) {
        return true;
    }
}

/**
 * @className : EngKrValidatedInput
 * @description : 영소문자+숫자 또는 영소문자만 유효한 커스텀 Input ex)아이디
 * @date : 2022-03-03 오후 12:11
 * @author : parksujin
 * @version : 1.0.0
 * @see
 * @history :
 **/
export const EngNumValidatedInput = (value) => {
    const regEng = /^[a-z]{3,12}$/;
    const regEngNum = /^(?=.*[a-z])(?=.*\d)[a-z\d._-]+$/; //영소문자 또는 숫자가 각각 1개이상 들어가야함
    if (value !== null && (regEng.test(value) || regEngNum.test(value))) {
        return true;
    }
}

/**
 * @className : EngNumSpecValidatedInput
 * @description : 영소문자+숫자 또는 영소문자+숫자+특수문자만 유효한 커스텀 Input ex)비밀번호
 * @date : 2022-03-10 오전 10:11
 * @author : parksujin
 * @version : 1.0.0
 * @see
 * @history :
 **/
export const EngNumSpecValidatedInput = (value) => {
    //const regEngNum = /^(?=.*[a-z])(?=.*\d)[a-z\d]{8,16}$/; //영소문자, 숫자가 각각 1개이상 들어가야함
    const regEngNumSpec = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,20}$/; //영소문자, 숫자, 특수문자 각각 1개이상 들어가야함

    if (regEngNumSpec.test(value)) {
        return true;
    }
}

/**
 * @className : validationSize
 * @description : 글자 수 바이트로 제한
 * @date :
 * @author :
 * @version : 1.0.0
 * @see
 * @history :
 **/
export const validationSize = (v, l) => {
    if (typeof v === "number") {
        if (v > l) {
            return false;
        } else {
            return true;
        }
    } else if (typeof v === "string") {
        let byte = 0;
        // byte 를 0으로 두고, 한글자씩 체크하면서 한자 한문 한글이면 2를 올려주고, 그 외는 1을 올려주겠습니다.
        if (v) {
            for (let i = 0; i < v.length; i++) {
                // 정규식.test() 함수는 인수가 정규식을 만족하는지 판단하여 true or false 값을 반환합니다.
                // 한글표현 정규식 : ㄱ-ㅎㅏ-ㅣ가-힣
                // 한자표현 정규식 : 一-龥
                // 일본어표현 정규식 : ぁ-ゔァ-ヴー々〆〤
                // 이 모든것을 /[]/ 안에 포함시켜서 연달아 써주면 "or" 처리됩니다.
                // 한, 중, 일 언어라면, byte를 2 더해주고, 아니라면 1을 더해주고, 최종적으로 byte를 return 합니다.
                if (/[\sa-zA-Z0-9`~!@#$%^&*()_+-={}\[\];':",./<>?]/.test(v[i])) {
                    byte++
                } else {
                    byte = byte + 2
                }
            }
        }
        if (byte > l) {
            return false;
        } else {
            return true;
        }
    }
}

/**
 * object의 key가 비어있거나, value가 전부 fasly값이면 empty로 판단
 *
 * @author jisu
 * @since 2024.05.07
 */
export const isObjectEmpty = (obj) => {
    let isEmpty = true;
    Object.keys(obj).forEach(key => obj[key] ? isEmpty = false : null)
    return isEmpty;
}

/**
 * check가 null이 아닌경우에만 callbackd을실행. null이면 null반환
 *
 * @author jisu
 * @since 2024.05.23
 */
export const processWhenNotNull = (check, callback) => {
    return check == null ? null : callback();
}

/*
 * @className : StrNumSizeValidatedInput
 * @description : 글자 수 바이트, 숫자 크기 제한
 * @date :
 * @author :
 * @version : 1.0.0
 * @see
 * @history :
 */
export const StrNumSizeValidatedInput = (v, l=1) => {
    if (typeof v === "number") {
        if (v > l) {
            return false;
        } else {
            return true;
        }
    } else if (typeof v === "string") {
        let byte = 0;
        // byte 를 0으로 두고, 한글자씩 체크하면서 한자 한문 한글이면 2를 올려주고, 그 외는 1을 올려주겠습니다.
        if (v) {
            for (let i = 0; i < v.length; i++) {
                // 정규식.test() 함수는 인수가 정규식을 만족하는지 판단하여 true or false 값을 반환합니다.
                // 한글표현 정규식 : ㄱ-ㅎㅏ-ㅣ가-힣
                // 한자표현 정규식 : 一-龥
                // 일본어표현 정규식 : ぁ-ゔァ-ヴー々〆〤
                // 이 모든것을 /[]/ 안에 포함시켜서 연달아 써주면 "or" 처리됩니다.
                // 한, 중, 일 언어라면, byte를 3 더해주고, 아니라면 1을 더해주고, 최종적으로 byte를 return 합니다.
                if (/[\sa-zA-Z0-9`~!@#$%^&*()_+-={}\[\];':",./<>?]/.test(v[i])) {
                    byte++
                } else {
                    byte = byte + 3
                }
            }
        }
        if (byte > l) {
            return false;
        } else {
            return true;
        }
    }
}