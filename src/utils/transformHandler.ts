import type { SimpleEventDispatcher } from "ste-simple-events";
import type { Logger } from "tslog";
import * as Protobuf from "../protobufs.js";
import * as Types from "../types.js";

export const transformHandler = (
  logger: Logger<unknown>,
  onReleaseEvent: SimpleEventDispatcher<boolean>,
  onDeviceDebugLog: SimpleEventDispatcher<Uint8Array>,
  concurrentLogOutput: boolean,
) => {
  let byteBuffer = new Uint8Array([]);
  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk: Uint8Array, controller): void {
      const log = logger.getSubLogger({ name: "streamTransformer" });
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
              onDeviceDebugLog.dispatch(byteBuffer.subarray(0, framingIndex));
            } else {
              log.warn(
                Types.EmitterScope.SerialConnection,
                Types.Emitter.Connect,
                `⚠️ Found unneccesary message padding, removing: ${byteBuffer
                  .subarray(0, framingIndex)
                  .toString()}`,
              );
            }

            byteBuffer = byteBuffer.subarray(framingIndex);
          }

          const msb = byteBuffer[2];
          const lsb = byteBuffer[3];

          if (
            msb !== undefined &&
            lsb !== undefined &&
            byteBuffer.length >= 4 + (msb << 8) + lsb
          ) {
            const packet = byteBuffer.subarray(4, 4 + (msb << 8) + lsb);

            const malformedDetectorIndex = packet.findIndex(
              (byte) => byte === 0x94,
            );
            if (
              malformedDetectorIndex !== -1 &&
              packet[malformedDetectorIndex + 1] === 0xc3
            ) {
              log.warn(
                Types.EmitterScope.SerialConnection,
                Types.Emitter.Connect,
                `⚠️ Malformed packet found, discarding: ${byteBuffer
                  .subarray(0, malformedDetectorIndex - 1)
                  .toString()}`,
                Protobuf.Mesh.LogRecord_Level.WARNING,
              );

              byteBuffer = byteBuffer.subarray(malformedDetectorIndex);
            } else {
              byteBuffer = byteBuffer.subarray(3 + (msb << 8) + lsb + 1);
              controller.enqueue(packet);
            }
          } else {
            /** Only partioal message in buffer, wait for the rest */
            processingExhausted = true;
          }
        } else {
          /** Message not complete, only 1 byte in buffer */
          processingExhausted = true;
        }
      }
    },
  });
};
