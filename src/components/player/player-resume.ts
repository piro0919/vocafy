import type { QueueItem } from '@/lib/catalog';
import type { PlayContext } from './player-types';

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

/** 戻せる控え。無いか、古いか、形が合わなければ null */
export function readResume(): Resume | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const r = JSON.parse(raw) as Resume;
    if (Date.now() - r.at > RESUME_HOURS * 3600_000) return null;
    if (!Array.isArray(r.queue) || !r.queue[r.index]) return null;
    if (!Array.isArray(r.order) || r.order.length !== r.queue.length) return null;
    return r;
  } catch {
    return null;
  }
}
