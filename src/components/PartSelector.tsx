'use client';

import { useState } from 'react';
import { useLocale } from '@/context/LocaleContext';
import { Check } from 'lucide-react';

interface PartSelectorProps {
    parts: Array<{
        partNumber: number;
        partType: string;
        isAssigned: boolean;
        isCompleted: boolean;
        isMyPart?: boolean;
    }>;
    onSelect?: (selectedParts: number[]) => void;
    onComplete?: (parts: number[], completed: boolean) => void;
    mode: 'select' | 'complete' | 'view';
    maxSelection?: number;
}

export function PartSelector({
    parts,
    onSelect,
    onComplete,
    mode,
    maxSelection,
}: PartSelectorProps) {
    const { t } = useLocale();
    const [selectedParts, setSelectedParts] = useState<number[]>([]);

    const handlePartClick = (partNumber: number) => {
        const part = parts.find((p) => p.partNumber === partNumber);
        if (!part) return;

        if (mode === 'select') {
            // Only allow selecting available parts
            if (part.isAssigned) return;

            setSelectedParts((prev) => {
                const isSelected = prev.includes(partNumber);
                let newSelection: number[];

                if (isSelected) {
                    newSelection = prev.filter((p) => p !== partNumber);
                } else {
                    if (maxSelection && prev.length >= maxSelection) {
                        return prev;
                    }
                    newSelection = [...prev, partNumber];
                }

                onSelect?.(newSelection);
                return newSelection;
            });
        } else if (mode === 'complete' && part.isMyPart) {
            // Toggle completion status
            onComplete?.([partNumber], !part.isCompleted);
        }
    };

    const getPartClass = (part: (typeof parts)[0]) => {
        const baseClass = 'part-item';

        if (part.isCompleted) {
            return `${baseClass} completed`;
        }

        if (part.isMyPart) {
            if (mode === 'complete') {
                return `${baseClass} my-part cursor-pointer hover:opacity-80`;
            }
            return `${baseClass} my-part`;
        }

        if (mode === 'select') {
            if (part.isAssigned) {
                return `${baseClass} taken`;
            }
            if (selectedParts.includes(part.partNumber)) {
                return `${baseClass} selected`;
            }
            return `${baseClass} available`;
        }

        if (part.isAssigned) {
            return `${baseClass} taken`;
        }

        return `${baseClass} available`;
    };

    const availableCount = parts.filter((p) => !p.isAssigned).length;
    const takenCount = parts.filter((p) => p.isAssigned && !p.isCompleted).length;
    const completedCount = parts.filter((p) => p.isCompleted).length;

    return (
        <div className="space-y-4">
            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-secondary-700" />
                    <span className="text-secondary-400">
                        {t.programs.availableParts}: {availableCount}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-secondary-800 opacity-60" />
                    <span className="text-secondary-400">
                        {t.programs.takenParts}: {takenCount}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded gradient-gold" />
                    <span className="text-secondary-400">
                        {t.programs.statuses.completed}: {completedCount}
                    </span>
                </div>
                {mode === 'select' && (
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded gradient-primary" />
                        <span className="text-secondary-400">
                            {t.programs.selectedParts}: {selectedParts.length}
                        </span>
                    </div>
                )}
            </div>

            {/* Parts Grid */}
            <div className="parts-grid">
                {parts.map((part) => (
                    <div
                        key={part.partNumber}
                        onClick={() => handlePartClick(part.partNumber)}
                        className={getPartClass(part)}
                        title={`${part.partType === 'cuz' ? t.programs.partTypes.cuz : part.partType === 'hizb' ? t.programs.partTypes.hizb : t.programs.partTypes.piece} ${part.partNumber}`}
                    >
                        {part.isCompleted ? (
                            <Check className="w-5 h-5" />
                        ) : (
                            part.partNumber
                        )}
                    </div>
                ))}
            </div>

            {/* Selection Summary */}
            {mode === 'select' && selectedParts.length > 0 && (
                <div className="p-4 rounded-lg bg-primary-500/10 border border-primary-500/30">
                    <p className="text-sm text-primary-400">
                        <strong>{t.programs.selectedParts}:</strong>{' '}
                        {selectedParts.sort((a, b) => a - b).join(', ')}
                    </p>
                </div>
            )}
        </div>
    );
}
