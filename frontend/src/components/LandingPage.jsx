import { useState } from 'react'

const WAITLIST_ENDPOINT = import.meta.env.VITE_WAITLIST_ENDPOINT ||
  'https://script.google.com/macros/s/AKfycbyowN7y0RAaVjAWWFRDKh9jp_4yG-m9osuLQ_1l1bflsgC_mQ3rsJ6ZpglNC3hAeIaX/exec'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export default function LandingPage() {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', city: '', message: '', company: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const update = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setError('')
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.company.trim()) {
      setSuccess(true)
      return
    }
    for (const key of ['first_name', 'last_name', 'email', 'city']) {
      if (!form[key].trim()) {
        setError('Please complete all required fields.')
        return
      }
    }
    if (!EMAIL_RE.test(form.email.trim())) {
      setError('That email looks off. Mind double-checking?')
      return
    }

    const params = new URLSearchParams(window.location.search)
    setSubmitting(true)
    try {
      await fetch(WAITLIST_ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim(),
          city: form.city.trim(),
          message: form.message.trim(),
          company: form.company,
          referrer: document.referrer || '',
          user_agent: navigator.userAgent || '',
          region: params.get('region') || params.get('state') || '',
        }),
      })
      setSuccess(true)
    } catch {
      setError('Something hiccuped on our end. Try again in a moment.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="ls-landing">
      <style>{landingCss}</style>
      <div className="ls-stage" aria-hidden="true" />
      <Rays />
      <main className="ls-wrap">
        <section className="ls-card" role="region" aria-label="LangStock waitlist">
          <div className="ls-status"><span className="ls-dot" /> Live · Pre-launch</div>

          <div className="ls-logo">
            <span className="ls-eyebrow">Finance · OS</span>
            <span className="ls-wordmark">
              <svg className="ls-wordmark-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M3 17 L9 11 L13 14 L21 5" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3 21 H21" stroke="#1f2d24" strokeWidth="1.4" strokeLinecap="round" opacity=".3" />
                <circle cx="21" cy="5" r="1.6" fill="#10b981" />
              </svg>
              <span className="ls-wordmark-text">LangStock</span>
            </span>
          </div>

          <h1 className="ls-h1">LangStock Is <em>Almost</em> Open.</h1>
          <p className="ls-sub">
            LangStock is an AI Finance OS for traders and analysts. Join the waitlist
            for priority beta access, founding-member pricing, and a front-row seat
            when we ring the bell.
          </p>

          {!success ? (
            <form className="ls-form" onSubmit={submit} noValidate>
              <Field label="First name *" value={form.first_name} onChange={v => update('first_name', v)} autoComplete="given-name" />
              <Field label="Last name *" value={form.last_name} onChange={v => update('last_name', v)} autoComplete="family-name" />
              <Field label="Email *" type="email" value={form.email} onChange={v => update('email', v)} autoComplete="email" />
              <Field label="City *" value={form.city} onChange={v => update('city', v)} autoComplete="address-level2" />
              <label className="ls-field ls-full">
                <textarea value={form.message} onChange={e => update('message', e.target.value)} placeholder=" " rows={3} />
                <span>Message (optional)</span>
              </label>
              <input className="ls-hp" value={form.company} onChange={e => update('company', e.target.value)} tabIndex="-1" autoComplete="off" aria-hidden="true" />
              {error && <div className="ls-err" role="alert">{error}</div>}
              <button className="ls-submit" type="submit" disabled={submitting}>
                <span>{submitting ? 'Reserving...' : 'Reserve my spot'}</span>
                <svg className="ls-arrow" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M2 7 H12 M12 7 L7 2 M12 7 L7 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </form>
          ) : (
            <div className="ls-success" aria-live="polite">
              <div className="ls-success-check">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 12.5 L10 17.5 L19 7.5" stroke="#10b981" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3>You're on the list.</h3>
              <p>We'll reach out the moment your region opens up. Waitlist members get priority beta access and founding-member pricing at launch.</p>
            </div>
          )}

          <div className="ls-stats">
            <span>Joining the waitlist · <b>2,400+</b></span>
            <span className="ls-sep">·</span>
            <span>Launching · <b>Q3 2026</b></span>
          </div>
        </section>
      </main>
      <Skyline />
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', autoComplete }) {
  return (
    <label className="ls-field">
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder=" " autoComplete={autoComplete} />
      <span>{label}</span>
    </label>
  )
}

function Rays() {
  return (
    <svg className="ls-rays" viewBox="0 0 560 560" aria-hidden="true">
      <defs>
        <radialGradient id="lsSun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f4d49c" stopOpacity=".9" />
          <stop offset="55%" stopColor="#e8b974" stopOpacity=".22" />
          <stop offset="100%" stopColor="#e8b974" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="lsRayGold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f4d49c" stopOpacity=".55" />
          <stop offset="100%" stopColor="#f4d49c" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="lsRayEmerald" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#10b981" stopOpacity=".35" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx="140" cy="140" r="92" fill="url(#lsSun)" />
      <g stroke="url(#lsRayGold)" strokeWidth="1.4" strokeLinecap="round">
        {[[540, 140], [510, 220], [460, 310], [390, 400], [300, 475], [210, 525], [140, 545], [50, 495]].map(([x, y]) => <line key={`${x}-${y}`} x1="140" y1="140" x2={x} y2={y} />)}
      </g>
      <g stroke="url(#lsRayEmerald)" strokeWidth="1" strokeLinecap="round">
        {[[495, 175], [435, 265], [350, 440], [250, 500]].map(([x, y]) => <line key={`${x}-${y}`} x1="140" y1="140" x2={x} y2={y} />)}
      </g>
    </svg>
  )
}

function Skyline() {
  return (
    <svg className="ls-skyline" viewBox="0 0 1440 220" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="lsSkylineFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a1f2c" stopOpacity="0" />
          <stop offset="100%" stopColor="#06121b" stopOpacity=".95" />
        </linearGradient>
        <linearGradient id="lsCandleUp" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity=".8" />
          <stop offset="100%" stopColor="#10b981" stopOpacity=".18" />
        </linearGradient>
        <linearGradient id="lsCandleDn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8a574" stopOpacity=".55" />
          <stop offset="100%" stopColor="#e8a574" stopOpacity=".12" />
        </linearGradient>
      </defs>
      <line x1="0" y1="182" x2="1440" y2="182" stroke="rgba(244,237,225,.12)" strokeWidth="1" />
      <path d="M0,182 L70,150 L150,162 L230,118 L310,135 L400,92 L480,108 L560,76 L640,98 L720,68 L800,90 L880,58 L960,86 L1040,52 L1120,75 L1200,42 L1280,68 L1360,38 L1440,58 L1440,220 L0,220 Z" fill="rgba(16,185,129,.06)" stroke="rgba(16,185,129,.22)" strokeWidth="1" />
      <path d="M0,170 L80,160 L160,165 L240,140 L320,150 L400,120 L480,130 L560,110 L640,128 L720,100 L800,115 L880,90 L960,110 L1040,85 L1120,108 L1200,80 L1280,100 L1360,75 L1440,95" fill="none" stroke="rgba(232,185,116,.2)" strokeWidth="1" />
      {[120, 200, 280, 360, 440, 1000, 1080, 1160, 1240, 1320].map((x, i) => <line key={x} x1={x} y1={[102, 78, 112, 58, 92, 70, 102, 48, 86, 64][i]} x2={x} y2="180" stroke="rgba(244,237,225,.35)" strokeWidth="1" />)}
      {[[112, 115, 55, 'up'], [192, 92, 78, 'up'], [272, 125, 45, 'dn'], [352, 72, 98, 'up'], [432, 105, 65, 'dn'], [992, 84, 86, 'up'], [1072, 115, 55, 'dn'], [1152, 62, 108, 'up'], [1232, 100, 70, 'up'], [1312, 78, 92, 'dn']].map(([x, y, h, dir]) => <rect key={x} x={x} y={y} width="16" height={h} rx="2" fill={`url(#${dir === 'up' ? 'lsCandleUp' : 'lsCandleDn'})`} />)}
      <rect x="0" y="0" width="1440" height="220" fill="url(#lsSkylineFade)" />
    </svg>
  )
}

const landingCss = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..600;1,9..144,300..600&family=Geist:wght@300..600&display=swap');
.ls-landing{--navy-900:#06121b;--navy-800:#0a1f2c;--emerald:#10b981;--gold:#e8b974;--cream:#f4ede1;--cream-2:#ebe2d2;--ink:#1f2d24;--ink-soft:#5a6a5e;--ink-accent:#2c4a3a;--line:rgba(31,45,36,.14);--ease:cubic-bezier(.2,.65,.2,1);--ease-out:cubic-bezier(.16,.84,.34,1);min-height:100vh;background:var(--navy-900);color:var(--cream);font-family:'Geist','Inter',system-ui,-apple-system,sans-serif;overflow:hidden}
.ls-landing *{box-sizing:border-box}
.ls-stage{position:fixed;inset:0;z-index:0;pointer-events:none;background:radial-gradient(120% 80% at 50% 112%,rgba(232,185,116,.22) 0%,rgba(232,185,116,0) 55%),radial-gradient(80% 60% at 50% 120%,rgba(16,185,129,.18) 0%,rgba(16,185,129,0) 60%),linear-gradient(180deg,#06121b 0%,#0a1f2c 45%,#0f2a3a 100%)}
.ls-stage:before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(244,237,225,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(244,237,225,.035) 1px,transparent 1px);background-size:64px 64px;mask-image:radial-gradient(120% 100% at 50% 40%,#000 35%,transparent 80%);-webkit-mask-image:radial-gradient(120% 100% at 50% 40%,#000 35%,transparent 80%)}
.ls-stage:after{content:"";position:absolute;inset:0;background:radial-gradient(60% 40% at 50% 38%,rgba(20,53,72,.55),transparent 70%);filter:blur(40px)}
.ls-rays{position:fixed;top:-120px;left:-120px;width:560px;height:560px;z-index:1;pointer-events:none;opacity:0;animation:lsFadeIn 1.6s var(--ease) .15s forwards}
.ls-skyline{position:fixed;left:0;right:0;bottom:0;width:100%;height:220px;z-index:1;pointer-events:none;opacity:0;animation:lsFadeIn 1.6s var(--ease) .95s forwards}
.ls-wrap{position:relative;z-index:5;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:48px 20px 240px}
.ls-card{width:100%;max-width:640px;background:linear-gradient(180deg,rgba(244,237,225,.97),rgba(235,226,210,.95));border-radius:28px;padding:44px 48px 38px;position:relative;box-shadow:inset 0 1px 0 rgba(255,255,255,.6),0 1px 2px rgba(0,0,0,.2),0 28px 80px -24px rgba(0,0,0,.65),0 0 0 1px rgba(244,237,225,.06);color:var(--ink);opacity:0;transform:translateY(16px) scale(.985);animation:lsCardIn 1s var(--ease-out) .25s forwards}
.ls-status{position:absolute;top:18px;right:20px;display:inline-flex;align-items:center;gap:8px;font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-soft);font-weight:500}
.ls-dot{width:7px;height:7px;border-radius:50%;background:var(--emerald);animation:lsPulse 2.2s ease-out infinite}
.ls-logo{display:flex;flex-direction:column;align-items:center;gap:8px;opacity:0;transform:translateY(8px);animation:lsSlideUp .85s var(--ease-out) .45s forwards}
.ls-eyebrow{font-size:10px;letter-spacing:.34em;text-transform:uppercase;color:var(--ink-soft);font-weight:500}
.ls-wordmark{display:inline-flex;align-items:center;gap:10px}.ls-wordmark-icon{width:22px;height:22px}.ls-wordmark-text{font-family:'Fraunces',serif;font-weight:480;font-size:23px;letter-spacing:-.012em;color:var(--ink)}
.ls-h1{font-family:'Fraunces',serif;font-weight:380;font-size:clamp(40px,6.4vw,64px);line-height:1.02;letter-spacing:-.025em;text-align:center;color:var(--ink);margin:28px auto 18px;max-width:14ch;opacity:0;transform:translateY(12px);animation:lsSlideUp 1s var(--ease-out) .62s forwards}
.ls-h1 em{font-style:italic;font-weight:340;color:var(--ink-accent)}
.ls-sub{text-align:center;font-size:15px;line-height:1.55;color:var(--ink-soft);max-width:46ch;margin:0 auto 30px;opacity:0;transform:translateY(8px);animation:lsSlideUp .9s var(--ease-out) .82s forwards}
.ls-form{display:grid;gap:10px;grid-template-columns:1fr 1fr;opacity:0;transform:translateY(10px);animation:lsSlideUp 1s var(--ease-out) .98s forwards}
.ls-field{position:relative}.ls-full{grid-column:1/-1}.ls-field input,.ls-field textarea{width:100%;background:rgba(255,255,255,.55);border:1px solid var(--line);border-radius:14px;padding:22px 16px 10px;font-family:'Geist',sans-serif;font-size:14px;color:var(--ink);outline:none;transition:border-color .2s var(--ease),background .2s var(--ease),box-shadow .2s var(--ease)}
.ls-field textarea{min-height:96px;resize:vertical;padding-top:26px;line-height:1.5}.ls-field span{position:absolute;left:16px;top:18px;font-size:13px;color:var(--ink-soft);pointer-events:none;transition:transform .2s var(--ease),color .2s var(--ease);transform-origin:left top}
.ls-field input:focus,.ls-field textarea:focus{border-color:rgba(16,185,129,.55);background:#fff;box-shadow:0 0 0 4px rgba(16,185,129,.10)}
.ls-field input:focus+span,.ls-field input:not(:placeholder-shown)+span,.ls-field textarea:focus+span,.ls-field textarea:not(:placeholder-shown)+span{transform:translateY(-10px) scale(.78);color:var(--ink-accent)}
.ls-hp{position:absolute;left:-9999px;top:auto;width:1px;height:1px;opacity:0}
.ls-submit{grid-column:1/-1;margin-top:8px;background:var(--navy-800);color:var(--cream);border:0;border-radius:14px;padding:17px 20px;font-family:'Geist',sans-serif;font-size:14px;font-weight:500;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:10px;transition:background .3s var(--ease),transform .12s var(--ease),box-shadow .25s var(--ease)}
.ls-submit:hover{background:var(--emerald);box-shadow:0 8px 24px -8px rgba(16,185,129,.55)}.ls-submit:disabled{opacity:.6;cursor:wait}.ls-submit:hover .ls-arrow{transform:translateX(4px)}.ls-arrow{transition:transform .28s var(--ease)}
.ls-err{grid-column:1/-1;font-size:12.5px;color:#b04a3a;margin:-2px 2px 0}.ls-stats{margin-top:26px;display:flex;align-items:center;justify-content:center;gap:18px;font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-soft);opacity:0;transform:translateY(8px);animation:lsSlideUp .9s var(--ease-out) 1.2s forwards}.ls-stats b{color:var(--ink);font-weight:600;letter-spacing:.16em}.ls-sep{opacity:.4}
.ls-success{text-align:center;padding:8px 0 6px;animation:lsSlideUp .7s var(--ease-out) forwards}.ls-success-check{width:56px;height:56px;border-radius:50%;background:rgba(16,185,129,.12);display:flex;align-items:center;justify-content:center;margin:0 auto 18px}.ls-success-check svg{width:26px;height:26px}.ls-success h3{font-family:'Fraunces',serif;font-weight:380;font-size:28px;color:var(--ink);margin:0 0 8px;letter-spacing:-.012em}.ls-success p{font-size:14px;color:var(--ink-soft);line-height:1.55;max-width:36ch;margin:0 auto}
@keyframes lsFadeIn{to{opacity:1}}@keyframes lsCardIn{to{opacity:1;transform:translateY(0) scale(1)}}@keyframes lsSlideUp{to{opacity:1;transform:translateY(0)}}@keyframes lsPulse{0%{box-shadow:0 0 0 0 rgba(16,185,129,.55)}70%{box-shadow:0 0 0 8px rgba(16,185,129,0)}100%{box-shadow:0 0 0 0 rgba(16,185,129,0)}}
@media(max-width:640px){.ls-rays{width:380px;height:380px;top:-90px;left:-110px}.ls-skyline{height:180px}.ls-wrap{padding:32px 16px 200px}.ls-card{padding:28px 22px 30px;border-radius:22px}}
@media(max-width:480px){.ls-form{grid-template-columns:1fr}.ls-stats{flex-direction:column;gap:8px;letter-spacing:.18em}.ls-sep{display:none}.ls-status{top:14px;right:14px;font-size:9.5px}.ls-h1{font-size:clamp(34px,9vw,46px);max-width:13ch}.ls-sub{font-size:14px}}
`
