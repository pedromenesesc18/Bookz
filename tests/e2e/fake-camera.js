// Test helper: a fake back camera that shows an EAN-13 barcode, drawn on a canvas.
const L = [
  '0001101',
  '0011001',
  '0010011',
  '0111101',
  '0100011',
  '0110001',
  '0101111',
  '0111011',
  '0110111',
  '0001011',
];
const G = [
  '0100111',
  '0110011',
  '0011011',
  '0100001',
  '0011101',
  '0111001',
  '0000101',
  '0010001',
  '0001001',
  '0010111',
];
const R = [
  '1110010',
  '1100110',
  '1101100',
  '1000010',
  '1011100',
  '1001110',
  '1010000',
  '1000100',
  '1001000',
  '1110100',
];
const PARITY = [
  'LLLLLL',
  'LLGLGG',
  'LLGGLG',
  'LLGGGL',
  'LGLLGG',
  'LGGLLG',
  'LGGGLL',
  'LGLGLG',
  'LGLGGL',
  'LGGLGL',
];

export const ean13Bits = (code) => {
  const d = [...code].map(Number);
  const left = d
    .slice(1, 7)
    .map((n, i) => (PARITY[d[0]][i] === 'L' ? L : G)[n])
    .join('');
  const right = d
    .slice(7)
    .map((n) => R[n])
    .join('');
  return `101${left}01010${right}101`;
};

/** Init script: replaces getUserMedia with a canvas stream showing `code`, and hides BarcodeDetector. */
export const fakeCameraScript = (bits) => {
  delete window.BarcodeDetector;
  navigator.mediaDevices.getUserMedia = async () => {
    const canvas = Object.assign(document.createElement('canvas'), { width: 640, height: 480 });
    const ctx = canvas.getContext('2d');
    const draw = () => {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, 640, 480);
      ctx.fillStyle = '#000';
      const module = 4;
      const x0 = (640 - bits.length * module) / 2;
      [...bits].forEach((b, i) => b === '1' && ctx.fillRect(x0 + i * module, 140, module, 200));
    };
    draw();
    setInterval(draw, 100);
    return canvas.captureStream(10);
  };
};
