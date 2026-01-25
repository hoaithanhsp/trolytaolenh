import { useState } from 'react';
import { Copy, Check, Download, Code } from 'lucide-react';

interface ResultDisplayProps {
  title: string;
  category: string;
  systemInstruction: string;
  htmlTemplate: string;
}

export default function ResultDisplay({
  title,
  category,
  systemInstruction,
  htmlTemplate
}: ResultDisplayProps) {
  const [copiedInstruction, setCopiedInstruction] = useState(false);
  const [copiedHTML, setCopiedHTML] = useState(false);
  const [activeTab, setActiveTab] = useState<'instruction' | 'html'>('instruction');

  const handleCopy = async (text: string, type: 'instruction' | 'html') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'instruction') {
        setCopiedInstruction(true);
        setTimeout(() => setCopiedInstruction(false), 2000);
      } else {
        setCopiedHTML(true);
        setTimeout(() => setCopiedHTML(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      'Education': '#10b981',
      'Management': '#3b82f6',
      'Tool': '#f59e0b',
      'Game': '#ef4444',
      'Other': '#6b7280'
    };
    return colors[cat] || colors.Other;
  };

  return (
    <div className="result-display">
      <div className="result-header">
        <div className="result-title-section">
          <h2>{title}</h2>
          <span
            className="category-badge"
            style={{ backgroundColor: getCategoryColor(category) }}
          >
            {category}
          </span>
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'instruction' ? 'active' : ''}`}
          onClick={() => setActiveTab('instruction')}
        >
          <Code className="icon" />
          System Instruction
        </button>
        <button
          className={`tab ${activeTab === 'html' ? 'active' : ''}`}
          onClick={() => setActiveTab('html')}
        >
          <Code className="icon" />
          HTML Template
        </button>
      </div>

      {activeTab === 'instruction' && (
        <div className="code-section">
          <div className="code-header">
            <span className="code-label">System Instruction</span>
            <div className="code-actions">
              <button
                className="icon-btn"
                onClick={() => handleCopy(systemInstruction, 'instruction')}
              >
                {copiedInstruction ? (
                  <Check className="icon success" />
                ) : (
                  <Copy className="icon" />
                )}
                {copiedInstruction ? 'Đã copy!' : 'Copy'}
              </button>
              <button
                className="icon-btn"
                onClick={() => handleDownload(systemInstruction, 'system-instruction.md')}
              >
                <Download className="icon" />
                Tải xuống
              </button>
            </div>
          </div>
          <pre className="code-block">
            <code>{systemInstruction}</code>
          </pre>
        </div>
      )}

      {activeTab === 'html' && (
        <div className="code-section">
          <div className="code-header">
            <span className="code-label">HTML Template</span>
            <div className="code-actions">
              <button
                className="icon-btn"
                onClick={() => handleCopy(htmlTemplate, 'html')}
              >
                {copiedHTML ? (
                  <Check className="icon success" />
                ) : (
                  <Copy className="icon" />
                )}
                {copiedHTML ? 'Đã copy!' : 'Copy'}
              </button>
              <button
                className="icon-btn"
                onClick={() => handleDownload(htmlTemplate, 'app.html')}
              >
                <Download className="icon" />
                Tải xuống
              </button>
            </div>
          </div>
          <pre className="code-block">
            <code>{htmlTemplate}</code>
          </pre>
        </div>
      )}

      <div className="usage-guide">
        <h3>📖 Cách sử dụng:</h3>
        <ol>
          <li>Copy nội dung System Instruction ở trên</li>
          <li>Mở <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer">Google AI Studio</a></li>
          <li>Dán vào ô "System Instructions"</li>
          <li>Nhập dữ liệu của bạn hoặc yêu cầu chi tiết hơn</li>
          <li>AI sẽ tạo code HTML hoàn chỉnh theo mẫu!</li>
        </ol>
      </div>
    </div>
  );
}
