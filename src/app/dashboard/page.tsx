'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from '@/context/LocaleContext';
import { ProgramCard } from '@/components/ProgramCard';

interface Program {
    _id: string;
    title: string;
    description?: string;
    programType: string;
    startDate: string;
    endDate: string;
    dedicatedTo?: string;
    totalParticipants: number;
    completedParts: number;
    parts: Array<{
        partNumber: number;
        partType: string;
        isAssigned: boolean;
        isCompleted: boolean;
    }>;
    status: string;
    isApproved: boolean;
}

interface JoinedProgram {
    program: Program;
    myParts: number[];
    completedParts: number[];
    joinedAt: string;
}

interface DashboardData {
    myCreatedPrograms: Program[];
    myJoinedPrograms: JoinedProgram[];
    stats: {
        activePrograms: number;
        completedPrograms: number;
        totalParticipations: number;
        completedReadings: number;
        myCreatedCount: number;
        myJoinedCount: number;
    };
    recentPrograms: Program[];
    isAdmin: boolean;
}

export default function DashboardPage() {
    const { t } = useLocale();
    const { data: session, status } = useSession();
    const router = useRouter();

    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'created' | 'joined'>('created');

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/login');
            return;
        }

        if (status === 'authenticated') {
            fetchDashboardData();
        }
    }, [status, router]);

    const fetchDashboardData = async () => {
        try {
            const response = await fetch('/api/user/dashboard');
            const result = await response.json();

            if (response.ok) {
                setData(result);
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (status === 'loading' || loading) {
        return (
            <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
                <div className="spinner-border text-tertil" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    if (!session || !data) {
        return null;
    }

    return (
        <div className="py-5" style={{ background: '#f8fafc', minHeight: '100vh' }}>
            <div className="container">
                {/* Header */}
                <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
                    <div>
                        <h1 className="h2 fw-bold text-dark mb-1">
                            {t.dashboard.welcome}, {session.user.firstName}!
                        </h1>
                        <p className="text-muted mb-0">İşte programlarınızın özeti</p>
                    </div>
                    <div className="d-flex gap-2">
                        {data.isAdmin && (
                            <Link href="/admin" className="btn btn-outline-secondary">
                                <i className="bi bi-shield me-2"></i>
                                {t.nav.admin}
                            </Link>
                        )}
                        <Link href="/programs/create" className="btn btn-tertil">
                            <i className="bi bi-plus-lg me-2"></i>
                            {t.programs.createProgram}
                        </Link>
                    </div>
                </div>

                {/* Stats */}
                <div className="row mb-4 g-3">
                    <div className="col-6 col-lg-3">
                        <div className="stats-card">
                            <div className="icon-wrapper bg-tertil">
                                <i className="bi bi-book text-white fs-5"></i>
                            </div>
                            <div className="stats-value">{data.stats.activePrograms}</div>
                            <div className="stats-label">{t.dashboard.activePrograms}</div>
                        </div>
                    </div>
                    <div className="col-6 col-lg-3">
                        <div className="stats-card">
                            <div className="icon-wrapper bg-gold">
                                <i className="bi bi-collection text-dark fs-5"></i>
                            </div>
                            <div className="stats-value">{data.stats.myCreatedCount}</div>
                            <div className="stats-label">{t.dashboard.myCreatedPrograms}</div>
                        </div>
                    </div>
                    <div className="col-6 col-lg-3">
                        <div className="stats-card">
                            <div className="icon-wrapper bg-primary">
                                <i className="bi bi-people text-white fs-5"></i>
                            </div>
                            <div className="stats-value">{data.stats.myJoinedCount}</div>
                            <div className="stats-label">{t.dashboard.myJoinedPrograms}</div>
                        </div>
                    </div>
                    <div className="col-6 col-lg-3">
                        <div className="stats-card">
                            <div className="icon-wrapper bg-success">
                                <i className="bi bi-check-circle text-white fs-5"></i>
                            </div>
                            <div className="stats-value">{data.stats.completedReadings}</div>
                            <div className="stats-label">Tamamlanan Okumalar</div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <ul className="nav nav-tabs mb-4">
                    <li className="nav-item">
                        <button
                            className={`nav-link ${activeTab === 'created' ? 'active' : ''}`}
                            onClick={() => setActiveTab('created')}
                        >
                            {t.dashboard.myCreatedPrograms}
                            <span className="badge bg-secondary ms-2">{data.myCreatedPrograms.length}</span>
                        </button>
                    </li>
                    <li className="nav-item">
                        <button
                            className={`nav-link ${activeTab === 'joined' ? 'active' : ''}`}
                            onClick={() => setActiveTab('joined')}
                        >
                            {t.dashboard.myJoinedPrograms}
                            <span className="badge bg-secondary ms-2">{data.myJoinedPrograms.length}</span>
                        </button>
                    </li>
                </ul>

                {/* Created Programs */}
                {activeTab === 'created' && (
                    <>
                        {data.myCreatedPrograms.length > 0 ? (
                            <div className="row g-4">
                                {data.myCreatedPrograms.map((program) => (
                                    <div key={program._id} className="col-md-6 col-lg-4 position-relative">
                                        {!program.isApproved && (
                                            <span className="badge badge-tertil badge-warning-soft position-absolute top-0 end-0 m-3" style={{ zIndex: 1 }}>
                                                {t.programs.statuses.pending}
                                            </span>
                                        )}
                                        <ProgramCard program={program} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-5">
                                <div className="rounded-circle bg-light d-inline-flex align-items-center justify-content-center mb-4"
                                    style={{ width: '80px', height: '80px' }}>
                                    <i className="bi bi-book fs-1 text-secondary"></i>
                                </div>
                                <h4 className="fw-semibold text-dark mb-2">Henüz program oluşturmadınız</h4>
                                <p className="text-muted mb-4">İlk programınızı oluşturmak için butona tıklayın</p>
                                <Link href="/programs/create" className="btn btn-tertil">
                                    <i className="bi bi-plus-lg me-2"></i>
                                    {t.programs.createProgram}
                                </Link>
                            </div>
                        )}
                    </>
                )}

                {/* Joined Programs */}
                {activeTab === 'joined' && (
                    <>
                        {data.myJoinedPrograms.length > 0 ? (
                            <div className="d-flex flex-column gap-3">
                                {data.myJoinedPrograms.map((item) => (
                                    <Link key={item.program._id} href={`/programs/${item.program._id}`} className="text-decoration-none">
                                        <div className="card-tertil p-3 d-flex flex-column flex-md-row align-items-md-center gap-3">
                                            <div className="d-flex align-items-center gap-3 flex-grow-1">
                                                <div className="d-flex align-items-center justify-content-center rounded bg-tertil"
                                                    style={{ width: '48px', height: '48px' }}>
                                                    <i className="bi bi-book text-white fs-5"></i>
                                                </div>
                                                <div>
                                                    <h5 className="fw-semibold text-dark mb-0">{item.program.title}</h5>
                                                    <small className="text-muted">{item.myParts.length} kısım aldınız</small>
                                                </div>
                                            </div>
                                            <div className="d-flex align-items-center gap-4">
                                                <div className="text-center">
                                                    <div className="fw-bold text-dark fs-5">{item.completedParts.length}/{item.myParts.length}</div>
                                                    <small className="text-muted">Tamamlanan</small>
                                                </div>
                                                <div style={{ width: '100px' }}>
                                                    <div className="progress-tertil">
                                                        <div className="progress-bar" style={{ width: `${item.myParts.length > 0 ? (item.completedParts.length / item.myParts.length) * 100 : 0}%` }}></div>
                                                    </div>
                                                </div>
                                                <i className="bi bi-chevron-right text-muted"></i>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-5">
                                <div className="rounded-circle bg-light d-inline-flex align-items-center justify-content-center mb-4"
                                    style={{ width: '80px', height: '80px' }}>
                                    <i className="bi bi-people fs-1 text-secondary"></i>
                                </div>
                                <h4 className="fw-semibold text-dark mb-2">Henüz bir programa katılmadınız</h4>
                                <p className="text-muted mb-4">Aktif programlara göz atın ve katılın</p>
                                <Link href="/programs" className="btn btn-tertil">
                                    <i className="bi bi-book me-2"></i>
                                    Programları Keşfet
                                </Link>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
