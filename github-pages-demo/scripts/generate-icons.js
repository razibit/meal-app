/**
 * Generate placeholder PWA icons
 * This creates simple placeholder icons with the app initials "MM"
 * Replace these with professionally designed icons for production
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, '..', 'public');

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Theme color
const themeColor = '#5B4B8A';
const textColor = '#FFFFFF';

/**
 * Generate SVG icon
 */
function generateSVG(size, text, isBadge = false) {
  const fontSize = isBadge ? size * 0.5 : size * 0.35;
  const fontWeight = isBadge ? '700' : '600';
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${themeColor}" rx="${size * 0.15}"/>
  <text 
    x="50%" 
    y="50%" 
    font-family="Arial, sans-serif" 
    font-size="${fontSize}" 
    font-weight="${fontWeight}"
    fill="${textColor}" 
    text-anchor="middle" 
    dominant-baseline="central"
  >${text}</text>
</svg>`;
}

/**
 * Generate favicon ICO (simplified - just save as SVG for now)
 */
function generateFavicon() {
  const svg = generateSVG(32, 'MM');
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svg);
  console.log('✓ Generated favicon.svg (use a converter to create favicon.ico)');
}

/**
 * Generate all icons
 */
function generateIcons() {
  console.log('Generating PWA icons...\n');

  // Generate 192x192 icon
  const icon192 = generateSVG(192, 'MM');
  fs.writeFileSync(path.join(publicDir, 'icon-192.svg'), icon192);
  console.log('✓ Generated icon-192.svg');

  // Generate 512x512 icon
  const icon512 = generateSVG(512, 'MM');
  fs.writeFileSync(path.join(publicDir, 'icon-512.svg'), icon512);
  console.log('✓ Generated icon-512.svg');

  // Generate 72x72 badge
  const badge72 = generateSVG(72, 'M', true);
  fs.writeFileSync(path.join(publicDir, 'badge-72.svg'), badge72);
  console.log('✓ Generated badge-72.svg');

  // Generate favicon
  generateFavicon();

  console.log('\n⚠️  Note: These are SVG placeholders.');
  console.log('   For production, convert to PNG using a tool like:');
  console.log('   - ImageMagick: convert icon-192.svg icon-192.png');
  console.log('   - Online converter: https://cloudconvert.com/svg-to-png');
  console.log('   - Or use a design tool to export as PNG\n');
}

// Run the generator
generateIcons();
