import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  function buildHost(reqOverrides: Record<string, unknown> = {}) {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const response = { status };
    const request = {
      url: '/api/v1/users/abc',
      method: 'GET',
      id: 'req-1',
      ...reqOverrides,
    };
    const host: ArgumentsHost = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
        getNext: () => undefined,
      }),
    } as unknown as ArgumentsHost;
    return { host, status, json };
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('normalizes HttpExceptions, validation arrays and Prisma error codes', () => {
    const cases: Array<{
      exception: unknown;
      statusCode: number;
      message: string;
      details?: string[];
      error: string;
    }> = [
      {
        exception: new NotFoundException('User not found'),
        statusCode: 404,
        message: 'User not found',
        error: 'Not Found',
      },
      {
        exception: new BadRequestException({
          message: ['email must be a valid email'],
          error: 'Bad Request',
          statusCode: 400,
        }),
        statusCode: 400,
        message: 'Validation failed',
        details: ['email must be a valid email'],
        error: 'Bad Request',
      },
      {
        exception: Object.assign(
          new Prisma.PrismaClientKnownRequestError('unique', {
            code: 'P2002',
            clientVersion: '7',
          }),
          {},
        ),
        statusCode: 409,
        message: 'A record with the provided unique field already exists',
        error: 'Conflict',
      },
      {
        exception: new Prisma.PrismaClientKnownRequestError('missing', {
          code: 'P2025',
          clientVersion: '7',
        }),
        statusCode: 404,
        message: 'Record not found',
        error: 'Not Found',
      },
      {
        exception: new ConflictException('Email taken'),
        statusCode: 409,
        message: 'Email taken',
        error: 'Conflict',
      },
    ];

    for (const c of cases) {
      const { host, status, json } = buildHost();
      filter.catch(c.exception, host);

      expect(status).toHaveBeenCalledWith(c.statusCode);
      const body = json.mock.calls[0][0] as Record<string, unknown>;
      expect(body).toMatchObject({
        statusCode: c.statusCode,
        error: c.error,
        message: c.message,
        path: '/api/v1/users/abc',
        requestId: 'req-1',
      });
      expect(body.timestamp).toEqual(expect.any(String));
      if (c.details) expect(body.details).toEqual(c.details);
      else expect(body).not.toHaveProperty('details');
    }
  });

  it('maps unknown errors to 500 and logs them', () => {
    const errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const { host, status, json } = buildHost();

    filter.catch(new Error('boom'), host);

    expect(status).toHaveBeenCalledWith(500);
    const body = json.mock.calls[0][0] as Record<string, unknown>;
    expect(body).toMatchObject({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
    expect(body.stack).toEqual(expect.any(String));
    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: 'req-1' }),
      'Unhandled exception',
    );
  });
});
