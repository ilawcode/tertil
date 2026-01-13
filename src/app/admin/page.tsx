'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from '@/context/LocaleContext';
import { format } from 'date-fns';
import { tr as trLocale, enUS } from 'date-fns/locale';

interface Program {
    _id: string;
    title: string;
    description?: string;
    programType: string;
    startDate: string;
    endDate: string;
    dedicatedTo?: string;
    totalParticipants: number;
    targetCount: number;
    status: string;
    isApproved: boolean;
    createdAt: string;
    createdBy?: {
        firstName: string;
        lastName: string;
        email: string;
    };
}

interface AdminData {
    pendingPrograms: Program[];
    allPrograms: Program[];
    stats: {
        pending: number;
        active: number;
        completed: number;
        cancelled: number;
        total: number;
    };
}

export default function AdminPage() {
    const { t, locale } = useLocale();
    const { data: session, status } = useSession();
    const router = useRouter();
    const dateLocale = locale === 'tr' ? trLocale : enUS;

    const [data, setData] = useState<AdminData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/login');
            return;
        }

        if (status === 'authenticated' && session?.user?.role !== 'admin') {
            router.push('/dashboard');
            return;
        }

        if (status === 'authenticated') {
            fetchAdminData();
        }
    }, [status, session, router]);

    const fetchAdminData = async () => {
        try {
            const response = await fetch('/api/admin/programs');
            const result = await response.json();

            if (response.ok) {
                setData(result);
            } else {
                setError(result.error || 'Veri yüklenemedi');
            }
        } catch {
            setError('Bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (programId: string) => {
        setProcessingId(programId);
        setError('');

        try {
            const response = await fetch(`/api/programs/${programId}/approve`, {
                method: 'POST',
            });

            const result = await response.json();

            if (response.ok) {
                setSuccessMessage('Program onaylandı');
                fetchAdminData();
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                setError(result.error || 'Onaylama başarısız');
            }
        } catch {
            setError('Bir hata oluştu');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (programId: string) => {
        if (!confirm(t.admin.rejectConfirm)) return;

        setProcessingId(programId);
        setError('');

        try {
            const response = await fetch(`/api/programs/${programId}/approve`, {
                method: 'DELETE',
            });

            const result = await response.json();

            if (response.ok) {
                setSuccessMessage('Program reddedildi');
                fetchAdminData();
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                setError(result.error || 'Reddetme başarısız');
            }
        } catch {
            setError('Bir hata oluştu');
        } finally {
            setProcessingId(null);
        }
    };

    const getTypeLabel = (type: string) => {
        const types: Record<string, string> = t.programs.types;
        return types[type] || type;
    };

    const getStatusBadge = (status: string) => {
        const configs: Record<string, { label: string; class: string }> = {
            pending: { label: t.programs.statuses.pending, class: 'badge-warning-soft' },
            active: { label: t.programs.statuses.active, class: 'badge-success-soft' },
            completed: { label: t.programs.statuses.completed, class: 'badge-warning-soft' },
            cancelled: { label: t.programs.statuses.cancelled, class: 'badge-danger-soft' },
        };
        return configs[status] || { label: status, class: 'badge-secondary-soft' };
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

    if (session?.user?.role !== 'admin') {
        return (
            <div className="py-5" style={{ minHeight: '60vh' }}>
                <div className="container text-center py-5">
                    <div className="rounded-circle bg-danger d-inline-flex align-items-center justify-content-center mb-4"
                        style={{ width: '80px', height: '80px' }}>
                        <i className="bi bi-shield-x text-white fs-1"></i>
                    </div>
                    <h2 className="fw-bold text-dark mb-3">{t.admin.noPermission}</h2>
                    <Link href="/dashboard" className="btn btn-tertil">
                        Dashboard&apos;a Git
                    </Link>
                </div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="py-5" style={{ background: '#f8fafc', minHeight: '100vh' }}>
            <div className="container">
                {/* Header */}
                <div className="d-flex align-items-center gap-3 mb-4">
                    <div className="d-flex align-items-center justify-content-center rounded bg-primary"
                        style={{ width: '48px', height: '48px' }}>
                        <i className="bi bi-shield-check text-white fs-4"></i>
                    </div>
                    <div>
                        <h1 className="h2 fw-bold text-dark mb-0">{t.admin.title}</h1>
                        <p className="text-muted mb-0">Program onaylama ve yönetim</p>
                    </div>
                </div>

                {/* Messages */}
                {successMessage && (
                    <div className="alert alert-success d-flex align-items-center mb-4">
                        <i className="bi bi-check-circle me-2"></i>
                        {successMessage}
                        <button type="button" className="btn-close ms-auto" onClick={() => setSuccessMessage('')}></button>
                    </div>
                )}

                {error && (
                    <div className="alert alert-danger d-flex align-items-center mb-4">
                        <i className="bi bi-exclamation-circle me-2"></i>
                        {error}
                        <button type="button" className="btn-close ms-auto" onClick={() => setError('')}></button>
                    </div>
                )}

                {/* Stats */}
                <div className="row mb-4 g-3">
                    <div className="col-6 col-lg-3">
                        <div className="stats-card">
                            <div className="icon-wrapper bg-warning">
                                <i className="bi bi-clock text-dark fs-5"></i>
                            </div>
                            <div className="stats-value">{data.stats.pending}</div>
                            <div className="stats-label">{t.admin.pendingPrograms}</div>
                        </div>
                    </div>
                    <div className="col-6 col-lg-3">
                        <div className="stats-card">
                            <div className="icon-wrapper bg-tertil">
                                <i className="bi bi-play-circle text-white fs-5"></i>
                            </div>
                            <div className="stats-value">{data.stats.active}</div>
                            <div className="stats-label">{t.programs.statuses.active}</div>
                        </div>
                    </div>
                    <div className="col-6 col-lg-3">
                        <div className="stats-card">
                            <div className="icon-wrapper bg-success">
                                <i className="bi bi-check-circle text-white fs-5"></i>
                            </div>
                            <div className="stats-value">{data.stats.completed}</div>
                            <div className="stats-label">{t.programs.statuses.completed}</div>
                        </div>
                    </div>
                    <div className="col-6 col-lg-3">
                        <div className="stats-card">
                            <div className="icon-wrapper bg-primary">
                                <i className="bi bi-collection text-white fs-5"></i>
                            </div>
                            <div className="stats-value">{data.stats.total}</div>
                            <div className="stats-label">Toplam Program</div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <ul className="nav nav-tabs mb-4">
                    <li className="nav-item">
                        <button
                            className={`nav-link ${activeTab === 'pending' ? 'active' : ''}`}
                            onClick={() => setActiveTab('pending')}
                        >
                            {t.admin.pendingPrograms}
                            {data.stats.pending > 0 && (
                                <span className="badge bg-warning text-dark ms-2">{data.stats.pending}</span>
                            )}
                        </button>
                    </li>
                    <li className="nav-item">
                        <button
                            className={`nav-link ${activeTab === 'all' ? 'active' : ''}`}
                            onClick={() => setActiveTab('all')}
                        >
                            {t.admin.allPrograms}
                            <span className="badge bg-secondary ms-2">{data.stats.total}</span>
                        </button>
                    </li>
                </ul>

                {/* Pending Programs */}
                {activeTab === 'pending' && (
                    <>
                        {data.pendingPrograms.length > 0 ? (
                            <div className="card-tertil">
                                <div className="table-responsive">
                                    <table className="table table-hover mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                <th>{t.programs.programTitle}</th>
                                                <th>{t.programs.programType}</th>
                                                <th>Oluşturan</th>
                                                <th>Tarihler</th>
                                                <th className="text-center">{t.programs.targetCount}</th>
                                                <th className="text-end">İşlemler</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.pendingPrograms.map((program) => (
                                                <tr key={program._id}>
                                                    <td>
                                                        <div>
                                                            <div className="fw-semibold text-dark">{program.title}</div>
                                                            {program.dedicatedTo && (
                                                                <small className="text-muted fst-italic">
                                                                    <i className="bi bi-heart-fill text-danger me-1"></i>
                                                                    {program.dedicatedTo}
                                                                </small>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className="badge badge-tertil badge-success-soft">
                                                            {getTypeLabel(program.programType)}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="small">
                                                            <div className="fw-medium">{program.createdBy?.firstName} {program.createdBy?.lastName}</div>
                                                            <div className="text-muted">{program.createdBy?.email}</div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="small">
                                                            <div>{format(new Date(program.startDate), 'dd MMM', { locale: dateLocale })}</div>
                                                            <div className="text-muted">{format(new Date(program.endDate), 'dd MMM', { locale: dateLocale })}</div>
                                                        </div>
                                                    </td>
                                                    <td className="text-center">
                                                        <span className="fw-semibold">{program.targetCount}</span>
                                                    </td>
                                                    <td>
                                                        <div className="d-flex gap-2 justify-content-end">
                                                            <Link href={`/programs/${program._id}`} className="btn btn-sm btn-outline-secondary" title="Görüntüle">
                                                                <i className="bi bi-eye"></i>
                                                            </Link>
                                                            <button
                                                                onClick={() => handleApprove(program._id)}
                                                                disabled={processingId === program._id}
                                                                className="btn btn-sm btn-tertil"
                                                                title={t.admin.approve}
                                                            >
                                                                {processingId === program._id ? (
                                                                    <span className="spinner-border spinner-border-sm" role="status"></span>
                                                                ) : (
                                                                    <i className="bi bi-check-lg"></i>
                                                                )}
                                                            </button>
                                                            <button
                                                                onClick={() => handleReject(program._id)}
                                                                disabled={processingId === program._id}
                                                                className="btn btn-sm btn-danger"
                                                                title={t.admin.reject}
                                                            >
                                                                <i className="bi bi-x-lg"></i>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-5">
                                <div className="rounded-circle bg-tertil d-inline-flex align-items-center justify-content-center mb-4"
                                    style={{ width: '80px', height: '80px' }}>
                                    <i className="bi bi-check-lg text-white fs-1"></i>
                                </div>
                                <h4 className="fw-semibold text-dark mb-2">Onay bekleyen program yok</h4>
                                <p className="text-muted">Tüm programlar onaylandı</p>
                            </div>
                        )}
                    </>
                )}

                {/* All Programs */}
                {activeTab === 'all' && (
                    <div className="card-tertil">
                        <div className="table-responsive">
                            <table className="table table-hover mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th>{t.programs.programTitle}</th>
                                        <th>{t.programs.programType}</th>
                                        <th>{t.programs.status}</th>
                                        <th>{t.programs.participants}</th>
                                        <th>Oluşturma</th>
                                        <th className="text-end">İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.allPrograms.map((program) => {
                                        const statusBadge = getStatusBadge(program.status);
                                        return (
                                            <tr key={program._id}>
                                                <td>
                                                    <div>
                                                        <div className="fw-semibold text-dark">{program.title}</div>
                                                        {program.dedicatedTo && (
                                                            <small className="text-muted fst-italic">
                                                                <i className="bi bi-heart-fill text-danger me-1"></i>
                                                                {program.dedicatedTo}
                                                            </small>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="badge badge-tertil badge-success-soft">
                                                        {getTypeLabel(program.programType)}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`badge badge-tertil ${statusBadge.class}`}>
                                                        {statusBadge.label}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="d-flex align-items-center gap-1 text-muted">
                                                        <i className="bi bi-people"></i>
                                                        {program.totalParticipants}
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="small text-muted">
                                                        {format(new Date(program.createdAt), 'dd MMM yyyy', { locale: dateLocale })}
                                                    </span>
                                                </td>
                                                <td className="text-end">
                                                    <Link href={`/programs/${program._id}`} className="btn btn-sm btn-outline-secondary">
                                                        <i className="bi bi-eye"></i>
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
