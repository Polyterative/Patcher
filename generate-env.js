const fs = require('fs');

const envContent = `
export const environment = {
  production: true,
  supabase: {
    url: '${process.env.SUPABASE_URL}', // SECRET, comes from the build script
    key: '${process.env.SUPABASE_KEY}' // SECRET, comes from the build script
  },
};
`;

fs.writeFileSync('src/environments/environment.prod.ts', envContent);