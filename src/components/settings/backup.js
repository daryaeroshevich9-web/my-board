/* board v3.0 stage-0 */

import { getState } from '../../core/store.js';
import { todayISO } from '../../core/dates.js';
import { showToast } from '../ui/toast.js';

export function downloadBackup() {
  const state = getState();

  const payload = {
    exportedAt: new Date().toISOString(),
    tasks: state.tasks,
    zones: state.zones,
    personal: state.personal,
    daynotes: state.daynotes,
    dayreports: state.dayreports,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `darya-board-backup-${todayISO()}.json`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);

  showToast('Резервная копия скачана', 'success');
}
