import {ClrDatagridFilterInterface} from "@clr/angular";
import { Component, Input, Output, EventEmitter } from "@angular/core";
import { ClarityModule } from "@clr/angular";
import { CommonModule } from "@angular/common";
import { VocabularyEntry } from "src/app/models/vocabulary-entry";
import { Subject } from "rxjs";

@Component({
    selector: "phase-filter",
    standalone: true,
    imports: [ClarityModule, CommonModule],
    template: `
    <clr-checkbox-container>
        <clr-checkbox-wrapper *ngFor="let phase of phases">
            <input type="checkbox" clrCheckbox (change)="select(phase)" /> <label>{{phase}}</label>
        </clr-checkbox-wrapper>
    </clr-checkbox-container>
    `
})
export class PhaseFilterComponent implements ClrDatagridFilterInterface<VocabularyEntry> {

    @Input()
    g2e: boolean = false;

    @Output()
    filterValue = new EventEmitter();

    phases: number[] = [0, 1, 2, 3, 4, 5, 6, 7];

    selected: number[] = [];
 
    select(item: number) {
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
        if (this.g2e) {
            return this.selected.indexOf(entry.g2ePhase) != -1;
        } else {
            return this.selected.indexOf(entry.e2gPhase) != -1;
        }
    }
}