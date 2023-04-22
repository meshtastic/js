import { Protobuf, Types } from "../index.js";
export const transformHandler = (log, onReleaseEvent, onDeviceDebugLog, concurrentLogOutput) => {
    let byteBuffer = new Uint8Array([]);
    return new TransformStream({
        transform(chunk, controller) {
            log = log.getSubLogger({ name: "streamTransformer" });
            onReleaseEvent.subscribe(() => {
                controller.terminate();
            });
            byteBuffer = new Uint8Array([...byteBuffer, ...chunk]);
            let processingExhausted = false;
            while (byteBuffer.length !== 0 && !processingExhausted) {
                const framingIndex = byteBuffer.findIndex((byte) => byte === 0x94);
                const framingByte2 = byteBuffer[framingIndex + 1];
                if (framingByte2 === 0xc3) {
                    if (byteBuffer.subarray(0, framingIndex).length) {
                        if (concurrentLogOutput) {
                            onDeviceDebugLog.emit(byteBuffer.subarray(0, framingIndex));
                        }
                        else {
                            log.warn(Types.EmitterScope.iSerialConnection, Types.Emitter.connect, `⚠️ Found unneccesary message padding, removing: ${byteBuffer
                                .subarray(0, framingIndex)
                                .toString()}`);
                        }
                        byteBuffer = byteBuffer.subarray(framingIndex);
                    }
                    const msb = byteBuffer[2];
                    const lsb = byteBuffer[3];
                    if (msb !== undefined &&
                        lsb !== undefined &&
                        byteBuffer.length >= 4 + (msb << 8) + lsb) {
                        const packet = byteBuffer.subarray(4, 4 + (msb << 8) + lsb);
                        const malformedDetectorIndex = packet.findIndex((byte) => byte === 0x94);
                        if (malformedDetectorIndex !== -1 &&
                            packet[malformedDetectorIndex + 1] === 0xc3) {
                            log.warn(Types.EmitterScope.iSerialConnection, Types.Emitter.connect, `⚠️ Malformed packet found, discarding: ${byteBuffer
                                .subarray(0, malformedDetectorIndex - 1)
                                .toString()}`, Protobuf.LogRecord_Level.WARNING);
                            byteBuffer = byteBuffer.subarray(malformedDetectorIndex);
                        }
                        else {
                            byteBuffer = byteBuffer.subarray(3 + (msb << 8) + lsb + 1);
                            controller.enqueue(packet);
                        }
                    }
                    else {
                        /** Only partioal message in buffer, wait for the rest */
                        processingExhausted = true;
                    }
                }
                else {
                    /** Message not complete, only 1 byte in buffer */
                    processingExhausted = true;
                }
            }
        },
    });
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNmb3JtSGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy91dGlscy90cmFuc2Zvcm1IYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUdBLE9BQU8sRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBRTlDLE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFHLENBQzlCLEdBQW9CLEVBQ3BCLGNBQWlDLEVBQ2pDLGdCQUFzQyxFQUN0QyxtQkFBNEIsRUFDNUIsRUFBRTtJQUNGLElBQUksVUFBVSxHQUFHLElBQUksVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3BDLE9BQU8sSUFBSSxlQUFlLENBQXlCO1FBQ2pELFNBQVMsQ0FBQyxLQUFpQixFQUFFLFVBQVU7WUFDckMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxZQUFZLENBQUMsRUFBRSxJQUFJLEVBQUUsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDO1lBQ3RELGNBQWMsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFO2dCQUM1QixVQUFVLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDekIsQ0FBQyxDQUFDLENBQUM7WUFDSCxVQUFVLEdBQUcsSUFBSSxVQUFVLENBQUMsQ0FBQyxHQUFHLFVBQVUsRUFBRSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDdkQsSUFBSSxtQkFBbUIsR0FBRyxLQUFLLENBQUM7WUFDaEMsT0FBTyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFO2dCQUN0RCxNQUFNLFlBQVksR0FBRyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLENBQUM7Z0JBQ25FLE1BQU0sWUFBWSxHQUFHLFVBQVUsQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ2xELElBQUksWUFBWSxLQUFLLElBQUksRUFBRTtvQkFDekIs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