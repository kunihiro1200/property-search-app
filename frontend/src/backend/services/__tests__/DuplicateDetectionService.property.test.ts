import * as fc from 'fast-check';
import { DuplicateDetectionService } from '../DuplicateDetectionService';

// Feature: seller-list-management, Property 3: 驥崎､・メ繧ｧ繝・け縺ｮ蟇ｾ遘ｰ諤ｧ

describe('DuplicateDetectionService - Property Tests', () => {
  const createMockSupabase = () => ({
    from: jest.fn(),
  });

  describe('Property 3: 驥崎､・メ繧ｧ繝・け縺ｮ蟇ｾ遘ｰ諤ｧ', () => {
    /**
     * 繝励Ο繝代ユ繧｣: 莉ｻ諢上・2縺､縺ｮ螢ｲ荳ｻ繝ｬ繧ｳ繝ｼ繝陰縲。縺ｫ蟇ｾ縺励※縲・
     * A縺ｮ髮ｻ隧ｱ逡ｪ蜿ｷ縺沓縺ｮ髮ｻ隧ｱ逡ｪ蜿ｷ縺ｨ荳閾ｴ縺吶ｋ蝣ｴ蜷医・
     * B縺ｮ髮ｻ隧ｱ逡ｪ蜿ｷ繧・縺ｮ髮ｻ隧ｱ逡ｪ蜿ｷ縺ｨ荳閾ｴ縺励↑縺代ｌ縺ｰ縺ｪ繧峨↑縺・
     * 
     * 讀懆ｨｼ隕∽ｻｶ: 隕∽ｻｶ12.1
     */
    it('should satisfy symmetry property for phone number duplicate check', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate two sellers with the same phone number
          fc.record({
            sellerA: fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              phone_number: fc.string({ minLength: 10, maxLength: 15 }),
              email: fc.option(fc.emailAddress(), { nil: undefined }),
              seller_number: fc.string({ minLength: 7, maxLength: 7 }),
            }),
            sellerB: fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              email: fc.option(fc.emailAddress(), { nil: undefined }),
              seller_number: fc.string({ minLength: 7, maxLength: 7 }),
            }),
          }),
          async ({ sellerA, sellerB }) => {
            // Create fresh mock for this iteration
            const mockSupabase = createMockSupabase();
            const service = new DuplicateDetectionService(mockSupabase as any);

            // Ensure both sellers have the same phone number
            const sharedPhoneNumber = sellerA.phone_number;
            const sellerBWithSamePhone = { ...sellerB, phone_number: sharedPhoneNumber };

            // Track which seller to return based on excludeId
            mockSupabase.from.mockImplementation((_table: string) => {
              return {
                select: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    neq: jest.fn().mockImplementation((_field: string, excludeId: string) => {
                      // Return the other seller (not the excluded one)
                      const returnSeller = excludeId === sellerA.id ? sellerBWithSamePhone : sellerA;
                      
                      return Promise.resolve({
                        data: [
                          {
                            id: returnSeller.id,
                            name: returnSeller.name,
                            phone_number: returnSeller.phone_number,
                            email: returnSeller.email,
                            seller_number: returnSeller.seller_number,
                            properties: [],
                          },
                        ],
                        error: null,
                      });
                    }),
                  }),
                }),
              };
            });

            // Check if A finds B
            const matchesFromA = await service.checkDuplicateByPhone(
              sharedPhoneNumber,
              sellerA.id
            );

            // Check if B finds A
            const matchesFromB = await service.checkDuplicateByPhone(
              sharedPhoneNumber,
              sellerBWithSamePhone.id
            );

            // Symmetry property: If A finds B, then B must find A
            if (matchesFromA.length > 0) {
              expect(matchesFromB.length).toBeGreaterThan(0);
              
              // Verify that the found seller IDs match
              const foundByA = matchesFromA.find(m => m.sellerId === sellerBWithSamePhone.id);
              const foundByB = matchesFromB.find(m => m.sellerId === sellerA.id);
              
              expect(foundByA).toBeDefined();
              expect(foundByB).toBeDefined();
              
              // Verify phone numbers match
              if (foundByA && foundByB) {
                expect(foundByA.sellerInfo.phoneNumber).toBe(sharedPhoneNumber);
                expect(foundByB.sellerInfo.phoneNumber).toBe(sharedPhoneNumber);
              }
            }
          }
        ),
        { numRuns: 100 } // Run 100 iterations as per design requirements
      );
    });

    it('should satisfy symmetry property for email duplicate check', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate two sellers with the same email
          fc.record({
            sellerA: fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              phone_number: fc.string({ minLength: 10, maxLength: 15 }),
              email: fc.emailAddress(),
              seller_number: fc.string({ minLength: 7, maxLength: 7 }),
            }),
            sellerB: fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              phone_number: fc.string({ minLength: 10, maxLength: 15 }),
              seller_number: fc.string({ minLength: 7, maxLength: 7 }),
            }),
          }),
          async ({ sellerA, sellerB }) => {
            // Create fresh mock for this iteration
            const mockSupabase = createMockSupabase();
            const service = new DuplicateDetectionService(mockSupabase as any);

            // Ensure both sellers have the same email
            const sharedEmail = sellerA.email;
            const sellerBWithSameEmail = { ...sellerB, email: sharedEmail };

            // Track which seller to return based on excludeId
            mockSupabase.from.mockImplementation((_table: string) => {
              return {
                select: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    neq: jest.fn().mockImplementation((_field: string, excludeId: string) => {
                      // Return the other seller (not the excluded one)
                      const returnSeller = excludeId === sellerA.id ? sellerBWithSameEmail : sellerA;
                      
                      return Promise.resolve({
                        data: [
                          {
                            id: returnSeller.id,
                            name: returnSeller.name,
                            phone_number: returnSeller.phone_number,
                            email: returnSeller.email,
                            seller_number: returnSeller.seller_number,
                            properties: [],
                          },
                        ],
                        error: null,
                      });
                    }),
                  }),
                }),
              };
            });

            // Check if A finds B
            const matchesFromA = await service.checkDuplicateByEmail(sharedEmail, sellerA.id);

            // Check if B finds A
            const matchesFromB = await service.checkDuplicateByEmail(
              sharedEmail,
              sellerBWithSameEmail.id
            );

            // Symmetry property: If A finds B, then B must find A
            if (matchesFromA.length > 0) {
              expect(matchesFromB.length).toBeGreaterThan(0);
              
              // Verify that the found seller IDs match
              const foundByA = matchesFromA.find(m => m.sellerId === sellerBWithSameEmail.id);
              const foundByB = matchesFromB.find(m => m.sellerId === sellerA.id);
              
              expect(foundByA).toBeDefined();
              expect(foundByB).toBeDefined();
              
              // Verify emails match
              if (foundByA && foundByB) {
                expect(foundByA.sellerInfo.email).toBe(sharedEmail);
                expect(foundByB.sellerInfo.email).toBe(sharedEmail);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should satisfy symmetry property for combined phone and email check', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate two sellers with both same phone and email
          fc.record({
            sellerA: fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              phone_number: fc.string({ minLength: 10, maxLength: 15 }),
              email: fc.emailAddress(),
              seller_number: fc.string({ minLength: 7, maxLength: 7 }),
            }),
            sellerB: fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              seller_number: fc.string({ minLength: 7, maxLength: 7 }),
            }),
          }),
          async ({ sellerA, sellerB }) => {
            // Create fresh mock for this iteration
            const mockSupabase = createMockSupabase();
            const service = new DuplicateDetectionService(mockSupabase as any);

            // Ensure both sellers have the same phone and email
            const sharedPhoneNumber = sellerA.phone_number;
            const sharedEmail = sellerA.email;
            const sellerBWithSameContact = {
              ...sellerB,
              phone_number: sharedPhoneNumber,
              email: sharedEmail,
            };

            // Track which seller to return based on excludeId
            mockSupabase.from.mockImplementation((_table: string) => {
              return {
                select: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    neq: jest.fn().mockImplementation((_field: string, excludeId: string) => {
                      // Return the other seller (not the excluded one)
                      const returnSeller = excludeId === sellerA.id ? sellerBWithSameContact : sellerA;
                      
                      return Promise.resolve({
                        data: [
                          {
                            id: returnSeller.id,
                            name: returnSeller.name,
                            phone_number: returnSeller.phone_number,
                            email: returnSeller.email,
                            seller_number: returnSeller.seller_number,
                            properties: [],
                          },
                        ],
                        error: null,
                      });
                    }),
                  }),
                }),
              };
            });

            // Check if A finds B
            const matchesFromA = await service.checkDuplicates(
              sharedPhoneNumber,
              sharedEmail,
              sellerA.id
            );

            // Check if B finds A
            const matchesFromB = await service.checkDuplicates(
              sharedPhoneNumber,
              sharedEmail,
              sellerBWithSameContact.id
            );

            // Symmetry property: If A finds B, then B must find A
            if (matchesFromA.length > 0) {
              expect(matchesFromB.length).toBeGreaterThan(0);
              
              const foundByA = matchesFromA.find(m => m.sellerId === sellerBWithSameContact.id);
              const foundByB = matchesFromB.find(m => m.sellerId === sellerA.id);
              
              expect(foundByA).toBeDefined();
              expect(foundByB).toBeDefined();
              
              // Verify match types are consistent
              if (foundByA && foundByB) {
                // Both should detect the same match type (phone, email, or both)
                expect(foundByA.matchType).toBe('both');
                expect(foundByB.matchType).toBe('both');
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

