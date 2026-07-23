import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export type DigitState = 'NEUTRAL' | 'RED' | 'GREEN';

@Component({
  selector: 'app-notes-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="glass-panel notes-container animate-fade-in">
      <div class="notes-header">
        <h3><i class="fa-solid fa-clipboard-list text-amber"></i> Notițe & Matrice de Eliminare</h3>
        <button class="btn btn-secondary btn-sm" (click)="resetNotes()">
          <i class="fa-solid fa-rotate-left"></i> Resetează Notițe
        </button>
      </div>

      <p class="notes-hint">
        Bifează rapid cifrele pentru fiecare dintre cele 4 poziții ale numărului adversarului:
        <span class="legend-red"><i class="fa-solid fa-circle-xmark"></i> Roșu = Eliminată</span> | 
        <span class="legend-green"><i class="fa-solid fa-circle-check"></i> Verde = Posibilă</span>
      </p>

      <!-- Matrix of 4 Positions -->
      <div class="positions-grid">
        <div *ngFor="let posIdx of [0, 1, 2, 3]" class="position-card">
          <div class="position-title">
            <span>Poziția {{ posIdx + 1 }}</span>
            <span class="pos-badge">Cifra {{ posIdx + 1 }}</span>
          </div>

          <!-- Quick Toggle Digit Buttons 0-9 -->
          <div class="digit-picker">
            <button 
              *ngFor="let digit of [0,1,2,3,4,5,6,7,8,9]" 
              class="digit-btn"
              [class.state-red]="matrix[posIdx][digit] === 'RED'"
              [class.state-green]="matrix[posIdx][digit] === 'GREEN'"
              (click)="toggleDigitState(posIdx, digit)"
              title="Click pentru comutare: Neutru -> Roșu (Eliminat) -> Verde (Posibil) -> Neutru">
              {{ digit }}
            </button>
          </div>

          <!-- Two Columns: RED (Eliminated) vs GREEN (Possible) -->
          <div class="columns-split">
            <!-- Red Column -->
            <div class="column col-red">
              <div class="col-header"><i class="fa-solid fa-ban"></i> Eliminate</div>
              <div class="digits-list">
                <span *ngFor="let d of getDigitsInState(posIdx, 'RED')" class="tag tag-red">
                  {{ d }}
                </span>
                <span *ngIf="getDigitsInState(posIdx, 'RED').length === 0" class="empty-text">-</span>
              </div>
            </div>

            <!-- Green Column -->
            <div class="column col-green">
              <div class="col-header"><i class="fa-solid fa-check"></i> Posibile</div>
              <div class="digits-list">
                <span *ngFor="let d of getDigitsInState(posIdx, 'GREEN')" class="tag tag-green">
                  {{ d }}
                </span>
                <span *ngIf="getDigitsInState(posIdx, 'GREEN').length === 0" class="empty-text">-</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Freeform Text Scratchpad -->
      <div class="scratchpad-section">
        <label for="scratchNotes"><i class="fa-solid fa-pen-to-square"></i> Notițe Libere Text:</label>
        <textarea 
          id="scratchNotes"
          class="form-input scratchpad-textarea" 
          rows="3" 
          placeholder="Scrie aici deducțiile tale, combinații posibile..."
          [(ngModel)]="freeTextNotes"
          (ngModelChange)="saveToLocalStorage()">
        </textarea>
      </div>
    </div>
  `,
  styles: [`
    .notes-container {
      padding: 20px;
    }

    .notes-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .notes-header h3 {
      font-size: 1.25rem;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .text-amber {
      color: var(--accent-amber);
    }

    .btn-sm {
      padding: 6px 12px;
      font-size: 0.85rem;
    }

    .notes-hint {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-bottom: 16px;
    }

    .legend-red {
      color: var(--color-red);
      font-weight: 600;
    }

    .legend-green {
      color: var(--color-green);
      font-weight: 600;
    }

    .positions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 20px;
    }

    .position-card {
      background: var(--bg-card-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 14px;
    }

    .position-title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 10px;
    }

    .pos-badge {
      font-size: 0.75rem;
      background: #fef3c7;
      color: #b45309;
      padding: 2px 8px;
      border-radius: 12px;
      font-weight: 700;
    }

    .digit-picker {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 6px;
      margin-bottom: 12px;
    }

    .digit-btn {
      background: #f1ece6;
      border: 1px solid #e2d9cd;
      color: #574c43;
      border-radius: 6px;
      font-weight: 700;
      padding: 6px 0;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .digit-btn:hover {
      background: #e6dfd4;
      color: var(--text-main);
    }

    .digit-btn.state-red {
      background: var(--color-red-bg);
      border-color: var(--color-red);
      color: var(--color-red);
      box-shadow: 0 2px 6px rgba(220, 38, 38, 0.15);
    }

    .digit-btn.state-green {
      background: var(--color-green-bg);
      border-color: var(--color-green);
      color: var(--color-green);
      box-shadow: 0 2px 6px rgba(22, 163, 74, 0.15);
    }

    .columns-split {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .column {
      background: #ffffff;
      border: 1px solid var(--border-subtle);
      border-radius: 6px;
      padding: 8px;
      min-height: 50px;
    }

    .col-red {
      border-top: 3px solid var(--color-red);
    }

    .col-green {
      border-top: 3px solid var(--color-green);
    }

    .col-header {
      font-size: 0.75rem;
      font-weight: 700;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .col-red .col-header { color: var(--color-red); }
    .col-green .col-header { color: var(--color-green); }

    .digits-list {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .tag {
      font-size: 0.8rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .tag-red {
      background: var(--color-red-bg);
      color: var(--color-red);
    }

    .tag-green {
      background: var(--color-green-bg);
      color: var(--color-green);
    }

    .empty-text {
      color: var(--text-light);
      font-size: 0.8rem;
    }

    .scratchpad-section {
      margin-top: 16px;
    }

    .scratchpad-section label {
      display: block;
      font-size: 0.9rem;
      font-weight: 600;
      margin-bottom: 6px;
      color: var(--text-main);
    }

    .scratchpad-textarea {
      resize: vertical;
      font-family: inherit;
    }
  `]
})
export class NotesPanelComponent implements OnInit {
  matrix: DigitState[][] = [
    Array(10).fill('NEUTRAL'),
    Array(10).fill('NEUTRAL'),
    Array(10).fill('NEUTRAL'),
    Array(10).fill('NEUTRAL')
  ];

  freeTextNotes: string = '';

  ngOnInit() {
    this.loadFromLocalStorage();
  }

  toggleDigitState(posIdx: number, digit: number) {
    const currentState = this.matrix[posIdx][digit];
    let nextState: DigitState = 'NEUTRAL';
    if (currentState === 'NEUTRAL') {
      nextState = 'RED';
    } else if (currentState === 'RED') {
      nextState = 'GREEN';
    } else {
      nextState = 'NEUTRAL';
    }
    this.matrix[posIdx][digit] = nextState;
    this.saveToLocalStorage();
  }

  getDigitsInState(posIdx: number, state: DigitState): number[] {
    const res: number[] = [];
    for (let d = 0; d <= 9; d++) {
      if (this.matrix[posIdx][d] === state) {
        res.push(d);
      }
    }
    return res;
  }

  resetNotes() {
    this.matrix = [
      Array(10).fill('NEUTRAL'),
      Array(10).fill('NEUTRAL'),
      Array(10).fill('NEUTRAL'),
      Array(10).fill('NEUTRAL')
    ];
    this.freeTextNotes = '';
    localStorage.removeItem('game_notes_matrix');
    localStorage.removeItem('game_notes_text');
  }

  saveToLocalStorage() {
    localStorage.setItem('game_notes_matrix', JSON.stringify(this.matrix));
    localStorage.setItem('game_notes_text', this.freeTextNotes);
  }

  loadFromLocalStorage() {
    const savedMatrix = localStorage.getItem('game_notes_matrix');
    if (savedMatrix) {
      try {
        this.matrix = JSON.parse(savedMatrix);
      } catch (e) {}
    }
    const savedText = localStorage.getItem('game_notes_text');
    if (savedText) {
      this.freeTextNotes = savedText;
    }
  }
}
