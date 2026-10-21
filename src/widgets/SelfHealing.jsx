import { useEffect, useState } from 'react';
import './SelfHealing.css';

// A Pod card: name suffix, status, READY, RESTARTS. `ok` = ready for traffic.
const pod = (name, status, ok, restarts = 0) => ({ name, status, ok, restarts });
const A = pod('8hvzn', 'Running', true);
const B = pod('7xk2m', 'Running', true);
const C = pod('p4tfw', 'Running', true);

const stable = {
  title: 'همه‌چیز سالم است',
  who: null,
  text: 'Deployment گفته است ۳ replica می‌خواهد (desired state). سه Pod در حال اجرا هستند (current state) و Service ترافیک را بین هر سه پخش می‌کند.',
  slots: [A, B, C],
  current: 3,
};

const SCENARIOS = [
  {
    id: 'delete',
    label: 'یک Pod حذف می‌شود',
    hint: <>مثل <bdi dir="ltr">kubectl delete pod</bdi>، یا Podی که با خرابی Node از دست می‌رود</>,
    steps: [
      stable,
      {
        title: 'یک Pod از بین می‌رود',
        who: 'kubectl',
        text: 'فرض کنید Pod ‎8hvzn‎ را حذف کرده‌اید. Pod از فهرست مقصدهای Service بیرون می‌رود و ترافیک فقط به دو Pod دیگر می‌رسد. Pod در حال خاموش‌شدن را controller جزو Podهای موجود نمی‌شمارد.',
        slots: [pod('8hvzn', 'Terminating', false), B, C],
        current: 2,
      },
      {
        title: 'controller اختلاف را می‌بیند',
        who: 'ReplicaSet controller',
        text: 'ReplicaSet controller (داخل kube-controller-manager) دائم current state را با desired state مقایسه می‌کند: ۳ تا می‌خواهم، ۲ تا دارم. این اختلاف باید برطرف شود.',
        slots: [null, B, C],
        current: 2,
        mismatch: true,
      },
      {
        title: 'Pod تازه ساخته می‌شود',
        who: 'ReplicaSet controller',
        text: 'controller یک Pod تازه می‌سازد. نام و IP آن با Pod قبلی فرق دارد. scheduler آن را به یک Node می‌دهد و kubelet container را راه می‌اندازد. READY هنوز 0/1 است و Service به آن ترافیک نمی‌فرستد.',
        slots: [pod('q9rjd', 'ContainerCreating', false), B, C],
        current: 3,
        fresh: 0,
      },
      {
        title: 'readiness probe موفق می‌شود',
        who: 'readiness probe',
        text: 'Pod جواب readiness probe را داد، READY شد 1/1 و دوباره به Service اضافه شد. current state دوباره با desired state برابر است. شما فقط یک Pod را حذف کردید و بقیه‌ی کار خودکار بود.',
        slots: [pod('q9rjd', 'Running', true), B, C],
        current: 3,
        fresh: 0,
      },
    ],
  },
  {
    id: 'crash',
    label: 'process داخل container می‌میرد',
    hint: <>مثل <bdi dir="ltr">kubectl exec … -- kill 1</bdi> در آزمایش این فصل</>,
    steps: [
      stable,
      {
        title: 'container از کار می‌افتد',
        who: 'container',
        text: 'process اصلی داخل container یکی از Podها تمام می‌شود. خودِ Pod هنوز وجود دارد، پس current state هنوز ۳ Pod است، ولی این Pod آماده نیست و Service به آن ترافیک نمی‌دهد.',
        slots: [pod('8hvzn', 'Error', false), B, C],
        current: 3,
      },
      {
        title: 'kubelet دوباره راه می‌اندازد',
        who: 'kubelet',
        text: 'kubelet روی Node خروج container را می‌بیند و چون restartPolicy پیش‌فرض Always است، container را در همان Pod دوباره راه می‌اندازد. ستون RESTARTS یک می‌شود. controller اینجا کاری ندارد، چون تعداد Podها کم نشده است.',
        slots: [pod('8hvzn', 'Running', false, 1), B, C],
        current: 3,
      },
      {
        title: 'readiness probe موفق می‌شود',
        who: 'readiness probe',
        text: 'Pod دوباره readiness probe را گذراند و ترافیک می‌گیرد. نام و IP همان Pod قبلی است؛ تنها نشانه‌ی ماجرا RESTARTS برابر 1 است.',
        slots: [pod('8hvzn', 'Running', true, 1), B, C],
        current: 3,
      },
    ],
  },
];

const DESIRED = 3;
const STATUS_CLASS = { Running: 'run', Terminating: 'bad', Error: 'bad', ContainerCreating: 'wait' };

function PodCard({ p, fresh }) {
  if (!p) return <div className="heal-slot heal-empty"><span>جای خالی</span></div>;
  const cls = p.status === 'Running' && !p.ok ? 'wait' : STATUS_CLASS[p.status];
  return (
    <div className={`heal-slot heal-pod heal-${cls}${fresh ? ' heal-new' : ''}`} key={p.name}>
      <div className={`heal-flow${p.ok ? ' on' : ''}`} aria-hidden="true" />
      <div className="heal-card">
        <b className="heal-pn" dir="ltr">shop-api-…{p.name}</b>
        <dl dir="ltr">
          <div><dt>READY</dt><dd>{p.ok ? '1/1' : '0/1'}</dd></div>
          <div><dt>STATUS</dt><dd>{p.status}</dd></div>
          <div><dt>RESTARTS</dt><dd>{p.restarts}</dd></div>
        </dl>
      </div>
    </div>
  );
}

export default function SelfHealing() {
  const [sc, setSc] = useState(0);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const scenario = SCENARIOS[sc];
  const s = scenario.steps[step];
  const last = scenario.steps.length - 1;
  const endpoints = s.slots.filter((p) => p && p.ok).length;

  useEffect(() => {
    if (!playing) return undefined;
    if (step >= last) { setPlaying(false); return undefined; }
    const t = setTimeout(() => setStep((n) => n + 1), 3800);
    return () => clearTimeout(t);
  }, [playing, step, last]);

  const pick = (i) => { setSc(i); setStep(0); setPlaying(false); };
  const go = (n) => { setStep(Math.max(0, Math.min(last, n))); setPlaying(false); };
  const play = () => { if (step >= last) setStep(0); setPlaying((p) => !p); };

  return (
    <section className="heal" aria-label="شکل تعاملی: self-healing">
      <div className="heal-tabs" role="tablist" aria-label="نوع خرابی">
        {SCENARIOS.map((x, i) => (
          <button key={x.id} type="button" role="tab" aria-selected={i === sc} className={i === sc ? 'on' : ''} onClick={() => pick(i)}>{x.label}</button>
        ))}
      </div>
      <p className="heal-hint">{scenario.hint}</p>

      <div className="heal-stage">
        <div className="heal-svc">
          <b dir="ltr">Service shop-api</b>
          <span>به {endpoints} از {DESIRED} Pod ترافیک می‌دهد</span>
        </div>
        <div className="heal-node">
          <span className="heal-nodelabel">Node <small>(kubelet روی آن اجرا می‌شود)</small></span>
          <div className="heal-pods">
            {s.slots.map((p, i) => <PodCard key={i + (p ? p.name : '-')} p={p} fresh={s.fresh === i} />)}
          </div>
        </div>
        <div className={`heal-ctl${s.mismatch ? ' bad' : ''}`}>
          <b>ReplicaSet controller</b>
          <span>desired: <em>{DESIRED}</em></span>
          <span>current: <em>{s.current}</em></span>
          {s.mismatch && <strong>اختلاف! باید یک Pod ساخته شود</strong>}
        </div>
      </div>

      <div className="heal-cap" aria-live="polite">
        <div className="heal-capt">
          <span className="heal-num">{step + 1}/{scenario.steps.length}</span>
          <b>{s.title}</b>
          {s.who && <span className="heal-who">{s.who}</span>}
        </div>
        <p>{s.text}</p>
      </div>

      <div className="heal-nav">
        <button type="button" onClick={() => go(step - 1)} disabled={step === 0}>قبلی</button>
        <button type="button" className="pri" onClick={() => go(step + 1)} disabled={step === last}>بعدی</button>
        <button type="button" onClick={play}>{playing ? 'توقف' : step >= last ? 'پخش دوباره' : 'پخش خودکار'}</button>
        <span className="heal-dots" role="group" aria-label="مرحله‌ها">
          {scenario.steps.map((x, i) => (
            <button key={i} type="button" className={i === step ? 'on' : ''} aria-label={`مرحله‌ی ${i + 1}: ${x.title}`} aria-current={i === step ? 'step' : undefined} onClick={() => go(i)} />
          ))}
        </span>
      </div>
    </section>
  );
}
