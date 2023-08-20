import { Component, Input } from "@angular/core";
import { Page } from "src/app/models/page";
import { ClarityModule } from "@clr/angular";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

@Component({
    selector: 'app-vocabulary-edit',
    standalone: true,
    imports: [ClarityModule, CommonModule, FormsModule],
    templateUrl: './vocabulary-edit.component.html',
    styleUrls: ['./vocabulary-edit.component.css']
})
export class VocabularyEditComponent {

    @Input()
    page: Page | null = null;

}