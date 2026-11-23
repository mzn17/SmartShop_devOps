import { useEffect } from 'react';

export default function Modal({ title, subtitle, children, footer, onClose, size = '' }) {
  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <>
      <div className="modal-backdrop-custom" onClick={onClose} />
      <div className="modal-custom" role="dialog" aria-modal="true">
        <div className={`modal-custom-dialog ${size}`}>
          <div className="d-flex justify-content-between align-items-start p-3 p-md-4 pb-3 border-bottom">
            <div>
              <h5 className="fw-bold mb-1">{title}</h5>
              {subtitle ? <div className="text-muted fs-13">{subtitle}</div> : null}
            </div>
            <button type="button" className="btn btn-soft btn-icon" onClick={onClose} aria-label="Fermer">
              <i className="bi bi-x-lg" />
            </button>
          </div>
          <div className="p-3 p-md-4">{children}</div>
          {footer ? <div className="px-3 px-md-4 pb-3 pb-md-4 d-flex justify-content-end gap-2">{footer}</div> : null}
        </div>
      </div>
    </>
  );
}
