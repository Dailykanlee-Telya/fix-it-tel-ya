import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Printer, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DOCUMENTATION_META, DOCUMENTATION_CHAPTERS, ENUM_REFERENCE } from "@/lib/technical-documentation";
import { DOC_PDF_STYLES } from "@/lib/doc-pdf-styles";
import { getLogoBase64, DOCUMENT_LOGOS } from "@/lib/document-logo";

const TechnicalDocumentation = () => {
  const navigate = useNavigate();
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async () => {
    setIsPrinting(true);
    const logo = await getLogoBase64(DOCUMENT_LOGOS.a4);
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setIsPrinting(false);
      return;
    }

    const chaptersHtml = DOCUMENTATION_CHAPTERS.map(chapter => `
      <div class="doc-chapter">
        <div class="doc-chapter-header">
          <div class="doc-chapter-number">Kapitel ${chapter.number}</div>
          <div class="doc-chapter-title">${chapter.title}</div>
        </div>
        ${chapter.sections.map(section => `
          <div class="doc-section">
            <div class="doc-section-title">${section.title}</div>
            <div class="doc-section-content">${section.content}</div>
            ${section.code?.map(code => `
              <div class="doc-code-block">
                <div class="doc-code-header">
                  <span class="doc-code-lang">${code.language}</span>
                  ${code.title ? `<span class="doc-code-title">${code.title}</span>` : ''}
                </div>
                <div class="doc-code-content"><pre>${code.code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre></div>
              </div>
            `).join('') || ''}
            ${section.tables?.map(table => `
              <div class="doc-table-container">
                <table class="doc-table">
                  <thead><tr>${table.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
                  <tbody>${table.rows.map(row => `<tr>${row.map(cell => 
                    `<td>${cell === '✓' ? '<span class="doc-table-check">✓</span>' : cell === '✗' ? '<span class="doc-table-cross">✗</span>' : cell}</td>`
                  ).join('')}</tr>`).join('')}</tbody>
                </table>
              </div>
            `).join('') || ''}
          </div>
        `).join('')}
      </div>
    `).join('');

    const enumsHtml = Object.entries(ENUM_REFERENCE).map(([name, values]) => `
      <div class="doc-enum-card">
        <div class="doc-enum-name">${name}</div>
        <div class="doc-enum-values">${values.join(', ')}</div>
      </div>
    `).join('');

    const tocHtml = DOCUMENTATION_CHAPTERS.map((ch, i) => `
      <div class="doc-toc-chapter">
        <span class="doc-toc-number">${ch.number}.</span>
        <span class="doc-toc-text">${ch.title}</span>
        <span class="doc-toc-page">${i * 3 + 3}</span>
      </div>
    `).join('');

    const html = `<!DOCTYPE html>
<html><head>
  <meta charset="UTF-8">
  <title>Telya_Technische_Dokumentation_v${DOCUMENTATION_META.version}</title>
  <style>${DOC_PDF_STYLES}</style>
</head><body>
  <div class="doc-container">
    <div class="doc-cover">
      <img src="${logo}" class="doc-cover-logo" alt="Logo"/>
      <div class="doc-cover-title">${DOCUMENTATION_META.title}</div>
      <div class="doc-cover-subtitle">${DOCUMENTATION_META.subtitle}</div>
      <div class="doc-cover-meta">
        <div class="doc-cover-version">Version ${DOCUMENTATION_META.version}</div>
        <div>${DOCUMENTATION_META.date}</div>
        <div>${DOCUMENTATION_META.company}</div>
      </div>
    </div>
    <div class="doc-toc">
      <div class="doc-toc-title">Inhaltsverzeichnis</div>
      <div class="doc-toc-list">${tocHtml}
        <div class="doc-toc-chapter">
          <span class="doc-toc-number">A.</span>
          <span class="doc-toc-text">Anhang: ENUM-Referenz</span>
        </div>
      </div>
    </div>
    ${chaptersHtml}
    <div class="doc-appendix">
      <div class="doc-chapter-header">
        <div class="doc-chapter-number">Anhang</div>
        <div class="doc-chapter-title">ENUM-Referenz</div>
      </div>
      <div class="doc-enum-grid">${enumsHtml}</div>
    </div>
  </div>
</body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      setIsPrinting(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                {DOCUMENTATION_META.title}
              </h1>
              <p className="text-muted-foreground">{DOCUMENTATION_META.subtitle} · Version {DOCUMENTATION_META.version}</p>
            </div>
          </div>
          <Button onClick={handlePrint} disabled={isPrinting} className="gap-2">
            <Printer className="h-4 w-4" />
            {isPrinting ? "Wird erstellt..." : "Als PDF exportieren"}
          </Button>
        </div>

        <div className="space-y-6">
          {DOCUMENTATION_CHAPTERS.map(chapter => (
            <div key={chapter.id} className="bg-card border rounded-lg p-6">
              <h2 className="text-lg font-semibold text-primary mb-4">{chapter.number}. {chapter.title}</h2>
              <div className="space-y-4">
                {chapter.sections.map(section => (
                  <div key={section.id}>
                    <h3 className="font-medium text-foreground mb-2">{section.title}</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{section.content.substring(0, 300)}...</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TechnicalDocumentation;
