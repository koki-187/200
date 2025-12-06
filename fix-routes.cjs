// Fix _routes.json to exclude static assets and remove conflicting index.html
const fs = require('fs');
const path = require('path');

const routesPath = path.join(__dirname, 'dist', '_routes.json');
const indexHtmlPath = path.join(__dirname, 'dist', 'index.html');

// Remove index.html that conflicts with Worker routes
if (fs.existsSync(indexHtmlPath)) {
  fs.unlinkSync(indexHtmlPath);
  console.log('✓ Removed dist/index.html to prevent conflicts with Worker routes');
}

if (fs.existsSync(routesPath)) {
  const routes = JSON.parse(fs.readFileSync(routesPath, 'utf-8'));
  
  // Ensure include and exclude arrays exist
  if (!routes.include) {
    routes.include = ['/*'];
  }
  if (!routes.exclude) {
    routes.exclude = [];
  }
  
  // Remove specific routes from include to avoid conflicts with wildcard excludes
  // /gallery and /showcase routes will be handled by the /* wildcard
  routes.include = routes.include.filter(path => 
    path !== '/gallery' && path !== '/showcase'
  );
  
  // Exclude static gallery images (not /gallery route)
  if (!routes.exclude.includes('/gallery/*')) {
    routes.exclude.push('/gallery/*');
  }
  
  if (!routes.exclude.includes('/logo-3d.png')) {
    routes.exclude.push('/logo-3d.png');
  }
  
  if (!routes.exclude.includes('/favicon.ico')) {
    routes.exclude.push('/favicon.ico');
  }
  
  // Add static files to exclude list
  if (!routes.exclude.includes('/static/*')) {
    routes.exclude.push('/static/*');
  }
  
  // Explicitly remove test-reinfolib.html from exclude list to make it accessible
  routes.exclude = routes.exclude.filter(path => path !== '/test-reinfolib.html');
  
  fs.writeFileSync(routesPath, JSON.stringify(routes, null, 2));
  console.log('✓ Updated _routes.json to exclude static assets and fixed route conflicts');
} else {
  console.log('⚠ _routes.json not found');
}
