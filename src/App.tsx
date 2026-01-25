import { useState, useEffect } from 'react';
import Header from './components/Header';
import ApiKeyModal from './components/ApiKeyModal';
import InputSection from './components/InputSection';
import ResultDisplay from './components/ResultDisplay';
import HistoryList from './components/HistoryList';
import { generateInstruction, AI_MODELS, type GenerationProgress } from './lib/aiGenerator';
import { saveInstruction, type Instruction, type NewInstruction } from './lib/storage';

const LOCAL_STORAGE_API_KEY = 'gemini_api_key';
const LOCAL_STORAGE_MODEL = 'selected_model';

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<Instruction | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // API Key & Model state
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState(AI_MODELS[0]);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  // Progress state
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load saved API key and model on mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem(LOCAL_STORAGE_API_KEY);
    const savedModel = localStorage.getItem(LOCAL_STORAGE_MODEL);

    if (savedApiKey) {
      setApiKey(savedApiKey);
    } else {
      // Show modal if no API key
      setShowApiKeyModal(true);
    }

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

  const handleProgress = (progressUpdate: GenerationProgress) => {
    setProgress(progressUpdate);

    if (progressUpdate.status === 'error' || progressUpdate.status === 'stopped') {
      setError(progressUpdate.error || progressUpdate.message);
    }
  };

  const handleGenerate = async (idea: string) => {
    if (!apiKey) {
      setShowApiKeyModal(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    setProgress(null);

    try {
      const result = await generateInstruction(
        idea,
        apiKey,
        selectedModel,
        handleProgress
      );

      const newInstruction: NewInstruction = {
        user_idea: idea,
        category: result.category,
        title: result.title,
        generated_instruction: result.systemInstruction,
        html_template: result.htmlTemplate
      };

      // Lưu vào localStorage thay vì Supabase
      const savedInstruction = saveInstruction(newInstruction);

      setCurrentResult(savedInstruction);
      setRefreshTrigger(prev => prev + 1);
      setProgress(null);

      setTimeout(() => {
        document.querySelector('.result-display')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);
    } catch (error) {
      console.error('Error generating instruction:', error);
      const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
      setError(errorMessage);

      // Update progress to show stopped state
      setProgress(prev => prev ? {
        ...prev,
        status: 'stopped',
        message: 'Đã dừng do lỗi',
        error: errorMessage
      } : null);
    } finally {
      setIsLoading(false);
    }
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
        <InputSection onGenerate={handleGenerate} isLoading={isLoading} />

        {/* Progress Display */}
        {progress && isLoading && (
          <div className="progress-section">
            <div className="progress-header">
              <span className="progress-step">
                Bước {progress.step}/{progress.totalSteps}
              </span>
              <span className={`progress-status ${progress.status}`}>
                {progress.status === 'running' && <i className="fas fa-spinner fa-spin"></i>}
                {progress.status === 'success' && <i className="fas fa-check-circle"></i>}
                {progress.status === 'error' && <i className="fas fa-exclamation-triangle"></i>}
                {progress.status === 'stopped' && <i className="fas fa-stop-circle"></i>}
                {progress.message}
              </span>
            </div>
            <div className="progress-bar">
              <div
                className={`progress-fill ${progress.status}`}
                style={{ width: `${(progress.step / progress.totalSteps) * 100}%` }}
              ></div>
            </div>
            {progress.currentModel && (
              <div className="progress-model">
                <i className="fas fa-microchip"></i> Model: {progress.currentModel}
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && !isLoading && (
          <div className="error-section">
            <div className="error-content">
              <i className="fas fa-exclamation-circle"></i>
              <div className="error-message">
                <strong>Lỗi:</strong> {error}
              </div>
            </div>
            <button className="btn btn-secondary" onClick={() => setError(null)}>
              <i className="fas fa-times"></i> Đóng
            </button>
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
