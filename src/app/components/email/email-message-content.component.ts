import { Component, Input, computed, signal, Signal, ViewChild, ElementRef, AfterViewInit, OnChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MessageDto } from 'src/app/dtos/message-dto';
import { BackendService } from 'src/app/services/backend.service';
import DOMPurify from 'dompurify';
import { firstValueFrom } from 'rxjs';

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

  constructor(private sanitizer: DomSanitizer, private backendService: BackendService) {}

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

  private async replaceCidReferences(html: string): Promise<string> {
    if (!this.message?.attachments || !this.folder || !this.message.id) {
      return html;
    }

    let processedHtml = html;
    const cidMatches = new Map<string, string>();

    // Sammle alle CID-Referenzen
    const cidRegex = /cid:([^"'\s)]+)/gi;
    let match;
    while ((match = cidRegex.exec(html)) !== null) {
      const cid = match[1];
      if (!cidMatches.has(cid)) {
        cidMatches.set(cid, '');
      }
    }

    // Lade alle Attachments parallel
    const loadPromises = Array.from(cidMatches.keys()).map(async (cid) => {
      const attachment = this.message!.attachments!.find(att => att.cid === cid);
      if (attachment && attachment.name) {
        try {
          const blob = await firstValueFrom(this.backendService.getAttachmentBlob(this.folder, this.message!.id, attachment.name));
          if (blob) {
            return new Promise<{ cid: string, dataUrl: string }>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve({ cid, dataUrl: reader.result as string });
              reader.readAsDataURL(blob);
            });
          }
        } catch (error) {
          console.warn(`Failed to load attachment for cid:${cid}`, error);
        }
      }
      return { cid, dataUrl: '' };
    });

    const loadedAttachments = await Promise.all(loadPromises);

    // Aktualisiere die CID-Map mit den Data-URLs
    loadedAttachments.forEach(({ cid, dataUrl }) => {
      if (dataUrl) {
        cidMatches.set(cid, dataUrl);
      }
    });

    // Ersetze alle CID-Referenzen durch Data-URLs
    cidMatches.forEach((dataUrl, cid) => {
      if (dataUrl) {
        const cidPattern = new RegExp(`cid:${cid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi');
        processedHtml = processedHtml.replace(cidPattern, dataUrl);
      }
    });

    return processedHtml;
  }

  private async updateIframeContent() {
    if (this.message?.bodyHtml) {
      let processedHtml = this.message.bodyHtml;

      // Ersetze CID-Referenzen durch Data-URLs
      processedHtml = await this.replaceCidReferences(processedHtml);

      // Bereinige das HTML
      const sanitizedHtml = this.sanitizedContent(processedHtml);

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