export const environment = {
  production: false,
  supabase: {
    url: 'https://sozmatmywjpstwidzlss.supabase.co', // RESTful endpoint for querying and managing your database
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTYxODA4NDU1OCwiZXhwIjoxOTMzNjYwNTU4fQ.3pSLsqyaCAGgISvOrHMt2CIX9hQowty2r8etzMwlpy8' // This key is safe to use in a browser if you have enabled Row Level Security for your tables and configured policies.
  },
};
