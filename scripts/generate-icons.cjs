// PWA Icon Generator for ContextOS
// Generates PNG icons in various sizes from a simple gradient design

const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

const ICON_SIZE_192 = 192;
const ICON_SIZE_512 = 512;

// ContextOS brand colors
const COLORS = {
  primary: { r: 94, g: 106, b: 210 },      // #5e6ad2
  primarySoft: { r: 238, g: 240, b: 255 }, // #eef0ff
  bg: { r: 247, g: 248, b: 251 },          // #f7f8fb
};

function createPNG(size) {
  const png = new PNG({ width: size, height: size });

  // Fill background with soft gradient
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Create a subtle vertical gradient for the background
      const ratio = y / size;
      const bgR = Math.round(COLORS.bg.r * (1 - ratio * 0.1));
      const bgG = Math.round(COLORS.bg.g * (1 - ratio * 0.1));
      const bgB = Math.round(COLORS.bg.b * (1 - ratio * 0.1));

      png.data[(y * size + x) * 4] = bgR;
      png.data[(y * size + x) * 4 + 1] = bgG;
      png.data[(y * size + x) * 4 + 2] = bgB;
      png.data[(y * size + x) * 4 + 3] = 255; // Alpha
    }
  }

  // Draw the "C" logo (simplified)
  const center = Math.floor(size / 2);
  const radius = Math.floor(size * 0.35);
  const thickness = Math.floor(size * 0.15);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Distance from center
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Angle from center (in radians)
      const angle = Math.atan2(dy, dx);

      // Check if we're in the "C" shape area
      // C is a partial ring: outer circle minus inner circle, open on the right side

      if (dist > radius - thickness && dist < radius) {
        // For a "C" shape, we want roughly 270 degrees starting from -135 to +135 degrees
        // This leaves a gap at approximately 0 degrees (right side)
        const angleDeg = (angle * 180) / Math.PI;

        // Draw the curved part of the "C"
        if (angleDeg < -90 || angleDeg > 45) {
          png.data[(y * size + x) * 4] = COLORS.primary.r;
          png.data[(y * size + x) * 4 + 1] = COLORS.primary.g;
          png.data[(y * size + x) * 4 + 2] = COLORS.primary.b;
          png.data[(y * size + x) * 4 + 3] = 255;
        }
      }
    }
  }

  return png;
}

function savePNG(png, filename) {
  const buffer = PNG.sync.write(png);
  fs.writeFileSync(filename, buffer);
  console.log(`Created: ${filename} (${png.width}x${png.height})`);
}

function main() {
  const outputDir = path.join(__dirname, '..', 'public');

  // Generate 192x192 icon
  const png192 = createPNG(ICON_SIZE_192);
  savePNG(png192, path.join(outputDir, 'icon-192.png'));

  // Generate 512x512 icon
  const png512 = createPNG(ICON_SIZE_512);
  savePNG(png512, path.join(outputDir, 'icon-512.png'));

  // Copy icon-512 to apple-touch-icon (iOS home screen)
  fs.copyFileSync(path.join(outputDir, 'icon-512.png'), path.join(outputDir, 'apple-touch-icon.png'));
  console.log(`Created: apple-touch-icon.png (${ICON_SIZE_512}x${ICON_SIZE_512})`);

  // Also create a 180x180 version for iOS (retina)
  const png180 = createPNG(180);
  savePNG(png180, path.join(outputDir, 'apple-touch-icon-180.png'));
}

main();
