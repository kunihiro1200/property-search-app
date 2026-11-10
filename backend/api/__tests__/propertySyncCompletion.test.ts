import { isVerifiedSyncComplete } from '../src/utils/propertySyncCompletion';

describe('verified scheduled-property sync completion', () => {
  const complete = {
    success: true,
    successfullyUpdated: 126,
    failed: 0,
    errors: [] as unknown[],
  };

  it('accepts a real completed sync with updated listings', () => {
    expect(isVerifiedSyncComplete(complete)).toBe(true);
  });

  it.each([
    { name: 'reported failure', value: { ...complete, success: false } },
    { name: 'empty spreadsheet', value: { ...complete, successfullyUpdated: 0 } },
    { name: 'partial update failure', value: { ...complete, failed: 1 } },
    { name: 'recorded row error', value: { ...complete, errors: [{ message: 'test error' }] } },
    { name: 'non-finite updated count', value: { ...complete, successfullyUpdated: NaN } },
    { name: 'non-integer updated count', value: { ...complete, successfullyUpdated: 2.4 } },
  ])('rejects $name', ({ value }) => {
    expect(isVerifiedSyncComplete(value)).toBe(false);
  });
});
