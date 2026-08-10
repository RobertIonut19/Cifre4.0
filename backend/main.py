import asyncio
import json
import uuid
from typing import Dict, List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from room_manager import RoomManager, Room
from game_logic import validate_number
from database import init_db, save_player, get_all_players, get_scores_stats

app = FastAPI(title="4-Digit Number Guessing Game API")

# Initialize SQLite database on startup
init_db()

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

room_manager = RoomManager()

class CreateRoomRequest(BaseModel):
    is_bot: bool = False
    game_type: str = "numbers"

class SavePlayerRequest(BaseModel):
    name: str

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Multi-Game API is running!"}

@app.post("/api/rooms/create")
def create_room(req: CreateRoomRequest):
    room_id = room_manager.create_room(is_bot_game=req.is_bot, game_type=req.game_type)
    return {"room_id": room_id, "is_bot": req.is_bot, "game_type": req.game_type}

@app.get("/api/rooms/waiting")
def get_waiting_rooms(game_type: str = None):
    return room_manager.get_waiting_rooms(game_type=game_type)

@app.get("/api/players")
def get_players_endpoint():
    return get_all_players()

@app.post("/api/players")
def save_player_endpoint(req: SavePlayerRequest):
    success = save_player(req.name)
    return {"success": success, "players": get_all_players()}

@app.get("/api/stats")
def get_stats_endpoint(game_type: str = None):
    return get_scores_stats(game_type=game_type)

@app.get("/api/rooms/{room_id}")
def get_room_info(room_id: str):
    room = room_manager.get_room(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return {"room_id": room.room_id, "state": room.state, "player_count": len(room.players), "game_type": room.game_type}


async def broadcast_room_state(room: Room):
    """Sends updated state to all connected websockets in the room."""
    for pid, pdata in list(room.players.items()):
        ws: WebSocket = pdata.get("websocket")
        if ws:
            try:
                state_msg = {
                    "type": "GAME_STATE",
                    "data": room.get_public_state(pid)
                }
                await ws.send_text(json.dumps(state_msg))
            except Exception:
                pass

async def broadcast_chat_message(room: Room, chat_entry: dict):
    """Sends a chat message to all players in the room."""
    room.chat_history.append(chat_entry)
    for pid, pdata in list(room.players.items()):
        ws: WebSocket = pdata.get("websocket")
        if ws:
            try:
                msg = {
                    "type": "CHAT_MESSAGE",
                    "data": chat_entry
                }
                await ws.send_text(json.dumps(msg))
            except Exception:
                pass

async def handle_bot_turn_if_needed(room: Room):
    """If current turn is BOT_AGENT, simulate thinking and make a guess."""
    if room.state == "PLAYING" and room.current_turn == "BOT_AGENT":
        # Simulate slight delay so bot feels natural
        await asyncio.sleep(1.2)
        
        bot_guess = room.bot_agent.make_guess()
        guess_result = room.process_guess("BOT_AGENT", bot_guess)
        
        if guess_result:
            # Inform bot of its feedback to refine future candidates
            room.bot_agent.process_feedback(bot_guess, guess_result["exact_matches"])
        
        await broadcast_room_state(room)


@app.websocket("/ws/{room_id}/{player_name}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, player_name: str):
    await websocket.accept()
    
    room = room_manager.get_room(room_id)
    if not room:
        await websocket.send_text(json.dumps({"type": "ERROR", "message": "Camera nu există!"}))
        await websocket.close()
        return

    player_id = f"P_{uuid.uuid4().hex[:6]}"
    success = room.add_player(player_id, player_name, websocket)
    if not success:
        await websocket.send_text(json.dumps({"type": "ERROR", "message": "Camera este plină!"}))
        await websocket.close()
        return

    # Send initial registration info to connected client
    await websocket.send_text(json.dumps({
        "type": "CONNECTED",
        "data": {
            "player_id": player_id,
            "room_id": room.room_id
        }
    }))

    # Broadcast updated room state
    await broadcast_room_state(room)

    # If bot game, bot is auto-ready with secret, check state
    await handle_bot_turn_if_needed(room)

    try:
        while True:
            data_text = await websocket.receive_text()
            try:
                msg = json.loads(data_text)
            except Exception:
                continue

            msg_type = msg.get("type")
            payload = msg.get("payload", {})

            if msg_type == "SET_SECRET":
                secret = payload.get("secret", "")
                if room.set_secret(player_id, secret):
                    await broadcast_room_state(room)
                    await handle_bot_turn_if_needed(room)
                else:
                    err_msg = "Cuvântul secret trebuie să fie format din 5 litere!" if room.game_type == "words" else "Numărul secret trebuie să fie format din exact 4 cifre (0000 - 9999)!"
                    await websocket.send_text(json.dumps({
                        "type": "ERROR", 
                        "message": err_msg
                    }))

            elif msg_type == "MAKE_GUESS":
                guess_num = payload.get("guess", "")
                if room.current_turn != player_id:
                    await websocket.send_text(json.dumps({
                        "type": "ERROR",
                        "message": "Nu este rândul tău!"
                    }))
                    continue

                guess_result = room.process_guess(player_id, guess_num)
                if guess_result:
                    await broadcast_room_state(room)
                    # Trigger Bot response if opponent is Bot
                    await handle_bot_turn_if_needed(room)
                else:
                    await websocket.send_text(json.dumps({
                        "type": "ERROR",
                        "message": "Număr invalid sau nu este rândul tău!"
                    }))

            elif msg_type == "RESTART_GAME":
                room.restart_game()
                await broadcast_room_state(room)
                await handle_bot_turn_if_needed(room)

            elif msg_type == "SEND_CHAT":
                text = payload.get("text", "").strip()
                if text:
                    chat_entry = {
                        "sender_id": player_id,
                        "sender_name": player_name,
                        "text": text,
                        "timestamp": payload.get("timestamp", "")
                    }
                    await broadcast_chat_message(room, chat_entry)

    except WebSocketDisconnect:
        room.remove_player(player_id)
        await broadcast_room_state(room)
        room_manager.cleanup_room(room_id)
