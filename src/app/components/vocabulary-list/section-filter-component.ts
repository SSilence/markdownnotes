import {ClrDatagridFilterInterface} from "@clr/angular";
import { Component, Input, Output, EventEmitter } from "@angular/core";
import { ClarityModule } from "@clr/angular";
import { CommonModule } from "@angular/common";
import { VocabularyEntry } from "src/app/models/vocabulary-entry";
import { Subject } from "rxjs";

@Component({
    selector: "section-filter",
    standalone: true,
    imports: [ClarityModule, CommonModule],
    template: `
    <clr-checkbox-container>
        <clr-checkbox-wrapper *ngFor="let item of items">
            <input type="checkbox" clrCheckbox (change)="select(item)" /> <label>{{item}}</label>
        </clr-checkbox-wrapper>
    </clr-checkbox-container>
    `,
    styles: [`
        clr-checkbox-container {
            max-height: 20rem;
            overflow-y: scroll;
        }
    `]
})
export class SectionFilterComponent implements ClrDatagridFilterInterface<VocabularyEntry> {

    @Input()
    items: string[] = [];

    @Output()
    filterValue = new EventEmitter();

    selected: string[] = [];
 
    select(item: string) {
        if (this.selected.indexOf(item) == -1) {
            this.selected.push(item);
        } else {
            this.selected = this.selected.filter(i => i != item);
        }
        this.changes.next(true);
        this.filterValue.next(this.selected);
    }

    changes = new Subject<any>();
    
    isActive(): boolean { 
        return this.selected.length > 0;
    }
    
    accepts(entry: VocabularyEntry): boolean { 
        return this.selected.indexOf(entry.section) != -1;
    }
}