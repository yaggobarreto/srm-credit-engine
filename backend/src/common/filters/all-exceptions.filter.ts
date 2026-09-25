import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
}

/**
 * Handler global de exceções (seção 6, requisito de Pleno). Sem isto, uma
 * exceção não prevista (ex.: erro de driver do banco, bug num service)
 * derruba a resposta com um 500 cru do Express, sem log estruturado e sem
 * garantia de que o corpo da resposta não vaze detalhe interno — exatamente
 * o tipo de lacuna que o Anexo A tem ao engolir o erro e responder 200 OK.
 *
 * Duas regras:
 *  - HttpException (validação, NotFoundException, ConflictException etc.):
 *    preserva o status/mensagem que o código já decidiu deliberadamente.
 *  - Qualquer outra coisa (erro não previsto): sempre 500, mensagem genérica
 *    pro cliente (nunca stack trace), log completo no servidor.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionHandler');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const body: ErrorBody = isHttpException
      ? this.fromHttpException(exception, status)
      : this.genericServerError(status);

    body.path = request.url;
    body.timestamp = new Date().toISOString();

    if (!isHttpException) {
      this.logger.error(
        `${request.method} ${request.url} → erro não tratado: ${
          exception instanceof Error ? exception.stack : String(exception)
        }`,
      );
    } else if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`${request.method} ${request.url} → ${status}: ${body.message}`);
    }

    response.status(status).json(body);
  }

  private fromHttpException(exception: HttpException, status: number): ErrorBody {
    const payload = exception.getResponse();

    if (typeof payload === 'string') {
      return { statusCode: status, error: exception.name, message: payload, path: '', timestamp: '' };
    }

    const { error, message } = payload as { error?: string; message?: string | string[] };
    return {
      statusCode: status,
      error: error ?? exception.name,
      message: message ?? exception.message,
      path: '',
      timestamp: '',
    };
  }

  private genericServerError(status: number): ErrorBody {
    return {
      statusCode: status,
      error: 'InternalServerError',
      // Mensagem genérica de propósito: o cliente nunca vê stack trace ou
      // detalhe de implementação — só o log do servidor tem isso.
      message: 'Erro interno inesperado. Tente novamente ou contate o suporte.',
      path: '',
      timestamp: '',
    };
  }
}
