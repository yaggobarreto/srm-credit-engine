import { ArgumentsHost, BadRequestException, NotFoundException } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

function createHost(request: { method: string; url: string }) {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const response = { status };

  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();
  const request = { method: 'POST', url: '/settlements' };

  it('preserva status e mensagem de uma HttpException conhecida', () => {
    const { host, status, json } = createHost(request);

    filter.catch(new NotFoundException('Recebível X não encontrado'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: 'Recebível X não encontrado',
        path: '/settlements',
      }),
    );
  });

  it('preserva mensagem em array de uma BadRequestException (ex.: ValidationPipe)', () => {
    const { host, status, json } = createHost(request);

    filter.catch(new BadRequestException(['faceValue deve ser positivo']), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: ['faceValue deve ser positivo'] }),
    );
  });

  it('converte um erro não previsto em 500 com mensagem genérica, sem vazar o erro original', () => {
    const { host, status, json } = createHost(request);

    filter.catch(new Error('conexão com o banco perdida no meio da query'), host);

    expect(status).toHaveBeenCalledWith(500);
    const body = json.mock.calls[0][0];
    expect(body.statusCode).toBe(500);
    expect(body.message).not.toContain('conexão com o banco');
    expect(body.error).toBe('InternalServerError');
  });

  it('converte um valor não-Error lançado (ex.: throw "string") em 500 sem quebrar', () => {
    const { host, status } = createHost(request);

    expect(() => filter.catch('algo deu errado', host)).not.toThrow();
    expect(status).toHaveBeenCalledWith(500);
  });
});
