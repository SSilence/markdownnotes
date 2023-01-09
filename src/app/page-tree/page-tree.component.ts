import { Component, Input } from '@angular/core';
import { BackendService } from '../shared/backend.service';
import { Page } from '../shared/page';

@Component({
  selector: 'app-page-tree',
  templateUrl: './page-tree.component.html',
  styleUrls: ['./page-tree.component.css']
})
export class PageTreeComponent {

    private _pages: Page[] = [];
    
    @Input()
    active: string | null = null;

    constructor(private backendService: BackendService) {}

    @Input()
    get pages() {
        return this._pages;
    }

    set pages(val) {
        this._pages = val;
    }

    getChildren = (page: Page) => page && page.children ? page.children : [];

    toggle(page: Page) {
        page.expanded = !page.expanded;
        this.backendService.savePage(page).subscribe();
    }
}
