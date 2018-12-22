import { Component, AfterViewInit, Output, EventEmitter, Input, ViewChildren } from '@angular/core';
import { MarkdownPipe } from './markdown.pipe';
import * as SimpleMDE from 'simplemde/dist/simplemde.min.js';

@Component({
  selector: 'lib-markdown-editor',
  templateUrl: './markdown-editor.component.html',
  styleUrls: ['./markdown-editor.component.css']
})
export class MarkdownEditorComponent implements AfterViewInit {

    @ViewChildren('markdown') markdown;

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
        this.editor = new SimpleMDE({
            element: this.markdown.first.nativeElement,
            showIcons: ['code', 'table'],
            hideIcons: ['side-by-side', 'fullscreen'],
            autoDownloadFontAwesome: false,
            spellChecker: false,
            status: false,
            previewRender: (plainText) => this.markdownPipe.transform(plainText)
        });
        this.editor.value(this._content);
        this.editor.codemirror.on('change', () => this.content = this.editor.value());
    }

}
