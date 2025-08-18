import { Field, FieldWrapper, Form, FormElement } from "@progress/kendo-react-form";
import { Input } from "@progress/kendo-react-inputs";
import { Fragment } from "react";

const FloatingLabelEmailInput = ({ label, id, value, ...options }) => {
    return (
        <FieldWrapper style={{ marginTop: "0px" }}>
            {/*<FloatingLabel label={label} editorValue={value} editorId={id}>*/}
            <Input placeholder={"내용을 입력하세요."} value={value} type={"text"} id={id} {...options} />
            {/*</FloatingLabel>*/}
        </FieldWrapper>
    );
};

const CustomSearch = ({ columns, ...options }) => {
    // 반드시 null 체크 할것 ====================================================================

    const cols = columns || [];

    // =========================================================================================

    return (({ onChange }) => {
        return (
            <Form
                render={(formRenderProps) => (
                    <FormElement
                        horizontal={true}
                        // style={{
                        //     maxWidth: 500,
                        //     display: "flex"
                        // }}
                    >
                        {cols.map(
                            (
                                {
                                    //컬럼 오브젝트 필수 키
                                    field, //컬럼 아이디
                                    title, //컬럼 한글명
                                    ...item //옵션들...
                                },
                                idx
                            ) => {
                                if (onChange) {
                                    onChange.apply(null, [field, formRenderProps.valueGetter(field)]);
                                }
                                return (
                                    <Fragment key={idx}>
                                        <div className="cmn_sub_ipt mgB40">
                                            <p className="txtTit">{title}</p>
                                            <Field
                                                key={idx}
                                                id={field}
                                                name={field}
                                                label={title}
                                                component={FloatingLabelEmailInput}
                                                onChange={onChange}
                                            />
                                        </div>
                                    </Fragment>
                                );
                            }
                        )}
                        {/* <Field id={"secondEmail"} name={"secondemail"} label={"Email (Floating Label)"} component={FloatingLabelEmailInput} /> */}
                    </FormElement>
                )}
            />
        );
    })(options);
};

export default CustomSearch;
