import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { NgxFileDropEntry, FileSystemFileEntry, NgxFileDropModule } from 'ngx-file-drop';
import { tap, map } from 'rxjs/operators';
import { AlertErrorComponent } from '../alert-error/alert-error.component';
import { CommonModule } from '@angular/common';
import { CdsModule } from '@cds/angular';
import { ClipboardModule } from 'ngx-clipboard';
import { FileDto } from '../dtos/file-dto';
import { BackendService } from 'src/app/services/backend.service';
import { FileSizePipe } from 'src/app/pipes/file-size.pipe';

@Component({
    selector: 'app-files',
    imports: [CdsModule, NgxFileDropModule, AlertErrorComponent, CommonModule, FileSizePipe, ClipboardModule],
    templateUrl: './files.component.html',
    styleUrls: ['./files.component.css']
})
export class FilesComponent implements OnInit {

    files$: Observable<FileDto[]> | null = null;
    error: any = null;
    uploading = false;
    sortField = "date";
    sortAsc = false;

    constructor(private backendService: BackendService) { }

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
