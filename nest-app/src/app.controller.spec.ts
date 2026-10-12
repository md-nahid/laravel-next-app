import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('returns application status', () => {
    expect(appController.getStatus()).toEqual({
      application: 'nest-app',
      status: 'ok',
    });
  });

  it('returns health status', () => {
    expect(appController.getHealth()).toEqual({ status: 'ok' });
  });
});
