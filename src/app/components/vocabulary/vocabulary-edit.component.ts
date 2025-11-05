import { Component, Input } from "@angular/core";
import { Page } from "src/app/models/page";
import { ClarityModule } from "@clr/angular";

import { FormsModule } from "@angular/forms";

@Component({
    selector: 'app-vocabulary-edit',
    imports: [ClarityModule, FormsModule],
    template: `
        <div class="space-y-4 w-full">
            <div class="w-full">
                <label class="block text-sm font-medium mb-1">Titel</label>
                <input type="text" [(ngModel)]="page!.title" name="title" placeholder="title for the vocabulary" class="w-full px-3 py-2 border border-gray-300 rounded-md bg-white" />
            </div>
            <div class="w-full">
                <label class="block text-sm font-medium mb-1">Image</label>
                <input type="text" [(ngModel)]="page!.icon" name="example" placeholder="image for the vocabulary" class="w-full px-3 py-2 border border-gray-300 rounded-md bg-white" />
            </div>
            <div class="mt-4">
                <label class="flex items-center">
                    <input type="checkbox" [(ngModel)]="page!.disabled" class="mr-2" />
                    <span class="text-sm font-medium ml-2">Disabled</span>
                </label>
            </div>
        </div>
    `
})
export class VocabularyEditComponent {

    @Input()
    page: Page | null = null;

}