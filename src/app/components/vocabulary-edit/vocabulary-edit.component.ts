import { Component, Input } from "@angular/core";
import { Page } from "src/app/models/page";
import { ClarityModule } from "@clr/angular";

import { FormsModule } from "@angular/forms";

@Component({
    selector: 'app-vocabulary-edit',
    imports: [ClarityModule, FormsModule],
    templateUrl: './vocabulary-edit.component.html',
    styleUrls: ['./vocabulary-edit.component.css']
})
export class VocabularyEditComponent {

    @Input()
    page: Page | null = null;

}