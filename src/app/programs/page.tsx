'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useLocale } from '@/context/LocaleContext';
import { ProgramCard } from '@/components/ProgramCard';
import { useSession } from 'next-auth/react';

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
}

function ProgramsContent() {
    const { t } = useLocale();
    const { status } = useSession();
    const searchParams = useSearchParams();

    const [programs, setPrograms] = useState<Program[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filter, setFilter] = useState({
        status: searchParams.get('status') || 'active',
        type: searchParams.get('type') || 'all',
        search: '',
    });

    useEffect(() => {
        const fetchPrograms = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams({
                    status: filter.status,
                    page: page.toString(),
                    limit: '12',
                });
                if (filter.type !== 'all') {
                    params.append('type', filter.type);
                }

                const response = await fetch(`/api/programs?${params}`);
                const data = await response.json();

                setPrograms(data.programs || []);
                setTotalPages(data.totalPages || 1);
            } catch (error) {
                console.error('Error fetching programs:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPrograms();
    }, [filter, page]);

    const programTypes = [
        { value: 'all', label: t.common.all },
        { value: 'hatim', label: t.programs.types.hatim },
        { value: 'yasin', label: t.programs.types.yasin },
        { value: 'ihlas', label: t.programs.types.ihlas },
        { value: 'fatiha', label: t.programs.types.fatiha },
        { value: 'fetih', label: t.programs.types.fetih },
        { value: 'custom', label: t.programs.types.custom },
    ];

    const statusOptions = [
        { value: 'active', label: t.programs.statuses.active },
        { value: 'completed', label: t.programs.statuses.completed },
        { value: 'all', label: t.common.all },
    ];

    const filteredPrograms = programs.filter((program) => {
        if (!filter.search) return true;
        return (
            program.title.toLowerCase().includes(filter.search.toLowerCase()) ||
            program.dedicatedTo?.toLowerCase().includes(filter.search.toLowerCase())
        );
    });

    return (
        <div className="py-5" style={{ background: '#f8fafc', minHeight: '100vh' }}>
            <div className="container">
                {/* Header */}
                <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
                    <div>
                        <h1 className="h2 fw-bold text-dark mb-1">{t.programs.title}</h1>
                        <p className="text-muted mb-0">
                            Kuran okuma programlarına katılın veya yeni program oluşturun
                        </p>
                    </div>
                    {status === 'authenticated' && (
                        <Link href="/programs/create" className="btn btn-tertil">
                            <i className="bi bi-plus-lg me-2"></i>
                            {t.programs.createProgram}
                        </Link>
                    )}
                </div>

                {/* Filters */}
                <div className="card-tertil p-3 mb-4">
                    <div className="row g-3">
                        <div className="col-md-6">
                            <div className="input-group">
                                <span className="input-group-text bg-white border-end-0">
                                    <i className="bi bi-search text-muted"></i>
                                </span>
                                <input
                                    type="text"
                                    className="form-control form-control-tertil border-start-0"
                                    placeholder={t.common.search}
                                    value={filter.search}
                                    onChange={(e) => setFilter((prev) => ({ ...prev, search: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="col-md-3">
                            <select
                                className="form-select form-control-tertil"
                                value={filter.type}
                                onChange={(e) => {
                                    setFilter((prev) => ({ ...prev, type: e.target.value }));
                                    setPage(1);
                                }}
                            >
                                {programTypes.map((type) => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-3">
                            <select
                                className="form-select form-control-tertil"
                                value={filter.status}
                                onChange={(e) => {
                                    setFilter((prev) => ({ ...prev, status: e.target.value }));
                                    setPage(1);
                                }}
                            >
                                {statusOptions.map((s) => (
                                    <option key={s.value} value={s.value}>
                                        {s.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Programs Grid */}
                {loading ? (
                    <div className="row g-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="col-md-6 col-lg-4">
                                <div className="card-tertil p-4">
                                    <div className="skeleton mb-3" style={{ height: '48px', width: '48px', borderRadius: '12px' }} />
                                    <div className="skeleton mb-2" style={{ height: '20px', width: '60%' }} />
                                    <div className="skeleton mb-3" style={{ height: '16px', width: '80%' }} />
                                    <div className="skeleton" style={{ height: '8px', width: '100%' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredPrograms.length > 0 ? (
                    <>
                        <div className="row g-4">
                            {filteredPrograms.map((program) => (
                                <div key={program._id} className="col-md-6 col-lg-4">
                                    <ProgramCard program={program} />
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <nav className="mt-5">
                                <ul className="pagination justify-content-center">
                                    <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                                        <button
                                            className="page-link"
                                            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                                        >
                                            <i className="bi bi-chevron-left me-1"></i>
                                            {t.common.previous}
                                        </button>
                                    </li>
                                    <li className="page-item disabled">
                                        <span className="page-link">{page} / {totalPages}</span>
                                    </li>
                                    <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                                        <button
                                            className="page-link"
                                            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                                        >
                                            {t.common.next}
                                            <i className="bi bi-chevron-right ms-1"></i>
                                        </button>
                                    </li>
                                </ul>
                            </nav>
                        )}
                    </>
                ) : (
                    <div className="text-center py-5">
                        <div className="rounded-circle bg-light d-inline-flex align-items-center justify-content-center mb-4"
                            style={{ width: '80px', height: '80px' }}>
                            <i className="bi bi-book fs-1 text-secondary"></i>
                        </div>
                        <h4 className="fw-semibold text-dark mb-2">
                            {t.programs.noPrograms}
                        </h4>
                        <p className="text-muted mb-4">{t.programs.createFirst}</p>
                        {status === 'authenticated' && (
                            <Link href="/programs/create" className="btn btn-tertil">
                                <i className="bi bi-plus-lg me-2"></i>
                                {t.programs.createProgram}
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ProgramsPage() {
    return (
        <Suspense
            fallback={
                <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
                    <div className="spinner-border text-tertil" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            }
        >
            <ProgramsContent />
        </Suspense>
    );
}
