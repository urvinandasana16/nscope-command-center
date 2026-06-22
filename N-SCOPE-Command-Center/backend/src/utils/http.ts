export class AppError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function toDate(value: unknown) {
  if (!value) return undefined;
  return new Date(String(value));
}
