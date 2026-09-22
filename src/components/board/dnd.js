/* board v3.0 stage-1 */

export function initDnd(boardElement, onDrop) {
  let drag = null;
  let timer = null;
  let startX = 0;
  let startY = 0;

  boardElement.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('pointermove', onPointerMove, { passive: false });
  document.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointercancel', onCancel);

  function onPointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    const card = event.target.closest('.task');

    if (!card || !boardElement.contains(card)) return;

    if (
      event.target.closest('input, button, textarea, select, a, label')
    ) {
      return;
    }

    const taskId = Number(card.dataset.taskId);

    if (!taskId) return;

    startX = event.clientX;
    startY = event.clientY;

    if (event.pointerType === 'mouse') {
      drag = {
        potential: true,
        taskId,
        card,
      };

      return;
    }

    timer = setTimeout(() => {
      startDrag(card, taskId, startX, startY);
    }, 500);
  }

  function startDrag(card, taskId, x, y) {
    if (drag?.active) return;

    clearTimeout(timer);
    timer = null;

    const rect = card.getBoundingClientRect();

    const ghost = card.cloneNode(true);
    ghost.classList.add('drag-ghost');
    ghost.style.width = `${rect.width}px`;
    ghost.style.left = `${rect.left}px`;
    ghost.style.top = `${rect.top}px`;

    document.body.appendChild(ghost);

    const placeholder = document.createElement('div');
    placeholder.className = 'drop-placeholder';
    placeholder.style.height = `${rect.height}px`;

    card.parentNode.insertBefore(placeholder, card);
    card.remove();

    drag = {
      active: true,
      taskId,
      ghost,
      placeholder,
      card,
    };

    document.body.classList.add('is-dragging');
    updateGhost(x, y);
  }

  function onPointerMove(event) {
    if (timer && !drag?.active) {
      const moved =
        Math.abs(event.clientX - startX) > 10 ||
        Math.abs(event.clientY - startY) > 10;

      if (moved) {
        clearTimeout(timer);
        timer = null;
      }
    }

    if (drag?.potential) {
      const moved =
        Math.abs(event.clientX - startX) > 5 ||
        Math.abs(event.clientY - startY) > 5;

      if (moved) {
        const { card, taskId } = drag;
        drag = null;
        startDrag(card, taskId, event.clientX, event.clientY);
      }
    }

    if (!drag?.active) return;

    event.preventDefault();

    updateGhost(event.clientX, event.clientY);
    updatePlaceholder(event.clientX, event.clientY);
  }

  function onPointerUp() {
    clearTimeout(timer);
    timer = null;

    if (drag?.potential) {
      drag = null;
      return;
    }

    if (!drag?.active) return;

    const { taskId, ghost, placeholder } = drag;

    const zone = placeholder.closest('.zone');
    const zoneKey = zone?.dataset.zone || null;

    let index = 0;

    const list = placeholder.closest('.zone-tasks');

    if (list) {
      const children = Array.from(list.children).filter(
        (child) => child.classList.contains('task') || child === placeholder
      );

      index = children.indexOf(placeholder);
    }

    suppressNextClick();
    cleanupDrag();

    onDrop(taskId, zoneKey, index);
  }

  function onCancel() {
    clearTimeout(timer);
    timer = null;

    cleanupDrag(true);
  }

  function cleanupDrag(restore = false) {
    if (!drag?.active) return;

    drag.ghost.remove();

    if (restore && drag.card) {
      drag.placeholder.replaceWith(drag.card);
    } else {
      drag.placeholder.remove();
    }

    drag = null;
    document.body.classList.remove('is-dragging');
  }

  function updateGhost(x, y) {
    if (!drag?.ghost) return;

    drag.ghost.style.left = `${x}px`;
    drag.ghost.style.top = `${y}px`;
    drag.ghost.style.transform = 'translate(-50%, -20%)';
  }

  function updatePlaceholder(x, y) {
    if (!drag?.placeholder) return;

    const under = document.elementFromPoint(x, y);

    if (!under) return;

    const zone = under.closest('.zone');

    if (!zone) return;

    const list = zone.querySelector('.zone-tasks');

    if (!list) return;

    const taskElement = under.closest('.task');

    if (
      taskElement &&
      taskElement !== drag.placeholder &&
      taskElement.classList.contains('task')
    ) {
      const rect = taskElement.getBoundingClientRect();
      const insertBefore = y < rect.top + rect.height / 2;

      if (insertBefore) {
        list.insertBefore(drag.placeholder, taskElement);
      } else {
        list.insertBefore(drag.placeholder, taskElement.nextSibling);
      }

      return;
    }

    list.appendChild(drag.placeholder);
  }

  function suppressNextClick() {
    const handler = (event) => {
      event.stopPropagation();
      event.preventDefault();

      document.removeEventListener('click', handler, true);
    };

    document.addEventListener('click', handler, true);
  }
}
