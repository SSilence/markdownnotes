import { Component, OnInit, ViewChild } from '@angular/core';
import { BackendService } from '../shared/backend.service';
import { FileDto } from '../shared/file-dto';
import { Observable } from 'rxjs';
import { UploadFile, UploadEvent, FileSystemFileEntry } from 'ngx-file-drop';
import { tap } from 'rxjs/operators';

@Component({
  selector: 'app-files',
  templateUrl: './files.component.html',
  styleUrls: ['./files.component.css']
})
export class FilesComponent implements OnInit {

    @ViewChild('addFiles') addFiles;

    files$: Observable<FileDto[]> = null;
    error: any = null;
    uploading = false;
    fileToDelete: FileDto = null;

    constructor(private backendService: BackendService) { }

    ngOnInit() {
        this.files$ = this.backendService.getAllFiles();
    }

    public dropped(event: UploadEvent) {
        for (const droppedFile of event.files) {
            if (!droppedFile.fileEntry.isFile) {
                continue;
            }

            this.uploading = true;
            const fileEntry = droppedFile.fileEntry as FileSystemFileEntry;
            fileEntry.file((file: File) => {
                this.backendService.saveFile(droppedFile.relativePath, file).pipe(
                    tap(() => this.files$ = this.backendService.getAllFiles())
                ).subscribe(
                    () => { this.uploading = false; },
                    error => { this.error = error; this.uploading = false; }
                );
            });
        }
    }

    public delete() {
        (this.fileToDelete as any).loading = true;
        this.backendService.deleteFile(this.fileToDelete.name).pipe(
            tap(() => this.files$ = this.backendService.getAllFiles())
        ).subscribe(
            () => { this.fileToDelete = null; },
            error => { this.error = error; (this.fileToDelete as any).loading = false; }
        );
    }

    onFilesAdded() {
        const files: File[] = this.addFiles.nativeElement.files;
        for (const droppedFile of files) {
            const file: File = droppedFile;
            const fakeFileEntry: FileSystemFileEntry = {
                name: file.name,
                isDirectory: false,
                isFile: true,
                file: (callback: (filea: File) => void): void => {
                    callback(file);
                }
            };
            const toUpload: UploadFile = new UploadFile(fakeFileEntry.name, fakeFileEntry);
            this.dropped(new UploadEvent([toUpload]));
            this.addFiles.nativeElement.files = null;
        }
    }
}
