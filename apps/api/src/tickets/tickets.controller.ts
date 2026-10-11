import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ListTicketsDto } from './dto/list-tickets.dto';
import { ReplyTicketDto } from './dto/reply-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { TicketsService } from './tickets.service';

@ApiTags('tickets')
@ApiBearerAuth()
@Controller('tickets')
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Post()
  @ApiOperation({ summary: 'ثبت تیکت پشتیبانی' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTicketDto) {
    return this.tickets.create(user.id, dto);
  }

  @Get('mine')
  @ApiOperation({ summary: 'تیکت‌های من' })
  mine(@CurrentUser() user: AuthUser, @Query() query: ListTicketsDto) {
    return this.tickets.findMine(user.id, query);
  }

  @Get('mine/summary')
  @ApiOperation({ summary: 'خلاصه وضعیت تیکت‌های من' })
  summary(@CurrentUser() user: AuthUser) {
    return this.tickets.summaryForUser(user.id);
  }

  @Get('mine/:id')
  @ApiOperation({ summary: 'جزئیات تیکت من' })
  mineById(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tickets.findMineById(user.id, id);
  }

  @Post('mine/:id/reply')
  @ApiOperation({ summary: 'ارسال پاسخ در تیکت من' })
  reply(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReplyTicketDto,
  ) {
    return this.tickets.reply(user.id, id, dto);
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('ADMIN')
@Controller('admin/tickets')
export class AdminTicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Get()
  @ApiOperation({ summary: 'همه تیکت‌ها (مدیر)' })
  list(@Query() query: ListTicketsDto) {
    return this.tickets.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'جزئیات تیکت (مدیر)' })
  detail(@Param('id') id: string) {
    return this.tickets.findById(id);
  }

  @Post(':id/reply')
  @ApiOperation({ summary: 'پاسخ مدیر به تیکت' })
  reply(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReplyTicketDto,
  ) {
    return this.tickets.staffReply(admin.id, id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'تغییر وضعیت تیکت (مدیر)' })
  status(@Param('id') id: string, @Body() dto: UpdateTicketStatusDto) {
    return this.tickets.updateStatus(id, dto.status);
  }
}
