const SERVICE = "https://ws.geonorge.no/hoydedata/v1/punkt";
const SERVICE_MULTI_LIMIT = 50;
const THROTTLE_DELAY_TIME = 50;

const PARAM = {
    PROJECTION: "koordsys",
    NORTH: "nord",
    EAST: "ost",
    MULTI: "punkter",
    GEOJSON: "geojson"
};

const DEFAULT_PROJECTION = 4326; // WGS84
const USE_GEOJSON_FORMAT = false;

const SERVICE_URL = `${SERVICE}?${PARAM.GEOJSON}=${USE_GEOJSON_FORMAT}`;

const fetchUrl = (url) => {
    return fetch(url, {
        method: "GET",
        mode: "cors",
        cache: "no-cache",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
    });
};


const responseToJSON = response => {
    if (!response.ok) {
        console.error(`error: ${response.status} ${response.statusText}`);
        throw new Error(response.statusText);
    }

    return response.json();
};

const throttled = fn => (delay, ...rest) => {
    return new Promise((resolve) => {
        const runFn = (...params) => fn(...params).then(resolve);
        setTimeout(runFn, delay, ...rest)
    });
};

const addZToPoints = (pointArray) => (zArray) => pointArray.map(([x, y], index) => [x, y, zArray[index]]);
const pickZ = ({punkter: newData = []}) => newData.map(({z = ""}) => parseFloat(z));

const mergeArrays = a => a.flat();

const zCoordinate = (add = false) => (point, epsgNumber = DEFAULT_PROJECTION) => {
    const [x, y] = point;

    return new Promise((resolve, reject) => {
        const url = `${SERVICE_URL}&${PARAM.PROJECTION}=${epsgNumber}&${PARAM.NORTH}=${y}&${PARAM.EAST}=${x}`;
        fetchUrl(url).then(responseToJSON).then(pickZ).then(zArray => add ? addZToPoints([point])(zArray) : zArray).then(([p]) => resolve(p)).catch(reject);
    });
};

const zCoordinates = (add = false) => (pointArray, epsgNumber = DEFAULT_PROJECTION, throttleDelay = THROTTLE_DELAY_TIME) => {
    const arrays = [];

    for (let i = 0; i < pointArray.length; i += SERVICE_MULTI_LIMIT) {
        arrays.push(pointArray.slice(i, i + SERVICE_MULTI_LIMIT));
    }

    const throttledFetch = throttled(fetchUrl);

    return new Promise((resolve, reject) => {
        Promise.all(arrays.map((a, i) => {
            const url = `${SERVICE_URL}&${PARAM.PROJECTION}=${epsgNumber}&${PARAM.MULTI}=${JSON.stringify(a)}`;
            return throttledFetch(throttleDelay * i, url).then(responseToJSON).then(pickZ).then(zArray => add ? addZToPoints(a)(zArray) : zArray).catch(reject);
        })).then(mergeArrays).then(resolve);
    });
};

const getZCoordinates = zCoordinates();
const getZCoordinate = zCoordinate();
const addZCoordinates = zCoordinates(true);
const addZCoordinate = zCoordinate(true);

export {
    getZCoordinate,
    getZCoordinates,
    addZCoordinate,
    addZCoordinates
};
