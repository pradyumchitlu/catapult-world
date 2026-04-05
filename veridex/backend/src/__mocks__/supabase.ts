/**
 * Mock Supabase client for testing.
 *
 * Usage in tests:
 *   import { __setMockResponse, __resetMocks } from '../__mocks__/supabase';
 *
 *   // Set what the next supabase query returns:
 *   __setMockResponse('agents', 'select', { data: [...], error: null });
 *   __setMockResponse('agents', 'insert', { data: {...}, error: null });
 */

// Store per-table, per-operation mock responses
const mockResponses: Record<string, Record<string, { data: any; error: any } | Array<{ data: any; error: any }>>> = {};

// Default response
const defaultResponse = { data: null, error: null };

export function __setMockResponse(
  table: string,
  operation: string,
  response: { data: any; error: any } | Array<{ data: any; error: any }>
) {
  if (!mockResponses[table]) mockResponses[table] = {};
  mockResponses[table][operation] = response;
}

export function __resetMocks() {
  Object.keys(mockResponses).forEach((key) => delete mockResponses[key]);
}

function getResponse(table: string, operation: string) {
  const response = mockResponses[table]?.[operation];

  if (Array.isArray(response)) {
    if (response.length === 0) {
      return defaultResponse;
    }

    if (response.length === 1) {
      return response[0];
    }

    return response.shift() || defaultResponse;
  }

  return response || defaultResponse;
}

// Chainable query builder
function createQueryBuilder(table: string, operation: string) {
  const builder: any = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockImplementation(() => {
      // Switch to 'insert' operation context
      return createQueryBuilder(table, 'insert');
    }),
    update: jest.fn().mockImplementation(() => {
      return createQueryBuilder(table, 'update');
    }),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockImplementation(() => {
      return Promise.resolve(getResponse(table, operation));
    }),
    maybeSingle: jest.fn().mockImplementation(() => {
      return Promise.resolve(getResponse(table, operation));
    }),
    // Terminal — when no .single(), the chain resolves to the response
    then: (resolve: any, reject: any) => {
      const resp = getResponse(table, operation);
      return Promise.resolve(resp).then(resolve, reject);
    },
  };

  // Override insert/update to capture and still chain
  const origInsert = builder.insert;
  builder.insert = jest.fn().mockImplementation((_data: any) => {
    return createQueryBuilder(table, 'insert');
  });
  builder.update = jest.fn().mockImplementation((_data: any) => {
    return createQueryBuilder(table, 'update');
  });

  return builder;
}

const supabase = {
  from: jest.fn().mockImplementation((table: string) => {
    return createQueryBuilder(table, 'select');
  }),
};

export default supabase;
export { supabase };
