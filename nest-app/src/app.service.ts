import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getStatus(): { application: string; status: string } {
    return {
      application: 'nest-app',
      status: 'ok',
    };
  }

  getHealth(): { status: string } {
    return { status: 'ok' };
  }
}
