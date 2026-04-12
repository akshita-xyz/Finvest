import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import '../styles/finvest-certificate.css';

/**
 * @param {{
 *   variant: 'decode' | 'emotion';
 *   recipientName: string;
 *   awardTitle: string;
 *   detailLines?: string[];
 *   issuedAtIso: string;
 *   finePrint?: string;
 *   compact?: boolean;
 *   className?: string;
 * }} props
 */
export function FinvestCertificate({
  variant,
  recipientName,
  awardTitle,
  detailLines = [],
  issuedAtIso,
  finePrint,
  compact = false,
  className = '',
}) {
  const headline =
    variant === 'decode'
      ? 'Certificate of completion — Decode Your Finance Self'
      : 'Certificate of completion — Investing mindset';

  const dateStr = issuedAtIso
    ? new Date(issuedAtIso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const rootClass = ['finvest-cert', compact ? 'finvest-cert--compact' : '', className].filter(Boolean).join(' ');

  return (
    <div className={rootClass}>
      <div className="finvest-cert-ribbon" aria-hidden>
        <span>FINVEST</span>
      </div>
      <div className="finvest-cert-seal" aria-hidden>
        F
      </div>
      <p className="finvest-cert-eyebrow">Certificate of achievement</p>
      <h3 className="finvest-cert-title">{headline}</h3>
      <div className="finvest-cert-divider" />
      <p className="finvest-cert-presented">This certifies that</p>
      <p className="finvest-cert-name">{recipientName || 'Finvest learner'}</p>
      <p className="finvest-cert-presented">has successfully completed the program and is recognized as</p>
      <p className="finvest-cert-award">{awardTitle}</p>
      {detailLines.length > 0 ? (
        <ul className="finvest-cert-lines">
          {detailLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      <div className="finvest-cert-footer">
        <div className="finvest-cert-sig">
          <strong>Finvest</strong>
          <br />
          Learning &amp; simulation platform
        </div>
        <div className="finvest-cert-sig">
          Issued
          <br />
          <strong>{dateStr}</strong>
        </div>
      </div>
      {finePrint ? <p className="finvest-cert-fine">{finePrint}</p> : null}
    </div>
  );
}

/**
 * @param {{
 *   open: boolean;
 *   onClose: () => void;
 *   title?: string;
 *   children: React.ReactNode;
 *   actions?: React.ReactNode;
 * }} props
 */
export function CertificateModal({ open, onClose, title = 'Your certificate', children, actions }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const modal = (
    <div
      className="finvest-cert-modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="finvest-cert-modal-panel" role="dialog" aria-modal="true" aria-labelledby="finvest-cert-modal-title">
        <button type="button" className="finvest-cert-modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <p id="finvest-cert-modal-title" className="finvest-cert-modal-titlebar">
          {title}
        </p>
        {children}
        {actions ? <div className="finvest-cert-modal-actions">{actions}</div> : null}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
