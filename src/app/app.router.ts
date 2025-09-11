import { Routes } from '@angular/router';
import { FilesComponent } from './components/files.component';
import { HomeComponent } from './components/home.component';
import { PageEditComponent } from './components/page-edit.component';
import { PageShowComponent } from './components/page-show.component';
import { PasswordsComponent } from './components/passwords.component';
import { SearchComponent } from './components/search.component';
import { VocabularyComponent } from './components/vocabulary.component';
import { VocabularyListComponent } from './components/vocabulary-list.component';

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
      },
      {
        path: 'vocabulary',
        component: VocabularyComponent
      },
      {
        path: 'vocabulary/vocabular/:id',
        component: VocabularyListComponent
      }
];
