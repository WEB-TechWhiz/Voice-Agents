const crypto = require('crypto');
const { logger } = require('shared');
const verifyExotelSignature = require('./verifySignature');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('verifyExotelSignature', () => {
  const originalEnv = { ...process.env };
  let warnSpy;

  beforeEach(() => {
    warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    warnSpy.mockRestore();
  });

  test('skips verification in mock mode', () => {
    process.env.MOCK_MODE = 'true';
    const req = { headers: {}, body: {} };
    const res = createResponse();
    const next = jest.fn();

    verifyExotelSignature(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('rejects requests without signature outside mock mode', () => {
    process.env.MOCK_MODE = 'false';
    const req = { headers: {}, body: {} };
    const res = createResponse();
    const next = jest.fn();

    verifyExotelSignature(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('accepts a valid signature outside mock mode', () => {
    process.env.MOCK_MODE = 'false';
    process.env.EXOTEL_API_TOKEN = 'secret';
    const rawBody = JSON.stringify({ CallSid: 'call_123' });
    const signature = crypto.createHmac('sha1', 'secret').update(rawBody).digest('hex');
    const req = {
      headers: { 'x-exotel-signature': signature },
      rawBody,
      body: { CallSid: 'call_123' }
    };
    const res = createResponse();
    const next = jest.fn();

    verifyExotelSignature(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
