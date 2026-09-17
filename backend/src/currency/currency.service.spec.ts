import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LessThanOrEqual, Repository } from 'typeorm';
import { CurrencyService } from './currency.service';
import { ExchangeRateEntity } from './entities/exchange-rate.entity';

describe('CurrencyService', () => {
  let service: CurrencyService;
  let repository: jest.Mocked<Repository<ExchangeRateEntity>>;

  beforeEach(() => {
    repository = {
      create: jest.fn((input) => input as ExchangeRateEntity),
      save: jest.fn(async (entity) => ({ id: 'rate-1', createdAt: new Date(), ...entity })),
      findOne: jest.fn(),
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<ExchangeRateEntity>>;

    service = new CurrencyService(repository);
  });

  describe('registerRate', () => {
    it('cria um novo registro de câmbio com a vigência informada', async () => {
      const effectiveAt = '2026-09-17T14:30:00Z';

      const result = await service.registerRate({
        baseCurrency: 'USD',
        quoteCurrency: 'BRL',
        rate: '5.4321',
        effectiveAt,
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseCurrency: 'USD',
          quoteCurrency: 'BRL',
          rate: '5.4321',
          effectiveAt: new Date(effectiveAt),
        }),
      );
      expect(repository.save).toHaveBeenCalled();
      expect(result.rate).toBe('5.4321');
    });

    it('usa o momento atual como vigência quando effectiveAt não é informado', async () => {
      const before = Date.now();
      await service.registerRate({ baseCurrency: 'USD', quoteCurrency: 'BRL', rate: '5.43' });
      const after = Date.now();

      const createdArg = repository.create.mock.calls[0][0] as ExchangeRateEntity;
      expect(createdArg.effectiveAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(createdArg.effectiveAt.getTime()).toBeLessThanOrEqual(after);
    });

    it('rejeita baseCurrency igual a quoteCurrency', async () => {
      await expect(
        service.registerRate({ baseCurrency: 'USD', quoteCurrency: 'USD', rate: '1' }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('rejeita rate não positivo', async () => {
      await expect(
        service.registerRate({ baseCurrency: 'USD', quoteCurrency: 'BRL', rate: '0' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.registerRate({ baseCurrency: 'USD', quoteCurrency: 'BRL', rate: '-1.5' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getLatestRate', () => {
    it('busca a cotação mais recente com vigência <= "at" e ordena desc', async () => {
      const at = new Date('2026-09-17T15:00:00Z');
      const found = { id: 'rate-1', rate: '5.4321' } as ExchangeRateEntity;
      repository.findOne.mockResolvedValue(found);

      const result = await service.getLatestRate('USD', 'BRL', at);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { baseCurrency: 'USD', quoteCurrency: 'BRL', effectiveAt: LessThanOrEqual(at) },
        order: { effectiveAt: 'DESC' },
      });
      expect(result).toBe(found);
    });

    it('lança NotFoundException quando não há cotação vigente', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.getLatestRate('USD', 'BRL')).rejects.toThrow(NotFoundException);
    });
  });
});
