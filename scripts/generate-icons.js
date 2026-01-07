const fs = require('fs');
const path = require('path');

// Simple SVG to data URL converter
function generateIcon(size, filename) {
  const svg = `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="512" height="512" rx="64" fill="#1e40af"/>

  <!-- Lightning bolt shape integrated with T -->
  <g transform="translate(256, 256)">
    <!-- Main T letter -->
    <path d="M -80 -180 L 80 -180 L 80 -120 L 40 -120 L 40 140 L -40 140 L -40 -120 L -80 -120 Z"
          fill="#fbbf24"
          stroke="#f59e0b"
          stroke-width="4"/>

    <!-- Lightning bolt accent -->
    <path d="M 0 -60 L -30 20 L -10 20 L -20 80 L 10 0 L -10 0 Z"
          fill="#ffffff"
          opacity="0.9"/>

    <!-- Bottom shine effect -->
    <ellipse cx="0" cy="160" rx="100" ry="20" fill="#3b82f6" opacity="0.3"/>
  </g>

  <!-- Corner accent -->
  <circle cx="440" cy="72" r="24" fill="#fbbf24" opacity="0.5"/>
  <circle cx="72" cy="440" r="16" fill="#fbbf24" opacity="0.3"/>
</svg>
`;

  const iconsDir = path.join(__dirname, '../public/icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  const filePath = path.join(iconsDir, filename);
  fs.writeFileSync(filePath, svg.trim());
  console.log(`✓ Generated ${filename} (${size}x${size})`);
}

// Generate favicon
function generateFavicon() {
  const svg = `
<svg width="32" height="32" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="64" fill="#1e40af"/>
  <g transform="translate(256, 256)">
    <path d="M -80 -180 L 80 -180 L 80 -120 L 40 -120 L 40 140 L -40 140 L -40 -120 L -80 -120 Z"
          fill="#fbbf24" stroke="#f59e0b" stroke-width="4"/>
    <path d="M 0 -60 L -30 20 L -10 20 L -20 80 L 10 0 L -10 0 Z"
          fill="#ffffff" opacity="0.9"/>
  </g>
</svg>
`;

  const faviconPath = path.join(__dirname, '../public/favicon.svg');
  fs.writeFileSync(faviconPath, svg.trim());
  console.log('✓ Generated favicon.svg');
}

console.log('🎨 Generating Thunder PWA icons...\n');

// Generate icons
generateIcon(192, 'icon-192x192.svg');
generateIcon(512, 'icon-512x512.svg');
generateIcon(180, 'apple-touch-icon.svg');
generateFavicon();

console.log('\n✅ All icons generated successfully!');
console.log('\n📝 Note: These are SVG files. For better browser support,');
console.log('   convert them to PNG using an online tool like:');
console.log('   - https://cloudconvert.com/svg-to-png');
console.log('   - Or use a proper image conversion library\n');
