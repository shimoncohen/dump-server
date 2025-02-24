import { HttpError } from '@map-colonies/error-express-handler';
import httpStatus from 'http-status-codes';

export class NotFoundError extends Error implements HttpError {
  public readonly status = httpStatus.NOT_FOUND;
}

export class DumpNameAlreadyExistsError extends Error implements HttpError {
  public readonly status = httpStatus.CONFLICT;
}

export class TimeoutError extends Error implements HttpError {
  public readonly status = httpStatus.REQUEST_TIMEOUT;
}
