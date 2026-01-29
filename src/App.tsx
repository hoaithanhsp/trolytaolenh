import { useState, useEffect } from 'react';
import Header from './components/Header';
import ApiKeyModal from './components/ApiKeyModal';
import InputSection from './components/InputSection';
import ResultDisplay from './components/ResultDisplay';
import HistoryList from './components/HistoryList';
import LoginScreen from './components/LoginScreen';
import { AI_MODELS } from './lib/aiGenerator';
import { saveInstruction, type Instruction, type NewInstruction } from './lib/storage';

const LOCAL_STORAGE_API_KEY = 'gemini_api_key';
const LOCAL_STORAGE_MODEL = 'selected_model';

interface PromptResult {
  promptCommand: string;
  category: string;
  title: string;
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<Instruction | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // API Key & Model state (giữ lại cho các tính năng khác như hoàn thiện ý tưởng)
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState(AI_MODELS[0]);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  // Load saved API key and model on mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem(LOCAL_STORAGE_API_KEY);
    const savedModel = localStorage.getItem(LOCAL_STORAGE_MODEL);

    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
    // Không hiện modal API key khi khởi động nữa vì flow mới không cần API key

    if (savedModel && AI_MODELS.includes(savedModel)) {
      setSelectedModel(savedModel);
    }
  }, []);

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem(LOCAL_STORAGE_API_KEY, key);
  };

  const handleSelectModel = (model: string) => {
    setSelectedModel(model);
    localStorage.setItem(LOCAL_STORAGE_MODEL, model);
  };

  // Handler mới cho việc tạo prompt lệnh
  const handleGeneratePrompt = (result: PromptResult) => {
    setIsLoading(true);

    // Simulate processing
    setTimeout(() => {
      const newInstruction: NewInstruction = {
        user_idea: result.promptCommand.split('\n')[3] || 'Ý tưởng ứng dụng', // Lấy mô tả ý tưởng
        category: result.category,
        title: result.title,
        generated_instruction: result.promptCommand,
        html_template: '' // Không cần HTML template nữa
      };

      // Lưu vào localStorage
      const savedInstruction = saveInstruction(newInstruction);

      setCurrentResult(savedInstruction);
      setRefreshTrigger(prev => prev + 1);
      setIsLoading(false);

      setTimeout(() => {
        document.querySelector('.result-display')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);
    }, 500);
  };

  const handleSelectInstruction = (instruction: Instruction) => {
    setCurrentResult(instruction);
    setTimeout(() => {
      document.querySelector('.result-display')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);
  };

  // Nếu chưa đăng nhập, hiển thị màn hình login
  if (!isLoggedIn) {
    return <LoginScreen onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="app">
      <Header
        apiKey={apiKey}
        selectedModel={selectedModel}
        onOpenApiKeyModal={() => setShowApiKeyModal(true)}
        onSelectModel={handleSelectModel}
      />

      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onSave={handleSaveApiKey}
        currentApiKey={apiKey}
      />

      <div className="app-container">
        <InputSection onGeneratePrompt={handleGeneratePrompt} isLoading={isLoading} />

        {/* Loading indicator */}
        {isLoading && (
          <div className="progress-section">
            <div className="progress-header">
              <span className="progress-status running">
                <i className="fas fa-spinner fa-spin"></i>
                Đang tạo lệnh...
              </span>
            </div>
          </div>
        )}



        {currentResult && (
          <ResultDisplay
            title={currentResult.title}
            category={currentResult.category}
            systemInstruction={currentResult.generated_instruction}
            htmlTemplate={currentResult.html_template}
          />
        )}

        <HistoryList
          onSelectInstruction={handleSelectInstruction}
          refreshTrigger={refreshTrigger}
        />
      </div>

      <footer className="app-footer">
        <p>
          Made with ❤️ | Powered by AI |{' '}
          <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer">
            Google AI Studio
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
