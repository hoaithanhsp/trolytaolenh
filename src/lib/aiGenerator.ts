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
// BƯỚC 7: VIẾT SYSTEM INSTRUCTION HOÀN CHỈNH (LOGIC MỚI)
// ==========================================
function generateSystemInstruction(idea: string, category: string, config: typeof categoryConfig['Education']): string {
    const features = extractFeatures(idea, category);
    const lowerIdea = idea.toLowerCase();

    // Tạo tiêu đề sáng tạo
    const appTitle = generateCreativeTitle(idea, category, config);

    // Xác định các thư viện CDN cần dùng
    const cdnLibraries = selectCDNLibraries(idea, category);

    // Tự động đề xuất tính năng thông minh
    const smartFeatures = inferSmartFeatures(idea, category);

    // Tạo template HTML phù hợp với loại app
    const htmlTemplate = generateSmartHTMLTemplate(idea, category, config, smartFeatures);

    // ===== MỚI: Tạo các mô tả chi tiết =====
    const uiSpec = generateUISpecification(category, config, features.userSelections);
    const featureSpec = generateFeatureSpecification(category, features.userSelections, features.implicit);
    const operationFlow = generateOperationFlow(category, features.userSelections);

    const systemInstruction = `# ${config.icon} System Instruction: ${appTitle}

---

## ⚠️ LƯU Ý QUAN TRỌNG (FLEXIBILITY & CREATIVITY)

**Đây là các GỢI Ý (SUGGESTIONS), KHÔNG PHẢI QUY TẮC CỨNG NHẮC (STRICT RULES).**
Với tư cách là một AI thông minh, bạn có toàn quyền:
1. **Tinh chỉnh hoặc Thay đổi** cấu trúc code nếu thấy giải pháp khác tốt hơn.
2. **Sáng tạo thêm** các tính năng cool/ngầu mà user chưa nghĩ tới.
3. **Lựa chọn** phần nào phù hợp từ template bên dưới để đưa vào, không nhất thiết phải copy nguyên xi.
4. **Tối ưu hóa** code theo best practices mới nhất.

Mục tiêu cuối cùng: Tạo ra một ứng dụng **TỐT NHẤT CÓ THỂ** dựa trên ý tưởng của người dùng, chứ không phải một ứng dụng rập khuôn máy móc.

---

## 📋 HƯỚNG DẪN SỬ DỤNG
1. **Copy** toàn bộ nội dung System Instruction bên dưới
2. Truy cập [Google AI Studio](https://aistudio.google.com/)
3. **Dán** vào ô "System Instructions" 
4. Nhập dữ liệu của bạn vào ô chat (danh sách câu hỏi, nội dung bài học, etc.)
5. AI sẽ tự động tạo file HTML hoàn chỉnh.

---

## 🎭 VAI TRÒ (Role)

Bạn là một **Chuyên gia Kiến trúc Phần mềm (Software Architect)** và **Kỹ sư Sáng tạo (Creative Engineer)** cấp cao. Bạn không chỉ viết code, bạn tạo ra các trải nghiệm người dùng tuyệt vời.

Chuyên môn của bạn bao gồm (nhưng không giới hạn):
- ${category === 'Education' ? '🎓 EdTech: Biến bài học nhàm chán thành trải nghiệm thú vị' :
            category === 'Management' ? '📊 Dashboard chuyên nghiệp: Dữ liệu phức tạp -> Giao diện trực quan' :
                category === 'Game' ? '🎮 Gamification: Thêm yếu tố game vào mọi thứ để tăng tương tác' :
                    category === 'Finance' ? '💰 Fintech: Bảo mật, chính xác nhưng vẫn đẹp mắt' :
                        '🛠️ Tools: Công cụ mạnh mẽ, giải quyết vấn đề trong tích tắc'}
- 🎨 UI/UX: Thiết kế hiện đại, clean, chú trọng motion design và micro-interactions.
- 🇻🇳 Localized: Tối ưu hoàn hảo cho người dùng Việt Nam.

**Nhiệm vụ:** Biến ý tưởng thô của người dùng thành một "Siêu Phẩm" Web App (Single File HTML).

---

## 🎯 MÔ TẢ DỰ ÁN (CONTEXT)

### Ý tưởng gốc từ người dùng:
${getCleanIdea(idea)}

### Phân tích sơ bộ (Tham khảo):
- **Thể loại:** ${category}
- **Đối tượng tiềm năng:** ${features.userSelections.targetUsers.length > 0
            ? features.userSelections.targetUsers.join(', ')
            : config.targetUsers.join(', ')}
- **Mục đích chính:** ${features.userSelections.goals.length > 0
            ? features.userSelections.goals.join('; ')
            : config.purpose}

${features.userSelections.expectedResults.length > 0 ? `### Kỳ vọng (Tham khảo):
${features.userSelections.expectedResults.map((r, i) => `- ${r}`).join('\n')}` : ''}

${features.userSelections.customRequirements.length > 0 ? `### Yêu cầu đặc biệt (User note):
${features.userSelections.customRequirements.map((r, i) => `⭐ ${r}`).join('\n')}` : ''}

---

${uiSpec}

---

${featureSpec}

---

${operationFlow}

---

## 🧠 TƯ DUY THIẾT KẾ (DESIGN THINKING)

Đừng chỉ code ngay. Hãy suy nghĩ về các vấn đề sau trước khi bắt đầu:

1. **User Experience (UX):** Làm sao để người dùng cảm thấy "sướng" khi dùng app này? (Ví dụ: Hiệu ứng khi click, âm thanh, transition mượt mà...)
2. **Edge Cases:** Chuyện gì xảy ra nếu user nhập sai? Nếu dữ liệu rỗng? Nếu màn hình quá nhỏ? -> Hãy xử lý chúng gracefully.
3. **Wow Factor:** Tính năng gì sẽ làm user thốt lên "Wow"? (Ví dụ: Dark mode, Confetti, 3D transform...)

### Gợi ý tính năng (Bạn có thể chọn lọc hoặc thêm mới):
${smartFeatures.map((f, i) => `- 💡 ${f}`).join('\n')}

---

## 🛠️ TECH STACK & LOGIC (GỢI Ý)

Bạn có thể sử dụng các thư viện sau (hoặc thay đổi nếu cần thiết):

\`\`\`html
${cdnLibraries}
\`\`\`

### Gợi ý Logic xử lý:
${category === 'Education' ? `> Kiểm tra -> Chấm điểm -> Feedback -> Lưu kết quả -> Thống kê` :
            category === 'Management' ? `> CRUD (Create-Read-Update-Delete) -> Filter/Sort -> Export -> Charts` :
                category === 'Game' ? `> Start -> Play Loop -> Score -> End -> Leaderboard` :
                    `> Input -> Validate -> Process -> Output`}

---

## 🎨 GIAO DIỆN & THẨM MỸ (AESTHETICS)

Hãy tự do sáng tạo giao diện. Dưới đây là một số style gợi ý, nhưng đừng bị giới hạn bởi chúng:

${getUIDesign(category, config)}

---

## 💻 GỢI Ý MẪU CODE (THAM KHẢO)

Dưới đây là một cấu trúc HTML cơ bản. **HÃY SỬA ĐỔI NÓ.** Đừng copy paste một cách mù quáng. Hãy viết lại cấu trúc HTML, CSS, JS sao cho tối ưu nhất cho bài toán cụ thể này.

\`\`\`html
${htmlTemplate}
\`\`\`

---

## ✅ CHECKLIST TRƯỚC KHI XUẤT CODE

- [ ] App có chạy được ngay không? (Single file HTML)
- [ ] Giao diện có đẹp và hiện đại không?
- [ ] Có xử lý lỗi (Error Handling) không?
- [ ] Có responsive không?
- [ ] Đã thêm các "gia vị" sáng tạo chưa?

---

## 🚀 HÃY BẮT ĐẦU!

Bây giờ, hãy chờ input chi tiết từ người dùng và bắt đầu "biến hình" ý tưởng thành hiện thực. Hãy làm tôi ngạc nhiên!
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
function generateUISpecification(category: string, config: typeof categoryConfig['Education'], userSelections: UserSelections): string {
    const layoutDescriptions: Record<string, { name: string; description: string; screens: string[] }> = {
        'flashcard': {
            name: 'Flashcard Full-Screen',
            description: 'Giao diện flashcard - 1 câu hỏi chiếm toàn màn hình, chữ to rõ ràng, dễ đọc từ xa',
            screens: ['Welcome Screen', 'Question Screen', 'Result Screen', 'Review Wrong Answers']
        },
        'dashboard': {
            name: 'Dashboard Split Layout',
            description: 'Dashboard với sidebar bên trái + main content bên phải, có summary cards ở trên',
            screens: ['Dashboard Overview', 'Data Table View', 'Form Modal (Add/Edit)', 'Statistics/Charts']
        },
        'form-preview': {
            name: 'Form-Preview Split',
            description: 'Form input bên trái + Preview kết quả bên phải (split screen 50-50)',
            screens: ['Input Form', 'Live Preview', 'Export/Download Panel']
        },
        'game-screen': {
            name: 'Game Full-Screen',
            description: 'Full screen game với HUD (điểm, timer) ở trên, game content ở giữa, controls ở dưới',
            screens: ['Start Menu', 'Game Screen', 'Pause Modal', 'Game Over', 'Leaderboard']
        },
        'standard': {
            name: 'Standard Layout',
            description: 'Layout đơn giản với header, main content, footer',
            screens: ['Home', 'Main Content', 'Result']
        }
    };

    const layout = layoutDescriptions[config.layout] || layoutDescriptions['standard'];

    return `
## 📱 MÔ TẢ GIAO DIỆN CHI TIẾT (UI SPECIFICATION)

### Tổng quan Layout
- **Kiểu layout:** ${layout.name}
- **Mô tả:** ${layout.description}
- **Các màn hình:** ${layout.screens.join(' → ')}

### Chi tiết từng màn hình

#### Màn hình 1: ${layout.screens[0]}
| Element | Mô tả | CSS Style |
|---------|-------|-----------|
| Container | Card trung tâm, max-width 800px | background: white, border-radius: 20px, box-shadow: 0 20px 60px rgba(0,0,0,0.15) |
| Header | Icon + Tiêu đề app | font-size: 2.5rem, font-weight: 800, gradient text |
| Description | Mô tả ngắn gọn mục đích app | color: #64748b, font-size: 1.1rem, margin: 1rem 0 |
| Start Button | Nút CTA chính | gradient background, padding: 16px 40px, font-size: 1.2rem, hover: scale(1.05) + glow |
${userSelections.targetUsers.length > 0 ? `| Target Info | Hiển thị đối tượng: ${userSelections.targetUsers.join(', ')} | badge style, subtle background |` : ''}

#### Màn hình 2: ${layout.screens[1] || 'Main Screen'}
| Element | Mô tả | CSS Style |
|---------|-------|-----------|
| Progress Bar | Thanh tiến độ | height: 8px, gradient fill, border-radius: 4px |
| Content Area | Nội dung chính (câu hỏi/form/game) | padding: 2rem, font-size: 1.5rem cho content quan trọng |
| Action Buttons | Các nút tương tác | flex gap, consistent styling |
| Timer/Score | Hiển thị thời gian/điểm số (nếu có) | fixed position hoặc sticky header |

#### Màn hình 3: ${layout.screens[2] || 'Result Screen'}
| Element | Mô tả | CSS Style |
|---------|-------|-----------|
| Result Summary | Tổng kết kết quả (điểm, thời gian, đánh giá) | large font, emoji indicators, celebration animation |
| Statistics | Biểu đồ/số liệu thống kê | Chart.js hoặc custom SVG |
| Action Buttons | "Làm lại" + "Xem chi tiết" + "Chia sẻ" | button group, primary + secondary styles |
| Confetti | Hiệu ứng chúc mừng (nếu kết quả tốt) | canvas-confetti library |

### 🎨 Design Aesthetics (từ skill frontend-design)

#### Typography (KHÔNG dùng font generic!)
- **Display Font:** 'Quicksand' hoặc 'Nunito' (rounded, friendly) cho tiêu đề
- **Body Font:** 'Be Vietnam Pro' hoặc 'Lexend' cho nội dung
- **Heading:** font-weight: 700-800, letter-spacing: -0.02em
- **Body:** font-weight: 400-500, line-height: 1.7

#### Color Palette
| Color | Value | Usage |
|-------|-------|-------|
| Primary | ${config.colors.primary} | CTA buttons, active states, links |
| Secondary | ${config.colors.secondary} | Accents, secondary buttons |
| Background | ${config.colors.gradient} | Page background, hero sections |
| Success | #10b981 | Correct answers, success states |
| Error | #ef4444 | Wrong answers, error states |
| Warning | #f59e0b | Warnings, time running out |
| Surface | white | Cards, modals |
| Text Primary | #1e293b | Main text |
| Text Secondary | #64748b | Captions, hints |

#### Motion & Animations
- **Page Load:** fadeInUp với stagger delay cho các elements
- **Button Hover:** scale(1.05) + subtle shadow increase + slight translateY(-2px)
- **Card Hover:** translate(-5px, -5px) + enhanced shadow
- **Screen Transition:** slideInRight/slideOutLeft, duration: 0.4s ease-out
- **Correct Answer:** pulse green glow + checkmark icon animate
- **Wrong Answer:** shake horizontal + red flash
- **Celebration:** canvas-confetti khi hoàn thành xuất sắc

#### Spatial Composition
- **Container:** max-width 900px cho readability
- **Card padding:** 2rem - 3rem
- **Element spacing:** 1rem - 2rem margins
- **Border radius:** 16px-24px cho soft look
- **Shadows:** layered shadows cho depth (0 10px 40px rgba(0,0,0,0.1), 0 2px 10px rgba(0,0,0,0.05))
`;
}

// ==========================================
// BƯỚC 4B: MÔ TẢ TÍNH NĂNG CHI TIẾT (FEATURE SPECIFICATION)
// Tích hợp từ skill: app-builder
// ==========================================
function generateFeatureSpecification(category: string, userSelections: UserSelections, _implicitFeatures: string[]): string {
    let featureTable = '';
    let featureCount = 1;

    // Chức năng từ user selections
    if (userSelections.functions.length > 0) {
        featureTable += `
### Chức năng chính (đã chọn)

| # | Tính năng | Mô tả chi tiết | Input | Output | Xử lý Edge Cases |
|---|-----------|----------------|-------|--------|------------------|
`;
        userSelections.functions.forEach(func => {
            featureTable += `| ${featureCount++} | ${func} | [AI điền chi tiết dựa trên context] | [User input cần thiết] | [Kết quả trả về] | [Xử lý khi lỗi/rỗng/invalid] |\n`;
        });
    }

    // Yêu cầu riêng
    if (userSelections.customRequirements.length > 0) {
        featureTable += `
### Yêu cầu đặc biệt từ người dùng

`;
        userSelections.customRequirements.forEach((req, i) => {
            featureTable += `⭐ **${i + 1}. ${req}**\n   - Mô tả: [AI phân tích và diễn giải yêu cầu này]\n   - Cách thực hiện: [AI đề xuất solution]\n\n`;
        });
    }

    // Tính năng implied theo category
    const categoryImplied: Record<string, string[]> = {
        'Education': [
            'Hiển thị câu hỏi từng câu một với số thứ tự',
            'Highlight đáp án đúng/sai sau khi chọn',
            'Nút "Tiếp theo" để chuyển câu',
            'Thanh progress bar hiển thị tiến độ',
            'Timer đếm ngược (nếu có giới hạn thời gian)',
            'Chấm điểm tự động khi kết thúc',
            'Thống kê chi tiết: Số câu đúng/sai, thời gian, điểm %',
            'Option xem lại các câu trả lời sai',
            'Lưu kết quả vào localStorage'
        ],
        'Management': [
            'Bảng dữ liệu với pagination',
            'Search realtime khi gõ',
            'Sort theo column (asc/desc)',
            'Filter multi-criteria',
            'Modal Add/Edit với form validation',
            'Confirm dialog trước khi Delete',
            'Toast notifications cho CRUD actions',
            'Export to Excel/PDF',
            'LocalStorage persistence'
        ],
        'Game': [
            'Start screen với menu options',
            'Score display với animation',
            'Lives/Hearts system (nếu phù hợp)',
            'Level progression',
            'Sound effects (optional toggle)',
            'Pause/Resume functionality',
            'Game Over screen với final score',
            'Leaderboard (localStorage)',
            'Play Again button'
        ],
        'Tool': [
            'Input validation realtime',
            'Live preview khi nhập',
            'Copy to clipboard button',
            'Download result button',
            'Clear/Reset button',
            'Error messages rõ ràng',
            'Loading state khi processing',
            'Drag & drop file upload (nếu cần)'
        ],
        'Finance': [
            'Number formatting với dấu phân cách',
            'Currency selector',
            'Chart visualization',
            'Summary statistics',
            'Export report',
            'Date range filter',
            'Category breakdown'
        ]
    };

    const impliedList = categoryImplied[category] || categoryImplied['Tool'];

    featureTable += `
### Tính năng implied (tự động thêm theo category: ${category})

${impliedList.map((f, i) => `${i + 1}. ${f}`).join('\n')}

`;

    // Mục tiêu
    if (userSelections.goals.length > 0) {
        featureTable += `
### 🎯 Mục tiêu đạt được

${userSelections.goals.map((g, i) => `${i + 1}. **${g}** → [AI mô tả cách app giúp đạt mục tiêu này]`).join('\n')}

`;
    }

    // Kết quả mong muốn
    if (userSelections.expectedResults.length > 0) {
        featureTable += `
### ✅ Kết quả mong muốn

${userSelections.expectedResults.map((r, i) => `${i + 1}. ${r}`).join('\n')}

`;
    }

    return `
## ⚙️ MÔ TẢ TÍNH NĂNG CHI TIẾT (FEATURE SPECIFICATION)
${featureTable}
### Error Handling (Bắt buộc implement)

| Tình huống | Xử lý |
|------------|-------|
| Dữ liệu rỗng/null | Hiển thị thông báo thân thiện + hướng dẫn |
| Format không hợp lệ | Validate + hiện error message cụ thể |
| Hết thời gian (nếu có timer) | Auto-submit + thông báo |
| LocalStorage đầy | Try-catch + fallback behavior |
| User refresh trang | Restore state từ localStorage nếu có |
`;
}

// ==========================================
// BƯỚC 4C: CÁCH THỨC VẬN HÀNH (OPERATION FLOW)
// Tích hợp từ skill: app-builder, game-development
// ==========================================
function generateOperationFlow(category: string, _userSelections: UserSelections): string {
    let userJourney = '';
    let stateStructure = '';

    if (category === 'Education') {
        userJourney = `
1. **Mở app** → Hiển thị Welcome Screen
   - Thấy tiêu đề, mô tả, nút "Bắt đầu"
   - Background gradient, animation fadeIn

2. **Click "Bắt đầu"** → Chuyển sang Question Screen
   - Hiển thị câu hỏi đầu tiên
   - Timer bắt đầu đếm (nếu có)
   - Progress bar: 1/N

3. **Chọn đáp án** → Xử lý câu trả lời
   - Highlight đáp án đã chọn
   - Hiện đáp án đúng (màu xanh)
   - Nếu sai: shake animation + hiện đáp án đúng
   - Update điểm số

4. **Click "Tiếp theo"** → Câu hỏi kế tiếp
   - Slide animation
   - Update progress bar
   - Repeat bước 3-4 đến hết

5. **Hoàn thành** → Result Screen
   - Confetti nếu điểm cao
   - Hiển thị: Điểm, Thời gian, Số câu đúng
   - Đánh giá (Xuất sắc/Tốt/Cần cố gắng)
   - Nút "Làm lại" + "Xem câu sai"

6. **Xem câu sai** (Optional)
   - Danh sách câu trả lời sai
   - Hiện đáp án đúng + giải thích (nếu có)

7. **Làm lại** → Quay về bước 2
   - Reset state
   - Xáo trộn câu hỏi (random)`;

        stateStructure = `
\`\`\`javascript
let state = {
    // Điều khiển màn hình
    currentScreen: 'welcome' | 'question' | 'result' | 'review',
    
    // Dữ liệu câu hỏi
    questions: [...],           // Mảng câu hỏi
    currentIndex: 0,            // Index câu hiện tại
    
    // Kết quả
    answers: [],                // Đáp án user đã chọn
    score: 0,                   // Điểm số
    correctCount: 0,            // Số câu đúng
    wrongQuestions: [],         // Các câu trả lời sai
    
    // Timer
    timeStart: null,            // Thời điểm bắt đầu
    timeEnd: null,              // Thời điểm kết thúc
    timeLimit: null,            // Giới hạn thời gian (seconds)
    
    // Settings
    isShuffled: true,           // Có xáo trộn không
    showCorrectImmediately: true // Hiện đáp án đúng ngay
};
\`\`\``;
    } else if (category === 'Management') {
        userJourney = `
1. **Mở app** → Dashboard Overview
   - Load dữ liệu từ localStorage
   - Hiển thị summary cards (tổng số, thống kê)
   - Render bảng dữ liệu

2. **Tìm kiếm** → Filter realtime
   - Gõ vào search box
   - Debounce 300ms
   - Filter data + re-render table

3. **Sort** → Sắp xếp
   - Click header column
   - Toggle asc/desc
   - Re-render table

4. **Thêm mới** → Modal Form
   - Click nút "Thêm mới"
   - Hiện modal với form trống
   - Validate inputs
   - Submit → Add to data + close modal + toast success

5. **Sửa** → Modal Form (pre-filled)
   - Click icon Edit trên row
   - Hiện modal với data hiện tại
   - Update → Save + close + toast success

6. **Xóa** → Confirm Dialog
   - Click icon Delete
   - Hiện confirm dialog
   - Confirm → Remove from data + toast success
   - Cancel → Close dialog

7. **Export** → Download file
   - Click nút Export
   - Generate Excel/PDF
   - Trigger download`;

        stateStructure = `
\`\`\`javascript
let state = {
    // Dữ liệu
    items: [...],               // Mảng dữ liệu chính
    filteredItems: [...],       // Dữ liệu sau khi filter
    
    // UI State
    searchQuery: '',            // Text tìm kiếm
    sortColumn: 'id',           // Column đang sort
    sortDirection: 'asc',       // Hướng sort
    currentPage: 1,             // Trang hiện tại
    itemsPerPage: 10,           // Số item/trang
    
    // Modal
    isModalOpen: false,         // Modal có mở không
    modalMode: 'add' | 'edit',  // Mode của modal
    editingItem: null,          // Item đang edit
    
    // Form
    formData: {...},            // Dữ liệu form
    formErrors: {...},          // Lỗi validation
    
    // Loading
    isLoading: false
};
\`\`\``;
    } else if (category === 'Game') {
        userJourney = `
1. **Mở app** → Start Menu
   - Logo + Tiêu đề game
   - Nút "Chơi ngay"
   - High Score hiển thị
   - Settings (sound on/off)

2. **Click "Chơi ngay"** → Game Screen
   - Init game state
   - Start game loop
   - HUD: Score, Lives/Timer

3. **Gameplay Loop**
   - Hiển thị challenge (câu hỏi/puzzle/action)
   - Nhận input từ user
   - Check đáp án/action
   - Update score + animation
   - Next challenge hoặc Game Over

4. **Correct/Win** → Positive Feedback
   - +Score animation
   - Sound effect (optional)
   - Flash green

5. **Wrong/Lose** → Negative Feedback
   - -Life hoặc penalty
   - Shake animation
   - Sound effect (optional)

6. **Game Over** → End Screen
   - Final score lớn
   - So sánh với High Score
   - Update High Score nếu mới
   - Confetti nếu record mới
   - "Chơi lại" button

7. **Chơi lại** → Reset + bước 2`;

        stateStructure = `
\`\`\`javascript
let state = {
    // Game state
    gameState: 'menu' | 'playing' | 'paused' | 'gameover',
    
    // Score
    score: 0,
    highScore: localStorage.getItem('highScore') || 0,
    
    // Lives/Time
    lives: 3,                   // Hoặc time remaining
    level: 1,
    
    // Game data
    currentChallenge: {...},    // Challenge hiện tại
    challenges: [...],          // Danh sách challenges
    challengeIndex: 0,
    
    // Settings
    soundEnabled: true,
    difficulty: 'normal',
    
    // Animation
    isAnimating: false
};
\`\`\``;
    } else {
        // Tool / Other
        userJourney = `
1. **Mở app** → Main Screen
   - Form input bên trái
   - Preview area bên phải (trống)

2. **Nhập dữ liệu** → Live Preview
   - User nhập vào form/textarea
   - Validate realtime
   - Update preview area

3. **Click "Xử lý"** → Process
   - Validate all inputs
   - Show loading
   - Process data
   - Update preview với result

4. **Copy/Download** → Output
   - Click Copy → Copy to clipboard + toast
   - Click Download → Trigger file download

5. **Clear** → Reset
   - Clear all inputs
   - Clear preview
   - Reset state`;

        stateStructure = `
\`\`\`javascript
let state = {
    // Input
    inputData: '',              // Dữ liệu đầu vào
    
    // Output
    outputData: '',             // Kết quả xử lý
    
    // UI
    isProcessing: false,        // Đang xử lý
    error: null,                // Lỗi (nếu có)
    
    // Options
    options: {...}              // Các tùy chọn xử lý
};
\`\`\``;
    }

    return `
## 🔄 CÁCH THỨC VẬN HÀNH (OPERATION FLOW)

### User Journey (Step-by-step)
${userJourney}

### State Management
${stateStructure}

### Data Flow
\`\`\`
[User Input] 
    ↓ 
[Validate] 
    ↓ 
[Update State] 
    ↓ 
[Re-render UI] 
    ↓ 
[Save to LocalStorage]
\`\`\`

### Key Event Handlers

| Event | Function | Mô tả |
|-------|----------|-------|
| DOMContentLoaded | \`init()\` | Khởi tạo app, load saved data |
| click:start | \`start()\` | Bắt đầu/chuyển sang main screen |
| click:action | \`handleAction()\` | Xử lý action chính của app |
| click:next | \`next()\` | Chuyển sang item/step tiếp theo |
| click:submit | \`submit()\` | Submit dữ liệu |
| click:restart | \`restart()\` | Reset và bắt đầu lại |
| input:search | \`handleSearch()\` | Xử lý tìm kiếm (debounced) |
| keydown:Enter | \`handleEnter()\` | Submit khi nhấn Enter |

### LocalStorage Keys

| Key | Mô tả | Format |
|-----|-------|--------|
| \`app_data\` | Dữ liệu chính của app | JSON object |
| \`app_history\` | Lịch sử sử dụng | JSON array |
| \`app_settings\` | Cài đặt người dùng | JSON object |
`;
}

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

// Export
export { AI_MODELS };
export type { GeneratedResult, GenerationProgress, ProgressCallback, EnhancedIdea, AISuggestionsResult };
