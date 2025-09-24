import { Component, Input, computed, signal, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import { MessageDto } from 'src/app/dtos/message-dto';
import { BackendService } from 'src/app/services/backend.service';
import DOMPurify from 'dompurify';

@Component({
  selector: 'app-email-message-content',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="email-content">
      @if (message) {
        @if (sanitizedContent()) {
          <div [innerHTML]="sanitizedContent()" class="email-body"></div>
        } @else {
          <div class="no-content">Kein Inhalt verfügbar</div>
        }
      } @else {
        <div class="no-message">Keine Nachricht geladen</div>
      }
    </div>
  `,
  styles: [`
    .email-content {
      line-height: 1.4;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      overflow-y: auto;
      flex: 1;
    }

    .email-body {
      white-space: normal;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .email-body ::ng-deep div {
      margin: 0 0 0.75em 0;
    }

    .email-body ::ng-deep p {
      margin: 0 0 0.5em 0;
    }

    .email-body ::ng-deep a {
      color: #0066cc;
      text-decoration: none;
    }

    .email-body ::ng-deep a:hover {
      text-decoration: underline;
    }

    .email-body ::ng-deep table {
      border-collapse: collapse;
      width: 100%;
      margin: 0;
    }

    .email-body ::ng-deep td,
    .email-body ::ng-deep th {
      padding: 0;
      text-align: left;
      border: none;
    }

    .email-body ::ng-deep th {
      background-color: #f2f2f2;
      font-weight: bold;
    }

    .email-body ::ng-deep img {
      max-width: 100%;
      height: auto;
      display: inline-block;
      vertical-align: middle;
    }

    .email-body ::ng-deep blockquote {
      border-left: 4px solid #ccc;
      padding-left: 1em;
      margin: 1em 0;
      color: #666;
    }

    .email-body ::ng-deep center {
      display: block;
      text-align: center;
    }

    .email-body ::ng-deep style,
    .email-body ::ng-deep head,
    .email-body ::ng-deep meta {
      display: none !important;
    }

    .email-body ::ng-deep hr {
      border: none;
      border-top: 1px solid #ccc;
      margin: 0.5em 0;
    }

    .email-body ::ng-deep .footer-content-section {
      margin: 0.5em 0 !important;
    }

    .email-body ::ng-deep .footer-section {
      padding-top: 20px !important;
      padding-bottom: 10px !important;
    }

    .email-body ::ng-deep pre {
      white-space: pre-wrap;
      word-break: break-word;
      background: #f9f9f9;
      padding: 1em;
      border-radius: 4px;
      font-family: monospace;
    }

    .email-body ::ng-deep code {
      background: #f2f2f2;
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-family: monospace;
    }

    .email-body ::ng-deep .hidden,
    .email-body ::ng-deep [style*="display:none"],
    .email-body ::ng-deep [style*="visibility:hidden"] {
      display: none !important;
    }

    .no-content {
      color: #666;
      font-style: italic;
    }

    .no-message {
      color: #999;
      font-style: italic;
    }
  `]
})
export class EmailMessageContentComponent {

  @Input() message: MessageDto | null = null;
  @Input() folder: string = '';
  @Input() loadImages!: Signal<boolean>;

  constructor(private sanitizer: DomSanitizer, private backendService: BackendService) {}

  sanitizedContent = computed(() => {
    this.loadImages();
    if (!this.message) {
      return null;
    }

    const html = this.message.bodyHtml?.trim();
    console.info(html);
    const fallbackText = this.message.bodyText?.replace(/</g, '&lt;').replace(/>/g, '&gt;') ?? '';
    const rawContent = html || `<pre>${fallbackText}</pre>`;

    const cleanHtml = DOMPurify.sanitize(rawContent, {
      ALLOWED_TAGS: [
        'p', 'div', 'span', 'strong', 'b', 'em', 'i', 'u', 'a', 'ul', 'ol', 'li',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'table', 'tr', 'td', 'th',
        'tbody', 'thead', 'tfoot', 'img', 'font', 'center', 'pre', 'code', 'hr'
      ],
      ALLOWED_ATTR: [
        'href', 'title', 'style', 'src', 'alt', 'width', 'height', 'face', 'size',
        'color', 'border', 'cellspacing', 'cellpadding', 'align', 'valign',
        'colspan', 'rowspan', 'bgcolor', 'id', 'name'
      ],
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
      FORBID_ATTR: ['onerror', 'onclick', 'onload'],
    });
    const cleanedHtml = this.removeEmptyElements(cleanHtml);
    return this.sanitizer.bypassSecurityTrustHtml(cleanedHtml);
  });

  private removeEmptyElements(html: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const paragraphs = doc.querySelectorAll('p');
    paragraphs.forEach(p => {
      if (p.innerHTML.trim() === '' || p.innerHTML.trim() === '&nbsp;') {
        p.remove();
      }
    });
    const tables = doc.querySelectorAll('table');
    tables.forEach(table => {
      if ((table.textContent || '').trim() === '') {
        table.remove();
      }
    });
    const imgs = doc.querySelectorAll('img');
    imgs.forEach(img => {
      const src = img.getAttribute('src');
      if (src && src.startsWith('cid:')) {
        const cid = src.substring(4);
        const attachment = this.message!.attachments?.find(att => att.cid === cid);
        if (attachment) {
          const url = this.backendService.getAttachmentUrl(this.folder, this.message!.id, attachment.name);
          img.setAttribute('src', url);
        }
      } else if (!this.loadImages()) {
        img.remove();
      }
    });
    // Set rel="noopener noreferrer" for all links
    const links = doc.querySelectorAll('a');
    links.forEach(link => {
      link.setAttribute('rel', 'noopener noreferrer');
    });
    return doc.body.innerHTML;
  }
}