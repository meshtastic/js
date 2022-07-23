import { Transform, TransformCallback, TransformOptions } from 'stream'

/**
 * Parses a serial port stream into the format specified in:
 * https://meshtastic.org/docs/software/python/python-stream#wire-encoding
 */
export class MeshtasticStreamParser extends Transform {
  byteBuffer: Uint8Array
  constructor(options: TransformOptions) {
    super(options)

    this.byteBuffer = new Uint8Array([]);
  }

  _transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback) {
    this.byteBuffer = new Uint8Array([...this.byteBuffer, ...chunk]);

    if (this.byteBuffer.includes(0x94)) {
      const index = this.byteBuffer.findIndex((byte) => byte === 0x94);
      const startBit2 = this.byteBuffer[index + 1];
      const msb = this.byteBuffer[index + 2] ?? 0;
      const lsb = this.byteBuffer[index + 3] ?? 0;

      const len = index + 4 + lsb + msb;

      if (startBit2 === 0xc3 && this.byteBuffer.length >= len) {
        this.push(Buffer.from(this.byteBuffer.subarray(index + 4, len)));
        // byteBuffer = new Uint8Array([]); ??
        this.byteBuffer = this.byteBuffer.slice(len);
      }
    }
    callback()
  }

  _flush(callback: TransformCallback) {
    this.push(Buffer.from(this.byteBuffer))
    this.byteBuffer = new Uint8Array([]);
    callback()
  }
}