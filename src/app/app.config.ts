import { APP_INITIALIZER, ApplicationConfig, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  provideHttpClient,
  withInterceptorsFromDi,
  withFetch
} from '@angular/common/http';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { provideToastr } from 'ngx-toastr';

import { routes } from './app.routes';
import { AuthInterceptor } from './core/interceptors/auth.interceptors';
import { environment } from '../environments/environment';
import { VideoGameService } from './core/services/catalog/videogame.service';
import { GameApiService } from './services/game-api.service';
import { GameMockService } from './services/videogame-mock.service';
import { initializeRuntimeDataMode } from './core/config/runtime-data-mode.initializer';

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: initializeRuntimeDataMode,
      multi: true,
    },

    provideRouter(routes),

    provideHttpClient(
      withInterceptorsFromDi(),
      withFetch()
    ),

    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },

    {
      provide: VideoGameService,
      useFactory: () =>
        environment.useMockData
          ? inject(GameMockService)
          : inject(GameApiService),
    },

    provideToastr({
      timeOut: 3000,
      positionClass: 'toast-top-right',
      preventDuplicates: true
    })
  ]
};
