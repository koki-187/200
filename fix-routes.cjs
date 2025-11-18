// Fix _routes.json to exclude static assets
const fs = require('fs');
const path = require('path');

const routesPath = path.join(__dirname, 'dist', '_routes.json');

if (fs.existsSync(routesPath)) {
  const routes = JSON.parse(fs.readFileSync(routesPath, 'utf-8'));
  
  // Add gallery images and logo to exclude list (but NOT /gallery route itself)
  if (!routes.exclude) {
    routes.exclude = [];
  }
  
  // Only exclude /gallery/* (static images), NOT /gallery route
  if (!routes.exclude.includes('/gallery/*')) {
    routes.exclude.push('/gallery/*');
  }
  
  if (!routes.exclude.includes('/logo-3d.png')) {
    routes.exclude.push('/logo-3d.png');
  }
  
  fs.writeFileSync(routesPath, JSON.stringify(routes, null, 2));
  console.log('✓ Updated _routes.json to exclude gallery images (/gallery/*) and logo');
} else {
  console.log('⚠ _routes.json not found');
}
