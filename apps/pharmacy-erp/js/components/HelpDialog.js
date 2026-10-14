/**
 * PharmaTech — Help & Support Dialog Component
 * Displays system operational guide, keyboard shortcuts, and compliance documentation
 */

export class HelpDialog {
  constructor() {
    this.dialog = document.getElementById('dialog-help');
    this.closeBtn = document.getElementById('btn-close-help-dialog');
    this.init();
  }

  init() {
    if (!this.dialog) return;

    this.closeBtn?.addEventListener('click', () => this.close());
    this.dialog.addEventListener('click', (e) => {
      if (e.target === this.dialog) this.close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.dialog.classList.contains('hidden')) {
        this.close();
      }
    });
  }

  open() {
    this.dialog?.classList.remove('hidden');
  }

  close() {
    this.dialog?.classList.add('hidden');
  }
}
