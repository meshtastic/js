import * as constants from "./constants.js"

export function bufferToHex(arrayBuffer) { 
    return Array.prototype.map.call(new Uint8Array(arrayBuffer), x => ('00' + x.toString(16)).slice(-2)).join('');
}


export function typedArrayToBuffer(array) {
    return array.buffer.slice(array.byteOffset, array.byteLength + array.byteOffset)
}

export function getEnvironment() {
    if (typeof window !== 'undefined') {
        return 'browser';
    }
    return 'nobrowser';
}


// This function keeps calling "toTry" until promise resolves or has
// retried "max" number of times. First retry has a delay of "delay" seconds.
// "success" is called upon success.
// https://googlechrome.github.io/samples/web-bluetooth/automatic-reconnect-async-await.html
export async function exponentialBackoff(max, delay, toTry, success, fail) {
    try {
        const result = await toTry();
        success(result);
    } catch(error) {
        if (max === 0) {
            return fail();
        }
        setTimeout(function() {
        exponentialBackoff(--max, delay * 2, toTry, success, fail);
        }, delay * 1000);
    }
}