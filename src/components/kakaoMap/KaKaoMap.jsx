import { Fragment, useRef, useState } from "react";
import { Map } from "react-kakao-maps-sdk";

const KaKaoMap = ({ defaultCenter, defaultLevel, children, ...props }) => {
    const mapRef = useRef(null);
    const [center, setCenter] = useState( defaultCenter ?? { lat: 35.9675044427494, lng: 126.73685366539058 });
    const [level, setLevel] = useState(defaultLevel ?? 10);

    return (
        <Fragment>
            <Map
                center={center}
                isPanto={false}
                level={level}
                minLevel={10}
                maxLevel={1}
                onZoomChanged={(e) => {
                    setLevel(e.getLevel());
                }}
                onCenterChanged={(map) => {
                    setCenter({ lat: map.getCenter().getLat(), lng: map.getCenter().getLng() })
                }}
                style={{ width: "100%", height: "360px" }}
                ref={mapRef}
                {...props}
            >
                {children}
            </Map>
        </Fragment>
    );
};

export default KaKaoMap;
