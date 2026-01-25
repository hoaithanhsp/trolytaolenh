import { useEffect, useState } from 'react';
import { Clock, Trash2, Eye } from 'lucide-react';
import { getInstructions, deleteInstruction, type Instruction } from '../lib/storage';

interface HistoryListProps {
  onSelectInstruction: (instruction: Instruction) => void;
  refreshTrigger?: number;
}

export default function HistoryList({ onSelectInstruction, refreshTrigger }: HistoryListProps) {
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInstructions();
  }, [refreshTrigger]);

  const loadInstructions = () => {
    try {
      setLoading(true);
      const data = getInstructions();
      setInstructions(data);
    } catch (error) {
      console.error('Error loading instructions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Bạn có chắc muốn xóa instruction này?')) return;

    try {
      const success = deleteInstruction(id);
      if (success) {
        setInstructions(instructions.filter(i => i.id !== id));
      }
    } catch (error) {
      console.error('Error deleting instruction:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      'Education': '#10b981',
      'Management': '#3b82f6',
      'Tool': '#f59e0b',
      'Game': '#ef4444',
      'Finance': '#6366f1',
      'Other': '#6b7280'
    };
    return colors[cat] || colors.Other;
  };

  if (loading) {
    return (
      <div className="history-list">
        <h3>📚 Lịch sử gần đây</h3>
        <div className="loading">Đang tải...</div>
      </div>
    );
  }

  if (instructions.length === 0) {
    return (
      <div className="history-list">
        <h3>📚 Lịch sử gần đây</h3>
        <div className="empty-state">
          <p>Chưa có instruction nào được tạo</p>
          <small>Lịch sử sẽ được lưu tự động khi bạn tạo System Instruction</small>
        </div>
      </div>
    );
  }

  return (
    <div className="history-list">
      <h3>📚 Lịch sử gần đây ({instructions.length})</h3>
      <div className="history-items">
        {instructions.map((instruction) => (
          <div
            key={instruction.id}
            className="history-item"
            onClick={() => onSelectInstruction(instruction)}
          >
            <div className="history-item-header">
              <span
                className="category-dot"
                style={{ backgroundColor: getCategoryColor(instruction.category) }}
              />
              <span className="history-title">{instruction.title}</span>
            </div>
            <p className="history-idea">{instruction.user_idea}</p>
            <div className="history-footer">
              <span className="history-time">
                <Clock className="icon" />
                {formatDate(instruction.created_at)}
              </span>
              <div className="history-actions">
                <button
                  className="history-action-btn view"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectInstruction(instruction);
                  }}
                >
                  <Eye className="icon" />
                </button>
                <button
                  className="history-action-btn delete"
                  onClick={(e) => handleDelete(instruction.id, e)}
                >
                  <Trash2 className="icon" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
