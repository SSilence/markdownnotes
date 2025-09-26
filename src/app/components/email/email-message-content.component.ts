import { Component, Input, computed, signal, Signal, ViewChild, ElementRef, AfterViewInit, OnChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MessageDto } from 'src/app/dtos/message-dto';
import { BackendService } from 'src/app/services/backend.service';
import DOMPurify from 'dompurify';

@Component({
  selector: 'app-email-message-content',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="email-content">
      @if (message && message.bodyHtml) {
        <iframe
          #emailFrame
          [src]="htmlContentUrl"
          frameborder="0"
          scrolling="auto"
          class="email-iframe">
        </iframe>
      }
    </div>
  `,
  styles: [`
    .email-content {
      width: 100%;
    }

    .email-iframe {
      width: 100%;
      min-height: 300px;
      border: none;
    }
  `]
})
export class EmailMessageContentComponent implements AfterViewInit, OnChanges, OnDestroy {

  @Input() message: MessageDto | null = null;
  @Input() folder: string = '';
  @Input() loadImages!: Signal<boolean>;

  @ViewChild('emailFrame', { static: false }) emailFrame!: ElementRef<HTMLIFrameElement>;

  htmlContentUrl: SafeResourceUrl = '';

  constructor(private sanitizer: DomSanitizer) {}

  ngAfterViewInit() {
    this.updateIframeContent();
  }

  ngOnChanges() {
    this.updateIframeContent();
  }

  private sanitizedContent(rawContent: string): string {
    const cleanHtml = DOMPurify.sanitize(rawContent, {
      ALLOWED_TAGS: [
        'p', 'div', 'span', 'strong', 'b', 'em', 'i', 'u', 'a', 'ul', 'ol', 'li',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'table', 'tr', 'td', 'th',
        'tbody', 'thead', 'tfoot', 'img', 'font', 'center', 'pre', 'code', 'hr',
        'small', 'big', 'sub', 'sup', 'br', 'address', 'cite', 'del', 'ins',
        'caption', 'colgroup', 'col', 'dd', 'dl', 'dt', 's', 'strike', 'tt',
        'var', 'article', 'section', 'header', 'footer', 'main', 'aside', 'nav',
        'figure', 'figcaption', 'mark', 'time', 'html', 'head', 'body', 'meta',
        'link', 'title', 'style'
      ],
      ALLOWED_ATTR: [
        'href', 'title', 'style', 'src', 'alt', 'width', 'height', 'face', 'size',
        'color', 'border', 'cellspacing', 'cellpadding', 'align', 'valign',
        'colspan', 'rowspan', 'bgcolor', 'id', 'name', 'class', 'dir', 'lang',
        'target', 'type', 'rel', 'media', 'charset', 'content', 'http-equiv',
        'datetime', 'cite', 'start', 'reversed', 'wrap', 'span'
      ],
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'button', 'select', 'option'],
      FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover', 'onmouseout', 'onfocus', 'onblur', 'onsubmit', 'onchange'],
      KEEP_CONTENT: true,
      ALLOW_DATA_ATTR: false
    });
    return cleanHtml;
  }

  private updateIframeContent() {
    if (this.message?.bodyHtml) {
      const sanitizedHtml = this.sanitizedContent(this.message.bodyHtml);

      // Füge ein Script für die Höhenkommunikation hinzu
      const htmlWithScript = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { margin: 0; padding: 10px; font-family: Arial, sans-serif; }
          </style>
        </head>
        <body>
          <div id="email-content">${sanitizedHtml}</div>
          <script>
            function sendHeight() {
              const height = Math.max(
                document.body.scrollHeight,
                document.body.offsetHeight,
                document.documentElement.clientHeight,
                document.documentElement.scrollHeight,
                document.documentElement.offsetHeight
              );
              window.parent.postMessage({ type: 'iframe-height', height: height }, '*');
            }

            // Sende Höhe nach dem Laden
            window.addEventListener('load', sendHeight);

            // Überwache Änderungen
            if (window.ResizeObserver) {
              const resizeObserver = new ResizeObserver(sendHeight);
              resizeObserver.observe(document.body);
            }

            // Fallback mit MutationObserver
            if (window.MutationObserver) {
              const mutationObserver = new MutationObserver(sendHeight);
              mutationObserver.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeOldValue: true,
                characterData: true,
                characterDataOldValue: true
              });
            }

            // Sofortige Höhe senden
            sendHeight();
          </script>
        </body>
        </html>
      `;

      const blob = new Blob([htmlWithScript], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      this.htmlContentUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);

      // Message Listener für Höhenänderungen
      this.setupMessageListener();
    }
  }

  private messageListener = (event: MessageEvent) => {
    if (event.data.type === 'iframe-height' && this.emailFrame?.nativeElement) {
      const iframe = this.emailFrame.nativeElement;
      iframe.style.height = event.data.height + 'px';
    }
  };

  private setupMessageListener() {
    window.removeEventListener('message', this.messageListener);
    window.addEventListener('message', this.messageListener);
  }

  ngOnDestroy() {
    window.removeEventListener('message', this.messageListener);
    if (this.htmlContentUrl) {
      URL.revokeObjectURL(this.htmlContentUrl as string);
    }
  }
}