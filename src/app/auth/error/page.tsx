'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { useLocale } from '@/context/LocaleContext';

function ErrorContent() {
    const { t } = useLocale();
    const searchParams = useSearchParams();
    const error = searchParams.get('error');

    const errorMessages: Record<string, { title: string; description: string }> = {
        Configuration: {
            title: 'Yapılandırma Hatası',
            description: 'Sunucu yapılandırmasında bir sorun var. Lütfen daha sonra tekrar deneyin.',
        },
        AccessDenied: {
            title: 'Erişim Reddedildi',
            description: 'Bu sayfaya erişim izniniz yok.',
        },
        Verification: {
            title: 'Doğrulama Hatası',
            description: 'Doğrulama bağlantısı geçersiz veya süresi dolmuş.',
        },
        Default: {
            title: 'Bir Hata Oluştu',
            description: 'Oturum açma sırasında beklenmeyen bir hata oluştu.',
        },
    };

    const errorInfo = errorMessages[error || 'Default'] || errorMessages.Default;

    return (
        <div className="py-5" style={{ minHeight: '80vh', background: '#f8fafc' }}>
            <div className="container">
                <div className="row justify-content-center">
                    <div className="col-md-6 col-lg-5">
                        <div className="card-tertil p-4 p-md-5 text-center">
                            <div className="rounded-circle bg-danger d-inline-flex align-items-center justify-content-center mb-4"
                                style={{ width: '80px', height: '80px' }}>
                                <i className="bi bi-exclamation-triangle text-white fs-1"></i>
                            </div>

                            <h2 className="fw-bold text-dark mb-3">{errorInfo.title}</h2>
                            <p className="text-muted mb-4">{errorInfo.description}</p>

                            {error && (
                                <p className="small text-muted mb-4">
                                    Hata kodu: <code>{error}</code>
                                </p>
                            )}

                            <div className="d-flex flex-column gap-2">
                                <Link href="/auth/login" className="btn btn-tertil">
                                    <i className="bi bi-box-arrow-in-right me-2"></i>
                                    {t.auth.login}
                                </Link>
                                <Link href="/" className="btn btn-outline-secondary">
                                    <i className="bi bi-house me-2"></i>
                                    {t.nav.home}
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function AuthErrorPage() {
    return (
        <Suspense fallback={
            <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
                <div className="spinner-border text-tertil" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        }>
            <ErrorContent />
        </Suspense>
    );
}
