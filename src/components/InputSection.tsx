import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Loader2, Lightbulb, Plus, X, Users, Target, Zap, Award, Brain, RefreshCw } from 'lucide-react';
import { enhanceIdeaWithAI, getAISuggestions } from '../lib/aiGenerator';
import type { AISuggestionsResult } from '../lib/aiGenerator';
import { getApiKey } from '../lib/storage';

interface InputSectionProps {
  onGenerate: (idea: string) => Promise<void>;
  isLoading: boolean;
}

interface Suggestion {
  category: string;
  icon: React.ReactNode;
  items: string[];
}

export default function InputSection({ onGenerate, isLoading }: InputSectionProps) {
  const [idea, setIdea] = useState('');
  const [enhancedIdea, setEnhancedIdea] = useState('');
  const [ideaSummary, setIdeaSummary] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isIdeaEnhanced, setIsIdeaEnhanced] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestionsResult | null>(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [enhanceError, setEnhanceError] = useState('');

  // Reset khi ý tưởng thay đổi
  useEffect(() => {
    if (enhancedIdea && idea !== enhancedIdea) {
      setIsIdeaEnhanced(false);
      setAiSuggestions(null);
      setShowSuggestions(false);
      setSelectedSuggestions(new Set());
      setEnhancedIdea('');
      setIdeaSummary('');
    }
  }, [idea, enhancedIdea]);

  // Hoàn thiện ý tưởng với AI
  const handleEnhanceIdea = async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setEnhanceError('Vui lòng cấu hình API Key trước khi sử dụng tính năng này');
      return;
    }

    if (!idea.trim()) {
      setEnhanceError('Vui lòng nhập ý tưởng trước');
      return;
    }

    setEnhanceError('');
    setIsEnhancing(true);

    try {
      const result = await enhanceIdeaWithAI(idea.trim(), apiKey);
      setEnhancedIdea(result.enhancedIdea);
      setIdeaSummary(result.summary);
      setIdea(result.enhancedIdea);
      setIsIdeaEnhanced(true);

      // Sau khi hoàn thiện ý tưởng, lấy gợi ý AI
      await loadAISuggestions(result.enhancedIdea);
    } catch (error) {
      console.error('Error enhancing idea:', error);
      setEnhanceError('Có lỗi khi hoàn thiện ý tưởng. Vui lòng thử lại.');
    } finally {
      setIsEnhancing(false);
    }
  };

  // Lấy gợi ý AI chuyên sâu
  const loadAISuggestions = async (ideaText: string) => {
    const apiKey = getApiKey();
    if (!apiKey) return;

    setIsLoadingSuggestions(true);
    try {
      const suggestions = await getAISuggestions(ideaText, apiKey);
      setAiSuggestions(suggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Làm mới gợi ý AI
  const handleRefreshSuggestions = async () => {
    if (idea.trim()) {
      await loadAISuggestions(idea.trim());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (idea.trim() && !isLoading) {
      let finalIdea = idea.trim();

      if (selectedSuggestions.size > 0) {
        const additionalInfo = Array.from(selectedSuggestions).join(', ');
        finalIdea += `\n\nThông tin bổ sung: ${additionalInfo}`;
      }

      await onGenerate(finalIdea);
    }
  };

  const toggleSuggestion = useCallback((item: string) => {
    setSelectedSuggestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(item)) {
        newSet.delete(item);
      } else {
        newSet.add(item);
      }
      return newSet;
    });
  }, []);

  // Chuyển đổi AI suggestions thành format hiển thị
  const getSuggestionGroups = (): Suggestion[] => {
    if (!aiSuggestions) return [];

    const groups: Suggestion[] = [];

    if (aiSuggestions.functions.length > 0) {
      groups.push({
        category: 'Chức năng',
        icon: <Zap size={16} />,
        items: aiSuggestions.functions
      });
    }

    if (aiSuggestions.targetUsers.length > 0) {
      groups.push({
        category: 'Đối tượng sử dụng',
        icon: <Users size={16} />,
        items: aiSuggestions.targetUsers
      });
    }

    if (aiSuggestions.goals.length > 0) {
      groups.push({
        category: 'Mục tiêu',
        icon: <Target size={16} />,
        items: aiSuggestions.goals
      });
    }

    if (aiSuggestions.expectedResults.length > 0) {
      groups.push({
        category: 'Kết quả mong muốn',
        icon: <Award size={16} />,
        items: aiSuggestions.expectedResults
      });
    }

    return groups;
  };

  const exampleIdeas = [
    'App kiểm tra bài cũ môn Toán lớp 10',
    'Công cụ quản lý chi tiêu cá nhân',
    'Game đoán từ tiếng Anh cho học sinh',
    'Quiz trắc nghiệm Vật lý THPT'
  ];

  const suggestionGroups = getSuggestionGroups();

  return (
    <div className="input-section">
      <div className="hero-text">
        <h1>
          <Sparkles className="icon" />
          AI System Instruction Generator
        </h1>
        <p>Biến ý tưởng của bạn thành System Instruction chuyên nghiệp</p>
      </div>

      <form onSubmit={handleSubmit} className="input-form">
        <div className="textarea-wrapper">
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Nhập ý tưởng app của bạn... (Ví dụ: App quiz trắc nghiệm Toán lớp 10, công cụ quản lý, game học tập...)"
            rows={4}
            disabled={isLoading || isEnhancing}
          />

          {ideaSummary && (
            <div className="idea-summary">
              <Brain size={14} />
              <span>{ideaSummary}</span>
            </div>
          )}
        </div>

        {enhanceError && (
          <div className="enhance-error">
            <span>{enhanceError}</span>
          </div>
        )}

        {/* Nút hoàn thiện ý tưởng */}
        {!isIdeaEnhanced && idea.trim().length >= 5 && (
          <button
            type="button"
            className="enhance-btn"
            onClick={handleEnhanceIdea}
            disabled={isEnhancing || isLoading}
          >
            {isEnhancing ? (
              <>
                <Loader2 className="icon spinning" />
                Đang hoàn thiện...
              </>
            ) : (
              <>
                <Brain className="icon" />
                Hoàn thiện ý tưởng với AI
              </>
            )}
          </button>
        )}

        {/* Loading gợi ý AI */}
        {isLoadingSuggestions && (
          <div className="loading-suggestions">
            <Loader2 className="icon spinning" />
            <span>Đang phân tích gợi ý chuyên sâu...</span>
          </div>
        )}

        {/* Panel gợi ý AI chuyên sâu */}
        {showSuggestions && suggestionGroups.length > 0 && !isLoading && !isEnhancing && (
          <div className="suggestions-panel ai-suggestions">
            <div className="suggestions-header">
              <Lightbulb size={18} />
              <span>Gợi ý AI chuyên sâu</span>
              <button
                type="button"
                className="refresh-suggestions"
                onClick={handleRefreshSuggestions}
                disabled={isLoadingSuggestions}
                title="Làm mới gợi ý"
              >
                <RefreshCw size={14} className={isLoadingSuggestions ? 'spinning' : ''} />
              </button>
              <button
                type="button"
                className="close-suggestions"
                onClick={() => setShowSuggestions(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="suggestions-content">
              {suggestionGroups.map((group, groupIndex) => (
                <div key={groupIndex} className="suggestion-group">
                  <div className="suggestion-group-header">
                    {group.icon}
                    <span>{group.category}</span>
                  </div>
                  <div className="suggestion-items">
                    {group.items.map((item, itemIndex) => (
                      <button
                        key={itemIndex}
                        type="button"
                        className={`suggestion-chip ${selectedSuggestions.has(item) ? 'selected' : ''}`}
                        onClick={() => toggleSuggestion(item)}
                        title={selectedSuggestions.has(item) ? 'Click để bỏ chọn' : 'Click để chọn'}
                      >
                        {item}
                        {selectedSuggestions.has(item) ? (
                          <X size={12} />
                        ) : (
                          <Plus size={12} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {selectedSuggestions.size > 0 && (
              <div className="selected-summary">
                <span className="selected-count">
                  Đã chọn: {selectedSuggestions.size} gợi ý
                </span>
                <button
                  type="button"
                  className="clear-selected"
                  onClick={() => setSelectedSuggestions(new Set())}
                >
                  Xóa tất cả
                </button>
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          className="generate-btn"
          disabled={!idea.trim() || isLoading || isEnhancing}
        >
          {isLoading ? (
            <>
              <Loader2 className="icon spinning" />
              Đang tạo...
            </>
          ) : (
            <>
              <Sparkles className="icon" />
              Tạo System Instruction
              {selectedSuggestions.size > 0 && (
                <span className="badge">{selectedSuggestions.size}</span>
              )}
            </>
          )}
        </button>
      </form>

      <div className="examples">
        <p className="examples-title">Ví dụ nhanh:</p>
        <div className="example-chips">
          {exampleIdeas.map((example, index) => (
            <button
              key={index}
              className="example-chip"
              onClick={() => !isLoading && setIdea(example)}
              disabled={isLoading}
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
