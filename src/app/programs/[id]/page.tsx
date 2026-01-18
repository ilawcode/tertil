'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from '@/context/LocaleContext';
import { format } from 'date-fns';
import { tr as trLocale, enUS } from 'date-fns/locale';

interface Hizb {
    hizbNumber: number;
    isAssigned: boolean;
    isCompleted: boolean;
    guestName?: string;
    assignedTo?: {
        firstName: string;
    };
}

interface Part {
    partNumber: number;
    partType: string;
    isAssigned: boolean;
    isCompleted: boolean;
    guestName?: string;
    assignedTo?: {
        firstName: string;
    };
    hizbs?: Hizb[];
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

interface MySelection {
    partNumber: number;
    hizbNumber?: number;
    isCompleted: boolean;
}

interface MyParticipation {
    myParts: number[];
    completedParts: number[];
    mySelections?: MySelection[];
}

interface PartSelection {
    partNumber: number;
    hizbNumber?: number;
    isCompleted: boolean;
}

interface Participant {
    name: string;
    maskedName: string;
    selections: PartSelection[];
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
    const [selectedHizbs, setSelectedHizbs] = useState<Record<number, number[]>>({});
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

    // Completion modal state (for program owner)
    const [showCompletionModal, setShowCompletionModal] = useState(false);
    const [completionSearch, setCompletionSearch] = useState('');
    const [completingName, setCompletingName] = useState<string | null>(null);

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

        // Check if sub-parts (hizbs) are taken
        const part = program?.parts.find(p => p.partNumber === partNumber);
        const hasSubPartsTaken = part?.hizbs?.some(h => h.isAssigned || h.isCompleted);

        if (hasSubPartsTaken) {
            setError('Bu cüz parçalı olarak alınmış, lütfen Hizb görünümünden seçim yapın.');
            setTimeout(() => setError(''), 3000);
            setViewMode('hizb');
            return;
        }

        // Toggle selection
        setSelectedParts((prev) => {
            if (prev.includes(partNumber)) {
                return prev.filter((p) => p !== partNumber);
            }
            return [...prev, partNumber];
        });

        // Clear any hizb selection for this part if full part is selected
        setSelectedHizbs(prev => {
            const copy = { ...prev };
            delete copy[partNumber];
            return copy;
        });

        setConflictParts((prev) => prev.filter((p) => p !== partNumber));
    };

    // Handle Hizb selection
    const handleHizbClick = (partNumber: number, hizbNumber: number) => {
        // Find part and hizb logic check
        const part = program?.parts.find(p => p.partNumber === partNumber);
        const hizb = part?.hizbs?.find(h => h.hizbNumber === hizbNumber);

        if (hizb?.isAssigned || hizb?.isCompleted) {
            setError('Bu hizb alınmış');
            setTimeout(() => setError(''), 2000);
            return;
        }

        setSelectedHizbs(prev => {
            const current = prev[partNumber] || [];
            if (current.includes(hizbNumber)) {
                const updated = current.filter(h => h !== hizbNumber);
                if (updated.length === 0) {
                    const copy = { ...prev };
                    delete copy[partNumber];
                    return copy;
                }
                return { ...prev, [partNumber]: updated };
            }
            return { ...prev, [partNumber]: [...current, hizbNumber] };
        });

        // Ensure full part is NOT selected
        if (selectedParts.includes(partNumber)) {
            setSelectedParts(prev => prev.filter(p => p !== partNumber));
        }
    };

    // Join program
    const handleJoin = async (asGuest = false, name = '') => {
        const hasParts = selectedParts.length > 0;
        const hasHizbs = Object.values(selectedHizbs).some(arr => arr.length > 0);

        if (!hasParts && !hasHizbs) {
            setError('Lütfen en az bir kısım seçin');
            return;
        }

        // For non-logged users or guest mode, require name
        if ((asGuest || !session?.user?.id) && !name.trim()) {
            setShowGuestModal(true);
            return;
        }

        setProcessingJoin(true);
        setError('');

        try {
            const selections = [
                ...selectedParts.map(p => ({ partNumber: p })),
                ...Object.entries(selectedHizbs).flatMap(([pNum, hizbs]) =>
                    hizbs.map(h => ({ partNumber: Number(pNum), hizbNumber: h }))
                )
            ];

            const body: { selections: any[]; guestName?: string; participantName?: string } = { selections };

            if (asGuest || !session?.user?.id) {
                body.guestName = name;
            } else if (program?.isCreator && name) {
                // Owner adding participant (proxy) - works for both Public and Private
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
                setSelectedHizbs({});
                setShowGuestModal(false);
                setGuestName('');
                fetchProgram(false);
                setTimeout(() => setSuccessMessage(''), 3000);
            } else if (response.status === 409) {
                setConflictParts(data.conflictParts || []); // This might need mapping back from "Part.Hizb" strings
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

    // Complete my parts/hizbs
    const handleComplete = async () => {
        // Get uncompleted selections from myParticipation.mySelections
        const uncompletedSelections = myParticipation?.mySelections?.filter(s => !s.isCompleted) || [];

        if (uncompletedSelections.length === 0) {
            setError('Tamamlanacak kısım yok');
            return;
        }

        setProcessingComplete(true);
        setError('');

        try {
            const response = await fetch(`/api/programs/${programId}/join`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    selections: uncompletedSelections.map(s => ({
                        partNumber: s.partNumber,
                        hizbNumber: s.hizbNumber
                    }))
                }),
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

    // Mark participant's selections as complete (for program owner)
    const markParticipantComplete = async (participantName: string, selections: PartSelection[]) => {
        if (!program?.isCreator) return;

        const uncompletedSelections = selections.filter(s => !s.isCompleted);
        if (uncompletedSelections.length === 0) {
            setSuccessMessage('Tüm okumalar zaten tamamlanmış');
            setTimeout(() => setSuccessMessage(''), 2000);
            return;
        }

        try {
            const response = await fetch(`/api/programs/${programId}/join`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    selections: uncompletedSelections.map(s => ({
                        partNumber: s.partNumber,
                        hizbNumber: s.hizbNumber
                    })),
                    guestName: participantName, // Pass the guest name so API can identify
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccessMessage(`${participantName} için okumalar tamamlandı!`);
                // Refresh participants list
                fetchParticipants();
                fetchProgram(false);
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                setError(data.error || 'İşlem başarısız');
            }
        } catch {
            setError('Bir hata oluştu');
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

                    const subPartsTaken = part.hizbs?.some(h => h.isAssigned || h.isCompleted);
                    const anyHizbSelected = selectedHizbs[part.partNumber]?.length > 0;

                    let className = 'part-item position-relative';
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
                    } else if (subPartsTaken) {
                        className += ' available';
                        tooltip = 'Parçalı alınmış, seçmek için Hizb görünümüne geçin';
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
                                style={{
                                    ...(isConflict ? { animation: 'shake 0.5s ease-in-out', borderColor: '#ef4444' } : {}),
                                    ...(subPartsTaken && !part.isAssigned ? {
                                        backgroundImage: 'linear-gradient(45deg, #ffffff 25%, #e9ecef 25%, #e9ecef 50%, #ffffff 50%, #ffffff 75%, #e9ecef 75%, #e9ecef 100%)',
                                        backgroundSize: '10px 10px',
                                        color: '#6c757d'
                                    } : {})
                                }}
                            >
                                {part.partNumber}
                                {anyHizbSelected && (
                                    <span className="position-absolute top-0 start-100 translate-middle p-1 bg-success border border-light rounded-circle"
                                        style={{ width: '10px', height: '10px' }}>
                                        <span className="visually-hidden">Selected</span>
                                    </span>
                                )}
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
                                    const hizbData = part.hizbs?.find(h => h.hizbNumber === hizbNumber);
                                    const isHizbAssigned = hizbData?.isAssigned || false;
                                    const isHizbCompleted = hizbData?.isCompleted || false;
                                    const isHizbSelected = selectedHizbs[part.partNumber]?.includes(hizbNumber);

                                    // Visual state logic
                                    // If main part is taken, all hizbs are effectively taken
                                    const isEffectiveTaken = part.isAssigned || part.isCompleted || isHizbAssigned || isHizbCompleted;

                                    return (
                                        <div
                                            key={hizbNumber}
                                            onClick={() => handleHizbClick(part.partNumber, hizbNumber)}
                                            style={{ cursor: isEffectiveTaken ? 'default' : 'pointer' }}
                                            className={`flex-grow-1 rounded text-center py-2 small fw-medium ${part.isCompleted || isHizbCompleted ? 'bg-gold text-dark' :
                                                part.isAssigned || isHizbAssigned ? 'bg-tertil text-white' :
                                                    isHizbSelected ? 'bg-success text-white' :
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

                {/* Messages - Sticky at top */}
                {(successMessage || error) && (
                    <div
                        style={{
                            position: 'sticky',
                            top: '70px',
                            zIndex: 1050,
                            marginBottom: '1rem'
                        }}
                    >
                        {successMessage && (
                            <div className="alert alert-success d-flex align-items-center shadow-sm mb-2">
                                <i className="bi bi-check-circle me-2"></i>
                                {successMessage}
                                <button type="button" className="btn-close ms-auto" onClick={() => setSuccessMessage('')}></button>
                            </div>
                        )}

                        {error && (
                            <div className="alert alert-danger d-flex align-items-center shadow-sm mb-0">
                                <i className="bi bi-exclamation-circle me-2"></i>
                                {error}
                                <button type="button" className="btn-close ms-auto" onClick={() => setError('')}></button>
                            </div>
                        )}
                    </div>
                )}

                <div className="row">
                    {/* Left Column - Program Info */}
                    <div className="col-lg-4 mb-4">
                        <div className="card-tertil p-4" style={{ position: 'sticky', top: '90px', zIndex: 50, maxHeight: 'calc(100vh - 110px)', overflowY: 'auto' }}>
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

                            {/* Participants Button */}
                            <button
                                onClick={() => {
                                    setShowParticipants(true);
                                    fetchParticipants();
                                }}
                                className="btn btn-outline-secondary w-100 mb-3"
                            >
                                <i className="bi bi-people me-2"></i>
                                Katılımcı Listesi
                            </button>

                            {/* Complete Readings Button (only for program owner) */}
                            {program.isCreator && (
                                <button
                                    onClick={() => {
                                        setShowCompletionModal(true);
                                        fetchParticipants();
                                    }}
                                    className="btn btn-success w-100 mb-3"
                                >
                                    <i className="bi bi-check2-all me-2"></i>
                                    Okumaları Tamamla
                                </button>
                            )}

                            {/* Live indicator */}
                            <div className="d-flex align-items-center justify-content-center gap-2 text-muted small">
                                <span className="bg-success rounded-circle" style={{ width: '8px', height: '8px', animation: 'pulse 2s infinite' }}></span>
                                Anlık güncelleme aktif
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Part Selection */}
                    <div className="col-lg-8">

                        {/* Action Buttons - MOVED ABOVE PART SELECTION */}
                        {(() => {
                            const hasParts = selectedParts.length > 0;
                            const hasHizbs = Object.values(selectedHizbs).some(arr => arr.length > 0);
                            const totalHizbCount = Object.values(selectedHizbs).reduce((sum, arr) => sum + arr.length, 0);
                            const hasAnySelection = hasParts || hasHizbs;

                            return hasAnySelection ? (
                                <div className="card-tertil p-4 mb-4" style={{ position: 'sticky', top: '90px', zIndex: 100, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                                    <h5 className="fw-bold text-dark mb-3">
                                        <i className="bi bi-check2-square me-2 text-tertil"></i>
                                        Seçimleriniz
                                    </h5>

                                    {/* Selected Cüzler */}
                                    {hasParts && (
                                        <div className="mb-3">
                                            <div className="d-flex align-items-center justify-content-between mb-2">
                                                <span className="fw-semibold text-muted small">Seçilen Cüzler</span>
                                                <span className="badge bg-tertil">{selectedParts.length} cüz</span>
                                            </div>
                                            <div className="d-flex flex-wrap gap-2">
                                                {selectedParts.sort((a, b) => a - b).map((partNum) => (
                                                    <span key={partNum} className="badge bg-tertil fs-6 py-2 px-3">
                                                        {partNum}. Cüz
                                                        <button
                                                            type="button"
                                                            className="btn-close btn-close-white ms-2"
                                                            style={{ fontSize: '0.6rem' }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedParts(prev => prev.filter(p => p !== partNum));
                                                            }}
                                                        ></button>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Selected Hizbler */}
                                    {hasHizbs && (
                                        <div className="mb-3">
                                            <div className="d-flex align-items-center justify-content-between mb-2">
                                                <span className="fw-semibold text-muted small">Seçilen Hizbler</span>
                                                <span className="badge bg-success">{totalHizbCount} hizb</span>
                                            </div>
                                            <div className="d-flex flex-wrap gap-2">
                                                {Object.entries(selectedHizbs)
                                                    .sort(([a], [b]) => Number(a) - Number(b))
                                                    .map(([partNum, hizbs]) =>
                                                        hizbs.sort((a, b) => a - b).map((hizbNum) => (
                                                            <span key={`${partNum}-${hizbNum}`} className="badge bg-success fs-6 py-2 px-3">
                                                                {partNum}. Cüz - {hizbNum}. Hizb
                                                                <button
                                                                    type="button"
                                                                    className="btn-close btn-close-white ms-2"
                                                                    style={{ fontSize: '0.6rem' }}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedHizbs(prev => {
                                                                            const current = prev[Number(partNum)] || [];
                                                                            const updated = current.filter(h => h !== hizbNum);
                                                                            if (updated.length === 0) {
                                                                                const copy = { ...prev };
                                                                                delete copy[Number(partNum)];
                                                                                return copy;
                                                                            }
                                                                            return { ...prev, [Number(partNum)]: updated };
                                                                        });
                                                                    }}
                                                                ></button>
                                                            </span>
                                                        ))
                                                    )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Owner can add participant name */}
                                    {program.isCreator && (
                                        <div className="mb-3">
                                            <label className="form-label fw-semibold text-muted small">
                                                <i className="bi bi-person-plus me-1"></i>
                                                Katılımcı Adı (opsiyonel)
                                            </label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Ad Soyad girin veya boş bırakın"
                                                value={guestName}
                                                onChange={(e) => setGuestName(e.target.value)}
                                            />
                                            <div className="form-text">Boş bırakırsanız kendiniz için katılım yaparsınız.</div>
                                        </div>
                                    )}

                                    <div className="d-grid gap-2">
                                        <button
                                            onClick={() => {
                                                if (program.isCreator && guestName.trim()) {
                                                    handleJoin(true, guestName);
                                                } else if (!session?.user?.id) {
                                                    setShowGuestModal(true);
                                                } else {
                                                    handleJoin();
                                                }
                                            }}
                                            disabled={processingJoin}
                                            className="btn btn-tertil btn-lg"
                                        >
                                            {processingJoin ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                    Katılınıyor...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-check-lg me-2"></i>
                                                    {program.isCreator && guestName.trim()
                                                        ? `"${guestName}" için Katılımcı Ekle`
                                                        : program.isCreator && !program.isPublic
                                                            ? 'Katılımcı Ekle'
                                                            : 'Programa Katıl'}
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSelectedParts([]);
                                                setSelectedHizbs({});
                                                setGuestName('');
                                            }}
                                            className="btn btn-outline-secondary"
                                        >
                                            <i className="bi bi-x-lg me-2"></i>
                                            Seçimi Temizle
                                        </button>
                                    </div>
                                </div>
                            ) : null;
                        })()}

                        {/* My Participation - Also above selection */}
                        {myParticipation && myParticipation.myParts.length > 0 && (
                            <div className="card-tertil p-4 mb-4">
                                <h5 className="fw-bold text-dark mb-3">
                                    <i className="bi bi-person-check me-2 text-success"></i>
                                    {session ? 'Katılımınız' : 'Misafir Katılımınız'}
                                </h5>
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

                        {/* View Mode Toggle (only for Hatim) - Moved above legend */}
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

                        {/* Empty state - for when nothing is selected and user has no participation */}
                        {selectedParts.length === 0 && Object.values(selectedHizbs).every(arr => arr.length === 0) && (!myParticipation || myParticipation.myParts.length === 0) && (
                            <div className="card-tertil p-4 text-center text-muted">
                                <i className="bi bi-hand-index fs-1 mb-3 d-block text-tertil"></i>
                                <h6 className="fw-semibold">Programa Katılın</h6>
                                <p className="mb-0">Yukarıdan cüz veya hizb seçerek programa katılabilirsiniz.</p>

                                {authStatus === 'unauthenticated' && (
                                    <div className="mt-3">
                                        Hesabınız var mı? <Link href="/auth/login" className="text-tertil fw-bold">Giriş Yapın</Link>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Guest/Participant Name Modal */}
            {showGuestModal && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header border-0">
                                <h5 className="modal-title">
                                    {program.isCreator && !program.isPublic ? 'Katılımcı Ekle' : 'Bilgilerinizi Girin'}
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setShowGuestModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <p className="text-muted mb-3">
                                    {program.isCreator && !program.isPublic
                                        ? 'Bu özel bir program. Ekleyeceğiniz katılımcının adını girin:'
                                        : 'Programa katılmak için adınızı ve soyadınızı girin:'}
                                </p>
                                <input
                                    type="text"
                                    className="form-control form-control-lg mb-3"
                                    placeholder="Ad Soyad"
                                    value={guestName}
                                    onChange={(e) => setGuestName(e.target.value)}
                                    autoFocus
                                />
                                <div className="d-grid">
                                    <button
                                        className="btn btn-tertil btn-lg"
                                        onClick={handleGuestJoin}
                                        disabled={!guestName.trim()}
                                    >
                                        Devam Et
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Participants List Modal */}
            {showParticipants && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content" style={{ maxHeight: '80vh' }}>
                            <div className="modal-header">
                                <h5 className="modal-title">Katılımcı Listesi</h5>
                                <button type="button" className="btn-close" onClick={() => setShowParticipants(false)}></button>
                            </div>
                            <div className="modal-body overflow-auto">
                                {/* Export Buttons */}
                                <div className="d-flex gap-2 mb-3">
                                    <button
                                        className="btn btn-outline-success btn-sm flex-grow-1"
                                        onClick={() => copyToClipboard(exportData.whatsapp, 'WhatsApp')}
                                    >
                                        <i className="bi bi-whatsapp me-2"></i>
                                        WhatsApp İçin Kopyala
                                    </button>
                                    <button
                                        className="btn btn-outline-secondary btn-sm flex-grow-1"
                                        onClick={() => copyToClipboard(exportData.text, 'Metin')}
                                    >
                                        <i className="bi bi-clipboard me-2"></i>
                                        Listeyi Kopyala
                                    </button>
                                </div>

                                {loadingParticipants ? (
                                    <div className="text-center py-4">
                                        <div className="spinner-border text-tertil" role="status"></div>
                                    </div>
                                ) : participants.length === 0 ? (
                                    <p className="text-center text-muted py-4">Henüz katılımcı yok</p>
                                ) : (
                                    <div>
                                        {/* Group by Parts/Hizbs - Show each cuz/hizb separately */}
                                        {(() => {
                                            // Create a map of "partNumber" or "partNumber-hizbNumber" -> participants
                                            const selectionMap: Record<string, { name: string; isCompleted: boolean }[]> = {};

                                            participants.forEach(p => {
                                                p.selections.forEach(sel => {
                                                    const key = sel.hizbNumber
                                                        ? `${sel.partNumber}-${sel.hizbNumber}`
                                                        : `${sel.partNumber}`;
                                                    if (!selectionMap[key]) {
                                                        selectionMap[key] = [];
                                                    }
                                                    selectionMap[key].push({
                                                        name: p.name,
                                                        isCompleted: sel.isCompleted
                                                    });
                                                });
                                            });

                                            // Sort keys
                                            const sortedKeys = Object.keys(selectionMap).sort((a, b) => {
                                                const [aPart, aHizb] = a.split('-').map(Number);
                                                const [bPart, bHizb] = b.split('-').map(Number);
                                                if (aPart !== bPart) return aPart - bPart;
                                                return (aHizb || 0) - (bHizb || 0);
                                            });

                                            return (
                                                <div className="d-flex flex-column gap-2">
                                                    {sortedKeys.map(key => {
                                                        const [partNum, hizbNum] = key.split('-').map(Number);
                                                        const label = hizbNum
                                                            ? `${partNum}. Cüz - ${hizbNum}. Hizb`
                                                            : program.programType === 'hatim' ? `${partNum}. Cüz` : `#${partNum}`;

                                                        return (
                                                            <div key={key} className="border rounded p-3">
                                                                <div className="d-flex align-items-center justify-content-between mb-2">
                                                                    <span className="fw-bold text-tertil">
                                                                        <i className={`bi ${hizbNum ? 'bi-bookmark' : 'bi-book'} me-2`}></i>
                                                                        {label}
                                                                    </span>
                                                                    <span className="badge bg-tertil">
                                                                        {selectionMap[key].length} kişi
                                                                    </span>
                                                                </div>
                                                                <div className="d-flex flex-wrap gap-2">
                                                                    {selectionMap[key].map((participant, idx) => (
                                                                        <span
                                                                            key={idx}
                                                                            className={`badge py-2 px-3 ${participant.isCompleted ? 'bg-success' : 'bg-secondary'}`}
                                                                        >
                                                                            {participant.isCompleted && <i className="bi bi-check-circle me-1"></i>}
                                                                            {participant.name}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })()}

                                        {/* Also show by participant name */}
                                        <hr className="my-4" />
                                        <h6 className="fw-bold mb-3">
                                            <i className="bi bi-people me-2"></i>
                                            Katılımcılara Göre
                                        </h6>
                                        <div className="list-group list-group-flush">
                                            {participants.map((p, idx) => {
                                                const completedCount = p.selections.filter(s => s.isCompleted).length;
                                                const totalCount = p.selections.length;

                                                return (
                                                    <div key={idx} className="list-group-item px-0 py-3">
                                                        <div className="d-flex justify-content-between align-items-center">
                                                            <div>
                                                                <h6 className="mb-1 fw-semibold">{p.name}</h6>
                                                                <div className="d-flex flex-wrap gap-1 mt-1">
                                                                    {p.selections.map((sel, selIdx) => {
                                                                        const label = sel.hizbNumber
                                                                            ? `${sel.partNumber}. Cüz ${sel.hizbNumber}. Hizb`
                                                                            : program.programType === 'hatim' ? `${sel.partNumber}. Cüz` : `#${sel.partNumber}`;
                                                                        return (
                                                                            <span
                                                                                key={selIdx}
                                                                                className={`badge ${sel.isCompleted ? 'bg-success' : 'bg-tertil'}`}
                                                                            >
                                                                                {label}
                                                                                {sel.isCompleted && <i className="bi bi-check ms-1"></i>}
                                                                            </span>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                {completedCount === totalCount ? (
                                                                    <span className="badge bg-success-soft text-success">
                                                                        <i className="bi bi-check-circle me-1"></i>
                                                                        Tamamlandı
                                                                    </span>
                                                                ) : (
                                                                    <span className="badge bg-warning-soft text-warning">
                                                                        <i className="bi bi-hourglass-split me-1"></i>
                                                                        {completedCount}/{totalCount}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Completion Modal (for program owner) */}
            {showCompletionModal && program.isCreator && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content" style={{ maxHeight: '80vh' }}>
                            <div className="modal-header bg-success text-white">
                                <h5 className="modal-title">
                                    <i className="bi bi-check2-all me-2"></i>
                                    Okuma Tamamlama
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close btn-close-white"
                                    onClick={() => {
                                        setShowCompletionModal(false);
                                        setCompletionSearch('');
                                        setCompletingName(null);
                                    }}
                                ></button>
                            </div>
                            <div className="modal-body overflow-auto">
                                {/* Search Input */}
                                <div className="mb-4">
                                    <div className="input-group">
                                        <span className="input-group-text">
                                            <i className="bi bi-search"></i>
                                        </span>
                                        <input
                                            type="text"
                                            className="form-control form-control-lg"
                                            placeholder="Cüz numarası veya isim ile ara..."
                                            value={completionSearch}
                                            onChange={(e) => setCompletionSearch(e.target.value)}
                                            autoFocus
                                        />
                                        {completionSearch && (
                                            <button
                                                className="btn btn-outline-secondary"
                                                onClick={() => setCompletionSearch('')}
                                            >
                                                <i className="bi bi-x"></i>
                                            </button>
                                        )}
                                    </div>
                                    <div className="form-text">
                                        💡 "2" yazarak 2. cüzü, "duygu" yazarak Duygu'yu filtreleyebilirsiniz
                                    </div>
                                </div>

                                {loadingParticipants ? (
                                    <div className="text-center py-4">
                                        <div className="spinner-border text-success" role="status"></div>
                                    </div>
                                ) : (
                                    (() => {
                                        // Flatten all selections from all participants
                                        const allSelections: {
                                            participantName: string;
                                            selection: PartSelection;
                                            key: string;
                                        }[] = [];

                                        participants.forEach(p => {
                                            p.selections.forEach(sel => {
                                                allSelections.push({
                                                    participantName: p.name,
                                                    selection: sel,
                                                    key: `${p.name}-${sel.partNumber}-${sel.hizbNumber || 0}`
                                                });
                                            });
                                        });

                                        // Filter based on search
                                        const searchLower = completionSearch.toLowerCase().trim();
                                        const filtered = allSelections.filter(item => {
                                            if (!searchLower) return true;

                                            // Check if search is a number (cuz search)
                                            const searchNum = parseInt(searchLower);
                                            if (!isNaN(searchNum)) {
                                                return item.selection.partNumber === searchNum;
                                            }

                                            // Otherwise search by name
                                            return item.participantName.toLowerCase().includes(searchLower);
                                        });

                                        // Sort: uncompleted first, then by part number
                                        filtered.sort((a, b) => {
                                            if (a.selection.isCompleted !== b.selection.isCompleted) {
                                                return a.selection.isCompleted ? 1 : -1;
                                            }
                                            if (a.selection.partNumber !== b.selection.partNumber) {
                                                return a.selection.partNumber - b.selection.partNumber;
                                            }
                                            return (a.selection.hizbNumber || 0) - (b.selection.hizbNumber || 0);
                                        });

                                        const uncompletedCount = filtered.filter(f => !f.selection.isCompleted).length;

                                        return (
                                            <>
                                                <div className="d-flex justify-content-between align-items-center mb-3">
                                                    <span className="text-muted">
                                                        {filtered.length} sonuç bulundu
                                                    </span>
                                                    {uncompletedCount > 0 && (
                                                        <span className="badge bg-warning">
                                                            {uncompletedCount} tamamlanmamış
                                                        </span>
                                                    )}
                                                </div>

                                                {filtered.length === 0 ? (
                                                    <div className="text-center text-muted py-4">
                                                        <i className="bi bi-search fs-1 d-block mb-2"></i>
                                                        Sonuç bulunamadı
                                                    </div>
                                                ) : (
                                                    <div className="list-group">
                                                        {filtered.map(item => {
                                                            const label = item.selection.hizbNumber
                                                                ? `${item.selection.partNumber}. Cüz - ${item.selection.hizbNumber}. Hizb`
                                                                : `${item.selection.partNumber}. Cüz`;

                                                            const isCompleting = completingName === item.key;

                                                            return (
                                                                <div
                                                                    key={item.key}
                                                                    className={`list-group-item d-flex justify-content-between align-items-center ${item.selection.isCompleted ? 'bg-light' : ''}`}
                                                                >
                                                                    <div>
                                                                        <div className="d-flex align-items-center gap-2">
                                                                            <i className={`bi ${item.selection.hizbNumber ? 'bi-bookmark' : 'bi-book'} text-tertil`}></i>
                                                                            <span className="fw-semibold">{label}</span>
                                                                        </div>
                                                                        <small className="text-muted">{item.participantName}</small>
                                                                    </div>
                                                                    <div>
                                                                        {item.selection.isCompleted ? (
                                                                            <span className="badge bg-success">
                                                                                <i className="bi bi-check-circle me-1"></i>
                                                                                Tamamlandı
                                                                            </span>
                                                                        ) : (
                                                                            <button
                                                                                className="btn btn-success btn-sm"
                                                                                disabled={isCompleting}
                                                                                onClick={async () => {
                                                                                    setCompletingName(item.key);
                                                                                    await markParticipantComplete(
                                                                                        item.participantName,
                                                                                        [item.selection]
                                                                                    );
                                                                                    setCompletingName(null);
                                                                                }}
                                                                            >
                                                                                {isCompleting ? (
                                                                                    <span className="spinner-border spinner-border-sm"></span>
                                                                                ) : (
                                                                                    <>
                                                                                        <i className="bi bi-check-lg me-1"></i>
                                                                                        Tamamla
                                                                                    </>
                                                                                )}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
