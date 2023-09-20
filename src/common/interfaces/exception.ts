export interface IExceptionErrorMessage {
  key: string;
  args: Record<string, unknown>;
  message?: string[];
  error: string;
}
