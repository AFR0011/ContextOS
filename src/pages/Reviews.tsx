import { useState } from 'react';
import { formatDistanceToNow, parseISO, format } from 'date-fns';
import { BookOpen, Sunrise, Sunset, Calendar } from 'lucide-react';
import { useStore } from '../store';
import { EmptyState } from '../components/Shared';
import type { ReviewType } from '../types';

const DAILY_STARTUP_Q = [{ key: 'priorities', label: 'What are today\'s top 1-3 priorities?' }];
const DAILY_SHUTDOWN_Q = [
  { key: 'changed', label: 'What changed today?' },
  { key: 'open', label: 'What is still open?' },
  { key: 'resume', label: 'What should be resumed tomorrow?' },
  { key: 'triage', label: 'Any inbox items to triage?' },
];
const WEEKLY_Q = [
  { key: 'outcomes', label: 'What are this week\'s top outcomes?' },
  { key: 'active', label: 'Which projects are active?' },
  { key: 'stale', label: 'Which projects are stale?' },
  { key: 'deadlines', label: 'What deadlines are coming?' },
  { key: 'drop', label: 'What should be dropped, deferred, or blocked?' },
  { key: 'plan', label: 'What should be planned for this week?' },
];

const TYPE_LABEL: Record<string, string> = { 'daily-startup': 'Daily Startup', 'daily-shutdown': 'Daily Shutdown', weekly: 'Weekly Review' };
const TYPE_COLOR: Record<string, string> = { 'daily-startup': 'bg-amber-100 text-amber-800', 'daily-shutdown': 'bg-blue-100 text-blue-800', weekly: 'bg-purple-100 text-purple-800' };

export default function ReviewsPage() {
  const { reviews, addReview } = useStore();
  const [activeReview, setActiveReview] = useState<ReviewType | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const sorted = [...reviews].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const questions = activeReview === 'daily-startup' ? DAILY_STARTUP_Q : activeReview === 'daily-shutdown' ? DAILY_SHUTDOWN_Q : WEEKLY_Q;

  const handleSubmit = () => {
    if (activeReview) { addReview(activeReview, responses); setActiveReview(null); setResponses({}); }
  };

  if (activeReview) return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900">{TYPE_LABEL[activeReview]}</h1>
      <p className="mt-1 text-sm text-gray-500">Take a moment to reflect</p>
      <div className="mt-6 space-y-6">
        {questions.map(q => (
          <div key={q.key}>
            <label className="text-sm font-medium text-gray-700 block mb-2">{q.label}</label>
            <textarea value={responses[q.key] || ''} onChange={e => setResponses(p => ({ ...p, [q.key]: e.target.value }))}
              rows={3} placeholder="Write your thoughts..."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 resize-none" />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-6">
        <button onClick={handleSubmit} className="bg-indigo-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-indigo-700 transition-colors">Save Review</button>
        <button onClick={() => { setActiveReview(null); setResponses({}); }} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
      </div>
    </div>
  );

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
      <p className="mt-1 text-sm text-gray-500">Daily and weekly reflections</p>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {([
          { type: 'daily-startup' as ReviewType, icon: Sunrise, border: 'hover:border-amber-200', text: 'text-amber-500', desc: 'Set today\'s priorities' },
          { type: 'daily-shutdown' as ReviewType, icon: Sunset, border: 'hover:border-blue-200', text: 'text-blue-500', desc: 'Reflect on the day' },
          { type: 'weekly' as ReviewType, icon: Calendar, border: 'hover:border-purple-200', text: 'text-purple-500', desc: 'Plan the week ahead' },
        ]).map(({ type, icon: Icon, border, text, desc }) => (
          <button key={type} onClick={() => { setActiveReview(type); setResponses({}); }}
            className={`bg-white border border-gray-200 rounded-xl p-5 text-left ${border} hover:shadow-sm transition-all`}>
            <Icon className={`w-6 h-6 ${text} mb-2`} />
            <h3 className="text-sm font-semibold text-gray-900">{TYPE_LABEL[type]}</h3>
            <p className="text-xs text-gray-500 mt-1">{desc}</p>
          </button>
        ))}
      </div>
      <div className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Past Reviews</h2>
        <div className="space-y-2">
          {sorted.map(review => (
            <details key={review.id} className="bg-white border border-gray-200 rounded-lg">
              <summary className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50">
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${TYPE_COLOR[review.type]}`}>{TYPE_LABEL[review.type]}</span>
                <span className="text-xs text-gray-400">{format(parseISO(review.date), 'MMM d, yyyy h:mm a')}</span>
                <span className="text-[11px] text-gray-400 ml-auto">{formatDistanceToNow(parseISO(review.createdAt), { addSuffix: true })}</span>
              </summary>
              <div className="px-3 pb-3 space-y-3">
                {Object.entries(review.responses).filter(([, v]) => v).map(([key, value]) => (
                  <div key={key}>
                    <p className="text-xs font-medium text-gray-500 capitalize">{key}</p>
                    <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{value}</p>
                  </div>
                ))}
              </div>
            </details>
          ))}
          {sorted.length === 0 && <EmptyState icon={BookOpen} title="No reviews yet" description="Start your first daily or weekly review" />}
        </div>
      </div>
    </div>
  );
}
