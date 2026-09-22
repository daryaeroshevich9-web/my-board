/* board v3.0 stage-1-fix */

import { byId } from '../../core/dom.js';
import { IDS } from '../../core/ids.js';
import { getState, replaceState } from '../../core/store.js';
import { todayISO } from '../../core/dates.js';
import { showToast } from '../ui/toast.js';
import { openConfirm } from '../ui/confirm.js';

export function initBackup() {
  const input = byId(IDS.backupFileInput);

  if (!input) return;

  input.addEventListener('change', (event) => {
    void handleBackupFileChange(event);
  });
}

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

export function triggerBackupUpload() {
  const input = byId(IDS.backupFileInput);

  if (!input) return;

  input.click();
}

async function handleBackupFileChange(event) {
  const input = event.target;
  const file = input.files?.[0];

  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (!isValidBackup(data)) {
      showToast('Файл резервной копии повреждён', 'error');
      return;
    }

    const confirmed = await openConfirm({
      message: 'Заменить текущие данные доски данными из файла?',
      confirmText: 'Заменить',
      danger: true,
    });

    if (!confirmed) return;

    replaceState({
      tasks: data.tasks,
      zones: data.zones,
      personal: data.personal,
      daynotes: data.daynotes,
      dayreports: data.dayreports,
    });

    showToast('Данные из резервной копии загружены', 'success');
  } catch {
    showToast('Не удалось прочитать файл резервной копии', 'error');
  } finally {
    input.value = '';
  }
}

function isValidBackup(data) {
  return Boolean(
    data &&
    Array.isArray(data.tasks) &&
    Array.isArray(data.zones) &&
    Array.isArray(data.personal) &&
    Array.isArray(data.daynotes) &&
    Array.isArray(data.dayreports)
  );
}
