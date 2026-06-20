import type { IconType } from "react-icons";

interface PageHeaderProps {
  icon: IconType;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({ icon: Icon, title, description, actions }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div className="page-header-main">
        <span className="page-header-icon" aria-hidden="true">
          <Icon size={22} />
        </span>
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </div>
  );
}
