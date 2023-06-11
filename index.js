const SERVICE = "https://ws.geonorge.no/hoydedata/v1/punkt";
const SERVICE_MULTI_LIMIT = 50;
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
        throw new Error(response.error);
    }

    return response.json();
};

const addZCoordinate = ([x, y]) => ({punkter: [{z = ""}] = []}) => ([x, y, parseFloat(z)]);
const addZCoordinates = (pointArray) => ({punkter: newData = []}) => pointArray.map(([x, y], index) => [x, y, parseFloat(newData[index]["z"])]);

const mergeArrays = a => a.flat();

const getZCoordinate = (point, epsgNumber = DEFAULT_PROJECTION) => {
    const [x, y] = point;

    return new Promise((resolve, reject) => {
        const url = `${SERVICE_URL}&${PARAM.PROJECTION}=${epsgNumber}&${PARAM.NORTH}=${y}&${PARAM.EAST}=${x}`;
        fetchUrl(url).then(responseToJSON).then(addZCoordinate(point)).then(resolve).catch(reject);
    });
};

const getZCoordinates = (pointArray, epsgNumber = DEFAULT_PROJECTION) => {
    const arrays = [];

    for (let i = 0; i < pointArray.length; i += SERVICE_MULTI_LIMIT) {
        arrays.push(pointArray.slice(i, i + SERVICE_MULTI_LIMIT));
    }

    return new Promise((resolve, reject) => {
        Promise.all(arrays.map(a => {
            const url = `${SERVICE_URL}&${PARAM.PROJECTION}=${epsgNumber}&${PARAM.MULTI}=${JSON.stringify(a)}`;
            return fetchUrl(url).then(responseToJSON).then(addZCoordinates(a)).catch(reject);
        })).then(mergeArrays).then(resolve);
    });
};

export {
    getZCoordinates,
    getZCoordinate
};
