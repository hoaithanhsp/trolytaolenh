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

    // ===== TẠO CÁC PHẦN NỘI DUNG THEO CẤU TRÚC 17 PHẦN =====
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

    // VI. VAI TRÒ CỦA GEMINI AI
    const aiRole = generateAIRole(category, cleanIdea);

    // VII. YÊU CẦU OUTPUT
    const outputChecklist = generateOutputChecklist();

    // VIII. HƯỚNG DẪN SỬ DỤNG
    const userGuide = generateUserGuide();

    // IX. XỬ LÝ TRƯỜNG HỢP ĐẶC BIỆT
    const edgeCases = generateEdgeCases();

    // X. KIẾN TRÚC ỨNG DỤNG CHI TIẾT
    const architecture = generateArchitecture(category, cleanIdea);

    // XI. THIẾT KẾ GIAO DIỆN CỤ THỂ
    const uiDesignSpec = generateUIDesignSpec(category, config, features);

    // XII. LOGIC NGHIỆP VỤ CHI TIẾT
    const businessLogic = generateBusinessLogic(category, cleanIdea, features);

    // XIII. XỬ LÝ DỮ LIỆU CHI TIẾT
    const dataHandling = generateDataHandling(category);

    // XIV. TÍNH NĂNG GEMINI AI CỤ THỂ
    const geminiAIDetails = generateGeminiAIDetails(category, cleanIdea);

    // XV. CODE EXAMPLES
    const codeExamples = generateCodeExamples(category);

    // XVI. HƯỚNG DẪN TRIỂN KHAI
    const deploymentGuide = generateDeploymentGuide();

    // XVII. TÍNH NĂNG BẢO MẬT
    const securityRequirements = generateSecurityRequirements();

    // XVIII. QUY TẮC PHÁT TRIỂN & VẬN HÀNH
    const aiInstructions = generateAIInstructions();

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
---
${architecture}
---
${uiDesignSpec}
---
${businessLogic}
---
${dataHandling}
---
${geminiAIDetails}
---
${codeExamples}
---
${deploymentGuide}
---
${securityRequirements}
---
${aiInstructions}

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
// PHẦN XVIII: QUY TẮC PHÁT TRIỂN & VẬN HÀNH
// ==========================================
function generateAIInstructions(): string {
    return `## XVIII. QUY TẮC PHÁT TRIỂN & VẬN HÀNH

### 1. Cấu hình Model AI & Cơ chế Fallback
- **Model mặc định**: \`gemini-3-flash-preview\`
- **Model dự phòng**: Tự động chuyển đổi nếu model hiện tại gặp lỗi/quá tải:
  1. \`gemini-3-flash-preview\`
  2. \`gemini-3-pro-preview\`
  3. \`gemini-2.5-flash\`
- **Cơ chế Retry**:
  - Nếu gặp lỗi API, hệ thống **tự động** thử lại với model tiếp theo trong danh sách.
  - Giữ nguyên kết quả các bước trước đó, chỉ retry bước đang lỗi.

### 2. Quản lý API Key
- Người dùng nhập API key vào Modal hoặc qua nút Settings trên Header.
- Lưu vào \`localStorage\` của trình duyệt.
- **Giao diện API Key:**
  - Hiển thị danh sách chọn Model AI (dạng thẻ/Cards).
  - Thứ tự: \`gemini-3-flash-preview\` (Default), \`gemini-3-pro-preview\`, \`gemini-2.5-flash\`.
  - Nút **Settings (API Key)** kèm dòng chữ màu đỏ "Lấy API key để sử dụng app" luôn hiển thị trên Header.
  - Khi chưa có key, hiển thị Modal bắt buộc nhập.
  - Hướng dẫn người dùng vào https://aistudio.google.com/api-keys để lấy key.
  - Link hướng dẫn chi tiết: https://tinyurl.com/hdsdpmTHT

### 3. Quản lý Trạng thái & Lỗi
- Nếu tất cả model đều thất bại → Hiện thông báo lỗi màu đỏ, hiển thị nguyên văn lỗi từ API (VD: \`429 RESOURCE_EXHAUSTED\`).
- Trạng thái các cột đang chờ phải chuyển thành **"Đã dừng do lỗi"**, không được hiện "Hoàn tất" nếu quy trình bị gián đoạn.
- Progress bar chỉ hiển thị trạng thái hoàn thành (xanh) khi bước đó thực sự thành công.

### 4. Triển khai (Deployment)
- **Nền tảng**: Vercel.
- **File bắt buộc**: \`vercel.json\` ở root:
\`\`\`json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
\`\`\`
`;
}

// ==========================================
// PHẦN X: KIẾN TRÚC ỨNG DỤNG CHI TIẾT
// ==========================================
function generateArchitecture(category: string, _idea: string): string {
    let dataSchema = '';
    let dataFlow = '';

    if (category === 'Education') {
        dataSchema = `
// Schema chính
const AppSchema = {
  users: [{ id, name, class, role, avatar, createdAt }],
  subjects: [{ id, name, icon, color }],
  questions: [{ id, subjectId, content, type, options, correctAnswer, explanation, difficulty, tags }],
  examSessions: [{ id, userId, subjectId, questions, answers, score, startTime, endTime }],
  progress: [{ userId, subjectId, totalAttempts, correctCount, averageScore, lastAttempt }],
  settings: { theme, fontSize, soundEnabled, autoSave, language }
};`;
        dataFlow = `Người dùng nhập liệu → Validate Input → Lưu LocalStorage → Render UI → AI xử lý (nếu cần) → Cập nhật State → Re-render`;
    } else if (category === 'Management') {
        dataSchema = `
// Schema chính
const AppSchema = {
  records: [{ id, category, title, description, status, priority, createdAt, updatedAt, metadata }],
  categories: [{ id, name, icon, color, parentId }],
  users: [{ id, name, role, permissions }],
  logs: [{ id, action, recordId, userId, timestamp, details }],
  reports: [{ id, type, dateRange, data, generatedAt }],
  settings: { theme, dateFormat, currency, language, notifications }
};`;
        dataFlow = `Nhập dữ liệu → Validate → CRUD Operations → Lưu LocalStorage → Cập nhật Dashboard → AI phân tích (nếu cần) → Xuất báo cáo`;
    } else if (category === 'Game') {
        dataSchema = `
// Schema chính
const AppSchema = {
  player: { name, avatar, level, experience, achievements },
  gameState: { currentLevel, score, lives, timeRemaining, isPaused },
  levels: [{ id, name, difficulty, data, unlocked, bestScore }],
  leaderboard: [{ playerName, score, level, timestamp }],
  settings: { soundEnabled, musicVolume, difficulty, theme }
};`;
        dataFlow = `Start Game → Load Level → Game Loop (Input → Update State → Render) → Check Win/Lose → Save Score → Leaderboard`;
    } else {
        dataSchema = `
// Schema chính  
const AppSchema = {
  items: [{ id, type, content, metadata, createdAt, updatedAt }],
  history: [{ id, action, itemId, timestamp, result }],
  favorites: [{ itemId, addedAt }],
  settings: { theme, language, autoSave, preferences }
};`;
        dataFlow = `Input dữ liệu → Validate → Xử lý/Chuyển đổi → Preview kết quả → Export/Download`;
    }

    return `## X. KIẾN TRÚC ỨNG DỤNG CHI TIẾT

### 1. Cấu trúc thư mục
\`\`\`
📁 project/
├── 📄 index.html          # Giao diện chính (Single Page)
├── 📄 style.css            # Stylesheet riêng (nếu tách)
├── 📄 app.js               # Logic chính + Gemini API
├── 📄 data.js              # Dữ liệu mẫu / Constants
└── 📄 README.md            # Hướng dẫn sử dụng
\`\`\`

### 2. Luồng dữ liệu (Data Flow)
\`\`\`
${dataFlow}
\`\`\`

### 3. Mô hình dữ liệu (Data Schema)
\`\`\`javascript
${dataSchema}
\`\`\`
`;
}

// ==========================================
// PHẦN XI: THIẾT KẾ GIAO DIỆN CỤ THỂ
// ==========================================
function generateUIDesignSpec(category: string, config: typeof categoryConfig['Education'], _features: { explicit: string[] }): string {
    let screens = '';

    if (category === 'Education') {
        screens = `
#### Màn hình 1: Trang chủ / Dashboard
- **Header:** Logo + Tên app + Nút Settings (⚙️)
- **Body:** Grid cards hiển thị các môn học/chủ đề, mỗi card có icon + tên + số câu hỏi + progress bar
- **Sidebar (Desktop):** Menu navigation + User info
- **Footer:** Copyright + Version

#### Màn hình 2: Làm bài / Tương tác chính
- **Top bar:** Timer đếm ngược + Số câu hiện tại/tổng + Nút thoát
- **Center:** Card câu hỏi lớn + Các lựa chọn (A/B/C/D)
- **Bottom:** Nút Previous/Next + Progress bar

#### Màn hình 3: Kết quả
- **Score card:** Điểm lớn ở giữa + Animation chúc mừng
- **Chi tiết:** Danh sách câu đúng/sai + Giải thích
- **Actions:** Nút Làm lại + Xem đáp án + Chia sẻ`;
    } else if (category === 'Management') {
        screens = `
#### Màn hình 1: Dashboard
- **Header:** Logo + Search bar + User avatar + Notifications bell
- **Stats row:** 4 cards thống kê nhanh (Tổng, Mới, Hoàn thành, Cần xử lý)
- **Charts:** 1-2 biểu đồ (Bar/Line/Pie) hiển thị xu hướng
- **Recent:** Bảng dữ liệu gần đây (5-10 items)

#### Màn hình 2: Danh sách & CRUD
- **Toolbar:** Search + Filter dropdowns + Nút Thêm mới + Export
- **Table/Cards:** Hiển thị data dạng bảng (desktop) hoặc cards (mobile)
- **Pagination:** Phân trang hoặc infinite scroll
- **Modal Form:** Form thêm/sửa với validation realtime

#### Màn hình 3: Báo cáo & Xuất dữ liệu
- **Filter bar:** Chọn khoảng thời gian + Loại báo cáo
- **Preview:** Xem trước báo cáo
- **Export buttons:** Excel, PDF, Print`;
    } else {
        screens = `
#### Màn hình 1: Input / Upload
- **Header:** Logo + Tên app + Hướng dẫn ngắn
- **Input area:** Textarea lớn hoặc Drag & Drop zone
- **Options:** Các tùy chọn xử lý (dropdowns, checkboxes)
- **Action button:** Nút "Xử lý" / "Chuyển đổi" nổi bật

#### Màn hình 2: Kết quả / Output
- **Preview:** Hiển thị kết quả real-time
- **Actions:** Copy, Download, Share
- **History:** Lịch sử các lần xử lý gần đây`;
    }

    return `## XI. THIẾT KẾ GIAO DIỆN CỤ THỂ

### 1. Wireframe từng màn hình
${screens}

### 2. User Flow (Luồng sử dụng)
\`\`\`
Mở app → [Lần đầu?] → Nhập API Key → Welcome Screen
                    → [Đã có key?] → Dashboard/Trang chủ
→ Chọn chức năng → Thực hiện tác vụ → Xem kết quả
→ Lưu/Xuất dữ liệu → Quay lại Dashboard
\`\`\`

### 3. Responsive Breakpoints
| Thiết bị | Width | Layout |
|----------|-------|--------|
| Mobile | < 640px | Single column, Bottom nav |
| Tablet | 640-1024px | 2 columns, Side nav |
| Desktop | > 1024px | Full layout, Sidebar |

### 4. Bảng màu chi tiết
- **Primary:** ${config.colors.primary} (Buttons, Links, Active states)
- **Secondary:** ${config.colors.secondary} (Accents, Badges, Tags)
- **Background:** #f8fafc (Light) / #0f172a (Dark mode)
- **Text:** #1e293b (Primary) / #64748b (Secondary)
- **Success:** #10b981 | **Warning:** #f59e0b | **Error:** #ef4444
`;
}

// ==========================================
// PHẦN XII: LOGIC NGHIỆP VỤ CHI TIẾT
// ==========================================
function generateBusinessLogic(category: string, _idea: string, _features: { explicit: string[] }): string {
    let algorithms = '';

    if (category === 'Education') {
        algorithms = `
### Thuật toán chính

#### 1. Tính điểm thông minh
\`\`\`javascript
function calculateScore(answers, questions, timeSpent) {
  let baseScore = 0;
  answers.forEach((answer, index) => {
    if (answer === questions[index].correctAnswer) {
      baseScore += 10; // Điểm cơ bản
      // Bonus thời gian: trả lời nhanh được thêm điểm
      const timeBonus = Math.max(0, 5 - Math.floor(timeSpent[index] / 10));
      baseScore += timeBonus;
    }
  });
  return {
    score: baseScore,
    percentage: (baseScore / (questions.length * 15)) * 100,
    grade: baseScore >= 80 ? 'A' : baseScore >= 60 ? 'B' : baseScore >= 40 ? 'C' : 'D'
  };
}
\`\`\`

#### 2. Thuật toán xáo trộn câu hỏi (Fisher-Yates)
\`\`\`javascript
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
\`\`\`

#### 3. Theo dõi tiến độ học tập
\`\`\`javascript
function trackProgress(userId, subjectId, result) {
  const key = \\\`progress_\\\${userId}_\\\${subjectId}\\\`;
  const progress = loadData(key) || { attempts: 0, totalScore: 0, history: [] };
  progress.attempts++;
  progress.totalScore += result.score;
  progress.averageScore = progress.totalScore / progress.attempts;
  progress.history.push({ date: new Date().toISOString(), score: result.score });
  saveData(key, progress);
  return progress;
}
\`\`\``;
    } else if (category === 'Management') {
        algorithms = `
### Thuật toán chính

#### 1. Tìm kiếm và lọc dữ liệu
\`\`\`javascript
function searchAndFilter(data, { keyword, category, dateRange, status }) {
  return data.filter(item => {
    const matchKeyword = !keyword || 
      Object.values(item).some(v => String(v).toLowerCase().includes(keyword.toLowerCase()));
    const matchCategory = !category || item.category === category;
    const matchDate = !dateRange || 
      (new Date(item.createdAt) >= dateRange.start && new Date(item.createdAt) <= dateRange.end);
    const matchStatus = !status || item.status === status;
    return matchKeyword && matchCategory && matchDate && matchStatus;
  });
}
\`\`\`

#### 2. Tính toán thống kê Dashboard
\`\`\`javascript
function calculateStats(data) {
  const total = data.length;
  const today = data.filter(d => isToday(d.createdAt)).length;
  const completed = data.filter(d => d.status === 'completed').length;
  const pending = data.filter(d => d.status === 'pending').length;
  const trend = calculateTrend(data, 7); // So sánh 7 ngày
  return { total, today, completed, pending, trend, completionRate: (completed/total*100).toFixed(1) };
}
\`\`\`

#### 3. Sắp xếp đa tiêu chí
\`\`\`javascript
function multiSort(data, sortKeys) {
  return [...data].sort((a, b) => {
    for (const { key, direction } of sortKeys) {
      const cmp = String(a[key]).localeCompare(String(b[key]), 'vi');
      if (cmp !== 0) return direction === 'asc' ? cmp : -cmp;
    }
    return 0;
  });
}
\`\`\``;
    } else {
        algorithms = `
### Thuật toán chính

#### 1. Xử lý Input thông minh
\`\`\`javascript
function processInput(input, options) {
  // Detect loại input tự động
  const inputType = detectInputType(input); // text, json, csv, html
  // Validate
  const validation = validateInput(input, inputType);
  if (!validation.valid) return { error: validation.message };
  // Transform theo options
  const result = transform(input, inputType, options);
  return { success: true, data: result, inputType };
}
\`\`\`

#### 2. Quản lý lịch sử
\`\`\`javascript
function addToHistory(action, data) {
  const history = loadData('app_history') || [];
  history.unshift({ id: Date.now(), action, data, timestamp: new Date().toISOString() });
  if (history.length > 50) history.pop(); // Giới hạn 50 items
  saveData('app_history', history);
}
\`\`\``;
    }

    return `## XII. LOGIC NGHIỆP VỤ CHI TIẾT
${algorithms}

### Logic nhắc nhở thông minh
\`\`\`javascript
// Kiểm tra và hiện nhắc nhở khi cần
function checkReminders() {
  const lastVisit = loadData('last_visit');
  const now = Date.now();
  if (!lastVisit || (now - lastVisit) > 24 * 60 * 60 * 1000) {
    showToast('Chào mừng bạn quay lại! 👋', 'info');
  }
  saveData('last_visit', now);
}
\`\`\`
`;
}

// ==========================================
// PHẦN XIII: XỬ LÝ DỮ LIỆU CHI TIẾT
// ==========================================
function generateDataHandling(category: string): string {
    let storageKeys = '';
    if (category === 'Education') {
        storageKeys = `
| Key | Mô tả | Kiểu dữ liệu |
|-----|--------|---------------|
| \\\`app_questions\\\` | Ngân hàng câu hỏi | Array<Question> |
| \\\`app_history\\\` | Lịch sử làm bài | Array<Session> |
| \\\`app_progress\\\` | Tiến độ học tập | Object |
| \\\`app_settings\\\` | Cài đặt ứng dụng | Object |
| \\\`gemini_api_key\\\` | API Key Gemini | String |
| \\\`app_backup_auto\\\` | Backup tự động | JSON String |`;
    } else if (category === 'Management') {
        storageKeys = `
| Key | Mô tả | Kiểu dữ liệu |
|-----|--------|---------------|
| \\\`app_records\\\` | Dữ liệu chính | Array<Record> |
| \\\`app_categories\\\` | Danh mục | Array<Category> |
| \\\`app_logs\\\` | Nhật ký hoạt động | Array<Log> |
| \\\`app_settings\\\` | Cài đặt ứng dụng | Object |
| \\\`gemini_api_key\\\` | API Key Gemini | String |
| \\\`app_backup_auto\\\` | Backup tự động | JSON String |`;
    } else {
        storageKeys = `
| Key | Mô tả | Kiểu dữ liệu |
|-----|--------|---------------|
| \\\`app_data\\\` | Dữ liệu chính | Array/Object |
| \\\`app_history\\\` | Lịch sử thao tác | Array<HistoryItem> |
| \\\`app_favorites\\\` | Mục yêu thích | Array |
| \\\`app_settings\\\` | Cài đặt ứng dụng | Object |
| \\\`gemini_api_key\\\` | API Key Gemini | String |
| \\\`app_backup_auto\\\` | Backup tự động | JSON String |`;
    }

    return `## XIII. XỬ LÝ DỮ LIỆU CHI TIẾT

### 1. Cấu trúc LocalStorage
${storageKeys}

### 2. Chiến lược Backup/Restore
\`\`\`javascript
// Auto backup mỗi 5 phút
setInterval(() => {
  const allData = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('app_')) allData[key] = localStorage.getItem(key);
  }
  localStorage.setItem('app_backup_auto', JSON.stringify({ data: allData, timestamp: Date.now() }));
}, 5 * 60 * 1000);

// Export backup ra file JSON
function exportBackup() {
  const backup = { version: '1.0', exportedAt: new Date().toISOString(), data: {} };
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('app_')) backup.data[key] = JSON.parse(localStorage.getItem(key));
  }
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = \\\`backup_\\\${new Date().toISOString().slice(0,10)}.json\\\`; a.click();
}

// Import backup từ file
function importBackup(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const backup = JSON.parse(e.target.result);
    if (confirm('Ghi đè dữ liệu hiện tại?')) {
      Object.entries(backup.data).forEach(([key, value]) => {
        localStorage.setItem(key, JSON.stringify(value));
      });
      location.reload();
    }
  };
  reader.readAsText(file);
}
\`\`\`

### 3. Validation Rules
\`\`\`javascript
const validationRules = {
  required: (value) => value !== '' && value !== null && value !== undefined,
  minLength: (value, min) => String(value).length >= min,
  maxLength: (value, max) => String(value).length <= max,
  email: (value) => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value),
  number: (value) => !isNaN(Number(value)),
  phone: (value) => /^(0[0-9]{9,10})$/.test(value),
  date: (value) => !isNaN(Date.parse(value)),
  
  // Validate form
  validateForm(formData, rules) {
    const errors = {};
    for (const [field, fieldRules] of Object.entries(rules)) {
      for (const rule of fieldRules) {
        if (!this[rule.type](formData[field], rule.param)) {
          errors[field] = rule.message;
          break;
        }
      }
    }
    return { valid: Object.keys(errors).length === 0, errors };
  }
};
\`\`\`
`;
}

// ==========================================
// PHẦN XIV: TÍNH NĂNG GEMINI AI CỤ THỂ
// ==========================================
function generateGeminiAIDetails(category: string, _idea: string): string {
    let aiPrompts = '';

    if (category === 'Education') {
        aiPrompts = `
#### Prompt 1: Tạo câu hỏi tự động
\`\`\`javascript
const prompt = \\\`Bạn là giáo viên chuyên tạo đề kiểm tra.
Hãy tạo \\\${soLuong} câu hỏi trắc nghiệm về chủ đề "\\\${chuDe}" cho học sinh \\\${capHoc}.
Trả về JSON array:
[{"question": "...", "options": ["A...", "B...", "C...", "D..."], "correctAnswer": 0, "explanation": "..."}]
CHỈ trả về JSON, không thêm text khác.\\\`;
\`\`\`

#### Prompt 2: Nhận xét học sinh
\`\`\`javascript
const prompt = \\\`Dựa vào kết quả: Đúng \\\${correct}/\\\${total} câu, điểm \\\${score}.
Các câu sai: \\\${wrongTopics.join(', ')}.
Viết nhận xét ngắn gọn (3-4 câu) bằng tiếng Việt, khuyến khích và gợi ý cải thiện.\\\`;
\`\`\``;
    } else if (category === 'Management') {
        aiPrompts = `
#### Prompt 1: Phân tích dữ liệu
\`\`\`javascript
const prompt = \\\`Phân tích dữ liệu sau và đưa ra nhận xét:
\\\${JSON.stringify(data)}
Trả về JSON: {"summary": "...", "insights": ["..."], "recommendations": ["..."], "trend": "up|down|stable"}\\\`;
\`\`\`

#### Prompt 2: Tạo báo cáo tự động
\`\`\`javascript
const prompt = \\\`Dựa vào dữ liệu thống kê:
- Tổng: \\\${stats.total}, Hoàn thành: \\\${stats.completed}
- Xu hướng: \\\${stats.trend}
Viết báo cáo tổng hợp bằng tiếng Việt (5-7 câu), bao gồm nhận xét và đề xuất.\\\`;
\`\`\``;
    } else {
        aiPrompts = `
#### Prompt 1: Xử lý nội dung
\`\`\`javascript
const prompt = \\\`Xử lý nội dung sau theo yêu cầu "\\\${userRequest}":
\\\${inputContent}
Trả về kết quả đã xử lý. Giữ nguyên format nếu có thể.\\\`;
\`\`\`

#### Prompt 2: Gợi ý cải thiện  
\`\`\`javascript
const prompt = \\\`Phân tích nội dung sau và đề xuất 3-5 cải tiến:
\\\${content}
Trả về JSON: {"suggestions": [{"title": "...", "description": "...", "priority": "high|medium|low"}]}\\\`;
\`\`\``;
    }

    return `## XIV. TÍNH NĂNG GEMINI AI CỤ THỂ

### 1. Danh sách Prompts cho từng tính năng
${aiPrompts}

### 2. Cách parse response từ AI
\`\`\`javascript
async function callGeminiAI(prompt) {
  const API_KEY = localStorage.getItem('gemini_api_key');
  if (!API_KEY) { showToast('Vui lòng nhập API Key!', 'error'); return null; }
  
  try {
    const response = await fetch(
      \\\`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=\\\${API_KEY}\\\`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
        })
      }
    );
    
    if (response.status === 429) throw new Error('RATE_LIMIT');
    if (response.status === 401 || response.status === 403) throw new Error('INVALID_KEY');
    if (!response.ok) throw new Error('API_ERROR');
    
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Thử parse JSON nếu response chứa JSON
    const jsonMatch = text.match(/\\[\\s*\\{[\\s\\S]*\\}\\s*\\]|\\{[\\s\\S]*\\}/);
    if (jsonMatch) {
      try { return JSON.parse(jsonMatch[0]); } catch {}
    }
    return text;
  } catch (error) {
    handleAIError(error);
    return null;
  }
}
\`\`\`

### 3. Fallback khi API lỗi
\`\`\`javascript
function handleAIError(error) {
  const errorMessages = {
    'RATE_LIMIT': 'API đã hết giới hạn. Vui lòng đợi 1 phút rồi thử lại.',
    'INVALID_KEY': 'API Key không hợp lệ. Vui lòng kiểm tra lại.',
    'API_ERROR': 'Lỗi kết nối. Vui lòng kiểm tra mạng và thử lại.',
    'default': 'Đã xảy ra lỗi. Vui lòng thử lại sau.'
  };
  const msg = errorMessages[error.message] || errorMessages['default'];
  showToast(msg, 'error');
  
  // Fallback: sử dụng dữ liệu local nếu có
  return loadData('cached_ai_response') || null;
}

// Retry logic với exponential backoff
async function callWithRetry(prompt, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const result = await callGeminiAI(prompt);
    if (result) return result;
    await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
  }
  return null;
}
\`\`\`
`;
}

// ==========================================
// PHẦN XV: CODE EXAMPLES
// ==========================================
function generateCodeExamples(_category: string): string {
    return `## XV. CODE EXAMPLES

### 1. State Management
\`\`\`javascript
// Centralized State Management
const AppState = {
  _state: {},
  _listeners: [],
  
  get(key) { return this._state[key]; },
  
  set(key, value) {
    this._state[key] = value;
    this._notify(key);
    this._persist();
  },
  
  subscribe(callback) {
    this._listeners.push(callback);
    return () => { this._listeners = this._listeners.filter(l => l !== callback); };
  },
  
  _notify(key) {
    this._listeners.forEach(cb => cb(key, this._state[key]));
  },
  
  _persist() {
    localStorage.setItem('app_state', JSON.stringify(this._state));
  },
  
  init() {
    const saved = localStorage.getItem('app_state');
    if (saved) this._state = JSON.parse(saved);
  }
};
\`\`\`

### 2. Component Pattern
\`\`\`javascript
// Reusable Component Pattern
function createComponent(containerId, { template, data, events }) {
  const container = document.getElementById(containerId);
  
  function render() {
    container.innerHTML = template(data);
    // Bind events sau khi render
    if (events) {
      Object.entries(events).forEach(([selector, handlers]) => {
        container.querySelectorAll(selector).forEach(el => {
          Object.entries(handlers).forEach(([event, handler]) => {
            el.addEventListener(event, handler);
          });
        });
      });
    }
  }
  
  function update(newData) {
    Object.assign(data, newData);
    render();
  }
  
  render();
  return { render, update, data };
}
\`\`\`

### 3. Event Handling & Delegation
\`\`\`javascript
// Event Delegation cho danh sách động
document.getElementById('list-container').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  
  const action = btn.dataset.action;
  const id = btn.closest('[data-id]')?.dataset.id;
  
  switch(action) {
    case 'edit': handleEdit(id); break;
    case 'delete': handleDelete(id); break;
    case 'view': handleView(id); break;
  }
});
\`\`\`

### 4. Modal Component
\`\`\`javascript
function showModal({ title, content, onConfirm, onCancel }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = \\\`
    <div class="modal-content">
      <h3>\\\${title}</h3>
      <div class="modal-body">\\\${content}</div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="modal-cancel">Hủy</button>
        <button class="btn btn-primary" id="modal-confirm">Xác nhận</button>
      </div>
    </div>
  \\\`;
  document.body.appendChild(overlay);
  overlay.querySelector('#modal-confirm').onclick = () => { onConfirm?.(); overlay.remove(); };
  overlay.querySelector('#modal-cancel').onclick = () => { onCancel?.(); overlay.remove(); };
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
}
\`\`\`
`;
}

// ==========================================
// PHẦN XVI: HƯỚNG DẪN TRIỂN KHAI
// ==========================================
function generateDeploymentGuide(): string {
    return `## XVI. HƯỚNG DẪN TRIỂN KHAI

### 1. Bước Setup chi tiết
1. **Tạo file cấu trúc:** Tạo \`index.html\`, viết toàn bộ HTML + CSS + JS trong 1 file
2. **Thêm CDN libraries:** Copy các link CDN vào \`<head>\` (FontAwesome, Google Fonts, Chart.js...)
3. **Cấu hình API Key:** Tạo form nhập API Key và lưu vào LocalStorage
4. **Thêm demo data:** Tạo dữ liệu mẫu để app chạy được ngay khi mở
5. **Test trên trình duyệt:** Mở file HTML trực tiếp trong Chrome/Edge

### 2. Cách test từng tính năng
| Tính năng | Cách test | Expected Result |
|-----------|-----------|-----------------|
| API Key | Nhập key → Lưu → Refresh trang | Key vẫn còn sau refresh |
| CRUD | Thêm/Sửa/Xóa item | Dữ liệu cập nhật realtime |
| AI Features | Nhập prompt → Gọi AI | Nhận response và hiển thị |
| Export | Bấm Export → Kiểm tra file | File Excel/JSON tải về |
| Responsive | Resize browser | Layout tự điều chỉnh |
| Offline | Tắt mạng → Dùng app | Các tính năng local vẫn hoạt động |

### 3. Troubleshooting Guide

| Lỗi | Nguyên nhân | Cách sửa |
|-----|-------------|----------|
| "API Key không hợp lệ" | Key sai hoặc hết hạn | Tạo key mới tại aistudio.google.com/apikey |
| AI không phản hồi | Rate limit hoặc mất mạng | Đợi 60s rồi thử lại |
| Dữ liệu mất sau refresh | LocalStorage bị xóa | Kiểm tra incognito mode, dùng chức năng Backup |
| Giao diện vỡ trên mobile | CSS chưa responsive | Kiểm tra media queries |
| Import Excel lỗi | Sai format file | Dùng template mẫu để import |
`;
}

// ==========================================
// PHẦN XVII: TÍNH NĂNG BẢO MẬT
// ==========================================
function generateSecurityRequirements(): string {
    return `## XVII. TÍNH NĂNG BẢO MẬT

### 1. Bảo vệ API Key
\`\`\`javascript
// Không hiển thị API Key dạng plain text
function maskApiKey(key) {
  if (!key || key.length < 8) return '****';
  return key.slice(0, 4) + '****' + key.slice(-4);
}

// Input type="password" cho API Key
// <input type="password" id="apiKeyInput" placeholder="Nhập Gemini API Key...">
// <button onclick="toggleKeyVisibility()">👁️</button>

function toggleKeyVisibility() {
  const input = document.getElementById('apiKeyInput');
  input.type = input.type === 'password' ? 'text' : 'password';
}
\`\`\`

### 2. Xử lý Rate Limiting
\`\`\`javascript
const RateLimiter = {
  lastCall: 0,
  minInterval: 1000, // Tối thiểu 1 giây giữa các lần gọi
  queue: [],
  
  async call(fn) {
    const now = Date.now();
    const wait = Math.max(0, this.lastCall + this.minInterval - now);
    await new Promise(r => setTimeout(r, wait));
    this.lastCall = Date.now();
    return fn();
  }
};

// Sử dụng: await RateLimiter.call(() => callGeminiAI(prompt));
\`\`\`

### 3. Error Handling toàn diện
\`\`\`javascript
// Global Error Handler
window.onerror = function(msg, url, line, col, error) {
  console.error('App Error:', { msg, url, line, col });
  showToast('Đã xảy ra lỗi. Vui lòng thử lại.', 'error');
  return true;
};

// Promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise:', event.reason);
  showToast('Lỗi xử lý. Vui lòng thử lại.', 'error');
  event.preventDefault();
});

// Safe JSON parse
function safeJsonParse(str, fallback = null) {
  try { return JSON.parse(str); }
  catch { return fallback; }
}

// Safe localStorage access
function safeStorage(action, key, value) {
  try {
    if (action === 'get') return JSON.parse(localStorage.getItem(key));
    if (action === 'set') localStorage.setItem(key, JSON.stringify(value));
    if (action === 'remove') localStorage.removeItem(key);
  } catch (e) {
    console.warn('Storage error:', e);
    if (action === 'get') return null;
  }
}
\`\`\`

### 4. Sanitize Input
\`\`\`javascript
function sanitizeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Sử dụng khi hiển thị user input
element.innerHTML = sanitizeHTML(userInput);
\`\`\`
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

    // ===== PHÂN TÍCH CHI TIẾT THEO Ý TƯỞNG =====

    // Tạo danh sách CDN phù hợp
    const lowerIdea = input.idea.toLowerCase();
    let relevantCDNs = '';
    if (lowerIdea.includes('biểu đồ') || lowerIdea.includes('thống kê') || lowerIdea.includes('báo cáo') || lowerIdea.includes('dashboard') || category === 'Management' || category === 'Finance') {
        relevantCDNs += '- **Chart.js 4:** Biểu đồ thống kê (Bar, Line, Pie, Doughnut)\n';
    }
    if (lowerIdea.includes('toán') || lowerIdea.includes('công thức') || lowerIdea.includes('phương trình')) {
        relevantCDNs += '- **MathJax 3:** Hiển thị công thức Toán học\n';
    }
    if (lowerIdea.includes('excel') || lowerIdea.includes('xuất') || lowerIdea.includes('import') || lowerIdea.includes('báo cáo')) {
        relevantCDNs += '- **SheetJS (xlsx):** Import/Export file Excel\n';
    }
    if (lowerIdea.includes('pdf') || lowerIdea.includes('in ấn')) {
        relevantCDNs += '- **html2pdf.js:** Xuất nội dung ra file PDF\n';
    }
    if (lowerIdea.includes('ngày') || lowerIdea.includes('lịch') || lowerIdea.includes('thời gian') || category === 'Finance') {
        relevantCDNs += '- **Day.js:** Xử lý ngày tháng, định dạng thời gian\n';
    }
    if (lowerIdea.includes('kéo thả') || lowerIdea.includes('drag')) {
        relevantCDNs += '- **SortableJS:** Kéo thả sắp xếp danh sách\n';
    }
    relevantCDNs += '- **Marked.js:** Parse markdown response từ AI\n';
    relevantCDNs += '- **SweetAlert2:** Thông báo popup đẹp mắt\n';

    // Tạo components cụ thể theo ứng dụng
    let specificComponents = '';
    if (category === 'Finance' || lowerIdea.includes('tài chính') || lowerIdea.includes('thu chi')) {
        specificComponents = `
- **Transaction Form:** Form nhập giao dịch (loại, số tiền, danh mục, ghi chú, ngày)
- **Budget Cards:** Thẻ hiển thị ngân sách từng danh mục với progress bar hạn mức
- **Chart Dashboard:** Biểu đồ tròn phân bổ chi tiêu + Biểu đồ đường xu hướng theo thời gian
- **Transaction List:** Bảng lịch sử giao dịch với filter, sort, search
- **Savings Tracker:** Widget theo dõi mục tiêu tiết kiệm với thanh tiến độ
- **AI Analysis Panel:** Khu vực hiển thị phân tích chi tiêu từ Gemini AI
- **Alert Banner:** Cảnh báo khi chi tiêu vượt hạn mức (màu vàng/đỏ)`;
    } else if (category === 'Education') {
        specificComponents = `
- **Subject Cards:** Grid thẻ môn học/chủ đề với icon, progress
- **Question Card:** Thẻ hiển thị câu hỏi + lựa chọn đáp án
- **Score Board:** Bảng điểm với animation và badge
- **Progress Dashboard:** Dashboard tiến độ học tập tổng quan
- **AI Tutor Panel:** Khu vực chat với AI để giải đáp thắc mắc
- **Timer Widget:** Đồng hồ đếm ngược cho bài kiểm tra`;
    } else if (category === 'Management') {
        specificComponents = `
- **Data Table:** Bảng dữ liệu với sort, filter, pagination, search
- **CRUD Modal:** Modal form thêm/sửa với validation realtime
- **Stats Cards:** 4 thẻ thống kê nhanh (Tổng, Mới, Hoàn thành, Cần xử lý)
- **Chart Panel:** Biểu đồ Bar/Line/Pie cho Dashboard thống kê
- **Export Toolbar:** Thanh công cụ xuất Excel/PDF/Print
- **AI Assistant:** Panel phân tích dữ liệu và gợi ý từ AI`;
    } else if (category === 'Game') {
        specificComponents = `
- **Game Canvas:** Khu vực chơi game chính
- **Score Display:** Hiển thị điểm/mạng/level realtime
- **Leaderboard:** Bảng xếp hạng điểm cao
- **Start/Pause Menu:** Menu bắt đầu/tạm dừng game
- **Level Selector:** Chọn level/độ khó
- **Achievement Badges:** Huy hiệu thành tích`;
    } else {
        specificComponents = `
- **Input Area:** Khu vực nhập liệu chính (textarea/upload/form)
- **Output Preview:** Xem trước kết quả xử lý
- **History Panel:** Lịch sử các lần xử lý
- **Settings Panel:** Cài đặt tùy chỉnh
- **AI Processing Indicator:** Hiệu ứng đang xử lý AI`;
    }

    // Tạo mô tả user flow cụ thể
    let userFlow = '';
    if (category === 'Finance' || lowerIdea.includes('tài chính')) {
        userFlow = `
1. Mở app → Nhập API Key (lần đầu) → Vào Dashboard tổng quan
2. Dashboard: Xem tổng thu/chi, biểu đồ, cảnh báo hạn mức
3. Thêm giao dịch: Nhập loại + số tiền + danh mục → AI tự động phân loại
4. Xem báo cáo: Chọn khoảng thời gian → Xem biểu đồ phân tích → Xuất Excel/PDF
5. Thiết lập ngân sách: Đặt hạn mức cho từng danh mục → Nhận cảnh báo khi sắp chạm
6. Mục tiêu tiết kiệm: Tạo mục tiêu → Theo dõi tiến độ → AI gợi ý tối ưu`;
    } else if (category === 'Education') {
        userFlow = `
1. Mở app → Nhập API Key → Chọn môn học/chủ đề
2. Bắt đầu học: Xem nội dung → Làm bài tập → Nhận phản hồi AI
3. Kiểm tra: Chọn đề → Làm bài có giới hạn thời gian → Xem kết quả chi tiết
4. Theo dõi tiến độ: Xem Dashboard → Biểu đồ tiến bộ → Gợi ý ôn tập từ AI`;
    } else if (category === 'Management') {
        userFlow = `
1. Mở app → Nhập API Key → Xem Dashboard tổng quan
2. Quản lý dữ liệu: Thêm/Sửa/Xóa → Tìm kiếm/Lọc → Sắp xếp
3. Báo cáo: Chọn loại + thời gian → Xem biểu đồ → Xuất file
4. AI hỗ trợ: Phân tích xu hướng → Gợi ý hành động → Tạo nhận xét tự động`;
    } else {
        userFlow = `
1. Mở app → Nhập API Key (lần đầu) → Vào giao diện chính
2. Nhập dữ liệu/Upload file → Chọn tùy chọn xử lý
3. AI xử lý → Xem kết quả → Copy/Download/Chia sẻ
4. Xem lịch sử → Sử dụng lại kết quả cũ`;
    }

    // Tạo data schema cụ thể
    let dataSchema = '';
    if (category === 'Finance' || lowerIdea.includes('tài chính') || lowerIdea.includes('thu chi')) {
        dataSchema = `
\`\`\`javascript
const AppData = {
  transactions: [{
    id: "txn_001",
    type: "expense", // "income" | "expense"
    amount: 150000,
    category: "Ăn uống", // AI tự phân loại
    description: "Cơm trưa văn phòng",
    date: "2024-01-15",
    tags: ["lunch", "office"]
  }],
  budgets: [{
    category: "Ăn uống",
    monthlyLimit: 3000000,
    spent: 1500000,
    alertAt: 80 // % cảnh báo
  }],
  savingsGoals: [{
    id: "goal_001",
    name: "Mua laptop",
    targetAmount: 25000000,
    currentAmount: 12000000,
    deadline: "2024-06-30"
  }],
  settings: {
    currency: "VND",
    theme: "light",
    notifications: true
  }
};
\`\`\``;
    } else if (category === 'Education') {
        dataSchema = `
\`\`\`javascript
const AppData = {
  subjects: [{ id, name, icon, questionsCount }],
  questions: [{ id, subjectId, content, type, options, correctAnswer, explanation, difficulty }],
  sessions: [{ id, subjectId, score, totalQuestions, correctAnswers, timeSpent, date }],
  progress: { totalAttempts, averageScore, streakDays, weakTopics: [] },
  settings: { theme, soundEnabled, autoSave }
};
\`\`\``;
    } else if (category === 'Management') {
        dataSchema = `
\`\`\`javascript
const AppData = {
  records: [{ id, title, category, status, priority, description, createdAt, updatedAt }],
  categories: [{ id, name, icon, color }],
  logs: [{ id, action, recordId, timestamp, details }],
  settings: { theme, dateFormat, itemsPerPage, autoBackup }
};
\`\`\``;
    } else {
        dataSchema = `
\`\`\`javascript
const AppData = {
  items: [{ id, type, content, metadata, createdAt }],
  history: [{ id, action, data, timestamp }],
  settings: { theme, language, preferences }
};
\`\`\``;
    }

    // Thêm yêu cầu kỹ thuật CHI TIẾT theo context
    promptCommand += `## 🛠️ YÊU CẦU KỸ THUẬT

### Công nghệ bắt buộc:
- **HTML5/CSS3/JavaScript ES6+** (Single Page Application)
- **Gemini AI API:** Tích hợp Gemini cho các tính năng AI thông minh
- **Responsive Design:** Mobile-first, hiển thị tốt trên mọi thiết bị
- **LocalStorage:** Lưu trữ dữ liệu, settings và API Key
- **Font tiếng Việt:** 'Be Vietnam Pro' (Google Fonts)
- **Icons:** FontAwesome 6

### Thư viện CDN phù hợp:
${relevantCDNs}
### Mô hình dữ liệu (Data Schema):
${dataSchema}

### Tích hợp Gemini AI:
\`\`\`javascript
// Gọi Gemini API với fallback models
const MODELS = ['gemini-3-flash-preview', 'gemini-3-pro-preview', 'gemini-2.5-flash'];

async function callGeminiAI(prompt, modelIndex = 0) {
  const API_KEY = localStorage.getItem('gemini_api_key');
  if (!API_KEY) { showToast('Vui lòng nhập API Key!', 'error'); return null; }
  
  try {
    const response = await fetch(
      \`https://generativelanguage.googleapis.com/v1beta/models/\${MODELS[modelIndex]}:generateContent?key=\${API_KEY}\`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
        })
      }
    );
    
    if (response.status === 429 && modelIndex < MODELS.length - 1) {
      return callGeminiAI(prompt, modelIndex + 1); // Fallback sang model tiếp theo
    }
    if (!response.ok) throw new Error(\`API Error: \${response.status}\`);
    
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (error) {
    if (modelIndex < MODELS.length - 1) return callGeminiAI(prompt, modelIndex + 1);
    showToast('Lỗi API: ' + error.message, 'error');
    return null;
  }
}
\`\`\`

---

## 🎨 YÊU CẦU GIAO DIỆN CHI TIẾT

### Phong cách thiết kế:
- **Style:** Modern, Clean, tối giản nhưng cuốn hút
- **Màu sắc chủ đạo:** Gradient (${config.colors.primary} → ${config.colors.secondary})
- **Background:** #f8fafc (Light) / #0f172a (Dark mode nếu có)
- **Text:** #1e293b (Primary) / #64748b (Secondary)
- **Success:** #10b981 | **Warning:** #f59e0b | **Error:** #ef4444
- **Bo góc:** Border-radius 12px-16px
- **Shadow:** \`box-shadow: 0 4px 12px rgba(0,0,0,0.08)\`
- **Animation:** Smooth transitions (0.3s ease), micro-interactions

### Components cụ thể cho ứng dụng này:
${specificComponents}

### Responsive Breakpoints:
- **Mobile** (< 640px): Single column, bottom navigation
- **Tablet** (640-1024px): 2 columns, collapsible sidebar
- **Desktop** (> 1024px): Full layout với sidebar

---

## 🔄 USER FLOW (Luồng sử dụng)
${userFlow}

---

## 📋 OUTPUT BẮT BUỘC

Tạo ra **ứng dụng web hoàn chỉnh tích hợp Gemini AI** với:

### A. Cấu trúc:
- [ ] File \`index.html\` duy nhất chứa HTML + CSS + JS
- [ ] Code sạch, comment đầy đủ bằng tiếng Việt

### B. Tích hợp AI:
- [ ] Form nhập/lưu API Key (LocalStorage, type="password", toggle hiển thị)
- [ ] Danh sách chọn Model AI (gemini-3-flash, gemini-3-pro, gemini-2.5-flash)
- [ ] Cơ chế fallback tự động khi model gặp lỗi
- [ ] Xử lý lỗi API (Rate limit 429, Invalid key, Network error) với thông báo tiếng Việt
- [ ] Loading states (spinner/skeleton) khi đang gọi AI

### C. Dữ liệu & UX:
- [ ] Dữ liệu mẫu (Demo data) đủ để demo ngay tất cả tính năng
- [ ] Backup/Restore dữ liệu (Export JSON, Import file)
- [ ] Responsive hoàn toàn trên mobile/tablet/desktop
- [ ] Empty states thân thiện khi chưa có dữ liệu
- [ ] Validation form đầy đủ

### D. Triển khai:
- [ ] Chạy được ngay khi mở file HTML trong trình duyệt
- [ ] Tương thích Vercel deployment
- [ ] Nút Settings API Key kèm hướng dẫn luôn hiển thị trên Header

---

## 🚀 BẮT ĐẦU TẠO APP!

Hãy tạo app "${title}" với tất cả các tính năng và yêu cầu trên.

**Lưu ý quan trọng:**
1. App phải tích hợp Gemini AI và chạy được ngay khi mở file HTML
2. Dữ liệu mẫu phải đủ để demo tất cả tính năng chính
3. Giao diện phải WOW người dùng ngay từ lần đầu mở app
4. Code phải có comment tiếng Việt và dễ maintain
5. Xử lý edge cases: API lỗi, dữ liệu rỗng, mất mạng
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

// ==========================================
// PHÂN TÍCH NHIỀU ẢNH VỚI GEMINI VISION API
// ==========================================
export async function analyzeMultipleImagesWithAI(
    images: Array<{ base64: string; mimeType: string }>,
    apiKey: string,
    preferredModel?: string
): Promise<string> {
    const model = preferredModel || AI_MODELS[0];
    const models = [model, ...AI_MODELS.filter(m => m !== model)];

    const prompt = `Bạn là chuyên gia phân tích ứng dụng và giao diện người dùng. Hãy phân tích ${images.length} ảnh chụp màn hình sau đây (có thể là các màn hình khác nhau của cùng một ứng dụng) và tạo một MÔ TẢ Ý TƯỞNG ỨNG DỤNG chi tiết và TỔNG HỢP.

NHIỆM VỤ:
1. Quan sát kỹ TẤT CẢ các giao diện trong các ảnh
2. Xác định loại ứng dụng (giáo dục, quản lý, game, công cụ, tài chính...)
3. Liệt kê TẤT CẢ các tính năng chính có thể thấy từ các màn hình
4. Mô tả đối tượng sử dụng phù hợp
5. Đề xuất các tính năng bổ sung hữu ích

FORMAT TRẢ VỀ (viết thành đoạn văn mô tả ý tưởng hoàn chỉnh):
"Ứng dụng [TÊN LOẠI APP] dành cho [ĐỐI TƯỢNG]. Các tính năng chính bao gồm: [LIỆT KÊ TẤT CẢ TÍNH NĂNG TỪ CÁC MÀN HÌNH]. Giao diện cần có: [MÔ TẢ UI]. Yêu cầu đặc biệt: [NẾU CÓ]."

CHÚ Ý:
- Viết bằng tiếng Việt
- Tổng hợp thông tin từ TẤT CẢ các ảnh
- Chi tiết hơn vì có nhiều thông tin từ nhiều màn hình
- Không cần giải thích, chỉ trả về mô tả ý tưởng`;

    // Tạo parts cho tất cả các ảnh
    const imageParts = images.map(img => ({
        inline_data: { mime_type: img.mimeType, data: img.base64 }
    }));

    let lastError: Error | null = null;

    for (const currentModel of models) {
        try {
            console.log(`Trying Vision API (multiple images) with model: ${currentModel}`);

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: prompt },
                                ...imageParts
                            ]
                        }],
                        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
                    })
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `HTTP ${response.status}`);
            }

            const data = await response.json();
            if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
                throw new Error('Không nhận được phản hồi từ API');
            }

            console.log(`Vision API (multiple images) success with model: ${currentModel}`);
            return data.candidates[0].content.parts[0].text.trim();
        } catch (error) {
            lastError = error as Error;
            console.warn(`Vision API with model ${currentModel} failed:`, error);
        }
    }

    throw new Error(`Lỗi API: ${lastError?.message || 'Tất cả các model đều thất bại'}. Vui lòng kiểm tra API key hoặc thử lại sau.`);
}

// Export
export { AI_MODELS };
export type { GeneratedResult, GenerationProgress, ProgressCallback, EnhancedIdea, AISuggestionsResult };

