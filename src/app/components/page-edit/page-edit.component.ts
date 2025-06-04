import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { switchMap, map, tap } from 'rxjs/operators';
import { of, timer } from 'rxjs';
import { AlertErrorComponent } from '../alert-error/alert-error.component';
import { CommonModule } from '@angular/common';
import { CdsModule } from '@cds/angular';
import { FormsModule } from '@angular/forms';
import { MarkdownEditorComponent } from '../markdown-editor/markdown-editor.component';
import { MarkdownPipe } from 'src/app/pipes/markdown.pipe';
import { Page } from 'src/app/models/page';
import { BackendService } from 'src/app/services/backend.service';
import { IconService } from 'src/app/services/icon.service';
import { AlertStickyComponent } from '../alert-sticky/alert-sticky.component';

@Component({
    selector: 'app-page-edit',
    imports: [
        AlertErrorComponent,
        CommonModule,
        CdsModule,
        RouterModule,
        FormsModule,
        MarkdownEditorComponent,
        AlertStickyComponent
    ],
    templateUrl: './page-edit.component.html',
    styleUrls: ['./page-edit.component.css']
})
export class PageEditComponent implements OnInit {

    page: Page | null = null;
    error: any = null;
    loading = false;
    showDeleteConfirmation = false;
    selectIconDialog = false;
    success = false;
    showMenue = false;

    constructor(private route: ActivatedRoute,
        private router: Router,
        private backendService: BackendService,
        public iconService: IconService) { }

    ngOnInit() {
        this.route.params.pipe(
            map(params => params['id']),
            tap(_ => { this.page = this.error = null; this.loading = true; } ),
            switchMap(id => id ? this.backendService.getPage(id) : of(this.createNewPage())),
            tap(_ => this.loading = false)
        )
        .subscribe({
            next: page => this.page = page,
            error: error => { this.error = error; this.loading = false; }
        });
    }

    
    @HostListener('document:keydown.control.s', ['$event'])
    onCtrlSKey(event: KeyboardEvent): void {
        this.save();
        event.preventDefault();
    }

    createNewPage() {
        const page = new Page();
        page.icon = 'file';
        page.children = [];
        page.parent = null;
        page.content = '';
        return page;
    }

    save(show = false) {
        this.error = null;
        this.backendService.savePage(this.page!).subscribe({
            next: page => {
                if (show) {
                    this.router.navigate(['/page', page.id]);
                } else {
                    this.router.navigate(['/page', 'edit', page.id]);
                    this.success = true;
                    timer(3000).subscribe(() => this.success = false);
                }
            },
            error: error => { this.error = error }
        });
    }

    delete() {
        this.error = null;
        this.backendService.deletePage(this.page!).subscribe({
            next: () => this.router.navigate(['/']),
            error: error => { this.error = error; this.showDeleteConfirmation = false; this.loading = false; }
        });
    }

    flattenPages(): Page[] {
        return this.backendService.getAllPagesFlatten().filter(p => p.id != this.page!.id);
    }

    flattenPageTitle(page: Page): string {
        const spaces = (page.id!.split(BackendService.ID_SEPARATOR).length - 1) * 4;
        if (spaces > 0) {
            return "&nbsp;".repeat(spaces) + "&rarr; " + page.title;
        }
        return page.title!;
    }

}
