import express from 'express';
import request from 'supertest';
import {
  createVerifiedPropertySyncHandler,
  type ScheduledSyncOutcome,
} from '../src/routes/verifiedPropertySync';

const path = '/api/internal/property-sync-and-wait';
const complete: ScheduledSyncOutcome = {
  success: true,
  successfullyAdded: 0,
  successfullyUpdated: 1782,
  failed: 0,
  errors: [],
};

function testApp(
  getMachineSecret: () => string | undefined,
  runSync: () => Promise<ScheduledSyncOutcome>
) {
  const app = express();
  app.use(express.json());
  app.post(path, createVerifiedPropertySyncHandler({ getMachineSecret, runSync }));
  return app;
}

describe('authenticated completed-sync HTTP contract (no real network or DB)', () => {
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('returns 401 for missing authorization without running sync', async () => {
    const runSync = jest.fn(async () => complete);
    const res = await request(testApp(() => 'private-test-value', runSync)).post(path).send({});
    expect(res.status).toBe(401);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(runSync).not.toHaveBeenCalled();
  });

  it('returns 401 for incorrect authorization without running sync', async () => {
    const runSync = jest.fn(async () => complete);
    const res = await request(testApp(() => 'private-test-value', runSync))
      .post(path).set('Authorization', 'Bearer wrong').send({});
    expect(res.status).toBe(401);
    expect(runSync).not.toHaveBeenCalled();
  });

  it('fails closed when server secret is not configured', async () => {
    const runSync = jest.fn(async () => complete);
    const res = await request(testApp(() => undefined, runSync))
      .post(path).set('Authorization', 'Bearer anything').send({});
    expect(res.status).toBe(401);
    expect(runSync).not.toHaveBeenCalled();
  });

  it('does not send HTTP 200 before the actual sync promise resolves', async () => {
    let notifyStarted!: () => void;
    let finishSync!: (result: ScheduledSyncOutcome) => void;
    const started = new Promise<void>((resolve) => { notifyStarted = resolve; });
    const pendingWork = new Promise<ScheduledSyncOutcome>((resolve) => { finishSync = resolve; });
    const runSync = jest.fn(() => {
      notifyStarted();
      return pendingWork;
    });
    let replied = false;
    const reply = request(testApp(() => 'private-test-value', runSync))
      .post(path).set('Authorization', 'Bearer private-test-value').send({})
      .then((res) => { replied = true; return res; });

    await started;
    await Promise.resolve();
    expect(replied).toBe(false);

    finishSync(complete);
    const res = await reply;
    expect(runSync).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.complete).toBe(true);
    expect(res.body.successfullyUpdated).toBe(1782);
    expect(res.body.failed).toBe(0);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(JSON.stringify(res.body)).not.toContain('private-test-value');
  });

  it('returns 502 when source rows are empty', async () => {
    const res = await request(testApp(() => 'test', async () => ({
      ...complete, successfullyUpdated: 0,
    }))).post(path).set('Authorization', 'Bearer test').send({});
    expect(res.status).toBe(502);
    expect(res.body.complete).toBe(false);
  });

  it('returns 502 for partial update failures', async () => {
    const res = await request(testApp(() => 'test', async () => ({
      ...complete, successfullyUpdated: 1700, failed: 82,
    }))).post(path).set('Authorization', 'Bearer test').send({});
    expect(res.status).toBe(502);
    expect(res.body.failed).toBe(82);
    expect(res.body.success).toBe(false);
  });

  it('returns 502 for an error reported alongside updated records', async () => {
    const res = await request(testApp(() => 'test', async () => ({
      ...complete, errors: [{ propertyNumber: 'TEST', message: 'masked' }],
    }))).post(path).set('Authorization', 'Bearer test').send({});
    expect(res.status).toBe(502);
    expect(JSON.stringify(res.body)).not.toContain('TEST');
    expect(JSON.stringify(res.body)).not.toContain('masked');
  });

  it('returns 500 without disclosing error details if service throws', async () => {
    const res = await request(testApp(() => 'test', async () => {
      throw new Error('Internal connection detail - do not disclose');
    })).post(path).set('Authorization', 'Bearer test').send({});
    expect(res.status).toBe(500);
    expect(res.body.complete).toBe(false);
    expect(JSON.stringify(res.body)).not.toContain('Internal connection detail');
  });
});
