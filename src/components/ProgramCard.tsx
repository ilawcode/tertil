'use client';

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
    completedParts: number;
    parts: Array<{
        partNumber: number;
        partType: string;
        isAssigned: boolean;
        isCompleted: boolean;
    }>;
    status: string;
}

interface ProgramCardProps {
    program: Program;
}

export function ProgramCard({ program }: ProgramCardProps) {
    const { t, locale } = useLocale();
    const dateLocale = locale === 'tr' ? trLocale : enUS;

    const getTypeLabel = (type: string) => {
        const types: Record<string, string> = t.programs.types;
        return types[type] || type;
    };

    const getTypeColor = (type: string) => {
        const colors: Record<string, string> = {
            hatim: 'bg-tertil',
            yasin: 'bg-gold',
            ihlas: 'bg-primary',
            fatiha: 'bg-info',
            fetih: 'bg-danger',
            custom: 'bg-secondary',
        };
        return colors[type] || 'bg-secondary';
    };

    const getStatusBadge = (status: string) => {
        const configs: Record<string, { label: string; class: string }> = {
            active: { label: t.programs.statuses.active, class: 'badge-success-soft' },
            completed: { label: t.programs.statuses.completed, class: 'badge-warning-soft' },
            pending: { label: t.programs.statuses.pending, class: 'badge-warning-soft' },
            cancelled: { label: t.programs.statuses.cancelled, class: 'badge-danger-soft' },
        };
        return configs[status] || { label: status, class: 'badge-secondary-soft' };
    };

    const assignedParts = program.parts.filter(p => p.isAssigned).length;
    const completedParts = program.parts.filter(p => p.isCompleted).length;
    const totalParts = program.parts.length;
    const fillPercentage = totalParts > 0 ? Math.round((assignedParts / totalParts) * 100) : 0;
    const completionPercentage = totalParts > 0 ? Math.round((completedParts / totalParts) * 100) : 0;
    const statusBadge = getStatusBadge(program.status);

    return (
        <Link href={`/programs/${program._id}`} className="text-decoration-none">
            <div className="program-card">
                {/* Header */}
                <div className="d-flex align-items-start justify-content-between gap-2 mb-3">
                    <div className="d-flex align-items-center gap-3">
                        <div className={`d-flex align-items-center justify-content-center rounded ${getTypeColor(program.programType)}`}
                            style={{ width: '48px', height: '48px', flexShrink: 0 }}>
                            <i className="bi bi-book text-white fs-5"></i>
                        </div>
                        <div>
                            <div className="card-type">{getTypeLabel(program.programType)}</div>
                            <h5 className="card-title mb-0">{program.title}</h5>
                        </div>
                    </div>
                    <span className={`badge badge-tertil ${statusBadge.class}`} style={{ flexShrink: 0 }}>
                        {statusBadge.label}
                    </span>
                </div>

                {/* Dedication */}
                {program.dedicatedTo && (
                    <p className="d-flex align-items-center gap-2 text-muted small mb-3 fst-italic">
                        <i className="bi bi-heart-fill text-danger"></i>
                        <span className="text-truncate">{program.dedicatedTo}</span>
                    </p>
                )}

                {/* Progress Bars */}
                <div className="mb-3">
                    {/* Fill Rate - Doluluk */}
                    <div className="mb-2">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="small text-muted d-flex align-items-center gap-1">
                                <i className="bi bi-people-fill"></i> Doluluk
                            </span>
                            <span className="small fw-semibold">{fillPercentage}%</span>
                        </div>
                        <div className="progress" style={{ height: '6px' }}>
                            <div
                                className="progress-bar"
                                style={{
                                    width: `${fillPercentage}%`,
                                    background: 'linear-gradient(90deg, #059669, #10b981)'
                                }}
                            ></div>
                        </div>
                    </div>

                    {/* Completion Rate - Tamamlanma */}
                    <div>
                        <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="small text-muted d-flex align-items-center gap-1">
                                <i className="bi bi-check-circle-fill"></i> Tamamlanma
                            </span>
                            <span className="small fw-semibold">{completionPercentage}%</span>
                        </div>
                        <div className="progress" style={{ height: '6px' }}>
                            <div
                                className="progress-bar"
                                style={{
                                    width: `${completionPercentage}%`,
                                    background: 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                                }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="d-flex align-items-center gap-3 pt-3 border-top small text-muted">
                    <div className="d-flex align-items-center gap-1">
                        <i className="bi bi-people"></i>
                        <span>{program.totalParticipants}</span>
                    </div>
                    <div className="d-flex align-items-center gap-1">
                        <i className="bi bi-check-circle"></i>
                        <span>{completedParts}/{totalParts}</span>
                    </div>
                    <div className="d-flex align-items-center gap-1 ms-auto">
                        <i className="bi bi-calendar"></i>
                        <span>{format(new Date(program.endDate), 'dd MMM', { locale: dateLocale })}</span>
                    </div>
                </div>
            </div>
        </Link>
    );
}
