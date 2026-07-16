import { Injectable } from '@angular/core';
import { VideoGameService } from '../core/services/catalog/videogame.service';

// Thin wrapper over existing backend service logic.
@Injectable({ providedIn: 'root' })
export class GameApiService extends VideoGameService {}
