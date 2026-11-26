import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { SmsDeviceContext, SmsDeviceRequest } from './sms-device.guard';

export const CurrentSmsDevice = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SmsDeviceContext => {
    const request = context.switchToHttp().getRequest<SmsDeviceRequest>();
    return request.smsDevice as SmsDeviceContext;
  },
);
