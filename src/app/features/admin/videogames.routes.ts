import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { VideoGameListComponent } from './videogames/videogame-list/videogame-list.component';
import { VideoGameFormComponent } from './videogames/videogame-form/videogame-form.component';

export const routes: Routes = [
  {
    path: '',
    component: VideoGameListComponent,
    canActivate: [authGuard]
  },
  {
    path: 'new',
    component: VideoGameFormComponent,
    canActivate: [authGuard]
  },
  {
    path: 'edit/:id',
    component: VideoGameFormComponent,
    canActivate: [authGuard]
  }
];
