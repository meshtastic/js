/** Bluetooth Low Energy ToRadio characteristic */
export const ToRadioUuid = "f75c76d2-129e-4dad-a1dd-7866124401e7";

/** Bluetooth Low Energy FromRadio characteristic */
export const FromRadioUuid = "2c55e69e-4993-11ed-b878-0242ac120002";

/**
 * Bluetooth Low Energy FromNum characteristic, provides BLE notification on new
 * FromRadio message and a message counter
 */
export const FromNumUuid = "ed9da18c-a800-4f66-a670-aa7547e34453";

/** Bluetooth Service characteristic, used to identify Meshtastic devices */
export const ServiceUuid = "6ba1b218-15a8-461f-9fa8-5dcae273eafd";

/** Broadcast destination number */
export const broadcastNum = 0xffffffff;

/** Minimum device firmware version supported by this version of the library. */
export const minFwVer = 2.2;
