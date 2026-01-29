import { useState } from 'react';

interface LoginScreenProps {
    onLoginSuccess: () => void;
}

const LoginScreen = ({ onLoginSuccess }: LoginScreenProps) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Simulate loading
        setTimeout(() => {
            if (username === 'VIP' && password === '12345') {
                localStorage.setItem('isLoggedIn', 'true');
                onLoginSuccess();
            } else {
                setError('Tên đăng nhập hoặc mật khẩu không đúng!');
            }
            setIsLoading(false);
        }, 800);
    };

    return (
        <div className="login-screen">
            <div className="login-container">
                <div className="login-header">
                    <div className="login-logo">
                        <i className="fas fa-code"></i>
                    </div>
                    <h1>AI System Instruction Generator</h1>
                    <p>Đăng nhập để tiếp tục</p>
                </div>

                <form className="login-form" onSubmit={handleLogin}>
                    <div className="form-group">
                        <label htmlFor="username">
                            <i className="fas fa-user"></i>
                            Tên đăng nhập
                        </label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Nhập tên đăng nhập"
                            autoComplete="username"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">
                            <i className="fas fa-lock"></i>
                            Mật khẩu
                        </label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Nhập mật khẩu"
                            autoComplete="current-password"
                        />
                    </div>

                    {error && (
                        <div className="login-error">
                            <i className="fas fa-exclamation-circle"></i>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="login-button"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <i className="fas fa-spinner fa-spin"></i>
                                Đang đăng nhập...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-sign-in-alt"></i>
                                Đăng nhập
                            </>
                        )}
                    </button>
                </form>

                <div className="login-footer">
                    <p>© 2026 AI System Instruction Generator</p>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;
