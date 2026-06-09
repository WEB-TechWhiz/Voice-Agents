const { requestId, success } = require('./http');

describe('http helpers', () => {
  test('uses incoming request id when present', () => {
    const req = { headers: { 'x-request-id': 'req_known' } };
    expect(requestId(req)).toBe('req_known');
  });

  test('sends standard success response', () => {
    const req = { headers: { 'x-request-id': 'req_known' } };
    const res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res)
    };

    success(req, res, { ok: true }, 'Done', 201);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { ok: true },
      message: 'Done',
      requestId: 'req_known'
    });
  });
});
