'use client';

import Link from 'next/link';
import { useLocale } from '@/context/LocaleContext';
import { useEffect, useState } from 'react';
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
}

export default function HomePage() {
  const { t } = useLocale();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activePrograms: 0,
    totalParticipants: 0,
    completedPrograms: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/programs?status=active&limit=6');
        const data = await response.json();
        setPrograms(data.programs || []);

        const activeCount = data.total || 0;
        const participants = (data.programs || []).reduce(
          (acc: number, p: Program) => acc + p.totalParticipants,
          0
        );

        const completedResponse = await fetch('/api/programs?status=completed&limit=1');
        const completedData = await completedResponse.json();

        setStats({
          activePrograms: activeCount,
          totalParticipants: participants,
          completedPrograms: completedData.total || 0,
        });
      } catch (error) {
        console.error('Error fetching programs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <>
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container position-relative" style={{ zIndex: 1 }}>
          <div className="row justify-content-center">
            <div className="col-lg-8 text-center">
              {/* Bismillah */}
              <p className="arabic-text fs-2 text-tertil mb-4" style={{ opacity: 0.8 }}>
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
              </p>

              <h1 className="display-3 fw-bold mb-3">
                <span className="gradient-text">Tertil</span>
              </h1>
              <h2 className="h1 fw-semibold text-dark mb-4">
                Kuran Okuma Programları
              </h2>
              <p className="lead text-secondary mb-5" style={{ maxWidth: '600px', margin: '0 auto' }}>
                Hatim, Yasin, İhlas ve daha fazlası için okuma programları oluşturun,
                paylaşın ve toplulukla birlikte okuyun.
              </p>

              <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center">
                <Link href="/programs" className="btn btn-tertil btn-lg">
                  <i className="bi bi-stars me-2"></i>
                  Programları Keşfet
                </Link>
                <Link href="/auth/register" className="btn btn-gold btn-lg">
                  Hemen Başla
                  <i className="bi bi-arrow-right ms-2"></i>
                </Link>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="row mt-5 pt-4">
            <div className="col-md-4 mb-3 mb-md-0">
              <div className="stats-card">
                <div className="icon-wrapper bg-tertil">
                  <i className="bi bi-book text-white fs-4"></i>
                </div>
                <div className="stats-value">{stats.activePrograms}</div>
                <div className="stats-label">{t.dashboard.activePrograms}</div>
              </div>
            </div>
            <div className="col-md-4 mb-3 mb-md-0">
              <div className="stats-card">
                <div className="icon-wrapper bg-gold">
                  <i className="bi bi-people text-dark fs-4"></i>
                </div>
                <div className="stats-value">{stats.totalParticipants}</div>
                <div className="stats-label">{t.programs.participants}</div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="stats-card">
                <div className="icon-wrapper bg-primary">
                  <i className="bi bi-check-circle text-white fs-4"></i>
                </div>
                <div className="stats-value">{stats.completedPrograms}</div>
                <div className="stats-label">{t.dashboard.completedPrograms}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-5 bg-white">
        <div className="container py-4">
          <div className="text-center mb-5">
            <h2 className="display-6 fw-bold text-dark mb-3">Nasıl Çalışır?</h2>
            <p className="text-secondary" style={{ maxWidth: '600px', margin: '0 auto' }}>
              Tertil ile kuran okuma programları oluşturmak ve katılmak çok kolay.
            </p>
          </div>

          <div className="row g-4">
            <div className="col-md-4">
              <div className="feature-card h-100">
                <div className="icon-wrapper bg-tertil">
                  <i className="bi bi-book"></i>
                </div>
                <h4 className="fw-bold text-dark mb-3">{t.programs.types.hatim}</h4>
                <p className="text-secondary mb-0">
                  Cüz veya hizb bazında hatim programları oluşturun ve toplulukla birlikte tamamlayın.
                </p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="feature-card h-100">
                <div className="icon-wrapper bg-gold">
                  <i className="bi bi-star"></i>
                </div>
                <h4 className="fw-bold text-dark mb-3">41 Yasin & 1000 İhlas</h4>
                <p className="text-secondary mb-0">
                  Özel günler için Yasin, İhlas ve diğer surelerin toplu okuma programlarını düzenleyin.
                </p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="feature-card h-100">
                <div className="icon-wrapper bg-danger">
                  <i className="bi bi-heart"></i>
                </div>
                <h4 className="fw-bold text-dark mb-3">{t.programs.forDeceased}</h4>
                <p className="text-secondary mb-0">
                  Vefat eden yakınlarınız için kuran okuma programları oluşturun ve sevaplarını bağışlayın.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Active Programs */}
      <section className="py-5" style={{ background: '#f8fafc' }}>
        <div className="container py-4">
          <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between mb-4">
            <div className="mb-3 mb-md-0">
              <h2 className="h3 fw-bold text-dark mb-1">{t.dashboard.activePrograms}</h2>
              <p className="text-secondary mb-0">Şu anda devam eden programlara katılın</p>
            </div>
            <Link href="/programs" className="btn btn-outline-secondary">
              Tümünü Gör
              <i className="bi bi-chevron-right ms-1"></i>
            </Link>
          </div>

          {loading ? (
            <div className="row g-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="col-md-4">
                  <div className="card-tertil p-4">
                    <div className="skeleton mb-3" style={{ height: '24px', width: '120px' }} />
                    <div className="skeleton mb-2" style={{ height: '16px', width: '100%' }} />
                    <div className="skeleton mb-3" style={{ height: '16px', width: '75%' }} />
                    <div className="skeleton" style={{ height: '8px', width: '100%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : programs.length > 0 ? (
            <div className="row g-4">
              {programs.map((program) => (
                <div key={program._id} className="col-md-4">
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
              <h4 className="fw-semibold text-dark mb-2">{t.programs.noPrograms}</h4>
              <p className="text-secondary mb-4">{t.programs.createFirst}</p>
              <Link href="/programs/create" className="btn btn-tertil">
                <i className="bi bi-plus-lg me-2"></i>
                {t.programs.createProgram}
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container text-center">
          <h2 className="display-6 fw-bold mb-4">Haydi Birlikte Okuyalım</h2>
          <p className="lead mb-5" style={{ maxWidth: '600px', margin: '0 auto', opacity: 0.9 }}>
            Kuran-ı Kerim okuma programlarına katılın, sevdikleriniz için dua edin
            ve topluluğun bir parçası olun.
          </p>
          <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center">
            <Link href="/auth/register" className="btn btn-light btn-lg fw-semibold text-tertil">
              Ücretsiz Kayıt Ol
            </Link>
            <Link href="/programs" className="btn btn-outline-light btn-lg">
              Programları İncele
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
