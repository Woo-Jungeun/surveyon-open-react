import { Upload } from "@progress/kendo-react-upload";
import { Fragment, useEffect } from "react";
import PropTypes from "prop-types";
import { FileApi } from "@/components/common/File/FileApi.jsx";
import { Button } from "@progress/kendo-react-buttons";

const DisabledUploadListUI = ({ files, disabled, asnyc, onCancel, onRemove, onRetry, menuId, mappingColumn01Value, mappingColumn02Value }) => {
    const { downloadFileMutation } = FileApi();

    const handleClick = (file, clickEvent) => {
        downloadFileMutation.mutateAsync({ fileSequenceNumber: file.uid, menuId, mappingColumn01Value, mappingColumn02Value }).then((res) => {
            const blob = new Blob([res.data], { type: res.headers["content-type"] });
            const link = document.createElement("a");
            link.href = window.URL.createObjectURL(blob);
            link.setAttribute("download", file.name);
            return link.click();
        });
    };

    return files.map((file) => (
        <div key={file.uid}>
            {file.name}
            <Button onClick={(e) => handleClick(file, e)}>다운로드</Button>
        </div>
    ));
};

const PopupUpload = ({ label, required, setFiles, fileRef, mode, menuId, mappingColumn01Value, mappingColumn02Value, ...props }) => {
    const { defaultFiles } = props;
    const decoS = !!required === false ? "" : "decoS";

    //파일은 popupValue에 안달아주기로 함. 상위에서 따로 state를 받아서 별도의 state로 관리.
    const onAdd = (event) => {
        setFiles(event.newState);
    };
    const onRemove = (event) => {
        setFiles(event.newState);
    };

    useEffect(() => {
        if (fileRef.current) {
            if (mode == "U" || mode == "I") {
                fileRef.current.querySelector(".k-upload")?.classList.remove("k-disabled");
                fileRef.current.querySelector(".k-upload .k-dropzone").classList.remove("k-disabled");
            } else {
                fileRef.current.querySelector(".k-upload")?.classList.remove("k-disabled");
                fileRef.current.querySelector(".k-upload .k-dropzone").classList.add("k-disabled");
            }
        }
    }, [mode]);

    return (
        <Fragment>
            {label ? <span className={`iptTit ${decoS}`}>{label}</span> : null}
            <div ref={fileRef}>
                {mode == "U" || mode == "I" ? (
                    <Upload
                        autoUpload={false}
                        multiple={true}
                        showActionButtons={false}
                        onAdd={onAdd}
                        onRemove={onRemove}
                        defaultFiles={defaultFiles}
                        {...props}
                    />
                ) : (
                    <Upload
                        autoUpload={false}
                        multiple={true}
                        showActionButtons={false}
                        onAdd={onAdd}
                        onRemove={onRemove}
                        defaultFiles={defaultFiles}
                        listItemUI={(props) => <DisabledUploadListUI
                            menuId={menuId}
                            mappingColumn01Value={mappingColumn01Value}
                            mappingColumn02Value={mappingColumn02Value}
                            {...props} />}
                        {...props}
                    />
                )}
            </div>
        </Fragment>
    );
};

export default PopupUpload;

PopupUpload.propTypes = {
    setFiles: PropTypes.func.isRequired
};
