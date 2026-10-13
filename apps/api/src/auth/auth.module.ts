import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { jwtSignOptions, resolveJwtSecret } from './jwt.config';
import { OtpService } from './otp.service';
import { PermissionsGuard } from './permissions.guard';
import { SmsService } from './sms.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { NotificationsModule } from '../notifications/notifications.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { SettingsModule } from '../settings/settings.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    PassportModule,
    CommonModule,
    NotificationsModule,
    SubscriptionsModule,
    SettingsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: resolveJwtSecret(config),
        signOptions: jwtSignOptions(config),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, PermissionsGuard, OtpService, SmsService],
  exports: [AuthService, OtpService],
})
export class AuthModule {}
