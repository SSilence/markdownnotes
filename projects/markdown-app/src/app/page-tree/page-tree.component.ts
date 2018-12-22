import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Page } from '../shared/page';
import { Router } from '@angular/router';

@Component({
  selector: 'app-page-tree',
  templateUrl: './page-tree.component.html',
  styleUrls: ['./page-tree.component.css']
})
export class PageTreeComponent {

    private _pages: Page[];
    
    @Input()
    active: string = null;

    constructor() {}

    @Input()
    get pages() {
        return this._pages;
    }

    set pages(val) {
        this._pages = val;
    }

    getChildren = (page: Page) => page && page.children ? page.children : [];
}
