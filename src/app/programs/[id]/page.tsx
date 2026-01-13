'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from '@/context/LocaleContext';
import { format } from 'date-fns';
import { tr as trLocale, enUS } from 'date-fns/locale';

interface Part {
    partNumber: number;
    partType: string;
    isAssigned: boolean;
    isCompleted: boolean;
    guestName?: string;
    assignedTo?: {
        firstName: string;
    };
}

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
    partType: string;
    status: string;
    isApproved: boolean;
    isPublic: boolean;
    isCreator: boolean;
    parts: Part[];
    createdBy?: {
        firstName: string;
        lastName: string;
    };
}

interface MyParticipation {
    myParts: number[];
    completedParts: number[];
}

interface Participant {
    name: string;
    maskedName: string;
    parts: number[];
    completedParts: number[];
    isGuest: boolean;
}

export default function ProgramDetailPage() {
    const { t, locale } = useLocale();
    const { data: session, status: authStatus } = useSession();
    const params = useParams();
    const dateLocale = locale === 'tr' ? trLocale : enUS;
    const programId = params.id as string;

    const [program, setProgram] = useState<Program | null>(null);
    const [myParticipation, setMyParticipation] = useState<MyParticipation | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedParts, setSelectedParts] = useState<number[]>([]);
    const [viewMode, setViewMode] = useState<'cuz' | 'hizb'>('cuz');
    const [processingJoin, setProcessingJoin] = useState(false);
    const [processingComplete, setProcessingComplete] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [conflictParts, setConflictParts] = useState<number[]>([]);
    const lastFetchRef = useRef<number>(0);

    // Guest join state
    const [showGuestModal, setShowGuestModal] = useState(false);
    const [guestName, setGuestName] = useState('');

    // Participants modal state
    const [showParticipants, setShowParticipants] = useState(false);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [exportData, setExportData] = useState({ text: '', whatsapp: '' });
    const [loadingParticipants, setLoadingParticipants] = useState(false);

    // Fetch program data
    const fetchProgram = useCallback(async (showLoading = true) => {
        if (showLoading) setLoading(true);

        try {
            const response = await fetch(`/api/programs/${programId}`);
            const data = await response.json();

            if (response.ok) {
                setProgram(data.program);
                setMyParticipation(data.myParticipation);
                lastFetchRef.current = Date.now();
            } else {
                setError(data.error || 'Program yüklenemedi');
            }
        } catch {
            setError('Bir hata oluştu');
        } finally {
            if (showLoading) setLoading(false);
        }
    }, [programId]);

    // Initial fetch
    useEffect(() => {
        fetchProgram();
    }, [fetchProgram]);

    // Polling for real-time updates (every 3 seconds)
    useEffect(() => {
        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                fetchProgram(false);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [fetchProgram]);

    // Handle part selection
    const handlePartClick = (partNumber: number, isAssigned: boolean, isCompleted: boolean, isMyPart: boolean) => {
        // Can't select completed or other's parts
        if (isCompleted || (isAssigned && !isMyPart)) {
            if (isAssigned && !isMyPart) {
                setError('Bu kısım başka biri tarafından seçilmiş');
                setTimeout(() => setError(''), 3000);
            }
            return;
        }

        // If it's my part, don't allow deselection from here
        if (isMyPart) return;

        // Toggle selection
        setSelectedParts((prev) => {
            if (prev.includes(partNumber)) {
                return prev.filter((p) => p !== partNumber);
            }
            return [...prev, partNumber];
        });
        setConflictParts((prev) => prev.filter((p) => p !== partNumber));
    };

    // Join program (for logged-in users)
    const handleJoin = async (asGuest = false, name = '') => {
        if (selectedParts.length === 0) {
            setError('Lütfen en az bir kısım seçin');
            return;
        }

        // For non-logged users or guest mode, require name
        if ((asGuest || !session?.user?.id) && !name.trim()) {
            setShowGuestModal(true);
            return;
        }

        // Check for conflicts before joining
        const currentAssigned = program?.parts.filter(p => p.isAssigned && !myParticipation?.myParts.includes(p.partNumber)).map(p => p.partNumber) || [];
        const conflicts = selectedParts.filter(p => currentAssigned.includes(p));

        if (conflicts.length > 0) {
            setConflictParts(conflicts);
            setError(`${conflicts.length} kısım başkası tarafından seçilmiş. Lütfen sayfayı yenileyin.`);
            fetchProgram(false);
            return;
        }

        setProcessingJoin(true);
        setError('');

        try {
            const body: { parts: number[]; guestName?: string; participantName?: string } = { parts: selectedParts };

            if (asGuest || !session?.user?.id) {
                body.guestName = name;
            } else if (program?.isCreator && !program?.isPublic && name) {
                // Owner adding participant to private program
                body.participantName = name;
            }

            const response = await fetch(`/api/programs/${programId}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccessMessage('Başarıyla katıldınız!');
                setSelectedParts([]);
                setShowGuestModal(false);
                setGuestName('');
                fetchProgram(false);
                setTimeout(() => setSuccessMessage(''), 3000);
            } else if (response.status === 409) {
                setConflictParts(data.conflictParts || selectedParts);
                setError(data.error || 'Seçtiğiniz bazı kısımlar başkası tarafından alınmış');
                fetchProgram(false);
            } else {
                setError(data.error || 'Katılım başarısız');
            }
        } catch {
            setError('Bir hata oluştu');
        } finally {
            setProcessingJoin(false);
        }
    };

    // Guest join handler
    const handleGuestJoin = () => {
        if (!guestName.trim()) {
            setError('Lütfen ad ve soyad girin');
            return;
        }
        handleJoin(true, guestName);
    };

    // Fetch participants
    const fetchParticipants = async () => {
        setLoadingParticipants(true);
        try {
            const response = await fetch(`/api/programs/${programId}/participants`);
            const data = await response.json();
            if (response.ok) {
                setParticipants(data.participants);
                setExportData(data.exportData);
            }
        } catch {
            console.error('Error fetching participants');
        } finally {
            setLoadingParticipants(false);
        }
    };

    // Copy to clipboard
    const copyToClipboard = (text: string, type: string) => {
        navigator.clipboard.writeText(text);
        setSuccessMessage(`${type} formatında kopyalandı!`);
        setTimeout(() => setSuccessMessage(''), 2000);
    };

    // Complete my parts
    const handleComplete = async () => {
        const uncompletedParts = myParticipation?.myParts.filter(p => !myParticipation.completedParts.includes(p)) || [];

        if (uncompletedParts.length === 0) {
            setError('Tamamlanacak kısım yok');
            return;
        }

        setProcessingComplete(true);
        setError('');

        try {
            const response = await fetch(`/api/programs/${programId}/join`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ parts: uncompletedParts }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccessMessage('Okumalarınız tamamlandı!');
                fetchProgram(false);
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                setError(data.error || 'İşlem başarısız');
            }
        } catch {
            setError('Bir hata oluştu');
        } finally {
            setProcessingComplete(false);
        }
    };

    // Calculate stats
    const calculateStats = () => {
        if (!program) return { assigned: 0, completed: 0, available: 0, total: 0, percentage: 0 };

        const assigned = program.parts.filter(p => p.isAssigned).length;
        const completed = program.parts.filter(p => p.isCompleted).length;
        const available = program.parts.length - assigned;
        const total = program.parts.length;
        const percentage = total > 0 ? Math.round((assigned / total) * 100) : 0;

        return { assigned, completed, available, total, percentage };
    };

    const stats = calculateStats();

    // Render Cuz Grid
    const renderCuzGrid = () => {
        if (!program) return null;

        return (
            <div className="row g-2">
                {program.parts.map((part) => {
                    const isMyPart = myParticipation?.myParts.includes(part.partNumber) || false;
                    const isMyCompleted = myParticipation?.completedParts.includes(part.partNumber) || false;
                    const isConflict = conflictParts.includes(part.partNumber);
                    const isSelected = selectedParts.includes(part.partNumber);

                    let className = 'part-item';
                    let tooltip = '';

                    if (part.isCompleted) {
                        className += ' completed';
                        tooltip = `Tamamlandı - ${part.assignedTo?.firstName || 'Anonim'}`;
                    } else if (isMyPart) {
                        className += isMyCompleted ? ' completed' : ' my-part';
                        tooltip = 'Sizin kısmınız';
                    } else if (part.isAssigned) {
                        className += ' taken';
                        tooltip = `Alınmış - ${part.assignedTo?.firstName || 'Anonim'}`;
                    } else if (isSelected) {
                        className += ' selected';
                        tooltip = 'Seçildi';
                    } else {
                        className += ' available';
                        tooltip = 'Seçilebilir';
                    }

                    if (isConflict) {
                        className += ' conflict';
                    }

                    return (
                        <div key={part.partNumber} className="col-2 col-sm-1">
                            <div
                                className={className}
                                onClick={() => handlePartClick(part.partNumber, part.isAssigned, part.isCompleted, isMyPart)}
                                title={tooltip}
                                style={isConflict ? { animation: 'shake 0.5s ease-in-out', borderColor: '#ef4444' } : {}}
                            >
                                {part.partNumber}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // Render Hizb Grid (for Hatim)
    const renderHizbGrid = () => {
        if (!program || program.programType !== 'hatim') return null;

        return (
            <div className="d-flex flex-column gap-2">
                {program.parts.map((part) => {
                    const isMyPart = myParticipation?.myParts.includes(part.partNumber) || false;
                    const isMyCompleted = myParticipation?.completedParts.includes(part.partNumber) || false;
                    const isSelected = selectedParts.includes(part.partNumber);

                    return (
                        <div key={part.partNumber} className="card-tertil p-3">
                            <div className="d-flex align-items-center justify-content-between mb-2">
                                <div className="d-flex align-items-center gap-2">
                                    <span className="fw-bold">{part.partNumber}. Cüz</span>
                                    {part.isCompleted && (
                                        <span className="badge badge-tertil badge-success-soft">
                                            <i className="bi bi-check-circle me-1"></i>Tamamlandı
                                        </span>
                                    )}
                                    {isMyPart && !isMyCompleted && (
                                        <span className="badge badge-tertil badge-warning-soft">Sizin</span>
                                    )}
                                    {part.isAssigned && !isMyPart && !part.isCompleted && (
                                        <span className="badge badge-tertil badge-secondary-soft">
                                            Alınmış - {part.assignedTo?.firstName || 'Anonim'}
                                        </span>
                                    )}
                                </div>
                                {!part.isAssigned && (
                                    <button
                                        className={`btn btn-sm ${isSelected ? 'btn-tertil' : 'btn-outline-success'}`}
                                        onClick={() => handlePartClick(part.partNumber, part.isAssigned, part.isCompleted, isMyPart)}
                                    >
                                        {isSelected ? (
                                            <><i className="bi bi-check me-1"></i>Seçildi</>
                                        ) : (
                                            <><i className="bi bi-plus me-1"></i>Seç</>
                                        )}
                                    </button>
                                )}
                            </div>

                            {/* Hizb indicators - Each cüz has 4 hizb (1-4) */}
                            <div className="d-flex gap-1">
                                {[1, 2, 3, 4].map((hizbNumber) => {
                                    const isFilled = part.isAssigned || part.isCompleted;

                                    return (
                                        <div
                                            key={hizbNumber}
                                            className={`flex-grow-1 rounded text-center py-2 small fw-medium ${part.isCompleted ? 'bg-gold text-dark' :
                                                isFilled ? 'bg-tertil text-white' :
                                                    isSelected ? 'bg-success bg-opacity-25 text-success' : 'bg-light text-muted'
                                                }`}
                                        >
                                            {hizbNumber}. Hizb
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
                <div className="spinner-border text-tertil" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    if (!program) {
        return (
            <div className="py-5 text-center">
                <div className="container">
                    <h2 className="fw-bold text-dark mb-3">Program bulunamadı</h2>
                    <Link href="/programs" className="btn btn-tertil">
                        Programlara Dön
                    </Link>
                </div>
            </div>
        );
    }

    const getTypeLabel = (type: string) => {
        const types: Record<string, string> = t.programs.types;
        return types[type] || type;
    };

    return (
        <div className="py-5" style={{ background: '#f8fafc', minHeight: '100vh' }}>
            <div className="container">
                {/* Back Link */}
                <Link href="/programs" className="btn btn-link text-muted p-0 mb-4 text-decoration-none">
                    <i className="bi bi-arrow-left me-2"></i>
                    {t.common.back}
                </Link>

                {/* Messages */}
                {successMessage && (
                    <div className="alert alert-success d-flex align-items-center mb-4">
                        <i className="bi bi-check-circle me-2"></i>
                        {successMessage}
                    </div>
                )}

                {error && (
                    <div className="alert alert-danger d-flex align-items-center mb-4">
                        <i className="bi bi-exclamation-circle me-2"></i>
                        {error}
                        <button type="button" className="btn-close ms-auto" onClick={() => setError('')}></button>
                    </div>
                )}

                <div className="row">
                    {/* Left Column - Program Info */}
                    <div className="col-lg-4 mb-4">
                        <div className="card-tertil p-4 sticky-lg-top" style={{ top: '80px' }}>
                            {/* Program Header */}
                            <div className="d-flex align-items-center gap-3 mb-4">
                                <div className="d-flex align-items-center justify-content-center rounded bg-tertil"
                                    style={{ width: '56px', height: '56px' }}>
                                    <i className="bi bi-book text-white fs-4"></i>
                                </div>
                                <div>
                                    <span className="badge badge-tertil badge-success-soft mb-1">
                                        {getTypeLabel(program.programType)}
                                    </span>
                                    <h2 className="h4 fw-bold text-dark mb-0">{program.title}</h2>
                                </div>
                            </div>

                            {/* Dedication */}
                            {program.dedicatedTo && (
                                <div className="alert alert-light d-flex align-items-center mb-4">
                                    <i className="bi bi-heart-fill text-danger me-2"></i>
                                    <span className="fst-italic">{program.dedicatedTo}</span>
                                </div>
                            )}

                            {/* Description */}
                            {program.description && (
                                <p className="text-muted mb-4">{program.description}</p>
                            )}

                            {/* Info */}
                            <div className="d-flex flex-column gap-2 mb-4">
                                <div className="d-flex justify-content-between">
                                    <span className="text-muted">Başlangıç</span>
                                    <span className="fw-medium">{format(new Date(program.startDate), 'dd MMM yyyy', { locale: dateLocale })}</span>
                                </div>
                                <div className="d-flex justify-content-between">
                                    <span className="text-muted">Bitiş</span>
                                    <span className="fw-medium">{format(new Date(program.endDate), 'dd MMM yyyy', { locale: dateLocale })}</span>
                                </div>
                                <div className="d-flex justify-content-between">
                                    <span className="text-muted">Katılımcı</span>
                                    <span className="fw-medium">{program.totalParticipants} kişi</span>
                                </div>
                                <div className="d-flex justify-content-between">
                                    <span className="text-muted">Oluşturan</span>
                                    <span className="fw-medium">{program.createdBy?.firstName} {program.createdBy?.lastName}</span>
                                </div>
                            </div>

                            {/* Progress */}
                            <div className="mb-4">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="fw-semibold">Doluluk Durumu</span>
                                    <span className="fw-bold text-tertil">{stats.percentage}%</span>
                                </div>
                                <div className="progress-tertil mb-2" style={{ height: '12px' }}>
                                    <div className="progress-bar" style={{ width: `${stats.percentage}%` }}></div>
                                </div>
                                <div className="d-flex justify-content-between small text-muted">
                                    <span>{stats.assigned} / {stats.total} seçildi</span>
                                    <span>{stats.completed} tamamlandı</span>
                                </div>
                            </div>

                            {/* Live indicator */}
                            <div className="d-flex align-items-center justify-content-center gap-2 text-muted small">
                                <span className="bg-success rounded-circle" style={{ width: '8px', height: '8px', animation: 'pulse 2s infinite' }}></span>
                                Anlık güncelleme aktif
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Part Selection */}
                    <div className="col-lg-8">
                        {/* View Mode Toggle (only for Hatim) */}
                        {program.programType === 'hatim' && (
                            <div className="btn-group mb-4 w-100">
                                <button
                                    className={`btn ${viewMode === 'cuz' ? 'btn-tertil' : 'btn-outline-secondary'}`}
                                    onClick={() => setViewMode('cuz')}
                                >
                                    <i className="bi bi-grid me-2"></i>
                                    Cüz Görünümü
                                </button>
                                <button
                                    className={`btn ${viewMode === 'hizb' ? 'btn-tertil' : 'btn-outline-secondary'}`}
                                    onClick={() => setViewMode('hizb')}
                                >
                                    <i className="bi bi-list me-2"></i>
                                    Hizb Detaylı Görünüm
                                </button>
                            </div>
                        )}

                        {/* Legend */}
                        <div className="card-tertil p-3 mb-4">
                            <div className="d-flex flex-wrap gap-3 small">
                                <div className="d-flex align-items-center gap-2">
                                    <div className="rounded" style={{ width: '20px', height: '20px', background: '#f1f5f9' }}></div>
                                    <span>Seçilebilir</span>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                    <div className="rounded" style={{ width: '20px', height: '20px', background: '#059669' }}></div>
                                    <span>Seçildi</span>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                    <div className="rounded" style={{ width: '20px', height: '20px', background: '#e2e8f0' }}></div>
                                    <span>Alınmış</span>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                    <div className="rounded" style={{ width: '20px', height: '20px', background: 'linear-gradient(135deg, #f59e0b, #fbbf24)' }}></div>
                                    <span>Tamamlandı</span>
                                </div>
                                {myParticipation && myParticipation.myParts.length > 0 && (
                                    <div className="d-flex align-items-center gap-2">
                                        <div className="rounded border border-2 border-success" style={{ width: '20px', height: '20px', background: '#059669' }}></div>
                                        <span>Sizin Kısımlarınız</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Parts Grid */}
                        <div className="card-tertil p-4 mb-4">
                            <h5 className="fw-bold text-dark mb-4">
                                {program.programType === 'hatim' ? 'Cüz Seçimi' : 'Kısım Seçimi'}
                            </h5>

                            {program.programType === 'hatim' && viewMode === 'hizb' ? (
                                renderHizbGrid()
                            ) : (
                                renderCuzGrid()
                            )}
                        </div>

                        {/* Action Buttons */}
                        {authStatus === 'authenticated' ? (
                            <div className="card-tertil p-4">
                                {/* Show join button if user has selected parts */}
                                {selectedParts.length > 0 && (
                                    <div className="mb-4">
                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                            <span className="fw-semibold">Seçilen Kısımlar</span>
                                            <span className="badge bg-tertil">{selectedParts.length} adet</span>
                                        </div>
                                        <div className="d-flex flex-wrap gap-2 mb-3">
                                            {selectedParts.sort((a, b) => a - b).map((partNum) => (
                                                <span key={partNum} className="badge bg-tertil">
                                                    {program.programType === 'hatim' ? `${partNum}. Cüz` : `#${partNum}`}
                                                </span>
                                            ))}
                                        </div>
                                        <button
                                            onClick={handleJoin}
                                            disabled={processingJoin}
                                            className="btn btn-tertil btn-lg w-100"
                                        >
                                            {processingJoin ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                    Katılınıyor...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-check-lg me-2"></i>
                                                    Programa Katıl
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}

                                {/* Show my participation */}
                                {myParticipation && myParticipation.myParts.length > 0 && (
                                    <div>
                                        <h5 className="fw-bold text-dark mb-3">Katılımınız</h5>
                                        <div className="alert alert-success d-flex align-items-center mb-3">
                                            <i className="bi bi-check-circle me-2"></i>
                                            Bu programda {myParticipation.myParts.length} kısım aldınız.
                                            ({myParticipation.completedParts.length} tamamlandı)
                                        </div>

                                        {myParticipation.myParts.some(p => !myParticipation.completedParts.includes(p)) && (
                                            <button
                                                onClick={handleComplete}
                                                disabled={processingComplete}
                                                className="btn btn-gold btn-lg w-100"
                                            >
                                                {processingComplete ? (
                                                    <>
                                                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                        İşleniyor...
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="bi bi-check-all me-2"></i>
                                                        Tüm Okumalarımı Tamamla
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Empty state */}
                                {selectedParts.length === 0 && (!myParticipation || myParticipation.myParts.length === 0) && (
                                    <div className="text-center text-muted py-3">
                                        <i className="bi bi-hand-index fs-3 mb-2 d-block"></i>
                                        <span>Yukarıdan kısımları seçerek programa katılabilirsiniz</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="card-tertil p-4 text-center">
                                <p className="text-muted mb-3">Programa katılmak için giriş yapın</p>
                                <Link href="/auth/login" className="btn btn-tertil">
                                    <i className="bi bi-box-arrow-in-right me-2"></i>
                                    Giriş Yap
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* CSS for animations */}
            <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .conflict {
          animation: shake 0.5s ease-in-out;
          border-color: #ef4444 !important;
        }
      `}</style>
        </div>
    );
}
