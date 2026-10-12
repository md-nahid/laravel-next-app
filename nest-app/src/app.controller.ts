import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getStatus(): { application: string; status: string } {
    return this.appService.getStatus();
  }

  @Get('up')
  getHealth(): { status: string } {
    return this.appService.getHealth();
  }
}
