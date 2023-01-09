import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { BackendService } from './shared/services/backend.service';
import { AesService } from './shared/services/aes.service';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { PageTreeComponent } from './page-tree/page-tree.component';
import { ClarityModule } from '@clr/angular';
import { PageShowComponent } from './page-show/page-show.component';
import { RouterModule } from '@angular/router';
import { routes } from './app.router';
import { PageEditComponent } from './page-edit/page-edit.component';
import { HomeComponent } from './home/home.component';
import { IconService } from './shared/services/icon.service';
import { AlertErrorComponent } from './alert-error/alert-error.component';
import { FilesComponent } from './files/files.component';
import { FileSizePipe } from './shared/pipes/file-size.pipe';
import { NgxFileDropModule } from 'ngx-file-drop';
import { ClipboardModule } from 'ngx-clipboard';
import { BookmakrsPipe } from './shared/pipes/bookmarks.pipe';
import { PasswordsComponent } from './passwords/passwords.component';
import { MarkdownEditorComponent } from './markdown-editor/markdown-editor.component';
import { MarkdownPipe } from './shared/pipes/markdown.pipe';

@NgModule({
  declarations: [
    AppComponent,
    MarkdownEditorComponent,
    MarkdownPipe,
    FileSizePipe,
    BookmakrsPipe,
    PageTreeComponent,
    PageShowComponent,
    PageEditComponent,
    HomeComponent,
    AlertErrorComponent,
    FilesComponent,
    PasswordsComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    ClarityModule,
    HttpClientModule,
    FormsModule,
    NgxFileDropModule,
    ClipboardModule,
    RouterModule.forRoot(routes)
  ],
  providers: [
    BackendService,
    AesService,
    IconService,
    MarkdownPipe,
    FileSizePipe,
    BookmakrsPipe
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
