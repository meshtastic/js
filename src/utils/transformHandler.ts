export const transformHandler = (
  byteBuffer: Uint8Array,
  chunk: Uint8Array,
  callback: (buffer: Uint8Array) => void
) => {
  byteBuffer = new Uint8Array([...byteBuffer, ...chunk]);

  if (byteBuffer.includes(0x94)) {
    const index = byteBuffer.findIndex((byte) => byte === 0x94);
    const startBit2 = byteBuffer[index + 1];
    const msb = byteBuffer[index + 2] ?? 0;
    const lsb = byteBuffer[index + 3] ?? 0;

    const len = index + 4 + lsb + msb;

    if (startBit2 === 0xc3 && byteBuffer.length >= len) {
      callback(byteBuffer.subarray(index + 4, len));
      byteBuffer = byteBuffer.slice(len);
    }
  }
};
