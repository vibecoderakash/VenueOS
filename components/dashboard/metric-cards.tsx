'use client';

import React from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Clock,
  AlertTriangle,
  Users,
  Trophy,
  ArrowUpRight,
} from 'lucide-react';
import { useData } from '@/lib/data-context';

export function MetricCards() {
  const { metrics } = useData();

  const cards = [
    {
      title: 'New Inquiries',
      value: metrics.newLeadsCount,
      subtitle: 'Uncontacted leads',
      icon: Sparkles,
      href: '/leads?status=New',
      color: 'var(--primary)',
      colorSoft: 'var(--primary-soft)',
      alert: false,
    },
    {
      title: 'Due Today',
      value: metrics.dueTodayFollowUpsCount,
      subtitle: 'Scheduled follow-ups',
      icon: Clock,
      href: '/leads?followUp=Today',
      color: 'var(--warning)',
      colorSoft: 'var(--warning-soft)',
      alert: false,
    },
    {
      title: 'Overdue',
      value: metrics.overdueFollowUpsCount,
      subtitle: metrics.overdueFollowUpsCount > 0 ? 'Action needed' : 'All caught up',
      icon: AlertTriangle,
      href: '/leads?followUp=Overdue',
      color: 'var(--danger)',
      colorSoft: 'var(--danger-soft)',
      alert: metrics.overdueFollowUpsCount > 0,
    },
    {
      title: 'Active Leads',
      value: metrics.activeInterestedCount,
      subtitle: 'Interested / contacted',
      icon: Users,
      href: '/leads?status=Interested',
      color: 'var(--primary)',
      colorSoft: 'var(--primary-soft)',
      alert: false,
    },
    {
      title: 'Confirmed',
      value: metrics.convertedCount,
      subtitle: `${metrics.conversionRate}% win rate`,
      icon: Trophy,
      href: '/leads?status=Converted',
      color: 'var(--success)',
      colorSoft: 'var(--success-soft)',
      alert: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <Link
            key={idx}
            href={card.href}
            className="group rounded-[12px] p-4 flex flex-col justify-between transition-all"
            style={{
              backgroundColor: card.alert ? card.colorSoft : 'var(--surface)',
              border: card.alert
                ? '1px solid var(--danger-border)'
                : '1px solid var(--border)',
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-8 h-8 rounded-[8px] flex items-center justify-center"
                  style={{
                    backgroundColor: card.colorSoft,
                  }}
                >
                  <Icon className="w-4 h-4" style={{ color: card.color }} />
                </div>
                <ArrowUpRight
                  className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: 'var(--foreground-muted)' }}
                />
              </div>

              <p className="text-[12px] font-medium" style={{ color: 'var(--foreground-muted)' }}>
                {card.title}
              </p>
              <p
                className="text-[28px] font-bold mt-1 leading-none tracking-tight"
                style={{ color: card.alert ? card.color : 'var(--foreground)' }}
              >
                {card.value}
              </p>
            </div>

            <p
              className="text-[11px] mt-3 pt-2.5"
              style={{
                color: 'var(--foreground-muted)',
                borderTop: '1px solid var(--border)',
              }}
            >
              {card.subtitle}
            </p>
          </Link>
        );
      })}
    </div>
  );
}
