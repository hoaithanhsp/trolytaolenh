import { useState, useEffect } from 'react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string) => void;
  currentApiKey: string;
}

export default function ApiKeyModal({ isOpen, onClose, onSave, currentApiKey }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState(currentApiKey);
  const [error, setError] = useState('');

  useEffect(() => {
    setApiKey(currentApiKey);
  }, [currentApiKey]);

  const handleSave = () => {
    if (!apiKey.trim()) {
      setError('Vui lòng nhập API key');
      return;
    }
    
    if (!apiKey.startsWith('AIza')) {
      setError('API key không hợp lệ. Key phải bắt đầu bằng "AIza"');
      return;
    }

    onSave(apiKey.trim());
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content api-key-modal">
        <div className="modal-header">
          <h2><i className="fas fa-key"></i> Thiết lập API Key</h2>
          {currentApiKey && (
            <button className="modal-close" onClick={onClose}>
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>

        <div className="modal-body">
          <div className="api-key-info">
            <div className="info-box warning">
              <i className="fas fa-exclamation-triangle"></i>
              <p>Bạn cần có API key của Google Gemini để sử dụng ứng dụng này.</p>
            </div>

            <div className="steps-guide">
              <h3><i className="fas fa-list-ol"></i> Hướng dẫn lấy API Key:</h3>
              <ol>
                <li>Truy cập <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a></li>
                <li>Đăng nhập bằng tài khoản Google</li>
                <li>Nhấn "Create API Key" để tạo key mới</li>
                <li>Copy API key và dán vào ô bên dưới</li>
              </ol>
              
              <div className="help-link">
                <i className="fas fa-video"></i>
                <a href="https://tinyurl.com/hdsdpmTHT" target="_blank" rel="noopener noreferrer">
                  Xem video hướng dẫn chi tiết
                </a>
              </div>
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="apiKey">
              <i className="fas fa-key"></i> API Key
            </label>
            <input
              type="password"
              id="apiKey"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setError('');
              }}
              placeholder="AIza..."
              className={error ? 'error' : ''}
            />
            {error && <span className="error-message">{error}</span>}
          </div>

          <div className="api-key-note">
            <i className="fas fa-shield-alt"></i>
            <small>API key được lưu trữ an toàn trong trình duyệt của bạn và không được gửi đến bất kỳ server nào ngoài Google.</small>
          </div>
        </div>

        <div className="modal-footer">
          {currentApiKey && (
            <button className="btn btn-secondary" onClick={onClose}>
              Hủy
            </button>
          )}
          <button className="btn btn-primary" onClick={handleSave}>
            <i className="fas fa-save"></i> Lưu API Key
          </button>
        </div>
      </div>
    </div>
  );
}
