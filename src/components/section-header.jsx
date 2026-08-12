import { ArrowRight } from "@phosphor-icons/react";

export function SectionHeader({ title, subtitle, actionLabel, onAction }) {
  return (
    <div className="section-header">
      <div>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actionLabel ? (
        <button type="button" onClick={onAction}>
          {actionLabel}
          <ArrowRight size={16} weight="bold" />
        </button>
      ) : null}
    </div>
  );
}
