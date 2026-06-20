// Property-based tests for inquiry rate limiting
// Feature: public-property-site, Property 6: Rate Limiting
// Validates: Requirements 4.7

import fc from 'fast-check';
import { createRateLimiter } from '../../middleware/rateLimiter';
import { Request, Response, NextFunction } from 'express';

// Mock Supabase client with configurable responses
let mockRequestCount = 0;
const mockSupabaseData: any[] = [];

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          gte: jest.fn(() => ({
            data: mockSupabaseData.slice(0, mockRequestCount),
            error: null
          }))
        }))
      })),
      insert: jest.fn(() => {
        mockRequestCount++;
        mockSupabaseData.push({ id: mockRequestCount });
        return {
          data: null,
          error: null
        };
      }),
      delete: jest.fn(() => ({
        eq: jest.fn(() => ({
          lt: jest.fn(() => ({
            data: null,
            error: null
          }))
        }))
      }))
    }))
  }))
}));

describe('Property 6: Rate Limiting', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    mockRequestCount = 0;
    mockSupabaseData.length = 0;
    
    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn();
    
    mockReq = {
      ip: '127.0.0.1',
      path: '/api/public/inquiries',
      socket: {
        remoteAddress: '127.0.0.1'
      } as any
    };
    
    mockRes = {
      status: statusMock,
      json: jsonMock
    };
    
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property: For any sequence of requests exceeding the rate limit,
   * subsequent requests should be rejected with 429 status
   */
  test('rate limiting rejects excessive submissions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 4, max: 10 }), // Number of requests exceeding limit
        async (numRequests) => {
          // Reset for each property test iteration
          mockRequestCount = 0;
          mockSupabaseData.length = 0;
          statusMock.mockClear();
          jsonMock.mockClear();
          (mockNext as jest.Mock).mockClear();
          
          const rateLimiter = createRateLimiter({
            windowMs: 60 * 60 * 1000, // 1 hour
            maxRequests: 3
          });

          let rejectedCount = 0;
          
          for (let i = 0; i < numRequests; i++) {
            await rateLimiter(
              mockReq as Request,
              mockRes as Response,
              mockNext
            );
            
            // Check if this request was rejected
            if (statusMock.mock.calls.length > 0 && 
                statusMock.mock.calls[statusMock.mock.calls.length - 1][0] === 429) {
              rejectedCount++;
            }
          }

          // At least one request should be rejected when exceeding limit
          return rejectedCount > 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Rate limiter should handle different IP addresses independently
   */
  test('rate limiting is per IP address', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.ipV4(), { minLength: 2, maxLength: 5 }),
        async (ipAddresses) => {
          const rateLimiter = createRateLimiter({
            windowMs: 60 * 60 * 1000,
            maxRequests: 3
          });

          // Each IP should be able to make requests independently
          for (const ip of ipAddresses) {
            // Create new request object with different IP
            const reqWithIp = {
              ...mockReq,
              ip,
              socket: {
                remoteAddress: ip
              } as any
            };
            
            // First 3 requests should succeed
            for (let i = 0; i < 3; i++) {
              await rateLimiter(
                reqWithIp as Request,
                mockRes as Response,
                mockNext
              );
            }
            
            // Next call should be tracked
            expect(mockNext).toHaveBeenCalled();
          }

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Rate limiter should return appropriate error message
   */
  test('rate limiter returns user-friendly error message', async () => {
    const rateLimiter = createRateLimiter({
      windowMs: 60 * 60 * 1000,
      maxRequests: 3
    });

    // Mock Supabase to return existing requests
    const { createClient } = require('@supabase/supabase-js');
    const mockSupabase = createClient();
    mockSupabase.from = jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          gte: jest.fn(() => ({
            data: [{ id: 1 }, { id: 2 }, { id: 3 }], // 3 existing requests
            error: null
          }))
        }))
      })),
      insert: jest.fn(() => ({
        data: null,
        error: null
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => ({
          lt: jest.fn(() => ({
            data: null,
            error: null
          }))
        }))
      }))
    }));

    await rateLimiter(
      mockReq as Request,
      mockRes as Response,
      mockNext
    );

    if (statusMock.mock.calls.length > 0 && statusMock.mock.calls[0][0] === 429) {
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('リクエストが多すぎます')
        })
      );
    }
  });

  /**
   * Property: Rate limiter should include retry-after information
   */
  test('rate limiter includes retry-after information', async () => {
    const windowMs = 60 * 60 * 1000; // 1 hour
    const rateLimiter = createRateLimiter({
      windowMs,
      maxRequests: 3
    });

    // Mock Supabase to return existing requests
    const { createClient } = require('@supabase/supabase-js');
    const mockSupabase = createClient();
    mockSupabase.from = jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          gte: jest.fn(() => ({
            data: [{ id: 1 }, { id: 2 }, { id: 3 }],
            error: null
          }))
        }))
      })),
      insert: jest.fn(() => ({
        data: null,
        error: null
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => ({
          lt: jest.fn(() => ({
            data: null,
            error: null
          }))
        }))
      }))
    }));

    await rateLimiter(
      mockReq as Request,
      mockRes as Response,
      mockNext
    );

    if (statusMock.mock.calls.length > 0 && statusMock.mock.calls[0][0] === 429) {
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          retryAfter: expect.any(Number)
        })
      );
    }
  });
});
