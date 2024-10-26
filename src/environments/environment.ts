export const environment = {
  production: true,
  supabase: {
    url: '', // RESTful endpoint for querying and managing your database
    key: '' // This key is safe to use in a browser if you have enabled Row Level Security for your tables and configured policies.
  },
};
