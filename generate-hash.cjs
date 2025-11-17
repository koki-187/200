const bcrypt = require('bcryptjs');

async function generateHashes() {
  const admin123 = await bcrypt.hash('admin123', 10);
  const agent123 = await bcrypt.hash('agent123', 10);
  
  console.log('admin123:', admin123);
  console.log('agent123:', agent123);
}

generateHashes();
