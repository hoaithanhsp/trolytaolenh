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
    'gemini-3-flash-preview',
    'gemini-3-pro-preview',
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
// BƯỚC 2: TRÍCH XUẤT TÍNH NĂNG CỐT LÕI
// ==========================================
function extractFeatures(idea: string, category: string): { explicit: string[]; implicit: string[]; difficult: string[] } {
    const explicitFeatures: string[] = [];
    const implicitFeatures: string[] = [];
    const difficultFeatures: string[] = [];

    const lowerIdea = idea.toLowerCase();

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

    return { explicit: explicitFeatures, implicit: implicitFeatures, difficult: difficultFeatures };
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
function getUIDesign(category: string, config: typeof categoryConfig['Education']): string {
    const layoutDescriptions: Record<string, string> = {
        'flashcard': 'Giao diện flashcard - 1 câu hỏi chiếm toàn màn hình, chữ to, dễ đọc',
        'dashboard': 'Dashboard với sidebar bên trái + main content bên phải, có summary cards ở trên',
        'form-preview': 'Form input bên trái + Preview kết quả bên phải (split screen)',
        'game-screen': 'Full screen game với HUD (điểm, timer) ở trên, content ở giữa, controls ở dưới',
        'standard': 'Layout đơn giản với header, main content, footer'
    };

    return `
### YÊU CẦU GIAO DIỆN (UI/UX)

#### Màu sắc:
- **Primary Color:** ${config.colors.primary}
- **Secondary Color:** ${config.colors.secondary}
- **Background Gradient:** ${config.colors.gradient}
- **Text Dark:** #1a202c
- **Text Light:** #718096
- **Success:** #48bb78
- **Error:** #f56565
- **Warning:** #ed8936

#### Bố cục (Layout):
- **Kiểu:** ${layoutDescriptions[config.layout] || layoutDescriptions['standard']}
- **Container:** max-width: 1200px, margin: 0 auto
- **Cards:** border-radius: 16px, box-shadow: 0 10px 40px rgba(0,0,0,0.1)
- **Spacing:** padding: 20-40px, margin: 15-30px

#### Typography:
- **Font Family:** 'Be Vietnam Pro', sans-serif
- **Tiêu đề (H1):** 28-36px, font-weight: 700
- **Tiêu đề phụ (H2):** 20-24px, font-weight: 600
- **Nội dung:** 16-18px, line-height: 1.6
- **Caption:** 14px, color: #718096

#### Buttons:
- **Primary:** Background gradient, color: white, padding: 12px 24px, border-radius: 8px
- **Secondary:** Background: transparent, border: 2px solid primary, color: primary
- **Hover:** transform: translateY(-2px), box-shadow tăng
- **Disabled:** opacity: 0.6, cursor: not-allowed

#### Responsive:
- **Desktop:** >= 1024px (full layout)
- **Tablet:** 768px - 1023px (sidebar collapsed)
- **Mobile:** < 768px (single column, stacked)

#### Animations:
- **fadeIn:** opacity 0→1, translateY 20px→0, duration: 0.5s
- **slideInRight:** translateX 100%→0, duration: 0.3s
- **pulse:** scale 1→1.05→1, duration: 0.2s (cho buttons)
- **shake:** translateX -5px→5px (cho errors)
`;
}

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
// BƯỚC 7: VIẾT SYSTEM INSTRUCTION HOÀN CHỈNH
// ==========================================
function generateSystemInstruction(idea: string, category: string, config: typeof categoryConfig['Education']): string {
    const features = extractFeatures(idea, category);
    const title = `${config.icon} ${idea.slice(0, 50)}${idea.length > 50 ? '...' : ''}`;

    const systemInstruction = `# 🚀 SYSTEM INSTRUCTION: ${title}

---

## 📋 HƯỚNG DẪN SỬ DỤNG

1. **Copy toàn bộ nội dung** System Instruction này
2. Mở [Google AI Studio](https://aistudio.google.com/)
3. **Dán vào ô "System Instructions"**
4. Nhập dữ liệu đầu vào của bạn (nội dung bài học, danh sách câu hỏi, etc.)
5. AI sẽ tự động tạo code HTML hoàn chỉnh

---

## 🎭 ROLE (Vai trò)

\`\`\`markdown
Bạn là một **Chuyên gia Phát triển Ứng dụng Web Full-stack** với hơn 10 năm kinh nghiệm, chuyên về:
- ${category === 'Education' ? 'Công nghệ giáo dục (EdTech) và hệ thống học tập trực tuyến' :
            category === 'Management' ? 'Hệ thống quản lý doanh nghiệp và dashboard analytics' :
                category === 'Game' ? 'Game hóa (Gamification) và trải nghiệm tương tác' :
                    category === 'Finance' ? 'Ứng dụng tài chính và theo dõi chi tiêu' :
                        'Phát triển công cụ và tiện ích web'}
- Thiết kế UI/UX hiện đại, thân thiện với người dùng Việt Nam
- Tối ưu hóa trải nghiệm người dùng (UX) cho mọi thiết bị

**Đối tượng người dùng:** ${config.targetUsers.join(', ')}
**Mục đích chính:** ${config.purpose}
\`\`\`

---

## 🎯 NHIỆM VỤ (Task)

### Mô tả dự án:
${idea}

### Nhiệm vụ của bạn:
Tạo một **ứng dụng web hoàn chỉnh trong MỘT file HTML duy nhất** (Single File Application) với đầy đủ:
- HTML structure
- CSS styling (inline trong <style>)
- JavaScript logic (inline trong <script>)
- Không cần server, chạy được offline
- Sử dụng LocalStorage để lưu dữ liệu

---

## ✅ TÍNH NĂNG YÊU CẦU

### Tính năng người dùng đã yêu cầu:
${features.explicit.length > 0 ? features.explicit.map((f, i) => `${i + 1}. ${f}`).join('\n') : '(Sẽ được xác định từ input của người dùng)'}

### Tính năng bắt buộc phải có:
${features.implicit.map((f, i) => `${i + 1}. ${f}`).join('\n')}

${features.difficult.length > 0 ? `
### ⚠️ Lưu ý đặc biệt:
${features.difficult.map((f, i) => `${i + 1}. ${f}`).join('\n')}
` : ''}

---

${getProcessingLogic(idea, category, features)}

---

${getUIDesign(category, config)}

---

## 🛠️ YÊU CẦU KỸ THUẬT

### Tech Stack & Thư viện CDN:

\`\`\`html
${getTechStack(category, features)}
\`\`\`

### Quy tắc code:
1. **Single File HTML** - Tất cả HTML, CSS, JS trong 1 file
2. **Không dùng framework** - Vanilla JS only
3. **LocalStorage** - Lưu tất cả dữ liệu locally
4. **Responsive** - Hoạt động tốt trên Desktop, Tablet, Mobile
5. **Error Handling** - Bắt và hiển thị lỗi rõ ràng
6. **Comments** - Có comment giải thích logic quan trọng

---

## 📄 MẪU CODE TEMPLATE

\`\`\`html
${generateHTMLTemplate(idea, category, config, features)}
\`\`\`

---

## ✅ CHECKLIST CHẤT LƯỢNG

Trước khi trả về code, hãy kiểm tra:

- [ ] Font tiếng Việt hiển thị đúng (Be Vietnam Pro)
- [ ] Responsive trên mọi thiết bị (Desktop/Tablet/Mobile)
- [ ] LocalStorage hoạt động (dữ liệu không mất khi refresh)
- [ ] Xử lý lỗi đầy đủ (thông báo rõ ràng khi có vấn đề)
- [ ] Giao diện đẹp, chuyên nghiệp, có animation
- [ ] Code trong 1 file duy nhất
- [ ] Có comment giải thích logic quan trọng
- [ ] Các nút bấm có hover effect
- [ ] Loading state khi xử lý
- [ ] Có thể chạy offline (không cần server)

---

## 📤 OUTPUT FORMAT

Khi người dùng cung cấp dữ liệu, bạn phải trả về:

1. **Lời giải thích ngắn gọn** (2-3 câu) về những gì app làm được
2. **Code HTML hoàn chỉnh** trong code block \`\`\`html ... \`\`\`
3. **Hướng dẫn sử dụng** (cách mở file, cách dùng app)

---

## 🚀 BẮT ĐẦU TẠO APP!

Hãy đợi người dùng cung cấp dữ liệu đầu vào (nội dung bài học, danh sách câu hỏi, v.v.) rồi tạo app hoàn chỉnh.
`;

    return systemInstruction;
}

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

// Export
export { AI_MODELS };
export type { GeneratedResult, GenerationProgress, ProgressCallback };
