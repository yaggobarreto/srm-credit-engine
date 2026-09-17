import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CurrencyModule } from './currency/currency.module';
import { PricingConfigModule } from './pricing-config/pricing-config.module';
import { PricingModule } from './pricing/pricing.module';
import { ReceivablesModule } from './receivables/receivables.module';
import { ReportsModule } from './reports/reports.module';
import { SettlementsModule } from './settlements/settlements.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USERNAME', 'srm'),
        password: config.get<string>('DB_PASSWORD', 'srm'),
        database: config.get<string>('DB_NAME', 'srm_credit_engine'),
        autoLoadEntities: true,
        // Só em dev: sincroniza o schema a partir das entities. Em produção
        // isso seria substituído por migrations versionadas (fora do escopo
        // desta entrega — ver DECISIONS.md).
        synchronize: config.get<string>('NODE_ENV', 'development') !== 'production',
      }),
    }),
    PricingModule,
    PricingConfigModule,
    CurrencyModule,
    ReceivablesModule,
    SettlementsModule,
    ReportsModule,
  ],
})
export class AppModule {}
