import {Fragment, memo, useContext, useEffect, useState} from "react";
import {modalContext} from "@/components/common/Modal";

const CustomImageUploadCell = (props) => {

    const [imageSrc, setImageSrc] = useState('');
    const modal = useContext(modalContext);

    useEffect(() => {
        if(props.variable instanceof Blob){
            encodeFileToBase64(props.variable)
        }else if(typeof props.variable === "string"){
            reqGetFileInfo()
        }else{
            setImageSrc('')
        }
    }, [props.variable]);

    const reqGetFileInfo = async () =>{
        try {
            const result = await ServiceApi.file.reqGetFileInfo(props.variable)
            encodeFileToBase64(result)
        } catch (e) {
            console.error(e)
        }
    }

    const imageVerification = (file) => {
        const allowedExtensions = ["jpg", "jpeg", "png", "svg"]
        const extension = file.name.split(".").pop().toLowerCase()
        return allowedExtensions.includes(extension)
    };

    const encodeFileToBase64 = (fileBlob) => {
        //props.onChange(fileBlob, props.field, props.index)
        const reader = new FileReader();
        reader.readAsDataURL(fileBlob);
        return new Promise((resolve) => {
            reader.onload = () => {
                setImageSrc(reader.result);
                resolve();
            };
        });
    };

    const onChange = (e) => {

        const selectedFile = e?.target?.files[0];
        if (!imageVerification(selectedFile)) {
            modal.showAlert("알림", "이미지파일만 등록 가능합니다.");
            return
        }

        props.onChange(selectedFile, props.field, props.index);
        encodeFileToBase64(selectedFile);
    }

    const dropHandler = (ev) => {
        ev.preventDefault()
        const selectedFile = ev.dataTransfer.files[0]
        if (!imageVerification(selectedFile)) {
            modal.showAlert("알림", "이미지파일만 등록 가능합니다.");
            return
        }

        props.onChange(selectedFile, props.field, props.index);
        encodeFileToBase64(selectedFile);
    }

    const dragOverHandler = (ev) => {
        ev.preventDefault()
    }

    return (
        <Fragment>
            {imageSrc !== '' ?
                <Fragment>
                <img src={imageSrc} alt="preview-img" style={{width:"250px", height:"160px"}}/>
                <a className="close" onClick={()=>{
                    props.onChange(null, props.field, props.index)
                    setImageSrc('')}}>닫기</a>
                </Fragment>
                :
                <Fragment>
                <input id={`id_${props.index}`}
                    type="file"
                    onChange={onChange}
                    accept={"image/*"}
                    style={{width: "250px", height: "160px",}}
                />
                    <label htmlFor={`id_${props.index}`} onDrop={dropHandler}
                           onDragOver={dragOverHandler}>파일을 업로드 해주세요</label>
                </Fragment>
            }
            </Fragment>
    )
}

export default memo(CustomImageUploadCell);