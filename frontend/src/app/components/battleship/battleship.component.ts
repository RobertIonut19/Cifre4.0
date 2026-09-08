import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameSocketService, BattleshipShip, BattleshipShot } from '../../services/game-socket.service';
import { ChatComponent } from '../chat/chat.component';

interface DockShip {
  id: string;
  name: string;
  icon: string;
  size: number;
}

@Component({
  selector: 'app-battleship',
  standalone: true,
  imports: [CommonModule, FormsModule, ChatComponent],
  templateUrl: './battleship.component.html',
  styleUrls: ['./battleship.component.css']
})
export class BattleshipComponent implements OnInit {
  colLetters: string[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  colIndices: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  rowIndices: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  shipDefs: DockShip[] = [
    { id: 'carrier', name: 'Portavion', icon: '🚢', size: 5 },
    { id: 'battleship', name: 'Cuirasat', icon: '🛳️', size: 4 },
    { id: 'cruiser', name: 'Crucișător', icon: '⛴️', size: 3 },
    { id: 'submarine', name: 'Submarin', icon: '🚤', size: 3 },
    { id: 'destroyer', name: 'Distrugător', icon: '⛵', size: 2 }
  ];

  selectedShipId: string = 'carrier';
  selectedOrientation: 'H' | 'V' = 'H';
  placedShips: BattleshipShip[] = [];

  hoverRow: number = -1;
  hoverCol: number = -1;
  isPreviewValid: boolean = false;

  constructor(public gameSocket: GameSocketService) {}

  ngOnInit() {
    this.autoPlaceFleet();
  }

  getArray(n: number): number[] {
    return Array(n).fill(0);
  }

  isMyTurn(state: any): boolean {
    return state.current_turn === this.gameSocket.playerId();
  }

  isMyFleetLocked(state: any): boolean {
    const pid = this.gameSocket.playerId();
    if (!pid || !state.players || !state.players[pid]) return false;
    return state.players[pid].has_secret;
  }

  selectShip(shipId: string) {
    this.selectedShipId = shipId;
  }

  isShipPlaced(shipId: string): boolean {
    return this.placedShips.some(s => s.id === shipId);
  }

  resetFleet() {
    this.placedShips = [];
    this.selectedShipId = 'carrier';
  }

  autoPlaceFleet() {
    const fleet: BattleshipShip[] = [];
    const occupied = new Set<string>();

    for (const def of this.shipDefs) {
      let placed = false;
      let attempts = 0;
      while (!placed && attempts < 100) {
        attempts++;
        const orient: 'H' | 'V' = Math.random() < 0.5 ? 'H' : 'V';
        const r = orient === 'H' ? Math.floor(Math.random() * 10) : Math.floor(Math.random() * (10 - def.size + 1));
        const c = orient === 'H' ? Math.floor(Math.random() * (10 - def.size + 1)) : Math.floor(Math.random() * 10);

        const cells: [number, number][] = [];
        let canPlace = true;
        for (let i = 0; i < def.size; i++) {
          const cr = orient === 'H' ? r : r + i;
          const cc = orient === 'H' ? c + i : c;
          if (occupied.has(`${cr},${cc}`)) {
            canPlace = false;
            break;
          }
          cells.push([cr, cc]);
        }

        if (canPlace) {
          cells.forEach(([cr, cc]) => occupied.add(`${cr},${cc}`));
          fleet.push({
            id: def.id,
            name: def.name,
            icon: def.icon,
            size: def.size,
            r,
            c,
            orientation: orient,
            cells
          });
          placed = true;
        }
      }
    }
    this.placedShips = fleet;
  }

  lockInFleet() {
    if (this.placedShips.length === 5) {
      this.gameSocket.setBattleshipFleet(this.placedShips);
    }
  }

  onCellHover(r: number, c: number) {
    this.hoverRow = r;
    this.hoverCol = c;
    const sDef = this.shipDefs.find(s => s.id === this.selectedShipId);
    if (!sDef) return;

    const orient = this.selectedOrientation;
    if (orient === 'H' && c + sDef.size > 10) {
      this.isPreviewValid = false;
      return;
    }
    if (orient === 'V' && r + sDef.size > 10) {
      this.isPreviewValid = false;
      return;
    }

    const otherPlaced = this.placedShips.filter(s => s.id !== this.selectedShipId);
    let overlap = false;
    for (let i = 0; i < sDef.size; i++) {
      const cr = orient === 'H' ? r : r + i;
      const cc = orient === 'H' ? c + i : c;
      for (const os of otherPlaced) {
        if (os.cells?.some(([or, oc]) => or === cr && oc === cc)) {
          overlap = true;
          break;
        }
      }
    }
    this.isPreviewValid = !overlap;
  }

  onCellLeave() {
    this.hoverRow = -1;
    this.hoverCol = -1;
  }

  isPreviewCell(r: number, c: number): boolean {
    if (this.hoverRow === -1 || this.hoverCol === -1) return false;
    const sDef = this.shipDefs.find(s => s.id === this.selectedShipId);
    if (!sDef) return false;

    const orient = this.selectedOrientation;
    for (let i = 0; i < sDef.size; i++) {
      const cr = orient === 'H' ? this.hoverRow : this.hoverRow + i;
      const cc = orient === 'H' ? this.hoverCol + i : this.hoverCol;
      if (cr === r && cc === c) return true;
    }
    return false;
  }

  isSetupCellOccupied(r: number, c: number): boolean {
    return this.placedShips.some(s => s.cells?.some(([cr, cc]) => cr === r && cc === c));
  }

  getShipIconAt(r: number, c: number): string | null {
    const ship = this.placedShips.find(s => s.cells?.some(([cr, cc]) => cr === r && cc === c));
    return ship ? ship.icon : null;
  }

  onSetupCellClick(r: number, c: number) {
    if (!this.isPreviewValid) return;
    const sDef = this.shipDefs.find(s => s.id === this.selectedShipId);
    if (!sDef) return;

    this.placedShips = this.placedShips.filter(s => s.id !== sDef.id);

    const cells: [number, number][] = [];
    for (let i = 0; i < sDef.size; i++) {
      const cr = this.selectedOrientation === 'H' ? r : r + i;
      const cc = this.selectedOrientation === 'H' ? c + i : c;
      cells.push([cr, cc]);
    }

    this.placedShips.push({
      id: sDef.id,
      name: sDef.name,
      icon: sDef.icon,
      size: sDef.size,
      r,
      c,
      orientation: this.selectedOrientation,
      cells
    });

    const nextUnplaced = this.shipDefs.find(s => !this.isShipPlaced(s.id));
    if (nextUnplaced) {
      this.selectedShipId = nextUnplaced.id;
    }
  }

  hasShotAt(state: any, r: number, c: number): boolean {
    const myShots: BattleshipShot[] = state.battleship?.my_shots || [];
    return myShots.some(s => s.r === r && s.c === c);
  }

  getAttackShotResult(state: any, r: number, c: number): 'HIT' | 'MISS' | 'SUNK' | null {
    const myShots: BattleshipShot[] = state.battleship?.my_shots || [];
    const shot = myShots.find(s => s.r === r && s.c === c);
    return shot ? shot.result : null;
  }

  isDefenseShipCell(state: any, r: number, c: number): boolean {
    const myFleet: BattleshipShip[] = state.battleship?.my_fleet || this.placedShips;
    return myFleet.some(s => s.cells?.some(([cr, cc]) => cr === r && cc === c));
  }

  getDefenseShotResult(state: any, r: number, c: number): 'HIT' | 'MISS' | 'SUNK' | null {
    const oppShots: BattleshipShot[] = state.battleship?.opponent_shots || [];
    const shot = oppShots.find(s => s.r === r && s.c === c);
    return shot ? shot.result : null;
  }

  isOpponentShipSunk(state: any, shipId: string): boolean {
    const oppSunk: string[] = state.battleship?.opponent_sunk_ships || [];
    return oppSunk.includes(shipId);
  }

  isMyShipSunk(state: any, shipId: string): boolean {
    const mySunk: string[] = state.battleship?.my_sunk_ships || [];
    return mySunk.includes(shipId);
  }

  getRecentShots(state: any): BattleshipShot[] {
    const all = [...(state.guesses_history || [])].reverse();
    return all as BattleshipShot[];
  }

  onFireShot(state: any, r: number, c: number) {
    if (!this.isMyTurn(state) || this.hasShotAt(state, r, c) || state.state !== 'PLAYING') {
      return;
    }
    this.gameSocket.fireBattleshipShot(r, c);
  }

  onPlayAgain() {
    this.gameSocket.restartGame();
    this.autoPlaceFleet();
  }

  copyRoomCode(roomId: string) {
    navigator.clipboard.writeText(roomId);
  }
}
