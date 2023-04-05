import { SubEvent } from "sub-events";
import { Logger } from "tslog";
export declare const transformHandler: (log: Logger<unknown>, onReleaseEvent: SubEvent<boolean>, onDeviceDebugLog: SubEvent<Uint8Array>, concurrentLogOutput: boolean) => TransformStream<Uint8Array, Uint8Array>;
