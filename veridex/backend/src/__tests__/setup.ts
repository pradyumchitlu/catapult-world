// Global test setup — set env vars before any module loads
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.GEMINI_API_KEY = 'test-gemini-key';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.WORLD_APP_ID = 'test-app';
process.env.WORLD_RP_ID = 'test-rp';
process.env.WORLD_ID_PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001';
process.env.WORLD_ID_ACTION = 'test-action';
process.env.DEV_SKIP_WORLDID_VERIFY = 'true';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.PORT = '0'; // random port for tests
