# CIFRE 4.0 - Joc Online Multi-Player & vs Bot de Ghicit Numere

Aplicație web modernă în timp real pentru jocul de ghicit numărul secret din 4 cifre (de la **0000** la **9999**).
Dezvoltată cu **Python (FastAPI + WebSockets)** pe backend și **Angular (v18+)** pe frontend.

---

## 🚀 Caracteristici Principale

- 🎮 **Mod PvP (Player vs Player)**: Joacă în timp real pe calculatoare diferite prin introducerea unui **Cod de Cameră** unic.
- 🤖 **Mod Player vs Bot (Single Player)**: Joacă împotriva unui Bot inteligent AI care își calculează deducțiile după fiecare încercare.
- ⚡ **Verificare Automată a Pozițiilor**: Calculatorul determină instant numărul de cifre care sunt pe **poziția corectă** (exact match).
- 📝 **Panou Interactiv de Notițe & Matrice de Eliminare**:
  - Structură dedicată pentru fiecare din cele **4 Poziții** (Mii, Sute, Zeci, Unități).
  - Două coloane dinamice per poziție: **Roșu (Cifre Eliminate)** și **Verde (Cifre Posibile)**.
  - Butoane rapide (0-9) cu comutare prin click (*Neutru -> Roșu -> Verde -> Neutru*).
  - Câmp de notițe text liber salvat automat în browser (`localStorage`).
- 💬 **Live Chat**: Chat integrat pentru comunicare directă între jucători în modul PvP.
- 🎨 **Design Premium**: Glassmorphism, Dark Mode, animații fluide și culori tailor-made.

---

## 🛠️ Cum se Pornește Aplicația (Local pe Windows)

### Metoda Rapidă (cu 1 click pe Windows):
Dublu-click pe fișierul **`start.bat`**. Acesta va deschide două ferestre de terminal și va porni automat backend-ul și frontend-ul.

### Metoda Manuală:

#### 1. Backend Python (FastAPI):
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
*Backend-ul va rula la: `http://localhost:8000`*

#### 2. Frontend Angular:
```bash
cd frontend
npm install
npm start
```
*Aplicația web se deschide la: `http://localhost:4300`*

---

## 🌐 Cum se joacă Online între calculatoare diferite

### Opțiunea 1: În Rețeaua Locală (LAN / Wi-Fi de acasă/birou)
Dacă ambele calculatoare sunt conectate la aceeași rețea Wi-Fi:
1. Pe calculatorul gazdă, aflați adresa IP locală (comanda `ipconfig` în cmd, de exemplu `192.168.1.100`).
2. Persoana 2 accesează din browser-ul ei adresa IP-ului gazdei pe portul 4300: `http://192.168.1.100:4300`.

### Opțiunea 2: Pe Internet Gratuit via ngrok (Rapid)
1. Rulați aplicația pe un calculator.
2. Folosiți utilitarul gratuit `ngrok`:
   ```bash
   ngrok http 4300
   ```
3. Trimiteți link-ul generat (ex: `https://abcd-123.ngrok-free.app`) prietenului dvs. pentru a juca de oriunde din lume!

### Opțiunea 3: Deploy Cloud Gratuit (Permanent)
- **Backend (Python)**: Uploadați folderul `backend` pe [Render.com](https://render.com) sau [Railway.app](https://railway.app) ca Web Service cu Docker.
- **Frontend (Angular)**: Uploadați folderul `frontend` pe [Vercel.com](https://vercel.com) sau [Netlify.com](https://netlify.com).

---

## 🧪 Rularea Testelor Automate

Pentru testarea mecanicilor de verificare a cifrelor și a algoritmului Bot-ului:
```bash
python -m pytest backend/test_game.py
```
