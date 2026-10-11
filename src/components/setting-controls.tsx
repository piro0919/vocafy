import { type ReactNode, useId } from 'react';
import { Heading, SECTION } from './heading';

/** 選ぶ行・切り替える行の形（指を乗せたときに地が出る） */
const ROW =
  'flex cursor-pointer gap-3 rounded-md px-3 py-2.5 transition-colors duration-react hover:bg-hover';

/**
 * 設定の画面の1つの区画。見出しはほかの画面の区画と同じ部品。first は画面の一番上の区画（上に余白を取らない）。
 * children が見出しの id を受け取ると、ラジオの組の名前に使える（aria-labelledby）
 */
export function SettingSection({
  eyebrow,
  title,
  first = false,
  children,
}: {
  eyebrow: string;
  title: string;
  first?: boolean;
  children: ReactNode | ((headingId: string) => ReactNode);
}) {
  const id = useId();
  return (
    <section className={first ? undefined : SECTION}>
      <div className="mb-3">
        <Heading id={id} eyebrow={eyebrow}>
          {title}
        </Heading>
      </div>
      {typeof children === 'function' ? children(id) : children}
    </section>
  );
}

/** 設定のラジオの組。名前は見出し（labelledBy）で読み上げる */
export function RadioOptions<T extends string | boolean>({
  name,
  labelledBy,
  options,
  value,
  onChange,
}: {
  name: string;
  labelledBy: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="grid gap-1">
      {options.map((o) => (
        <label key={String(o.value)} className={`${ROW} items-center`}>
          <input
            type="radio"
            name={name}
            value={String(o.value)}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="size-4 accent-accent"
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

/** 設定の入・切の行（チェックの箱と文言） */
export function CheckRow({
  checked,
  onChange,
  className = '',
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** 位置の調整など、足す指定 */
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`${ROW} items-start sm:max-w-sm ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onChange(!checked)}
        className="mt-1 size-4 shrink-0 accent-accent"
      />
      <span>{children}</span>
    </label>
  );
}
