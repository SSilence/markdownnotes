import { Component, OnInit, ViewChild } from '@angular/core';
import { BackendService } from '../shared/backend.service';
import { FileDto } from '../shared/file-dto';
import { Observable } from 'rxjs';
import { NgxFileDropEntry, FileSystemFileEntry } from 'ngx-file-drop';
import { tap } from 'rxjs/operators';

@Component({
  selector: 'app-files',
  templateUrl: './files.component.html',
  styleUrls: ['./files.component.css']
})
export class FilesComponent implements OnInit {

    files$: Observable<FileDto[]> = null;
    error: any = null;
    uploading = false;
    fileToDelete: FileDto = null;

    constructor(private backendService: BackendService) { }

    ngOnInit() {
        this.files$ = this.backendService.getAllFiles();
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
}
