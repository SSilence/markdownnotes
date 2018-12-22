import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { PageShowComponent } from './page-show/page-show.component';
import { PageEditComponent } from './page-edit/page-edit.component';
import { FilesComponent } from './files/files.component';

export const routes: Routes = [
      {
        path: '',
        component: HomeComponent
      },
      {
        path: 'page/add',
        component: PageEditComponent
      },
      {
        path: 'page/edit/:id',
        component: PageEditComponent
      },
      {
        path: 'page/:id',
        component: PageShowComponent
      },
      {
        path: 'filelist',
        component: FilesComponent
      }
];
