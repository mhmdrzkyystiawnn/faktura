import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { InternalRemindersController } from './internal-reminders.controller';
import { RemindersService } from './reminders.service';

@Module({
  imports: [PrismaModule],
  controllers: [InternalRemindersController],
  providers: [RemindersService],
  exports: [RemindersService],
})
export class RemindersModule {}
