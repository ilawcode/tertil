'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/context/LocaleContext';
import {
    User,
    Mail,
    Shield,
    Calendar,
    BookOpen,
    CheckCircle,
    Loader2,
    Save,
} from 'lucide-react';

export default function ProfilePage() {
    const { t } = useLocale();
    const { data: session, status } = useSession();
    const router = useRouter();

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/login');
            return;
        }

        if (status === 'authenticated') {
            setLoading(false);
        }
    }, [status, router]);

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
            </div>
        );
    }

    if (!session) return null;

    return (
        <div className="min-h-screen py-8">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white">{t.profile.title}</h1>
                    <p className="text-secondary-400 mt-1">Hesap bilgilerinizi görüntüleyin</p>
                </div>

                {/* Profile Card */}
                <div className="glass-card p-8">
                    {/* Avatar and Basic Info */}
                    <div className="flex flex-col sm:flex-row items-center gap-6 pb-8 border-b border-secondary-700">
                        <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center">
                            <span className="text-4xl font-bold text-white">
                                {session.user.firstName?.charAt(0)}
                                {session.user.lastName?.charAt(0)}
                            </span>
                        </div>
                        <div className="text-center sm:text-left">
                            <h2 className="text-2xl font-bold text-white">
                                {session.user.firstName} {session.user.lastName}
                            </h2>
                            <p className="text-secondary-400 mt-1">{session.user.email}</p>
                            {session.user.role === 'admin' && (
                                <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-sm font-medium">
                                    <Shield className="w-4 h-4" />
                                    Admin
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-secondary-700 flex items-center justify-center">
                                <User className="w-6 h-6 text-secondary-400" />
                            </div>
                            <div>
                                <p className="text-sm text-secondary-400">{t.auth.firstName}</p>
                                <p className="text-white font-medium">{session.user.firstName}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-secondary-700 flex items-center justify-center">
                                <User className="w-6 h-6 text-secondary-400" />
                            </div>
                            <div>
                                <p className="text-sm text-secondary-400">{t.auth.lastName}</p>
                                <p className="text-white font-medium">{session.user.lastName}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-secondary-700 flex items-center justify-center">
                                <Mail className="w-6 h-6 text-secondary-400" />
                            </div>
                            <div>
                                <p className="text-sm text-secondary-400">{t.auth.email}</p>
                                <p className="text-white font-medium">{session.user.email}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-secondary-700 flex items-center justify-center">
                                <Shield className="w-6 h-6 text-secondary-400" />
                            </div>
                            <div>
                                <p className="text-sm text-secondary-400">Hesap Türü</p>
                                <p className="text-white font-medium capitalize">{session.user.role}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8">
                    <div className="glass-card p-6 text-center">
                        <div className="w-12 h-12 mx-auto rounded-xl gradient-primary flex items-center justify-center mb-4">
                            <BookOpen className="w-6 h-6 text-white" />
                        </div>
                        <p className="text-2xl font-bold text-white">-</p>
                        <p className="text-sm text-secondary-400 mt-1">Başlatılan Program</p>
                    </div>

                    <div className="glass-card p-6 text-center">
                        <div className="w-12 h-12 mx-auto rounded-xl gradient-gold flex items-center justify-center mb-4">
                            <Calendar className="w-6 h-6 text-secondary-900" />
                        </div>
                        <p className="text-2xl font-bold text-white">-</p>
                        <p className="text-sm text-secondary-400 mt-1">Dahil Olunan</p>
                    </div>

                    <div className="glass-card p-6 text-center">
                        <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-4">
                            <CheckCircle className="w-6 h-6 text-white" />
                        </div>
                        <p className="text-2xl font-bold text-white">-</p>
                        <p className="text-sm text-secondary-400 mt-1">Tamamlanan</p>
                    </div>
                </div>

                {/* Coming Soon Notice */}
                <div className="mt-8 p-6 rounded-xl bg-secondary-800/50 border border-secondary-700">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-gold-500/20 flex items-center justify-center flex-shrink-0">
                            <Save className="w-5 h-5 text-gold-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white">Profil Düzenleme</h3>
                            <p className="text-sm text-secondary-400 mt-1">
                                Profil düzenleme ve şifre değiştirme özellikleri yakında eklenecektir.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
