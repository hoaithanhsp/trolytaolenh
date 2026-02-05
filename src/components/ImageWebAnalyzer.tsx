import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Loader2, Image, X, Sparkles, AlertCircle, Clipboard } from 'lucide-react';
import { analyzeImageWithAI, analyzeMultipleImagesWithAI } from '../lib/aiGenerator';
import { getApiKey } from '../lib/storage';

interface ImageData {
    id: string;
    base64: string;
    mimeType: string;
    preview: string;
}

interface ImageWebAnalyzerProps {
    onAnalysisComplete: (result: string) => void;
    isAnalyzing: boolean;
    setIsAnalyzing: (value: boolean) => void;
}

const MAX_IMAGES = 10; // Giới hạn tối đa số ảnh

export default function ImageWebAnalyzer({
    onAnalysisComplete,
    isAnalyzing,
    setIsAnalyzing
}: ImageWebAnalyzerProps) {
    const [imagesData, setImagesData] = useState<ImageData[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Tạo ID unique cho mỗi ảnh
    const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

    // Xử lý file được chọn
    const handleFile = useCallback((file: File) => {
        if (!file.type.startsWith('image/')) {
            setError('Vui lòng chọn file ảnh (jpg, png, webp, gif)');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            setError('File ảnh quá lớn. Vui lòng chọn file nhỏ hơn 10MB');
            return;
        }

        setError('');
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            const base64 = result.split(',')[1];

            setImagesData(prev => {
                if (prev.length >= MAX_IMAGES) {
                    setError(`Tối đa ${MAX_IMAGES} ảnh`);
                    return prev;
                }
                return [...prev, {
                    id: generateId(),
                    base64,
                    mimeType: file.type,
                    preview: result
                }];
            });
        };
        reader.readAsDataURL(file);
    }, []);

    // Xử lý nhiều files
    const handleFiles = useCallback((files: FileList | File[]) => {
        Array.from(files).forEach(file => handleFile(file));
    }, [handleFile]);

    // Ctrl+V paste handler
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (items) {
                for (const item of Array.from(items)) {
                    if (item.type.startsWith('image/')) {
                        const file = item.getAsFile();
                        if (file) {
                            e.preventDefault();
                            handleFile(file);
                        }
                    }
                }
            }
        };

        document.addEventListener('paste', handlePaste);
        return () => document.removeEventListener('paste', handlePaste);
    }, [handleFile]);

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
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFiles(files);
        }
    }, [handleFiles]);

    // Click để chọn files
    const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFiles(files);
        }
        // Reset input để có thể chọn lại cùng file
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [handleFiles]);

    // Xóa một ảnh
    const removeImage = useCallback((id: string) => {
        setImagesData(prev => prev.filter(img => img.id !== id));
    }, []);

    // Xóa tất cả ảnh
    const clearAllImages = useCallback(() => {
        setImagesData([]);
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

        if (imagesData.length === 0) {
            setError('Vui lòng tải ảnh lên để phân tích');
            return;
        }

        setError('');
        setIsAnalyzing(true);

        try {
            let result = '';

            if (imagesData.length === 1) {
                // 1 ảnh: dùng hàm đơn
                result = await analyzeImageWithAI(
                    imagesData[0].base64,
                    imagesData[0].mimeType,
                    apiKey
                );
            } else {
                // Nhiều ảnh: dùng hàm mới
                result = await analyzeMultipleImagesWithAI(
                    imagesData.map(img => ({ base64: img.base64, mimeType: img.mimeType })),
                    apiKey
                );
            }

            if (result) {
                onAnalysisComplete(result);
                clearAllImages();
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
                <span>Phân tích từ Ảnh</span>
                <span className="image-count">({imagesData.length}/{MAX_IMAGES})</span>
            </div>

            {/* Upload Zone */}
            <div
                className={`upload-zone ${isDragging ? 'dragging' : ''} ${imagesData.length > 0 ? 'has-images' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => imagesData.length < MAX_IMAGES && fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileInputChange}
                    style={{ display: 'none' }}
                />

                {imagesData.length > 0 ? (
                    <div className="images-grid">
                        {imagesData.map((img) => (
                            <div key={img.id} className="image-preview-item">
                                <img src={img.preview} alt="Preview" />
                                <button
                                    type="button"
                                    className="remove-image"
                                    onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                        {imagesData.length < MAX_IMAGES && (
                            <div className="add-more-placeholder">
                                <Upload size={20} />
                                <span>Thêm ảnh</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="upload-placeholder">
                        <Upload size={32} />
                        <p>Kéo thả ảnh vào đây</p>
                        <span>hoặc click để chọn file</span>
                        <div className="paste-hint">
                            <Clipboard size={14} />
                            <span>Ctrl+V để dán ảnh từ clipboard</span>
                        </div>
                        <span className="file-hint">Hỗ trợ: JPG, PNG, WebP, GIF (tối đa 10MB/ảnh, tối đa {MAX_IMAGES} ảnh)</span>
                    </div>
                )}
            </div>

            {/* Clear All Button */}
            {imagesData.length > 1 && (
                <button
                    type="button"
                    className="clear-all-btn"
                    onClick={(e) => { e.stopPropagation(); clearAllImages(); }}
                >
                    <X size={14} />
                    Xóa tất cả ({imagesData.length} ảnh)
                </button>
            )}

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
                disabled={isAnalyzing || imagesData.length === 0}
            >
                {isAnalyzing ? (
                    <>
                        <Loader2 className="icon spinning" />
                        Đang phân tích {imagesData.length} ảnh...
                    </>
                ) : (
                    <>
                        <Sparkles className="icon" />
                        Phân tích với AI {imagesData.length > 0 && `(${imagesData.length} ảnh)`}
                    </>
                )}
            </button>
        </div>
    );
}
