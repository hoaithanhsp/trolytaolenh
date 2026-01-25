interface HeaderProps {
    apiKey: string;
    selectedModel: string;
    onOpenApiKeyModal: () => void;
    onSelectModel: (model: string) => void;
}

const AI_MODELS = [
    { id: 'gemini-2.5-flash-preview-05-20', name: 'Gemini 2.5 Flash', description: 'Nhanh, tiết kiệm', isDefault: true },
    { id: 'gemini-2.5-pro-preview-05-06', name: 'Gemini 2.5 Pro', description: 'Mạnh mẽ, chính xác', isDefault: false },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Dự phòng ổn định', isDefault: false },
];

export default function Header({ apiKey, selectedModel, onOpenApiKeyModal, onSelectModel }: HeaderProps) {
    return (
        <header className="app-header">
            <div className="header-left">
                <div className="logo">
                    <i className="fas fa-robot"></i>
                    <h1>AI System Instruction Generator</h1>
                </div>
            </div>

            <div className="header-center">
                <div className="model-selector">
                    <span className="model-label"><i className="fas fa-microchip"></i> Model AI:</span>
                    <div className="model-cards">
                        {AI_MODELS.map((model) => (
                            <button
                                key={model.id}
                                className={`model-card ${selectedModel === model.id ? 'active' : ''} ${model.isDefault ? 'default' : ''}`}
                                onClick={() => onSelectModel(model.id)}
                                title={model.description}
                            >
                                <span className="model-name">{model.name}</span>
                                {model.isDefault && <span className="default-badge">Default</span>}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="header-right">
                <button className="settings-btn" onClick={onOpenApiKeyModal}>
                    <i className="fas fa-cog"></i>
                    <span>Settings</span>
                    {!apiKey && <span className="api-key-warning">Lấy API key để sử dụng app</span>}
                </button>
                {apiKey && (
                    <div className="api-status connected">
                        <i className="fas fa-check-circle"></i>
                        <span>API Connected</span>
                    </div>
                )}
            </div>
        </header>
    );
}

export { AI_MODELS };
