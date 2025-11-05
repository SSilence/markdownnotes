import { Component, inject, Input } from '@angular/core';
import { ClarityModule } from '@clr/angular';

import { RouterModule } from '@angular/router';
import { CdsModule } from '@cds/angular';
import { Page } from 'src/app/models/page';
import { BackendService } from 'src/app/services/backend.service';

@Component({
    selector: 'app-page-tree',
    imports: [ClarityModule, RouterModule, CdsModule],
    template: `
        <clr-tree>
            <clr-tree-node *clrRecursiveFor="let page of pages; getChildren: getChildren" 
                        [clrExpandable]="page.children.length > 0"
                        (clrExpandedChange)="toggle(page)"
                        [clrExpanded]="page.expanded">
                <button [routerLink]="['page', page.id]" class="clr-treenode-link" [class.active]="page.id==active">
                    <cds-icon [attr.shape]="page.icon" [title]="page.icon"></cds-icon> {{page.title}}
                </button>
            </clr-tree-node>
        </clr-tree>
    `
})
export class PageTreeComponent {

    private _pages: Page[] = [];
    
    @Input()
    active: string | null = null;

    private backendService = inject(BackendService);

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
