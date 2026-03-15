import { Injectable } from '@angular/core';
import { VideoGameService } from '../core/services/videogame.service';

// Thin wrapper over existing backend service logic.
@Injectable({ providedIn: 'root' })
export class GameApiService extends VideoGameService {}
