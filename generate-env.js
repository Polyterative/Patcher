const fs = require('fs');

const envContent = `
export const environment = {
  production: true,
  supabase: {
    url: '${process.env.SUPABASE_URL}', // SAFE to expose
    key: '${process.env.SUPABASE_ANON_KEY}' // SAFE to expose
    
  },
};
`;

fs.writeFileSync('src/environments/environment.prod.ts', envContent);