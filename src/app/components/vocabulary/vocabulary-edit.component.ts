import { Component, Input } from "@angular/core";
import { Page } from "src/app/models/page";
import { ClarityModule } from "@clr/angular";

import { FormsModule } from "@angular/forms";

@Component({
    selector: 'app-vocabulary-edit',
    imports: [ClarityModule, FormsModule],
    template: `
        <clr-input-container>
            <label>Titel</label>
            <input clrInput type="text" [(ngModel)]="page!.title" name="title" placeholder="title for the vocabulary" />
        </clr-input-container>
        <clr-input-container>
            <label>Image</label>
            <input clrInput type="text" [(ngModel)]="page!.icon" name="example" placeholder="image for the vocabulary" />
        </clr-input-container>
        <clr-checkbox-wrapper>
            <input clrCheckbox type="checkbox" [(ngModel)]="page!.disabled" />
            <label>Disabled</label>
        </clr-checkbox-wrapper>
    `,
    styles: [`
        .clr-form-control {
            margin-top: 0;
            margin-bottom: 1rem;
        }
    `]
})
export class VocabularyEditComponent {

    @Input()
    page: Page | null = null;

}