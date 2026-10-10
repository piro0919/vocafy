import type { QueueItem } from '@/lib/catalog';
import type { PlayContext } from './player-types';
import { HOUR_MS } from '@/lib/timing';

/**
 * 読み込み直したり開き直したりしたときに、前に流していた曲を止まった状態で戻すための控え（2026-10-11 に本人と決めた）。
 * 並び・何曲目か・流す順・どこまで聴いたか・並びの種類を、このブラウザの localStorage に残す。
 * 最後に聴いてから RESUME_HOURS 時間を過ぎたものは戻さない（久しぶりに開いたときに、前の曲が居座らないように）
 */
const KEY = 'vocafy-resume';
const RESUME_HOURS = 12;

export type Resume = {
  queue: QueueItem[];
  index: number;
  order: number[];
  /** その曲のどこまで聴いたか（秒）と、曲の長さ */
  position: number;
  duration: number;
  context: PlayContext;
  listSource: string | null;
  radioHome: string | null;
  /** 残した時刻（Date.now()） */
  at: number;
};

export function saveResume(resume: Omit<Resume, 'at'>) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...resume, at: Date.now() }));
  } catch {
    // 残せない窓では戻さない
  }
}

export function clearResume() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // 残せない窓では何もしない
  }
}

/** 戻せる控え。無いか、古いか、形が合わないか、設定で切っていれば null */
export function readResume(): Resume | null {
  if (!resumeEnabled()) return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const r = JSON.parse(raw) as Resume;
    if (Date.now() - r.at > RESUME_HOURS * HOUR_MS) return null;
    if (!Array.isArray(r.queue) || !r.queue[r.index]) return null;
    if (!Array.isArray(r.order) || r.order.length !== r.queue.length) return null;
    return r;
  } catch {
    return null;
  }
}

/**
 * 設定の「前回の続きから始める」（2026-10-11 に本人と決めた）。前の曲と、アプリから開いたときの前回の画面（page-restore.tsx）を
 * まとめて切り替える。はじめはオンで、切ったときだけ OFF_KEY を残す
 */
const OFF_KEY = 'vocafy-resume-off';
const CHANGE_EVENT = 'vocafy-resume-change';

export function resumeEnabled(): boolean {
  try {
    return localStorage.getItem(OFF_KEY) !== '1';
  } catch {
    return true;
  }
}

export function setResumeEnabled(on: boolean) {
  try {
    if (on) localStorage.removeItem(OFF_KEY);
    else localStorage.setItem(OFF_KEY, '1');
  } catch {
    // 残せない窓では、この画面のあいだだけ効く
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeResume(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

/** 最後に見ていた画面（住所）の控え。アプリから開いたときに、RESUME_HOURS 時間以内ならそこから始める（page-restore.tsx） */
const PAGE_KEY = 'vocafy-last-page';

export function saveLastPage(path: string) {
  try {
    localStorage.setItem(PAGE_KEY, JSON.stringify({ path, at: Date.now() }));
  } catch {
    // 残せない窓では戻さない
  }
}

export function readLastPage(): string | null {
  if (!resumeEnabled()) return null;
  try {
    const raw = localStorage.getItem(PAGE_KEY);
    if (!raw) return null;
    const { path, at } = JSON.parse(raw) as { path: string; at: number };
    if (Date.now() - at > RESUME_HOURS * HOUR_MS) return null;
    return typeof path === 'string' && path.startsWith('/') ? path : null;
  } catch {
    return null;
  }
}
