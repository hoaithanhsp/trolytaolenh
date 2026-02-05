interface GeneratedResult {
    category: string;
    title: string;
    systemInstruction: string;
    htmlTemplate: string;
}

interface GenerationProgress {
    step: number;
    totalSteps: number;
    currentModel: string;
    status: 'pending' | 'running' | 'success' | 'error' | 'stopped';
    message: string;
    error?: string;
}

type ProgressCallback = (progress: GenerationProgress) => void;

// Danh sách models với thứ tự fallback
const AI_MODELS = [
    'gemini-3-pro-preview',
    'gemini-3-flash-preview',
    'gemini-2.5-flash',
];

// ==========================================
// BƯỚC 1: PHÂN LOẠI ỨNG DỤNG
// ==========================================
const categoryConfig = {
    'Education': {
        keywords: ['quiz', 'học', 'kiểm tra', 'trắc nghiệm', 'từ vựng', 'flashcard', 'bài tập', 'giáo dục', 'thi', 'ôn tập', 'câu hỏi', 'bài cũ', 'điểm', 'lớp', 'sinh viên', 'học sinh', 'giáo viên'],
        icon: '🎓',
        colors: {
            primary: '#4A90E2',
            secondary: '#FF9500',
            gradient: 'linear-gradient(135deg, #4A90E2 0%, #5C6BC0 100%)'
        },
        targetUsers: ['Giáo viên', 'Học sinh', 'Cả hai'],
        purpose: 'Kiểm tra / Học tập / Ôn luyện',
        layout: 'flashcard',
        libraries: ['confetti', 'mathjax']
    },
    'Management': {
        keywords: ['quản lý', 'quản', 'danh sách', 'todo', 'task', 'lịch', 'calendar', 'dashboard', 'thống kê', 'báo cáo', 'nhân sự', 'dự án', 'công việc', 'kế hoạch'],
        icon: '📊',
        colors: {
            primary: '#28A745',
            secondary: '#1E3A8A',
            gradient: 'linear-gradient(135deg, #28A745 0%, #20c997 100%)'
        },
        targetUsers: ['Quản lý', 'Nhân viên', 'Người dùng phổ thông'],
        purpose: 'Quản lý / Theo dõi / Báo cáo',
        layout: 'dashboard',
        libraries: ['chartjs', 'sheetjs']
    },
    'Tool': {
        keywords: ['chuyển đổi', 'convert', 'tạo', 'generate', 'công cụ', 'tiện ích', 'calculator', 'pdf', 'xử lý', 'image', 'text', 'json', 'format', 'download'],
        icon: '🛠️',
        colors: {
            primary: '#6366F1',
            secondary: '#8B5CF6',
            gradient: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)'
        },
        targetUsers: ['Người dùng phổ thông', 'Developer'],
        purpose: 'Xử lý / Chuyển đổi / Tạo nội dung',
        layout: 'form-preview',
        libraries: ['sheetjs']
    },
    'Game': {
        keywords: ['game', 'trò chơi', 'đố', 'puzzle', 'vui', 'giải trí', 'điểm số', 'cạnh tranh', 'xếp hạng', 'thử thách'],
        icon: '🎮',
        colors: {
            primary: '#8B5CF6',
            secondary: '#F472B6',
            gradient: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)'
        },
        targetUsers: ['Người chơi', 'Mọi lứa tuổi'],
        purpose: 'Giải trí / Thử thách / Cạnh tranh',
        layout: 'game-screen',
        libraries: ['confetti']
    },
    'Finance': {
        keywords: ['tài chính', 'tiền', 'chi tiêu', 'thu nhập', 'ngân sách', 'đầu tư', 'lãi suất', 'vay', 'thanh toán'],
        icon: '💰',
        colors: {
            primary: '#10B981',
            secondary: '#6B7280',
            gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
        },
        targetUsers: ['Cá nhân', 'Doanh nghiệp'],
        purpose: 'Quản lý tài chính / Theo dõi chi tiêu',
        layout: 'dashboard',
        libraries: ['chartjs']
    }
};

// Phân loại ứng dụng chi tiết
function detectCategory(idea: string): { category: string; config: typeof categoryConfig['Education'] } {
    const lowerIdea = idea.toLowerCase();

    for (const [category, config] of Object.entries(categoryConfig)) {
        const matchCount = config.keywords.filter(keyword => lowerIdea.includes(keyword)).length;
        if (matchCount >= 1) {
            return { category, config };
        }
    }

    // Default category
    return {
        category: 'Other',
        config: {
            keywords: [],
            icon: '💡',
            colors: {
                primary: '#667eea',
                secondary: '#764ba2',
                gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            },
            targetUsers: ['Người dùng phổ thông'],
            purpose: 'Đa dụng',
            layout: 'standard',
            libraries: []
        }
    };
}

// ==========================================
// BƯỚC 2: PARSE USER SELECTIONS (GỢI Ý AI ĐÃ CHỌN)
// ==========================================
interface UserSelections {
    functions: string[];       // Chức năng đã chọn
    targetUsers: string[];     // Đối tượng sử dụng
    goals: string[];           // Mục tiêu
    expectedResults: string[]; // Kết quả mong muốn
    customRequirements: string[]; // Yêu cầu riêng
}

// Parse và phân loại các gợi ý AI đã chọn từ ý tưởng
function parseUserSelections(idea: string): UserSelections {
    const selections: UserSelections = {
        functions: [],
        targetUsers: [],
        goals: [],
        expectedResults: [],
        customRequirements: []
    };

    // Parse thông tin bổ sung từ gợi ý AI
    const additionalInfoMatch = idea.match(/Thông tin bổ sung:\s*(.+?)(?:\n|$)/i);
    if (additionalInfoMatch) {
        const items = additionalInfoMatch[1].split(',').map(s => s.trim()).filter(s => s);

        // Phân loại dựa trên nội dung
        items.forEach(item => {
            const lowerItem = item.toLowerCase();

            // Phát hiện Đối tượng sử dụng
            if (lowerItem.includes('giáo viên') || lowerItem.includes('học sinh') ||
                lowerItem.includes('sinh viên') || lowerItem.includes('người dùng') ||
                lowerItem.includes('quản lý') || lowerItem.includes('nhân viên') ||
                lowerItem.includes('khách hàng') || lowerItem.includes('người chơi') ||
                lowerItem.includes('phụ huynh') || lowerItem.includes('nhà trường')) {
                selections.targetUsers.push(item);
            }
            // Phát hiện Mục tiêu (thường bắt đầu bằng động từ hoặc có từ khóa mục tiêu)
            else if (lowerItem.includes('nâng cao') || lowerItem.includes('cải thiện') ||
                lowerItem.includes('tăng cường') || lowerItem.includes('phát triển') ||
                lowerItem.includes('hỗ trợ') || lowerItem.includes('giúp') ||
                lowerItem.includes('tạo động lực') || lowerItem.includes('thúc đẩy')) {
                selections.goals.push(item);
            }
            // Phát hiện Kết quả mong muốn
            else if (lowerItem.includes('kết quả') || lowerItem.includes('đạt được') ||
                lowerItem.includes('hoàn thành') || lowerItem.includes('thành thạo') ||
                lowerItem.includes('điểm số') || lowerItem.includes('tiến bộ') ||
                lowerItem.includes('tiết kiệm') || lowerItem.includes('hiệu quả')) {
                selections.expectedResults.push(item);
            }
            // Mặc định là Chức năng
            else {
                selections.functions.push(item);
            }
        });
    }

    // Parse yêu cầu riêng của người dùng
    const customReqMatch = idea.match(/Yêu cầu riêng của người dùng:\s*(.+?)(?:\n|$)/i);
    if (customReqMatch) {
        const customReqs = customReqMatch[1].split(',').map(s => s.trim()).filter(s => s);
        selections.customRequirements.push(...customReqs);
    }

    return selections;
}

// Lấy ý tưởng gốc (bỏ phần thông tin bổ sung)
function getCleanIdea(idea: string): string {
    return idea
        .replace(/\n\nThông tin bổ sung:.*$/is, '')
        .replace(/\n\nYêu cầu riêng của người dùng:.*$/is, '')
        .trim();
}

// ==========================================
// BƯỚC 3: TRÍCH XUẤT TÍNH NĂNG CỐT LÕI
// ==========================================
function extractFeatures(idea: string, category: string): {
    explicit: string[];
    implicit: string[];
    difficult: string[];
    userSelections: UserSelections;
} {
    const explicitFeatures: string[] = [];
    const implicitFeatures: string[] = [];
    const difficultFeatures: string[] = [];

    const lowerIdea = idea.toLowerCase();

    // Parse các lựa chọn của người dùng
    const userSelections = parseUserSelections(idea);

    // Thêm các chức năng đã chọn vào explicit features
    explicitFeatures.push(...userSelections.functions);
    explicitFeatures.push(...userSelections.customRequirements);

    // Tính năng explicit từ keywords
    const featurePatterns = [
        { pattern: /upload\s*(pdf|excel|file)/i, feature: 'Upload file' },
        { pattern: /random|ngẫu nhiên|xáo trộn/i, feature: 'Random/Xáo trộn' },
        { pattern: /timer|đếm giờ|thời gian|countdown/i, feature: 'Đếm giờ' },
        { pattern: /chấm điểm|tính điểm|điểm số/i, feature: 'Chấm điểm tự động' },
        { pattern: /biểu đồ|thống kê|chart/i, feature: 'Biểu đồ thống kê' },
        { pattern: /xuất|export|download|tải/i, feature: 'Xuất file' },
        { pattern: /lưu|save|localstorage/i, feature: 'Lưu dữ liệu' },
        { pattern: /tìm kiếm|search|filter|lọc/i, feature: 'Tìm kiếm/Lọc' },
        { pattern: /thêm|sửa|xóa|crud/i, feature: 'CRUD operations' },
        { pattern: /công thức|toán|math|phương trình/i, feature: 'Hiển thị công thức toán' },
        { pattern: /hiệu ứng|animation|confetti/i, feature: 'Hiệu ứng animation' },
        { pattern: /responsive|mobile/i, feature: 'Responsive mobile' },
        { pattern: /nhiều đề|chia đề/i, feature: 'Chia nhiều đề' },
        { pattern: /nhận xét|đánh giá|feedback/i, feature: 'Nhận xét/Đánh giá' },
        { pattern: /bonus|thưởng|cộng điểm/i, feature: 'Hệ thống bonus' },
    ];

    featurePatterns.forEach(({ pattern, feature }) => {
        if (pattern.test(idea)) {
            explicitFeatures.push(feature);
        }
    });

    // Tính năng implicit (tự động thêm vào)
    const categoryImplicitFeatures: Record<string, string[]> = {
        'Education': [
            'Nút "Bắt đầu làm bài"',
            'Hiển thị câu hỏi từng câu một',
            'Nút "Câu tiếp theo"',
            'Thanh tiến độ (progress bar)',
            'Lưu kết quả vào LocalStorage',
            'Màn hình kết quả cuối cùng',
            'Nút "Làm lại"',
            'Hiệu ứng chúc mừng khi hoàn thành'
        ],
        'Management': [
            'Bảng dữ liệu responsive',
            'Pagination phân trang',
            'Modal thêm/sửa dữ liệu',
            'Xác nhận trước khi xóa',
            'Loading state khi xử lý',
            'Thông báo toast',
            'Export Excel/PDF'
        ],
        'Tool': [
            'Vùng kéo thả file (drag & drop)',
            'Preview kết quả real-time',
            'Nút Copy to clipboard',
            'Nút Download kết quả',
            'Xử lý lỗi với thông báo rõ ràng',
            'Loading indicator'
        ],
        'Game': [
            'Màn hình Start/Menu',
            'Hệ thống điểm số',
            'Bảng xếp hạng (Leaderboard)',
            'Hiệu ứng âm thanh (optional)',
            'Animation mượt mà',
            'Nút Pause/Resume',
            'Game Over screen'
        ]
    };

    implicitFeatures.push(...(categoryImplicitFeatures[category] || categoryImplicitFeatures['Tool']));

    // Tính năng khó thực hiện
    if (lowerIdea.includes('gạch chân') || lowerIdea.includes('underline')) {
        difficultFeatures.push('Nhận diện gạch chân trong PDF → Giải pháp: Sử dụng pattern **...** hoặc __...__');
    }
    if (lowerIdea.includes('ocr') || lowerIdea.includes('nhận diện chữ')) {
        difficultFeatures.push('OCR từ hình ảnh → Giải pháp: Sử dụng API OCR hoặc yêu cầu text input');
    }
    if (lowerIdea.includes('âm thanh') || lowerIdea.includes('sound')) {
        difficultFeatures.push('Âm thanh/Sound effects → Giải pháp: Thêm file audio hoặc sử dụng Web Audio API');
    }

    return { explicit: explicitFeatures, implicit: implicitFeatures, difficult: difficultFeatures, userSelections };
}

// ==========================================
// BƯỚC 3: CHỌN TECH STACK & THƯ VIỆN
// ==========================================
function getTechStack(category: string, features: { explicit: string[]; implicit: string[] }): string {
    const allFeatures = [...features.explicit, ...features.implicit].join(' ').toLowerCase();

    const libraries: string[] = [
        `<!-- Google Fonts - Tiếng Việt -->
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700&display=swap" rel="stylesheet">`,
        `<!-- FontAwesome Icons -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">`
    ];

    if (allFeatures.includes('công thức') || allFeatures.includes('toán') || category === 'Education') {
        libraries.push(`<!-- MathJax - Công thức toán học -->
<script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>
<script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>`);
    }

    if (allFeatures.includes('biểu đồ') || allFeatures.includes('thống kê') || category === 'Management' || category === 'Finance') {
        libraries.push(`<!-- Chart.js - Biểu đồ -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>`);
    }

    if (allFeatures.includes('excel') || allFeatures.includes('xuất')) {
        libraries.push(`<!-- SheetJS - Xuất Excel -->
<script src="https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js"></script>`);
    }

    if (allFeatures.includes('hiệu ứng') || allFeatures.includes('chúc mừng') || category === 'Education' || category === 'Game') {
        libraries.push(`<!-- Canvas Confetti - Hiệu ứng chúc mừng -->
<script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>`);
    }

    return libraries.join('\n\n');
}

// ==========================================
// BƯỚC 4: THIẾT KẾ UI/UX
// ==========================================


// ==========================================
// BƯỚC 5: XÂY DỰNG LOGIC XỬ LÝ
// ==========================================
function getProcessingLogic(idea: string, category: string, features: { explicit: string[]; implicit: string[]; difficult: string[] }): string {
    const lowerIdea = idea.toLowerCase();

    let processSteps = `
### QUY TRÌNH XỬ LÝ

\`\`\`
`;

    if (category === 'Education') {
        processSteps += `1. NGƯỜI DÙNG NHẬP/UPLOAD DỮ LIỆU
   ↓
2. PARSE VÀ VALIDATE DỮ LIỆU
   - Kiểm tra format đúng không
   - Tách câu hỏi và đáp án
   ↓
3. PHÂN LOẠI CÂU HỎI
   - Trắc nghiệm 4 lựa chọn
   - Đúng/Sai
   - Điền khuyết
   ↓
4. TẠO BỘ ĐỀ
   - Xáo trộn câu hỏi (nếu cần)
   - Chia thành nhiều đề (nếu cần)
   ↓
5. HIỂN THỊ GIAO DIỆN
   - Màn hình chọn đề/random học sinh
   - Màn hình làm bài với timer
   - Màn hình kết quả
   ↓
6. CHẤM ĐIỂM & NHẬN XÉT
   - Tính điểm từng câu
   - Bonus nếu trả lời nhanh
   - Tạo nhận xét dựa trên điểm`;
    } else if (category === 'Management') {
        processSteps += `1. KHỞI TẠO ỨNG DỤNG
   - Load dữ liệu từ LocalStorage
   - Render bảng dữ liệu
   ↓
2. THÊM DỮ LIỆU MỚI
   - Mở modal form
   - Validate input
   - Lưu vào state & localStorage
   ↓
3. SỬA DỮ LIỆU
   - Load data vào form
   - Cho phép chỉnh sửa
   - Update & save
   ↓
4. XÓA DỮ LIỆU
   - Hiện confirm dialog
   - Xóa khỏi state & localStorage
   ↓
5. TÌM KIẾM & LỌC
   - Filter theo keyword
   - Sort theo column
   ↓
6. XUẤT BÁO CÁO
   - Export Excel/PDF
   - Hiển thị biểu đồ thống kê`;
    } else if (category === 'Tool') {
        processSteps += `1. NGƯỜI DÙNG NHẬP/UPLOAD DỮ LIỆU
   - Text input hoặc file upload
   - Drag & drop support
   ↓
2. VALIDATE DỮ LIỆU
   - Kiểm tra format
   - Kiểm tra dung lượng
   - Hiển thị lỗi nếu có
   ↓
3. XỬ LÝ DỮ LIỆU
   - Chuyển đổi/Transform
   - Parse/Generate
   ↓
4. HIỂN THỊ KẾT QUẢ
   - Preview real-time
   - Highlight changes
   ↓
5. XUẤT KẾT QUẢ
   - Copy to clipboard
   - Download file`;
    } else if (category === 'Game') {
        processSteps += `1. MÀN HÌNH START
   - Hiển thị menu chính
   - Chọn difficulty (nếu có)
   ↓
2. KHỞI TẠO GAME
   - Reset score, lives
   - Load level/questions
   ↓
3. GAME LOOP
   - Hiển thị challenge
   - Nhận input người chơi
   - Check answer/action
   - Update score/lives
   ↓
4. CHECK WIN/LOSE
   - Nếu win → Next level / Celebration
   - Nếu lose → Game Over
   ↓
5. KẾT THÚC
   - Hiển thị final score
   - Update leaderboard
   - Option: Play again`;
    } else {
        processSteps += `1. KHỞI TẠO ỨNG DỤNG
   - Load config/data
   - Render UI
   ↓
2. NHẬN INPUT TỪ NGƯỜI DÙNG
   - Form input / File upload
   - Validate
   ↓
3. XỬ LÝ LOGIC
   - Process data
   - Generate output
   ↓
4. HIỂN THỊ KẾT QUẢ
   - Render output
   - Allow actions (copy/download)`;
    }

    processSteps += `
\`\`\`

### XỬ LÝ TRƯỜNG HỢP ĐẶC BIỆT (Edge Cases)

| Trường hợp | Xử lý |
|------------|-------|
| Dữ liệu rỗng | Hiển thị thông báo lỗi "Không có dữ liệu" |
| Format không đúng | Alert với hướng dẫn format đúng |
| Không đủ câu hỏi | Tạo với số câu hiện có, thông báo cho user |
| Hết thời gian | Tự động chấm điểm với các câu chưa trả lời = sai |
| Mất kết nối | Dữ liệu đã lưu trong LocalStorage vẫn giữ được |
| User refresh trang | Load lại từ LocalStorage (nếu có) |
`;

    if (features.difficult.length > 0) {
        processSteps += `
### GIẢI PHÁP CHO TÍNH NĂNG KHÓ

${features.difficult.map((f, i) => `${i + 1}. ${f}`).join('\n')}
`;
    }

    return processSteps;
}

// ==========================================
// BƯỚC 6: TẠO MẪU CODE TEMPLATE
// ==========================================
function generateHTMLTemplate(idea: string, category: string, config: typeof categoryConfig['Education'], features: { explicit: string[]; implicit: string[] }): string {
    const title = `${config.icon} ${idea.slice(0, 50)}${idea.length > 50 ? '...' : ''}`;
    const techStack = getTechStack(category, features);

    return `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    
    ${techStack}
    
    <style>
        /* ========== CSS RESET ========== */
        * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box; 
        }
        
        /* ========== GLOBAL STYLES ========== */
        body {
            font-family: 'Be Vietnam Pro', sans-serif;
            background: ${config.colors.gradient};
            min-height: 100vh;
            color: #1a202c;
            line-height: 1.6;
        }
        
        /* ========== CONTAINER ========== */
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        /* ========== CARD COMPONENT ========== */
        .card {
            background: white;
            border-radius: 16px;
            padding: 30px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            animation: fadeIn 0.5s ease-out;
        }
        
        /* ========== BUTTON STYLES ========== */
        .btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            font-family: inherit;
        }
        
        .btn-primary {
            background: ${config.colors.gradient};
            color: white;
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 20px rgba(0,0,0,0.2);
        }
        
        .btn-secondary {
            background: transparent;
            border: 2px solid ${config.colors.primary};
            color: ${config.colors.primary};
        }
        
        .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        
        /* ========== INPUT STYLES ========== */
        .input, .textarea, .select {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 16px;
            font-family: inherit;
            transition: all 0.3s;
        }
        
        .input:focus, .textarea:focus, .select:focus {
            outline: none;
            border-color: ${config.colors.primary};
            box-shadow: 0 0 0 3px ${config.colors.primary}20;
        }
        
        /* ========== ANIMATIONS ========== */
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }
        
        /* ========== SCREEN MANAGEMENT ========== */
        .screen { display: none; }
        .screen.active { display: block; }
        
        /* ========== PROGRESS BAR ========== */
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #e2e8f0;
            border-radius: 4px;
            overflow: hidden;
        }
        
        .progress-fill {
            height: 100%;
            background: ${config.colors.gradient};
            transition: width 0.3s ease;
        }
        
        /* ========== RESPONSIVE ========== */
        @media (max-width: 768px) {
            .container { padding: 15px; }
            .card { padding: 20px; border-radius: 12px; }
            .btn { padding: 10px 20px; font-size: 14px; }
        }
        
        /* ========== AI_CUSTOM_CSS_HERE ========== */
        /* AI sẽ thêm CSS tùy chỉnh ở đây */
    </style>
</head>
<body>
    <div id="app" class="container">
        <!-- ========== SCREEN 1: Main/Start ========== -->
        <div id="screen-main" class="screen active">
            <div class="card">
                <h1><i class="fas fa-rocket"></i> ${title}</h1>
                <p><!-- Mô tả ngắn về app --></p>
                
                <!-- AI_GENERATED_MAIN_CONTENT_HERE -->
                
                <button id="btn-start" class="btn btn-primary">
                    <i class="fas fa-play"></i> Bắt đầu
                </button>
            </div>
        </div>
        
        <!-- ========== SCREEN 2: Action/Quiz ========== -->
        <div id="screen-action" class="screen">
            <div class="card">
                <!-- AI_GENERATED_ACTION_CONTENT_HERE -->
            </div>
        </div>
        
        <!-- ========== SCREEN 3: Result ========== -->
        <div id="screen-result" class="screen">
            <div class="card">
                <!-- AI_GENERATED_RESULT_CONTENT_HERE -->
                
                <button id="btn-restart" class="btn btn-primary">
                    <i class="fas fa-redo"></i> Làm lại
                </button>
            </div>
        </div>
    </div>
    
    <script>
        // ============ CONFIGURATION ============
        const CONFIG = {
            // AI_FILL_CONFIG_HERE
        };
        
        // ============ DATA ============
        const appData = {
            // AI_FILL_DATA_HERE
        };
        
        // ============ STATE MANAGEMENT ============
        let state = {
            currentScreen: 'screen-main',
            // AI_FILL_STATE_HERE
        };
        
        // ============ UTILITY FUNCTIONS ============
        function $(selector) {
            return document.querySelector(selector);
        }
        
        function $$(selector) {
            return document.querySelectorAll(selector);
        }
        
        function showScreen(screenId) {
            $$('.screen').forEach(s => s.classList.remove('active'));
            $('#' + screenId).classList.add('active');
            state.currentScreen = screenId;
        }
        
        function saveToStorage(key, data) {
            localStorage.setItem(key, JSON.stringify(data));
        }
        
        function loadFromStorage(key) {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        }
        
        function showToast(message, type = 'info') {
            // AI sẽ implement toast notification
        }
        
        // ============ CORE FUNCTIONS ============
        function init() {
            // Load saved data
            const savedData = loadFromStorage('appData');
            if (savedData) {
                Object.assign(appData, savedData);
            }
            
            // AI_INIT_CODE_HERE
        }
        
        function start() {
            showScreen('screen-action');
            // AI_START_CODE_HERE
        }
        
        function showResult() {
            showScreen('screen-result');
            // AI_RESULT_CODE_HERE
        }
        
        function restart() {
            showScreen('screen-main');
            // AI_RESTART_CODE_HERE
        }
        
        // ============ EVENT LISTENERS ============
        document.addEventListener('DOMContentLoaded', init);
        
        $('#btn-start')?.addEventListener('click', start);
        $('#btn-restart')?.addEventListener('click', restart);
        
        // AI_EVENT_LISTENERS_HERE
    </script>
</body>
</html>`;
}

// ==========================================
// ==========================================
// BƯỚC 7: VIẾT SYSTEM INSTRUCTION HOÀN CHỈNH (LOGIC MỚI THEO DEMO)
// ==========================================
function generateSystemInstruction(idea: string, category: string, config: typeof categoryConfig['Education']): string {
    const features = extractFeatures(idea, category);
    const cleanIdea = getCleanIdea(idea);

    // Tạo tiêu đề sáng tạo
    const appTitle = generateCreativeTitle(idea, category, config);

    // Tự động đề xuất tính năng thông minh
    const smartFeatures = inferSmartFeatures(idea, category);

    // ===== TẠO CÁC PHẦN NỘI DUNG THEO CẤU TRÚC 9 PHẦN =====
    // I. TỔNG QUAN DỰ ÁN
    const appSummary = generateAppSummary(appTitle, category, cleanIdea, smartFeatures);

    // II. LUỒNG HOẠT ĐỘNG
    const operationFlow = generateOperationFlowV2(category, features.userSelections);

    // III. CẤU TRÚC CHỨC NĂNG CHI TIẾT
    const detailedFeatures = generateDetailedFeatures(category, features.userSelections, features.implicit);

    // IV. YÊU CẦU GIAO DIỆN
    const uiRequirements = generateUIRequirements(category, config);

    // V. YÊU CẦU KỸ THUẬT
    const techRequirements = generateTechnicalRequirements(category);

    // VI. VAI TRÒ CỦA GEMINI AI (MỚI)
    const aiRole = generateAIRole(category, cleanIdea);

    // VII. YÊU CẦU OUTPUT
    const outputChecklist = generateOutputChecklist();

    // VIII. HƯỚNG DẪN SỬ DỤNG (MỚI)
    const userGuide = generateUserGuide();

    // IX. XỬ LÝ TRƯỜNG HỢP ĐẶC BIỆT (MỚI)
    const edgeCases = generateEdgeCases();

    const systemInstruction = `# ${config.icon} YÊU CẦU TẠO ỨNG DỤNG WEB: ${appTitle}

${appSummary}
---
${operationFlow}
---
${detailedFeatures}
---
${uiRequirements}
---
${techRequirements}
---
${aiRole}
---
${outputChecklist}
---
${userGuide}
---
${edgeCases}

## 🚀 LỜI NHẮN CHO AI

Bạn là một chuyên gia lập trình web với nhiều năm kinh nghiệm.

**Nguyên tắc:**
1. Đừng chỉ viết code - Hãy tạo ra sản phẩm khiến người dùng thốt lên "WOW"
2. Chú trọng UX - Mọi thao tác phải trực quan, dễ hiểu
3. Không lỗi vặt - Test kỹ mọi chức năng trước khi hoàn thành
4. Code sạch - Comment đầy đủ bằng tiếng Việt, dễ maintain
5. Demo data - Có dữ liệu mẫu để chạy ngay

**Bắt đầu ngay!** 🎯
`;

    return systemInstruction;
}

// Tạo tiêu đề sáng tạo cho app
function generateCreativeTitle(idea: string, category: string, config: typeof categoryConfig['Education']): string {
    const lowerIdea = idea.toLowerCase();

    if (lowerIdea.includes('quiz') || lowerIdea.includes('trắc nghiệm')) {
        return `App Quiz Trắc Nghiệm Thông Minh`;
    } else if (lowerIdea.includes('kiểm tra bài cũ')) {
        return `App Kiểm Tra Bài Cũ Đầu Giờ Pro`;
    } else if (lowerIdea.includes('flashcard') || lowerIdea.includes('từ vựng')) {
        return `App Flashcard Học Từ Vựng Thông Minh`;
    } else if (lowerIdea.includes('quản lý')) {
        return `Hệ Thống Quản Lý Thông Minh`;
    } else if (lowerIdea.includes('game')) {
        return `Game Học Tập Tương Tác`;
    }

    // Default: Lấy từ ý tưởng
    const shortIdea = idea.slice(0, 40);
    return `${shortIdea}${idea.length > 40 ? '...' : ''} Pro`;
}

// Chọn thư viện CDN phù hợp
function selectCDNLibraries(idea: string, category: string): string {
    const lowerIdea = idea.toLowerCase();
    const libraries: string[] = [];

    // Font tiếng Việt (Bắt buộc)
    libraries.push(`<!-- Google Fonts - Tiếng Việt -->
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">`);

    // Icons (Bắt buộc)
    libraries.push(`<!-- FontAwesome 6 Icons -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">`);

    // MathJax (nếu có Toán/Lý/Hóa)
    if (lowerIdea.includes('toán') || lowerIdea.includes('lý') || lowerIdea.includes('hóa') ||
        lowerIdea.includes('math') || lowerIdea.includes('công thức') || category === 'Education') {
        libraries.push(`<!-- MathJax 3 - Công thức Toán học -->
<script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>
<script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>`);
    }

    // Chart.js (nếu có thống kê)
    if (lowerIdea.includes('thống kê') || lowerIdea.includes('biểu đồ') ||
        category === 'Management' || category === 'Finance') {
        libraries.push(`<!-- Chart.js - Biểu đồ -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>`);
    }

    // SheetJS (nếu cần Excel)
    if (lowerIdea.includes('excel') || lowerIdea.includes('xuất') ||
        lowerIdea.includes('import') || category === 'Management') {
        libraries.push(`<!-- SheetJS - Xuất/Nhập Excel -->
<script src="https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js"></script>`);
    }

    // Confetti (hiệu ứng chúc mừng)
    if (lowerIdea.includes('quiz') || lowerIdea.includes('game') ||
        lowerIdea.includes('kiểm tra') || category === 'Education' || category === 'Game') {
        libraries.push(`<!-- Canvas Confetti - Hiệu ứng chúc mừng -->
<script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>`);
    }

    return libraries.join('\n\n');
}

// Tự động đề xuất tính năng thông minh
function inferSmartFeatures(idea: string, category: string): string[] {
    const lowerIdea = idea.toLowerCase();
    const features: string[] = [];

    if (category === 'Education' || lowerIdea.includes('quiz') || lowerIdea.includes('kiểm tra')) {
        features.push(
            'Random xáo trộn câu hỏi mỗi lần làm bài',
            'Chế độ "Ôn lại câu sai" sau khi hoàn thành',
            'Thống kê kết quả chi tiết (Điểm, Thời gian, Tỷ lệ đúng)',
            'Bonus điểm nếu trả lời nhanh',
            'Hiệu ứng Confetti khi hoàn thành xuất sắc',
            'Lưu lịch sử làm bài vào LocalStorage',
            'Đồng hồ đếm ngược với cảnh báo khi gần hết giờ',
            'Thanh tiến trình progress bar'
        );
    }

    if (category === 'Management' || lowerIdea.includes('quản lý')) {
        features.push(
            'Lưu dữ liệu vào LocalStorage (không mất khi F5)',
            'Tìm kiếm realtime khi gõ',
            'Lọc theo nhiều tiêu chí',
            'Sắp xếp theo cột (tăng/giảm)',
            'Xuất Excel với 1 click',
            'Modal form thêm/sửa dữ liệu',
            'Xác nhận trước khi xóa',
            'Phân trang dữ liệu'
        );
    }

    if (category === 'Game' || lowerIdea.includes('game')) {
        features.push(
            'Hệ thống điểm số với animation',
            'Nhiều level với độ khó tăng dần',
            'Bảng xếp hạng (Leaderboard)',
            'Hiệu ứng âm thanh (Sound effects)',
            'Animation mượt mà (CSS/Canvas)',
            'Game Over và Restart đẹp mắt',
            'Lưu high score vào LocalStorage'
        );
    }

    // Thêm các tính năng chung
    features.push(
        'Responsive hoàn hảo trên mọi thiết bị',
        'Loading indicator khi xử lý',
        'Thông báo toast/alert đẹp mắt'
    );

    return features;
}

// ==========================================
// BƯỚC 4A: MÔ TẢ GIAO DIỆN CHI TIẾT (UI SPECIFICATION)
// Tích hợp từ skill: frontend-design
// ==========================================
// function generateUISpecification(category: string, config: typeof categoryConfig['Education'], userSelections: UserSelections): string {
// ... (Code cũ đã được replacement bởi generateUIRequirements)
// }

// ==========================================
// BƯỚC 4B: MÔ TẢ TÍNH NĂNG CHI TIẾT (FEATURE SPECIFICATION)
// Tích hợp từ skill: app-builder
// ==========================================
// function generateFeatureSpecification... (Deprecated)
// function generateOperationFlow... (Deprecated)

// ==========================================
// BƯỚC 4: CÁC HELPER FUNCTIONS CHO CẤU TRÚC LỆNH MỚI (V2)
// ==========================================

function generateAppSummary(appTitle: string, category: string, idea: string, features: string[]): string {
    return `## I. TỔNG QUAN DỰ ÁN

- **Tên ứng dụng:** ${appTitle}
- **Thể loại:** ${category}
- **Mục đích chính:** Xây dựng ứng dụng web single-page (SPA) chạy trực tiếp trên trình duyệt, không cần backend phức tạp.
- **Công nghệ yêu cầu:** 
  - HTML5, CSS3 (Modern features: Flexbox, Grid, Variables)
  - JavaScript ES6+ (Native, không Framework nặng nếu không cần thiết)
  - Lưu trữ dữ liệu: LocalStorage (Client-side)
  - Thư viện hỗ trợ: FontAwesome, Google Fonts, SweetAlert2 (Toast), Chart.js (nếu cần)

- **Các tính năng chính (Key Features):**
${features.map(f => `  - ✅ ${f}`).join('\n')}
`;
}

function generateOperationFlowV2(category: string, _userSelections: UserSelections): string {
    // Logic tương tự generateOperationFlow cũ nhưng format lại theo style Step-by-Step của demo
    let steps = '';

    if (category === 'Education' || category === 'Quiz') {
        steps = `### Bước 1: Khởi tạo dữ liệu
- Giáo viên nhập/import danh sách câu hỏi hoặc bài học.
- Hệ thống lưu vào LocalStorage.

### Bước 2: Cấu hình bài học/kiểm tra
- Chọn chế độ (Ôn tập, Kiểm tra, Trò chơi).
- Cài đặt thời gian, số lượng câu hỏi.

### Bước 3: Học sinh tham gia
- Hiển thị câu hỏi/nội dung trực quan.
- Học sinh tương tác (chọn đáp án, kéo thả, điền từ).
- Hệ thống phản hồi tức thì (âm thanh, hiệu ứng visual).

### Bước 4: Kết thúc & Đánh giá
- Hiển thị kết quả tổng quan (Score, Stars).
- Lưu lịch sử làm bài.
- Thống kê các câu hay sai.`;
    } else if (category === 'Management') {
        steps = `### Bước 1: Quản lý danh mục
- Thiết lập các danh mục cần quản lý (Lớp, Sản phẩm, Nhân viên...).

### Bước 2: Nhập liệu (CRUD)
- Thêm mới dữ liệu (Form + Validation).
- Import từ Excel (nếu có).

### Bước 3: Theo dõi & Tác nghiệp
- Xem danh sách dưới dạng Bảng/Card.
- Tìm kiếm, Lọc, Sắp xếp dữ liệu.
- Thực hiện các thao tác nghiệp vụ (Chấm công, Điểm danh, Cập nhật trạng thái).

### Bước 4: Báo cáo & Xuất dữ liệu
- Xem Dashboard thống kê tổng quan.
- Export báo cáo ra file Excel/PDF.`;
    } else if (category === 'Game') {
        steps = `### Bước 1: Màn hình chờ (Start Screen)
- Giới thiệu game, hướng dẫn cách chơi.
- Nút "Play" với hiệu ứng thu hút.

### Bước 2: Gameplay Loop
- Khởi tạo màn chơi (Level generation).
- Người chơi tương tác -> Cập nhật trạng thái game.
- Tính điểm/thời gian thực.

### Bước 3: Win/Lose Condition
- Kiểm tra điều kiện thắng/thua.
- Hiển thị màn hình kết quả (Game Over / Level Complete).

### Bước 4: High Score & Replay
- Lưu điểm cao.
- Nút "Chơi lại" để reset game loop.`;
    } else {
        steps = `### Bước 1: Input
- Người dùng nhập liệu hoặc upload file.
- Validate dữ liệu đầu vào.

### Bước 2: Processing
- Xử lý dữ liệu theo logic nghiệp vụ.
- Hiển thị loading/progress nếu cần.

### Bước 3: Output
- Hiển thị kết quả sau xử lý.
- Cho phép preview, copy hoặc download kết quả.`;
    }

    return `## II. LUỒNG HOẠT ĐỘNG (USER FLOW)
${steps}
`;
}

function generateDetailedFeatures(category: string, userSelections: UserSelections, implicitFeatures: string[]): string {
    // Kết hợp features từ user selection và implicit features
    const allFeatures = [...userSelections.functions, ...implicitFeatures];
    // Loại bỏ trùng lặp
    const uniqueFeatures = Array.from(new Set(allFeatures));

    let content = `## III. CẤU TRÚC CHỨC NĂNG CHI TIẾT\n\n`;

    // Nhóm tính năng theo module
    const coreFeatures = uniqueFeatures.slice(0, Math.ceil(uniqueFeatures.length / 2));
    const supportFeatures = uniqueFeatures.slice(Math.ceil(uniqueFeatures.length / 2));

    content += `### A. MODULE CHÍNH (Core Features)\n`;
    coreFeatures.forEach(f => {
        content += generateFeatureDetail(f, category);
    });

    content += `\n### B. MODULE BỔ TRỢ & TIỆN ÍCH\n`;
    supportFeatures.forEach(f => {
        content += `- **${f}:** ${generateShortDescription(f)}\n`;
    });

    if (userSelections.customRequirements.length > 0) {
        content += `\n### C. YÊU CẦU ĐẶC BIỆT (User Requests)\n`;
        userSelections.customRequirements.forEach(req => {
            content += `- ⭐ ${req}\n`;
        });
    }

    return content;
}

// Helper: Tạo mô tả chi tiết cho từng tính năng core
function generateFeatureDetail(feature: string, category: string): string {
    const lowerFeature = feature.toLowerCase();

    if (lowerFeature.includes('bảng xếp hạng') || lowerFeature.includes('ranking') || lowerFeature.includes('thi đua')) {
        return `
#### 📊 ${feature}
**Mô tả:** Hiển thị bảng xếp hạng theo tuần/tháng, tự động cập nhật, sắp xếp giảm dần
**Giao diện:** Bảng với cột: Hạng, Tên, Nhóm, Điểm, Xu hướng (↑↓). Top 3 có huy chương 🥇🥈🥉
**Dữ liệu:** \`{ id, name, group, points: {week, month, total}, trend }\`

`;
    } else if (lowerFeature.includes('cộng') || lowerFeature.includes('trừ') || lowerFeature.includes('điểm')) {
        return `
#### ➕➖ ${feature}
**Mô tả:** Tìm kiếm + Chọn danh mục + Nhập điểm + Ghi chú. Tự động ghi lịch sử
**Giao diện:** Form autocomplete, Dropdown danh mục, Toast thông báo, Lịch sử gần đây
**Dữ liệu:** \`{ id, targetId, categoryId, points, reason, timestamp }\`

`;
    } else if (lowerFeature.includes('báo cáo') || lowerFeature.includes('report') || lowerFeature.includes('thống kê')) {
        return `
#### 📄 ${feature}
**Mô tả:** Chọn thời gian và đối tượng, tạo báo cáo với nhận xét tự động
**Giao diện:** Bộ lọc, Preview, Xuất Excel/PDF với template đẹp

`;
    } else if (lowerFeature.includes('quiz') || lowerFeature.includes('trắc nghiệm') || lowerFeature.includes('câu hỏi')) {
        return `
#### ❓ ${feature}
**Mô tả:** Hiển thị câu hỏi lần lượt, random xáo trộn, đếm ngược, tính điểm
**Giao diện:** Card câu hỏi, Progress bar, Màn hình kết quả chi tiết
**Dữ liệu:** \`{ id, question, options: [], correctAnswer, explanation }\`

`;
    } else if (lowerFeature.includes('quản lý') || lowerFeature.includes('danh sách')) {
        return `
#### 📋 ${feature}
**Mô tả:** CRUD đầy đủ, tìm kiếm realtime, lọc và sắp xếp
**Giao diện:** Bảng với pagination, Modal form, Confirm dialog, Import/Export

`;
    } else {
        return `
#### ⚡ ${feature}
**Mô tả:** ${generateGenericDescription(feature, category)}
**Giao diện:** Thiết kế hiện đại, validation, loading, thông báo kết quả

`;
    }
}

// Helper: Tạo mô tả ngắn gọn cho tính năng bổ trợ
function generateShortDescription(feature: string): string {
    const lowerFeature = feature.toLowerCase();

    if (lowerFeature.includes('progress') || lowerFeature.includes('tiến độ')) return 'Hiển thị phần trăm hoàn thành';
    if (lowerFeature.includes('đồng hồ') || lowerFeature.includes('timer')) return 'Hiển thị thời gian còn lại';
    if (lowerFeature.includes('làm lại') || lowerFeature.includes('reset')) return 'Reset về trạng thái ban đầu';
    if (lowerFeature.includes('confetti') || lowerFeature.includes('chúc mừng')) return 'Animation chúc mừng';
    if (lowerFeature.includes('lưu') || lowerFeature.includes('save')) return 'Tự động lưu vào LocalStorage';
    if (lowerFeature.includes('tìm kiếm') || lowerFeature.includes('search')) return 'Tìm kiếm realtime';
    if (lowerFeature.includes('lọc') || lowerFeature.includes('filter')) return 'Lọc theo nhiều tiêu chí';
    if (lowerFeature.includes('sắp xếp') || lowerFeature.includes('sort')) return 'Sắp xếp tăng/giảm';
    if (lowerFeature.includes('excel') || lowerFeature.includes('xuất')) return 'Export ra Excel';
    if (lowerFeature.includes('responsive')) return 'Hiển thị tốt trên mọi màn hình';
    if (lowerFeature.includes('loading')) return 'Hiển thị trạng thái đang xử lý';
    if (lowerFeature.includes('toast') || lowerFeature.includes('thông báo')) return 'Thông báo popup đẹp mắt';

    return 'Chức năng hỗ trợ trải nghiệm người dùng';
}

// Helper: Tạo mô tả generic
function generateGenericDescription(feature: string, category: string): string {
    if (category === 'Education') return `Hỗ trợ học tập: ${feature}`;
    if (category === 'Management') return `Quản lý dữ liệu: ${feature}`;
    if (category === 'Game') return `Tăng tính tương tác: ${feature}`;
    return `Thực hiện: ${feature}`;
}

function generateUIRequirements(_category: string, config: typeof categoryConfig['Education']): string {
    return `## IV. YÊU CẦU GIAO DIỆN (UI/UX)

### 1. Phong cách thiết kế
- **Style:** Modern, Clean, Apple-like hoặc Material Design nhẹ nhàng.
- **Màu sắc chủ đạo:** ${config.colors.primary} (Primary), ${config.colors.secondary} (Secondary).
- **Font chữ:** Sử dụng 'Be Vietnam Pro' hoặc 'Nunito' (Google Fonts) để hỗ trợ tiếng Việt tốt nhất.
- **Khoảng trắng:** Sử dụng nhiều whitespace để tạo cảm giác thoáng đãng.
- **Bo góc:** Border-radius 8px - 16px cho các thẻ card/button.

### 2. Components chính
- **Inputs:** Style hiện đại, focus effect, placeholder rõ ràng.
- **Buttons:** Gradient hoặc Solid color, hover effect (scale/brightness).
- **Cards:** Box-shadow nhẹ (shadow-sm -> shadow-md khi hover).
- **Feedback:** SweetAlert2 hoặc Toastify cho các thông báo thành công/lỗi.

### 3. Responsive
- Tương thích hoàn toàn trên Mobile (dọc), Tablet và Desktop.
- Menu chuyển thành Hamburger hoặc Bottom Navigation trên mobile.
`;
}

function generateTechnicalRequirements(category: string): string {
    let storageStructure = '';
    if (category === 'Education') {
        storageStructure = `const data = {
  questions: [], // Danh sách câu hỏi
  history: [],   // Lịch sử làm bài
  settings: {}   // Cài đặt (thời gian, âm thanh...)
}`;
    } else if (category === 'Management') {
        storageStructure = `const data = {
  items: [],      // Danh sách đối tượng quản lý
  categories: [], // Danh mục
  config: {}      // Cấu hình
}`;
    } else {
        storageStructure = `const data = {
  // Cấu trúc dữ liệu phù hợp
}`;
    }

    return `## V. YÊU CẦU KỸ THUẬT

### 1. Lưu trữ dữ liệu (LocalStorage)
- Dữ liệu được lưu dưới dạng JSON trong LocalStorage.
- Cấu trúc mẫu:
\`\`\`javascript
${storageStructure}
\`\`\`

### 2. Xử lý Logic & Data
- **Validation:** Kiểm tra kỹ dữ liệu đầu vào (không để trống, đúng định dạng).
- **Error Handling:** Try-catch các thao tác quan trọng (parse JSON, import file).
- **Performance:** Tối ưu vòng lặp nếu dữ liệu lớn (>1000 items).

### 3. Export/Import (Nếu có)
- Hỗ trợ Export dữ liệu ra Excel (.xlsx) chhoặc JSON.
- Import dữ liệu từ file để khôi phục/nhập liệu nhanh.
`;
}

function generateOutputChecklist(): string {
    return `## VII. YÊU CẦU OUTPUT (BẮT BUỘC)

Hãy tạo ra một ứng dụng web hoàn chỉnh với tích hợp **Gemini AI**:

### A. Cấu trúc dự án:
- [ ] \`index.html\` - Giao diện chính
- [ ] \`style.css\` - Styles (hoặc inline trong HTML)
- [ ] \`app.js\` - Logic chính và tích hợp Gemini API

### B. Tích hợp Gemini AI:
- [ ] **API Integration:** Gọi Gemini API (gemini-2.0-flash hoặc gemini-1.5-flash) để xử lý các tác vụ AI
- [ ] **API Key Input:** Cho phép người dùng nhập API Key của họ (lưu vào LocalStorage)
- [ ] **Error Handling:** Xử lý lỗi API (rate limit, network error, invalid key)
- [ ] **Loading States:** Hiển thị trạng thái loading khi đang gọi AI

### C. Yêu cầu code:
- [ ] **Code Quality:** Code trong sáng, có comment giải thích bằng tiếng Việt
- [ ] **Demo Data:** Có dữ liệu mẫu để demo ngay
- [ ] **Responsive:** Hoạt động tốt trên mobile/tablet/desktop
- [ ] **Single Page App:** Không cần backend server phức tạp, chạy trực tiếp trên browser
`;
}

// ==========================================
// PHẦN VI: VAI TRÒ CỦA GEMINI AI
// ==========================================
function generateAIRole(category: string, idea: string): string {
    const lowerIdea = idea.toLowerCase();
    let aiTasks = '';

    if (category === 'Education' || lowerIdea.includes('quiz') || lowerIdea.includes('kiểm tra') || lowerIdea.includes('học')) {
        aiTasks = `
1. **Tự động tạo câu hỏi:**
   - Giáo viên nhập chủ đề hoặc nội dung bài học
   - AI phân tích và tạo bộ câu hỏi trắc nghiệm/tự luận
   - Giáo viên xác nhận hoặc chỉnh sửa

2. **Tạo nhận xét tự động:**
   - Dựa vào kết quả làm bài, AI tạo nhận xét chi tiết cho từng học sinh
   - VD: "Em đã làm tốt phần lý thuyết, cần cải thiện phần bài tập áp dụng."

3. **Gợi ý ôn tập thông minh:**
   - AI phân tích lịch sử làm bài và đề xuất các câu hỏi/chủ đề cần ôn tập
   - Ưu tiên những phần thường xuyên sai

4. **Giải thích đáp án:**
   - Khi học sinh chọn sai, AI có thể giải thích tại sao đáp án đúng là gì
   - Cung cấp thêm kiến thức liên quan`;
    } else if (category === 'Management' || lowerIdea.includes('quản lý')) {
        aiTasks = `
1. **Tự động phân loại:**
   - Người dùng nhập mô tả sự kiện/dữ liệu
   - AI phân tích và gợi ý danh mục/phân loại phù hợp
   - Người dùng xác nhận hoặc chỉnh sửa

2. **Tạo nhận xét/báo cáo tự động:**
   - Dựa vào dữ liệu, AI tạo nhận xét chi tiết và tổng hợp
   - VD: "Kết quả tháng này tăng 15% so với tháng trước..."

3. **Gợi ý hành động:**
   - AI phân tích xu hướng và đề xuất các biện pháp can thiệp
   - VD: "Cần chú ý đến các mục có điểm thấp trong tuần qua"

4. **Phân tích xu hướng:**
   - AI đưa ra insight từ dữ liệu tổng hợp
   - VD: "Phát hiện xu hướng tăng/giảm trong giai đoạn..."

5. **Trả lời câu hỏi:**
   - Chatbot hỗ trợ tra cứu nhanh
   - VD: "Những mục nào cần quan tâm tuần này?"`;
    } else {
        aiTasks = `
1. **Xử lý nội dung thông minh:**
   - AI phân tích và xử lý dữ liệu đầu vào
   - Tự động nhận diện format và chuyển đổi phù hợp

2. **Tạo nội dung tự động:**
   - Dựa vào input, AI tạo output theo yêu cầu
   - Có thể tùy chỉnh style/format

3. **Gợi ý và cải thiện:**
   - AI đề xuất các cải tiến cho nội dung
   - Kiểm tra lỗi và đưa ra gợi ý sửa`;
    }

    return `## VI. VAI TRÒ CỦA GEMINI AI

Gemini AI sẽ hỗ trợ các tác vụ sau:
${aiTasks}

### Cấu hình API:
\`\`\`javascript
// Gọi Gemini API
const API_KEY = localStorage.getItem('gemini_api_key');
const response = await fetch(
  \`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=\${API_KEY}\`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  }
);
\`\`\`
`;
}

// ==========================================
// PHẦN VIII: HƯỚNG DẪN SỬ DỤNG
// ==========================================
function generateUserGuide(): string {
    return `## VIII. YÊU CẦU VỀ HƯỚNG DẪN SỬ DỤNG

### 1. Màn hình Welcome (lần đầu sử dụng)
- Giới thiệu ngắn gọn về app (3-5 điểm chính)
- Hướng dẫn nhập Gemini API Key (có link lấy key: https://aistudio.google.com/apikey)
- Hướng dẫn import dữ liệu nếu có template
- Nút "Bắt đầu" để vào app

### 2. Tooltips & Hints
- Mỗi tính năng quan trọng có icon (?) hoặc (i) để xem hướng dẫn
- Hover/click hiển thị tooltip giải thích ngắn gọn
- First-time hints cho các nút quan trọng

### 3. Empty States
- Khi chưa có dữ liệu: Hiển thị hình ảnh + text hướng dẫn + nút thao tác
- VD: "Chưa có dữ liệu nào. Bấm 'Thêm mới' để bắt đầu."

### 4. FAQ Section (trong footer hoặc modal Help)
- "Làm sao để import danh sách từ Excel?"
- "Dữ liệu có bị mất khi đóng trình duyệt không?"
- "Làm sao để backup/restore dữ liệu?"
- "API Key là gì và lấy ở đâu?"
`;
}

// ==========================================
// PHẦN IX: XỬ LÝ TRƯỜNG HỢP ĐẶC BIỆT
// ==========================================
function generateEdgeCases(): string {
    return `## IX. XỬ LÝ TRƯỜNG HỢP ĐẶC BIỆT

### 1. Dữ liệu trống
- Hiển thị empty state thân thiện với icon minh họa
- Có nút CTA rõ ràng (VD: "Thêm dữ liệu đầu tiên")
- Gợi ý import từ template có sẵn

### 2. API Key không hợp lệ
- Thông báo lỗi rõ ràng, không technical
- Có link đến hướng dẫn lấy API Key
- Cho phép tiếp tục sử dụng app không có tính năng AI

### 3. Dữ liệu quá lớn (>1000 items)
- Cảnh báo có thể ảnh hưởng hiệu suất
- Đề xuất xuất dữ liệu cũ ra file và reset
- Áp dụng phân trang và lazy loading

### 4. Xung đột dữ liệu
- Cảnh báo khi mở app trên nhiều tab
- Tự động refresh khi detect thay đổi từ tab khác (storage event)

### 5. Mất kết nối mạng
- Thông báo khi mất kết nối (offline mode)
- Các tính năng không cần AI vẫn hoạt động
- Queue các request AI để gửi lại khi có mạng

### 6. Backup & Restore
- Nút "Xuất dữ liệu" tạo file JSON backup
- Nút "Nhập dữ liệu" khôi phục từ backup
- Cảnh báo trước khi ghi đè dữ liệu hiện tại
- Tự động backup định kỳ vào LocalStorage với key riêng
`;
}

// ==========================================
// FUNCTION: TẠO PROMPT LỆNH HOÀN CHỈNH
// Kết hợp ý tưởng + các gợi ý chuyên sâu đã chọn
// ==========================================
interface PromptCommandInput {
    idea: string;                    // Nội dung khung ý tưởng
    selectedFunctions: string[];     // Chức năng đã chọn
    selectedTargetUsers: string[];   // Đối tượng sử dụng đã chọn
    selectedGoals: string[];         // Mục tiêu đã chọn
    selectedExpectedResults: string[]; // Kết quả mong muốn đã chọn
    customRequirements: string[];    // Yêu cầu riêng
}

export function generatePromptCommand(input: PromptCommandInput): {
    promptCommand: string;
    category: string;
    title: string
} {
    const { category, config } = detectCategory(input.idea);
    const title = generateTitle(input.idea, category, config);

    // Tạo prompt lệnh hoàn chỉnh
    let promptCommand = `# 🚀 YÊU CẦU TẠO ỨNG DỤNG WEB

## 📝 MÔ TẢ Ý TƯỞNG
${input.idea}

---
`;

    // Thêm các chức năng đã chọn
    if (input.selectedFunctions.length > 0) {
        promptCommand += `## ⚡ CHỨC NĂNG YÊU CẦU
${input.selectedFunctions.map(f => `- ✅ ${f}`).join('\n')}

---
`;
    }

    // Thêm đối tượng sử dụng
    if (input.selectedTargetUsers.length > 0) {
        promptCommand += `## 👥 ĐỐI TƯỢNG SỬ DỤNG
${input.selectedTargetUsers.map(u => `- 👤 ${u}`).join('\n')}

---
`;
    }

    // Thêm mục tiêu
    if (input.selectedGoals.length > 0) {
        promptCommand += `## 🎯 MỤC TIÊU ỨNG DỤNG
${input.selectedGoals.map(g => `- 🎯 ${g}`).join('\n')}

---
`;
    }

    // Thêm kết quả mong muốn
    if (input.selectedExpectedResults.length > 0) {
        promptCommand += `## 🏆 KẾT QUẢ MONG MUỐN
${input.selectedExpectedResults.map(r => `- 🏆 ${r}`).join('\n')}

---
`;
    }

    // Thêm yêu cầu riêng
    if (input.customRequirements.length > 0) {
        promptCommand += `## ⭐ YÊU CẦU RIÊNG
${input.customRequirements.map(r => `- ⭐ ${r}`).join('\n')}

---
`;
    }

    // Thêm yêu cầu kỹ thuật chung
    promptCommand += `## 🛠️ YÊU CẦU KỸ THUẬT

### Công nghệ bắt buộc:
- **HTML5/CSS3/JavaScript ES6+**
- **Gemini AI API:** Tích hợp Gemini API cho các tính năng AI thông minh
- **Responsive Design:** Hiển thị tốt trên mọi thiết bị
- **LocalStorage:** Lưu trữ dữ liệu và API Key
- **Font tiếng Việt:** Sử dụng 'Be Vietnam Pro' (Google Fonts)
- **Icons:** FontAwesome 6

### Tích hợp Gemini AI:
\`\`\`javascript
// Gọi Gemini API
const API_KEY = localStorage.getItem('gemini_api_key');
const response = await fetch(
  \`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=\${API_KEY}\`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  }
);
\`\`\`

### Thư viện CDN khuyến nghị:
${category === 'Education' || input.idea.toLowerCase().includes('toán') ? '- **MathJax 3:** Hiển thị công thức Toán\n' : ''}${category === 'Management' || input.idea.toLowerCase().includes('thống kê') ? '- **Chart.js:** Biểu đồ thống kê\n' : ''}- **Canvas Confetti:** Hiệu ứng chúc mừng
- **SheetJS (xlsx):** Import/Export Excel (nếu cần)
- **Marked.js:** Parse markdown response từ AI

---

## 🎨 YÊU CẦU GIAO DIỆN

### Phong cách thiết kế:
- **Style:** Modern, Clean, tối giản nhưng cuốn hút
- **Màu sắc chủ đạo:** Gradient đẹp mắt (${config.colors.primary} → ${config.colors.secondary})
- **Bo góc:** Border-radius 12px-16px
- **Shadow:** Subtle shadows cho depth
- **Animation:** Smooth transitions, micro-interactions

### Components:
- **API Key Input:** Form nhập/lưu Gemini API Key
- **Chat/Input Area:** Khu vực nhập liệu và hiển thị response từ AI
- **Loading Indicator:** Spinner/skeleton khi đang gọi AI
- **Buttons:** Gradient hoặc Solid, hover effects
- **Cards:** Modern cards với shadow
- **Feedback:** Toast notifications cho các hành động

---

## 📋 OUTPUT BẮT BUỘC

Tạo ra **ứng dụng web tích hợp Gemini AI** với các yêu cầu:
- [ ] Cho phép người dùng nhập và lưu API Key (LocalStorage)
- [ ] Tích hợp Gemini API để xử lý các tác vụ AI thông minh
- [ ] Xử lý lỗi API (hiển thị thông báo thân thiện)
- [ ] Loading states khi đang xử lý AI
- [ ] Dữ liệu mẫu (Demo data) để test ngay
- [ ] Comments giải thích bằng tiếng Việt
- [ ] Responsive trên mobile/tablet/desktop

---

## 🚀 BẮT ĐẦU TẠO APP!

Hãy tạo app "${title}" với tất cả các tính năng và yêu cầu trên. App phải tích hợp Gemini AI và chạy được ngay khi mở file HTML trong trình duyệt.
`;

    return {
        promptCommand,
        category,
        title
    };
}

export type { PromptCommandInput };

// Tạo HTML Template thông minh
function generateSmartHTMLTemplate(idea: string, category: string, config: typeof categoryConfig['Education'], _smartFeatures: string[]): string {
    const title = generateCreativeTitle(idea, category, config);
    const cdnLibraries = selectCDNLibraries(idea, category);

    return `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.icon} ${title}</title>
    
    ${cdnLibraries}
    
    <style>
        /* ========== CSS RESET ========== */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        /* ========== BIẾN CSS ========== */
        :root {
            --primary: ${config.colors.primary};
            --secondary: ${config.colors.secondary};
            --gradient: ${config.colors.gradient};
            --success: #10b981;
            --warning: #f59e0b;
            --danger: #ef4444;
            --dark: #1e293b;
            --light: #f8fafc;
            --shadow: 0 10px 40px rgba(0,0,0,0.12);
            --radius: 16px;
        }
        
        /* ========== GLOBAL ========== */
        body {
            font-family: 'Be Vietnam Pro', sans-serif;
            background: var(--gradient);
            min-height: 100vh;
            color: var(--dark);
            line-height: 1.6;
        }
        
        /* ========== CONTAINER ========== */
        .container {
            max-width: 1000px;
            margin: 0 auto;
            padding: 20px;
        }
        
        /* ========== CARD ========== */
        .card {
            background: white;
            border-radius: var(--radius);
            padding: 30px;
            box-shadow: var(--shadow);
            animation: fadeIn 0.5s ease;
        }
        
        /* ========== BUTTONS ========== */
        .btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 14px 28px;
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            font-family: inherit;
        }
        
        .btn-primary {
            background: var(--gradient);
            color: white;
        }
        
        .btn-primary:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.2);
        }
        
        .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        
        /* ========== ANIMATIONS ========== */
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        
        /* ========== RESPONSIVE ========== */
        @media (max-width: 768px) {
            .container { padding: 15px; }
            .card { padding: 20px; }
            .btn { padding: 12px 20px; font-size: 14px; }
        }
        
        /* AI_CUSTOM_CSS_HERE - Thêm CSS tùy chỉnh */
    </style>
</head>
<body>
    <div id="app" class="container">
        <!-- ========== SCREEN 1: START ========== -->
        <div id="screen-start" class="screen active">
            <div class="card">
                <h1><i class="fas fa-rocket"></i> ${title}</h1>
                <p>Mô tả ngắn về ứng dụng...</p>
                
                <!-- AI_GENERATED_START_CONTENT -->
                
                <button id="btn-start" class="btn btn-primary">
                    <i class="fas fa-play"></i> Bắt đầu
                </button>
            </div>
        </div>
        
        <!-- ========== SCREEN 2: MAIN ========== -->
        <div id="screen-main" class="screen">
            <div class="card">
                <!-- AI_GENERATED_MAIN_CONTENT -->
            </div>
        </div>
        
        <!-- ========== SCREEN 3: RESULT ========== -->
        <div id="screen-result" class="screen">
            <div class="card">
                <!-- AI_GENERATED_RESULT_CONTENT -->
                
                <button id="btn-restart" class="btn btn-primary">
                    <i class="fas fa-redo"></i> Làm lại
                </button>
            </div>
        </div>
    </div>
    
    <script>
        // ============ CẤU HÌNH ============
        const CONFIG = {
            // AI_FILL_CONFIG
        };
        
        // ============ DỮ LIỆU ============
        const appData = {
            // AI_FILL_DATA - AI điền dữ liệu từ input của người dùng
        };
        
        // ============ STATE ============
        let state = {
            currentScreen: 'screen-start',
            // AI_FILL_STATE
        };
        
        // ============ UTILITY FUNCTIONS ============
        const $ = (sel) => document.querySelector(sel);
        const $$ = (sel) => document.querySelectorAll(sel);
        
        function showScreen(id) {
            $$('.screen').forEach(s => s.classList.remove('active'));
            $('#' + id).classList.add('active');
            state.currentScreen = id;
        }
        
        function saveData(key, data) {
            localStorage.setItem(key, JSON.stringify(data));
        }
        
        function loadData(key) {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        }
        
        function showToast(msg, type = 'info') {
            // AI implement toast notification
        }
        
        // ============ MAIN LOGIC ============
        function init() {
            console.log('🚀 App initialized!');
            // AI_INIT_CODE
        }
        
        function start() {
            showScreen('screen-main');
            // AI_START_CODE
        }
        
        function showResult() {
            showScreen('screen-result');
            // AI_RESULT_CODE
        }
        
        function restart() {
            showScreen('screen-start');
            // AI_RESTART_CODE
        }
        
        // ============ EVENT LISTENERS ============
        document.addEventListener('DOMContentLoaded', init);
        $('#btn-start')?.addEventListener('click', start);
        $('#btn-restart')?.addEventListener('click', restart);
        
        // AI_EVENT_LISTENERS
    </script>
</body>
</html>`;
}

// Tạo tiêu đề cho app
function generateTitle(idea: string, category: string, config: typeof categoryConfig['Education']): string {
    const shortIdea = idea.slice(0, 50);
    return `${config.icon} App ${shortIdea}${idea.length > 50 ? '...' : ''}`;
}

// Hàm gọi Gemini API
async function callGeminiAPI(
    prompt: string,
    apiKey: string,
    model: string
): Promise<string> {
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 8192,
                }
            })
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
        const errorCode = errorData.error?.status || response.status;
        throw new Error(`${errorCode}: ${errorMessage}`);
    }

    const data = await response.json();

    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
        throw new Error('Không nhận được phản hồi từ API');
    }

    return data.candidates[0].content.parts[0].text;
}

// Hàm gọi Vision API với cơ chế fallback (cho phân tích ảnh)
async function callWithFallbackForVision(
    imageBase64: string,
    mimeType: string,
    prompt: string,
    apiKey: string,
    preferredModel: string
): Promise<string> {
    const models = [preferredModel, ...AI_MODELS.filter(m => m !== preferredModel)];
    let lastError: Error | null = null;

    for (const model of models) {
        try {
            console.log(`Trying Vision API with model: ${model}`);

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: prompt },
                                { inline_data: { mime_type: mimeType, data: imageBase64 } }
                            ]
                        }],
                        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
                    })
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMsg = errorData.error?.message || `HTTP ${response.status}`;
                throw new Error(errorMsg);
            }

            const data = await response.json();
            if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
                throw new Error('Không nhận được phản hồi từ API');
            }

            console.log(`Vision API success with model: ${model}`);
            return data.candidates[0].content.parts[0].text.trim();
        } catch (error) {
            lastError = error as Error;
            console.warn(`Vision API with model ${model} failed:`, error);
            // Tiếp tục thử model tiếp theo
        }
    }

    throw new Error(`Lỗi API: ${lastError?.message || 'Tất cả các model đều thất bại'}. Vui lòng kiểm tra API key hoặc thử lại sau.`);
}

// Hàm gọi API với cơ chế fallback
async function callWithFallback(
    prompt: string,
    apiKey: string,
    preferredModel: string,
    onProgress?: ProgressCallback,
    stepInfo?: { step: number; totalSteps: number }
): Promise<string> {
    const models = [preferredModel, ...AI_MODELS.filter(m => m !== preferredModel)];

    let lastError: Error | null = null;

    for (const model of models) {
        try {
            onProgress?.({
                step: stepInfo?.step || 1,
                totalSteps: stepInfo?.totalSteps || 1,
                currentModel: model,
                status: 'running',
                message: `Đang xử lý với ${model}...`
            });

            const result = await callGeminiAPI(prompt, apiKey, model);

            onProgress?.({
                step: stepInfo?.step || 1,
                totalSteps: stepInfo?.totalSteps || 1,
                currentModel: model,
                status: 'success',
                message: `Hoàn tất với ${model}`
            });

            return result;
        } catch (error) {
            lastError = error as Error;
            console.warn(`Model ${model} failed:`, error);

            onProgress?.({
                step: stepInfo?.step || 1,
                totalSteps: stepInfo?.totalSteps || 1,
                currentModel: model,
                status: 'error',
                message: `Lỗi với ${model}, đang thử model khác...`,
                error: lastError.message
            });
        }
    }

    onProgress?.({
        step: stepInfo?.step || 1,
        totalSteps: stepInfo?.totalSteps || 1,
        currentModel: '',
        status: 'stopped',
        message: 'Đã dừng do lỗi',
        error: lastError?.message || 'Tất cả các model đều thất bại'
    });

    throw new Error(lastError?.message || 'Tất cả các model AI đều thất bại');
}

// Hàm chính để generate instruction
export async function generateInstruction(
    idea: string,
    apiKey?: string,
    preferredModel?: string,
    onProgress?: ProgressCallback
): Promise<GeneratedResult> {
    const { category, config } = detectCategory(idea);
    const title = generateTitle(idea, category, config);
    const features = extractFeatures(idea, category);

    // Luôn sử dụng local generation với logic nâng cao
    const systemInstruction = generateSystemInstruction(idea, category, config);
    const htmlTemplate = generateHTMLTemplate(idea, category, config, features);

    // Nếu có API key, có thể enhance với AI
    if (apiKey) {
        const model = preferredModel || AI_MODELS[0];

        try {
            onProgress?.({
                step: 1,
                totalSteps: 2,
                currentModel: model,
                status: 'running',
                message: 'Đang tạo System Instruction với AI...'
            });

            // Enhance system instruction với AI
            const enhancePrompt = `Dựa trên System Instruction sau, hãy cải thiện và hoàn thiện nó để chi tiết hơn, chuyên nghiệp hơn:

${systemInstruction}

Yêu cầu:
1. Giữ nguyên cấu trúc nhưng thêm chi tiết
2. Thêm các edge cases cần xử lý
3. Cải thiện phần UI/UX guidelines
4. Đảm bảo instructions rõ ràng cho AI

Trả về System Instruction đã cải thiện:`;

            const enhancedInstruction = await callWithFallback(
                enhancePrompt,
                apiKey,
                model,
                onProgress,
                { step: 1, totalSteps: 2 }
            );

            onProgress?.({
                step: 2,
                totalSteps: 2,
                currentModel: model,
                status: 'success',
                message: 'Hoàn tất!'
            });

            return {
                category,
                title,
                systemInstruction: enhancedInstruction,
                htmlTemplate
            };

        } catch (error) {
            // Fallback to local generation if AI fails
            console.warn('AI enhancement failed, using local generation:', error);
        }
    }

    // Simulate processing delay for better UX
    onProgress?.({
        step: 1,
        totalSteps: 1,
        currentModel: 'Local Generator',
        status: 'running',
        message: 'Đang phân tích và tạo prompt...'
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    onProgress?.({
        step: 1,
        totalSteps: 1,
        currentModel: 'Local Generator',
        status: 'success',
        message: 'Hoàn tất!'
    });

    return {
        category,
        title,
        systemInstruction,
        htmlTemplate
    };
}

// ==========================================
// HOÀN THIỆN Ý TƯỞNG VỚI AI
// ==========================================
interface EnhancedIdea {
    originalIdea: string;
    enhancedIdea: string;
    summary: string;
}

interface AISuggestionsResult {
    functions: string[];
    targetUsers: string[];
    goals: string[];
    expectedResults: string[];
}

// Hoàn thiện ý tưởng với AI
export async function enhanceIdeaWithAI(
    idea: string,
    apiKey: string,
    preferredModel?: string,
    onProgress?: ProgressCallback
): Promise<EnhancedIdea> {
    const model = preferredModel || AI_MODELS[0];

    const prompt = `Bạn là chuyên gia hoàn thiện ý tưởng ứng dụng. Hãy đọc ý tưởng ban đầu và hoàn thiện thành mô tả chi tiết, rõ ràng hơn.

Ý tưởng ban đầu: "${idea}"

YÊU CẦU:
1. Giữ nguyên ý nghĩa ban đầu
2. Thêm chi tiết cụ thể nếu thiếu
3. Làm rõ mục đích sử dụng
4. Viết ngắn gọn, súc tích (tối đa 2-3 câu)

Trả về JSON với format CHÍNH XÁC như sau (không có markdown):
{
    "enhancedIdea": "Mô tả ý tưởng đã hoàn thiện",
    "summary": "Tóm tắt ngắn 1 câu về app"
}`;

    try {
        onProgress?.({
            step: 1,
            totalSteps: 1,
            currentModel: model,
            status: 'running',
            message: 'Đang hoàn thiện ý tưởng với AI...'
        });

        const result = await callWithFallback(prompt, apiKey, model, onProgress, { step: 1, totalSteps: 1 });

        // Parse JSON từ kết quả
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                originalIdea: idea,
                enhancedIdea: parsed.enhancedIdea || idea,
                summary: parsed.summary || ''
            };
        }

        return {
            originalIdea: idea,
            enhancedIdea: idea,
            summary: ''
        };
    } catch (error) {
        console.error('Error enhancing idea:', error);
        throw error;
    }
}

// Lấy gợi ý AI chuyên sâu
export async function getAISuggestions(
    idea: string,
    apiKey: string,
    preferredModel?: string,
    onProgress?: ProgressCallback
): Promise<AISuggestionsResult> {
    const model = preferredModel || AI_MODELS[0];

    const prompt = `Bạn là chuyên gia phân tích yêu cầu ứng dụng. Dựa trên ý tưởng sau, hãy phân tích và đưa ra gợi ý chi tiết.

Ý tưởng: "${idea}"

Hãy phân tích và trả về JSON với format CHÍNH XÁC (không có markdown):
{
    "functions": ["Chức năng 1", "Chức năng 2", "Chức năng 3", "Chức năng 4", "Chức năng 5"],
    "targetUsers": ["Đối tượng 1", "Đối tượng 2", "Đối tượng 3"],
    "goals": ["Mục tiêu 1", "Mục tiêu 2", "Mục tiêu 3"],
    "expectedResults": ["Kết quả 1", "Kết quả 2", "Kết quả 3"]
}

YÊU CẦU:
1. functions: 5-8 chức năng PHÙ HỢP và CỤ THỂ cho ý tưởng này
2. targetUsers: 2-4 đối tượng sử dụng chính
3. goals: 3-5 mục tiêu chính của ứng dụng
4. expectedResults: 3-5 kết quả mong muốn đạt được khi sử dụng app
5. Mỗi item là câu ngắn gọn, dễ hiểu
6. Phù hợp với ngữ cảnh Việt Nam`;

    try {
        onProgress?.({
            step: 1,
            totalSteps: 1,
            currentModel: model,
            status: 'running',
            message: 'Đang phân tích gợi ý với AI...'
        });

        const result = await callWithFallback(prompt, apiKey, model, onProgress, { step: 1, totalSteps: 1 });

        // Parse JSON từ kết quả
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                functions: parsed.functions || [],
                targetUsers: parsed.targetUsers || [],
                goals: parsed.goals || [],
                expectedResults: parsed.expectedResults || []
            };
        }

        return {
            functions: [],
            targetUsers: [],
            goals: [],
            expectedResults: []
        };
    } catch (error) {
        console.error('Error getting AI suggestions:', error);
        throw error;
    }
}

// ==========================================
// PHÂN TÍCH ẢNH VỚI GEMINI VISION API
// ==========================================
export async function analyzeImageWithAI(
    imageBase64: string,
    mimeType: string,
    apiKey: string,
    preferredModel?: string
): Promise<string> {
    const model = preferredModel || AI_MODELS[0];

    const prompt = `Bạn là chuyên gia phân tích ứng dụng và giao diện người dùng. Hãy phân tích ảnh chụp màn hình này và tạo một MÔ TẢ Ý TƯỞNG ỨNG DỤNG chi tiết.

NHIỆM VỤ:
1. Quan sát kỹ giao diện trong ảnh
2. Xác định loại ứng dụng (giáo dục, quản lý, game, công cụ, tài chính...)
3. Liệt kê các tính năng chính có thể thấy
4. Mô tả đối tượng sử dụng phù hợp
5. Đề xuất các tính năng bổ sung hữu ích

FORMAT TRẢ VỀ (viết thành đoạn văn mô tả ý tưởng hoàn chỉnh):
"Ứng dụng [TÊN LOẠI APP] dành cho [ĐỐI TƯỢNG]. Các tính năng chính bao gồm: [LIỆT KÊ TÍNH NĂNG]. Giao diện cần có: [MÔ TẢ UI]. Yêu cầu đặc biệt: [NẾU CÓ]."

CHÚ Ý:
- Viết bằng tiếng Việt
- Ngắn gọn nhưng đầy đủ (2-4 câu)
- Tập trung vào tính năng thực tế nhìn thấy trong ảnh
- Không cần giải thích, chỉ trả về mô tả ý tưởng`;

    // Sử dụng hàm fallback để tự động thử các model khác nếu gặp lỗi
    return await callWithFallbackForVision(imageBase64, mimeType, prompt, apiKey, model);
}

// Export
export { AI_MODELS };
export type { GeneratedResult, GenerationProgress, ProgressCallback, EnhancedIdea, AISuggestionsResult };

