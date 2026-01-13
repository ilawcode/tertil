'use client';

import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: LucideIcon;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    gradient?: 'primary' | 'gold' | 'blue' | 'purple';
}

export function StatsCard({
    title,
    value,
    subtitle,
    icon: Icon,
    gradient = 'primary',
}: StatsCardProps) {
    const gradientClasses = {
        primary: 'from-primary-500 to-primary-600',
        gold: 'from-gold-400 to-gold-600',
        blue: 'from-blue-500 to-blue-600',
        purple: 'from-purple-500 to-purple-600',
    };

    return (
        <div className="stats-card">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-secondary-400">{title}</p>
                    <p className="text-3xl font-bold text-white mt-1">{value}</p>
                    {subtitle && (
                        <p className="text-sm text-secondary-500 mt-1">{subtitle}</p>
                    )}
                </div>
                <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradientClasses[gradient]} flex items-center justify-center`}
                >
                    <Icon className="w-6 h-6 text-white" />
                </div>
            </div>
        </div>
    );
}

interface CardProps {
    children: ReactNode;
    className?: string;
    onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
    return (
        <div
            className={`card ${className}`}
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
        >
            {children}
        </div>
    );
}

interface CardHeaderProps {
    title: string;
    description?: string;
    action?: ReactNode;
}

export function CardHeader({ title, description, action }: CardHeaderProps) {
    return (
        <div className="flex items-start justify-between gap-4 card-header">
            <div>
                <h3 className="card-title">{title}</h3>
                {description && <p className="card-description">{description}</p>}
            </div>
            {action && <div>{action}</div>}
        </div>
    );
}
