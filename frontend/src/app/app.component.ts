import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameSocketService } from './services/game-socket.service';
import { LobbyComponent } from './components/lobby/lobby.component';
import { GameBoardComponent } from './components/game-board/game-board.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, LobbyComponent, GameBoardComponent],
  template: `
    <main class="app-main">
      <app-lobby *ngIf="!gameSocket.isConnected() || !gameSocket.gameState()"></app-lobby>
      <app-game-board *ngIf="gameSocket.isConnected() && gameSocket.gameState()"></app-game-board>
    </main>
  `,
  styles: [`
    .app-main {
      min-height: 100vh;
      width: 100%;
    }
  `]
})
export class AppComponent {
  constructor(public gameSocket: GameSocketService) {}
}
