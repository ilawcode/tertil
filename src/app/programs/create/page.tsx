'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useLocale } from '@/context/LocaleContext';
import Link from 'next/link';

export default function CreateProgramPage() {
    const { t } = useLocale();
    const router = useRouter();
    const { data: session, status } = useSession();

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        programType: 'hatim',
        customType: '',
        startDate: '',
        endDate: '',
        targetCount: 30,
        partType: 'cuz',
        dedicatedTo: '',
        isPublic: true,
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    if (status === 'unauthenticated') {
        router.push('/auth/login');
        return null;
    }

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));

        if (name === 'programType') {
            let targetCount = 30;
            let partType = 'cuz';

            switch (value) {
                case 'hatim':
                    targetCount = 30;
                    partType = 'cuz';
                    break;
                case 'yasin':
                    targetCount = 41;
                    partType = 'piece';
                    break;
                case 'ihlas':
                    targetCount = 1000;
                    partType = 'piece';
                    break;
                case 'fatiha':
                    targetCount = 100;
                    partType = 'piece';
                    break;
                case 'fetih':
                    targetCount = 48;
                    partType = 'piece';
                    break;
                default:
                    targetCount = 30;
                    partType = 'piece';
            }

            setFormData((prev) => ({ ...prev, targetCount, partType }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const start = new Date(formData.startDate);
        const end = new Date(formData.endDate);
        if (start >= end) {
            setError('Bitiş tarihi başlangıç tarihinden sonra olmalıdır');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/programs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Program oluşturulamadı');
                return;
            }

            setSuccess(true);
            setTimeout(() => {
                router.push('/dashboard');
            }, 2000);
        } catch {
            setError('Bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        const isAdmin = session?.user?.role === 'admin';
        return (
            <div className="py-5" style={{ background: '#f8fafc', minHeight: '100vh' }}>
                <div className="container">
                    <div className="row justify-content-center">
                        <div className="col-md-6 text-center py-5">
                            <div className="rounded-circle bg-tertil d-inline-flex align-items-center justify-content-center mb-4"
                                style={{ width: '80px', height: '80px' }}>
                                <i className="bi bi-check-lg text-white fs-1"></i>
                            </div>
                            <h2 className="fw-bold text-dark mb-3">Program Oluşturuldu!</h2>
                            <p className="text-muted mb-4">
                                {isAdmin
                                    ? 'Programınız onaylandı ve yayında.'
                                    : 'Programınız admin onayı bekliyor.'}
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

    if (status === 'loading') {
        return (
            <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
                <div className="spinner-border text-tertil" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="py-5" style={{ background: '#f8fafc', minHeight: '100vh' }}>
            <div className="container">
                <div className="row justify-content-center">
                    <div className="col-lg-8">
                        {/* Back Link */}
                        <Link href="/programs" className="btn btn-link text-muted p-0 mb-4 text-decoration-none">
                            <i className="bi bi-arrow-left me-2"></i>
                            {t.common.back}
                        </Link>

                        {/* Header */}
                        <div className="mb-4">
                            <h1 className="h2 fw-bold text-dark mb-1">{t.programs.createProgram}</h1>
                            <p className="text-muted mb-0">Yeni bir kuran okuma programı oluşturun</p>
                        </div>

                        {/* Form Card */}
                        <div className="card-tertil p-4 p-md-5">
                            <form onSubmit={handleSubmit}>
                                {/* Error Alert */}
                                {error && (
                                    <div className="alert alert-danger d-flex align-items-center mb-4">
                                        <i className="bi bi-exclamation-circle me-2"></i>
                                        {error}
                                    </div>
                                )}

                                {/* Program Type */}
                                <div className="mb-4">
                                    <label className="form-label-tertil">
                                        {t.programs.programType} <span className="text-danger">*</span>
                                    </label>
                                    <select
                                        name="programType"
                                        value={formData.programType}
                                        onChange={handleChange}
                                        className="form-select form-control-tertil"
                                        required
                                    >
                                        <option value="hatim">{t.programs.types.hatim}</option>
                                        <option value="yasin">{t.programs.types.yasin}</option>
                                        <option value="ihlas">{t.programs.types.ihlas}</option>
                                        <option value="fatiha">{t.programs.types.fatiha}</option>
                                        <option value="fetih">{t.programs.types.fetih}</option>
                                        <option value="custom">{t.programs.types.custom}</option>
                                    </select>
                                </div>

                                {/* Custom Type */}
                                {formData.programType === 'custom' && (
                                    <div className="mb-4">
                                        <label className="form-label-tertil">
                                            Program Adı <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="customType"
                                            value={formData.customType}
                                            onChange={handleChange}
                                            className="form-control form-control-tertil"
                                            placeholder="Örn: Tebâreke Suresi"
                                            required
                                        />
                                    </div>
                                )}

                                {/* Title */}
                                <div className="mb-4">
                                    <label className="form-label-tertil">
                                        {t.programs.programTitle} <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleChange}
                                        className="form-control form-control-tertil"
                                        placeholder="Örn: 3 Aylar Hatmi, Ramazan Hatmi"
                                        required
                                    />
                                </div>

                                {/* Dedicated To */}
                                <div className="mb-4">
                                    <label className="form-label-tertil">{t.programs.dedicatedTo}</label>
                                    <div className="input-group">
                                        <span className="input-group-text bg-white">
                                            <i className="bi bi-heart text-danger"></i>
                                        </span>
                                        <input
                                            type="text"
                                            name="dedicatedTo"
                                            value={formData.dedicatedTo}
                                            onChange={handleChange}
                                            className="form-control form-control-tertil"
                                            placeholder={t.programs.dedicatedToPlaceholder}
                                        />
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="mb-4">
                                    <label className="form-label-tertil">{t.programs.description}</label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        className="form-control form-control-tertil"
                                        rows={3}
                                        placeholder="Program hakkında detaylı bilgi..."
                                    />
                                </div>

                                {/* Dates */}
                                <div className="row mb-4">
                                    <div className="col-md-6 mb-3 mb-md-0">
                                        <label className="form-label-tertil">
                                            {t.programs.startDate} <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            name="startDate"
                                            value={formData.startDate}
                                            onChange={handleChange}
                                            className="form-control form-control-tertil"
                                            required
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label-tertil">
                                            {t.programs.endDate} <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            name="endDate"
                                            value={formData.endDate}
                                            onChange={handleChange}
                                            className="form-control form-control-tertil"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Target Count & Part Type */}
                                <div className="row mb-4">
                                    <div className="col-md-6 mb-3 mb-md-0">
                                        <label className="form-label-tertil">
                                            {t.programs.targetCount} <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            name="targetCount"
                                            value={formData.targetCount}
                                            onChange={handleChange}
                                            className="form-control form-control-tertil"
                                            min="1"
                                            max="10000"
                                            required
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label-tertil">
                                            {t.programs.partType} <span className="text-danger">*</span>
                                        </label>
                                        <select
                                            name="partType"
                                            value={formData.partType}
                                            onChange={handleChange}
                                            className="form-select form-control-tertil"
                                            required
                                        >
                                            <option value="cuz">{t.programs.partTypes.cuz}</option>
                                            <option value="hizb">{t.programs.partTypes.hizb}</option>
                                            <option value="piece">{t.programs.partTypes.piece}</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Public Toggle */}
                                <div className="form-check mb-4">
                                    <input
                                        type="checkbox"
                                        name="isPublic"
                                        checked={formData.isPublic}
                                        onChange={handleChange}
                                        className="form-check-input"
                                        id="isPublic"
                                    />
                                    <label className="form-check-label" htmlFor="isPublic">
                                        Bu programa herkes katılabilsin
                                    </label>
                                </div>

                                {/* Info Box */}
                                {session?.user?.role !== 'admin' && (
                                    <div className="alert alert-warning d-flex align-items-start mb-4">
                                        <i className="bi bi-info-circle me-2 mt-1"></i>
                                        <div>
                                            <strong>Not:</strong> Programınız admin onayından sonra yayınlanacaktır.
                                        </div>
                                    </div>
                                )}

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn btn-tertil btn-lg w-100"
                                >
                                    {loading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                            {t.common.loading}
                                        </>
                                    ) : (
                                        <>
                                            <i className="bi bi-plus-lg me-2"></i>
                                            {t.programs.createProgram}
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
