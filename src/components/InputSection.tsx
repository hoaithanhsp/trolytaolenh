import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Loader2, Lightbulb, Plus, X, Users, BookOpen, GraduationCap, Target, Zap } from 'lucide-react';

interface InputSectionProps {
  onGenerate: (idea: string) => Promise<void>;
  isLoading: boolean;
}

interface Suggestion {
  category: string;
  icon: React.ReactNode;
  items: string[];
}

// Phân tích ý tưởng và đưa ra gợi ý phù hợp
function analyzeSuggestions(idea: string): Suggestion[] {
  const lowerIdea = idea.toLowerCase();
  const suggestions: Suggestion[] = [];

  // ==========================================
  // GỢI Ý VỀ CHỨC NĂNG
  // ==========================================
  const functionSuggestions: string[] = [];

  if (lowerIdea.includes('quiz') || lowerIdea.includes('trắc nghiệm') || lowerIdea.includes('kiểm tra') || lowerIdea.includes('bài cũ')) {
    functionSuggestions.push(
      'Random học sinh (1-48)',
      'Timer đếm ngược (2 phút/đề)',
      'Chấm điểm tự động',
      'Bonus điểm nếu trả lời nhanh',
      'Nhận xét sau mỗi đề',
      'Xem lại câu trả lời sai',
      'Chia thành nhiều đề (10 câu/đề)',
      'Xáo trộn câu hỏi ngẫu nhiên',
      'Hiệu ứng chúc mừng khi hoàn thành'
    );
  }

  if (lowerIdea.includes('quản lý') || lowerIdea.includes('dashboard')) {
    functionSuggestions.push(
      'Thêm/Sửa/Xóa dữ liệu',
      'Tìm kiếm và lọc',
      'Xuất Excel/PDF',
      'Biểu đồ thống kê',
      'Phân trang dữ liệu',
      'Sắp xếp theo cột',
      'Import dữ liệu từ Excel'
    );
  }

  if (lowerIdea.includes('game') || lowerIdea.includes('trò chơi') || lowerIdea.includes('đố')) {
    functionSuggestions.push(
      'Hệ thống điểm số',
      'Bảng xếp hạng',
      'Nhiều cấp độ khó',
      'Hiệu ứng âm thanh',
      'Animation mượt mà',
      'Hệ thống mạng sống',
      'Power-ups/Bonus'
    );
  }

  if (lowerIdea.includes('pdf') || lowerIdea.includes('upload') || lowerIdea.includes('file')) {
    functionSuggestions.push(
      'Kéo thả file (Drag & Drop)',
      'Preview trước khi xử lý',
      'Trích xuất nội dung từ PDF',
      'Tự động nhận diện câu hỏi',
      'Export kết quả'
    );
  }

  // Thêm gợi ý chung nếu chưa có nhiều
  if (functionSuggestions.length < 3) {
    functionSuggestions.push(
      'Lưu dữ liệu LocalStorage',
      'Giao diện responsive (Mobile/Desktop)',
      'Loading indicator khi xử lý',
      'Thông báo lỗi rõ ràng'
    );
  }

  if (functionSuggestions.length > 0) {
    suggestions.push({
      category: 'Chức năng',
      icon: <Zap size={16} />,
      items: functionSuggestions.slice(0, 8)
    });
  }

  // ==========================================
  // GỢI Ý VỀ ĐỐI TƯỢNG SỬ DỤNG
  // ==========================================
  const audienceSuggestions: string[] = [];

  if (lowerIdea.includes('học') || lowerIdea.includes('sinh') || lowerIdea.includes('giáo') || lowerIdea.includes('lớp') || lowerIdea.includes('kiểm tra') || lowerIdea.includes('bài')) {
    audienceSuggestions.push(
      'Dành cho giáo viên',
      'Dành cho học sinh',
      'Dành cho cả giáo viên và học sinh',
      'Phụ huynh theo dõi kết quả'
    );
  } else if (lowerIdea.includes('quản lý') || lowerIdea.includes('doanh') || lowerIdea.includes('nhân viên')) {
    audienceSuggestions.push(
      'Dành cho quản lý',
      'Dành cho nhân viên',
      'Dành cho doanh nghiệp nhỏ',
      'Dành cho freelancer'
    );
  } else {
    audienceSuggestions.push(
      'Dành cho mọi đối tượng',
      'Dành cho học sinh/sinh viên',
      'Dành cho giáo viên',
      'Dành cho người đi làm'
    );
  }

  suggestions.push({
    category: 'Đối tượng sử dụng',
    icon: <Users size={16} />,
    items: audienceSuggestions
  });

  // ==========================================
  // GỢI Ý VỀ MÔN HỌC (nếu là app giáo dục)
  // ==========================================
  if (lowerIdea.includes('học') || lowerIdea.includes('quiz') || lowerIdea.includes('kiểm tra') || lowerIdea.includes('bài') || lowerIdea.includes('trắc nghiệm')) {
    const subjectSuggestions: string[] = [];

    if (lowerIdea.includes('toán') || lowerIdea.includes('math')) {
      subjectSuggestions.push('Toán học', 'Đại số', 'Hình học', 'Giải tích');
    } else if (lowerIdea.includes('anh') || lowerIdea.includes('english')) {
      subjectSuggestions.push('Tiếng Anh', 'Ngữ pháp', 'Từ vựng', 'Giao tiếp');
    } else if (lowerIdea.includes('lý') || lowerIdea.includes('physics')) {
      subjectSuggestions.push('Vật lý', 'Cơ học', 'Điện học', 'Quang học');
    } else if (lowerIdea.includes('hóa') || lowerIdea.includes('chemistry')) {
      subjectSuggestions.push('Hóa học', 'Hữu cơ', 'Vô cơ', 'Hóa phân tích');
    } else if (lowerIdea.includes('sinh') || lowerIdea.includes('biology')) {
      subjectSuggestions.push('Sinh học', 'Di truyền', 'Sinh thái', 'Giải phẫu');
    } else {
      subjectSuggestions.push(
        'Toán học',
        'Tiếng Anh',
        'Vật lý',
        'Hóa học',
        'Sinh học',
        'Ngữ văn',
        'Lịch sử',
        'Địa lý'
      );
    }

    suggestions.push({
      category: 'Môn học',
      icon: <BookOpen size={16} />,
      items: subjectSuggestions.slice(0, 6)
    });
  }

  // ==========================================
  // GỢI Ý VỀ LỚP HỌC (nếu là app giáo dục)
  // ==========================================
  if (lowerIdea.includes('học') || lowerIdea.includes('quiz') || lowerIdea.includes('kiểm tra') || lowerIdea.includes('bài') || lowerIdea.includes('lớp')) {
    const gradeSuggestions: string[] = [];

    if (lowerIdea.includes('tiểu học') || lowerIdea.includes('primary')) {
      gradeSuggestions.push('Lớp 1', 'Lớp 2', 'Lớp 3', 'Lớp 4', 'Lớp 5');
    } else if (lowerIdea.includes('thcs') || lowerIdea.includes('cấp 2')) {
      gradeSuggestions.push('Lớp 6', 'Lớp 7', 'Lớp 8', 'Lớp 9');
    } else if (lowerIdea.includes('thpt') || lowerIdea.includes('cấp 3')) {
      gradeSuggestions.push('Lớp 10', 'Lớp 11', 'Lớp 12');
    } else if (lowerIdea.includes('đại học') || lowerIdea.includes('university')) {
      gradeSuggestions.push('Đại học/Cao đẳng', 'Năm 1', 'Năm 2', 'Năm 3', 'Năm 4');
    } else {
      gradeSuggestions.push(
        'Tiểu học (Lớp 1-5)',
        'THCS (Lớp 6-9)',
        'THPT (Lớp 10-12)',
        'Đại học/Cao đẳng',
        'Mọi cấp học'
      );
    }

    suggestions.push({
      category: 'Cấp học/Lớp',
      icon: <GraduationCap size={16} />,
      items: gradeSuggestions.slice(0, 5)
    });
  }

  // ==========================================
  // GỢI Ý VỀ MỤC TIÊU
  // ==========================================
  const goalSuggestions: string[] = [];

  if (lowerIdea.includes('kiểm tra') || lowerIdea.includes('bài cũ')) {
    goalSuggestions.push(
      'Ôn tập bài cũ đầu giờ',
      'Kiểm tra 15 phút',
      'Kiểm tra 1 tiết',
      'Luyện tập tại nhà',
      'Thi thử online'
    );
  } else if (lowerIdea.includes('quản lý')) {
    goalSuggestions.push(
      'Theo dõi công việc hàng ngày',
      'Báo cáo tuần/tháng',
      'Quản lý dự án',
      'Theo dõi KPI'
    );
  } else if (lowerIdea.includes('game')) {
    goalSuggestions.push(
      'Giải trí vui vẻ',
      'Học qua trò chơi',
      'Thi đua với bạn bè',
      'Rèn luyện tư duy'
    );
  } else {
    goalSuggestions.push(
      'Tăng năng suất',
      'Tiết kiệm thời gian',
      'Dễ dàng sử dụng',
      'Miễn phí, không cần đăng ký'
    );
  }

  suggestions.push({
    category: 'Mục tiêu sử dụng',
    icon: <Target size={16} />,
    items: goalSuggestions.slice(0, 5)
  });

  return suggestions;
}

export default function InputSection({ onGenerate, isLoading }: InputSectionProps) {
  const [idea, setIdea] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Debounce phân tích gợi ý
  useEffect(() => {
    const timer = setTimeout(() => {
      if (idea.trim().length >= 5) {
        const newSuggestions = analyzeSuggestions(idea);
        setSuggestions(newSuggestions);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [idea]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (idea.trim() && !isLoading) {
      // Gộp ý tưởng với các gợi ý đã chọn
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

  const exampleIdeas = [
    'App kiểm tra bài cũ môn Toán lớp 10',
    'Công cụ quản lý chi tiêu cá nhân',
    'Game đoán từ tiếng Anh cho học sinh',
    'Quiz trắc nghiệm Vật lý THPT'
  ];

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
            disabled={isLoading}
          />
        </div>

        {/* Panel gợi ý thông minh */}
        {showSuggestions && suggestions.length > 0 && !isLoading && (
          <div className="suggestions-panel">
            <div className="suggestions-header">
              <Lightbulb size={18} />
              <span>Gợi ý để hoàn thiện ý tưởng</span>
              <button
                type="button"
                className="close-suggestions"
                onClick={() => setShowSuggestions(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="suggestions-content">
              {suggestions.map((group, groupIndex) => (
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
          disabled={!idea.trim() || isLoading}
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
