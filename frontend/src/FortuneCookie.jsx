import { useState, useEffect, useCallback, useRef } from "react";
import "./FortuneCookie.css";

// ---- Content -----------------------------------------------------------

const FLIRTY = [
  "Someone is thinking about you in a way that violates a dress code.",
  "Your next kiss will taste better than a free sample.",
  "Tonight, restraint is optional.",
  "A stranger will remember your name longer than they should.",
  "You will be someone's favorite bad decision this week.",
  "That tension you're feeling is not indigestion.",
  "Confidence looks good on you. Take it off later.",
  "You will get exactly what you asked for, and then some.",
  "Someone finds the sound of your voice unreasonably distracting.",
  "A slow smile will get you further than a fast car.",
  "Your name will be whispered before midnight.",
  "You are about to become someone's plot twist.",
  "The chemistry is real. So is the mess it will make.",
  "Flirt first, apologize never.",
  "You will win an argument by losing your composure.",
  "Eye contact tonight will start something neither of you finishes fast.",
  "Someone is rehearsing what they'll say to you. It's not subtle.",
  "You'll be forgiven for whatever you're about to do.",
  "The best decision you make this week will look like the worst one.",
  "Your patience will be tested. Fail beautifully.",
];

const ABSURD = [
  "A pigeon will judge your life choices today, and it will not be wrong.",
  "You will befriend a vending machine. It will not reciprocate.",
  "Your soulmate is currently arguing with a printer.",
  "Somewhere, a goat is more organized than you.",
  "You will find $4 and lose your dignity in the same afternoon.",
  "A raccoon has already rated your outfit. Two stars.",
  "Your GPS will lie to you out of jealousy.",
  "You will accidentally start a cult by being too motivational at brunch.",
  "The moon owes you money. It will not pay.",
  "A squirrel is planning your downfall. Stay alert.",
  "You will win a staring contest with a houseplant.",
  "Somewhere, a cat has already decided you are furniture.",
  "Your left sock is plotting an escape. Let it go.",
  "You will be complimented by a stranger and suspicious for hours.",
  "An email you sent in 2019 is about to resurface for no reason.",
  "You will develop a strong opinion about a sandwich today.",
  "A crow remembers your face. It is not a compliment.",
  "You will lose a fight with a jar lid in front of witnesses.",
];

const DARK = [
  "You will outlive your houseplants. All of them. Eventually.",
  "The void thinks about you sometimes. It's flattered.",
  "Someone already knows how this ends. They're not telling you.",
  "This is the last good fortune you'll get for a while. Savor it.",
  "Somewhere, a fortune cookie factory worker regrets everything, including this one.",
  "You will be forgotten precisely on schedule.",
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickFortune() {
  const roll = Math.random();
  if (roll < 0.6) return { text: pick(FLIRTY), tag: "flirty", label: "Promise" };
  if (roll < 0.92) return { text: pick(ABSURD), tag: "absurd", label: "Absurdity" };
  return { text: pick(DARK), tag: "dark", label: "Uncomfortable Truth" };
}

function luckyDigits() {
  return Array.from({ length: 6 }, () => Math.floor(Math.random() * 49) + 1)
    .sort((a, b) => a - b)
    .join(" - ");
}

// ---- Daily limit storage ------------------------------------------------
// Uses localStorage, keyed by date, to cap how many cookies a visitor
// can crack per calendar day (local time). Swap this for a server-side
// check keyed on user id if you want it enforced per-account instead
// of per-browser.

const STORAGE_KEY = "afterHoursFortune";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function readDailyState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { date: todayKey(), count: 0 };
    const parsed = JSON.parse(raw);
    if (parsed.date !== todayKey()) return { date: todayKey(), count: 0 };
    return parsed;
  } catch {
    return { date: todayKey(), count: 0 };
  }
}

function writeDailyState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable (private mode, SSR, etc) - fail silently,
    // component just won't persist the count across reloads.
  }
}

function msUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight - now;
}

function formatCountdown(ms) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

// ---- Component -----------------------------------------------------------

export default function FortuneCookie({ maxPerDay = 3 }) {
  const [remaining, setRemaining] = useState(maxPerDay);
  const [cracked, setCracked] = useState(false);
  const [fortune, setFortune] = useState(null);
  const [lucky, setLucky] = useState("");
  const [countdown, setCountdown] = useState("");
  const timerRef = useRef(null);

  useEffect(() => {
    const state = readDailyState();
    setRemaining(Math.max(0, maxPerDay - state.count));
  }, [maxPerDay]);

  useEffect(() => {
    if (remaining > 0) return;
    setCountdown(formatCountdown(msUntilMidnight()));
    timerRef.current = setInterval(() => {
      setCountdown(formatCountdown(msUntilMidnight()));
    }, 60000);
    return () => clearInterval(timerRef.current);
  }, [remaining]);

  const crackOpen = useCallback(() => {
    if (cracked || remaining <= 0) return;

    const state = readDailyState();
    const nextState = { date: todayKey(), count: state.count + 1 };
    writeDailyState(nextState);
    setRemaining(Math.max(0, maxPerDay - nextState.count));

    setCracked(true);
    setFortune(pickFortune());
    setLucky(luckyDigits());
  }, [cracked, remaining, maxPerDay]);

  const reset = useCallback(() => {
    setCracked(false);
    setFortune(null);
  }, []);

  const locked = remaining <= 0 && !cracked;

  return (
    <div className="fc-stage">
      <div className="fc-sign">
        🥠 After Hours
        <small>FORTUNE PARLOR</small>
      </div>

      <div
        className={`fc-cookie-zone ${cracked ? "fc-cracked" : ""} ${
          locked ? "fc-locked" : ""
        }`}
        onClick={crackOpen}
        role="button"
        tabIndex={0}
        aria-disabled={locked}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") crackOpen();
        }}
      >
        <svg className="fc-cookie" viewBox="0 0 200 200">
          <path
            d="M20 100 C20 50 80 20 100 20 C120 20 180 50 180 100 C180 130 150 150 100 150 C50 150 20 130 20 100 Z"
            fill="#e3b673"
            stroke="#b8894a"
            strokeWidth="3"
          />
          <path
            d="M30 95 C30 60 80 32 100 32 C120 32 170 60 170 95 C170 60 140 45 100 45 C60 45 30 60 30 95 Z"
            fill="#c9944f"
            opacity="0.5"
          />
        </svg>
        <svg className="fc-half fc-halfL" viewBox="0 0 100 200">
          <path
            d="M90 90 C90 50 60 25 45 20 C30 25 10 55 10 100 C10 125 25 140 50 145 C60 145 75 130 90 90 Z"
            fill="#e3b673"
            stroke="#b8894a"
            strokeWidth="3"
          />
        </svg>
        <svg className="fc-half fc-halfR" viewBox="0 0 100 200">
          <path
            d="M10 90 C10 50 40 25 55 20 C70 25 90 55 90 100 C90 125 75 140 50 145 C40 145 25 130 10 90 Z"
            fill="#e3b673"
            stroke="#b8894a"
            strokeWidth="3"
          />
        </svg>
      </div>

      {!cracked && !locked && (
        <div className="fc-hint">Tap the cookie to crack it open.</div>
      )}

      {locked && (
        <div className="fc-hint fc-hint-locked">
          You're out of cookies for today. Back in {countdown}.
        </div>
      )}

      {cracked && fortune && (
        <div className="fc-slip fc-show">
          <span className={`fc-tag fc-tag-${fortune.tag}`}>{fortune.label}</span>
          <div className="fc-fortune-text">{fortune.text}</div>
          <div className="fc-lucky">Lucky numbers: {lucky}</div>
        </div>
      )}

      <div className="fc-remaining">
        {remaining > 0
          ? `${remaining} of ${maxPerDay} cookies left today`
          : `0 of ${maxPerDay} cookies left today`}
      </div>

      {cracked && (
        <button className="fc-again-btn" onClick={reset}>
          Close cookie
        </button>
      )}
    </div>
  );
}
