'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useLocale } from '@/context/LocaleContext';

export function Header() {
    const { t, locale, setLocale } = useLocale();
    const { data: session, status } = useSession();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const toggleLocale = () => {
        setLocale(locale === 'tr' ? 'en' : 'tr');
    };

    const isAdmin = session?.user?.role === 'admin';

    return (
        <nav className="navbar navbar-expand-lg navbar-tertil sticky-top">
            <div className="container">
                {/* Logo */}
                <Link href="/" className="navbar-brand d-flex align-items-center gap-2">
                    <div className="d-flex align-items-center justify-content-center rounded bg-tertil"
                        style={{ width: '36px', height: '36px' }}>
                        <i className="bi bi-book text-white"></i>
                    </div>
                    <span>Tertil</span>
                </Link>

                {/* Mobile Toggle */}
                <button
                    className="navbar-toggler border-0"
                    type="button"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    <i className={`bi ${mobileMenuOpen ? 'bi-x-lg' : 'bi-list'} fs-4`}></i>
                </button>

                {/* Navigation */}
                <div className={`collapse navbar-collapse ${mobileMenuOpen ? 'show' : ''}`}>
                    <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                        <li className="nav-item">
                            <Link href="/" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                                <i className="bi bi-house me-1"></i>
                                {t.nav.home}
                            </Link>
                        </li>
                        <li className="nav-item">
                            <Link href="/programs" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                                <i className="bi bi-collection me-1"></i>
                                {t.nav.programs}
                            </Link>
                        </li>
                        {session && (
                            <>
                                <li className="nav-item">
                                    <Link href="/dashboard" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                                        <i className="bi bi-grid me-1"></i>
                                        {t.nav.dashboard}
                                    </Link>
                                </li>
                                {isAdmin && (
                                    <li className="nav-item">
                                        <Link href="/admin" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                                            <i className="bi bi-shield me-1"></i>
                                            {t.nav.admin}
                                        </Link>
                                    </li>
                                )}
                            </>
                        )}
                    </ul>

                    {/* Right Side */}
                    <div className="d-flex align-items-center gap-2">
                        {/* Locale Toggle */}
                        <button
                            onClick={toggleLocale}
                            className="btn btn-sm btn-outline-secondary"
                            title={locale === 'tr' ? 'Switch to English' : 'Türkçe\'ye geç'}
                        >
                            <i className="bi bi-globe me-1"></i>
                            {locale.toUpperCase()}
                        </button>

                        {/* Auth */}
                        {status === 'loading' ? (
                            <div className="spinner-border spinner-border-sm text-secondary" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        ) : session ? (
                            <div className="dropdown">
                                <button
                                    className="btn btn-sm btn-light dropdown-toggle d-flex align-items-center gap-2"
                                    type="button"
                                    data-bs-toggle="dropdown"
                                    aria-expanded="false"
                                >
                                    <div className="d-flex align-items-center justify-content-center rounded-circle bg-tertil text-white fw-bold"
                                        style={{ width: '28px', height: '28px', fontSize: '12px' }}>
                                        {session.user.firstName?.charAt(0)}
                                    </div>
                                    <span className="d-none d-sm-inline">{session.user.firstName}</span>
                                </button>
                                <ul className="dropdown-menu dropdown-menu-end">
                                    <li className="dropdown-header">
                                        <div className="fw-semibold">{session.user.firstName} {session.user.lastName}</div>
                                        <small className="text-muted">{session.user.email}</small>
                                    </li>
                                    <li><hr className="dropdown-divider" /></li>
                                    <li>
                                        <Link href="/profile" className="dropdown-item" onClick={() => setMobileMenuOpen(false)}>
                                            <i className="bi bi-person me-2"></i>
                                            {t.nav.profile}
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href="/dashboard" className="dropdown-item" onClick={() => setMobileMenuOpen(false)}>
                                            <i className="bi bi-grid me-2"></i>
                                            {t.nav.dashboard}
                                        </Link>
                                    </li>
                                    {isAdmin && (
                                        <li>
                                            <Link href="/admin" className="dropdown-item" onClick={() => setMobileMenuOpen(false)}>
                                                <i className="bi bi-shield me-2"></i>
                                                {t.nav.admin}
                                            </Link>
                                        </li>
                                    )}
                                    <li><hr className="dropdown-divider" /></li>
                                    <li>
                                        <button
                                            onClick={() => signOut({ callbackUrl: '/' })}
                                            className="dropdown-item text-danger"
                                        >
                                            <i className="bi bi-box-arrow-right me-2"></i>
                                            {t.auth.logout}
                                        </button>
                                    </li>
                                </ul>
                            </div>
                        ) : (
                            <div className="d-flex align-items-center gap-2">
                                <Link
                                    href="/auth/login"
                                    className="btn btn-sm btn-outline-secondary"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <i className="bi bi-box-arrow-in-right me-1"></i>
                                    {t.auth.login}
                                </Link>
                                <Link
                                    href="/auth/register"
                                    className="btn btn-sm btn-tertil"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <i className="bi bi-person-plus me-1"></i>
                                    {t.auth.register}
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
