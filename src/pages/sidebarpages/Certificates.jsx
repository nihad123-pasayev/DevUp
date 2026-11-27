import { QRCodeSVG } from "qrcode.react";
import logo from "./assets/devup-logo.png";
import icon from "./assets/devup-icon.png";

/**
 * Sertifikat kağızı (1000 x 707).
 * .cf-frame / .cf-scale içində əvvəlki kimi istifadə olunur.
 */
export default function CertificatePaper({
  name = "Nihad Paşayev",
  program = "Backend Development",
  date = "25 November 2026",
  certId = "DU-BE-2026-0001",
  verifyUrl = "https://devup.az/verify/DU-BE-2026-0001",
  blurb = "Demonstrated the skills required to design, build and deploy reliable backend services.",
}) {
  return (
    <div className="cf-paper">
      {/* dekor: künc dalğaları */}
      <svg
        className="cf-waves"
        viewBox="0 0 1536 1024"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="cfWaveA" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2f6cf0" stopOpacity=".30" />
            <stop offset="1" stopColor="#8fb4f7" stopOpacity=".10" />
          </linearGradient>
          <linearGradient id="cfWaveB" x1="1" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#2f6cf0" stopOpacity=".38" />
            <stop offset="1" stopColor="#8fb4f7" stopOpacity=".08" />
          </linearGradient>
        </defs>
        <path d="M0 0H560C430 70 300 70 190 150C110 210 60 300 0 420Z" fill="url(#cfWaveA)" />
        <path d="M0 0H330C240 60 160 90 100 160C50 220 20 290 0 340Z" fill="#2f6cf0" opacity=".16" />
        <path d="M1536 1024H950C1090 960 1220 950 1330 870C1420 800 1480 700 1536 560Z" fill="url(#cfWaveB)" />
        <path d="M1536 1024H1200C1290 970 1370 940 1430 870C1490 800 1520 740 1536 680Z" fill="#2f6cf0" opacity=".16" />
        <path d="M1536 0H1300C1380 20 1460 60 1536 130Z" fill="#2f6cf0" opacity=".07" />
        <path d="M0 1024H260C170 1000 90 950 0 860Z" fill="#2f6cf0" opacity=".07" />
      </svg>

      {/* çərçivə */}
      <div className="cf-border" />
      <div className="cf-border cf-border-inner" />

      {/* yuxarı: brend (solda) + QR (sağda) */}
      <div className="cf-brand">
        <img className="cf-brand-icon" src={icon} alt="" />
        <span className="cf-brand-sep" />
        <img className="cf-brand-logo" src={logo} alt="DevUp" />
      </div>

      <div className="cf-qr">
        <div className="cf-qr-box">
          <QRCodeSVG value={verifyUrl} size={70} level="M" fgColor="#0f1b4a" bgColor="#ffffff" />
        </div>
        <div className="cf-qr-label">SCAN TO VERIFY</div>
        <div className="cf-qr-id">ID: {certId}</div>
      </div>

      {/* başlıq */}
      <div className="cf-kicker-row">
        <i />
        <span className="cf-kicker">CERTIFICATE OF COMPLETION</span>
        <i />
      </div>

      {/* mərkəz */}
      <div className="cf-small">This is proudly presented to</div>
      <div className="cf-name">{name}</div>
      <div className="cf-for">for completing</div>
      <div className="cf-program">{program}</div>
      <div className="cf-blurb">{blurb}</div>

      {/* aşağı */}
      <div className="cf-foot">
        <div>
          <div className="cf-label">Issued</div>
          <div className="cf-date">{date}</div>
        </div>
        <div className="cf-sign">
          <div className="cf-sign-script">DevUp Academy</div>
          <div className="cf-sign-line" />
          <div className="cf-label">Authorized signature</div>
        </div>
      </div>
    </div>
  );
}