import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettlementEntity } from '../settlements/entities/settlement.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [TypeOrmModule.forFeature([SettlementEntity])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
