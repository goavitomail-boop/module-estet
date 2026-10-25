import type { CSSProperties } from "react";
import type { Signature } from "./signature";
import { ImageTrail } from "./interactive/Extras";
import f from "./fx.module.css";

const at = (vars: Record<string, string | number>) => vars as CSSProperties;

/** Эффект поверх фото первого экрана (пар над чашкой, флаконы лака, «жидкая» форма и т. п.). */
export function MediaFx({ fx, name }: { fx: Signature["fx"]; name: string }) {
  switch (fx) {
    case "steam":
      return (
        <svg className={f.steam} viewBox="0 0 120 160" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <path key={i} style={at({ "--i": i })} d={`M${34 + i * 24} 150c-14-22 14-34 0-58s14-36 0-60`} />
          ))}
        </svg>
      );
    case "swatches":
      return (
        <span className={f.orbit} aria-hidden="true">
          {["#C48C8E", "#6B1E2E", "#EFE4D8", "#B4A3D1", "#97AC94", "#B0122C"].map((c, i) => (
            <span key={c} className={f.drop} style={at({ "--c": c, "--a": `${i * 60}deg` })}>
              <i />
            </span>
          ))}
        </span>
      );
    case "liquid":
      return (
        <span className={f.liquid} aria-hidden="true">
          <i />
          {[0, 1, 2, 3].map((i) => (
            <b key={i} className={f.shine} style={at({ "--i": i })} />
          ))}
        </span>
      );
    case "pole":
      return (
        <span className={f.pole} aria-hidden="true">
          <i />
        </span>
      );
    case "document":
      return (
        <span className={f.doc} aria-hidden="true">
          <small>Договор оказания юридических услуг</small>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span key={i} className={f.docLine} style={at({ "--i": i, "--w": `${[92, 78, 88, 64, 84, 52][i]}%` })} />
          ))}
          <svg className={f.signature} viewBox="0 0 160 50">
            <path d="M6 34c14-24 22-26 20-8s10 6 18-10 12-6 10 8 14 2 24-12 12 0 14 10 18-6 30-10 22 4 30 2" />
          </svg>
          <span className={f.stamp}>
            <svg viewBox="0 0 100 100">
              <defs>
                <path id="stamp-ring" d="M50,50 m-36,0 a36,36 0 1,1 72,0 a36,36 0 1,1 -72,0" />
              </defs>
              <circle cx="50" cy="50" r="46" />
              <circle cx="50" cy="50" r="27" />
              <text>
                <textPath href="#stamp-ring" textLength="222" lengthAdjust="spacing">
                  {`${name} · юридическая помощь · `.toUpperCase().slice(0, 44)}
                </textPath>
              </text>
            </svg>
          </span>
        </span>
      );
    default:
      return null;
  }
}

/** Эффект на весь первый экран (лучи, сияние, кардиограмма, пузыри, лепестки, чертёж, шлейф из фото). */
export function SectionFx({ fx, images }: { fx: Signature["fx"]; images: string[] }) {
  switch (fx) {
    case "beam":
      return (
        <span className={f.beam} aria-hidden="true">
          <i />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <b key={i} style={at({ "--i": i, "--y": `${58 + i * 6}%` })} />
          ))}
        </span>
      );
    case "aurora":
      return (
        <span className={f.aurora} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      );
    case "pulse":
      return (
        <span className={f.pulse} aria-hidden="true">
          <svg viewBox="0 0 1200 160" preserveAspectRatio="none">
            <path d="M0 90h260l20-10 18 10h60l16-70 22 130 18-80 14 20h120l18-12 18 12h70l16-74 22 136 18-84 14 22h140l18-10 18 10h60l16-70 22 130 18-80 14 20h160" />
          </svg>
        </span>
      );
    case "bubbles":
      return (
        <span className={f.bubbles} aria-hidden="true">
          {Array.from({ length: 14 }, (_, i) => (
            <i key={i} style={at({ "--x": `${(i * 37) % 100}%`, "--s": `${18 + ((i * 23) % 56)}px`, "--d": `${7 + (i % 5) * 1.6}s`, "--delay": `${-(i * 1.3)}s` })} />
          ))}
        </span>
      );
    case "petals":
      return (
        <span className={f.petals} aria-hidden="true">
          {Array.from({ length: 16 }, (_, i) => (
            <i key={i} style={at({ "--x": `${(i * 29) % 100}%`, "--s": `${14 + ((i * 7) % 16)}px`, "--d": `${9 + (i % 6) * 1.4}s`, "--delay": `${-(i * 1.1)}s`, "--r": `${(i * 47) % 360}deg` })} />
          ))}
        </span>
      );
    case "blueprint":
      return (
        <svg className={f.blueprint} viewBox="0 0 600 360" aria-hidden="true">
          <path className={f.bpWall} d="M20 20h360v200H20zM380 20h200v320H380zM20 220h220v120H20z" />
          <path className={f.bpThin} d="M240 220v120M140 20v200M380 160h200M300 220h80" />
          <path className={f.bpDoor} d="M240 300a40 40 0 0 1 40-40M380 120a40 40 0 0 0-40 40M140 180a40 40 0 0 1 40 40" />
          <g className={f.bpDims}>
            <path d="M20 8h360M380 8h200M592 20v320" />
            <text x="200" y="4">6 400</text>
            <text x="480" y="4">3 600</text>
            <text x="596" y="186" transform="rotate(90 596 186)">5 800</text>
          </g>
        </svg>
      );
    case "trail":
      return (
        <>
          <ImageTrail images={images} />
          <span className={f.trailHint} aria-hidden="true">
            Поводите мышкой
          </span>
        </>
      );
    case "pole":
      return <span className={f.grain} aria-hidden="true" />;
    default:
      return null;
  }
}
