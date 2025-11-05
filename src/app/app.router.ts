import { Routes } from '@angular/router';
import { HomeComponent } from './components/home.component';
import { PageEditComponent } from './components/page/page-edit.component';
import { PageShowComponent } from './components/page/page-show.component';
import { FilesComponent } from './components/files.component';
import { SearchComponent } from './components/page/search.component';
import { VocabularyComponent } from './components/vocabulary/vocabulary.component';
import { VocabularyListComponent } from './components/vocabulary/vocabulary-list.component';
import { EmailComponent } from './components/email/email.component';
import { PasswordsComponent } from './components/passwords/passwords.component';

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
      },
      {
        path: 'email',
        component: EmailComponent
      }
];
