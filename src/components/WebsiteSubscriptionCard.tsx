import React from 'react';
import { Check, Sparkles } from 'lucide-react';
import { SubscriptionPlan } from '../types';
import { formatINR } from '../services/api';

interface WebsiteSubscriptionCardProps {
  plan: SubscriptionPlan;
  onSelect: (plan: SubscriptionPlan) => void;
}

const THEME_STYLES: Record<
  string,
  { cardBg: string; border: string; btnBg: string; accentText: string }
> = {
  blue: {
    cardBg: 'bg-[#F4F9FF]',
    border: 'border-sky-200',
    btnBg: 'bg-sky-600 hover:bg-sky-700',
    accentText: 'text-sky-700',
  },
  green: {
    cardBg: 'bg-[#E8F5E9]',
    border: 'border-[#0B8F4D]/30',
    btnBg: 'bg-[#0B8F4D] hover:bg-[#09773F]',
    accentText: 'text-[#0B8F4D]',
  },
  amber: {
    cardBg: 'bg-[#FFF8ED]',
    border: 'border-amber-200',
    btnBg: 'bg-amber-600 hover:bg-amber-700',
    accentText: 'text-amber-700',
  },
  purple: {
    cardBg: 'bg-[#F6F2FF]',
    border: 'border-violet-200',
    btnBg: 'bg-[#123B16] hover:bg-[#0B8F4D]',
    accentText: 'text-violet-700',
  },
};

export function WebsiteSubscriptionCard({ plan, onSelect }: WebsiteSubscriptionCardProps) {
  const style = THEME_STYLES[plan.card_theme] || THEME_STYLES.green;
  const perDay = Math.round(plan.price / Math.max(1, plan.duration_days));

  return (
    <div
      className={`rounded-2xl p-6 border ${style.cardBg} ${style.border} flex flex-col justify-between transition-all duration-200 hover:shadow-md relative`}
    >
      {plan.badge_text ? (
        <span className="absolute top-4 right-4 inline-flex items-center gap-1 bg-[#0B8F4D] text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow-xs">
          <Sparkles className="w-3 h-3" />
          {plan.badge_text}
        </span>
      ) : null}

      <div>
        <p className={`text-xs font-bold uppercase tracking-wider ${style.accentText}`}>
          {plan.subtitle}
        </p>
        <h3 className="text-2xl font-extrabold text-[#202124] mt-1">{plan.name}</h3>

        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-[#202124] font-num">
            {formatINR(plan.price)}
          </span>
          {plan.original_price ? (
            <span className="text-sm text-[#777777] line-through font-num">
              {formatINR(plan.original_price)}
            </span>
          ) : null}
        </div>
        <p className="text-xs text-[#777777] mt-1">
          {plan.price_per_person_label} · Approx.{' '}
          <span className="font-semibold text-[#202124] font-num">{formatINR(perDay)}/day</span>
        </p>

        <div className="mt-5 pt-4 border-t border-black/8 space-y-2.5">
          {plan.meals_included && (
            <p className="text-xs font-semibold text-[#123B16]">
              Meals: <span className="font-normal text-[#202124]">{plan.meals_included}</span>
            </p>
          )}
          <ul className="space-y-2">
            {plan.benefits.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-[#202124] leading-relaxed">
                <Check className="w-4 h-4 text-[#0B8F4D] shrink-0 mt-0.5" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onSelect(plan)}
        className={`mt-6 w-full py-3 px-4 rounded-xl text-white text-sm font-semibold transition-colors shadow-xs ${style.btnBg}`}
      >
        Customize & Subscribe
      </button>
    </div>
  );
}
