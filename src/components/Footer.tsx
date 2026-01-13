'use client';

import Link from 'next/link';
import { useLocale } from '@/context/LocaleContext';

export function Footer() {
    const { t } = useLocale();

    return (
        <footer className="footer-tertil">
            <div className="container">
                <div className="row">
                    {/* Brand */}
                    <div className="col-lg-5 mb-4 mb-lg-0">
                        <Link href="/" className="d-flex align-items-center gap-2 mb-3 text-decoration-none">
                            <div className="d-flex align-items-center justify-content-center rounded bg-tertil"
                                style={{ width: '40px', height: '40px' }}>
                                <i className="bi bi-book text-white fs-5"></i>
                            </div>
                            <span className="fs-4 fw-bold text-white">Tertil</span>
                        </Link>
                        <p className="mb-4" style={{ maxWidth: '400px' }}>
                            Kuran-ı Kerim okuma programlarını paylaşın, hatim organizasyonları oluşturun
                            ve toplulukla birlikte okuyun.
                        </p>
                        <p className="arabic-text fs-4" style={{ opacity: 0.5 }}>
                            وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا
                        </p>
                    </div>

                    {/* Program Types */}
                    <div className="col-6 col-lg-3 mb-4 mb-lg-0">
                        <h5 className="mb-3">{t.programs.programTypes}</h5>
                        <ul className="list-unstyled">
                            <li className="mb-2">
                                <Link href="/programs?type=hatim">{t.programs.types.hatim}</Link>
                            </li>
                            <li className="mb-2">
                                <Link href="/programs?type=yasin">{t.programs.types.yasin}</Link>
                            </li>
                            <li className="mb-2">
                                <Link href="/programs?type=ihlas">{t.programs.types.ihlas}</Link>
                            </li>
                            <li className="mb-2">
                                <Link href="/programs?type=fetih">{t.programs.types.fetih}</Link>
                            </li>
                        </ul>
                    </div>

                    {/* Quick Links */}
                    <div className="col-6 col-lg-3 mb-4 mb-lg-0">
                        <h5 className="mb-3">{t.common.quickLinks}</h5>
                        <ul className="list-unstyled">
                            <li className="mb-2">
                                <Link href="/programs">{t.nav.programs}</Link>
                            </li>
                            <li className="mb-2">
                                <Link href="/programs/create">{t.programs.createProgram}</Link>
                            </li>
                            <li className="mb-2">
                                <Link href="/auth/register">{t.auth.register}</Link>
                            </li>
                            <li className="mb-2">
                                <Link href="/auth/login">{t.auth.login}</Link>
                            </li>
                        </ul>
                    </div>
                </div>

                <hr className="my-4" style={{ borderColor: 'rgba(255,255,255,0.1)' }} />

                {/* Bottom */}
                <div className="d-flex flex-column flex-md-row align-items-center justify-content-between gap-3">
                    <p className="mb-0 small">
                        © {new Date().getFullYear()} Tertil. {t.common.allRightsReserved}
                    </p>
                    <p className="mb-0 small d-flex align-items-center gap-1">
                        Made with <i className="bi bi-heart-fill text-danger"></i> for the Ummah
                    </p>
                </div>
            </div>
        </footer>
    );
}
