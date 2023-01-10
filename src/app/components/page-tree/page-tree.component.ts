import { Component, Input } from '@angular/core';
import { ClarityModule } from '@clr/angular';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CdsModule } from '@cds/angular';
import { Page } from 'src/app/models/page';
import { BackendService } from 'src/app/services/backend.service';

@Component({
  selector: 'app-page-tree',
  standalone: true,
  imports: [ClarityModule, CommonModule, RouterModule, CdsModule],
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
