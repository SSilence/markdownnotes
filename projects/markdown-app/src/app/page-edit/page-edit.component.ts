import { Component, OnInit } from '@angular/core';
import { Page } from '../shared/page';
import { ActivatedRoute, Router } from '@angular/router';
import { BackendService } from '../shared/backend.service';
import { switchMap, map, tap } from 'rxjs/operators';
import { of, timer } from 'rxjs';
import { IconService } from '../shared/icon.service';

@Component({
  selector: 'app-page-edit',
  templateUrl: './page-edit.component.html',
  styleUrls: ['./page-edit.component.css']
})
export class PageEditComponent implements OnInit {

    page: Page = null;
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
        .subscribe(
            page => this.page = page,
            error => { this.error = error; this.loading = false; }
        );
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
        this.backendService.savePage(this.page).subscribe(
            page => {
                if (show) {
                    this.router.navigate(['/page', page.id]);
                } else {
                    this.router.navigate(['/page', 'edit', page.id]);
                    this.success = true;
                    timer(3000).subscribe(() => this.success = false);
                }
            },
            error => { this.error = error }
        );
    }

    delete() {
        this.error = null;
        this.backendService.deletePage(this.page).subscribe(
            () => this.router.navigate(['/']),
            error => { this.error = error; this.showDeleteConfirmation = false; this.loading = false; }
        );
    }

    flattenPages(): Page[] {
        return this.backendService.getAllPagesFlatten().filter(p => p.id != this.page.id);
    }

    flattenPageTitle(page: Page): string {
        const spaces = (page.id.split(BackendService.ID_SEPARATOR).length - 1) * 4;
        if (spaces > 0) {
            return "&nbsp;".repeat(spaces) + "&rarr; " + page.title;
        }
        return page.title;
    }

}
