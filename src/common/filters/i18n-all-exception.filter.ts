import config from "common/config";
import { LanguageCode } from "common/constants/language";
import { IExceptionErrorMessage } from "common/interfaces/exception";
import { Request, Response } from "express";
import { I18nService } from "nestjs-i18n";

import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";

@Catch()
export class I18nAllExceptionFilter implements ExceptionFilter {
  constructor(private readonly i18n: I18nService) {}

  async catch(exception: Error | HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const statusCode = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const messageRes =
      exception instanceof HttpException
        ? <string | IExceptionErrorMessage>exception.getResponse()
        : `Internal Server Error ${config.isDevelopment ? ": " + exception.toString() : ""}`;

    const langData = <LanguageCode>ctx.getRequest<Request>().headers.lang;
    const lang = Object.values(LanguageCode).includes(langData) ? langData : LanguageCode.English;

    if (
      Array.isArray((<IExceptionErrorMessage>messageRes)?.message) ||
      typeof messageRes === "string" ||
      !Object.prototype.hasOwnProperty.call(messageRes, "key")
    ) {
      return response.status(statusCode).json({
        statusCode,
        message: typeof messageRes === "string" ? messageRes : messageRes.message,
        error: (<IExceptionErrorMessage>messageRes)?.error,
      });
    }

    const message = await this.i18n.translate(messageRes.key, {
      lang,
      args: messageRes.args,
    });

    return response.status(statusCode).json({ statusCode, message });
  }
}
