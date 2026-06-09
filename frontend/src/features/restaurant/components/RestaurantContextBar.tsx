import { Bell, Search, UserCircle } from 'lucide-react';
import labels from '../labels.es.json';

export function RestaurantContextBar() {
  return (
    <header className="restaurant-workspace-topbar">
      <div className="restaurant-context-summary">
        <span className="eyebrow">{labels.app.company}</span>
        <strong>{labels.app.workspaceTitle}</strong>
      </div>
      <div className="restaurant-context-controls">
        <label className="branch-selector">
          <span>{labels.setup.branchId}</span>
          <select defaultValue="main-branch">
            <option value="main-branch">{labels.app.branchPlaceholder}</option>
          </select>
        </label>
        <label className="workspace-search">
          <Search size={16} />
          <input type="search" placeholder={labels.app.searchPlaceholder} />
        </label>
        <button type="button" className="icon-button" aria-label={labels.app.notifications}>
          <Bell size={16} />
        </button>
        <button type="button" className="icon-button" aria-label={labels.app.userMenu}>
          <UserCircle size={17} />
        </button>
      </div>
    </header>
  );
}
