'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from '@/context/LocaleContext';

export default function RegisterPage() {
    const { t } = useLocale();
    const router = useRouter();
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (formData.password !== formData.confirmPassword) {
            setError(t.auth.passwordMismatch);
            setLoading(false);
            return;
        }

        if (formData.password.length < 6) {
            setError('Şifre en az 6 karakter olmalıdır');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    email: formData.email,
                    password: formData.password,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 409) {
                    setError(t.auth.emailExists);
                } else {
                    setError(data.error || t.auth.registerError);
                }
                return;
            }

            setSuccess(true);
            setTimeout(() => {
                router.push('/auth/login');
            }, 2000);
        } catch {
            setError(t.auth.registerError);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="py-5" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)', minHeight: '100vh' }}>
                <div className="container">
                    <div className="row justify-content-center">
                        <div className="col-md-6 text-center py-5">
                            <div className="rounded-circle bg-tertil d-inline-flex align-items-center justify-content-center mb-4"
                                style={{ width: '80px', height: '80px' }}>
                                <i className="bi bi-check-lg text-white fs-1"></i>
                            </div>
                            <h2 className="fw-bold text-dark mb-3">{t.auth.registerSuccess}</h2>
                            <p className="text-muted mb-4">
                                Hesabınız oluşturuldu. Giriş sayfasına yönlendiriliyorsunuz...
                            </p>
                            <div className="spinner-border text-tertil" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="py-5" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)', minHeight: '100vh' }}>
            <div className="container">
                <div className="row justify-content-center">
                    <div className="col-md-6 col-lg-5">
                        {/* Logo */}
                        <div className="text-center mb-4">
                            <div className="d-inline-flex align-items-center justify-content-center rounded bg-tertil mb-3"
                                style={{ width: '64px', height: '64px' }}>
                                <i className="bi bi-book text-white fs-2"></i>
                            </div>
                            <h2 className="fw-bold text-dark mb-1">{t.auth.register}</h2>
                            <p className="text-muted">{t.auth.createAccount}</p>
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

                                {/* Name Fields */}
                                <div className="row mb-3">
                                    <div className="col-6">
                                        <label className="form-label-tertil">{t.auth.firstName}</label>
                                        <input
                                            type="text"
                                            name="firstName"
                                            value={formData.firstName}
                                            onChange={handleChange}
                                            className="form-control form-control-tertil"
                                            placeholder="Ahmet"
                                            required
                                        />
                                    </div>
                                    <div className="col-6">
                                        <label className="form-label-tertil">{t.auth.lastName}</label>
                                        <input
                                            type="text"
                                            name="lastName"
                                            value={formData.lastName}
                                            onChange={handleChange}
                                            className="form-control form-control-tertil"
                                            placeholder="Yılmaz"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Email */}
                                <div className="mb-3">
                                    <label className="form-label-tertil">{t.auth.email}</label>
                                    <div className="input-group">
                                        <span className="input-group-text bg-white">
                                            <i className="bi bi-envelope text-muted"></i>
                                        </span>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="form-control form-control-tertil"
                                            placeholder="ornek@email.com"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div className="mb-3">
                                    <label className="form-label-tertil">{t.auth.password}</label>
                                    <div className="input-group">
                                        <span className="input-group-text bg-white">
                                            <i className="bi bi-lock text-muted"></i>
                                        </span>
                                        <input
                                            type="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            className="form-control form-control-tertil"
                                            placeholder="••••••••"
                                            minLength={6}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Confirm Password */}
                                <div className="mb-4">
                                    <label className="form-label-tertil">{t.auth.confirmPassword}</label>
                                    <div className="input-group">
                                        <span className="input-group-text bg-white">
                                            <i className="bi bi-lock text-muted"></i>
                                        </span>
                                        <input
                                            type="password"
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            className="form-control form-control-tertil"
                                            placeholder="••••••••"
                                            minLength={6}
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
                                            <i className="bi bi-person-plus me-2"></i>
                                            {t.auth.register}
                                        </>
                                    )}
                                </button>

                                {/* Login Link */}
                                <p className="text-center text-muted mb-0">
                                    {t.auth.hasAccount}{' '}
                                    <Link href="/auth/login" className="text-tertil fw-semibold text-decoration-none">
                                        {t.auth.login}
                                    </Link>
                                </p>
                            </form>
                        </div>

                        {/* Arabic Text */}
                        <p className="arabic-text text-center fs-5 text-tertil mt-4" style={{ opacity: 0.6 }}>
                            وَفَضَّلْنَاهُمْ عَلَىٰ كَثِيرٍ
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
