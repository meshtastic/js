import type { SimpleEventDispatcher } from "ste-simple-events";
import type { Logger } from "tslog";
import * as Protobuf from "@meshtastic/protobufs";
import * as Types from "../types.ts";


// This function takes the raw binary stream from the radio
// and converts it into usable "packets" that are returned to the
// adapter for handling
export const transformHandler = (
  log: Logger<unknown>,
  onReleaseEvent: SimpleEventDispatcher<boolean>,
  onDeviceDebugLog: SimpleEventDispatcher<Uint8Array>,
  concurrentLogOutput: boolean,
) => {
  // byteBuffer contains the data to be processed
  let byteBuffer = new Uint8Array([]);

  // return the actual transformer
  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk: Uint8Array, controller): void {
      log = log.getSubLogger({ name: "streamTransformer" });
      onReleaseEvent.subscribe(() => {
        controller.terminate();
      });

      // add the latest chunk of data into the array 
      byteBuffer = new Uint8Array([...byteBuffer, ...chunk]);

      // This loop looks for Meshtastic packets in the stream based on the
      // protocol definition. byteBuffer may contain 0 or more packets at
      // any time.
      let processingExhausted = false;
      while (byteBuffer.length !== 0 && !processingExhausted) {
        // Look for the magic byte that indicates a packet is starting
        const framingIndex = byteBuffer.findIndex((byte) => byte === 0x94);
        // Check the second confirmation byte
        const framingByte2 = byteBuffer[framingIndex + 1];
        if (framingByte2 === 0xc3) {
          // Check to see if there is content in the buffer before the packet starts
          // Per the protocol spec, data that is outside of the packet
          // is likely to be ascii debugging information from the radio
          // This includes formatting escape codes.
          if (byteBuffer.subarray(0, framingIndex).length) {
            if (concurrentLogOutput) {
              // dispatch the raw data as an event
              // the consumer will have to translate the bytes into ascii
              onDeviceDebugLog.dispatch(byteBuffer.subarray(0, framingIndex));
            } else {
            // This takes the bytes, translates them into ascii, and logs them
              const ascii_debug = Array.from(byteBuffer.subarray(0, framingIndex)).map((code)=>String.fromCharCode(code)).join('');
              log.trace(
                Types.EmitterScope.SerialConnection,
                Types.Emitter.Connect,
                `Debug from radio:\n ${ ascii_debug }`,
              );
            }

            // Remove everything before the magic byte
            byteBuffer = byteBuffer.subarray(framingIndex);
          }

          // the next two bytes define the length of the packet
          const msb = byteBuffer[2];
          const lsb = byteBuffer[3];

          // If we have a valid length, and the byteBuffer is long enough,
          // then we should have a full packet. Let's process it...
          if (
            msb !== undefined &&
            lsb !== undefined &&
            byteBuffer.length >= 4 + (msb << 8) + lsb
          ) {
            // extract just the right amount of bytes
            const packet = byteBuffer.subarray(4, 4 + (msb << 8) + lsb);

            // check to make sure these bytes don't include a new packet start
            // this would indicate a malformed packet...
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

              // prune out the malformed packet
              byteBuffer = byteBuffer.subarray(malformedDetectorIndex);
            } else {
              // since we have a valid packet, we can remove those bytes...
              byteBuffer = byteBuffer.subarray(3 + (msb << 8) + lsb + 1);

              // and return the packet to the pipe...
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
