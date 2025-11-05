import { Component, inject, Input } from '@angular/core';
import { ClarityModule } from '@clr/angular';

import { Router, RouterModule } from '@angular/router';
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
                <a [routerLink]="['page', page.id]" 
                   class="group !flex items-center justify-between w-full gap-0 clr-treenode-link" 
                   [class.active]="page.id==active">
                    <span class="flex items-center gap-0 flex-1 min-w-0">
                        <cds-icon [attr.shape]="page.icon" [title]="page.icon"></cds-icon>
                        <span class="overflow-hidden text-ellipsis whitespace-nowrap">{{page.title}}</span>
                    </span>
                    <span (click)="navigateToEdit($event, page.id)" 
                          class="flex items-center justify-center w-5 h-5 bg-transparent cursor-pointer opacity-0 transition-opacity duration-200 ease-in-out shrink-0 rounded group-hover:opacity-100"
                          title="Edit">
                        <cds-icon shape="pencil"></cds-icon>
                    </span>
                </a>
            </clr-tree-node>
        </clr-tree>
    `,
    styles: []
})
export class PageTreeComponent {

    private _pages: Page[] = [];
    
    @Input()
    active: string | null = null;

    private backendService = inject(BackendService);
    private router = inject(Router);

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

    navigateToEdit(event: Event, pageId: string) {
        event.preventDefault();
        event.stopPropagation();
        this.router.navigate(['page', 'edit', pageId]);
    }
}
