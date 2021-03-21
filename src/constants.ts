/**
 * Bluetooth Low Energy ToRadio characteristic
 */
export const TORADIO_UUID = "f75c76d2-129e-4dad-a1dd-7866124401e7";

/**
 * Bluetooth Low Energy FromRadio characteristic
 */
export const FROMRADIO_UUID = "8ba2bcc2-ee02-4a55-a531-c525c5e454d5";

/**
 * Bluetooth Low Energy FromNum characteristic,
 * provides BLE notification on new FromRadio message and a message counter
 */
export const FROMNUM_UUID = "ed9da18c-a800-4f66-a670-aa7547e34453";

/**
 * Bluetooth Low Energy Service characteristic, used to filter for meshtastic devices
 */
export const SERVICE_UUID = "6ba1b218-15a8-461f-9fa8-5dcae273eafd";

/**
 * Broadcast destination number
 */
export const BROADCAST_NUM = 0xffffffff;

/**
 * Is sent with device configuration request and is used for verification of config process
 */
export const MY_CONFIG_ID = 42;

/**
 * Minimum device firmware version supported by this version of the library.
 */
export const MIN_FW_VERSION = 1.2;
