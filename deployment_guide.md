# Ghid de Deploy Online: CIFRE 4.0

Acest ghid vă explică pas cu pas cum să publicați online jocul **CIFRE 4.0** (Python FastAPI + Angular) pentru a putea juca **Player vs Player pe calculatoare diferite de oriunde din lume**.

---

## 🌐 Opțiunea 1: Deploy Gratuit pe Cloud (Render.com + Vercel) - RECOMANDAT

Aceasta este cea mai simplă și permanentă opțiune gratuită. Aplicația va fi accesibilă 24/7 pe internet printr-un link public (ex: `https://cifre4.vercel.app`).

### Pasul 1: Publicarea codului pe GitHub
1. Creați un cont pe [GitHub.com](https://github.com).
2. Creați un repository nou (ex: `cifre-4-game`).
3. Uploadați codul din `C:\Numbers_project` în repository-ul GitHub.

---

### Pasul 2: Deploy Backend (Python FastAPI) pe Render.com
1. Creați un cont gratuit pe [Render.com](https://render.com).
2. În dashboard, dați click pe **New +** -> **Web Service**.
3. Conectați repository-ul GitHub proaspăt creat.
4. Selectați folderul `backend` ca Root Directory (sau specificați în setări):
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Apăsați **Create Web Service**.
6. Render vă va oferi o adresă de forma `https://cifre-backend.onrender.com`.

---

### Pasul 3: Deploy Frontend (Angular) pe Vercel sau Render
1. Intrați pe [Vercel.com](https://vercel.com) și conectați-vă cu contul de GitHub.
2. Dați click pe **Add New...** -> **Project** și importați repository-ul.
3. În setări:
   - **Framework Preset**: `Angular`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist/number-guessing-frontend/browser`
4. Apăsați **Deploy**.
5. În 1-2 minute, jocul este LIVE la o adresă de forma `https://cifre4.vercel.app`!

---

## ⚡ Opțiunea 2: Rulare Instant pe Internet via ngrok (Fără conturi de Cloud)

Dacă doriți să vă jucați **IMEDIAT** cu un prieten fără să creați conturi de găzduire:

1. Porniți aplicația local prin dublu-click pe **`start.bat`**.
2. Descărcați utilitarul gratuit `ngrok` de la [ngrok.com](https://ngrok.com).
3. Deschideți o fereastră de terminal și rulați:
   ```bash
   ngrok http 4300
   ```
4. Copiați link-ul generat (ex: `https://a1b2-34-56-78.ngrok-free.app`) și trimiteți-l prietenului dvs.!

---

## 🐳 Opțiunea 3: Deploy cu Docker pe Server Propriu / VPS

Dacă aveți un server Linux sau VPS (DigitalOcean, Hetzner, AWS, Linode):

1. Clonați proiectul pe server.
2. Navigați în folderul proiectului și rulați comanda:
   ```bash
   docker-compose up -d --build
   ```
3. Jocul va rula containerizat:
   - **Frontend**: Portul 4300
   - **Backend**: Portul 8000
