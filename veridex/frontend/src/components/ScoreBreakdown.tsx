'use client';

import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
import type { ScoreComponents } from '@/types';

interface ScoreBreakdownProps {
  components: ScoreComponents;
}

const COMPONENT_LABELS: Record<keyof ScoreComponents, string> = {
  developer_competence: 'Dev Skills',
  collaboration: 'Collaboration',
  consistency: 'Consistency',
  specialization_depth: 'Specialization',
  activity_recency: 'Activity',
  peer_trust: 'Peer Trust',
};

export default function ScoreBreakdown({ components }: ScoreBreakdownProps) {
  const chartData = Object.entries(components).map(([key, value]) => ({
    component: COMPONENT_LABELS[key as keyof ScoreComponents],
    value,
    fullMark: 100,
  }));

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Score Breakdown</h3>

      {/* Radar Chart */}
      <div className="h-64 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chartData}>
            <PolarGrid stroke="#404040" />
            <PolarAngleAxis
              dataKey="component"
              tick={{ fill: '#A3A3A3', fontSize: 12 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: '#737373', fontSize: 10 }}
            />
            <Radar
              name="Score"
              dataKey="value"
              stroke="#8B5CF6"
              fill="#8B5CF6"
              fillOpacity={0.3}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Component List */}
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(components).map(([key, value]) => (
          <div key={key} className="flex justify-between items-center">
            <span className="text-sm text-worldcoin-gray-400">
              {COMPONENT_LABELS[key as keyof ScoreComponents]}
            </span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-2 bg-worldcoin-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-veridex-primary rounded-full"
                  style={{ width: `${value}%` }}
                />
              </div>
              <span className="text-sm font-medium w-8 text-right">{value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
