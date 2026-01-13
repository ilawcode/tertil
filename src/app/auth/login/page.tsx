'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from '@/context/LocaleContext';

export default function LoginPage() {
    const { t } = useLocale();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError(t.auth.invalidCredentials);
            } else {
                router.push('/dashboard');
                router.refresh();
            }
        } catch {
            setError(t.auth.loginError);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="py-5" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)', minHeight: '100vh' }}>
            <div className="container">
                <div className="row justify-content-center">
                    <div className="col-md-6 col-lg-5 col-xl-4">
                        {/* Logo */}
                        <div className="text-center mb-4">
                            <div className="d-inline-flex align-items-center justify-content-center rounded bg-tertil mb-3"
                                style={{ width: '64px', height: '64px' }}>
                                <i className="bi bi-book text-white fs-2"></i>
                            </div>
                            <h2 className="fw-bold text-dark mb-1">{t.auth.login}</h2>
                            <p className="text-muted">{t.auth.welcomeBack}</p>
                        </div>

                        {/* Form Card */}
                        <div className="card-tertil p-4 p-md-5">
                            <form onSubmit={handleSubmit}>
                                {/* Error */}
                                {error && (
                                    <div className="alert alert-danger d-flex align-items-center mb-4">
                                        <i className="bi bi-exclamation-circle me-2"></i>
                                        {error}
                                    </div>
                                )}

                                {/* Email */}
                                <div className="mb-3">
                                    <label className="form-label-tertil">{t.auth.email}</label>
                                    <div className="input-group">
                                        <span className="input-group-text bg-white">
                                            <i className="bi bi-envelope text-muted"></i>
                                        </span>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="form-control form-control-tertil"
                                            placeholder="ornek@email.com"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div className="mb-4">
                                    <label className="form-label-tertil">{t.auth.password}</label>
                                    <div className="input-group">
                                        <span className="input-group-text bg-white">
                                            <i className="bi bi-lock text-muted"></i>
                                        </span>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="form-control form-control-tertil"
                                            placeholder="••••••••"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn btn-tertil btn-lg w-100 mb-4"
                                >
                                    {loading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                            {t.common.loading}
                                        </>
                                    ) : (
                                        <>
                                            <i className="bi bi-box-arrow-in-right me-2"></i>
                                            {t.auth.login}
                                        </>
                                    )}
                                </button>

                                {/* Register Link */}
                                <p className="text-center text-muted mb-0">
                                    {t.auth.noAccount}{' '}
                                    <Link href="/auth/register" className="text-tertil fw-semibold text-decoration-none">
                                        {t.auth.register}
                                    </Link>
                                </p>
                            </form>
                        </div>

                        {/* Arabic Text */}
                        <p className="arabic-text text-center fs-5 text-tertil mt-4" style={{ opacity: 0.6 }}>
                            رَبَّنَا آتِنَا مِن لَّدُنكَ رَحْمَةً
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
