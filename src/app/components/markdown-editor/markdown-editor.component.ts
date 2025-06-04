
import { Component, AfterViewInit, Output, EventEmitter, Input, ViewChildren } from '@angular/core';
import EasyMDE from 'easymde/dist/easymde.min.js';
import { MarkdownPipe } from 'src/app/pipes/markdown.pipe';

@Component({
    selector: 'markdown-editor',
    imports: [],
    templateUrl: './markdown-editor.component.html',
    styleUrls: ['./markdown-editor.component.css']
})
export class MarkdownEditorComponent implements AfterViewInit {

    @ViewChildren('markdown') markdown: any;

    private editor: any = null;
    _content = '';

    @Output() contentChange = new EventEmitter();

    constructor(private markdownPipe: MarkdownPipe) { }

    @Input()
    get content() {
        return this._content;
    }

    set content(val) {
        this._content = val;
        this.contentChange.emit(val);
    }

    ngAfterViewInit() {
        this.editor = new EasyMDE({
            element: this.markdown.first.nativeElement,
            showIcons: ['code', 'table'],
            hideIcons: ['side-by-side', 'fullscreen'],
            toolbar: ["bold", "italic", "heading", "|", "code", "quote", "unordered-list", "ordered-list", "|", "link", "image", "table", "|", "preview", "help"],
            autoDownloadFontAwesome: false,
            spellChecker: false,
            status: false,
            previewRender: (plainText: any) => this.markdownPipe.transform(plainText)
        });
        this.editor.value(this._content);
        this.editor.codemirror.on('change', () => this.content = this.editor.value());
    }

}
