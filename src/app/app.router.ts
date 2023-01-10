import { Routes } from '@angular/router';
import { FilesComponent } from './components/files/files.component';
import { HomeComponent } from './components/home/home.component';
import { PageEditComponent } from './components/page-edit/page-edit.component';
import { PageShowComponent } from './components/page-show/page-show.component';
import { PasswordsComponent } from './components/passwords/passwords.component';
import { SearchComponent } from './components/search/search.component';

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
      },
      {
        path: 'passwords',
        component: PasswordsComponent
      },
      {
        path: 'search',
        component: SearchComponent
      }
];
