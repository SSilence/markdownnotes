import { Component, inject, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { NgxFileDropEntry, FileSystemFileEntry, NgxFileDropModule } from 'ngx-file-drop';
import { tap, map } from 'rxjs/operators';
import { AlertComponent } from './shared/alert.component';
import { CommonModule } from '@angular/common';
import { CdsModule } from '@cds/angular';
import { ClipboardModule } from 'ngx-clipboard';
import { FileDto } from '../dtos/file-dto';
import { BackendService } from 'src/app/services/backend.service';
import { FileSizePipe } from 'src/app/pipes/file-size.pipe';

@Component({
    selector: 'app-files',
    imports: [CdsModule, NgxFileDropModule, AlertComponent, CommonModule, FileSizePipe, ClipboardModule],
    template: `
        <h1>Files</h1>

        @if (!files$) {
            <span class="spinner spinner-inline">Loading...</span>
        }

        <app-alert [error]="error"></app-alert>
        <ngx-file-drop dropZoneLabel="Drop files here" (onFileDrop)="dropped($event)" dropZoneClassName="filedrop">
        <ng-template ngx-file-drop-content-tmp let-openFileSelector="openFileSelector">
            <button class="btn" type="button" (click)="openFileSelector()">Browse Files</button>
        </ng-template>
        </ngx-file-drop>

        @if (uploading) {
            <div class="progress loop"><progress></progress></div>
        }

        @if (files$) {
            <table class="table">
                <thead>
                <tr>
                    <th (click)="sort('name')">Filename 
                    @if (sortField=='name' && sortAsc) {
                        <cds-icon shape="angle"></cds-icon>
                    } @if (sortField=='name' && !sortAsc) {
                        <cds-icon shape="angle" flip="vertical"></cds-icon>
                    }
                    </th>
                    <th (click)="sort('size')">Size 
                    @if (sortField=='size' && sortAsc) {
                        <cds-icon shape="angle"></cds-icon>
                    } @if (sortField=='size' && !sortAsc) {
                        <cds-icon shape="angle" flip="vertical"></cds-icon>
                    }
                    </th>
                    <th (click)="sort('date')">Date 
                    @if (sortField=='date' && sortAsc) {
                        <cds-icon shape="angle"></cds-icon>
                    } 
                    @if (sortField=='date' && !sortAsc) {
                        <cds-icon shape="angle" flip="vertical"></cds-icon>
                    }
                    </th>
                    <th></th>
                </tr>
                </thead>
                <tbody>
                @for (file of files$ | async; track file) {
                    <tr>
                    <td class="left"><a href="data/files/{{file.name}}" target="_blank">{{file.name}}</a></td>
                    <td>{{file.size | fileSize}}</td>
                    <td>{{file.date | date:'medium'}}</td>
                    <td>
                        <cds-icon shape="copy-to-clipboard" size="20" ngxClipboard [cbContent]="'[' + file.name + '](data/files/' + file.name + ')'"></cds-icon>
                        &nbsp;
                        @if (!file.loading && !file.delete) {
                            <cds-icon shape="trash" size="20" (click)="file.delete = true"></cds-icon>
                        }
                        @if (!file.loading && file.delete) {
                            <button class="btn btn-danger btn-sm" type="button" (click)="delete(file)">delete</button>
                        }
                        @if (!file.loading && file.delete) {
                            <button class="btn btn-outline btn-sm btn-link" type="button" (click)="file.delete = false">cancel</button>
                        }
                        &nbsp;
                        @if (file.loading) {
                            <span class="spinner spinner-inline"></span>
                        }</td>
                    </tr>
                    }
                </tbody>
            </table>
        }
    `,
    styles: [`
        .progress {
            margin-top:1.5em;
        }

        cds-icon {
            cursor: pointer;
        }

        h1 {
            margin-top:0;
            margin-bottom:0.5em;
        }

        th {
            cursor: pointer;
        }

        td {
            width:25%;
        }

        button {
            margin:0;
        }
    `]

})
export class FilesComponent implements OnInit {

    files$: Observable<FileDto[]> | null = null;
    error: any = null;
    uploading = false;
    sortField = "date";
    sortAsc = false;

    private backendService = inject(BackendService);

    ngOnInit() {
        this.update();
    }

    public update() {
        this.files$ = this.backendService.getAllFiles().pipe(
            map(files => files.sort((a, b) => {
                    const reverse = this.sortAsc ? 1 : -1;
                    if (this.sortField == "date") {
                        return reverse * (a.date - b.date);
                    } else if (this.sortField == "size") {
                        return reverse * (a.size - b.size);
                    } else {
                        return reverse * a.name.localeCompare(b.name);
                    }
                })
            )
        );
    }

    public sort(field: string) {
        if (this.sortField == field) {
            this.sortAsc = !this.sortAsc;
        } else {
            this.sortField = field;
            this.sortAsc = true;
        }
        this.update();
    }

    public dropped(files: NgxFileDropEntry[]) {
        for (const droppedFile of files) {
            if (!droppedFile.fileEntry.isFile) {
                continue;
            }

            this.uploading = true;
            const fileEntry = droppedFile.fileEntry as FileSystemFileEntry;
            fileEntry.file((file: File) => {
                this.backendService.saveFile(droppedFile.relativePath, file).pipe(
                    tap(() => this.update())
                ).subscribe({
                    next: () => { this.uploading = false; },
                    error: (error) => { this.error = error; this.uploading = false; }
                });
            });
        }
    }

    public delete(fileToDelete: FileDto) {
        (fileToDelete as any).loading = true;
        this.backendService.deleteFile(fileToDelete.name).pipe(
            tap(() => this.update())
        ).subscribe({
            next: () => { },
            error: (error) => { this.error = error; (fileToDelete as any).loading = false; }
        });
    }
}
