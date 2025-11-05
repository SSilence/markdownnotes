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
        <h1 class="text-4xl font-bold !mt-0 !mb-2">Files</h1>

        @if (!files$) {
            <span class="spinner spinner-inline">Loading...</span>
        }

        <app-alert [error]="error"></app-alert>
        <ngx-file-drop dropZoneLabel="Drop files here" (onFileDrop)="dropped($event)" dropZoneClassName="filedrop border-2 border-dashed border-gray-300 rounded-md p-6 text-center flex flex-col items-center justify-center min-h-32">
            <ng-template ngx-file-drop-content-tmp let-openFileSelector="openFileSelector">
                <button class="btn btn-primary" type="button" (click)="openFileSelector()">Browse Files</button>
            </ng-template>
        </ngx-file-drop>

        @if (uploading) {
            <div class="mt-6"><progress class="w-full"></progress></div>
        }

        @if (files$) {
            <div class="overflow-x-auto">
                <table class="table w-full">
                    <thead>
                        <tr>
                            <th class="text-left cursor-pointer" (click)="sort('name')">Filename 
                                @if (sortField=='name' && sortAsc) {
                                    <cds-icon shape="angle"></cds-icon>
                                } @if (sortField=='name' && !sortAsc) {
                                    <cds-icon shape="angle" flip="vertical"></cds-icon>
                                }
                            </th>
                            <th class="text-left cursor-pointer" (click)="sort('size')">Size 
                                @if (sortField=='size' && sortAsc) {
                                    <cds-icon shape="angle"></cds-icon>
                                } @if (sortField=='size' && !sortAsc) {
                                    <cds-icon shape="angle" flip="vertical"></cds-icon>
                                }
                            </th>
                            <th class="text-left cursor-pointer" (click)="sort('date')">Date 
                                @if (sortField=='date' && sortAsc) {
                                    <cds-icon shape="angle"></cds-icon>
                                } 
                                @if (sortField=='date' && !sortAsc) {
                                    <cds-icon shape="angle" flip="vertical"></cds-icon>
                                }
                            </th>
                            <th class="text-left"></th>
                        </tr>
                    </thead>
                    <tbody>
                    @for (file of files$ | async; track file) {
                        <tr>
                            <td class="text-left"><a href="data/files/{{file.name}}" target="_blank" class="text-blue-600 hover:text-blue-800">{{file.name}}</a></td>
                            <td>{{file.size | fileSize}}</td>
                            <td>{{file.date | date:'medium'}}</td>
                            <td class="text-left">
                                <cds-icon shape="copy-to-clipboard" size="20" ngxClipboard [cbContent]="'[' + file.name + '](data/files/' + file.name + ')'" class="cursor-pointer mr-2"></cds-icon>
                                @if (!file.loading && !file.delete) {
                                    <cds-icon shape="trash" size="20" (click)="file.delete = true" class="cursor-pointer"></cds-icon>
                                }
                                @if (!file.loading && file.delete) {
                                    <button class="btn btn-danger btn-sm" type="button" (click)="delete(file)">delete</button>
                                }
                                @if (!file.loading && file.delete) {
                                    <button class="btn btn-outline btn-sm btn-link" type="button" (click)="file.delete = false">cancel</button>
                                }
                                @if (file.loading) {
                                    <span class="spinner spinner-inline ml-2"></span>
                                }
                            </td>
                        </tr>
                        }
                    </tbody>
                </table>
            </div>
        }
    `
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
