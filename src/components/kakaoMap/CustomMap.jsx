import { Button } from "@progress/kendo-react-buttons";
import { convrtToDay } from '@/common/utils/CustomDateUtil';
import { Fragment, memo, useContext, useState } from "react";
import { Map, useKakaoLoader, ZoomControl } from "react-kakao-maps-sdk";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import html2canvas from "html2canvas";

const CustomMap = ({
                       children,
                       mapRef = null,
                       mapCapture = false,
                       style = { width: "100%", height: "calc(100vh - 201px)" },
                       ...props
                   }) => {
    useKakaoLoader();

    const [mapType, setMapType] = useState(1);
    const mType = {
        ROADMAP : 1,
        SKYVIEW : 2
    }
    const onClickChangMapType = (type) => {
        setMapType(mType[type])
    }
    const loadingSpinner = useContext(loadingSpinnerContext);
    //캡쳐 기능
    const onClickBtnCapture = () => {
        if (mapCapture) {
            loadingSpinner.show();
            const svgNodesToRemove = [];

            // div 안에 text css 깨짐 오류로 인한 임시 style 처리
            const style = document.createElement("style");
            document.head.appendChild(style);
            style.sheet?.insertRule("body > div:last-child img { display: inline-block; }");

            // html2canvas svg issue로 인한 canvas로 복사
            const svgElements = document.querySelectorAll(`.mapArea svg`)[0];

            const canvas = document.createElement("canvas");

            canvas.width = svgElements.getBoundingClientRect().width;
            canvas.height = svgElements.getBoundingClientRect().height;
            canvas.style.left = svgElements.style.left;
            canvas.style.top = svgElements.style.top;
            canvas.style.transform = svgElements.style.transform;
            canvas.style.position = "absolute";

            const pathElements = document.querySelectorAll(`.mapArea path`);

            pathElements.forEach(async (item) => {
                if (item.style.display === "block") {
                    const ctx = canvas.getContext("2d");
                    const pathData = item.getAttribute("d");

                    const path2d = new Path2D(pathData);

                    ctx.strokeOpacity += item.style.strokeOpacity;
                    ctx.lineWidth = item.style.strokeWidth.replace("px", "");
                    ctx.strokeStyle = item.style.color;
                    ctx.lineCap = item.style.strokeLinecap;

                    // console.log("path2d", path2d);
                    ctx.stroke(path2d);
                }
            });

            svgElements.parentNode.appendChild(canvas);
            svgNodesToRemove.push(canvas);

            /* cors 이슈로 인한 url 변경
                    proxy 설정 필요 */
            document.querySelectorAll(`.mapArea img`).forEach((el, idx) => {
                el.src = el.src.replace("http://map.daumcdn.net", window.location.origin + "/map");
            });

            //이벤트 루프 setTimeout
            setTimeout(() => {
                html2canvas(document.getElementsByClassName("mapArea")[0], {
                    logging: false, // 로그
                    useCORS: true,
                    backgroundColor: null
                }).then((canvas) => {
                    let today = convrtToDay(new Date(), { parse: "", time: true, timeparse: "" });

                    /* 이미지 다운로드*/
                    const link = document.createElement("a");
                    document.body.appendChild(link);
                    link.href = canvas.toDataURL("image/png");
                    link.download = today + "_capture.png";
                    link.click();

                    /* 초기화 */
                    document.querySelectorAll(`.mapArea img`).forEach((el, idx) => {
                        el.src = el.src.replace(window.location.origin + "/map", "http://map.daumcdn.net");
                    });
                    document.body.removeChild(link);
                    style.remove();
                    svgNodesToRemove.forEach(function (element) {
                        element.remove();
                    });
                    loadingSpinner.hide();
                });
            }, 0);
        }
    };
    return (
        <Fragment>
            <Map
                className={"mapArea"}
                ref={mapRef}
                center={{ lat: 35.9675044427494, lng: 126.73685366539058 }}
                isPanto={false}
                mapTypeId={mapType}
                level={8}
                minLevel={12}
                maxLevel={1}
                style={style}
                {...props}
            >
                <ZoomControl position={"BOTTOMRIGHT"} />

                {children}
            </Map>
                
            <div>
                {(mapCapture && mapType === 1)&& (
                    <Button
                        themeColor="primary"
                        className={"captureBtn"}
                        style={{ position: "absolute", bottom: "10px", right: "10px", zIndex: 3 }}
                        onClick={() => {
                            onClickBtnCapture();
                        }}
                    >
                        캡쳐
                    </Button>
                )}
                <Button
                        themeColor="primary"
                        className={"roadmapBtn"}
                        style={{ position: "absolute", top: "10px", left: "10px", zIndex: 2 }}
                        onClick={() => {
                            onClickChangMapType("ROADMAP");
                        }}
                    >
                    일반지도
                </Button>
                    <Button
                        themeColor="primary"
                        className={"skyviewBtn"}
                        style={{ position: "absolute", top: "10px", left: "110px", zIndex: 2 }}
                        onClick={() => {
                            onClickChangMapType("SKYVIEW");
                        }}
                    >
                    스카이뷰
                </Button>
            </div>
        </Fragment>
    );
};

export default memo(CustomMap);