import { useState, useRef, useCallback } from 'react';
import { Upload, Link, Loader2, Image, X, Sparkles, AlertCircle } from 'lucide-react';
import { analyzeImageWithAI } from '../lib/aiGenerator';
import { getApiKey } from '../lib/storage';

interface ImageWebAnalyzerProps {
    onAnalysisComplete: (result: string) => void;
    isAnalyzing: boolean;
    setIsAnalyzing: (value: boolean) => void;
}

export default function ImageWebAnalyzer({
    onAnalysisComplete,
    isAnalyzing,
    setIsAnalyzing
}: ImageWebAnalyzerProps) {
    const [imageData, setImageData] = useState<{ base64: string; mimeType: string; preview: string } | null>(null);
    const [webUrl, setWebUrl] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Xử lý file được chọn
    const handleFile = useCallback((file: File) => {
        if (!file.type.startsWith('image/')) {
            setError('Vui lòng chọn file ảnh (jpg, png, webp, gif)');
            return;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            setError('File ảnh quá lớn. Vui lòng chọn file nhỏ hơn 10MB');
            return;
        }

        setError('');
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            const base64 = result.split(',')[1];
            setImageData({
                base64,
                mimeType: file.type,
                preview: result
            });
        };
        reader.readAsDataURL(file);
    }, []);

    // Drag & Drop handlers
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            handleFile(file);
        }
    }, [handleFile]);

    // Click để chọn file
    const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFile(file);
        }
    }, [handleFile]);

    // Xóa ảnh đã chọn
    const clearImage = useCallback(() => {
        setImageData(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, []);

    // Phân tích với AI
    const handleAnalyze = async () => {
        const apiKey = getApiKey();
        if (!apiKey) {
            setError('Vui lòng cấu hình API Key trước khi sử dụng tính năng này');
            return;
        }

        if (!imageData && !webUrl.trim()) {
            setError('Vui lòng tải ảnh hoặc nhập URL web');
            return;
        }

        setError('');
        setIsAnalyzing(true);

        try {
            let result = '';

            if (imageData) {
                // Phân tích ảnh với Gemini Vision
                result = await analyzeImageWithAI(
                    imageData.base64,
                    imageData.mimeType,
                    apiKey
                );
            } else if (webUrl.trim()) {
                // Thông báo hạn chế CORS và gợi ý chụp ảnh
                setError('Do giới hạn bảo mật của trình duyệt, không thể truy cập trực tiếp nội dung website. Vui lòng chụp ảnh màn hình của website và tải lên để phân tích.');
                setIsAnalyzing(false);
                return;
            }

            if (result) {
                onAnalysisComplete(result);
                clearImage();
                setWebUrl('');
            }
        } catch (err) {
            console.error('Analysis error:', err);
            setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi phân tích');
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="image-web-analyzer">
            <div className="analyzer-header">
                <Image size={18} />
                <span>Phân tích từ Ảnh / Web</span>
            </div>

            {/* Upload Zone */}
            <div
                className={`upload-zone ${isDragging ? 'dragging' : ''} ${imageData ? 'has-image' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !imageData && fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileInputChange}
                    style={{ display: 'none' }}
                />

                {imageData ? (
                    <div className="image-preview">
                        <img src={imageData.preview} alt="Preview" />
                        <button
                            type="button"
                            className="remove-image"
                            onClick={(e) => { e.stopPropagation(); clearImage(); }}
                        >
                            <X size={16} />
                        </button>
                    </div>
                ) : (
                    <div className="upload-placeholder">
                        <Upload size={32} />
                        <p>Kéo thả ảnh vào đây</p>
                        <span>hoặc click để chọn file</span>
                        <span className="file-hint">Hỗ trợ: JPG, PNG, WebP, GIF (tối đa 10MB)</span>
                    </div>
                )}
            </div>

            {/* URL Input */}
            <div className="url-input-wrapper">
                <div className="url-divider">
                    <span>hoặc</span>
                </div>
                <div className="url-input-group">
                    <Link size={16} className="url-icon" />
                    <input
                        type="url"
                        value={webUrl}
                        onChange={(e) => setWebUrl(e.target.value)}
                        placeholder="Nhập URL website (ví dụ: https://example.com)"
                        className="url-input"
                        disabled={isAnalyzing}
                    />
                </div>
                <p className="url-hint">
                    <AlertCircle size={12} />
                    Lưu ý: Nên chụp ảnh màn hình để đạt kết quả tốt nhất
                </p>
            </div>

            {/* Error Message */}
            {error && (
                <div className="analyzer-error">
                    <AlertCircle size={14} />
                    <span>{error}</span>
                </div>
            )}

            {/* Analyze Button */}
            <button
                type="button"
                className="analyze-btn"
                onClick={handleAnalyze}
                disabled={isAnalyzing || (!imageData && !webUrl.trim())}
            >
                {isAnalyzing ? (
                    <>
                        <Loader2 className="icon spinning" />
                        Đang phân tích...
                    </>
                ) : (
                    <>
                        <Sparkles className="icon" />
                        Phân tích với AI
                    </>
                )}
            </button>
        </div>
    );
}
